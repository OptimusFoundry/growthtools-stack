package threads

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"base-server/internal/infra/observability"
)

// ErrNotFound indicates the Threads API returned 404 for the requested resource.
var ErrNotFound = errors.New("threadsapi: not found")

// Client handles HTTP communication with the Threads API.
type Client struct {
	httpClient *http.Client
	logger     *observability.Logger
	baseURL    string // empty = use production
}

// NewClient creates a new Threads API client.
func NewClient(baseURL string, httpClient *http.Client, logger *observability.Logger) *Client {
	return &Client{
		httpClient: httpClient,
		logger:     logger,
		baseURL:    baseURL,
	}
}

func (c *Client) apiBase() string {
	if c.baseURL != "" {
		return c.baseURL
	}
	return "https://graph.threads.net"
}

// CreateThread creates a thread container (step 1 of the 2-step flow).
func (c *Client) CreateThread(ctx context.Context, accessToken string, req CreateThreadRequest) (CreateThreadResponse, error) {
	endpoint := fmt.Sprintf(c.apiBase()+"/v1.0/%s/threads", req.UserID)

	params := url.Values{}
	params.Set("text", req.Text)
	params.Set("access_token", accessToken)
	params.Set("media_type", req.MediaType)

	if req.MediaType == "IMAGE" && req.ImageURL != "" {
		params.Set("image_url", req.ImageURL)
	}
	if req.MediaType == "VIDEO" && req.VideoURL != "" {
		params.Set("video_url", req.VideoURL)
	}
	if req.ReplyToID != "" {
		params.Set("reply_to_id", req.ReplyToID)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(params.Encode()))
	if err != nil {
		return CreateThreadResponse{}, fmt.Errorf("threadsapi: failed to create container request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return CreateThreadResponse{}, fmt.Errorf("threadsapi: container request failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return CreateThreadResponse{}, fmt.Errorf("threadsapi: container API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return CreateThreadResponse{}, fmt.Errorf("threadsapi: failed to parse container response: %w", err)
	}

	return CreateThreadResponse{ID: result.ID}, nil
}

// GetContainerStatus reads the container's current processing status and,
// when Meta reports an error, its error_message.
// Threads returns one of: IN_PROGRESS, FINISHED, ERROR, PUBLISHED, EXPIRED.
// Videos need to reach FINISHED before they can be published; images are
// usually finished almost immediately.
// Returns (status, errorMessage, err). errorMessage is non-empty only when
// status is ERROR — it carries Meta's human-readable reason for the failure.
func (c *Client) GetContainerStatus(ctx context.Context, containerID, accessToken string) (status, errorMessage string, err error) {
	endpoint := fmt.Sprintf(c.apiBase()+"/v1.0/%s?fields=status,error_message&access_token=%s",
		containerID, url.QueryEscape(accessToken))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return "", "", fmt.Errorf("threadsapi: failed to create status request: %w", err)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("threadsapi: status request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("threadsapi: status API returned %d: %s", resp.StatusCode, string(body))
	}
	var result struct {
		Status       string `json:"status"`
		ErrorMessage string `json:"error_message"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", fmt.Errorf("threadsapi: failed to parse status response: %w", err)
	}
	return result.Status, result.ErrorMessage, nil
}

// WaitForContainerReady polls GetContainerStatus until the container is
// FINISHED (ready to publish) or a terminal failure state, respecting
// the provided timeout. Used for VIDEO containers, whose server-side
// transcode can take 5-15 seconds and which the publish endpoint
// rejects if called before processing completes.
func (c *Client) WaitForContainerReady(ctx context.Context, containerID, accessToken string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	// Poll at 2s — Meta's docs show typical video processing in the
	// 5-15s range for short clips, and this cadence keeps us at most
	// two seconds behind FINISHED without hammering the API.
	const interval = 2 * time.Second
	for {
		status, errMsg, err := c.GetContainerStatus(ctx, containerID, accessToken)
		if err != nil {
			return err
		}
		switch status {
		case "FINISHED":
			return nil
		case "ERROR", "EXPIRED":
			if errMsg != "" {
				return fmt.Errorf("threadsapi: container %s entered terminal state %s: %s", containerID, status, errMsg)
			}
			return fmt.Errorf("threadsapi: container %s entered terminal state %s", containerID, status)
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("threadsapi: container %s still in state %s after %s", containerID, status, timeout)
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(interval):
		}
	}
}

// PublishThread publishes a previously created thread container (step 2).
func (c *Client) PublishThread(ctx context.Context, userID, accessToken, containerID string) (PublishThreadResponse, error) {
	endpoint := fmt.Sprintf(c.apiBase()+"/v1.0/%s/threads_publish", userID)

	params := url.Values{}
	params.Set("creation_id", containerID)
	params.Set("access_token", accessToken)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(params.Encode()))
	if err != nil {
		return PublishThreadResponse{}, fmt.Errorf("threadsapi: failed to create publish request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return PublishThreadResponse{}, fmt.Errorf("threadsapi: publish request failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return PublishThreadResponse{}, fmt.Errorf("threadsapi: publish API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return PublishThreadResponse{}, fmt.Errorf("threadsapi: failed to parse publish response: %w", err)
	}

	return PublishThreadResponse{ID: result.ID}, nil
}

// GetThreadInsights retrieves engagement metrics for a Threads post.
func (c *Client) GetThreadInsights(ctx context.Context, postID, accessToken string) (ThreadInsights, error) {
	endpoint := fmt.Sprintf(c.apiBase()+"/v1.0/%s/insights?metric=views,likes,replies,reposts&access_token=%s",
		postID, accessToken)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return ThreadInsights{}, fmt.Errorf("threadsapi: failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return ThreadInsights{}, fmt.Errorf("threadsapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode == http.StatusNotFound {
		return ThreadInsights{}, fmt.Errorf("%w: thread %s", ErrNotFound, postID)
	}
	if resp.StatusCode != http.StatusOK {
		return ThreadInsights{}, fmt.Errorf("threadsapi: API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Data []struct {
			Name   string `json:"name"`
			Values []struct {
				Value int `json:"value"`
			} `json:"values"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return ThreadInsights{}, fmt.Errorf("threadsapi: failed to parse response: %w", err)
	}

	insights := ThreadInsights{}
	for _, metric := range result.Data {
		if len(metric.Values) == 0 {
			continue
		}
		val := metric.Values[0].Value
		switch metric.Name {
		case "views":
			insights.Views = val
		case "likes":
			insights.Likes = val
		case "replies":
			insights.Replies = val
		case "reposts":
			insights.Reposts = val
		}
	}

	return insights, nil
}

// VerifyCredentials checks if an access token is still valid by calling GET /v1.0/me.
func (c *Client) VerifyCredentials(ctx context.Context, accessToken string) error {
	endpoint := c.apiBase() + "/v1.0/me?fields=id&access_token=" + accessToken

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return fmt.Errorf("threadsapi: failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("threadsapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("threadsapi: verify credentials returned %d", resp.StatusCode)
	}

	return nil
}

// GetProfile retrieves the user's Threads profile (id and username).
func (c *Client) GetProfile(ctx context.Context, accessToken string) (userID, username string, err error) {
	endpoint := c.apiBase() + "/v1.0/me?fields=id,username&access_token=" + accessToken

	req, reqErr := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if reqErr != nil {
		return "", "", fmt.Errorf("threadsapi: failed to create request: %w", reqErr)
	}

	resp, doErr := c.httpClient.Do(req)
	if doErr != nil {
		return "", "", fmt.Errorf("threadsapi: request failed: %w", doErr)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("threadsapi: get profile returned %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		ID       string `json:"id"`
		Username string `json:"username"`
	}
	if jsonErr := json.Unmarshal(body, &result); jsonErr != nil {
		return "", "", fmt.Errorf("threadsapi: failed to parse profile response: %w", jsonErr)
	}

	return result.ID, result.Username, nil
}

// GetPermalink retrieves the permalink for a Threads post.
func (c *Client) GetPermalink(ctx context.Context, threadID, accessToken string) (string, error) {
	endpoint := fmt.Sprintf(c.apiBase()+"/v1.0/%s?fields=permalink&access_token=%s", threadID, accessToken)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return "", fmt.Errorf("threadsapi: failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("threadsapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Permalink string `json:"permalink"`
	}
	json.Unmarshal(body, &result)
	return result.Permalink, nil
}
