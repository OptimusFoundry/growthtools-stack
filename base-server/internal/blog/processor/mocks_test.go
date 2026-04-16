package processor

import (
	"context"

	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// MockBlogStore is a manual mock for BlogStore
type MockBlogStore struct {
	CreateBlogPostFn  func(ctx context.Context, params store.CreateBlogPostParams) (store.BlogPost, error)
	GetBlogPostByIDFn func(ctx context.Context, accountID, postID uuid.UUID) (store.BlogPost, error)
	GetBlogPostBySlugFn func(ctx context.Context, accountID uuid.UUID, slug string) (store.BlogPost, error)
	ListBlogPostsFn   func(ctx context.Context, accountID uuid.UUID, status *string, limit, offset int) ([]store.BlogPost, error)
	UpdateBlogPostFn  func(ctx context.Context, accountID, id uuid.UUID, params store.UpdateBlogPostParams) (store.BlogPost, error)
	DeleteBlogPostFn  func(ctx context.Context, accountID, postID uuid.UUID) error
	PublishBlogPostFn func(ctx context.Context, accountID, id uuid.UUID) (store.BlogPost, error)
}

func (m *MockBlogStore) CreateBlogPost(ctx context.Context, params store.CreateBlogPostParams) (store.BlogPost, error) {
	return m.CreateBlogPostFn(ctx, params)
}

func (m *MockBlogStore) GetBlogPostByID(ctx context.Context, accountID, postID uuid.UUID) (store.BlogPost, error) {
	return m.GetBlogPostByIDFn(ctx, accountID, postID)
}

func (m *MockBlogStore) GetBlogPostBySlug(ctx context.Context, accountID uuid.UUID, slug string) (store.BlogPost, error) {
	return m.GetBlogPostBySlugFn(ctx, accountID, slug)
}

func (m *MockBlogStore) ListBlogPosts(ctx context.Context, accountID uuid.UUID, status *string, limit, offset int) ([]store.BlogPost, error) {
	return m.ListBlogPostsFn(ctx, accountID, status, limit, offset)
}

func (m *MockBlogStore) UpdateBlogPost(ctx context.Context, accountID, id uuid.UUID, params store.UpdateBlogPostParams) (store.BlogPost, error) {
	return m.UpdateBlogPostFn(ctx, accountID, id, params)
}

func (m *MockBlogStore) DeleteBlogPost(ctx context.Context, accountID, postID uuid.UUID) error {
	return m.DeleteBlogPostFn(ctx, accountID, postID)
}

func (m *MockBlogStore) PublishBlogPost(ctx context.Context, accountID, id uuid.UUID) (store.BlogPost, error) {
	return m.PublishBlogPostFn(ctx, accountID, id)
}
