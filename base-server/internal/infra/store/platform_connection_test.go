package store

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreatePlatformConnection(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	displayName := "testuser"
	refreshToken := "refresh-token-123"
	expiresAt := time.Now().UTC().Add(24 * time.Hour)

	pc, err := s.CreatePlatformConnection(ctx, CreatePlatformConnectionParams{
		AccountID:      accountID,
		Platform:       PlatformX,
		PlatformUserID: "x-user-" + uuid.New().String()[:8],
		DisplayName:    &displayName,
		AccessToken:    "access-token-123",
		RefreshToken:   &refreshToken,
		TokenExpiresAt: &expiresAt,
		Scopes:         StringArray{"read", "write"},
	})
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, pc.ID)
	assert.Equal(t, accountID, pc.AccountID)
	assert.Equal(t, PlatformX, pc.Platform)
	assert.Equal(t, &displayName, pc.DisplayName)
	assert.Equal(t, PlatformConnectionStatusActive, pc.Status)
	assert.Nil(t, pc.DeletedAt)
}

func TestGetPlatformConnectionByID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	created, err := s.CreatePlatformConnection(ctx, CreatePlatformConnectionParams{
		AccountID:      accountID,
		Platform:       PlatformLinkedIn,
		PlatformUserID: "li-user-" + uuid.New().String()[:8],
		AccessToken:    "token-" + uuid.New().String()[:8],
	})
	require.NoError(t, err)

	got, err := s.GetPlatformConnectionByID(ctx, accountID, created.ID)
	require.NoError(t, err)
	assert.Equal(t, created.ID, got.ID)
	assert.Equal(t, PlatformLinkedIn, got.Platform)

	// Not found
	_, err = s.GetPlatformConnectionByID(ctx, accountID, uuid.New())
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestGetPlatformConnectionByAccountAndPlatform(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	platformUserID := "bs-user-" + uuid.New().String()[:8]
	created, err := s.CreatePlatformConnection(ctx, CreatePlatformConnectionParams{
		AccountID:      accountID,
		Platform:       PlatformBlueSky,
		PlatformUserID: platformUserID,
		AccessToken:    "token-" + uuid.New().String()[:8],
	})
	require.NoError(t, err)

	got, err := s.GetPlatformConnectionByAccountAndPlatform(ctx, accountID, PlatformBlueSky, platformUserID)
	require.NoError(t, err)
	assert.Equal(t, created.ID, got.ID)

	// Not found - wrong platform
	_, err = s.GetPlatformConnectionByAccountAndPlatform(ctx, accountID, PlatformFacebook, platformUserID)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestListPlatformConnectionsByAccount(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	for _, platform := range []string{PlatformX, PlatformLinkedIn} {
		_, err := s.CreatePlatformConnection(ctx, CreatePlatformConnectionParams{
			AccountID:      accountID,
			Platform:       platform,
			PlatformUserID: platform + "-user-" + uuid.New().String()[:8],
			AccessToken:    "token-" + uuid.New().String()[:8],
		})
		require.NoError(t, err)
	}

	connections, err := s.ListPlatformConnectionsByAccount(ctx, accountID)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(connections), 2)

	// Empty for another account
	otherAccount := createTestAccount(t, s)
	connections, err = s.ListPlatformConnectionsByAccount(ctx, otherAccount)
	require.NoError(t, err)
	assert.Empty(t, connections)
}

func TestUpdatePlatformConnectionTokens(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	created, err := s.CreatePlatformConnection(ctx, CreatePlatformConnectionParams{
		AccountID:      accountID,
		Platform:       PlatformX,
		PlatformUserID: "x-token-user-" + uuid.New().String()[:8],
		AccessToken:    "old-token",
	})
	require.NoError(t, err)

	newRefresh := "new-refresh"
	newExpiry := time.Now().UTC().Add(48 * time.Hour)
	err = s.UpdatePlatformConnectionTokens(ctx, accountID, created.ID, "new-access-token", &newRefresh, &newExpiry)
	require.NoError(t, err)

	got, err := s.GetPlatformConnectionByID(ctx, accountID, created.ID)
	require.NoError(t, err)
	assert.Equal(t, "new-access-token", got.AccessToken)
	assert.Equal(t, PlatformConnectionStatusActive, got.Status)

	// Not found
	err = s.UpdatePlatformConnectionTokens(ctx, accountID, uuid.New(), "token", nil, nil)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestUpdatePlatformConnectionStatus(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	created, err := s.CreatePlatformConnection(ctx, CreatePlatformConnectionParams{
		AccountID:      accountID,
		Platform:       PlatformX,
		PlatformUserID: "x-status-user-" + uuid.New().String()[:8],
		AccessToken:    "token-" + uuid.New().String()[:8],
	})
	require.NoError(t, err)

	err = s.UpdatePlatformConnectionStatus(ctx, accountID, created.ID, PlatformConnectionStatusExpired)
	require.NoError(t, err)

	got, err := s.GetPlatformConnectionByID(ctx, accountID, created.ID)
	require.NoError(t, err)
	assert.Equal(t, PlatformConnectionStatusExpired, got.Status)

	// Not found
	err = s.UpdatePlatformConnectionStatus(ctx, accountID, uuid.New(), PlatformConnectionStatusError)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestDeletePlatformConnection(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	created, err := s.CreatePlatformConnection(ctx, CreatePlatformConnectionParams{
		AccountID:      accountID,
		Platform:       PlatformX,
		PlatformUserID: "x-del-user-" + uuid.New().String()[:8],
		AccessToken:    "token-" + uuid.New().String()[:8],
	})
	require.NoError(t, err)

	err = s.DeletePlatformConnection(ctx, accountID, created.ID)
	require.NoError(t, err)

	// Should not be found after soft delete
	_, err = s.GetPlatformConnectionByID(ctx, accountID, created.ID)
	assert.ErrorIs(t, err, ErrNotFound)

	// Double delete returns not found
	err = s.DeletePlatformConnection(ctx, accountID, created.ID)
	assert.ErrorIs(t, err, ErrNotFound)
}
