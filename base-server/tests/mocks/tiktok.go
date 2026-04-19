package mocks

import (
	"net/http"
	"testing"
)

// TikTokMock provides typed helpers for the TikTok API mock server.
type TikTokMock struct{ *MockServer }

// ExpectOAuthToken expects POST /v2/oauth/token/.
func (m *TikTokMock) ExpectOAuthToken(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, "/v2/oauth/token/")
}

// ExpectInitVideoUpload expects POST /v2/post/publish/inbox/video/init/.
func (m *TikTokMock) ExpectInitVideoUpload(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, "/v2/post/publish/inbox/video/init/")
}

// ExpectUploadVideo expects PUT {uploadPath}.
func (m *TikTokMock) ExpectUploadVideo(t *testing.T, uploadPath string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPut, uploadPath)
}
