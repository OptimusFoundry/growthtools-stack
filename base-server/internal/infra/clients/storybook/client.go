package storybook

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"base-server/internal/infra/observability"
)

// IndexEntry is a single story's metadata as reported by Storybook's
// generated index.json.
type IndexEntry struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Name       string `json:"name"`
	ImportPath string `json:"importPath"`
	Type       string `json:"type"`
}

// Index is the top-level shape of a Storybook deployment's index.json.
type Index struct {
	Entries map[string]IndexEntry `json:"entries"`
}

// Client fetches a Storybook deployment's story index over plain HTTP. The
// index endpoint is public, so no auth is required.
type Client struct {
	logger     *observability.Logger
	httpClient *http.Client
}

// NewClient creates a new Storybook index client.
func NewClient(logger *observability.Logger) *Client {
	return &Client{
		logger:     logger,
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

// FetchIndex fetches and decodes {baseURL}/index.json.
func (c *Client) FetchIndex(ctx context.Context, baseURL string) (Index, error) {
	reqURL := baseURL + "/index.json"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return Index{}, fmt.Errorf("storybook index fetch %s: failed to create request: %w", baseURL, err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error(ctx, "failed to fetch storybook index", err)
		return Index{}, fmt.Errorf("storybook index fetch %s: %w", baseURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		err := fmt.Errorf("storybook index fetch %s: unexpected status %d", baseURL, resp.StatusCode)
		c.logger.Error(ctx, "failed to fetch storybook index", err)
		return Index{}, err
	}

	var idx Index
	if err := json.NewDecoder(resp.Body).Decode(&idx); err != nil {
		c.logger.Error(ctx, "failed to decode storybook index", err)
		return Index{}, fmt.Errorf("storybook index fetch %s: failed to decode response: %w", baseURL, err)
	}

	return idx, nil
}
