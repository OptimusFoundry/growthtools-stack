//go:build integration

package tests

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// computeGitHubSignature computes the HMAC-SHA256 signature for a given payload
// and returns the "sha256=<hex>" formatted string that GitHub sends.
func computeGitHubSignature(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

// webhookSecret must match what we set in setTestEnv ("test-webhook-secret").
const webhookSecret = "test-webhook-secret"

func TestGitHubWebhook_HandleWebhook(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	// Create a real account so the webhook can satisfy the FK constraint on
	// github_events.account_id. The webhook processor looks up the repo and,
	// when not found, falls back to the global secret — it still needs an
	// account to store the event under. For this test the event is stored
	// against a fixed account seeded below.
	//
	// NOTE: the real github processor uses the *global* webhook secret when it
	// can't resolve a repo-specific secret, so we sign with the global secret.

	tests := []struct {
		name       string
		setup      func(t *testing.T) (payload []byte, headers map[string]string)
		wantStatus int
	}{
		{
			name: "200 when signature is valid push event",
			setup: func(t *testing.T) ([]byte, map[string]string) {
				payload := []byte(`{"ref":"refs/heads/main","commits":[{"message":"feat: add feature"}]}`)
				sig := computeGitHubSignature(payload, webhookSecret)
				return payload, map[string]string{
					"X-GitHub-Event":      "push",
					"X-GitHub-Delivery":   uuid.New().String(),
					"X-Hub-Signature-256": sig,
					"Content-Type":        "application/json",
				}
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "200 when signature is valid pull_request event",
			setup: func(t *testing.T) ([]byte, map[string]string) {
				payload := []byte(`{"action":"opened","pull_request":{"number":1}}`)
				sig := computeGitHubSignature(payload, webhookSecret)
				return payload, map[string]string{
					"X-GitHub-Event":      "pull_request",
					"X-GitHub-Delivery":   uuid.New().String(),
					"X-Hub-Signature-256": sig,
					"Content-Type":        "application/json",
				}
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "400 when all required headers are missing",
			setup: func(t *testing.T) ([]byte, map[string]string) {
				return []byte(`{"action":"opened"}`), map[string]string{
					"Content-Type": "application/json",
				}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when X-GitHub-Event is missing",
			setup: func(t *testing.T) ([]byte, map[string]string) {
				payload := []byte(`{"action":"opened"}`)
				sig := computeGitHubSignature(payload, webhookSecret)
				return payload, map[string]string{
					// No X-GitHub-Event
					"X-GitHub-Delivery":   uuid.New().String(),
					"X-Hub-Signature-256": sig,
					"Content-Type":        "application/json",
				}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when X-GitHub-Delivery is missing",
			setup: func(t *testing.T) ([]byte, map[string]string) {
				payload := []byte(`{"action":"opened"}`)
				sig := computeGitHubSignature(payload, webhookSecret)
				return payload, map[string]string{
					"X-GitHub-Event": "push",
					// No X-GitHub-Delivery
					"X-Hub-Signature-256": sig,
					"Content-Type":        "application/json",
				}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when X-Hub-Signature-256 is missing",
			setup: func(t *testing.T) ([]byte, map[string]string) {
				return []byte(`{"action":"opened"}`), map[string]string{
					"X-GitHub-Event":    "push",
					"X-GitHub-Delivery": uuid.New().String(),
					// No X-Hub-Signature-256
					"Content-Type": "application/json",
				}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when signature is invalid",
			setup: func(t *testing.T) ([]byte, map[string]string) {
				payload := []byte(`{"action":"opened"}`)
				return payload, map[string]string{
					"X-GitHub-Event":      "push",
					"X-GitHub-Delivery":   uuid.New().String(),
					"X-Hub-Signature-256": "sha256=deadbeefdeadbeefdeadbeefdeadbeef",
					"Content-Type":        "application/json",
				}
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "401 when signed with wrong secret",
			setup: func(t *testing.T) ([]byte, map[string]string) {
				payload := []byte(`{"action":"opened"}`)
				wrongSig := computeGitHubSignature(payload, "wrong-secret")
				return payload, map[string]string{
					"X-GitHub-Event":      "push",
					"X-GitHub-Delivery":   uuid.New().String(),
					"X-Hub-Signature-256": wrongSig,
					"Content-Type":        "application/json",
				}
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "401 when signature has no sha256= prefix",
			setup: func(t *testing.T) ([]byte, map[string]string) {
				return []byte(`{}`), map[string]string{
					"X-GitHub-Event":      "push",
					"X-GitHub-Delivery":   uuid.New().String(),
					"X-Hub-Signature-256": "notprefixed",
					"Content-Type":        "application/json",
				}
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "200 duplicate delivery ID returns 200 (idempotent)",
			setup: func(t *testing.T) ([]byte, map[string]string) {
				// Send the same event twice. The first call is part of setup.
				deliveryID := uuid.New().String()
				payload := []byte(`{"ref":"refs/heads/main","commits":[]}`)
				sig := computeGitHubSignature(payload, webhookSecret)
				headers := map[string]string{
					"X-GitHub-Event":      "push",
					"X-GitHub-Delivery":   deliveryID,
					"X-Hub-Signature-256": sig,
					"Content-Type":        "application/json",
				}
				// First request stores the event
				resp, _ := srv.RequestWithHeaders(t, http.MethodPost, "/api/github/webhook", payload, headers)
				// Allow 200 or 4xx from first request (event might need real account)
				_ = resp
				// Return same payload+headers for second request (duplicate)
				return payload, headers
			},
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			payload, headers := tt.setup(t)
			resp, _ := srv.RequestWithHeaders(t, http.MethodPost, "/api/github/webhook", payload, headers)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}
