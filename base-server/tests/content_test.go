//go:build integration

package tests

// Package tests provides integration tests for content generation endpoints.
//
// IMPORTANT: All content generation endpoints call Gemini (Google AI). The Gemini
// SDK does not expose a base-URL override in its public API, so the Gemini success
// path (200) and Gemini-error path (503) are NOT testable at integration level.
// Those paths are covered by unit tests in internal/content/processor/processor_test.go.
//
// This file covers only:
//   - 400 validation errors (before Gemini is called)
//   - 401 unauthenticated requests
//   - 200 + SSE for stream endpoints (Gemini fails immediately with test API key,
//     which causes an SSE "error" event to be emitted)

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"

	"base-server/tests/testenv"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestContentAPI_StreamGenerate tests POST /api/protected/content/generate/stream.
//
// SSE headers are set AFTER validation. Validation errors return JSON 400/401.
// When validation passes and the request reaches the Gemini call, Gemini fails
// immediately with the test API key — the handler emits an SSE "error" event and
// closes the stream with HTTP 200.
func TestContentAPI_StreamGenerate(t *testing.T) {
	t.Parallel()
	c := testClient(t)
	env := testenv.GlobalEnv

	tests := []struct {
		name       string
		setup      func(t *testing.T) string
		body       any
		wantStatus int
		checkSSE   bool // if true, assert SSE Content-Type and error event
	}{
		{
			name: "400 when prompt is missing",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body:       map[string]any{"platforms": []any{"x"}},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when platforms is missing (min=1)",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body:       map[string]any{"prompt": "test prompt"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) string {
				return ""
			},
			body:       map[string]any{"prompt": "test prompt", "platforms": []any{"x"}},
			wantStatus: http.StatusUnauthorized,
		},
		{
			// Handler validates content_type ∈ {single, thread, text} and
			// returns 400 when missing (no AI fallback). Include one to reach
			// the Gemini call that the test is actually exercising.
			name: "200 with SSE error event when Gemini fails (test API key)",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body:       map[string]any{"prompt": "test prompt", "platforms": []any{"x"}, "content_type": "text"},
			wantStatus: http.StatusOK,
			checkSSE:   true,
		},
		{
			name: "400 when content_type is missing",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body:       map[string]any{"prompt": "test prompt", "platforms": []any{"x"}},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when content_type is invalid",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body:       map[string]any{"prompt": "test prompt", "platforms": []any{"x"}, "content_type": "bogus"},
			wantStatus: http.StatusBadRequest,
		},
	}

	// SSE test uses a custom HTTP client with a longer timeout.
	sseClient := &http.Client{Timeout: 30 * time.Second}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token := tt.setup(t)

			if !tt.checkSSE {
				resp, _ := c.Request(t, http.MethodPost, "/api/protected/content/generate/stream", tt.body, token)
				assert.Equal(t, tt.wantStatus, resp.StatusCode)
				return
			}

			// SSE path: use raw HTTP to read the streaming response.
			bodyBytes, err := json.Marshal(tt.body)
			require.NoError(t, err)

			req, err := http.NewRequest(http.MethodPost,
				env.BaseURL+"/api/protected/content/generate/stream",
				bytes.NewReader(bodyBytes))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")
			if token != "" {
				req.AddCookie(&http.Cookie{Name: "token", Value: token})
			}

			resp, err := sseClient.Do(req)
			require.NoError(t, err)
			defer func() { _, _ = io.Copy(io.Discard, resp.Body); resp.Body.Close() }()

			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			assert.Contains(t, resp.Header.Get("Content-Type"), "text/event-stream")

			events := testenv.ReadSSE(t, resp)
			hasErrorOrDone := false
			for _, ev := range events {
				if ev.Event == "error" || ev.Event == "done" {
					hasErrorOrDone = true
					break
				}
			}
			assert.True(t, hasErrorOrDone, "expected SSE error or done event; got events: %+v", events)
		})
	}
}
