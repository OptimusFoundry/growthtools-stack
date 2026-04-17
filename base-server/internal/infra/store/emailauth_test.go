package store

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================================
// CheckIfEmailExists
// ============================================================================

func TestStore_CheckIfEmailExists(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name   string
		setup  func(t *testing.T) string // returns email to check
		want   bool
	}{
		{
			name: "returns false for unknown email",
			setup: func(t *testing.T) string {
				t.Helper()
				return "no-such-" + uuid.New().String()[:8] + "@example.com"
			},
			want: false,
		},
		{
			name: "returns true when email exists in email_auth",
			setup: func(t *testing.T) string {
				t.Helper()
				email := "email-" + uuid.New().String()[:8] + "@example.com"
				_, err := s.CreateUserOnEmailSignup(ctx, "First", "Last", email, "hashed")
				require.NoError(t, err)
				return email
			},
			want: true,
		},
		{
			name: "returns true when email exists in oauth_auth",
			setup: func(t *testing.T) string {
				t.Helper()
				email := "oauth-" + uuid.New().String()[:8] + "@example.com"
				_, err := s.CreateUserOnGoogleSignIn(ctx, "google-ext-"+uuid.New().String()[:8], email, "First", "Last")
				require.NoError(t, err)
				return email
			},
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			email := tt.setup(t)
			got, err := s.CheckIfEmailExists(ctx, email)
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

// ============================================================================
// CreateUserOnEmailSignup
// ============================================================================

func TestStore_CreateUserOnEmailSignup(t *testing.T) {
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
			name: "happy path creates user with email auth and account",
			setup: func(t *testing.T) (string, string, string, string) {
				t.Helper()
				email := "signup-" + uuid.New().String()[:8] + "@example.com"
				return "Alice", "Smith", email, "hashedpw"
			},
			assert: func(t *testing.T, got User) {
				assert.NotEqual(t, uuid.Nil, got.ID)
				assert.Equal(t, "Alice", got.FirstName)
			},
		},
		{
			name: "duplicate email violates unique constraint",
			setup: func(t *testing.T) (string, string, string, string) {
				t.Helper()
				email := "dup-" + uuid.New().String()[:8] + "@example.com"
				_, err := s.CreateUserOnEmailSignup(ctx, "First", "Last", email, "hash1")
				require.NoError(t, err)
				return "First2", "Last2", email, "hash2"
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			firstName, lastName, email, hash := tt.setup(t)
			got, err := s.CreateUserOnEmailSignup(ctx, firstName, lastName, email, hash)
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
// GetCredentialsByEmail
// ============================================================================

func TestStore_GetCredentialsByEmail(t *testing.T) {
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
		assert  func(t *testing.T, got EmailAuth)
	}{
		{
			name: "found returns credentials",
			setup: func(t *testing.T) string {
				t.Helper()
				email := "creds-" + uuid.New().String()[:8] + "@example.com"
				_, err := s.CreateUserOnEmailSignup(ctx, "Bob", "Jones", email, "myhash")
				require.NoError(t, err)
				return email
			},
			assert: func(t *testing.T, got EmailAuth) {
				assert.Equal(t, "myhash", got.HashedPassword)
				assert.NotEqual(t, uuid.Nil, got.AuthID)
			},
		},
		{
			name: "not found for unknown email",
			setup: func(t *testing.T) string {
				t.Helper()
				return "nonexistent-" + uuid.New().String()[:8] + "@example.com"
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			email := tt.setup(t)
			got, err := s.GetCredentialsByEmail(ctx, email)
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
// GetUserByAuthID
// ============================================================================

func TestStore_GetUserByAuthID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) uuid.UUID // returns authID
		wantErr bool
		assert  func(t *testing.T, got AuthenticatedUser)
	}{
		{
			name: "found returns authenticated user",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				email := "authid-" + uuid.New().String()[:8] + "@example.com"
				_, err := s.CreateUserOnEmailSignup(ctx, "Carol", "White", email, "pw")
				require.NoError(t, err)
				creds, err := s.GetCredentialsByEmail(ctx, email)
				require.NoError(t, err)
				return creds.AuthID
			},
			assert: func(t *testing.T, got AuthenticatedUser) {
				assert.NotEqual(t, uuid.Nil, got.UserID)
				assert.Equal(t, "email", got.AuthType)
			},
		},
		{
			name: "not found for unknown auth ID",
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
			authID := tt.setup(t)
			got, err := s.GetUserByAuthID(ctx, authID)
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
