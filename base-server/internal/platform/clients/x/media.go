package x

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"strconv"
	"strings"
	"time"
)

// UploadMediaResult is what the async pipeline sees: the media_id,
// plus the platform's current processing state so the reconciler can
// decide whether to poll.
type UploadMediaResult struct {
	MediaID        string
	ProcessingInfo *ProcessingInfo
}

// ProcessingInfo is the public view of X's processing_info block.
// Exported so the async pipeline (outside this package) can read
// state + check_after_secs directly.
type ProcessingInfo struct {
	State          string `json:"state"`
	CheckAfterSecs int    `json:"check_after_secs"`
	Error          *struct {
		Code    int    `json:"code"`
		Name    string `json:"name"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// UploadMedia is the blocking upload used by the legacy (synchronous)
// publish path. It does the single-shot POST and, for video, polls
// STATUS until the media is ready. Kept for callers that haven't moved
// to the async pipeline yet.
func (c *Client) UploadMedia(ctx context.Context, req UploadMediaRequest, accessToken, tokenSecret string) (string, error) {
	res, err := c.UploadMediaAsync(ctx, req, accessToken, tokenSecret)
	if err != nil {
		return "", err
	}
	if res.ProcessingInfo != nil && res.ProcessingInfo.State != "" && res.ProcessingInfo.State != "succeeded" {
		if err := c.waitForMediaReady(ctx, res.MediaID, accessToken, res.ProcessingInfo); err != nil {
			return "", err
		}
	}
	return res.MediaID, nil
}

// UploadMediaAsync uploads media to X and returns as soon as X responds.
// Images are uploaded via a single-shot multipart POST. Videos require the
// chunked INIT→APPEND→FINALIZE flow because the v2 single-shot endpoint
// only accepts tweet_image/dm_image/subtitles — tweet_video is only valid
// on the chunked path.
func (c *Client) UploadMediaAsync(ctx context.Context, req UploadMediaRequest, accessToken, tokenSecret string) (UploadMediaResult, error) {
	mediaType := req.MediaType
	if mediaType == "" {
		mediaType = "image/jpeg"
	}

	if strings.HasPrefix(mediaType, "video/") {
		return c.uploadVideoChunked(ctx, req.MediaBytes, mediaType, accessToken)
	}

	mediaCategory := "tweet_image"
	if strings.HasPrefix(mediaType, "image/gif") {
		mediaCategory = "tweet_gif"
	}

	endpoint := c.apiBase() + "/2/media/upload"

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	if err := writer.WriteField("media_category", mediaCategory); err != nil {
		return UploadMediaResult{}, fmt.Errorf("xapi: failed to write media_category: %w", err)
	}

	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", `form-data; name="media"; filename="upload"`)
	h.Set("Content-Type", mediaType)
	part, err := writer.CreatePart(h)
	if err != nil {
		return UploadMediaResult{}, fmt.Errorf("xapi: failed to create media part: %w", err)
	}
	if _, err := part.Write(req.MediaBytes); err != nil {
		return UploadMediaResult{}, fmt.Errorf("xapi: failed to write media bytes: %w", err)
	}
	if err := writer.Close(); err != nil {
		return UploadMediaResult{}, fmt.Errorf("xapi: failed to close multipart writer: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, &body)
	if err != nil {
		return UploadMediaResult{}, fmt.Errorf("xapi: failed to create upload request: %w", err)
	}
	httpReq.Header.Set("Content-Type", writer.FormDataContentType())
	httpReq.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return UploadMediaResult{}, fmt.Errorf("xapi: upload request failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return UploadMediaResult{}, fmt.Errorf("xapi: media upload failed with %d: %s", resp.StatusCode, string(respBody))
	}

	return parseUploadResponse(respBody)
}

// uploadVideoChunked uploads a video using the X v2 structured chunked flow:
//   - POST /2/media/upload/initialize (JSON)
//   - POST /2/media/upload/{id}/append (multipart chunk)
//   - POST /2/media/upload/{id}/finalize
//
// The legacy v1.1 endpoint (upload.twitter.com/1.1/media/upload.json) and
// the command-style v2 path (POST /2/media/upload with command=INIT) both
// return 404 for OAuth 2.0 callers on the Pay Per Use tier.
func (c *Client) uploadVideoChunked(ctx context.Context, videoBytes []byte, mediaType, accessToken string) (UploadMediaResult, error) {
	if len(videoBytes) == 0 {
		return UploadMediaResult{}, fmt.Errorf("xapi: video upload requires non-empty bytes")
	}

	const chunkSize = 5 * 1024 * 1024

	// INIT — POST /2/media/upload/initialize with JSON body.
	mediaID, err := c.initVideoUpload(ctx, mediaType, len(videoBytes), accessToken)
	if err != nil {
		return UploadMediaResult{}, fmt.Errorf("xapi: video INIT failed: %w", err)
	}

	// APPEND — POST /2/media/upload/{id}/append for each chunk.
	for i, seg := 0, 0; i < len(videoBytes); i, seg = i+chunkSize, seg+1 {
		end := min(i+chunkSize, len(videoBytes))
		if err := c.appendVideoChunk(ctx, mediaID, seg, videoBytes[i:end], accessToken); err != nil {
			return UploadMediaResult{}, fmt.Errorf("xapi: video APPEND segment %d failed: %w", seg, err)
		}
	}

	// FINALIZE — POST /2/media/upload/{id}/finalize; response carries processing_info.
	return c.finalizeVideoUpload(ctx, mediaID, accessToken)
}

// initVideoUpload starts a chunked upload session and returns the media id.
func (c *Client) initVideoUpload(ctx context.Context, mediaType string, totalBytes int, accessToken string) (string, error) {
	payload := map[string]any{
		"media_type":     mediaType,
		"total_bytes":    totalBytes,
		"media_category": "tweet_video",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshal init payload: %w", err)
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.apiBase()+"/2/media/upload/initialize", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("build init request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("status %d: %s", resp.StatusCode, string(respBody))
	}
	result, err := parseUploadResponse(respBody)
	if err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}
	if result.MediaID == "" {
		return "", fmt.Errorf("empty media_id")
	}
	return result.MediaID, nil
}

// appendVideoChunk uploads a single chunk as multipart form-data.
func (c *Client) appendVideoChunk(ctx context.Context, mediaID string, segmentIndex int, chunk []byte, accessToken string) error {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	if err := w.WriteField("segment_index", strconv.Itoa(segmentIndex)); err != nil {
		return fmt.Errorf("write segment_index: %w", err)
	}
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", `form-data; name="media"; filename="chunk"`)
	h.Set("Content-Type", "application/octet-stream")
	part, err := w.CreatePart(h)
	if err != nil {
		return fmt.Errorf("create chunk part: %w", err)
	}
	if _, err := part.Write(chunk); err != nil {
		return fmt.Errorf("write chunk: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("close multipart writer: %w", err)
	}

	endpoint := fmt.Sprintf("%s/2/media/upload/%s/append", c.apiBase(), mediaID)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, &buf)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	httpReq.Header.Set("Content-Type", w.FormDataContentType())
	httpReq.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("status %d: %s", resp.StatusCode, string(body))
	}
	return nil
}

// finalizeVideoUpload closes the chunked upload and returns processing state.
func (c *Client) finalizeVideoUpload(ctx context.Context, mediaID, accessToken string) (UploadMediaResult, error) {
	endpoint := fmt.Sprintf("%s/2/media/upload/%s/finalize", c.apiBase(), mediaID)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, nil)
	if err != nil {
		return UploadMediaResult{}, fmt.Errorf("xapi: video FINALIZE build request: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return UploadMediaResult{}, fmt.Errorf("xapi: video FINALIZE request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return UploadMediaResult{}, fmt.Errorf("xapi: video FINALIZE status %d: %s", resp.StatusCode, string(body))
	}
	return parseUploadResponse(body)
}

// parseUploadResponse decodes a v2 media upload response.
func parseUploadResponse(respBody []byte) (UploadMediaResult, error) {
	if len(respBody) == 0 {
		return UploadMediaResult{}, nil
	}
	var v2Result struct {
		Data struct {
			ID             string          `json:"id"`
			MediaKey       string          `json:"media_key"`
			ProcessingInfo *ProcessingInfo `json:"processing_info"`
		} `json:"data"`
		MediaIDString  string          `json:"media_id_string"`
		ProcessingInfo *ProcessingInfo `json:"processing_info"`
	}
	if err := json.Unmarshal(respBody, &v2Result); err != nil {
		return UploadMediaResult{}, fmt.Errorf("xapi: failed to parse upload response: %w", err)
	}

	mediaID := v2Result.Data.ID
	if mediaID == "" {
		mediaID = v2Result.MediaIDString
	}
	if mediaID == "" {
		return UploadMediaResult{}, fmt.Errorf("xapi: no media ID in response: %s", string(respBody))
	}

	pi := v2Result.Data.ProcessingInfo
	if pi == nil {
		pi = v2Result.ProcessingInfo
	}
	return UploadMediaResult{MediaID: mediaID, ProcessingInfo: pi}, nil
}

// waitForMediaReady polls /2/media/upload?command=STATUS until the
// media's processing state is "succeeded". X exposes check_after_secs
// to pace callers; we honor it but clamp to a sane range. Bounded by a
// 2-minute overall timeout — capture clips are short, and anything
// that's still transcoding after 2 minutes probably isn't coming back.
func (c *Client) waitForMediaReady(ctx context.Context, mediaID, accessToken string, initial *ProcessingInfo) error {
	const overallTimeout = 2 * time.Minute
	deadline := time.Now().Add(overallTimeout)

	pi := initial
	for {
		// Honor check_after_secs, clamped to [1, 10] so we don't stall
		// on a zero or unreasonably large hint.
		wait := time.Duration(pi.CheckAfterSecs) * time.Second
		wait = max(wait, time.Second)
		wait = min(wait, 10*time.Second)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(wait):
		}

		if time.Now().After(deadline) {
			return fmt.Errorf("xapi: media %s still in state %s after %s", mediaID, pi.State, overallTimeout)
		}

		next, err := c.GetMediaStatus(ctx, mediaID, accessToken)
		if err != nil {
			return err
		}
		switch next.State {
		case "succeeded":
			return nil
		case "failed":
			if next.Error != nil {
				return fmt.Errorf("xapi: media %s processing failed: %s (%d)", mediaID, next.Error.Message, next.Error.Code)
			}
			return fmt.Errorf("xapi: media %s processing failed", mediaID)
		}
		pi = next
	}
}

// GetMediaStatus reads the platform-side processing state of a
// previously uploaded media. Exposed so the async reconciler can
// check readiness without triggering the blocking waitForMediaReady
// loop.
func (c *Client) GetMediaStatus(ctx context.Context, mediaID, accessToken string) (*ProcessingInfo, error) {
	endpoint := fmt.Sprintf("%s/2/media/upload?command=STATUS&media_id=%s", c.apiBase(), mediaID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("xapi: failed to build STATUS request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("xapi: STATUS request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("xapi: STATUS returned %d: %s", resp.StatusCode, string(body))
	}
	var result struct {
		Data struct {
			ProcessingInfo *ProcessingInfo `json:"processing_info"`
		} `json:"data"`
		ProcessingInfo *ProcessingInfo `json:"processing_info"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("xapi: failed to parse STATUS response: %w", err)
	}
	pi := result.Data.ProcessingInfo
	if pi == nil {
		pi = result.ProcessingInfo
	}
	if pi == nil {
		return nil, fmt.Errorf("xapi: STATUS response missing processing_info: %s", string(body))
	}
	return pi, nil
}
