package github

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"base-server/internal/infra/observability"
)

const (
	githubAPIBase      = "https://api.github.com"
	githubOAuthTokenURL = "https://github.com/login/oauth/access_token"
)

// OAuthTokenResponse is returned by GitHub's token endpoint
type OAuthTokenResponse struct {
	AccessToken string `json:"access_token"`
	Scope       string `json:"scope"`
	TokenType   string `json:"token_type"`
	Error       string `json:"error"`
	ErrorDesc   string `json:"error_description"`
}

// GitHubUser represents a GitHub user returned by GET /user
type GitHubUser struct {
	ID    int64  `json:"id"`
	Login string `json:"login"`
}

// GitHubRepo represents a repository returned by GET /user/repos
type GitHubRepo struct {
	ID            int64  `json:"id"`
	Name          string `json:"name"`
	FullName      string `json:"full_name"`
	Owner         Owner  `json:"owner"`
	DefaultBranch string `json:"default_branch"`
	Private       bool   `json:"private"`
}

// Owner is the repository owner sub-object
type Owner struct {
	Login string `json:"login"`
}

// Webhook represents a GitHub repository webhook
type Webhook struct {
	ID int64 `json:"id"`
}

// Client wraps GitHub REST API calls using plain net/http
type Client struct {
	clientID     string
	clientSecret string
	logger       *observability.Logger
	httpClient   *http.Client
}

// NewClient creates a new GitHub API client
func NewClient(clientID, clientSecret string, logger *observability.Logger) *Client {
	return &Client{
		clientID:     clientID,
		clientSecret: clientSecret,
		logger:       logger,
		httpClient:   &http.Client{},
	}
}

// ExchangeOAuthCode exchanges an OAuth authorization code for an access token and scope
func (c *Client) ExchangeOAuthCode(ctx context.Context, code string) (OAuthTokenResponse, error) {
	params := url.Values{}
	params.Set("client_id", c.clientID)
	params.Set("client_secret", c.clientSecret)
	params.Set("code", code)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, githubOAuthTokenURL, strings.NewReader(params.Encode()))
	if err != nil {
		return OAuthTokenResponse{}, fmt.Errorf("failed to create token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error(ctx, "failed to exchange oauth code", err)
		return OAuthTokenResponse{}, fmt.Errorf("failed to exchange oauth code: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return OAuthTokenResponse{}, fmt.Errorf("failed to read token response: %w", err)
	}

	var tokenResp OAuthTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return OAuthTokenResponse{}, fmt.Errorf("failed to parse token response: %w", err)
	}
	if tokenResp.Error != "" {
		return OAuthTokenResponse{}, fmt.Errorf("github oauth error: %s: %s", tokenResp.Error, tokenResp.ErrorDesc)
	}
	return tokenResp, nil
}

// GetAuthenticatedUser fetches the authenticated GitHub user via GET /user
func (c *Client) GetAuthenticatedUser(ctx context.Context, token string) (GitHubUser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, githubAPIBase+"/user", nil)
	if err != nil {
		return GitHubUser{}, fmt.Errorf("failed to create user request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error(ctx, "failed to get authenticated user", err)
		return GitHubUser{}, fmt.Errorf("failed to get authenticated user: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return GitHubUser{}, fmt.Errorf("github /user returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return GitHubUser{}, fmt.Errorf("failed to read user response: %w", err)
	}

	var user GitHubUser
	if err := json.Unmarshal(body, &user); err != nil {
		return GitHubUser{}, fmt.Errorf("failed to parse user response: %w", err)
	}
	return user, nil
}

// ListUserRepos lists the authenticated user's repos (paginated, 100 per page)
func (c *Client) ListUserRepos(ctx context.Context, token string, page int) ([]GitHubRepo, error) {
	reqURL := fmt.Sprintf("%s/user/repos?sort=updated&per_page=100&page=%d", githubAPIBase, page)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create repos request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error(ctx, "failed to list user repos", err)
		return nil, fmt.Errorf("failed to list user repos: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github /user/repos returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read repos response: %w", err)
	}

	var repos []GitHubRepo
	if err := json.Unmarshal(body, &repos); err != nil {
		return nil, fmt.Errorf("failed to parse repos response: %w", err)
	}
	return repos, nil
}

// CreateWebhook creates a push webhook on the given repo, returning the hook ID
func (c *Client) CreateWebhook(ctx context.Context, token, owner, name, webhookURL, secret string) (int64, error) {
	payload := map[string]any{
		"name":   "web",
		"active": true,
		"events": []string{"push"},
		"config": map[string]string{
			"url":          webhookURL,
			"content_type": "json",
			"secret":       secret,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal webhook payload: %w", err)
	}

	reqURL := fmt.Sprintf("%s/repos/%s/%s/hooks", githubAPIBase, owner, name)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, strings.NewReader(string(body)))
	if err != nil {
		return 0, fmt.Errorf("failed to create webhook request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error(ctx, "failed to create webhook", err)
		return 0, fmt.Errorf("failed to create webhook: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return 0, fmt.Errorf("github create webhook returned status %d: %s", resp.StatusCode, string(respBody))
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("failed to read webhook response: %w", err)
	}

	var hook Webhook
	if err := json.Unmarshal(respBody, &hook); err != nil {
		return 0, fmt.Errorf("failed to parse webhook response: %w", err)
	}
	return hook.ID, nil
}

// DeleteWebhook deletes the specified webhook from the given repo
func (c *Client) DeleteWebhook(ctx context.Context, token, owner, name string, hookID int64) error {
	reqURL := fmt.Sprintf("%s/repos/%s/%s/hooks/%s", githubAPIBase, owner, name, strconv.FormatInt(hookID, 10))
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, reqURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create delete webhook request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error(ctx, "failed to delete webhook", err)
		return fmt.Errorf("failed to delete webhook: %w", err)
	}
	defer resp.Body.Close()

	// 204 No Content is success; 404 means already gone — treat both as OK
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusNotFound {
		return fmt.Errorf("github delete webhook returned status %d", resp.StatusCode)
	}
	return nil
}
