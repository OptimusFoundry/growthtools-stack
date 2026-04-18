package x

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"base-server/internal/infra/observability"
)

// Client handles HTTP communication with the X (Twitter) API.
type Client struct {
	apiKey     string
	apiSecret  string
	httpClient *http.Client
	logger     *observability.Logger
}

// NewClient creates a new X API client with app-level credentials.
func NewClient(apiKey, apiSecret string, logger *observability.Logger) *Client {
	return &Client{
		apiKey:     apiKey,
		apiSecret:  apiSecret,
		httpClient: &http.Client{},
		logger:     logger,
	}
}

// CreateTweet posts a tweet via the X v2 API.
func (c *Client) CreateTweet(ctx context.Context, req CreateTweetRequest, accessToken, tokenSecret string) (CreateTweetResponse, error) {
	payload := map[string]any{
		"text": req.Text,
	}
	if len(req.MediaIDs) > 0 {
		payload["media"] = map[string]any{
			"media_ids": req.MediaIDs,
		}
	}
	if req.ReplyToID != "" {
		payload["reply"] = map[string]any{
			"in_reply_to_tweet_id": req.ReplyToID,
		}
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return CreateTweetResponse{}, fmt.Errorf("xapi: failed to marshal payload: %w", err)
	}

	endpoint := "https://api.x.com/2/tweets"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(string(body)))
	if err != nil {
		return CreateTweetResponse{}, fmt.Errorf("xapi: failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", c.authHeader(http.MethodPost, endpoint, nil, accessToken, tokenSecret))

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return CreateTweetResponse{}, fmt.Errorf("xapi: request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusCreated {
		return CreateTweetResponse{}, fmt.Errorf("xapi: API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return CreateTweetResponse{}, fmt.Errorf("xapi: failed to parse response: %w", err)
	}

	return CreateTweetResponse{ID: result.Data.ID}, nil
}


// GetTweetMetrics retrieves public engagement metrics for a tweet.
func (c *Client) GetTweetMetrics(ctx context.Context, tweetID, accessToken, tokenSecret string) (TweetMetrics, error) {
	endpoint := fmt.Sprintf("https://api.x.com/2/tweets/%s?tweet.fields=public_metrics", tweetID)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return TweetMetrics{}, fmt.Errorf("xapi: failed to create request: %w", err)
	}

	params := url.Values{}
	params.Set("tweet.fields", "public_metrics")
	httpReq.Header.Set("Authorization", c.authHeader(http.MethodGet, fmt.Sprintf("https://api.x.com/2/tweets/%s", tweetID), params, accessToken, tokenSecret))

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return TweetMetrics{}, fmt.Errorf("xapi: request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return TweetMetrics{}, fmt.Errorf("xapi: API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Data struct {
			PublicMetrics struct {
				RetweetCount    int `json:"retweet_count"`
				ReplyCount      int `json:"reply_count"`
				LikeCount       int `json:"like_count"`
				QuoteCount      int `json:"quote_count"`
				BookmarkCount   int `json:"bookmark_count"`
				ImpressionCount int `json:"impression_count"`
			} `json:"public_metrics"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return TweetMetrics{}, fmt.Errorf("xapi: failed to parse response: %w", err)
	}

	m := result.Data.PublicMetrics
	return TweetMetrics{
		ImpressionCount: m.ImpressionCount,
		LikeCount:       m.LikeCount,
		ReplyCount:      m.ReplyCount,
		RetweetCount:    m.RetweetCount,
		QuoteCount:      m.QuoteCount,
		BookmarkCount:   m.BookmarkCount,
	}, nil
}

// VerifyCredentials checks if an OAuth 2.0 Bearer token is still valid by calling GET /2/users/me.
func (c *Client) VerifyCredentials(ctx context.Context, accessToken string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.x.com/2/users/me", nil)
	if err != nil {
		return fmt.Errorf("xapi: failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("xapi: request failed: %w", err)
	}
	defer resp.Body.Close()

	// 200 = valid token, 403 = valid token but endpoint not accessible (Free tier),
	// 429 = rate limited (token is still valid). Only 401 means the token is expired/revoked.
	if resp.StatusCode == http.StatusUnauthorized {
		return fmt.Errorf("xapi: verify credentials returned %d", resp.StatusCode)
	}

	return nil
}

