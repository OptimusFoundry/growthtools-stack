package tiktok

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"base-server/internal/infra/observability"
)

// Client handles HTTP communication with the TikTok Content Posting API.
type Client struct {
	httpClient *http.Client
	logger     *observability.Logger
	baseURL    string
}

// NewClient creates a new TikTok API client.
func NewClient(baseURL string, httpClient *http.Client, logger *observability.Logger) *Client {
	return &Client{
		httpClient: httpClient,
		logger:     logger,
		baseURL:    baseURL,
	}
}

// apiBase returns the TikTok API base URL.
func (c *Client) apiBase() string {
	if c.baseURL != "" {
		return c.baseURL
	}
	return "https://open.tiktokapis.com"
}

// InitVideoUpload initializes a video upload via the TikTok inbox upload flow.
func (c *Client) InitVideoUpload(ctx context.Context, accessToken, title string) (InitVideoUploadResponse, error) {
	payload := map[string]any{
		"post_info": map[string]any{
			"title":                    title,
			"privacy_level":            "SELF_ONLY",
			"disable_duet":             false,
			"disable_comment":          false,
			"disable_stitch":           false,
			"video_cover_timestamp_ms": 0,
		},
		"source_info": map[string]any{
			"source":            "FILE_UPLOAD",
			"video_size":        0,
			"chunk_size":        0,
			"total_chunk_count": 1,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return InitVideoUploadResponse{}, fmt.Errorf("tiktokapi: failed to marshal payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.apiBase()+"/v2/post/publish/inbox/video/init/", bytes.NewReader(body))
	if err != nil {
		return InitVideoUploadResponse{}, fmt.Errorf("tiktokapi: failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json; charset=UTF-8")
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return InitVideoUploadResponse{}, fmt.Errorf("tiktokapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return InitVideoUploadResponse{}, fmt.Errorf("tiktokapi: API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Data struct {
			PublishID string `json:"publish_id"`
			UploadURL string `json:"upload_url"`
		} `json:"data"`
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return InitVideoUploadResponse{}, fmt.Errorf("tiktokapi: failed to parse response: %w", err)
	}

	if result.Error.Code != "" && result.Error.Code != "ok" {
		return InitVideoUploadResponse{}, fmt.Errorf("tiktokapi: API error: %s - %s", result.Error.Code, result.Error.Message)
	}

	return InitVideoUploadResponse{
		PublishID: result.Data.PublishID,
		UploadURL: result.Data.UploadURL,
	}, nil
}

// UploadVideo uploads video bytes to a TikTok upload URL.
func (c *Client) UploadVideo(ctx context.Context, uploadURL string, videoBytes []byte) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, uploadURL, bytes.NewReader(videoBytes))
	if err != nil {
		return fmt.Errorf("tiktokapi: failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "video/mp4")
	req.Header.Set("Content-Range", fmt.Sprintf("bytes 0-%d/%d", len(videoBytes)-1, len(videoBytes)))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("tiktokapi: request failed: %w", err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return fmt.Errorf("tiktokapi: upload returned %d", resp.StatusCode)
	}

	return nil
}
