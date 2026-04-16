package facebook

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"base-server/internal/infra/observability"
)

// Client handles HTTP communication with the Facebook Graph API.
type Client struct {
	httpClient *http.Client
	logger     *observability.Logger
}

// NewClient creates a new Facebook API client.
func NewClient(logger *observability.Logger) *Client {
	return &Client{
		httpClient: &http.Client{},
		logger:     logger,
	}
}

// PostToFeed creates a text post on a Facebook Page feed.
func (c *Client) PostToFeed(ctx context.Context, pageID, accessToken, message string) (PostResponse, error) {
	endpoint := fmt.Sprintf("https://graph.facebook.com/v21.0/%s/feed", pageID)

	params := url.Values{}
	params.Set("message", message)
	params.Set("access_token", accessToken)

	resp, err := http.PostForm(endpoint, params)
	if err != nil {
		return PostResponse{}, fmt.Errorf("facebookapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return PostResponse{}, fmt.Errorf("facebookapi: API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return PostResponse{}, fmt.Errorf("facebookapi: failed to parse response: %w", err)
	}

	return PostResponse{ID: result.ID}, nil
}

// PostPhoto creates a photo post on a Facebook Page.
func (c *Client) PostPhoto(ctx context.Context, pageID, accessToken, message, imageURL string) (PostResponse, error) {
	endpoint := fmt.Sprintf("https://graph.facebook.com/v21.0/%s/photos", pageID)

	params := url.Values{}
	params.Set("message", message)
	params.Set("url", imageURL)
	params.Set("access_token", accessToken)

	resp, err := http.PostForm(endpoint, params)
	if err != nil {
		return PostResponse{}, fmt.Errorf("facebookapi: photo request failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return PostResponse{}, fmt.Errorf("facebookapi: photo API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		ID     string `json:"id"`
		PostID string `json:"post_id"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return PostResponse{}, fmt.Errorf("facebookapi: failed to parse photo response: %w", err)
	}

	return PostResponse{ID: result.ID, PostID: result.PostID}, nil
}

// GetPostInsights retrieves engagement metrics for a Facebook post.
func (c *Client) GetPostInsights(ctx context.Context, postID, accessToken string) (PostInsights, error) {
	endpoint := fmt.Sprintf("https://graph.facebook.com/v21.0/%s?fields=insights.metric(post_impressions_unique),likes.summary(true),comments.summary(true),shares&access_token=%s",
		postID, accessToken)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return PostInsights{}, fmt.Errorf("facebookapi: failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return PostInsights{}, fmt.Errorf("facebookapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return PostInsights{}, fmt.Errorf("facebookapi: API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Likes struct {
			Summary struct {
				TotalCount int `json:"total_count"`
			} `json:"summary"`
		} `json:"likes"`
		Comments struct {
			Summary struct {
				TotalCount int `json:"total_count"`
			} `json:"summary"`
		} `json:"comments"`
		Shares struct {
			Count int `json:"count"`
		} `json:"shares"`
		Insights struct {
			Data []struct {
				Values []struct {
					Value int `json:"value"`
				} `json:"values"`
			} `json:"data"`
		} `json:"insights"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return PostInsights{}, fmt.Errorf("facebookapi: failed to parse response: %w", err)
	}

	impressions := 0
	if len(result.Insights.Data) > 0 && len(result.Insights.Data[0].Values) > 0 {
		impressions = result.Insights.Data[0].Values[0].Value
	}

	return PostInsights{
		Impressions: impressions,
		Likes:       result.Likes.Summary.TotalCount,
		Comments:    result.Comments.Summary.TotalCount,
		Shares:      result.Shares.Count,
	}, nil
}
