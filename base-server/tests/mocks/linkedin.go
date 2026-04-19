package mocks

import (
	"fmt"
	"net/http"
	"testing"
)

// LinkedInMock provides typed helpers for the LinkedIn mock server.
type LinkedInMock struct{ *MockServer }

// ExpectCreatePost expects POST /rest/posts.
func (m *LinkedInMock) ExpectCreatePost(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, "/rest/posts")
}

// ExpectInitializeImageUpload expects POST /rest/images (initializeUpload action).
func (m *LinkedInMock) ExpectInitializeImageUpload(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, "/rest/images")
}

// ExpectUploadImage expects PUT {uploadPath} (relative path on mock).
func (m *LinkedInMock) ExpectUploadImage(t *testing.T, uploadPath string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPut, uploadPath)
}

// ExpectGetSocialMetadata expects GET /rest/socialMetadata/{postID}.
func (m *LinkedInMock) ExpectGetSocialMetadata(t *testing.T, postID string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, fmt.Sprintf("/rest/socialMetadata/%s", postID))
}

// ExpectOAuthToken expects POST /oauth/v2/accessToken.
func (m *LinkedInMock) ExpectOAuthToken(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, "/oauth/v2/accessToken")
}
