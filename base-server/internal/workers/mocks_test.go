package workers

import (
	"context"
	"encoding/json"
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
	claimPlatformPostForPublishing   func(ctx context.Context, id uuid.UUID) (bool, error)

	// Track calls for assertions
	updatePlatformPostStatusCalls []updatePlatformPostStatusCall
	updatePostStatusCalls         []updatePostStatusCall
}

func (m *mockPublishStore) ClaimPlatformPostForPublishing(ctx context.Context, id uuid.UUID) (bool, error) {
	if m.claimPlatformPostForPublishing != nil {
		return m.claimPlatformPostForPublishing(ctx, id)
	}
	return true, nil
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
	getRetryablePlatformPosts       func(ctx context.Context, now time.Time, limit int) ([]store.RetryablePlatformPost, error)
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
	publishFn        func(ctx context.Context, content string, mediaURLs []string, conn store.PlatformConnection) (adapters.PlatformPostResult, error)
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

// ─── Async publish mocks (used by T1–T5) ────────────────────────────────────

// mockAsyncStore embeds mockPublishStore and adds the extra methods needed by
// AsyncPublishStore (SetPlatformPostQueued, SetPlatformPostAwaitingMedia,
// SetPlatformPostMediaReady, GetPlatformPostByID, ListPlatformPostsAwaitingMedia).
type mockAsyncStore struct {
	mockPublishStore

	getPlatformPostByID            func(ctx context.Context, id uuid.UUID) (store.PlatformPost, error)
	setPlatformPostQueued          func(ctx context.Context, id uuid.UUID) error
	setPlatformPostAwaitingMedia   func(ctx context.Context, id uuid.UUID, handle json.RawMessage) error
	setPlatformPostMediaReady      func(ctx context.Context, id uuid.UUID, handle json.RawMessage) error
	listPlatformPostsAwaitingMedia func(ctx context.Context, limit int) ([]store.RetryablePlatformPost, error)

	// call tracking
	setPlatformPostQueuedCalls        []uuid.UUID
	setPlatformPostAwaitingMediaCalls []uuid.UUID
	setPlatformPostMediaReadyCalls    []uuid.UUID
}

func (m *mockAsyncStore) GetPlatformPostByID(ctx context.Context, id uuid.UUID) (store.PlatformPost, error) {
	if m.getPlatformPostByID != nil {
		return m.getPlatformPostByID(ctx, id)
	}
	return store.PlatformPost{}, nil
}

func (m *mockAsyncStore) SetPlatformPostQueued(ctx context.Context, id uuid.UUID) error {
	m.setPlatformPostQueuedCalls = append(m.setPlatformPostQueuedCalls, id)
	if m.setPlatformPostQueued != nil {
		return m.setPlatformPostQueued(ctx, id)
	}
	return nil
}

func (m *mockAsyncStore) SetPlatformPostAwaitingMedia(ctx context.Context, id uuid.UUID, handle json.RawMessage) error {
	m.setPlatformPostAwaitingMediaCalls = append(m.setPlatformPostAwaitingMediaCalls, id)
	if m.setPlatformPostAwaitingMedia != nil {
		return m.setPlatformPostAwaitingMedia(ctx, id, handle)
	}
	return nil
}

func (m *mockAsyncStore) SetPlatformPostMediaReady(ctx context.Context, id uuid.UUID, handle json.RawMessage) error {
	m.setPlatformPostMediaReadyCalls = append(m.setPlatformPostMediaReadyCalls, id)
	if m.setPlatformPostMediaReady != nil {
		return m.setPlatformPostMediaReady(ctx, id, handle)
	}
	return nil
}

func (m *mockAsyncStore) ListPlatformPostsAwaitingMedia(ctx context.Context, limit int) ([]store.RetryablePlatformPost, error) {
	if m.listPlatformPostsAwaitingMedia != nil {
		return m.listPlatformPostsAwaitingMedia(ctx, limit)
	}
	return nil, nil
}

// mockEventPublisher records Publish calls for assertions.
type mockEventPublisher struct {
	publishFn    func(ctx context.Context, topic, key string, payload any) error
	publishCalls []eventPublisherCall
}

type eventPublisherCall struct {
	Topic   string
	Key     string
	Payload any
}

func (m *mockEventPublisher) Publish(ctx context.Context, topic, key string, payload any) error {
	m.publishCalls = append(m.publishCalls, eventPublisherCall{Topic: topic, Key: key, Payload: payload})
	if m.publishFn != nil {
		return m.publishFn(ctx, topic, key, payload)
	}
	return nil
}

// mockAsyncAdapter implements AsyncPlatformAdapter on top of mockAdapter.
type mockAsyncAdapter struct {
	mockAdapter

	startPublishFn func(ctx context.Context, spec adapters.PostSpec, conn store.PlatformConnection) (json.RawMessage, bool, error)
	checkReadyFn   func(ctx context.Context, handle json.RawMessage, conn store.PlatformConnection) (bool, json.RawMessage, error)
	finalizeFn     func(ctx context.Context, spec adapters.PostSpec, handle json.RawMessage, conn store.PlatformConnection) (adapters.PlatformPostResult, error)

	startCalls    int
	checkCalls    int
	finalizeCalls int
}

func (m *mockAsyncAdapter) StartPublish(ctx context.Context, spec adapters.PostSpec, conn store.PlatformConnection) (json.RawMessage, bool, error) {
	m.startCalls++
	if m.startPublishFn != nil {
		return m.startPublishFn(ctx, spec, conn)
	}
	return json.RawMessage(`{}`), true, nil
}

func (m *mockAsyncAdapter) CheckReady(ctx context.Context, handle json.RawMessage, conn store.PlatformConnection) (bool, json.RawMessage, error) {
	m.checkCalls++
	if m.checkReadyFn != nil {
		return m.checkReadyFn(ctx, handle, conn)
	}
	return true, handle, nil
}

func (m *mockAsyncAdapter) Finalize(ctx context.Context, spec adapters.PostSpec, handle json.RawMessage, conn store.PlatformConnection) (adapters.PlatformPostResult, error) {
	m.finalizeCalls++
	if m.finalizeFn != nil {
		return m.finalizeFn(ctx, spec, handle, conn)
	}
	return adapters.PlatformPostResult{PlatformPostID: "mock-post-id", URL: "https://mock.url"}, nil
}

// mockURLSigner implements URLSigner for testing.
type mockURLSigner struct {
	signFn func(ctx context.Context, key string, ttl time.Duration) (string, error)
}

func (m *mockURLSigner) PresignGetURL(ctx context.Context, key string, ttl time.Duration) (string, error) {
	if m.signFn != nil {
		return m.signFn(ctx, key, ttl)
	}
	return "https://presigned.example.com/" + key, nil
}

// helper
func strPtr(s string) *string { return &s }
func intPtr(i int) *int       { return &i }
