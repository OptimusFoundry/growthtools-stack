//go:build integration

package tests

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// GET /api/billing/plans — public endpoint, DB read only (in scope).
// All other billing endpoints call Stripe and are OUT OF SCOPE for integration tests.
// They require Level 2 coverage (handler/processor unit tests with gomock):
//
//   GET    /api/protected/billing/subscription          — calls Stripe
//   DELETE /api/protected/billing/cancel-subscription   — calls Stripe
//   POST   /api/protected/billing/create-customer-portal — calls Stripe
//   POST   /api/protected/billing/create-checkout-session — calls Stripe
//   GET    /api/protected/billing/checkout-session       — calls Stripe
//   POST   /api/billing/webhook                          — processes Stripe webhook

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
