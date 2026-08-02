package store

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// createTestPrice inserts a price row linked to a product and returns it.
func createTestPrice(t *testing.T, s *Store, productID uuid.UUID) Price {
	t.Helper()
	ctx := context.Background()
	stripeID := "price_" + uuid.New().String()[:8]
	amt := int64(999)
	cur := "usd"
	iv := "month"
	p := Price{
		ProductID:   productID,
		StripeID:    stripeID,
		Description: "test-price-" + stripeID,
		UnitAmount:  &amt,
		Currency:    &cur,
		Interval:    &iv,
	}
	err := s.CreatePrice(ctx, p)
	require.NoError(t, err, "createTestPrice: failed")
	got, err := s.GetPriceByStripeID(ctx, stripeID)
	require.NoError(t, err, "createTestPrice: lookup failed")
	return got
}

// ============================================================================
// CreatePrice
// ============================================================================

func TestStore_CreatePrice(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) Price
		wantErr bool
	}{
		{
			name: "happy path creates price",
			setup: func(t *testing.T) Price {
				t.Helper()
				product := createTestProduct(t, s)
				amt := int64(4999)
				cur := "usd"
				iv := "year"
				return Price{
					ProductID:   product.ID,
					StripeID:    "price_new_" + uuid.New().String()[:8],
					Description: "annual",
					UnitAmount:  &amt,
					Currency:    &cur,
					Interval:    &iv,
				}
			},
		},
		{
			name: "FK violation when product does not exist",
			setup: func(t *testing.T) Price {
				t.Helper()
				amt := int64(100)
				return Price{
					ProductID:   uuid.New(), // non-existent product
					StripeID:    "price_fk_" + uuid.New().String()[:8],
					Description: "orphan",
					UnitAmount:  &amt,
				}
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			price := tt.setup(t)
			err := s.CreatePrice(ctx, price)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
		})
	}
}

// ============================================================================
// GetPriceByStripeID
// ============================================================================

func TestStore_GetPriceByStripeID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) string // returns stripe price ID
		wantErr bool
		assert  func(t *testing.T, got Price)
	}{
		{
			name: "found returns price",
			setup: func(t *testing.T) string {
				t.Helper()
				product := createTestProduct(t, s)
				p := createTestPrice(t, s, product.ID)
				return p.StripeID
			},
			assert: func(t *testing.T, got Price) {
				assert.NotEqual(t, uuid.Nil, got.ID)
			},
		},
		{
			name: "not found for unknown stripe ID",
			setup: func(t *testing.T) string {
				t.Helper()
				return "price_nonexistent_" + uuid.New().String()[:8]
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			stripeID := tt.setup(t)
			got, err := s.GetPriceByStripeID(ctx, stripeID)
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
// UpdatePriceByStripeID
// ============================================================================

func TestStore_UpdatePriceByStripeID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, string, string, *int64, *string, *string, string)
		wantErr bool
	}{
		{
			name: "happy path updates price fields",
			setup: func(t *testing.T) (uuid.UUID, string, string, *int64, *string, *string, string) {
				t.Helper()
				product := createTestProduct(t, s)
				p := createTestPrice(t, s, product.ID)
				newAmt := int64(7999)
				newCur := "eur"
				newIv := "year"
				return product.ID, "updated desc", "updated desc", &newAmt, &newCur, &newIv, p.StripeID
			},
		},
		{
			name: "returns error for unknown stripe ID",
			setup: func(t *testing.T) (uuid.UUID, string, string, *int64, *string, *string, string) {
				t.Helper()
				product := createTestProduct(t, s)
				return product.ID, "x", "x", nil, nil, nil, "price_nonexistent_" + uuid.New().String()[:8]
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			productID, desc, _, amt, cur, iv, stripeID := tt.setup(t)
			err := s.UpdatePriceByStripeID(ctx, productID, desc, amt, cur, iv, stripeID)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
		})
	}
}

// ============================================================================
// DeletePriceByStripeID
// ============================================================================

func TestStore_DeletePriceByStripeID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) string
		wantErr bool
	}{
		{
			name: "happy path deletes price",
			setup: func(t *testing.T) string {
				t.Helper()
				product := createTestProduct(t, s)
				p := createTestPrice(t, s, product.ID)
				return p.StripeID
			},
		},
		{
			name: "no error for non-existent stripe ID (idempotent delete)",
			// The store does not check rows affected for DELETE — it's idempotent.
			setup: func(t *testing.T) string {
				t.Helper()
				return "price_ghost_" + uuid.New().String()[:8]
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			stripeID := tt.setup(t)
			err := s.DeletePriceByStripeID(ctx, stripeID)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
		})
	}
}

// ============================================================================
// ListPrices
// ============================================================================

func TestStore_ListPrices(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T)
		wantMin int
	}{
		{
			name: "returns prices (at least the ones we seeded)",
			setup: func(t *testing.T) {
				t.Helper()
				product := createTestProduct(t, s)
				createTestPrice(t, s, product.ID)
			},
			wantMin: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			tt.setup(t)
			got, err := s.ListPrices(ctx)
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(got), tt.wantMin)
		})
	}
}

// ============================================================================
// GetPriceByID
// ============================================================================

func TestStore_GetPriceByID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) string // returns price UUID as string
		wantErr bool
		assert  func(t *testing.T, got Price)
	}{
		{
			name: "found returns price by UUID",
			setup: func(t *testing.T) string {
				t.Helper()
				product := createTestProduct(t, s)
				p := createTestPrice(t, s, product.ID)
				return p.ID.String()
			},
			assert: func(t *testing.T, got Price) {
				assert.NotEqual(t, uuid.Nil, got.ID)
			},
		},
		{
			name: "not found for unknown price ID",
			setup: func(t *testing.T) string {
				t.Helper()
				return uuid.New().String()
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			priceID := tt.setup(t)
			got, err := s.GetPriceByID(ctx, priceID)
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
// GetFreePriceStripeID
// ============================================================================

func TestStore_GetFreePriceStripeID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T)
		wantErr error
	}{
		{
			name: "found when a free price exists",
			setup: func(t *testing.T) {
				t.Helper()
				product := createTestProduct(t, s)
				amt := int64(0)
				cur := "usd"
				err := s.CreatePrice(ctx, Price{
					ProductID:   product.ID,
					StripeID:    "price_free_" + uuid.New().String()[:8],
					Description: "gt_free",
					UnitAmount:  &amt,
					Currency:    &cur,
				})
				require.NoError(t, err)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			tt.setup(t)
			got, err := s.GetFreePriceStripeID(ctx)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.NotEmpty(t, got)
		})
	}
}
