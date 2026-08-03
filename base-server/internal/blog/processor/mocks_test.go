package processor

import (
	"context"

	aiblog "base-server/internal/ai/blog"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// MockBlogGenerator is a manual mock for aiblog.Generator
type MockBlogGenerator struct {
	GenerateFn       func(ctx context.Context, req aiblog.Request) (aiblog.Result, error)
	GenerateStreamFn func(ctx context.Context, req aiblog.Request) (<-chan aiblog.BlogEvent, error)
}

func (m *MockBlogGenerator) Generate(ctx context.Context, req aiblog.Request) (aiblog.Result, error) {
	if m.GenerateFn != nil {
		return m.GenerateFn(ctx, req)
	}
	return aiblog.Result{}, nil
}

func (m *MockBlogGenerator) GenerateStream(ctx context.Context, req aiblog.Request) (<-chan aiblog.BlogEvent, error) {
	if m.GenerateStreamFn != nil {
		return m.GenerateStreamFn(ctx, req)
	}
	ch := make(chan aiblog.BlogEvent)
	close(ch)
	return ch, nil
}

// MockSitePublisher is a manual mock for SitePublisher
type MockSitePublisher struct {
	PublishBlogToSiteFn  func(ctx context.Context, accountID uuid.UUID, post store.BlogPost) (string, error)
	DeleteBlogFromSiteFn func(ctx context.Context, accountID uuid.UUID, post store.BlogPost) error
}

func (m *MockSitePublisher) PublishBlogToSite(ctx context.Context, accountID uuid.UUID, post store.BlogPost) (string, error) {
	return m.PublishBlogToSiteFn(ctx, accountID, post)
}

func (m *MockSitePublisher) DeleteBlogFromSite(ctx context.Context, accountID uuid.UUID, post store.BlogPost) error {
	return m.DeleteBlogFromSiteFn(ctx, accountID, post)
}

// MockBlogStore is a manual mock for BlogStore
type MockBlogStore struct {
	CreateBlogPostFn           func(ctx context.Context, params store.CreateBlogPostParams) (store.BlogPost, error)
	GetBlogPostByIDFn          func(ctx context.Context, accountID, postID uuid.UUID) (store.BlogPost, error)
	GetBlogPostBySlugFn        func(ctx context.Context, accountID uuid.UUID, slug string) (store.BlogPost, error)
	ListBlogPostsFn            func(ctx context.Context, accountID uuid.UUID, status *string, limit, offset int) ([]store.BlogPostListItem, error)
	UpdateBlogPostFn           func(ctx context.Context, accountID, id uuid.UUID, params store.UpdateBlogPostParams) (store.BlogPost, error)
	DeleteBlogPostFn           func(ctx context.Context, accountID, postID uuid.UUID) error
	PublishBlogPostFn          func(ctx context.Context, accountID, id uuid.UUID) (store.BlogPost, error)
	SetBlogPostSitePRFn        func(ctx context.Context, accountID, postID uuid.UUID, prURL string) (store.BlogPost, error)
	GetMediaByIDsFn            func(ctx context.Context, ids []uuid.UUID) ([]store.Media, error)
	GetVoiceProfileByAccountFn func(ctx context.Context, accountID uuid.UUID) (store.VoiceProfile, error)
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

func (m *MockBlogStore) ListBlogPosts(ctx context.Context, accountID uuid.UUID, status *string, limit, offset int) ([]store.BlogPostListItem, error) {
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

func (m *MockBlogStore) SetBlogPostSitePR(ctx context.Context, accountID, postID uuid.UUID, prURL string) (store.BlogPost, error) {
	return m.SetBlogPostSitePRFn(ctx, accountID, postID, prURL)
}

func (m *MockBlogStore) GetMediaByIDs(ctx context.Context, ids []uuid.UUID) ([]store.Media, error) {
	if m.GetMediaByIDsFn != nil {
		return m.GetMediaByIDsFn(ctx, ids)
	}
	return []store.Media{}, nil
}

func (m *MockBlogStore) GetVoiceProfileByAccount(ctx context.Context, accountID uuid.UUID) (store.VoiceProfile, error) {
	if m.GetVoiceProfileByAccountFn != nil {
		return m.GetVoiceProfileByAccountFn(ctx, accountID)
	}
	return store.VoiceProfile{}, store.ErrNotFound
}
