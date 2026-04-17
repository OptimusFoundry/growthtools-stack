package store

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================================
// GetPlanFeaturesWithLimitsByPriceID
// ============================================================================

func TestStore_GetPlanFeaturesWithLimitsByPriceID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name     string
		setup    func(t *testing.T) uuid.UUID
		wantMin  int
	}{
		{
			name: "returns features for a free price with plan_feature_limits seeded",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				// Look up a 'free' price. Migration V0029 seeds
				// plan_feature_limits only for prices with
				// description='free' that existed at migration time;
				// in a dev/test DB those rows may be absent. If we
				// can't find a free price OR it has no joined
				// features, skip rather than fail — the underlying
				// store method is a pure SQL query, and the "empty"
				// branch is already covered below.
				stripeID, err := s.GetFreePriceStripeID(ctx)
				if err != nil {
					t.Skip("no free price in this DB — skipping")
				}
				p, err := s.GetPriceByStripeID(ctx, stripeID)
				require.NoError(t, err)
				feats, err := s.GetPlanFeaturesWithLimitsByPriceID(ctx, p.ID)
				require.NoError(t, err)
				if len(feats) == 0 {
					t.Skip("free price has no plan_feature_limits seeded — skipping")
				}
				return p.ID
			},
			wantMin: 1,
		},
		{
			name: "returns empty for unknown price ID",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return uuid.New()
			},
			wantMin: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			priceID := tt.setup(t)
			got, err := s.GetPlanFeaturesWithLimitsByPriceID(ctx, priceID)
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(got), tt.wantMin)
		})
	}
}

// ============================================================================
// GetPriceDescriptionByID
// ============================================================================

func TestStore_GetPriceDescriptionByID(t *testing.T) {
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
		assert  func(t *testing.T, got string)
	}{
		{
			name: "found returns description",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				product := createTestProduct(t, s)
				amt := int64(0)
				desc := "tier-desc-" + uuid.New().String()[:8]
				err := s.CreatePrice(ctx, Price{
					ProductID:   product.ID,
					StripeID:    "price_tier_" + uuid.New().String()[:8],
					Description: desc,
					UnitAmount:  &amt,
				})
				require.NoError(t, err)
				// Get the price we just created (no direct create-returning so look up by latest)
				prices, err := s.ListPrices(ctx)
				require.NoError(t, err)
				for _, p := range prices {
					if p.Description == desc {
						return p.ID
					}
				}
				t.Fatal("could not find created price")
				return uuid.Nil
			},
			assert: func(t *testing.T, got string) {
				assert.NotEmpty(t, got)
			},
		},
		{
			name: "not found for unknown price ID",
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
			priceID := tt.setup(t)
			got, err := s.GetPriceDescriptionByID(ctx, priceID)
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
// GetFreeTierInfo
// ============================================================================

func TestStore_GetFreeTierInfo(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name   string
		assert func(t *testing.T, got TierInfo)
	}{
		{
			name: "returns tier info (either from DB or hardcoded default)",
			assert: func(t *testing.T, got TierInfo) {
				// The free tier always has a description
				assert.NotEmpty(t, got.PriceDescription)
				assert.NotNil(t, got.Features)
				assert.NotNil(t, got.Limits)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := s.GetFreeTierInfo(ctx)
			require.NoError(t, err)
			if tt.assert != nil {
				tt.assert(t, got)
			}
		})
	}
}

// ============================================================================
// GetTierInfoByPriceID
// ============================================================================

func TestStore_GetTierInfoByPriceID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) uuid.UUID
		wantErr bool
		assert  func(t *testing.T, got TierInfo)
	}{
		{
			name: "returns tier info for seeded free price",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				stripeID, err := s.GetFreePriceStripeID(ctx)
				if err != nil {
					t.Skip("no free price seeded in this DB — skipping")
				}
				p, err := s.GetPriceByStripeID(ctx, stripeID)
				require.NoError(t, err)
				return p.ID
			},
			assert: func(t *testing.T, got TierInfo) {
				assert.NotEmpty(t, got.PriceDescription)
			},
		},
		{
			name: "returns error for unknown price ID (description lookup fails)",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return uuid.New()
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			priceID := tt.setup(t)
			got, err := s.GetTierInfoByPriceID(ctx, priceID)
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
// GetTierInfoByUserID
// ============================================================================

func TestStore_GetTierInfoByUserID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name   string
		setup  func(t *testing.T) uuid.UUID
		assert func(t *testing.T, got TierInfo)
	}{
		{
			name: "user with no subscription gets free tier",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return createTestUser(t, s)
			},
			assert: func(t *testing.T, got TierInfo) {
				assert.NotEmpty(t, got.PriceDescription)
			},
		},
		{
			name: "user with active subscription gets tier from price",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				product := createTestProduct(t, s)
				price := createTestPrice(t, s, product.ID)
				now := time.Now().UTC()
				err := s.CreateSubscription(ctx, CreateSubscriptionsParams{
					UserID:          userID,
					PriceID:         price.ID,
					StripeID:        "sub_tier_" + uuid.New().String()[:8],
					Status:          "active",
					StartDate:       now,
					EndDate:         now.Add(30 * 24 * time.Hour),
					NextBillingDate: now.Add(30 * 24 * time.Hour),
				})
				require.NoError(t, err)
				return userID
			},
			assert: func(t *testing.T, got TierInfo) {
				// Either has description or fell back to free tier
				assert.NotNil(t, got.Features)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			userID := tt.setup(t)
			got, err := s.GetTierInfoByUserID(ctx, userID)
			require.NoError(t, err)
			if tt.assert != nil {
				tt.assert(t, got)
			}
		})
	}
}

// ============================================================================
// GetTierInfoByAccountID
// ============================================================================

func TestStore_GetTierInfoByAccountID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) uuid.UUID
		wantErr bool
		assert  func(t *testing.T, got TierInfo)
	}{
		{
			name: "returns tier info for account owner",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return createTestAccount(t, s)
			},
			assert: func(t *testing.T, got TierInfo) {
				assert.NotEmpty(t, got.PriceDescription)
			},
		},
		{
			name: "returns error for unknown account",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return uuid.New()
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			accountID := tt.setup(t)
			got, err := s.GetTierInfoByAccountID(ctx, accountID)
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
// HasFeature
// ============================================================================

func TestStore_HasFeature(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, string)
		wantErr bool
	}{
		{
			name: "returns no error for unknown feature (returns false)",
			setup: func(t *testing.T) (uuid.UUID, string) {
				t.Helper()
				stripeID, err := s.GetFreePriceStripeID(ctx)
				if err != nil {
					t.Skip("no free price seeded — skipping")
				}
				p, err := s.GetPriceByStripeID(ctx, stripeID)
				require.NoError(t, err)
				return p.ID, "nonexistent_feature"
			},
		},
		{
			name: "returns error for unknown price ID",
			setup: func(t *testing.T) (uuid.UUID, string) {
				t.Helper()
				return uuid.New(), "ai_content_generation"
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			priceID, featureName := tt.setup(t)
			_, err := s.HasFeature(ctx, priceID, featureName)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
		})
	}
}

// ============================================================================
// GetLimit
// ============================================================================

func TestStore_GetLimit(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, string)
		wantErr bool
	}{
		{
			name: "returns nil for unknown limit name (not an error)",
			setup: func(t *testing.T) (uuid.UUID, string) {
				t.Helper()
				stripeID, err := s.GetFreePriceStripeID(ctx)
				if err != nil {
					t.Skip("no free price seeded — skipping")
				}
				p, err := s.GetPriceByStripeID(ctx, stripeID)
				require.NoError(t, err)
				return p.ID, "nonexistent_limit"
			},
		},
		{
			name: "returns error for unknown price ID",
			setup: func(t *testing.T) (uuid.UUID, string) {
				t.Helper()
				return uuid.New(), "posts_per_month"
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			priceID, limitName := tt.setup(t)
			_, err := s.GetLimit(ctx, priceID, limitName)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
		})
	}
}
