package store

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// createTestSubscription creates a product, price, and subscription for userID.
// Returns the subscription's Stripe ID so tests can look it up.
func createTestSubscription(t *testing.T, s *Store, userID uuid.UUID) (string, uuid.UUID) {
	t.Helper()
	ctx := context.Background()
	product := createTestProduct(t, s)
	price := createTestPrice(t, s, product.ID)
	stripeSubID := "sub_" + uuid.New().String()[:8]
	now := time.Now().UTC()
	err := s.CreateSubscription(ctx, CreateSubscriptionsParams{
		UserID:          userID,
		PriceID:         price.ID,
		StripeID:        stripeSubID,
		Status:          "active",
		StartDate:       now,
		EndDate:         now.Add(30 * 24 * time.Hour),
		NextBillingDate: now.Add(30 * 24 * time.Hour),
	})
	require.NoError(t, err, "createTestSubscription: failed")
	return stripeSubID, price.ID
}

// ============================================================================
// CreateSubscription
// ============================================================================

func TestStore_CreateSubscription(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) CreateSubscriptionsParams
		wantErr bool
	}{
		{
			name: "happy path creates subscription",
			setup: func(t *testing.T) CreateSubscriptionsParams {
				t.Helper()
				userID := createTestUser(t, s)
				product := createTestProduct(t, s)
				price := createTestPrice(t, s, product.ID)
				now := time.Now().UTC()
				return CreateSubscriptionsParams{
					UserID:          userID,
					PriceID:         price.ID,
					StripeID:        "sub_" + uuid.New().String()[:8],
					Status:          "active",
					StartDate:       now,
					EndDate:         now.Add(30 * 24 * time.Hour),
					NextBillingDate: now.Add(30 * 24 * time.Hour),
				}
			},
		},
		{
			name: "FK violation when user does not exist",
			setup: func(t *testing.T) CreateSubscriptionsParams {
				t.Helper()
				product := createTestProduct(t, s)
				price := createTestPrice(t, s, product.ID)
				now := time.Now().UTC()
				return CreateSubscriptionsParams{
					UserID:          uuid.New(), // non-existent
					PriceID:         price.ID,
					StripeID:        "sub_fk_" + uuid.New().String()[:8],
					Status:          "active",
					StartDate:       now,
					EndDate:         now.Add(30 * 24 * time.Hour),
					NextBillingDate: now.Add(30 * 24 * time.Hour),
				}
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			params := tt.setup(t)
			err := s.CreateSubscription(ctx, params)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
		})
	}
}

// ============================================================================
// GetSubscription
// ============================================================================

func TestStore_GetSubscription(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) string // returns stripe sub ID
		wantErr bool
		assert  func(t *testing.T, got Subscription)
	}{
		{
			name: "found returns subscription",
			setup: func(t *testing.T) string {
				t.Helper()
				userID := createTestUser(t, s)
				stripeSubID, _ := createTestSubscription(t, s, userID)
				return stripeSubID
			},
			assert: func(t *testing.T, got Subscription) {
				assert.Equal(t, "active", got.Status)
				assert.NotEqual(t, uuid.Nil, got.ID)
			},
		},
		{
			name: "not found for unknown stripe ID",
			setup: func(t *testing.T) string {
				t.Helper()
				return "sub_nonexistent_" + uuid.New().String()[:8]
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			stripeID := tt.setup(t)
			got, err := s.GetSubscription(ctx, stripeID)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			if tt.assert != nil {
				tt.assert(t, got)
			}
		})
	}
}

// ============================================================================
// GetSubscriptionByUserID
// ============================================================================

func TestStore_GetSubscriptionByUserID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) uuid.UUID
		wantErr error
		assert  func(t *testing.T, got Subscription)
	}{
		{
			name: "found returns subscription",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				createTestSubscription(t, s, userID)
				return userID
			},
			assert: func(t *testing.T, got Subscription) {
				assert.Equal(t, "active", got.Status)
			},
		},
		{
			name: "not found for user with no subscription",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return uuid.New()
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			userID := tt.setup(t)
			got, err := s.GetSubscriptionByUserID(ctx, userID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assert != nil {
				tt.assert(t, got)
			}
		})
	}
}

// ============================================================================
// UpdateSubscription
// ============================================================================

func TestStore_UpdateSubscription(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) UpdateSubscriptionParams
		wantErr bool
	}{
		{
			name: "happy path updates subscription",
			setup: func(t *testing.T) UpdateSubscriptionParams {
				t.Helper()
				userID := createTestUser(t, s)
				stripeSubID, _ := createTestSubscription(t, s, userID)
				sub, err := s.GetSubscription(ctx, stripeSubID)
				require.NoError(t, err)
				// Get the stripe price ID for this sub
				price, err := s.GetPriceByID(ctx, sub.PriceID.String())
				require.NoError(t, err)
				now := time.Now().UTC()
				return UpdateSubscriptionParams{
					Status:          "trialing",
					EndDate:         now.Add(60 * 24 * time.Hour),
					NextBillingDate: now.Add(60 * 24 * time.Hour),
					StripeID:        stripeSubID,
					StripePriceID:   price.StripeID,
				}
			},
		},
		{
			name: "returns error for unknown subscription stripe ID",
			setup: func(t *testing.T) UpdateSubscriptionParams {
				t.Helper()
				product := createTestProduct(t, s)
				price := createTestPrice(t, s, product.ID)
				now := time.Now().UTC()
				return UpdateSubscriptionParams{
					Status:          "canceled",
					EndDate:         now,
					NextBillingDate: now,
					StripeID:        "sub_ghost_" + uuid.New().String()[:8],
					StripePriceID:   price.StripeID,
				}
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			params := tt.setup(t)
			err := s.UpdateSubscription(ctx, params)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
		})
	}
}

// ============================================================================
// CancelSubscription
// ============================================================================

func TestStore_CancelSubscription(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (string, time.Time)
		wantErr bool
	}{
		{
			name: "happy path cancels subscription",
			setup: func(t *testing.T) (string, time.Time) {
				t.Helper()
				userID := createTestUser(t, s)
				stripeSubID, _ := createTestSubscription(t, s, userID)
				return stripeSubID, time.Now().UTC().Add(24 * time.Hour)
			},
		},
		{
			name: "no error for non-existent subscription (idempotent)",
			// CancelSubscription does not check rows affected — it's idempotent by design.
			setup: func(t *testing.T) (string, time.Time) {
				t.Helper()
				return "sub_ghost_" + uuid.New().String()[:8], time.Now().UTC()
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			stripeID, cancelAt := tt.setup(t)
			err := s.CancelSubscription(ctx, stripeID, cancelAt)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
		})
	}
}
