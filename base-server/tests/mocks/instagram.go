package mocks

import (
	"fmt"
	"net/http"
	"testing"
)

// InstagramMock provides typed helpers for the Instagram Graph API mock server.
type InstagramMock struct{ *MockServer }

// ExpectCreateMediaContainer expects POST /v21.0/{igAccountID}/media.
func (m *InstagramMock) ExpectCreateMediaContainer(t *testing.T, igAccountID string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, fmt.Sprintf("/v21.0/%s/media", igAccountID))
}

// ExpectPublishMedia expects POST /v21.0/{igAccountID}/media_publish.
func (m *InstagramMock) ExpectPublishMedia(t *testing.T, igAccountID string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, fmt.Sprintf("/v21.0/%s/media_publish", igAccountID))
}

// ExpectGetMediaInsights expects GET /v21.0/{postID}.
func (m *InstagramMock) ExpectGetMediaInsights(t *testing.T, postID string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, fmt.Sprintf("/v21.0/%s", postID))
}

// ExpectGetPermalink expects GET /v21.0/{mediaID}.
func (m *InstagramMock) ExpectGetPermalink(t *testing.T, mediaID string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, fmt.Sprintf("/v21.0/%s", mediaID))
}
