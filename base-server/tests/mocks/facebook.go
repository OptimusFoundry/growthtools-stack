package mocks

import (
	"fmt"
	"net/http"
	"testing"
)

// FacebookMock provides typed helpers for the Facebook Graph API mock server.
type FacebookMock struct{ *MockServer }

// ExpectPostToFeed expects POST /v21.0/{pageID}/feed.
func (m *FacebookMock) ExpectPostToFeed(t *testing.T, pageID string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, fmt.Sprintf("/v21.0/%s/feed", pageID))
}

// ExpectPostPhoto expects POST /v21.0/{pageID}/photos.
func (m *FacebookMock) ExpectPostPhoto(t *testing.T, pageID string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, fmt.Sprintf("/v21.0/%s/photos", pageID))
}

// ExpectGetPostInsights expects GET /v21.0/{postID}.
func (m *FacebookMock) ExpectGetPostInsights(t *testing.T, postID string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, fmt.Sprintf("/v21.0/%s", postID))
}

// ExpectOAuthToken expects POST /v21.0/oauth/access_token.
func (m *FacebookMock) ExpectOAuthToken(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, "/v21.0/oauth/access_token")
}
