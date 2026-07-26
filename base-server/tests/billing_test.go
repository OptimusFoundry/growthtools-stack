//go:build integration

package tests

// NOTE: Stripe-backed billing endpoints (checkout session, customer portal,
// subscription management) require Stripe SDK wiring to redirect to a local
// mock, which would require production code changes. Those endpoints are covered
// by unit tests with gomock (internal/billing/processor/processor_test.go).
//
// This file covers:
//   - GET  /api/billing/plans           — public, DB read only
//   - POST /api/billing/webhook         — local crypto signature check (no Stripe call)
//   - POST /api/protected/billing/create-checkout-session — auth check only (401)
//   - POST /api/protected/billing/create-customer-portal  — auth check only (401)

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"testing"
	"time"

	"base-server/tests/testenv"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBillingAPI_ListPlans(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name:       "200 returns list of plans (may be empty if no Stripe products seeded)",
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				// The endpoint returns a list; it may be empty if Stripe products
				// haven't been synced to the DB in the test environment.
				// We only assert the response is a JSON array, not null.
				var got []any
				require.NoError(t, json.Unmarshal(body, &got))
				assert.NotNil(t, got)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			resp, body := c.Request(t, http.MethodGet, "/api/billing/plans", nil, "")
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

// TestBillingAPI_Webhook tests POST /api/billing/webhook.
// The handler uses webhook.ConstructEvent which is a local HMAC-SHA256 check
// — no outbound Stripe call. The 200 path asserts the signature was accepted;
// the exact processor result depends on the event type and DB state.
func TestBillingAPI_Webhook(t *testing.T) {
	t.Parallel()
	env := testenv.GlobalEnv

	// Read the webhook secret from the test environment.
	webhookSecret := os.Getenv("PAYMENTS_STRIPE_WEBHOOK_SECRET")
	if webhookSecret == "" {
		webhookSecret = "whsec_test_fake_secret" // matches env.test default
	}

	tests := []struct {
		name       string
		payload    []byte
		headers    map[string]string
		wantStatus int
		// For the valid-signature case we only assert NOT 400 (sig accepted).
		notWantStatus int
	}{
		{
			name:    "400 when Stripe-Signature header is missing",
			payload: []byte(`{"type":"product.created","data":{"object":{}}}`),
			headers: map[string]string{
				"Content-Type": "application/json",
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:    "400 when signature is malformed",
			payload: []byte(`{"type":"product.created","data":{"object":{}}}`),
			headers: map[string]string{
				"Content-Type":    "application/json",
				"Stripe-Signature": "t=invalid,v1=badsig",
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:    "400 when HMAC is wrong (signed with different secret)",
			payload: []byte(`{"type":"product.created","data":{"object":{}}}`),
			headers: func() map[string]string {
				payload := []byte(`{"type":"product.created","data":{"object":{}}}`)
				sig := computeStripeSignature(payload, "whsec_wrong_secret")
				return map[string]string{
					"Content-Type":    "application/json",
					"Stripe-Signature": sig,
				}
			}(),
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "signature accepted — processor reached (not-400 response)",
			// The Stripe SDK v83 requires "object":"event" and a compatible "api_version".
			payload: []byte(`{"object":"event","type":"customer.subscription.updated","id":"evt_test","api_version":"2025-10-29.clover","data":{"object":{"id":"sub_test","status":"active","items":{"data":[{"price":{"id":"price_test"}}]}}}}`),
			headers: func() map[string]string {
				payload := []byte(`{"object":"event","type":"customer.subscription.updated","id":"evt_test","api_version":"2025-10-29.clover","data":{"object":{"id":"sub_test","status":"active","items":{"data":[{"price":{"id":"price_test"}}]}}}}`)
				sig := computeStripeSignature(payload, webhookSecret)
				return map[string]string{
					"Content-Type":     "application/json",
					"Stripe-Signature": sig,
				}
			}(),
			// Any non-400 response means the signature check passed.
			// The processor may return 200 (handled) or 500 (DB error) depending on state.
			notWantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			req, err := http.NewRequest(http.MethodPost,
				env.BaseURL+"/api/billing/webhook",
				bytes.NewReader(tt.payload))
			require.NoError(t, err)
			for k, v := range tt.headers {
				req.Header.Set(k, v)
			}

			client := &http.Client{Timeout: 15 * time.Second}
			resp, err := client.Do(req)
			require.NoError(t, err)
			_, _ = io.ReadAll(resp.Body)
			_ = resp.Body.Close()

			if tt.wantStatus != 0 {
				assert.Equal(t, tt.wantStatus, resp.StatusCode)
			}
			if tt.notWantStatus != 0 {
				assert.NotEqual(t, tt.notWantStatus, resp.StatusCode,
					"expected signature to be accepted (non-%d response)", tt.notWantStatus)
			}
		})
	}
}

// TestBillingAPI_CreateCheckoutSession_Unauthenticated tests that
// POST /api/protected/billing/create-checkout-session returns 401 when no JWT is present.
// The 200 path (which calls Stripe) is out of scope for integration tests.
func TestBillingAPI_CreateCheckoutSession_Unauthenticated(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		wantStatus int
	}{
		{
			name:       "401 when no JWT",
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			resp, _ := c.Request(t, http.MethodPost,
				"/api/protected/billing/create-checkout-session",
				map[string]any{"price_id": "price_test"}, "")
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

// TestBillingAPI_CreateCustomerPortal_Unauthenticated tests that
// POST /api/protected/billing/create-customer-portal returns 401 when no JWT is present.
// The 200 path (which calls Stripe) is out of scope for integration tests.
func TestBillingAPI_CreateCustomerPortal_Unauthenticated(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		wantStatus int
	}{
		{
			name:       "401 when no JWT",
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			resp, _ := c.Request(t, http.MethodPost,
				"/api/protected/billing/create-customer-portal", nil, "")
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

// computeStripeSignature computes a valid Stripe webhook signature for the given
// payload and webhook secret. Uses the same algorithm as stripe.webhook.ConstructEvent:
// HMAC-SHA256 of "timestamp.payload" with the secret.
func computeStripeSignature(payload []byte, secret string) string {
	ts := time.Now().Unix()
	toSign := fmt.Sprintf("%d.%s", ts, string(payload))
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(toSign))
	sig := hex.EncodeToString(mac.Sum(nil))
	return fmt.Sprintf("t=%d,v1=%s", ts, sig)
}
