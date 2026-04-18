package x

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"net/url"
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

	endpoint := "https://api.x.com/2/media/upload"

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

// uploadVideoChunked uploads a video using the X API v2 INIT→APPEND→FINALIZE
// chunked flow. The v2 single-shot multipart endpoint rejects tweet_video —
// chunked upload is the only supported path for video on v2.
// tokenSecret is unused: video always authenticates with Bearer, not OAuth 1.0a.
func (c *Client) uploadVideoChunked(ctx context.Context, videoBytes []byte, mediaType, accessToken string) (UploadMediaResult, error) {
	if len(videoBytes) == 0 {
		return UploadMediaResult{}, fmt.Errorf("xapi: video upload requires non-empty bytes")
	}

	const endpoint = "https://api.x.com/2/media/upload"
	const chunkSize = 5 * 1024 * 1024

	// INIT
	initBody, err := c.chunkedCommandRaw(ctx, endpoint, accessToken, []field{
		{"command", "INIT"},
		{"media_type", mediaType},
		{"total_bytes", strconv.Itoa(len(videoBytes))},
		{"media_category", "tweet_video"},
	}, nil)
	if err != nil {
		return UploadMediaResult{}, fmt.Errorf("xapi: video INIT failed: %w", err)
	}
	initResult, err := parseUploadResponse(initBody)
	if err != nil {
		return UploadMediaResult{}, fmt.Errorf("xapi: video INIT parse failed: %w", err)
	}
	if initResult.MediaID == "" {
		return UploadMediaResult{}, fmt.Errorf("xapi: video INIT returned empty media_id")
	}
	mediaID := initResult.MediaID

	// APPEND — mediaID returned by X is discarded; 204 No Content has no body
	for i, seg := 0, 0; i < len(videoBytes); i, seg = i+chunkSize, seg+1 {
		end := min(i+chunkSize, len(videoBytes))
		if _, err := c.chunkedCommandRaw(ctx, endpoint, accessToken, []field{
			{"command", "APPEND"},
			{"media_id", mediaID},
			{"segment_index", strconv.Itoa(seg)},
		}, videoBytes[i:end]); err != nil {
			return UploadMediaResult{}, fmt.Errorf("xapi: video APPEND segment %d failed: %w", seg, err)
		}
	}

	// FINALIZE — returns processing_info for async polling
	finalBody, err := c.chunkedCommandRaw(ctx, endpoint, accessToken, []field{
		{"command", "FINALIZE"},
		{"media_id", mediaID},
	}, nil)
	if err != nil {
		return UploadMediaResult{}, fmt.Errorf("xapi: video FINALIZE failed: %w", err)
	}
	return parseUploadResponse(finalBody)
}

// field is an ordered key-value pair for multipart form fields.
// Using a slice instead of map guarantees deterministic field ordering.
type field struct{ key, value string }

// chunkedCommandRaw posts a multipart/form-data command and returns the raw
// response body. chunk is written as the "media" field when non-nil.
func (c *Client) chunkedCommandRaw(ctx context.Context, endpoint, accessToken string, fields []field, chunk []byte) ([]byte, error) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	for _, f := range fields {
		if err := w.WriteField(f.key, f.value); err != nil {
			return nil, fmt.Errorf("xapi: write field %s: %w", f.key, err)
		}
	}
	if chunk != nil {
		h := make(textproto.MIMEHeader)
		h.Set("Content-Disposition", `form-data; name="media"; filename="chunk"`)
		h.Set("Content-Type", "application/octet-stream")
		part, err := w.CreatePart(h)
		if err != nil {
			return nil, fmt.Errorf("xapi: create chunk part: %w", err)
		}
		if _, err := part.Write(chunk); err != nil {
			return nil, fmt.Errorf("xapi: write chunk: %w", err)
		}
	}
	if err := w.Close(); err != nil {
		return nil, fmt.Errorf("xapi: close multipart writer: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, &buf)
	if err != nil {
		return nil, fmt.Errorf("xapi: build request: %w", err)
	}
	httpReq.Header.Set("Content-Type", w.FormDataContentType())
	httpReq.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("xapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("xapi: command failed with %d: %s", resp.StatusCode, string(body))
	}
	return body, nil
}

// parseUploadResponse decodes a v2 (or v1.1 fallback) media upload response.
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
	endpoint := fmt.Sprintf("https://api.x.com/2/media/upload?command=STATUS&media_id=%s", mediaID)
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

// uploadMediaLegacy is the old v1.1 chunked flow, kept for reference.
func (c *Client) uploadMediaLegacy(ctx context.Context, req UploadMediaRequest, accessToken, tokenSecret string) (string, error) {
	totalBytes := len(req.MediaBytes)
	mediaType := req.MediaType
	if mediaType == "" {
		mediaType = "image/jpeg"
	}

	uploadURL := "https://upload.twitter.com/1.1/media/upload.json"

	initParams := url.Values{}
	initParams.Set("command", "INIT")
	initParams.Set("total_bytes", strconv.Itoa(totalBytes))
	initParams.Set("media_type", mediaType)

	initReq, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, strings.NewReader(initParams.Encode()))
	if err != nil {
		return "", fmt.Errorf("xapi: failed to create INIT request: %w", err)
	}
	initReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	initReq.Header.Set("Authorization", c.authHeader(http.MethodPost, uploadURL, initParams, accessToken, tokenSecret))

	initResp, err := c.httpClient.Do(initReq)
	if err != nil {
		return "", fmt.Errorf("xapi: INIT request failed: %w", err)
	}
	defer initResp.Body.Close()
	initBody, _ := io.ReadAll(initResp.Body)

	if initResp.StatusCode != http.StatusAccepted && initResp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("xapi: INIT failed with %d: %s", initResp.StatusCode, string(initBody))
	}

	var initResult struct {
		MediaIDString string `json:"media_id_string"`
	}
	if err := json.Unmarshal(initBody, &initResult); err != nil {
		return "", fmt.Errorf("xapi: failed to parse INIT response: %w", err)
	}

	const chunkSize = 5 * 1024 * 1024
	for i := 0; i < totalBytes; i += chunkSize {
		end := min(i+chunkSize, totalBytes)
		chunk := req.MediaBytes[i:end]
		segmentIndex := i / chunkSize

		appendParams := url.Values{}
		appendParams.Set("command", "APPEND")
		appendParams.Set("media_id", initResult.MediaIDString)
		appendParams.Set("segment_index", strconv.Itoa(segmentIndex))
		appendParams.Set("media_data", base64.StdEncoding.EncodeToString(chunk))

		appendReq, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, strings.NewReader(appendParams.Encode()))
		if err != nil {
			return "", fmt.Errorf("xapi: failed to create APPEND request: %w", err)
		}
		appendReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		appendReq.Header.Set("Authorization", c.authHeader(http.MethodPost, uploadURL, appendParams, accessToken, tokenSecret))

		appendResp, err := c.httpClient.Do(appendReq)
		if err != nil {
			return "", fmt.Errorf("xapi: APPEND request failed: %w", err)
		}
		appendResp.Body.Close()
		if appendResp.StatusCode != http.StatusNoContent && appendResp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("xapi: APPEND failed with %d", appendResp.StatusCode)
		}
	}

	finalizeParams := url.Values{}
	finalizeParams.Set("command", "FINALIZE")
	finalizeParams.Set("media_id", initResult.MediaIDString)

	finalizeReq, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, strings.NewReader(finalizeParams.Encode()))
	if err != nil {
		return "", fmt.Errorf("xapi: failed to create FINALIZE request: %w", err)
	}
	finalizeReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	finalizeReq.Header.Set("Authorization", c.authHeader(http.MethodPost, uploadURL, finalizeParams, accessToken, tokenSecret))

	finalizeResp, err := c.httpClient.Do(finalizeReq)
	if err != nil {
		return "", fmt.Errorf("xapi: FINALIZE request failed: %w", err)
	}
	defer finalizeResp.Body.Close()

	if finalizeResp.StatusCode != http.StatusCreated && finalizeResp.StatusCode != http.StatusOK {
		finalizeBody, _ := io.ReadAll(finalizeResp.Body)
		return "", fmt.Errorf("xapi: FINALIZE failed with %d: %s", finalizeResp.StatusCode, string(finalizeBody))
	}

	return initResult.MediaIDString, nil
}
