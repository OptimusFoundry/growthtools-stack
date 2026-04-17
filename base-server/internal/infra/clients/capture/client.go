// Package capture wraps the capture-worker HTTP API so processors can kick
// off a Playwright demo from a GitHub commit and get back S3 keys for the
// uploaded screenshots / video.
package capture

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"base-server/internal/infra/observability"
)

// Request is the POST /capture body.
type Request struct {
	Commit   string `json:"commit"`
	AppURL   string `json:"appUrl,omitempty"`
	Email    string `json:"email,omitempty"`
	Password string `json:"password,omitempty"`
	Goal     string `json:"goal,omitempty"`
	PagePath string `json:"pagePath,omitempty"`
}

// Uploaded is a single S3 object produced by the capture.
type Uploaded struct {
	Key string  `json:"key"`
	URL *string `json:"url,omitempty"`
}

// Response is the POST /capture reply.
type Response struct {
	Commit     string     `json:"commit"`
	CaptureDir string     `json:"captureDir"`
	StepCount  int        `json:"stepCount"`
	Uploaded   []Uploaded `json:"uploaded"`
}

// Client wraps the capture-worker HTTP endpoint.
type Client struct {
	baseURL      string
	sharedSecret string
	httpClient   *http.Client
	logger       *observability.Logger
}

// NewClient constructs a capture-worker client. If baseURL is empty the
// client is a no-op (Capture returns an error) — callers should gate on
// Enabled() to avoid wasting work.
func NewClient(baseURL, sharedSecret string, logger *observability.Logger) *Client {
	return &Client{
		baseURL:      baseURL,
		sharedSecret: sharedSecret,
		httpClient: &http.Client{
			// Playwright runs can be slow; give the capture generous headroom.
			Timeout: 10 * time.Minute,
		},
		logger: logger,
	}
}

// Enabled reports whether the client has a base URL configured.
func (c *Client) Enabled() bool {
	return c.baseURL != ""
}

// Capture fires a POST /capture and returns the parsed response.
func (c *Client) Capture(ctx context.Context, req Request) (Response, error) {
	if !c.Enabled() {
		return Response{}, fmt.Errorf("capture-worker URL not configured")
	}

	body, err := json.Marshal(req)
	if err != nil {
		return Response{}, fmt.Errorf("failed to marshal capture request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/capture", bytes.NewReader(body))
	if err != nil {
		return Response{}, fmt.Errorf("failed to create capture request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if c.sharedSecret != "" {
		httpReq.Header.Set("X-Capture-Secret", c.sharedSecret)
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		c.logger.Error(ctx, "failed to call capture-worker", err)
		return Response{}, fmt.Errorf("capture-worker call failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return Response{}, fmt.Errorf("failed to read capture response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return Response{}, fmt.Errorf("capture-worker returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var result Response
	if err := json.Unmarshal(respBody, &result); err != nil {
		return Response{}, fmt.Errorf("failed to parse capture response: %w", err)
	}
	return result, nil
}
