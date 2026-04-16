package processor

import (
	"context"
	"errors"
	"io"
	"strings"
	"testing"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMediaProcessor_Upload(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	mediaID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockMediaStore{
			CreateMediaFn: func(ctx context.Context, params store.CreateMediaParams) (store.Media, error) {
				return store.Media{ID: mediaID, AccountID: accountID, Filename: params.Filename, S3URL: params.S3URL}, nil
			},
		}
		mockFS := &MockFileStore{
			UploadFileFn: func(ctx context.Context, key string, data io.Reader, contentType string) (string, error) {
				return "https://s3.example.com/" + key, nil
			},
		}
		proc := New(mockStore, mockFS, logger)

		result, err := proc.Upload(context.Background(), accountID, "test.png", "image/png", 1024, strings.NewReader("data"))

		require.NoError(t, err)
		assert.Equal(t, mediaID, result.ID)
		assert.Equal(t, "test.png", result.Filename)
	})

	t.Run("upload error returns ErrFailedUpload", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockMediaStore{}
		mockFS := &MockFileStore{
			UploadFileFn: func(ctx context.Context, key string, data io.Reader, contentType string) (string, error) {
				return "", errors.New("storage error")
			},
		}
		proc := New(mockStore, mockFS, logger)

		_, err := proc.Upload(context.Background(), accountID, "test.png", "image/png", 1024, strings.NewReader("data"))

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedUpload)
	})

	t.Run("store error cleans up file and returns ErrFailedUpload", func(t *testing.T) {
		t.Parallel()
		fileDeleted := false
		mockStore := &MockMediaStore{
			CreateMediaFn: func(ctx context.Context, params store.CreateMediaParams) (store.Media, error) {
				return store.Media{}, errors.New("db error")
			},
		}
		mockFS := &MockFileStore{
			UploadFileFn: func(ctx context.Context, key string, data io.Reader, contentType string) (string, error) {
				return "https://s3.example.com/" + key, nil
			},
			DeleteFileFn: func(ctx context.Context, key string) error {
				fileDeleted = true
				return nil
			},
		}
		proc := New(mockStore, mockFS, logger)

		_, err := proc.Upload(context.Background(), accountID, "test.png", "image/png", 1024, strings.NewReader("data"))

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedUpload)
		assert.True(t, fileDeleted, "File should be cleaned up on DB failure")
	})
}

func TestMediaProcessor_Delete(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	mediaID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockMediaStore{
			GetMediaByIDFn: func(ctx context.Context, aID, mID uuid.UUID) (store.Media, error) {
				return store.Media{ID: mID, S3Key: "some/key"}, nil
			},
			DeleteMediaFn: func(ctx context.Context, aID, mID uuid.UUID) error {
				return nil
			},
		}
		mockFS := &MockFileStore{
			DeleteFileFn: func(ctx context.Context, key string) error {
				return nil
			},
		}
		proc := New(mockStore, mockFS, logger)

		err := proc.Delete(context.Background(), accountID, mediaID)

		require.NoError(t, err)
	})

	t.Run("media not found", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockMediaStore{
			GetMediaByIDFn: func(ctx context.Context, aID, mID uuid.UUID) (store.Media, error) {
				return store.Media{}, store.ErrNotFound
			},
		}
		mockFS := &MockFileStore{}
		proc := New(mockStore, mockFS, logger)

		err := proc.Delete(context.Background(), accountID, mediaID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrMediaNotFound)
	})

	t.Run("delete store error not found", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockMediaStore{
			GetMediaByIDFn: func(ctx context.Context, aID, mID uuid.UUID) (store.Media, error) {
				return store.Media{ID: mID, S3Key: "some/key"}, nil
			},
			DeleteMediaFn: func(ctx context.Context, aID, mID uuid.UUID) error {
				return store.ErrNotFound
			},
		}
		mockFS := &MockFileStore{}
		proc := New(mockStore, mockFS, logger)

		err := proc.Delete(context.Background(), accountID, mediaID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrMediaNotFound)
	})

	t.Run("delete store error other", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockMediaStore{
			GetMediaByIDFn: func(ctx context.Context, aID, mID uuid.UUID) (store.Media, error) {
				return store.Media{ID: mID, S3Key: "some/key"}, nil
			},
			DeleteMediaFn: func(ctx context.Context, aID, mID uuid.UUID) error {
				return errors.New("db error")
			},
		}
		mockFS := &MockFileStore{}
		proc := New(mockStore, mockFS, logger)

		err := proc.Delete(context.Background(), accountID, mediaID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedDelete)
	})

	t.Run("file delete failure is non-fatal", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockMediaStore{
			GetMediaByIDFn: func(ctx context.Context, aID, mID uuid.UUID) (store.Media, error) {
				return store.Media{ID: mID, S3Key: "some/key"}, nil
			},
			DeleteMediaFn: func(ctx context.Context, aID, mID uuid.UUID) error {
				return nil
			},
		}
		mockFS := &MockFileStore{
			DeleteFileFn: func(ctx context.Context, key string) error {
				return errors.New("storage error")
			},
		}
		proc := New(mockStore, mockFS, logger)

		err := proc.Delete(context.Background(), accountID, mediaID)

		require.NoError(t, err)
	})
}

func TestMediaProcessor_List(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockMediaStore{
			ListMediaByAccountFn: func(ctx context.Context, aID uuid.UUID, limit, offset int) ([]store.Media, error) {
				return []store.Media{{ID: uuid.New(), Filename: "a.png"}, {ID: uuid.New(), Filename: "b.png"}}, nil
			},
		}
		mockFS := &MockFileStore{}
		proc := New(mockStore, mockFS, logger)

		result, err := proc.List(context.Background(), accountID, 10, 0)

		require.NoError(t, err)
		assert.Len(t, result, 2)
	})

	t.Run("store error returns ErrFailedUpload", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockMediaStore{
			ListMediaByAccountFn: func(ctx context.Context, aID uuid.UUID, limit, offset int) ([]store.Media, error) {
				return nil, errors.New("db error")
			},
		}
		mockFS := &MockFileStore{}
		proc := New(mockStore, mockFS, logger)

		_, err := proc.List(context.Background(), accountID, 10, 0)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedUpload)
	})
}

func TestMediaProcessor_GetFile(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	mediaID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockMediaStore{
			GetMediaByIDFn: func(ctx context.Context, aID, mID uuid.UUID) (store.Media, error) {
				return store.Media{ID: mID, S3Key: "some/key.png", ContentType: "image/png"}, nil
			},
		}
		mockFS := &MockFileStore{
			GetFileFn: func(ctx context.Context, key string) (io.ReadCloser, string, error) {
				return io.NopCloser(strings.NewReader("file data")), "image/png", nil
			},
		}
		proc := New(mockStore, mockFS, logger)

		reader, contentType, err := proc.GetFile(context.Background(), accountID, mediaID)

		require.NoError(t, err)
		assert.Equal(t, "image/png", contentType)
		defer reader.Close()
		data, _ := io.ReadAll(reader)
		assert.Equal(t, "file data", string(data))
	})

	t.Run("media not found", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockMediaStore{
			GetMediaByIDFn: func(ctx context.Context, aID, mID uuid.UUID) (store.Media, error) {
				return store.Media{}, store.ErrNotFound
			},
		}
		mockFS := &MockFileStore{}
		proc := New(mockStore, mockFS, logger)

		_, _, err := proc.GetFile(context.Background(), accountID, mediaID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrMediaNotFound)
	})

	t.Run("storage error", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockMediaStore{
			GetMediaByIDFn: func(ctx context.Context, aID, mID uuid.UUID) (store.Media, error) {
				return store.Media{ID: mID, S3Key: "some/key.png", ContentType: "image/png"}, nil
			},
		}
		mockFS := &MockFileStore{
			GetFileFn: func(ctx context.Context, key string) (io.ReadCloser, string, error) {
				return nil, "", errors.New("storage error")
			},
		}
		proc := New(mockStore, mockFS, logger)

		_, _, err := proc.GetFile(context.Background(), accountID, mediaID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedGetFile)
	})

	t.Run("falls back to media content type when storage returns empty", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockMediaStore{
			GetMediaByIDFn: func(ctx context.Context, aID, mID uuid.UUID) (store.Media, error) {
				return store.Media{ID: mID, S3Key: "some/key", ContentType: "video/mp4"}, nil
			},
		}
		mockFS := &MockFileStore{
			GetFileFn: func(ctx context.Context, key string) (io.ReadCloser, string, error) {
				return io.NopCloser(strings.NewReader("data")), "", nil
			},
		}
		proc := New(mockStore, mockFS, logger)

		reader, contentType, err := proc.GetFile(context.Background(), accountID, mediaID)

		require.NoError(t, err)
		assert.Equal(t, "video/mp4", contentType)
		reader.Close()
	})
}
