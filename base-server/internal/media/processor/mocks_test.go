package processor

import (
	"context"
	"io"

	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// MockMediaStore is a manual mock for MediaStore
type MockMediaStore struct {
	CreateMediaFn         func(ctx context.Context, params store.CreateMediaParams) (store.Media, error)
	GetMediaByIDFn        func(ctx context.Context, accountID, mediaID uuid.UUID) (store.Media, error)
	ListMediaByAccountFn  func(ctx context.Context, accountID uuid.UUID, limit, offset int) ([]store.Media, error)
	DeleteMediaFn         func(ctx context.Context, accountID, mediaID uuid.UUID) error
	CountMediaByAccountFn func(ctx context.Context, accountID uuid.UUID) (int, error)
}

func (m *MockMediaStore) CreateMedia(ctx context.Context, params store.CreateMediaParams) (store.Media, error) {
	return m.CreateMediaFn(ctx, params)
}

func (m *MockMediaStore) GetMediaByID(ctx context.Context, accountID, mediaID uuid.UUID) (store.Media, error) {
	return m.GetMediaByIDFn(ctx, accountID, mediaID)
}

func (m *MockMediaStore) ListMediaByAccount(ctx context.Context, accountID uuid.UUID, limit, offset int) ([]store.Media, error) {
	return m.ListMediaByAccountFn(ctx, accountID, limit, offset)
}

func (m *MockMediaStore) DeleteMedia(ctx context.Context, accountID, mediaID uuid.UUID) error {
	return m.DeleteMediaFn(ctx, accountID, mediaID)
}

func (m *MockMediaStore) CountMediaByAccount(ctx context.Context, accountID uuid.UUID) (int, error) {
	return m.CountMediaByAccountFn(ctx, accountID)
}

// MockFileStore is a manual mock for FileStore
type MockFileStore struct {
	UploadFileFn func(ctx context.Context, key string, data io.Reader, contentType string) (string, error)
	DeleteFileFn func(ctx context.Context, key string) error
	GetFileFn    func(ctx context.Context, key string) (io.ReadCloser, string, error)
}

func (m *MockFileStore) UploadFile(ctx context.Context, key string, data io.Reader, contentType string) (string, error) {
	return m.UploadFileFn(ctx, key, data, contentType)
}

func (m *MockFileStore) DeleteFile(ctx context.Context, key string) error {
	return m.DeleteFileFn(ctx, key)
}

func (m *MockFileStore) GetFile(ctx context.Context, key string) (io.ReadCloser, string, error) {
	return m.GetFileFn(ctx, key)
}
