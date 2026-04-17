package store

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================================
// GetUserByExternalID
// ============================================================================

func TestStore_GetUserByExternalID(t *testing.T) {
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
		assert  func(t *testing.T, got User)
	}{
		{
			name: "found returns user",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return createTestUser(t, s)
			},
			assert: func(t *testing.T, got User) {
				assert.Equal(t, "Test", got.FirstName)
				assert.Equal(t, "User", got.LastName)
			},
		},
		{
			name: "not found for unknown ID",
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
			userID := tt.setup(t)
			got, err := s.GetUserByExternalID(ctx, userID)
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
// UpdateStripeCustomerIDByUserID
// ============================================================================

func TestStore_UpdateStripeCustomerIDByUserID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, string)
		wantErr error
	}{
		{
			name: "happy path sets stripe customer ID",
			setup: func(t *testing.T) (uuid.UUID, string) {
				t.Helper()
				userID := createTestUser(t, s)
				return userID, "cus_" + uuid.New().String()[:8]
			},
		},
		{
			name: "not found for unknown user",
			setup: func(t *testing.T) (uuid.UUID, string) {
				t.Helper()
				return uuid.New(), "cus_xxx"
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			userID, stripeID := tt.setup(t)
			err := s.UpdateStripeCustomerIDByUserID(ctx, userID, stripeID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}

// ============================================================================
// GetStripeCustomerIDByUserExternalID
// ============================================================================

func TestStore_GetStripeCustomerIDByUserExternalID(t *testing.T) {
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
		assert  func(t *testing.T, got string)
	}{
		{
			name: "found returns stripe customer ID",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				stripeID := "cus_" + uuid.New().String()[:8]
				err := s.UpdateStripeCustomerIDByUserID(ctx, userID, stripeID)
				require.NoError(t, err)
				return userID
			},
			assert: func(t *testing.T, got string) {
				assert.NotEmpty(t, got)
			},
		},
		{
			name: "returns empty string for user with no stripe ID",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				// createTestUser inserts stripe_customer_id = ""
				return createTestUser(t, s)
			},
			wantErr: false,
			assert: func(t *testing.T, got string) {
				// stripe_customer_id is "" (empty) for new users
				assert.Equal(t, "", got)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			userID := tt.setup(t)
			got, err := s.GetStripeCustomerIDByUserExternalID(ctx, userID)
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
// GetUserByStripeCustomerID
// ============================================================================

func TestStore_GetUserByStripeCustomerID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) string // returns stripe ID to look up
		wantErr bool
		assert  func(t *testing.T, got User)
	}{
		{
			name: "found returns user",
			setup: func(t *testing.T) string {
				t.Helper()
				userID := createTestUser(t, s)
				stripeID := "cus_findme_" + uuid.New().String()[:8]
				err := s.UpdateStripeCustomerIDByUserID(ctx, userID, stripeID)
				require.NoError(t, err)
				return stripeID
			},
			assert: func(t *testing.T, got User) {
				assert.NotEqual(t, uuid.Nil, got.ID)
			},
		},
		{
			name: "not found for unknown stripe customer ID",
			setup: func(t *testing.T) string {
				t.Helper()
				return "cus_nonexistent_" + uuid.New().String()[:8]
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			stripeID := tt.setup(t)
			got, err := s.GetUserByStripeCustomerID(ctx, stripeID)
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
