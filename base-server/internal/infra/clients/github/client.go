package github

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"base-server/internal/infra/observability"
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
	clientID      string
	clientSecret  string
	apiBase       string
	oauthTokenURL string
	logger        *observability.Logger
	httpClient    *http.Client
}

// NewClient creates a new GitHub API client
func NewClient(clientID, clientSecret, apiBase, oauthTokenURL string, httpClient *http.Client, logger *observability.Logger) *Client {
	return &Client{
		clientID:      clientID,
		clientSecret:  clientSecret,
		apiBase:       apiBase,
		oauthTokenURL: oauthTokenURL,
		logger:        logger,
		httpClient:    httpClient,
	}
}

// ExchangeOAuthCode exchanges an OAuth authorization code for an access token and scope
func (c *Client) ExchangeOAuthCode(ctx context.Context, code string) (OAuthTokenResponse, error) {
	params := url.Values{}
	params.Set("client_id", c.clientID)
	params.Set("client_secret", c.clientSecret)
	params.Set("code", code)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.oauthTokenURL, strings.NewReader(params.Encode()))
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
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.apiBase+"/user", nil)
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
	reqURL := fmt.Sprintf("%s/user/repos?sort=updated&per_page=100&page=%d", c.apiBase, page)
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
		// push lands the commit; workflow_run tells us CI finished so we
		// only fire the capture agent after the code is actually deployed.
		"events": []string{"push", "workflow_run"},
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

	reqURL := fmt.Sprintf("%s/repos/%s/%s/hooks", c.apiBase, owner, name)
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

// GetCommitDiff returns the unified diff for a commit. Uses the diff media
// type so we don't have to assemble patches from the per-file JSON view.
// Returns "" (not error) when the commit is too large for GitHub to render a
// diff, so callers can fall through with just the commit message.
func (c *Client) GetCommitDiff(ctx context.Context, token, owner, name, sha string) (string, error) {
	reqURL := fmt.Sprintf("%s/repos/%s/%s/commits/%s", c.apiBase, owner, name, sha)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create commit diff request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.diff")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error(ctx, "failed to get commit diff", err)
		return "", fmt.Errorf("failed to get commit diff: %w", err)
	}
	defer resp.Body.Close()

	// 422 is GitHub's "diff too large to render" — not an error, just skip.
	if resp.StatusCode == http.StatusUnprocessableEntity {
		return "", nil
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("github /commits/%s returned status %d", sha, resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read commit diff response: %w", err)
	}
	return string(body), nil
}

// GetRepoReadme returns the decoded README content for a repository.
// Uses the /readme endpoint which returns the default-branch README in any
// common format. Returns empty string (not error) if the repo has no README
// so callers can fall through to defaults.
func (c *Client) GetRepoReadme(ctx context.Context, token, owner, name string) (string, error) {
	reqURL := fmt.Sprintf("%s/repos/%s/%s/readme", c.apiBase, owner, name)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create readme request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	// Ask for the raw content so we don't have to base64-decode.
	req.Header.Set("Accept", "application/vnd.github.raw")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error(ctx, "failed to get repo readme", err)
		return "", fmt.Errorf("failed to get repo readme: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return "", nil
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("github /readme returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read readme response: %w", err)
	}
	return string(body), nil
}

// DeleteWebhook deletes the specified webhook from the given repo
func (c *Client) DeleteWebhook(ctx context.Context, token, owner, name string, hookID int64) error {
	reqURL := fmt.Sprintf("%s/repos/%s/%s/hooks/%s", c.apiBase, owner, name, strconv.FormatInt(hookID, 10))
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

// GitRefResponse is returned by GET /repos/{owner}/{repo}/git/ref/{ref}
type GitRefResponse struct {
	Object GitRefObject `json:"object"`
}

// GitRefObject holds the SHA a git ref points at
type GitRefObject struct {
	SHA string `json:"sha"`
}

// RepoContentResponse is returned by GET /repos/{owner}/{repo}/contents/{path}
type RepoContentResponse struct {
	SHA string `json:"sha"`
}

// PullRequestResponse is returned by POST /repos/{owner}/{repo}/pulls
type PullRequestResponse struct {
	Number  int    `json:"number"`
	HTMLURL string `json:"html_url"`
}

// CreateBranch creates newBranch pointing at the current tip of baseBranch
func (c *Client) CreateBranch(ctx context.Context, token, owner, repo, baseBranch, newBranch string) error {
	refURL := fmt.Sprintf("%s/repos/%s/%s/git/ref/heads/%s", c.apiBase, owner, repo, baseBranch)
	refReq, err := http.NewRequestWithContext(ctx, http.MethodGet, refURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create get ref request: %w", err)
	}
	refReq.Header.Set("Authorization", "Bearer "+token)
	refReq.Header.Set("Accept", "application/vnd.github+json")

	refResp, err := c.httpClient.Do(refReq)
	if err != nil {
		c.logger.Error(ctx, "failed to get base branch ref", err)
		return fmt.Errorf("failed to get base branch ref: %w", err)
	}
	defer refResp.Body.Close()

	if refResp.StatusCode != http.StatusOK {
		return fmt.Errorf("github get ref returned status %d", refResp.StatusCode)
	}

	refBody, err := io.ReadAll(refResp.Body)
	if err != nil {
		return fmt.Errorf("failed to read get ref response: %w", err)
	}

	var ref GitRefResponse
	if err := json.Unmarshal(refBody, &ref); err != nil {
		return fmt.Errorf("failed to parse get ref response: %w", err)
	}

	payload := map[string]any{
		"ref": "refs/heads/" + newBranch,
		"sha": ref.Object.SHA,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal create ref payload: %w", err)
	}

	createURL := fmt.Sprintf("%s/repos/%s/%s/git/refs", c.apiBase, owner, repo)
	createReq, err := http.NewRequestWithContext(ctx, http.MethodPost, createURL, strings.NewReader(string(body)))
	if err != nil {
		return fmt.Errorf("failed to create create-ref request: %w", err)
	}
	createReq.Header.Set("Authorization", "Bearer "+token)
	createReq.Header.Set("Accept", "application/vnd.github+json")
	createReq.Header.Set("Content-Type", "application/json")

	createResp, err := c.httpClient.Do(createReq)
	if err != nil {
		c.logger.Error(ctx, "failed to create branch", err)
		return fmt.Errorf("failed to create branch: %w", err)
	}
	defer createResp.Body.Close()

	if createResp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(createResp.Body)
		return fmt.Errorf("github create ref returned status %d: %s", createResp.StatusCode, string(respBody))
	}
	return nil
}

// CreateOrUpdateFileContents creates or updates a file at filePath on branch with content, committing with commitMessage
func (c *Client) CreateOrUpdateFileContents(ctx context.Context, token, owner, repo, filePath, branch string, content []byte, commitMessage string) error {
	getURL := fmt.Sprintf("%s/repos/%s/%s/contents/%s?ref=%s", c.apiBase, owner, repo, filePath, branch)
	getReq, err := http.NewRequestWithContext(ctx, http.MethodGet, getURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create get content request: %w", err)
	}
	getReq.Header.Set("Authorization", "Bearer "+token)
	getReq.Header.Set("Accept", "application/vnd.github+json")

	getResp, err := c.httpClient.Do(getReq)
	if err != nil {
		c.logger.Error(ctx, "failed to get file contents", err)
		return fmt.Errorf("failed to get file contents: %w", err)
	}
	defer getResp.Body.Close()

	var sha string
	if getResp.StatusCode == http.StatusOK {
		getBody, err := io.ReadAll(getResp.Body)
		if err != nil {
			return fmt.Errorf("failed to read get content response: %w", err)
		}
		var existing RepoContentResponse
		if err := json.Unmarshal(getBody, &existing); err != nil {
			return fmt.Errorf("failed to parse get content response: %w", err)
		}
		sha = existing.SHA
	} else if getResp.StatusCode != http.StatusNotFound {
		return fmt.Errorf("github get contents returned status %d", getResp.StatusCode)
	}

	payload := map[string]any{
		"message": commitMessage,
		"content": base64.StdEncoding.EncodeToString(content),
		"branch":  branch,
	}
	if sha != "" {
		payload["sha"] = sha
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal file contents payload: %w", err)
	}

	putURL := fmt.Sprintf("%s/repos/%s/%s/contents/%s", c.apiBase, owner, repo, filePath)
	putReq, err := http.NewRequestWithContext(ctx, http.MethodPut, putURL, strings.NewReader(string(body)))
	if err != nil {
		return fmt.Errorf("failed to create put content request: %w", err)
	}
	putReq.Header.Set("Authorization", "Bearer "+token)
	putReq.Header.Set("Accept", "application/vnd.github+json")
	putReq.Header.Set("Content-Type", "application/json")

	putResp, err := c.httpClient.Do(putReq)
	if err != nil {
		c.logger.Error(ctx, "failed to put file contents", err)
		return fmt.Errorf("failed to put file contents: %w", err)
	}
	defer putResp.Body.Close()

	if putResp.StatusCode != http.StatusOK && putResp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(putResp.Body)
		return fmt.Errorf("github put contents returned status %d: %s", putResp.StatusCode, string(respBody))
	}
	return nil
}

// DeleteFileContents removes a file at filePath on branch, committing with
// commitMessage. A 404 on the GET-for-sha step is treated as already-deleted
// (not an error) — no DELETE request is issued in that case.
func (c *Client) DeleteFileContents(ctx context.Context, token, owner, repo, filePath, branch, commitMessage string) error {
	getURL := fmt.Sprintf("%s/repos/%s/%s/contents/%s?ref=%s", c.apiBase, owner, repo, filePath, branch)
	getReq, err := http.NewRequestWithContext(ctx, http.MethodGet, getURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create get content request: %w", err)
	}
	getReq.Header.Set("Authorization", "Bearer "+token)
	getReq.Header.Set("Accept", "application/vnd.github+json")

	getResp, err := c.httpClient.Do(getReq)
	if err != nil {
		c.logger.Error(ctx, "failed to get file contents", err)
		return fmt.Errorf("failed to get file contents: %w", err)
	}
	defer getResp.Body.Close()

	if getResp.StatusCode == http.StatusNotFound {
		return nil
	}

	var sha string
	if getResp.StatusCode == http.StatusOK {
		getBody, err := io.ReadAll(getResp.Body)
		if err != nil {
			return fmt.Errorf("failed to read get content response: %w", err)
		}
		var existing RepoContentResponse
		if err := json.Unmarshal(getBody, &existing); err != nil {
			return fmt.Errorf("failed to parse get content response: %w", err)
		}
		sha = existing.SHA
	} else {
		return fmt.Errorf("github get contents returned status %d", getResp.StatusCode)
	}

	payload := map[string]any{
		"message": commitMessage,
		"sha":     sha,
		"branch":  branch,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal delete contents payload: %w", err)
	}

	deleteURL := fmt.Sprintf("%s/repos/%s/%s/contents/%s", c.apiBase, owner, repo, filePath)
	deleteReq, err := http.NewRequestWithContext(ctx, http.MethodDelete, deleteURL, strings.NewReader(string(body)))
	if err != nil {
		return fmt.Errorf("failed to create delete content request: %w", err)
	}
	deleteReq.Header.Set("Authorization", "Bearer "+token)
	deleteReq.Header.Set("Accept", "application/vnd.github+json")
	deleteReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(deleteReq)
	if err != nil {
		c.logger.Error(ctx, "failed to delete file contents", err)
		return fmt.Errorf("failed to delete file contents: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("github delete contents returned status %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}

// CreatePullRequest opens a PR from headBranch into baseBranch, returning the PR's HTML URL and number
func (c *Client) CreatePullRequest(ctx context.Context, token, owner, repo, headBranch, baseBranch, title, body string) (string, int, error) {
	payload := map[string]any{
		"title": title,
		"head":  headBranch,
		"base":  baseBranch,
		"body":  body,
	}
	reqBody, err := json.Marshal(payload)
	if err != nil {
		return "", 0, fmt.Errorf("failed to marshal pull request payload: %w", err)
	}

	reqURL := fmt.Sprintf("%s/repos/%s/%s/pulls", c.apiBase, owner, repo)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, strings.NewReader(string(reqBody)))
	if err != nil {
		return "", 0, fmt.Errorf("failed to create pull request request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error(ctx, "failed to create pull request", err)
		return "", 0, fmt.Errorf("failed to create pull request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return "", 0, fmt.Errorf("github create pull request returned status %d: %s", resp.StatusCode, string(respBody))
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", 0, fmt.Errorf("failed to read pull request response: %w", err)
	}

	var pr PullRequestResponse
	if err := json.Unmarshal(respBody, &pr); err != nil {
		return "", 0, fmt.Errorf("failed to parse pull request response: %w", err)
	}
	return pr.HTMLURL, pr.Number, nil
}

// EnableAutoMerge turns on GitHub's "merge when ready" for a PR, so it merges
// itself once the base branch's required checks pass. Auto-merge is a GraphQL
// mutation keyed by the PR's node id. Errors when the repo doesn't allow
// auto-merge or the PR has nothing to wait for ("clean status"); callers fall
// back to MergePullRequest.
func (c *Client) EnableAutoMerge(ctx context.Context, token, owner, repo string, prNumber int) error {
	prURL := fmt.Sprintf("%s/repos/%s/%s/pulls/%d", c.apiBase, owner, repo, prNumber)
	prReq, err := http.NewRequestWithContext(ctx, http.MethodGet, prURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create get pull request request: %w", err)
	}
	prReq.Header.Set("Authorization", "Bearer "+token)
	prReq.Header.Set("Accept", "application/vnd.github+json")

	prResp, err := c.httpClient.Do(prReq)
	if err != nil {
		return fmt.Errorf("failed to get pull request: %w", err)
	}
	defer prResp.Body.Close()
	if prResp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(prResp.Body)
		return fmt.Errorf("github get pull request returned status %d: %s", prResp.StatusCode, string(respBody))
	}
	var pr struct {
		NodeID string `json:"node_id"`
	}
	if err := json.NewDecoder(prResp.Body).Decode(&pr); err != nil {
		return fmt.Errorf("failed to parse pull request response: %w", err)
	}

	payload, err := json.Marshal(map[string]any{
		"query":     `mutation($id: ID!) { enablePullRequestAutoMerge(input: {pullRequestId: $id, mergeMethod: MERGE}) { pullRequest { number } } }`,
		"variables": map[string]string{"id": pr.NodeID},
	})
	if err != nil {
		return fmt.Errorf("failed to marshal auto-merge payload: %w", err)
	}
	gqlReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.apiBase+"/graphql", strings.NewReader(string(payload)))
	if err != nil {
		return fmt.Errorf("failed to create auto-merge request: %w", err)
	}
	gqlReq.Header.Set("Authorization", "Bearer "+token)
	gqlReq.Header.Set("Content-Type", "application/json")

	gqlResp, err := c.httpClient.Do(gqlReq)
	if err != nil {
		return fmt.Errorf("failed to enable auto-merge: %w", err)
	}
	defer gqlResp.Body.Close()
	respBody, _ := io.ReadAll(gqlResp.Body)
	if gqlResp.StatusCode != http.StatusOK {
		return fmt.Errorf("github graphql returned status %d: %s", gqlResp.StatusCode, string(respBody))
	}
	// GraphQL reports failures in a 200 body.
	var result struct {
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return fmt.Errorf("failed to parse auto-merge response: %w", err)
	}
	if len(result.Errors) > 0 {
		return fmt.Errorf("enable auto-merge failed: %s", result.Errors[0].Message)
	}
	return nil
}

// MergePullRequest merges an open PR by number using GitHub's default merge
// method. Returns an error on any non-2xx response (e.g. not mergeable,
// required checks pending) — callers decide whether that's fatal; for
// blog site-publish it is not, the PR is left open for manual merge.
func (c *Client) MergePullRequest(ctx context.Context, token, owner, repo string, prNumber int) error {
	reqURL := fmt.Sprintf("%s/repos/%s/%s/pulls/%d/merge", c.apiBase, owner, repo, prNumber)
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, reqURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create merge pull request request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error(ctx, "failed to merge pull request", err)
		return fmt.Errorf("failed to merge pull request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("github merge pull request returned status %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}
