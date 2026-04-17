package store

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================================
// CreatePaymentMethod
// ============================================================================

func TestStore_CreatePaymentMethod(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) CreatePaymentMethodParams
		wantErr bool
		assert  func(t *testing.T, got *PaymentMethod)
	}{
		{
			name: "happy path creates payment method",
			setup: func(t *testing.T) CreatePaymentMethodParams {
				t.Helper()
				userID := createTestUser(t, s)
				return CreatePaymentMethodParams{
					UserID:       userID,
					StripeID:     "pm_" + uuid.New().String()[:8],
					CardBrand:    "visa",
					CardLast4:    "4242",
					CardExpMonth: 12,
					CardExpYear:  2099,
				}
			},
			assert: func(t *testing.T, got *PaymentMethod) {
				assert.NotEqual(t, uuid.Nil, got.ID)
				assert.Equal(t, "visa", got.CardBrand)
				assert.Equal(t, "4242", got.CardLast4)
			},
		},
		{
			name: "duplicate user+stripe_id violates unique constraint",
			setup: func(t *testing.T) CreatePaymentMethodParams {
				t.Helper()
				userID := createTestUser(t, s)
				stripeID := "pm_dup_" + uuid.New().String()[:8]
				_, err := s.CreatePaymentMethod(ctx, CreatePaymentMethodParams{
					UserID:       userID,
					StripeID:     stripeID,
					CardBrand:    "visa",
					CardLast4:    "4242",
					CardExpMonth: 12,
					CardExpYear:  2099,
				})
				require.NoError(t, err)
				return CreatePaymentMethodParams{
					UserID:       userID,
					StripeID:     stripeID, // same user + stripe ID
					CardBrand:    "mc",
					CardLast4:    "1111",
					CardExpMonth: 6,
					CardExpYear:  2030,
				}
			},
			wantErr: true,
		},
		{
			name: "FK violation when user does not exist",
			setup: func(t *testing.T) CreatePaymentMethodParams {
				t.Helper()
				return CreatePaymentMethodParams{
					UserID:       uuid.New(),
					StripeID:     "pm_fk_" + uuid.New().String()[:8],
					CardBrand:    "amex",
					CardLast4:    "0005",
					CardExpMonth: 1,
					CardExpYear:  2040,
				}
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			params := tt.setup(t)
			got, err := s.CreatePaymentMethod(ctx, params)
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
// GetPaymentMethodByUserID
// ============================================================================

func TestStore_GetPaymentMethodByUserID(t *testing.T) {
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
		assert  func(t *testing.T, got *PaymentMethod)
	}{
		{
			name: "found returns payment method",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				_, err := s.CreatePaymentMethod(ctx, CreatePaymentMethodParams{
					UserID:       userID,
					StripeID:     "pm_get_" + uuid.New().String()[:8],
					CardBrand:    "discover",
					CardLast4:    "6011",
					CardExpMonth: 3,
					CardExpYear:  2035,
				})
				require.NoError(t, err)
				return userID
			},
			assert: func(t *testing.T, got *PaymentMethod) {
				assert.NotNil(t, got)
				assert.Equal(t, "discover", got.CardBrand)
			},
		},
		{
			name: "not found for user with no payment method",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return uuid.New() // non-existent user
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			userID := tt.setup(t)
			got, err := s.GetPaymentMethodByUserID(ctx, userID)
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
// UpdatePaymentMethodByUserID
// ============================================================================

func TestStore_UpdatePaymentMethodByUserID(t *testing.T) {
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
			name: "happy path updates payment method",
			setup: func(t *testing.T) (uuid.UUID, string) {
				t.Helper()
				userID := createTestUser(t, s)
				stripeID := "pm_upd_" + uuid.New().String()[:8]
				_, err := s.CreatePaymentMethod(ctx, CreatePaymentMethodParams{
					UserID:       userID,
					StripeID:     stripeID,
					CardBrand:    "visa",
					CardLast4:    "4242",
					CardExpMonth: 12,
					CardExpYear:  2030,
				})
				require.NoError(t, err)
				return userID, "pm_new_" + uuid.New().String()[:8]
			},
		},
		{
			name: "no error but no rows affected for user with no payment method",
			// The store returns fmt.Errorf("payment method not found") (not ErrNotFound sentinel)
			// so we just check that an error is returned.
			setup: func(t *testing.T) (uuid.UUID, string) {
				t.Helper()
				return uuid.New(), "pm_nobody"
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			userID, newStripeID := tt.setup(t)
			err := s.UpdatePaymentMethodByUserID(ctx, userID, newStripeID, "mc", "9999", 1, 2040)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
		})
	}
}
