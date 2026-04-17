package store

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================================
// CreateUserOnGoogleSignIn
// ============================================================================

func TestStore_CreateUserOnGoogleSignIn(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (string, string, string, string)
		wantErr bool
		assert  func(t *testing.T, got User)
	}{
		{
			name: "happy path creates user via google oauth",
			setup: func(t *testing.T) (string, string, string, string) {
				t.Helper()
				extID := "google-" + uuid.New().String()[:8]
				email := "google-" + uuid.New().String()[:8] + "@example.com"
				return extID, email, "Dave", "Brown"
			},
			assert: func(t *testing.T, got User) {
				assert.NotEqual(t, uuid.Nil, got.ID)
				assert.Equal(t, "Dave", got.FirstName)
			},
		},
		{
			name: "duplicate google external ID in oauth_auth (same auth_id collision) does not error on duplicate email in oauth_auth",
			// Each Google signup creates a new auth record; the uniqueness
			// constraint is on auth_id (PK) which is always a new UUID.
			// Duplicate external_id is allowed by schema. Test that a second
			// call with a DIFFERENT email succeeds.
			setup: func(t *testing.T) (string, string, string, string) {
				t.Helper()
				email := "google-dup-" + uuid.New().String()[:8] + "@example.com"
				_, err := s.CreateUserOnGoogleSignIn(ctx, "ext-shared", email, "First", "Last")
				require.NoError(t, err)
				// Different email, same ext ID — schema allows this
				email2 := "google-dup2-" + uuid.New().String()[:8] + "@example.com"
				return "ext-shared", email2, "First2", "Last2"
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			extID, email, first, last := tt.setup(t)
			got, err := s.CreateUserOnGoogleSignIn(ctx, extID, email, first, last)
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
// GetOauthUserByEmail
// ============================================================================

func TestStore_GetOauthUserByEmail(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) string // returns email to look up
		wantErr bool
		assert  func(t *testing.T, got OauthAuth)
	}{
		{
			name: "found returns oauth auth record",
			setup: func(t *testing.T) string {
				t.Helper()
				email := "oauth-lookup-" + uuid.New().String()[:8] + "@example.com"
				_, err := s.CreateUserOnGoogleSignIn(ctx, "ext-"+uuid.New().String()[:8], email, "Eve", "Fox")
				require.NoError(t, err)
				return email
			},
			assert: func(t *testing.T, got OauthAuth) {
				assert.NotEqual(t, uuid.Nil, got.AuthID)
				assert.Equal(t, "google", got.AuthProvider)
			},
		},
		{
			name: "not found for unknown email",
			setup: func(t *testing.T) string {
				t.Helper()
				return "no-such-oauth-" + uuid.New().String()[:8] + "@example.com"
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			email := tt.setup(t)
			got, err := s.GetOauthUserByEmail(ctx, email)
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
