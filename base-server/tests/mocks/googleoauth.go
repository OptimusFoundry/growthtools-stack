package mocks

import (
	"net/http"
	"testing"
)

// GoogleOAuthMock provides typed helpers for the Google OAuth mock server.
type GoogleOAuthMock struct{ *MockServer }

// ExpectTokenExchange expects POST /token — called by googleoauth.Client.GetAccessToken.
func (m *GoogleOAuthMock) ExpectTokenExchange(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, "/token")
}

// ExpectGetUserInfo expects GET /userinfo — called by googleoauth.Client.GetUserInfo.
func (m *GoogleOAuthMock) ExpectGetUserInfo(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, "/userinfo")
}
