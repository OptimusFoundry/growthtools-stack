package mocks

import (
	"fmt"
	"net/http"
	"testing"
)

// PinterestMock provides typed helpers for the Pinterest API mock server.
type PinterestMock struct{ *MockServer }

// ExpectListBoards expects GET /v5/boards.
func (m *PinterestMock) ExpectListBoards(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, "/v5/boards")
}

// ExpectCreatePin expects POST /v5/pins.
func (m *PinterestMock) ExpectCreatePin(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, "/v5/pins")
}

// ExpectGetPinAnalytics expects GET /v5/pins/{pinID}/analytics.
func (m *PinterestMock) ExpectGetPinAnalytics(t *testing.T, pinID string) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodGet, fmt.Sprintf("/v5/pins/%s/analytics", pinID))
}

// ExpectOAuthToken expects POST /v5/oauth/token.
func (m *PinterestMock) ExpectOAuthToken(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, "/v5/oauth/token")
}
