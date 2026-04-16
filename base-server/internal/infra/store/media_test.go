package store

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateMedia(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	altText := "A test image"
	media, err := s.CreateMedia(ctx, CreateMediaParams{
		AccountID:   accountID,
		Filename:    "test-image.png",
		ContentType: "image/png",
		S3Key:       "uploads/" + uuid.New().String() + "/test-image.png",
		S3URL:       "https://s3.example.com/test-image.png",
		SizeBytes:   1024,
		Width:       intPtr(800),
		Height:      intPtr(600),
		AltText:     &altText,
		Source:      MediaSourceUpload,
	})
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, media.ID)
	assert.Equal(t, accountID, media.AccountID)
	assert.Equal(t, "test-image.png", media.Filename)
	assert.Equal(t, "image/png", media.ContentType)
	assert.Equal(t, int64(1024), media.SizeBytes)
	assert.Equal(t, intPtr(800), media.Width)
	assert.Equal(t, intPtr(600), media.Height)
	assert.Equal(t, &altText, media.AltText)
	assert.Nil(t, media.DeletedAt)
}

func TestGetMediaByID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	created, err := s.CreateMedia(ctx, CreateMediaParams{
		AccountID:   accountID,
		Filename:    "get-test.png",
		ContentType: "image/png",
		S3Key:       "uploads/" + uuid.New().String() + "/get-test.png",
		S3URL:       "https://s3.example.com/get-test.png",
		SizeBytes:   2048,
		Source:      MediaSourceUpload,
	})
	require.NoError(t, err)

	got, err := s.GetMediaByID(ctx, accountID, created.ID)
	require.NoError(t, err)
	assert.Equal(t, created.ID, got.ID)
	assert.Equal(t, "get-test.png", got.Filename)

	// Not found
	_, err = s.GetMediaByID(ctx, accountID, uuid.New())
	assert.ErrorIs(t, err, ErrNotFound)

	// Wrong account
	_, err = s.GetMediaByID(ctx, uuid.New(), created.ID)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestListMediaByAccount(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		_, err := s.CreateMedia(ctx, CreateMediaParams{
			AccountID:   accountID,
			Filename:    "list-" + uuid.New().String()[:8] + ".png",
			ContentType: "image/png",
			S3Key:       "uploads/" + uuid.New().String() + ".png",
			S3URL:       "https://s3.example.com/" + uuid.New().String() + ".png",
			SizeBytes:   512,
			Source:      MediaSourceUpload,
		})
		require.NoError(t, err)
	}

	items, err := s.ListMediaByAccount(ctx, accountID, 10, 0)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(items), 3)

	// Pagination
	items, err = s.ListMediaByAccount(ctx, accountID, 2, 0)
	require.NoError(t, err)
	assert.Equal(t, 2, len(items))

	// Empty for other account
	other := createTestAccount(t, s)
	items, err = s.ListMediaByAccount(ctx, other, 10, 0)
	require.NoError(t, err)
	assert.Empty(t, items)
}

func TestCountMediaByAccount(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	count, err := s.CountMediaByAccount(ctx, accountID)
	require.NoError(t, err)
	assert.Equal(t, 0, count)

	_, err = s.CreateMedia(ctx, CreateMediaParams{
		AccountID:   accountID,
		Filename:    "count-test.png",
		ContentType: "image/png",
		S3Key:       "uploads/" + uuid.New().String() + ".png",
		S3URL:       "https://s3.example.com/" + uuid.New().String() + ".png",
		SizeBytes:   100,
		Source:      MediaSourceUpload,
	})
	require.NoError(t, err)

	count, err = s.CountMediaByAccount(ctx, accountID)
	require.NoError(t, err)
	assert.Equal(t, 1, count)
}

func TestDeleteMedia(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	created, err := s.CreateMedia(ctx, CreateMediaParams{
		AccountID:   accountID,
		Filename:    "delete-test.png",
		ContentType: "image/png",
		S3Key:       "uploads/" + uuid.New().String() + ".png",
		S3URL:       "https://s3.example.com/" + uuid.New().String() + ".png",
		SizeBytes:   256,
		Source:      MediaSourceUpload,
	})
	require.NoError(t, err)

	err = s.DeleteMedia(ctx, accountID, created.ID)
	require.NoError(t, err)

	// Should not be found after soft delete
	_, err = s.GetMediaByID(ctx, accountID, created.ID)
	assert.ErrorIs(t, err, ErrNotFound)

	// Double delete
	err = s.DeleteMedia(ctx, accountID, created.ID)
	assert.ErrorIs(t, err, ErrNotFound)

	// Non-existent
	err = s.DeleteMedia(ctx, accountID, uuid.New())
	assert.ErrorIs(t, err, ErrNotFound)
}
