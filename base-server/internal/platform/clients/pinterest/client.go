package pinterest

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"base-server/internal/infra/observability"
)

// Client handles HTTP communication with the Pinterest API.
type Client struct {
	httpClient *http.Client
	logger     *observability.Logger
	baseURL    string // empty = use production URLs
}

// NewClient creates a new Pinterest API client.
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
	return "https://api.pinterest.com"
}

// ListBoards retrieves the user's Pinterest boards (first page, 1 result).
func (c *Client) ListBoards(ctx context.Context, accessToken string) ([]Board, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.apiBase()+"/v5/boards?page_size=1", nil)
	if err != nil {
		return nil, fmt.Errorf("pinterestapi: failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("pinterestapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("pinterestapi: boards API returned %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Items []struct {
			ID string `json:"id"`
		} `json:"items"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("pinterestapi: failed to parse response: %w", err)
	}

	if len(result.Items) == 0 {
		return nil, ErrNoBoardsFound
	}

	boards := make([]Board, len(result.Items))
	for i, item := range result.Items {
		boards[i] = Board{ID: item.ID}
	}
	return boards, nil
}

// CreatePin creates a Pin on Pinterest.
func (c *Client) CreatePin(ctx context.Context, accessToken string, req CreatePinRequest) (CreatePinResponse, error) {
	payload := map[string]any{
		"board_id":    req.BoardID,
		"description": req.Description,
		"title":       req.Title,
	}

	if req.ImageURL != "" {
		payload["media_source"] = map[string]any{
			"source_type": "image_url",
			"url":         req.ImageURL,
		}
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return CreatePinResponse{}, fmt.Errorf("pinterestapi: failed to marshal payload: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.apiBase()+"/v5/pins", bytes.NewReader(body))
	if err != nil {
		return CreatePinResponse{}, fmt.Errorf("pinterestapi: failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return CreatePinResponse{}, fmt.Errorf("pinterestapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusCreated {
		return CreatePinResponse{}, fmt.Errorf("pinterestapi: API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		ID   string `json:"id"`
		Link string `json:"link"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return CreatePinResponse{}, fmt.Errorf("pinterestapi: failed to parse response: %w", err)
	}

	return CreatePinResponse{ID: result.ID, Link: result.Link}, nil
}

// GetPinAnalytics retrieves engagement metrics for a Pinterest Pin.
func (c *Client) GetPinAnalytics(ctx context.Context, accessToken, pinID string) (PinAnalytics, error) {
	endpoint := fmt.Sprintf(c.apiBase()+"/v5/pins/%s/analytics?start_date=2020-01-01&end_date=2099-12-31&metric_types=IMPRESSION,PIN_CLICK,SAVE,OUTBOUND_CLICK", pinID)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return PinAnalytics{}, fmt.Errorf("pinterestapi: failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return PinAnalytics{}, fmt.Errorf("pinterestapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return PinAnalytics{}, fmt.Errorf("pinterestapi: API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		All struct {
			Summary struct {
				Impression    int `json:"IMPRESSION"`
				PinClick      int `json:"PIN_CLICK"`
				Save          int `json:"SAVE"`
				OutboundClick int `json:"OUTBOUND_CLICK"`
			} `json:"summary"`
		} `json:"all"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return PinAnalytics{}, fmt.Errorf("pinterestapi: failed to parse response: %w", err)
	}

	return PinAnalytics{
		Impressions:    result.All.Summary.Impression,
		PinClicks:      result.All.Summary.PinClick,
		Saves:          result.All.Summary.Save,
		OutboundClicks: result.All.Summary.OutboundClick,
	}, nil
}
