package linkedin

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"base-server/internal/infra/observability"
)

// Client handles HTTP communication with the LinkedIn REST API.
type Client struct {
	httpClient *http.Client
	logger     *observability.Logger
}

// NewClient creates a new LinkedIn API client.
func NewClient(logger *observability.Logger) *Client {
	return &Client{
		httpClient: &http.Client{},
		logger:     logger,
	}
}

// CreatePost creates a post on LinkedIn.
func (c *Client) CreatePost(ctx context.Context, accessToken string, req CreatePostRequest) (CreatePostResponse, error) {
	payload := map[string]any{
		"author":     req.AuthorURN,
		"commentary": req.Content,
		"visibility": "PUBLIC",
		"distribution": map[string]any{
			"feedDistribution":               "MAIN_FEED",
			"targetEntities":                 []any{},
			"thirdPartyDistributionChannels": []any{},
		},
		"lifecycleState": "PUBLISHED",
	}

	if len(req.MediaAssets) > 0 {
		payload["content"] = map[string]any{
			"multiImage": map[string]any{
				"images": req.MediaAssets,
			},
		}
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return CreatePostResponse{}, fmt.Errorf("linkedinapi: failed to marshal payload: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.linkedin.com/rest/posts", bytes.NewReader(body))
	if err != nil {
		return CreatePostResponse{}, fmt.Errorf("linkedinapi: failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+accessToken)
	httpReq.Header.Set("LinkedIn-Version", "202401")
	httpReq.Header.Set("X-Restli-Protocol-Version", "2.0.0")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return CreatePostResponse{}, fmt.Errorf("linkedinapi: request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusCreated {
		return CreatePostResponse{}, fmt.Errorf("linkedinapi: API returned %d: %s", resp.StatusCode, string(respBody))
	}

	postURN := resp.Header.Get("x-restli-id")
	return CreatePostResponse{PostURN: postURN}, nil
}

// InitializeImageUpload initializes an image upload on LinkedIn and returns the upload URL and image URN.
func (c *Client) InitializeImageUpload(ctx context.Context, accessToken, authorURN string) (InitializeImageUploadResponse, error) {
	initPayload, _ := json.Marshal(map[string]any{
		"initializeUploadRequest": map[string]any{
			"owner": authorURN,
		},
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.linkedin.com/rest/images?action=initializeUpload", bytes.NewReader(initPayload))
	if err != nil {
		return InitializeImageUploadResponse{}, fmt.Errorf("linkedinapi: failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("LinkedIn-Version", "202401")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return InitializeImageUploadResponse{}, fmt.Errorf("linkedinapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return InitializeImageUploadResponse{}, fmt.Errorf("linkedinapi: initializeUpload failed with %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Value struct {
			UploadURL string `json:"uploadUrl"`
			Image     string `json:"image"`
		} `json:"value"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return InitializeImageUploadResponse{}, fmt.Errorf("linkedinapi: failed to parse response: %w", err)
	}

	return InitializeImageUploadResponse{
		UploadURL: result.Value.UploadURL,
		ImageURN:  result.Value.Image,
	}, nil
}

// UploadImage uploads image bytes to a LinkedIn upload URL.
func (c *Client) UploadImage(ctx context.Context, accessToken, uploadURL string, imageBytes []byte) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, uploadURL, bytes.NewReader(imageBytes))
	if err != nil {
		return fmt.Errorf("linkedinapi: failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("linkedinapi: request failed: %w", err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return fmt.Errorf("linkedinapi: upload failed with %d", resp.StatusCode)
	}

	return nil
}

// GetSocialMetadata retrieves engagement metrics for a LinkedIn post.
func (c *Client) GetSocialMetadata(ctx context.Context, accessToken, postID string) (SocialMetadata, error) {
	endpoint := fmt.Sprintf("https://api.linkedin.com/rest/socialMetadata/%s", postID)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return SocialMetadata{}, fmt.Errorf("linkedinapi: failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("LinkedIn-Version", "202401")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return SocialMetadata{}, fmt.Errorf("linkedinapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return SocialMetadata{}, fmt.Errorf("linkedinapi: API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		LikesSummary struct {
			TotalLikes int `json:"totalLikes"`
		} `json:"likesSummary"`
		CommentsSummary struct {
			TotalFirstLevelComments int `json:"totalFirstLevelComments"`
		} `json:"commentsSummary"`
		SharesSummary struct {
			TotalShares int `json:"totalShares"`
		} `json:"sharesSummary"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return SocialMetadata{}, fmt.Errorf("linkedinapi: failed to parse response: %w", err)
	}

	return SocialMetadata{
		TotalLikes:              result.LikesSummary.TotalLikes,
		TotalFirstLevelComments: result.CommentsSummary.TotalFirstLevelComments,
		TotalShares:             result.SharesSummary.TotalShares,
	}, nil
}
