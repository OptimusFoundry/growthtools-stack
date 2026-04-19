package mocks

import (
	"net/http"
	"testing"
)

// BlueskyMock provides typed helpers for the Bluesky mock server.
type BlueskyMock struct{ *MockServer }

// ExpectCreateSession expects POST /xrpc/com.atproto.server.createSession.
func (m *BlueskyMock) ExpectCreateSession(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, "/xrpc/com.atproto.server.createSession")
}

// ExpectCreateRecord expects POST /xrpc/com.atproto.repo.createRecord.
func (m *BlueskyMock) ExpectCreateRecord(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, "/xrpc/com.atproto.repo.createRecord")
}

// ExpectUploadBlob expects POST /xrpc/com.atproto.repo.uploadBlob.
func (m *BlueskyMock) ExpectUploadBlob(t *testing.T) *Expectation {
	t.Helper()
	return m.Expect(t, http.MethodPost, "/xrpc/com.atproto.repo.uploadBlob")
}
