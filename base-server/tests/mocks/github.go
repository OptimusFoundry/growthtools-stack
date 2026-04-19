package mocks

import (
	"fmt"
	"net/http"
	"testing"
)

// GitHubMock provides typed helpers for the GitHub mock server.
type GitHubMock struct{ *MockServer }

// ExpectOAuthTokenExchange expects POST /login/oauth/access_token.
func (m *GitHubMock) ExpectOAuthTokenExchange(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, "/login/oauth/access_token")
}

// ExpectGetAuthenticatedUser expects GET /user.
func (m *GitHubMock) ExpectGetAuthenticatedUser(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, "/user")
}

// ExpectListUserRepos expects GET /user/repos.
func (m *GitHubMock) ExpectListUserRepos(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, "/user/repos")
}

// ExpectCreateWebhook expects POST /repos/{owner}/{repo}/hooks.
func (m *GitHubMock) ExpectCreateWebhook(t *testing.T, owner, repo string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, fmt.Sprintf("/repos/%s/%s/hooks", owner, repo))
}

// ExpectDeleteWebhook expects DELETE /repos/{owner}/{repo}/hooks/{id}.
func (m *GitHubMock) ExpectDeleteWebhook(t *testing.T, owner, repo string, hookID int64) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodDelete, fmt.Sprintf("/repos/%s/%s/hooks/%d", owner, repo, hookID))
}

// ExpectGetCommitDiff expects GET /repos/{owner}/{repo}/commits/{sha}.
func (m *GitHubMock) ExpectGetCommitDiff(t *testing.T, owner, repo, sha string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, fmt.Sprintf("/repos/%s/%s/commits/%s", owner, repo, sha))
}

// ExpectGetRepoReadme expects GET /repos/{owner}/{repo}/readme.
func (m *GitHubMock) ExpectGetRepoReadme(t *testing.T, owner, repo string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, fmt.Sprintf("/repos/%s/%s/readme", owner, repo))
}
