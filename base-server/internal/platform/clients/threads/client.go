package threads

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"base-server/internal/infra/observability"
)

// Client handles HTTP communication with the Threads API.
type Client struct {
	httpClient *http.Client
	logger     *observability.Logger
}

// NewClient creates a new Threads API client.
func NewClient(logger *observability.Logger) *Client {
	return &Client{
		httpClient: &http.Client{},
		logger:     logger,
	}
}

// CreateThread creates a thread container (step 1 of the 2-step flow).
func (c *Client) CreateThread(ctx context.Context, accessToken string, req CreateThreadRequest) (CreateThreadResponse, error) {
	endpoint := fmt.Sprintf("https://graph.threads.net/v1.0/%s/threads", req.UserID)

	params := url.Values{}
	params.Set("text", req.Text)
	params.Set("access_token", accessToken)
	params.Set("media_type", req.MediaType)

	if req.MediaType == "IMAGE" && req.ImageURL != "" {
		params.Set("image_url", req.ImageURL)
	}
	if req.ReplyToID != "" {
		params.Set("reply_to_id", req.ReplyToID)
	}

	resp, err := http.PostForm(endpoint, params)
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

// PublishThread publishes a previously created thread container (step 2).
func (c *Client) PublishThread(ctx context.Context, userID, accessToken, containerID string) (PublishThreadResponse, error) {
	endpoint := fmt.Sprintf("https://graph.threads.net/v1.0/%s/threads_publish", userID)

	params := url.Values{}
	params.Set("creation_id", containerID)
	params.Set("access_token", accessToken)

	resp, err := http.PostForm(endpoint, params)
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
	endpoint := fmt.Sprintf("https://graph.threads.net/v1.0/%s/insights?metric=views,likes,replies,reposts&access_token=%s",
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
	endpoint := "https://graph.threads.net/v1.0/me?fields=id&access_token=" + accessToken

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

// GetPermalink retrieves the permalink for a Threads post.
func (c *Client) GetPermalink(ctx context.Context, threadID, accessToken string) (string, error) {
	endpoint := fmt.Sprintf("https://graph.threads.net/v1.0/%s?fields=permalink&access_token=%s", threadID, accessToken)
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
