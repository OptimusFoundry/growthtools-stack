package workers

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/platform/adapters"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestComputeNextRetryAt(t *testing.T) {
	t.Parallel()

	t.Run("attempt 1 schedules ~1 minute", func(t *testing.T) {
		t.Parallel()
		before := time.Now()
		result := computeNextRetryAt(1)
		expected := before.Add(1 * time.Minute)
		assert.WithinDuration(t, expected, result, 2*time.Second)
	})

	t.Run("attempt 2 schedules ~5 minutes", func(t *testing.T) {
		t.Parallel()
		before := time.Now()
		result := computeNextRetryAt(2)
		expected := before.Add(5 * time.Minute)
		assert.WithinDuration(t, expected, result, 2*time.Second)
	})

	t.Run("attempt 3 schedules ~15 minutes", func(t *testing.T) {
		t.Parallel()
		before := time.Now()
		result := computeNextRetryAt(3)
		expected := before.Add(15 * time.Minute)
		assert.WithinDuration(t, expected, result, 2*time.Second)
	})

	t.Run("attempt beyond max uses last delay", func(t *testing.T) {
		t.Parallel()
		before := time.Now()
		result := computeNextRetryAt(10)
		expected := before.Add(15 * time.Minute)
		assert.WithinDuration(t, expected, result, 2*time.Second)
	})

	t.Run("attempt 0 uses first delay", func(t *testing.T) {
		t.Parallel()
		before := time.Now()
		result := computeNextRetryAt(0)
		expected := before.Add(1 * time.Minute)
		assert.WithinDuration(t, expected, result, 2*time.Second)
	})
}

func TestResolvePostStatus(t *testing.T) {
	t.Parallel()

	id1, id2, id3 := uuid.New(), uuid.New(), uuid.New()

	t.Run("empty results returns failed", func(t *testing.T) {
		t.Parallel()
		assert.Equal(t, store.PostStatusFailed, resolvePostStatus(map[uuid.UUID]platformResult{}))
	})

	t.Run("all published returns published", func(t *testing.T) {
		t.Parallel()
		results := map[uuid.UUID]platformResult{
			id1: resultPublished,
			id2: resultPublished,
		}
		assert.Equal(t, store.PostStatusPublished, resolvePostStatus(results))
	})

	t.Run("any retryable returns publishing", func(t *testing.T) {
		t.Parallel()
		results := map[uuid.UUID]platformResult{
			id1: resultPublished,
			id2: resultRetryable,
		}
		assert.Equal(t, store.PostStatusPublishing, resolvePostStatus(results))
	})

	t.Run("retryable takes priority over permanent fail", func(t *testing.T) {
		t.Parallel()
		results := map[uuid.UUID]platformResult{
			id1: resultRetryable,
			id2: resultPermanentFail,
		}
		assert.Equal(t, store.PostStatusPublishing, resolvePostStatus(results))
	})

	t.Run("some published some permanent fail returns partially_published", func(t *testing.T) {
		t.Parallel()
		results := map[uuid.UUID]platformResult{
			id1: resultPublished,
			id2: resultPermanentFail,
		}
		assert.Equal(t, store.PostStatusPartiallyPublished, resolvePostStatus(results))
	})

	t.Run("all permanent fail returns failed", func(t *testing.T) {
		t.Parallel()
		results := map[uuid.UUID]platformResult{
			id1: resultPermanentFail,
			id2: resultPermanentFail,
		}
		assert.Equal(t, store.PostStatusFailed, resolvePostStatus(results))
	})

	t.Run("mixed all three types with retryable returns publishing", func(t *testing.T) {
		t.Parallel()
		results := map[uuid.UUID]platformResult{
			id1: resultPublished,
			id2: resultRetryable,
			id3: resultPermanentFail,
		}
		assert.Equal(t, store.PostStatusPublishing, resolvePostStatus(results))
	})

	t.Run("single published returns published", func(t *testing.T) {
		t.Parallel()
		results := map[uuid.UUID]platformResult{
			id1: resultPublished,
		}
		assert.Equal(t, store.PostStatusPublished, resolvePostStatus(results))
	})

	t.Run("single retryable returns publishing", func(t *testing.T) {
		t.Parallel()
		results := map[uuid.UUID]platformResult{
			id1: resultRetryable,
		}
		assert.Equal(t, store.PostStatusPublishing, resolvePostStatus(results))
	})

	t.Run("single permanent fail returns failed", func(t *testing.T) {
		t.Parallel()
		results := map[uuid.UUID]platformResult{
			id1: resultPermanentFail,
		}
		assert.Equal(t, store.PostStatusFailed, resolvePostStatus(results))
	})
}

func TestPublishWorker_Handle(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	accountID := uuid.New()
	postID := uuid.New()
	ppIDX := uuid.New()
	ppIDLinkedIn := uuid.New()

	t.Run("all platforms publish successfully", func(t *testing.T) {
		t.Parallel()

		mockStore := &mockPublishStore{
			getPostByID: func(_ context.Context, aID, pID uuid.UUID) (store.Post, error) {
				return store.Post{ID: pID, AccountID: aID, Content: "hello"}, nil
			},
			getPlatformPostsByPostID: func(_ context.Context, pID uuid.UUID) ([]store.PlatformPost, error) {
				return []store.PlatformPost{
					{ID: ppIDX, PostID: pID, Platform: "x", Status: "pending", MaxAttempts: 3},
					{ID: ppIDLinkedIn, PostID: pID, Platform: "linkedin", Status: "pending", MaxAttempts: 3},
				}, nil
			},
			listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
				return []store.PlatformConnection{
					{Platform: "x", AccessToken: "tok"},
					{Platform: "linkedin", AccessToken: "tok"},
				}, nil
			},
		}

		xAdapter := &mockAdapter{}
		liAdapter := &mockAdapter{}
		registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{
			"x":        xAdapter,
			"linkedin": liAdapter,
		})

		w := &PublishWorker{
			store:    mockStore,
			registry: registry,
			logger:   logger,
		}

		event := PublishEvent{PostID: postID, AccountID: accountID}
		eventBytes, _ := json.Marshal(event)

		err := w.handle(context.Background(), nil, eventBytes)
		require.NoError(t, err)

		assert.Equal(t, 1, xAdapter.publishCallCount)
		assert.Equal(t, 1, liAdapter.publishCallCount)

		// Post status should be published
		require.Len(t, mockStore.updatePostStatusCalls, 1)
		assert.Equal(t, store.PostStatusPublished, mockStore.updatePostStatusCalls[0].Status)
		assert.NotNil(t, mockStore.updatePostStatusCalls[0].PublishedAt)
	})

	t.Run("one platform fails on first attempt schedules retry", func(t *testing.T) {
		t.Parallel()

		mockStore := &mockPublishStore{
			getPostByID: func(_ context.Context, aID, pID uuid.UUID) (store.Post, error) {
				return store.Post{ID: pID, AccountID: aID, Content: "hello"}, nil
			},
			getPlatformPostsByPostID: func(_ context.Context, pID uuid.UUID) ([]store.PlatformPost, error) {
				return []store.PlatformPost{
					{ID: ppIDX, PostID: pID, Platform: "x", Status: "pending", MaxAttempts: 3, AttemptCount: 0},
					{ID: ppIDLinkedIn, PostID: pID, Platform: "linkedin", Status: "pending", MaxAttempts: 3, AttemptCount: 0},
				}, nil
			},
			listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
				return []store.PlatformConnection{
					{Platform: "x", AccessToken: "tok"},
					{Platform: "linkedin", AccessToken: "tok"},
				}, nil
			},
		}

		xAdapter := &mockAdapter{
			publishFn: func(_ context.Context, _ string, _ []string, _ store.PlatformConnection) (adapters.PlatformPostResult, error) {
				return adapters.PlatformPostResult{}, errors.New("rate limited")
			},
		}
		liAdapter := &mockAdapter{}
		registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{
			"x":        xAdapter,
			"linkedin": liAdapter,
		})

		w := &PublishWorker{
			store:    mockStore,
			registry: registry,
			logger:   logger,
		}

		event := PublishEvent{PostID: postID, AccountID: accountID}
		eventBytes, _ := json.Marshal(event)

		err := w.handle(context.Background(), nil, eventBytes)
		require.NoError(t, err)

		// X should be failed with next_retry_at set
		var xCall *updatePlatformPostStatusCall
		for _, c := range mockStore.updatePlatformPostStatusCalls {
			if c.ID == ppIDX && c.Status == store.PlatformPostStatusFailed {
				xCall = &c
				break
			}
		}
		require.NotNil(t, xCall, "expected failed status update for X platform post")
		assert.Equal(t, 1, *xCall.AttemptCount)
		assert.NotNil(t, xCall.NextRetryAt, "should schedule retry since attempt < max")
		assert.NotNil(t, xCall.ErrMessage)
		assert.Contains(t, *xCall.ErrMessage, "rate limited")

		// Post status should be publishing (has retryable)
		require.Len(t, mockStore.updatePostStatusCalls, 1)
		assert.Equal(t, store.PostStatusPublishing, mockStore.updatePostStatusCalls[0].Status)
	})

	t.Run("platform fails on max attempt is permanent", func(t *testing.T) {
		t.Parallel()

		failPPID := uuid.New()
		mockStore := &mockPublishStore{
			getPostByID: func(_ context.Context, aID, pID uuid.UUID) (store.Post, error) {
				return store.Post{ID: pID, AccountID: aID, Content: "hello"}, nil
			},
			getPlatformPostsByPostID: func(_ context.Context, pID uuid.UUID) ([]store.PlatformPost, error) {
				return []store.PlatformPost{
					{ID: ppIDX, PostID: pID, Platform: "x", Status: "pending", MaxAttempts: 3, AttemptCount: 0},
					{ID: failPPID, PostID: pID, Platform: "linkedin", Status: "failed", MaxAttempts: 3, AttemptCount: 2},
				}, nil
			},
			listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
				return []store.PlatformConnection{
					{Platform: "x", AccessToken: "tok"},
					{Platform: "linkedin", AccessToken: "tok"},
				}, nil
			},
		}

		xAdapter := &mockAdapter{}
		liAdapter := &mockAdapter{
			publishFn: func(_ context.Context, _ string, _ []string, _ store.PlatformConnection) (adapters.PlatformPostResult, error) {
				return adapters.PlatformPostResult{}, errors.New("still failing")
			},
		}
		registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{
			"x":        xAdapter,
			"linkedin": liAdapter,
		})

		w := &PublishWorker{
			store:    mockStore,
			registry: registry,
			logger:   logger,
		}

		event := PublishEvent{PostID: postID, AccountID: accountID}
		eventBytes, _ := json.Marshal(event)

		err := w.handle(context.Background(), nil, eventBytes)
		require.NoError(t, err)

		// LinkedIn should be permanent fail (attempt 3 >= max 3)
		var liCall *updatePlatformPostStatusCall
		for _, c := range mockStore.updatePlatformPostStatusCalls {
			if c.ID == failPPID && c.Status == store.PlatformPostStatusFailed {
				liCall = &c
				break
			}
		}
		require.NotNil(t, liCall)
		assert.Equal(t, 3, *liCall.AttemptCount)
		assert.Nil(t, liCall.NextRetryAt, "should NOT schedule retry at max attempts")

		// Post status should be partially_published (X succeeded, LinkedIn permanent fail)
		require.Len(t, mockStore.updatePostStatusCalls, 1)
		assert.Equal(t, store.PostStatusPartiallyPublished, mockStore.updatePostStatusCalls[0].Status)
	})

	t.Run("already published platform posts are skipped", func(t *testing.T) {
		t.Parallel()

		publishedPPID := uuid.New()
		pendingPPID := uuid.New()
		mockStore := &mockPublishStore{
			getPostByID: func(_ context.Context, aID, pID uuid.UUID) (store.Post, error) {
				return store.Post{ID: pID, AccountID: aID, Content: "hello"}, nil
			},
			getPlatformPostsByPostID: func(_ context.Context, pID uuid.UUID) ([]store.PlatformPost, error) {
				return []store.PlatformPost{
					{ID: publishedPPID, PostID: pID, Platform: "x", Status: store.PlatformPostStatusPublished, MaxAttempts: 3},
					{ID: pendingPPID, PostID: pID, Platform: "linkedin", Status: "pending", MaxAttempts: 3},
				}, nil
			},
			listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
				return []store.PlatformConnection{
					{Platform: "linkedin", AccessToken: "tok"},
				}, nil
			},
		}

		liAdapter := &mockAdapter{}
		registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{
			"linkedin": liAdapter,
		})

		w := &PublishWorker{
			store:    mockStore,
			registry: registry,
			logger:   logger,
		}

		event := PublishEvent{PostID: postID, AccountID: accountID}
		eventBytes, _ := json.Marshal(event)

		err := w.handle(context.Background(), nil, eventBytes)
		require.NoError(t, err)

		assert.Equal(t, 1, liAdapter.publishCallCount)

		require.Len(t, mockStore.updatePostStatusCalls, 1)
		assert.Equal(t, store.PostStatusPublished, mockStore.updatePostStatusCalls[0].Status)
	})

	t.Run("no connection for platform fails with retry", func(t *testing.T) {
		t.Parallel()

		mockStore := &mockPublishStore{
			getPostByID: func(_ context.Context, aID, pID uuid.UUID) (store.Post, error) {
				return store.Post{ID: pID, AccountID: aID, Content: "hello"}, nil
			},
			getPlatformPostsByPostID: func(_ context.Context, pID uuid.UUID) ([]store.PlatformPost, error) {
				return []store.PlatformPost{
					{ID: ppIDX, PostID: pID, Platform: "x", Status: "pending", MaxAttempts: 3},
				}, nil
			},
			listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
				return []store.PlatformConnection{}, nil // no connections
			},
		}

		registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{})

		w := &PublishWorker{
			store:    mockStore,
			registry: registry,
			logger:   logger,
		}

		event := PublishEvent{PostID: postID, AccountID: accountID}
		eventBytes, _ := json.Marshal(event)

		err := w.handle(context.Background(), nil, eventBytes)
		require.NoError(t, err)

		require.Len(t, mockStore.updatePlatformPostStatusCalls, 1)
		call := mockStore.updatePlatformPostStatusCalls[0]
		assert.Equal(t, store.PlatformPostStatusFailed, call.Status)
		assert.Contains(t, *call.ErrMessage, "no platform connection found")
		assert.NotNil(t, call.NextRetryAt) // first attempt, should retry
	})

	t.Run("token refresh failure fails with retry", func(t *testing.T) {
		t.Parallel()

		mockStore := &mockPublishStore{
			getPostByID: func(_ context.Context, aID, pID uuid.UUID) (store.Post, error) {
				return store.Post{ID: pID, AccountID: aID, Content: "hello"}, nil
			},
			getPlatformPostsByPostID: func(_ context.Context, pID uuid.UUID) ([]store.PlatformPost, error) {
				return []store.PlatformPost{
					{ID: ppIDX, PostID: pID, Platform: "x", Status: "pending", MaxAttempts: 3},
				}, nil
			},
			listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
				return []store.PlatformConnection{{Platform: "x", AccessToken: "expired"}}, nil
			},
		}

		registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{
			"x": &mockAdapter{},
		})

		refresher := &mockTokenRefresher{
			ensureFreshFn: func(_ context.Context, _ store.PlatformConnection) (store.PlatformConnection, error) {
				return store.PlatformConnection{}, errors.New("token expired permanently")
			},
		}

		w := &PublishWorker{
			store:          mockStore,
			registry:       registry,
			tokenRefresher: refresher,
			logger:         logger,
		}

		event := PublishEvent{PostID: postID, AccountID: accountID}
		eventBytes, _ := json.Marshal(event)

		err := w.handle(context.Background(), nil, eventBytes)
		require.NoError(t, err)

		require.Len(t, mockStore.updatePlatformPostStatusCalls, 1)
		call := mockStore.updatePlatformPostStatusCalls[0]
		assert.Equal(t, store.PlatformPostStatusFailed, call.Status)
		assert.Contains(t, *call.ErrMessage, "token refresh failed")
	})

	t.Run("adapter not found is permanent failure", func(t *testing.T) {
		t.Parallel()

		mockStore := &mockPublishStore{
			getPostByID: func(_ context.Context, aID, pID uuid.UUID) (store.Post, error) {
				return store.Post{ID: pID, AccountID: aID, Content: "hello"}, nil
			},
			getPlatformPostsByPostID: func(_ context.Context, pID uuid.UUID) ([]store.PlatformPost, error) {
				return []store.PlatformPost{
					{ID: ppIDX, PostID: pID, Platform: "unknown_platform", Status: "pending", MaxAttempts: 3},
				}, nil
			},
			listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
				return []store.PlatformConnection{{Platform: "unknown_platform", AccessToken: "tok"}}, nil
			},
		}

		registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{})

		w := &PublishWorker{
			store:    mockStore,
			registry: registry,
			logger:   logger,
		}

		event := PublishEvent{PostID: postID, AccountID: accountID}
		eventBytes, _ := json.Marshal(event)

		err := w.handle(context.Background(), nil, eventBytes)
		require.NoError(t, err)

		require.Len(t, mockStore.updatePlatformPostStatusCalls, 1)
		call := mockStore.updatePlatformPostStatusCalls[0]
		assert.Equal(t, store.PlatformPostStatusFailed, call.Status)
		assert.Contains(t, *call.ErrMessage, "adapter not found")
		assert.Nil(t, call.NextRetryAt, "adapter not found should be permanent failure")
	})

	t.Run("uses platform-specific content when available", func(t *testing.T) {
		t.Parallel()

		var capturedContent string
		mockStore := &mockPublishStore{
			getPostByID: func(_ context.Context, aID, pID uuid.UUID) (store.Post, error) {
				return store.Post{ID: pID, AccountID: aID, Content: "base content"}, nil
			},
			getPlatformPostsByPostID: func(_ context.Context, pID uuid.UUID) ([]store.PlatformPost, error) {
				platformContent := "platform-specific content for X"
				return []store.PlatformPost{
					{ID: ppIDX, PostID: pID, Platform: "x", Status: "pending", MaxAttempts: 3, Content: &platformContent},
				}, nil
			},
			listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
				return []store.PlatformConnection{{Platform: "x", AccessToken: "tok"}}, nil
			},
		}

		xAdapter := &mockAdapter{
			publishFn: func(_ context.Context, content string, _ []string, _ store.PlatformConnection) (adapters.PlatformPostResult, error) {
				capturedContent = content
				return adapters.PlatformPostResult{PlatformPostID: "123", URL: "https://x.com/123"}, nil
			},
		}
		registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{"x": xAdapter})

		w := &PublishWorker{store: mockStore, registry: registry, logger: logger}

		event := PublishEvent{PostID: postID, AccountID: accountID}
		eventBytes, _ := json.Marshal(event)
		err := w.handle(context.Background(), nil, eventBytes)
		require.NoError(t, err)

		assert.Equal(t, "platform-specific content for X", capturedContent)
	})

	t.Run("resolves media URLs", func(t *testing.T) {
		t.Parallel()

		mediaID := uuid.New()
		var capturedMediaURLs []string

		mockStore := &mockPublishStore{
			getPostByID: func(_ context.Context, aID, pID uuid.UUID) (store.Post, error) {
				return store.Post{ID: pID, AccountID: aID, Content: "hello", MediaIDs: store.UUIDArray{mediaID}}, nil
			},
			getPlatformPostsByPostID: func(_ context.Context, pID uuid.UUID) ([]store.PlatformPost, error) {
				return []store.PlatformPost{
					{ID: ppIDX, PostID: pID, Platform: "x", Status: "pending", MaxAttempts: 3},
				}, nil
			},
			listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
				return []store.PlatformConnection{{Platform: "x", AccessToken: "tok"}}, nil
			},
			getMediaByIDs: func(_ context.Context, ids []uuid.UUID) ([]store.Media, error) {
				return []store.Media{{ID: mediaID, S3URL: "https://s3.example.com/image.jpg"}}, nil
			},
		}

		xAdapter := &mockAdapter{
			publishFn: func(_ context.Context, _ string, mediaURLs []string, _ store.PlatformConnection) (adapters.PlatformPostResult, error) {
				capturedMediaURLs = mediaURLs
				return adapters.PlatformPostResult{PlatformPostID: "123", URL: "https://x.com/123"}, nil
			},
		}
		registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{"x": xAdapter})

		w := &PublishWorker{store: mockStore, registry: registry, logger: logger}

		event := PublishEvent{PostID: postID, AccountID: accountID}
		eventBytes, _ := json.Marshal(event)
		err := w.handle(context.Background(), nil, eventBytes)
		require.NoError(t, err)

		assert.Equal(t, []string{"https://s3.example.com/image.jpg"}, capturedMediaURLs)
	})

	t.Run("invalid event JSON returns error", func(t *testing.T) {
		t.Parallel()

		w := &PublishWorker{logger: logger}
		err := w.handle(context.Background(), nil, []byte("not json"))
		require.Error(t, err)
		assert.Contains(t, err.Error(), "unmarshal")
	})

	t.Run("get post error returns error", func(t *testing.T) {
		t.Parallel()

		mockStore := &mockPublishStore{
			getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
				return store.Post{}, errors.New("db down")
			},
		}
		w := &PublishWorker{store: mockStore, logger: logger}

		event := PublishEvent{PostID: postID, AccountID: accountID}
		eventBytes, _ := json.Marshal(event)
		err := w.handle(context.Background(), nil, eventBytes)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get post")
	})

	t.Run("all platforms fail on max attempts sets post to failed", func(t *testing.T) {
		t.Parallel()

		pp1 := uuid.New()
		pp2 := uuid.New()
		mockStore := &mockPublishStore{
			getPostByID: func(_ context.Context, aID, pID uuid.UUID) (store.Post, error) {
				return store.Post{ID: pID, AccountID: aID, Content: "hello"}, nil
			},
			getPlatformPostsByPostID: func(_ context.Context, pID uuid.UUID) ([]store.PlatformPost, error) {
				return []store.PlatformPost{
					{ID: pp1, PostID: pID, Platform: "x", Status: "failed", MaxAttempts: 3, AttemptCount: 2},
					{ID: pp2, PostID: pID, Platform: "linkedin", Status: "failed", MaxAttempts: 3, AttemptCount: 2},
				}, nil
			},
			listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
				return []store.PlatformConnection{
					{Platform: "x", AccessToken: "tok"},
					{Platform: "linkedin", AccessToken: "tok"},
				}, nil
			},
		}

		failAdapter := &mockAdapter{
			publishFn: func(_ context.Context, _ string, _ []string, _ store.PlatformConnection) (adapters.PlatformPostResult, error) {
				return adapters.PlatformPostResult{}, errors.New("still broken")
			},
		}
		registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{
			"x":        failAdapter,
			"linkedin": failAdapter,
		})

		w := &PublishWorker{store: mockStore, registry: registry, logger: logger}

		event := PublishEvent{PostID: postID, AccountID: accountID}
		eventBytes, _ := json.Marshal(event)
		err := w.handle(context.Background(), nil, eventBytes)
		require.NoError(t, err)

		require.Len(t, mockStore.updatePostStatusCalls, 1)
		assert.Equal(t, store.PostStatusFailed, mockStore.updatePostStatusCalls[0].Status)
	})
}
