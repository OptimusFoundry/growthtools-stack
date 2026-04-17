package store

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// createTestProduct inserts a product row and returns the Product.
func createTestProduct(t *testing.T, s *Store) Product {
	t.Helper()
	ctx := context.Background()
	stripeID := "prod_" + uuid.New().String()[:8]
	p, err := s.CreateProduct(ctx, stripeID, "Test Product "+stripeID, "A test product")
	require.NoError(t, err, "createTestProduct: failed")
	return p
}

// ============================================================================
// CreateProduct
// ============================================================================

func TestStore_CreateProduct(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (string, string, string)
		wantErr bool
		assert  func(t *testing.T, got Product)
	}{
		{
			name: "happy path creates product",
			setup: func(t *testing.T) (string, string, string) {
				t.Helper()
				stripeID := "prod_" + uuid.New().String()[:8]
				return stripeID, "Pro Plan", "The pro plan"
			},
			assert: func(t *testing.T, got Product) {
				assert.NotEqual(t, uuid.Nil, got.ID)
				assert.Equal(t, "Pro Plan", got.Name)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			stripeID, name, desc := tt.setup(t)
			got, err := s.CreateProduct(ctx, stripeID, name, desc)
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
// GetProductByStripeID
// ============================================================================

func TestStore_GetProductByStripeID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) string // returns stripeID
		wantErr bool
		assert  func(t *testing.T, got Product)
	}{
		{
			name: "found returns product",
			setup: func(t *testing.T) string {
				t.Helper()
				p := createTestProduct(t, s)
				return p.StripeID
			},
			assert: func(t *testing.T, got Product) {
				assert.NotEqual(t, uuid.Nil, got.ID)
			},
		},
		{
			name: "not found for unknown stripe ID",
			setup: func(t *testing.T) string {
				t.Helper()
				return "prod_nonexistent_" + uuid.New().String()[:8]
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			stripeID := tt.setup(t)
			got, err := s.GetProductByStripeID(ctx, stripeID)
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
