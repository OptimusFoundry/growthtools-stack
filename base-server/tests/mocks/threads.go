package mocks

import (
	"fmt"
	"net/http"
	"testing"
)

// ThreadsMock provides typed helpers for the Threads API mock server.
type ThreadsMock struct{ *MockServer }

// ExpectCreateThread expects POST /v1.0/{userID}/threads.
func (m *ThreadsMock) ExpectCreateThread(t *testing.T, userID string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, fmt.Sprintf("/v1.0/%s/threads", userID))
}

// ExpectGetContainerStatus expects GET /v1.0/{containerID}.
func (m *ThreadsMock) ExpectGetContainerStatus(t *testing.T, containerID string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, fmt.Sprintf("/v1.0/%s", containerID))
}

// ExpectPublishThread expects POST /v1.0/{userID}/threads_publish.
func (m *ThreadsMock) ExpectPublishThread(t *testing.T, userID string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, fmt.Sprintf("/v1.0/%s/threads_publish", userID))
}

// ExpectGetThreadInsights expects GET /v1.0/{postID}/insights.
func (m *ThreadsMock) ExpectGetThreadInsights(t *testing.T, postID string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, fmt.Sprintf("/v1.0/%s/insights", postID))
}

// ExpectVerifyCredentials expects GET /v1.0/me.
func (m *ThreadsMock) ExpectVerifyCredentials(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, "/v1.0/me")
}

// ExpectGetPermalink expects GET /v1.0/{threadID}.
func (m *ThreadsMock) ExpectGetPermalink(t *testing.T, threadID string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, fmt.Sprintf("/v1.0/%s", threadID))
}

// ExpectOAuthToken expects POST /oauth/access_token.
func (m *ThreadsMock) ExpectOAuthToken(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, "/oauth/access_token")
}
