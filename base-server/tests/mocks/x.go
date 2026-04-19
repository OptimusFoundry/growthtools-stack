package mocks

import (
	"fmt"
	"net/http"
	"testing"
)

// XMock provides typed helpers for the X (Twitter) mock server.
type XMock struct{ *MockServer }

// ExpectCreateTweet expects POST /2/tweets.
func (m *XMock) ExpectCreateTweet(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, "/2/tweets")
}

// ExpectGetTweetMetrics expects GET /2/tweets/{id}.
func (m *XMock) ExpectGetTweetMetrics(t *testing.T, id string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, fmt.Sprintf("/2/tweets/%s", id))
}

// ExpectVerifyCredentials expects GET /2/users/me.
func (m *XMock) ExpectVerifyCredentials(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, "/2/users/me")
}

// ExpectOAuthToken expects POST /2/oauth2/token.
func (m *XMock) ExpectOAuthToken(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, "/2/oauth2/token")
}
