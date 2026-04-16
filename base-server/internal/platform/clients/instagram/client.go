package instagram

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"base-server/internal/infra/observability"
)

// Client handles HTTP communication with the Instagram Graph API.
type Client struct {
	httpClient *http.Client
	logger     *observability.Logger
}

// NewClient creates a new Instagram API client.
func NewClient(logger *observability.Logger) *Client {
	return &Client{
		httpClient: &http.Client{},
		logger:     logger,
	}
}

// CreateMediaContainer creates a media container for Instagram publishing (step 1).
func (c *Client) CreateMediaContainer(ctx context.Context, igAccountID, accessToken, imageURL, caption string) (CreateMediaContainerResponse, error) {
	endpoint := fmt.Sprintf("https://graph.facebook.com/v21.0/%s/media", igAccountID)

	params := url.Values{}
	params.Set("image_url", imageURL)
	params.Set("caption", caption)
	params.Set("access_token", accessToken)

	resp, err := http.PostForm(endpoint, params)
	if err != nil {
		return CreateMediaContainerResponse{}, fmt.Errorf("instagramapi: container request failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return CreateMediaContainerResponse{}, fmt.Errorf("instagramapi: container API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return CreateMediaContainerResponse{}, fmt.Errorf("instagramapi: failed to parse container response: %w", err)
	}

	return CreateMediaContainerResponse{ID: result.ID}, nil
}

// PublishMedia publishes a previously created media container (step 2).
func (c *Client) PublishMedia(ctx context.Context, igAccountID, accessToken, containerID string) (PublishMediaResponse, error) {
	endpoint := fmt.Sprintf("https://graph.facebook.com/v21.0/%s/media_publish", igAccountID)

	params := url.Values{}
	params.Set("creation_id", containerID)
	params.Set("access_token", accessToken)

	resp, err := http.PostForm(endpoint, params)
	if err != nil {
		return PublishMediaResponse{}, fmt.Errorf("instagramapi: publish request failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return PublishMediaResponse{}, fmt.Errorf("instagramapi: publish API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return PublishMediaResponse{}, fmt.Errorf("instagramapi: failed to parse publish response: %w", err)
	}

	return PublishMediaResponse{ID: result.ID}, nil
}

// GetMediaInsights retrieves engagement metrics for an Instagram post.
func (c *Client) GetMediaInsights(ctx context.Context, postID, accessToken string) (MediaInsights, error) {
	endpoint := fmt.Sprintf("https://graph.facebook.com/v21.0/%s?fields=like_count,comments_count,impressions,reach&access_token=%s",
		postID, accessToken)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return MediaInsights{}, fmt.Errorf("instagramapi: failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return MediaInsights{}, fmt.Errorf("instagramapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return MediaInsights{}, fmt.Errorf("instagramapi: API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		LikeCount    int `json:"like_count"`
		CommentCount int `json:"comments_count"`
		Impressions  int `json:"impressions"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return MediaInsights{}, fmt.Errorf("instagramapi: failed to parse response: %w", err)
	}

	return MediaInsights{
		LikeCount:    result.LikeCount,
		CommentCount: result.CommentCount,
		Impressions:  result.Impressions,
	}, nil
}

// GetPermalink retrieves the permalink for an Instagram media item.
func (c *Client) GetPermalink(ctx context.Context, mediaID, accessToken string) (string, error) {
	endpoint := fmt.Sprintf("https://graph.facebook.com/v21.0/%s?fields=permalink&access_token=%s", mediaID, accessToken)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return "", fmt.Errorf("instagramapi: failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("instagramapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Permalink string `json:"permalink"`
	}
	json.Unmarshal(body, &result)
	return result.Permalink, nil
}
