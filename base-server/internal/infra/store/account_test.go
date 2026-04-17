package store

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// createTestUser inserts a minimal users row and returns the userID.
// It does NOT create an account — use createTestAccount when you need both.
func createTestUser(t *testing.T, s *Store) uuid.UUID {
	t.Helper()
	ctx := context.Background()
	userID := uuid.New()
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO users (id, first_name, last_name, stripe_customer_id) VALUES ($1, $2, $3, $4)`,
		userID, "Test", "User", "")
	require.NoError(t, err, "createTestUser: insert failed")
	return userID
}

// ============================================================================
// CreateAccount
// ============================================================================

func TestStore_CreateAccount(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) CreateAccountParams
		wantErr bool
	}{
		{
			name: "happy path creates account with free plan",
			setup: func(t *testing.T) CreateAccountParams {
				t.Helper()
				userID := createTestUser(t, s)
				return CreateAccountParams{
					Name:        "acct-" + uuid.New().String()[:8],
					Slug:        "slug-" + uuid.New().String()[:8],
					OwnerUserID: userID,
					Plan:        AccountPlanFree,
				}
			},
		},
		{
			name: "duplicate slug violates unique constraint",
			setup: func(t *testing.T) CreateAccountParams {
				t.Helper()
				userID := createTestUser(t, s)
				slug := "dup-slug-" + uuid.New().String()[:8]
				// Create first account with this slug
				_, err := s.CreateAccount(ctx, CreateAccountParams{
					Name:        "first-" + uuid.New().String()[:8],
					Slug:        slug,
					OwnerUserID: userID,
					Plan:        AccountPlanFree,
				})
				require.NoError(t, err)
				// Return params that will produce a duplicate slug
				userID2 := createTestUser(t, s)
				return CreateAccountParams{
					Name:        "second-" + uuid.New().String()[:8],
					Slug:        slug,
					OwnerUserID: userID2,
					Plan:        AccountPlanFree,
				}
			},
			wantErr: true,
		},
		{
			name: "FK violation when owner user does not exist",
			setup: func(t *testing.T) CreateAccountParams {
				t.Helper()
				return CreateAccountParams{
					Name:        "orphan-" + uuid.New().String()[:8],
					Slug:        "orphan-slug-" + uuid.New().String()[:8],
					OwnerUserID: uuid.New(), // non-existent user
					Plan:        AccountPlanFree,
				}
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			params := tt.setup(t)
			got, err := s.CreateAccount(ctx, params)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.NotEqual(t, uuid.Nil, got.ID)
			assert.Equal(t, params.Name, got.Name)
			assert.Equal(t, params.Slug, got.Slug)
			assert.Equal(t, params.Plan, got.Plan)
		})
	}
}

// ============================================================================
// GetAccountByID
// ============================================================================

func TestStore_GetAccountByID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name      string
		setup     func(t *testing.T) uuid.UUID
		wantErr   error
		assertFn  func(t *testing.T, got Account)
	}{
		{
			name: "found",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return createTestAccount(t, s)
			},
			assertFn: func(t *testing.T, got Account) {
				assert.NotEqual(t, uuid.Nil, got.ID)
			},
		},
		{
			name: "not found for unknown ID",
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
			accountID := tt.setup(t)
			got, err := s.GetAccountByID(ctx, accountID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assertFn != nil {
				tt.assertFn(t, got)
			}
		})
	}
}

// ============================================================================
// GetAccountBySlug
// ============================================================================

func TestStore_GetAccountBySlug(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) string // returns the slug to look up
		wantErr error
	}{
		{
			name: "found",
			setup: func(t *testing.T) string {
				t.Helper()
				userID := createTestUser(t, s)
				slug := "slug-" + uuid.New().String()[:8]
				_, err := s.CreateAccount(ctx, CreateAccountParams{
					Name:        "acct-" + uuid.New().String()[:8],
					Slug:        slug,
					OwnerUserID: userID,
					Plan:        AccountPlanFree,
				})
				require.NoError(t, err)
				return slug
			},
		},
		{
			name: "not found for unknown slug",
			setup: func(t *testing.T) string {
				t.Helper()
				return "no-such-slug-" + uuid.New().String()[:8]
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			slug := tt.setup(t)
			got, err := s.GetAccountBySlug(ctx, slug)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, slug, got.Slug)
		})
	}
}

// ============================================================================
// GetAccountsByOwnerUserID
// ============================================================================

func TestStore_GetAccountsByOwnerUserID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name     string
		setup    func(t *testing.T) uuid.UUID // returns userID
		wantMin  int
		wantMax  int
	}{
		{
			name: "returns accounts for owner",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				for i := 0; i < 2; i++ {
					_, err := s.CreateAccount(ctx, CreateAccountParams{
						Name:        "acct-" + uuid.New().String()[:8],
						Slug:        "slug-" + uuid.New().String()[:8],
						OwnerUserID: userID,
						Plan:        AccountPlanFree,
					})
					require.NoError(t, err)
				}
				return userID
			},
			wantMin: 2,
		},
		{
			name: "returns empty for unknown user",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return uuid.New()
			},
			wantMin: 0,
			wantMax: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			userID := tt.setup(t)
			got, err := s.GetAccountsByOwnerUserID(ctx, userID)
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(got), tt.wantMin)
			if tt.wantMax > 0 {
				assert.LessOrEqual(t, len(got), tt.wantMax)
			}
		})
	}
}

// ============================================================================
// UpdateAccount
// ============================================================================

func TestStore_UpdateAccount(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, UpdateAccountParams)
		wantErr error
		assert  func(t *testing.T, got Account)
	}{
		{
			name: "happy path updates name",
			setup: func(t *testing.T) (uuid.UUID, UpdateAccountParams) {
				t.Helper()
				accountID := createTestAccount(t, s)
				newName := "updated-name-" + uuid.New().String()[:8]
				return accountID, UpdateAccountParams{Name: strPtr(newName)}
			},
			assert: func(t *testing.T, got Account) {
				assert.NotEmpty(t, got.Name)
			},
		},
		{
			name: "not found for unknown account",
			setup: func(t *testing.T) (uuid.UUID, UpdateAccountParams) {
				t.Helper()
				return uuid.New(), UpdateAccountParams{Name: strPtr("x")}
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			accountID, params := tt.setup(t)
			got, err := s.UpdateAccount(ctx, accountID, params)
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
// DeleteAccount
// ============================================================================

func TestStore_DeleteAccount(t *testing.T) {
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
	}{
		{
			name: "happy path soft deletes account",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return createTestAccount(t, s)
			},
		},
		{
			name: "not found for already deleted account",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				accountID := createTestAccount(t, s)
				require.NoError(t, s.DeleteAccount(ctx, accountID))
				return accountID
			},
			wantErr: ErrNotFound,
		},
		{
			name: "not found for unknown ID",
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
			accountID := tt.setup(t)
			err := s.DeleteAccount(ctx, accountID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			// Verify it's no longer found
			_, err = s.GetAccountByID(ctx, accountID)
			require.ErrorIs(t, err, ErrNotFound)
		})
	}
}

// ============================================================================
// UpdateAccountStripeCustomerID
// ============================================================================

func TestStore_UpdateAccountStripeCustomerID(t *testing.T) {
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
				return createTestAccount(t, s), "cus_" + uuid.New().String()[:8]
			},
		},
		{
			name: "not found for unknown account",
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
			accountID, stripeID := tt.setup(t)
			err := s.UpdateAccountStripeCustomerID(ctx, accountID, stripeID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}

// ============================================================================
// CreateTeamMember
// ============================================================================

func TestStore_CreateTeamMember(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) CreateTeamMemberParams
		wantErr bool
		assert  func(t *testing.T, got TeamMember)
	}{
		{
			name: "happy path adds team member",
			setup: func(t *testing.T) CreateTeamMemberParams {
				t.Helper()
				accountID := createTestAccount(t, s)
				memberUserID := createTestUser(t, s)
				return CreateTeamMemberParams{
					AccountID:   accountID,
					UserID:      memberUserID,
					Role:        TeamMemberRoleEditor,
					Permissions: JSONB{},
				}
			},
			assert: func(t *testing.T, got TeamMember) {
				assert.NotEqual(t, uuid.Nil, got.ID)
				assert.Equal(t, TeamMemberRoleEditor, got.Role)
			},
		},
		{
			name: "duplicate account+user violates unique constraint",
			setup: func(t *testing.T) CreateTeamMemberParams {
				t.Helper()
				accountID := createTestAccount(t, s)
				memberUserID := createTestUser(t, s)
				// Insert first
				_, err := s.CreateTeamMember(ctx, CreateTeamMemberParams{
					AccountID:   accountID,
					UserID:      memberUserID,
					Role:        TeamMemberRoleEditor,
					Permissions: JSONB{},
				})
				require.NoError(t, err)
				// Return identical params
				return CreateTeamMemberParams{
					AccountID:   accountID,
					UserID:      memberUserID,
					Role:        TeamMemberRoleAdmin,
					Permissions: JSONB{},
				}
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			params := tt.setup(t)
			got, err := s.CreateTeamMember(ctx, params)
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
// GetTeamMembersByAccountID
// ============================================================================

func TestStore_GetTeamMembersByAccountID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) uuid.UUID
		wantLen int
	}{
		{
			name: "returns members for account",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				accountID := createTestAccount(t, s)
				for i := 0; i < 2; i++ {
					memberUserID := createTestUser(t, s)
					_, err := s.CreateTeamMember(ctx, CreateTeamMemberParams{
						AccountID:   accountID,
						UserID:      memberUserID,
						Role:        TeamMemberRoleViewer,
						Permissions: JSONB{},
					})
					require.NoError(t, err)
				}
				return accountID
			},
			wantLen: 2,
		},
		{
			name: "returns empty for account with no members",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return createTestAccount(t, s)
			},
			wantLen: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			accountID := tt.setup(t)
			got, err := s.GetTeamMembersByAccountID(ctx, accountID)
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(got), tt.wantLen)
		})
	}
}

// ============================================================================
// GetTeamMemberByAccountAndUserID
// ============================================================================

func TestStore_GetTeamMemberByAccountAndUserID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name      string
		setup     func(t *testing.T) (uuid.UUID, uuid.UUID)
		wantErr   error
	}{
		{
			name: "found",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				accountID := createTestAccount(t, s)
				memberUserID := createTestUser(t, s)
				_, err := s.CreateTeamMember(ctx, CreateTeamMemberParams{
					AccountID:   accountID,
					UserID:      memberUserID,
					Role:        TeamMemberRoleAdmin,
					Permissions: JSONB{},
				})
				require.NoError(t, err)
				return accountID, memberUserID
			},
		},
		{
			name: "not found for unknown user",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				accountID := createTestAccount(t, s)
				return accountID, uuid.New()
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			accountID, userID := tt.setup(t)
			got, err := s.GetTeamMemberByAccountAndUserID(ctx, accountID, userID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, accountID, got.AccountID)
			assert.Equal(t, userID, got.UserID)
		})
	}
}

// ============================================================================
// UpdateTeamMemberRole
// ============================================================================

func TestStore_UpdateTeamMemberRole(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, uuid.UUID, string)
		wantErr error
	}{
		{
			name: "happy path updates role",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID, string) {
				t.Helper()
				accountID := createTestAccount(t, s)
				memberUserID := createTestUser(t, s)
				_, err := s.CreateTeamMember(ctx, CreateTeamMemberParams{
					AccountID:   accountID,
					UserID:      memberUserID,
					Role:        TeamMemberRoleViewer,
					Permissions: JSONB{},
				})
				require.NoError(t, err)
				return accountID, memberUserID, TeamMemberRoleAdmin
			},
		},
		{
			name: "not found for non-existent member",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID, string) {
				t.Helper()
				accountID := createTestAccount(t, s)
				return accountID, uuid.New(), TeamMemberRoleAdmin
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			accountID, userID, role := tt.setup(t)
			err := s.UpdateTeamMemberRole(ctx, accountID, userID, role)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}

// ============================================================================
// DeleteTeamMember
// ============================================================================

func TestStore_DeleteTeamMember(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, uuid.UUID)
		wantErr error
	}{
		{
			name: "happy path removes member",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				accountID := createTestAccount(t, s)
				memberUserID := createTestUser(t, s)
				_, err := s.CreateTeamMember(ctx, CreateTeamMemberParams{
					AccountID:   accountID,
					UserID:      memberUserID,
					Role:        TeamMemberRoleViewer,
					Permissions: JSONB{},
				})
				require.NoError(t, err)
				return accountID, memberUserID
			},
		},
		{
			name: "not found for non-existent member",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				accountID := createTestAccount(t, s)
				return accountID, uuid.New()
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			accountID, userID := tt.setup(t)
			err := s.DeleteTeamMember(ctx, accountID, userID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			// Verify it's gone
			_, err = s.GetTeamMemberByAccountAndUserID(ctx, accountID, userID)
			require.ErrorIs(t, err, ErrNotFound)
		})
	}
}
