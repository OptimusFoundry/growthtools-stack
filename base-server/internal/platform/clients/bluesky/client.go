package bluesky

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"base-server/internal/infra/observability"
)

// Client handles HTTP communication with the Bluesky AT Protocol API.
type Client struct {
	httpClient  *http.Client
	logger      *observability.Logger
	baseURL     string // empty = use production PDS host
	appViewHost string // empty = use production AppView host
}

// NewClient creates a new Bluesky API client.
func NewClient(baseURL string, httpClient *http.Client, logger *observability.Logger) *Client {
	return &Client{
		httpClient:  httpClient,
		logger:      logger,
		baseURL:     baseURL,
		appViewHost: "",
	}
}

// host returns the PDS host to use for requests.
func (c *Client) host() string {
	if c.baseURL != "" {
		return c.baseURL
	}
	return "https://bsky.social"
}

// appView returns the AppView host to use for read requests.
func (c *Client) appView() string {
	if c.appViewHost != "" {
		return c.appViewHost
	}
	return "https://public.api.bsky.app"
}

// WithAppViewHost overrides the AppView host. Used in tests only.
func (c *Client) WithAppViewHost(host string) *Client {
	c.appViewHost = host
	return c
}

// CreateSession authenticates with Bluesky and returns an access JWT and DID.
func (c *Client) CreateSession(ctx context.Context, handle, appPassword string) (SessionResponse, error) {
	payload, _ := json.Marshal(map[string]string{
		"identifier": handle,
		"password":   appPassword,
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.host()+"/xrpc/com.atproto.server.createSession", bytes.NewReader(payload))
	if err != nil {
		return SessionResponse{}, fmt.Errorf("blueskyapi: failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return SessionResponse{}, fmt.Errorf("blueskyapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return SessionResponse{}, fmt.Errorf("blueskyapi: createSession failed with %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		AccessJwt string `json:"accessJwt"`
		DID       string `json:"did"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return SessionResponse{}, fmt.Errorf("blueskyapi: failed to parse response: %w", err)
	}
	return SessionResponse{AccessJwt: result.AccessJwt, DID: result.DID}, nil
}

// VerifyCredentials checks if Bluesky credentials (handle + app password) are still valid.
func (c *Client) VerifyCredentials(ctx context.Context, handle, appPassword string) error {
	_, err := c.CreateSession(ctx, handle, appPassword)
	return err
}

// CreateRecord creates an AT Protocol record (e.g. a post).
func (c *Client) CreateRecord(ctx context.Context, accessJwt string, req CreateRecordRequest) (CreateRecordResponse, error) {
	payload := map[string]any{
		"repo":       req.DID,
		"collection": req.Collection,
		"record":     req.Record,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return CreateRecordResponse{}, fmt.Errorf("blueskyapi: failed to marshal payload: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.host()+"/xrpc/com.atproto.repo.createRecord", bytes.NewReader(body))
	if err != nil {
		return CreateRecordResponse{}, fmt.Errorf("blueskyapi: failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+accessJwt)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return CreateRecordResponse{}, fmt.Errorf("blueskyapi: request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return CreateRecordResponse{}, fmt.Errorf("blueskyapi: API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		URI string `json:"uri"`
		CID string `json:"cid"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return CreateRecordResponse{}, fmt.Errorf("blueskyapi: failed to parse response: %w", err)
	}

	return CreateRecordResponse{URI: result.URI, CID: result.CID}, nil
}

// UploadBlob uploads binary data (e.g. an image) to Bluesky and returns the blob reference.
func (c *Client) UploadBlob(ctx context.Context, accessJwt string, data []byte, contentType string) (map[string]any, error) {
	if contentType == "" {
		contentType = "image/jpeg"
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.host()+"/xrpc/com.atproto.repo.uploadBlob", bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("blueskyapi: failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Authorization", "Bearer "+accessJwt)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("blueskyapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("blueskyapi: uploadBlob failed with %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Blob map[string]any `json:"blob"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("blueskyapi: failed to parse response: %w", err)
	}
	return result.Blob, nil
}

// GetPosts fetches post views from the public Bluesky AppView.
// No authentication is required. atURIs is a slice of AT URIs.
func (c *Client) GetPosts(ctx context.Context, atURIs []string) (GetPostsResponse, error) {
	// Build query string: ?uris=<uri1>&uris=<uri2>...
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.appView()+"/xrpc/app.bsky.feed.getPosts", nil)
	if err != nil {
		return GetPostsResponse{}, fmt.Errorf("blueskyapi: failed to create request: %w", err)
	}
	q := req.URL.Query()
	for _, uri := range atURIs {
		q.Add("uris", uri)
	}
	req.URL.RawQuery = q.Encode()

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return GetPostsResponse{}, fmt.Errorf("blueskyapi: request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return GetPostsResponse{}, fmt.Errorf("blueskyapi: getPosts returned %d: %s", resp.StatusCode, string(body))
	}

	var result GetPostsResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return GetPostsResponse{}, fmt.Errorf("blueskyapi: failed to parse getPosts response: %w", err)
	}
	return result, nil
}
