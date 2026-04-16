package workers

import (
	"context"
	"time"

	"base-server/internal/infra/store"
	"base-server/internal/platform/adapters"

	"github.com/google/uuid"
)

// mockPublishStore implements PublishStore for testing
type mockPublishStore struct {
	getPostByID                      func(ctx context.Context, accountID, id uuid.UUID) (store.Post, error)
	getPlatformPostsByPostID         func(ctx context.Context, postID uuid.UUID) ([]store.PlatformPost, error)
	getPlatformConnectionByAcctPlat  func(ctx context.Context, accountID uuid.UUID, platform, platformUserID string) (store.PlatformConnection, error)
	listPlatformConnectionsByAccount func(ctx context.Context, accountID uuid.UUID) ([]store.PlatformConnection, error)
	updatePostStatus                 func(ctx context.Context, accountID, id uuid.UUID, status string, publishedAt *time.Time) error
	updatePlatformPostStatus         func(ctx context.Context, id uuid.UUID, status string, platformPostID *string, publishedAt any, errMessage *string, attemptCount *int, nextRetryAt *time.Time, lastAttemptAt *time.Time) error
	getMediaByIDs                    func(ctx context.Context, ids []uuid.UUID) ([]store.Media, error)

	// Track calls for assertions
	updatePlatformPostStatusCalls []updatePlatformPostStatusCall
	updatePostStatusCalls         []updatePostStatusCall
}

type updatePlatformPostStatusCall struct {
	ID            uuid.UUID
	Status        string
	PlatformID    *string
	PublishedAt   any
	ErrMessage    *string
	AttemptCount  *int
	NextRetryAt   *time.Time
	LastAttemptAt *time.Time
}

type updatePostStatusCall struct {
	AccountID   uuid.UUID
	PostID      uuid.UUID
	Status      string
	PublishedAt *time.Time
}

func (m *mockPublishStore) GetPostByID(ctx context.Context, accountID, id uuid.UUID) (store.Post, error) {
	if m.getPostByID != nil {
		return m.getPostByID(ctx, accountID, id)
	}
	return store.Post{}, nil
}

func (m *mockPublishStore) GetPlatformPostsByPostID(ctx context.Context, postID uuid.UUID) ([]store.PlatformPost, error) {
	if m.getPlatformPostsByPostID != nil {
		return m.getPlatformPostsByPostID(ctx, postID)
	}
	return nil, nil
}

func (m *mockPublishStore) GetPlatformConnectionByAccountAndPlatform(ctx context.Context, accountID uuid.UUID, platform, platformUserID string) (store.PlatformConnection, error) {
	if m.getPlatformConnectionByAcctPlat != nil {
		return m.getPlatformConnectionByAcctPlat(ctx, accountID, platform, platformUserID)
	}
	return store.PlatformConnection{}, nil
}

func (m *mockPublishStore) ListPlatformConnectionsByAccount(ctx context.Context, accountID uuid.UUID) ([]store.PlatformConnection, error) {
	if m.listPlatformConnectionsByAccount != nil {
		return m.listPlatformConnectionsByAccount(ctx, accountID)
	}
	return nil, nil
}

func (m *mockPublishStore) UpdatePostStatus(ctx context.Context, accountID, id uuid.UUID, status string, publishedAt *time.Time) error {
	m.updatePostStatusCalls = append(m.updatePostStatusCalls, updatePostStatusCall{
		AccountID: accountID, PostID: id, Status: status, PublishedAt: publishedAt,
	})
	if m.updatePostStatus != nil {
		return m.updatePostStatus(ctx, accountID, id, status, publishedAt)
	}
	return nil
}

func (m *mockPublishStore) UpdatePlatformPostStatus(ctx context.Context, id uuid.UUID, status string, platformPostID *string, publishedAt any, errMessage *string, attemptCount *int, nextRetryAt *time.Time, lastAttemptAt *time.Time) error {
	m.updatePlatformPostStatusCalls = append(m.updatePlatformPostStatusCalls, updatePlatformPostStatusCall{
		ID: id, Status: status, PlatformID: platformPostID, PublishedAt: publishedAt, ErrMessage: errMessage,
		AttemptCount: attemptCount, NextRetryAt: nextRetryAt, LastAttemptAt: lastAttemptAt,
	})
	if m.updatePlatformPostStatus != nil {
		return m.updatePlatformPostStatus(ctx, id, status, platformPostID, publishedAt, errMessage, attemptCount, nextRetryAt, lastAttemptAt)
	}
	return nil
}

func (m *mockPublishStore) GetMediaByIDs(ctx context.Context, ids []uuid.UUID) ([]store.Media, error) {
	if m.getMediaByIDs != nil {
		return m.getMediaByIDs(ctx, ids)
	}
	return nil, nil
}

// mockRetryStore implements RetryStore for testing
type mockRetryStore struct {
	mockPublishStore
	getRetryablePlatformPosts      func(ctx context.Context, now time.Time, limit int) ([]store.RetryablePlatformPost, error)
	getStuckPublishingPlatformPosts func(ctx context.Context, stuckBefore time.Time, limit int) ([]store.RetryablePlatformPost, error)
}

func (m *mockRetryStore) GetRetryablePlatformPosts(ctx context.Context, now time.Time, limit int) ([]store.RetryablePlatformPost, error) {
	if m.getRetryablePlatformPosts != nil {
		return m.getRetryablePlatformPosts(ctx, now, limit)
	}
	return nil, nil
}

func (m *mockRetryStore) GetStuckPublishingPlatformPosts(ctx context.Context, stuckBefore time.Time, limit int) ([]store.RetryablePlatformPost, error) {
	if m.getStuckPublishingPlatformPosts != nil {
		return m.getStuckPublishingPlatformPosts(ctx, stuckBefore, limit)
	}
	return nil, nil
}

// mockAdapter implements adapters.PlatformAdapter for testing
type mockAdapter struct {
	publishFn       func(ctx context.Context, content string, mediaURLs []string, conn store.PlatformConnection) (adapters.PlatformPostResult, error)
	publishCallCount int
}

func (m *mockAdapter) Publish(ctx context.Context, content string, mediaURLs []string, conn store.PlatformConnection) (adapters.PlatformPostResult, error) {
	m.publishCallCount++
	if m.publishFn != nil {
		return m.publishFn(ctx, content, mediaURLs, conn)
	}
	return adapters.PlatformPostResult{PlatformPostID: "mock-post-id", URL: "https://mock.url"}, nil
}

func (m *mockAdapter) PublishThread(ctx context.Context, segments []adapters.ThreadSegment, mediaURLs []string, conn store.PlatformConnection) (adapters.PlatformPostResult, error) {
	// For thread publishing, delegate to Publish with the first segment's content
	content := ""
	if len(segments) > 0 {
		content = segments[0].Content
	}
	return m.Publish(ctx, content, mediaURLs, conn)
}
func (m *mockAdapter) ValidateContent(content string) error { return nil }
func (m *mockAdapter) GetEngagement(ctx context.Context, postID string, conn store.PlatformConnection) (adapters.Engagement, error) {
	return adapters.Engagement{}, nil
}

// mockTokenRefresher implements TokenRefresher for testing
type mockTokenRefresher struct {
	ensureFreshFn func(ctx context.Context, conn store.PlatformConnection) (store.PlatformConnection, error)
}

func (m *mockTokenRefresher) EnsureFreshConnection(ctx context.Context, conn store.PlatformConnection) (store.PlatformConnection, error) {
	if m.ensureFreshFn != nil {
		return m.ensureFreshFn(ctx, conn)
	}
	return conn, nil
}

// helper
func strPtr(s string) *string { return &s }
func intPtr(i int) *int       { return &i }
