package workers

import (
	"context"
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

func TestRetryWorker_ProcessRetries(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	accountID := uuid.New()
	postID := uuid.New()
	ppIDX := uuid.New()

	t.Run("no retryable posts is no-op", func(t *testing.T) {
		t.Parallel()

		ms := &mockRetryStore{
			getRetryablePlatformPosts: func(_ context.Context, _ time.Time, _ int) ([]store.RetryablePlatformPost, error) {
				return nil, nil
			},
		}

		w := &RetryWorker{store: ms, logger: logger}
		err := w.processRetries(context.Background())
		require.NoError(t, err)
	})

	t.Run("retryable post gets republished successfully", func(t *testing.T) {
		t.Parallel()

		ms := &mockRetryStore{
			getRetryablePlatformPosts: func(_ context.Context, _ time.Time, _ int) ([]store.RetryablePlatformPost, error) {
				return []store.RetryablePlatformPost{
					{
						PlatformPost: store.PlatformPost{
							ID: ppIDX, PostID: postID, Platform: "x",
							Status: "failed", AttemptCount: 1, MaxAttempts: 3,
						},
						AccountID: accountID,
					},
				}, nil
			},
		}
		ms.getPostByID = func(_ context.Context, aID, pID uuid.UUID) (store.Post, error) {
			return store.Post{ID: pID, AccountID: aID, Content: "hello"}, nil
		}
		ms.listPlatformConnectionsByAccount = func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
			return []store.PlatformConnection{{Platform: "x", AccessToken: "tok"}}, nil
		}
		ms.getPlatformPostsByPostID = func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
			return []store.PlatformPost{
				{ID: ppIDX, PostID: postID, Platform: "x", Status: store.PlatformPostStatusPublished, AttemptCount: 2, MaxAttempts: 3},
			}, nil
		}

		xAdapter := &mockAdapter{}
		registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{"x": xAdapter})

		w := &RetryWorker{store: ms, registry: registry, logger: logger}
		err := w.processRetries(context.Background())
		require.NoError(t, err)

		assert.Equal(t, 1, xAdapter.publishCallCount)

		// Check the platform post was marked published
		var publishCall *updatePlatformPostStatusCall
		for _, c := range ms.updatePlatformPostStatusCalls {
			if c.Status == store.PlatformPostStatusPublished {
				publishCall = &c
				break
			}
		}
		require.NotNil(t, publishCall)
		assert.Equal(t, ppIDX, publishCall.ID)
		assert.Equal(t, 2, *publishCall.AttemptCount)
	})

	t.Run("retryable post fails again and schedules next retry", func(t *testing.T) {
		t.Parallel()

		ms := &mockRetryStore{
			getRetryablePlatformPosts: func(_ context.Context, _ time.Time, _ int) ([]store.RetryablePlatformPost, error) {
				return []store.RetryablePlatformPost{
					{
						PlatformPost: store.PlatformPost{
							ID: ppIDX, PostID: postID, Platform: "x",
							Status: "failed", AttemptCount: 1, MaxAttempts: 3,
						},
						AccountID: accountID,
					},
				}, nil
			},
		}
		ms.getPostByID = func(_ context.Context, aID, pID uuid.UUID) (store.Post, error) {
			return store.Post{ID: pID, AccountID: aID, Content: "hello"}, nil
		}
		ms.listPlatformConnectionsByAccount = func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
			return []store.PlatformConnection{{Platform: "x", AccessToken: "tok"}}, nil
		}
		ms.getPlatformPostsByPostID = func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
			return []store.PlatformPost{
				{ID: ppIDX, PostID: postID, Platform: "x", Status: store.PlatformPostStatusFailed, AttemptCount: 2, MaxAttempts: 3,
					NextRetryAt: func() *time.Time { t := time.Now().Add(5 * time.Minute); return &t }()},
			}, nil
		}

		failAdapter := &mockAdapter{
			publishFn: func(_ context.Context, _ string, _ []string, _ store.PlatformConnection) (adapters.PlatformPostResult, error) {
				return adapters.PlatformPostResult{}, errors.New("still failing")
			},
		}
		registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{"x": failAdapter})

		w := &RetryWorker{store: ms, registry: registry, logger: logger}
		err := w.processRetries(context.Background())
		require.NoError(t, err)

		// Should have scheduled next retry
		var failCall *updatePlatformPostStatusCall
		for _, c := range ms.updatePlatformPostStatusCalls {
			if c.Status == store.PlatformPostStatusFailed {
				failCall = &c
				break
			}
		}
		require.NotNil(t, failCall)
		assert.Equal(t, 2, *failCall.AttemptCount)
		assert.NotNil(t, failCall.NextRetryAt, "should schedule another retry since attempt 2 < max 3")
	})

	t.Run("retryable post at max attempts becomes permanent failure", func(t *testing.T) {
		t.Parallel()

		ms := &mockRetryStore{
			getRetryablePlatformPosts: func(_ context.Context, _ time.Time, _ int) ([]store.RetryablePlatformPost, error) {
				return []store.RetryablePlatformPost{
					{
						PlatformPost: store.PlatformPost{
							ID: ppIDX, PostID: postID, Platform: "x",
							Status: "failed", AttemptCount: 2, MaxAttempts: 3,
						},
						AccountID: accountID,
					},
				}, nil
			},
		}
		ms.getPostByID = func(_ context.Context, aID, pID uuid.UUID) (store.Post, error) {
			return store.Post{ID: pID, AccountID: aID, Content: "hello"}, nil
		}
		ms.listPlatformConnectionsByAccount = func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
			return []store.PlatformConnection{{Platform: "x", AccessToken: "tok"}}, nil
		}
		ms.getPlatformPostsByPostID = func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
			return []store.PlatformPost{
				{ID: ppIDX, PostID: postID, Platform: "x", Status: store.PlatformPostStatusFailed, AttemptCount: 3, MaxAttempts: 3},
			}, nil
		}

		failAdapter := &mockAdapter{
			publishFn: func(_ context.Context, _ string, _ []string, _ store.PlatformConnection) (adapters.PlatformPostResult, error) {
				return adapters.PlatformPostResult{}, errors.New("permanent failure")
			},
		}
		registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{"x": failAdapter})

		w := &RetryWorker{store: ms, registry: registry, logger: logger}
		err := w.processRetries(context.Background())
		require.NoError(t, err)

		var failCall *updatePlatformPostStatusCall
		for _, c := range ms.updatePlatformPostStatusCalls {
			if c.Status == store.PlatformPostStatusFailed {
				failCall = &c
				break
			}
		}
		require.NotNil(t, failCall)
		assert.Equal(t, 3, *failCall.AttemptCount)
		assert.Nil(t, failCall.NextRetryAt, "should NOT schedule retry at max attempts")

		// Post status should be failed
		require.Len(t, ms.updatePostStatusCalls, 1)
		assert.Equal(t, store.PostStatusFailed, ms.updatePostStatusCalls[0].Status)
	})

	t.Run("get retryable posts error propagates", func(t *testing.T) {
		t.Parallel()

		ms := &mockRetryStore{
			getRetryablePlatformPosts: func(_ context.Context, _ time.Time, _ int) ([]store.RetryablePlatformPost, error) {
				return nil, errors.New("db down")
			},
		}

		w := &RetryWorker{store: ms, logger: logger}
		err := w.processRetries(context.Background())
		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get retryable posts")
	})

	t.Run("get post error skips post group without stopping", func(t *testing.T) {
		t.Parallel()

		ppID1 := uuid.New()
		ppID2 := uuid.New()
		postID2 := uuid.New()
		accountID2 := uuid.New()

		ms := &mockRetryStore{
			getRetryablePlatformPosts: func(_ context.Context, _ time.Time, _ int) ([]store.RetryablePlatformPost, error) {
				return []store.RetryablePlatformPost{
					{PlatformPost: store.PlatformPost{ID: ppID1, PostID: postID, Platform: "x", Status: "failed", AttemptCount: 1, MaxAttempts: 3}, AccountID: accountID},
					{PlatformPost: store.PlatformPost{ID: ppID2, PostID: postID2, Platform: "x", Status: "failed", AttemptCount: 1, MaxAttempts: 3}, AccountID: accountID2},
				}, nil
			},
		}
		ms.getPostByID = func(_ context.Context, aID, pID uuid.UUID) (store.Post, error) {
			if aID == accountID {
				return store.Post{}, errors.New("db error for this post")
			}
			return store.Post{ID: pID, AccountID: aID, Content: "hello"}, nil
		}
		ms.listPlatformConnectionsByAccount = func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
			return []store.PlatformConnection{{Platform: "x", AccessToken: "tok"}}, nil
		}
		ms.getPlatformPostsByPostID = func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
			return []store.PlatformPost{
				{ID: ppID2, PostID: postID2, Platform: "x", Status: store.PlatformPostStatusPublished, AttemptCount: 2, MaxAttempts: 3},
			}, nil
		}

		xAdapter := &mockAdapter{}
		registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{"x": xAdapter})

		w := &RetryWorker{store: ms, registry: registry, logger: logger}
		err := w.processRetries(context.Background())
		require.NoError(t, err)

		// Second post should still have been processed
		assert.Equal(t, 1, xAdapter.publishCallCount)
	})

	t.Run("no connection for platform fails retry", func(t *testing.T) {
		t.Parallel()

		ms := &mockRetryStore{
			getRetryablePlatformPosts: func(_ context.Context, _ time.Time, _ int) ([]store.RetryablePlatformPost, error) {
				return []store.RetryablePlatformPost{
					{
						PlatformPost: store.PlatformPost{ID: ppIDX, PostID: postID, Platform: "x", Status: "failed", AttemptCount: 0, MaxAttempts: 3},
						AccountID:    accountID,
					},
				}, nil
			},
		}
		ms.getPostByID = func(_ context.Context, aID, pID uuid.UUID) (store.Post, error) {
			return store.Post{ID: pID, AccountID: aID, Content: "hello"}, nil
		}
		ms.listPlatformConnectionsByAccount = func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
			return []store.PlatformConnection{}, nil // no connections
		}
		ms.getPlatformPostsByPostID = func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
			return []store.PlatformPost{
				{ID: ppIDX, PostID: postID, Platform: "x", Status: store.PlatformPostStatusFailed, AttemptCount: 1, MaxAttempts: 3,
					NextRetryAt: func() *time.Time { t := time.Now().Add(1 * time.Minute); return &t }()},
			}, nil
		}

		registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{})
		w := &RetryWorker{store: ms, registry: registry, logger: logger}

		err := w.processRetries(context.Background())
		require.NoError(t, err)

		require.Len(t, ms.updatePlatformPostStatusCalls, 1)
		assert.Equal(t, store.PlatformPostStatusFailed, ms.updatePlatformPostStatusCalls[0].Status)
		assert.Contains(t, *ms.updatePlatformPostStatusCalls[0].ErrMessage, "no platform connection")
	})

	t.Run("multiple platform posts for same post grouped correctly", func(t *testing.T) {
		t.Parallel()

		ppID1 := uuid.New()
		ppID2 := uuid.New()

		ms := &mockRetryStore{
			getRetryablePlatformPosts: func(_ context.Context, _ time.Time, _ int) ([]store.RetryablePlatformPost, error) {
				return []store.RetryablePlatformPost{
					{PlatformPost: store.PlatformPost{ID: ppID1, PostID: postID, Platform: "x", Status: "failed", AttemptCount: 1, MaxAttempts: 3}, AccountID: accountID},
					{PlatformPost: store.PlatformPost{ID: ppID2, PostID: postID, Platform: "linkedin", Status: "failed", AttemptCount: 1, MaxAttempts: 3}, AccountID: accountID},
				}, nil
			},
		}
		ms.getPostByID = func(_ context.Context, aID, pID uuid.UUID) (store.Post, error) {
			return store.Post{ID: pID, AccountID: aID, Content: "hello"}, nil
		}
		ms.listPlatformConnectionsByAccount = func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
			return []store.PlatformConnection{
				{Platform: "x", AccessToken: "tok"},
				{Platform: "linkedin", AccessToken: "tok"},
			}, nil
		}
		ms.getPlatformPostsByPostID = func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
			return []store.PlatformPost{
				{ID: ppID1, PostID: postID, Platform: "x", Status: store.PlatformPostStatusPublished, AttemptCount: 2, MaxAttempts: 3},
				{ID: ppID2, PostID: postID, Platform: "linkedin", Status: store.PlatformPostStatusPublished, AttemptCount: 2, MaxAttempts: 3},
			}, nil
		}

		xAdapter := &mockAdapter{}
		liAdapter := &mockAdapter{}
		registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{
			"x":        xAdapter,
			"linkedin": liAdapter,
		})

		w := &RetryWorker{store: ms, registry: registry, logger: logger}
		err := w.processRetries(context.Background())
		require.NoError(t, err)

		assert.Equal(t, 1, xAdapter.publishCallCount)
		assert.Equal(t, 1, liAdapter.publishCallCount)

		// Post should be resolved to published
		require.Len(t, ms.updatePostStatusCalls, 1)
		assert.Equal(t, store.PostStatusPublished, ms.updatePostStatusCalls[0].Status)
	})
}

func TestRetryWorker_RecoverStuckPublishing(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	accountID := uuid.New()
	postID := uuid.New()
	ppIDX := uuid.New()

	t.Run("no stuck posts is no-op", func(t *testing.T) {
		t.Parallel()

		ms := &mockRetryStore{
			getStuckPublishingPlatformPosts: func(_ context.Context, _ time.Time, _ int) ([]store.RetryablePlatformPost, error) {
				return nil, nil
			},
		}

		w := &RetryWorker{store: ms, logger: logger, stuckThreshold: 5 * time.Minute}
		err := w.recoverStuckPublishing(context.Background())
		require.NoError(t, err)
	})

	t.Run("stuck post reset to failed with retry scheduled", func(t *testing.T) {
		t.Parallel()

		ms := &mockRetryStore{
			getStuckPublishingPlatformPosts: func(_ context.Context, _ time.Time, _ int) ([]store.RetryablePlatformPost, error) {
				return []store.RetryablePlatformPost{
					{
						PlatformPost: store.PlatformPost{
							ID: ppIDX, PostID: postID, Platform: "x",
							Status: "publishing", AttemptCount: 0, MaxAttempts: 3,
						},
						AccountID: accountID,
					},
				}, nil
			},
		}
		ms.getPlatformPostsByPostID = func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
			return []store.PlatformPost{
				{ID: ppIDX, PostID: postID, Platform: "x", Status: store.PlatformPostStatusFailed, AttemptCount: 1, MaxAttempts: 3,
					NextRetryAt: func() *time.Time { t := time.Now().Add(1 * time.Minute); return &t }()},
			}, nil
		}

		w := &RetryWorker{store: ms, logger: logger, stuckThreshold: 5 * time.Minute}
		err := w.recoverStuckPublishing(context.Background())
		require.NoError(t, err)

		require.Len(t, ms.updatePlatformPostStatusCalls, 1)
		call := ms.updatePlatformPostStatusCalls[0]
		assert.Equal(t, store.PlatformPostStatusFailed, call.Status)
		assert.Equal(t, 1, *call.AttemptCount)
		assert.NotNil(t, call.NextRetryAt, "should schedule retry since attempt 1 < max 3")
		assert.Contains(t, *call.ErrMessage, "stuck in publishing state")
	})

	t.Run("stuck post at max attempts becomes permanent failure", func(t *testing.T) {
		t.Parallel()

		ms := &mockRetryStore{
			getStuckPublishingPlatformPosts: func(_ context.Context, _ time.Time, _ int) ([]store.RetryablePlatformPost, error) {
				return []store.RetryablePlatformPost{
					{
						PlatformPost: store.PlatformPost{
							ID: ppIDX, PostID: postID, Platform: "x",
							Status: "publishing", AttemptCount: 2, MaxAttempts: 3,
						},
						AccountID: accountID,
					},
				}, nil
			},
		}
		ms.getPlatformPostsByPostID = func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
			return []store.PlatformPost{
				{ID: ppIDX, PostID: postID, Platform: "x", Status: store.PlatformPostStatusFailed, AttemptCount: 3, MaxAttempts: 3},
			}, nil
		}

		w := &RetryWorker{store: ms, logger: logger, stuckThreshold: 5 * time.Minute}
		err := w.recoverStuckPublishing(context.Background())
		require.NoError(t, err)

		require.Len(t, ms.updatePlatformPostStatusCalls, 1)
		call := ms.updatePlatformPostStatusCalls[0]
		assert.Equal(t, store.PlatformPostStatusFailed, call.Status)
		assert.Equal(t, 3, *call.AttemptCount)
		assert.Nil(t, call.NextRetryAt, "should NOT schedule retry at max attempts")

		// Parent post status should be resolved
		require.Len(t, ms.updatePostStatusCalls, 1)
		assert.Equal(t, store.PostStatusFailed, ms.updatePostStatusCalls[0].Status)
	})

	t.Run("get stuck posts error propagates", func(t *testing.T) {
		t.Parallel()

		ms := &mockRetryStore{
			getStuckPublishingPlatformPosts: func(_ context.Context, _ time.Time, _ int) ([]store.RetryablePlatformPost, error) {
				return nil, errors.New("db down")
			},
		}

		w := &RetryWorker{store: ms, logger: logger, stuckThreshold: 5 * time.Minute}
		err := w.recoverStuckPublishing(context.Background())
		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get stuck publishing posts")
	})

	t.Run("multiple stuck posts from same parent post deduplicated for status resolution", func(t *testing.T) {
		t.Parallel()

		ppID1 := uuid.New()
		ppID2 := uuid.New()

		ms := &mockRetryStore{
			getStuckPublishingPlatformPosts: func(_ context.Context, _ time.Time, _ int) ([]store.RetryablePlatformPost, error) {
				return []store.RetryablePlatformPost{
					{PlatformPost: store.PlatformPost{ID: ppID1, PostID: postID, Platform: "x", Status: "publishing", AttemptCount: 0, MaxAttempts: 3}, AccountID: accountID},
					{PlatformPost: store.PlatformPost{ID: ppID2, PostID: postID, Platform: "linkedin", Status: "publishing", AttemptCount: 0, MaxAttempts: 3}, AccountID: accountID},
				}, nil
			},
		}
		ms.getPlatformPostsByPostID = func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
			return []store.PlatformPost{
				{ID: ppID1, PostID: postID, Platform: "x", Status: store.PlatformPostStatusFailed, AttemptCount: 1, MaxAttempts: 3,
					NextRetryAt: func() *time.Time { t := time.Now().Add(1 * time.Minute); return &t }()},
				{ID: ppID2, PostID: postID, Platform: "linkedin", Status: store.PlatformPostStatusFailed, AttemptCount: 1, MaxAttempts: 3,
					NextRetryAt: func() *time.Time { t := time.Now().Add(1 * time.Minute); return &t }()},
			}, nil
		}

		w := &RetryWorker{store: ms, logger: logger, stuckThreshold: 5 * time.Minute}
		err := w.recoverStuckPublishing(context.Background())
		require.NoError(t, err)

		// Two platform post updates
		assert.Len(t, ms.updatePlatformPostStatusCalls, 2)

		// But only one parent post status update (deduplicated)
		require.Len(t, ms.updatePostStatusCalls, 1)
		assert.Equal(t, store.PostStatusPublishing, ms.updatePostStatusCalls[0].Status) // retryable
	})
}

func TestRetryWorker_ResolvePostStatus(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	accountID := uuid.New()
	postID := uuid.New()

	t.Run("all published resolves to published", func(t *testing.T) {
		t.Parallel()

		ms := &mockRetryStore{}
		ms.getPlatformPostsByPostID = func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
			return []store.PlatformPost{
				{ID: uuid.New(), Status: store.PlatformPostStatusPublished, AttemptCount: 1, MaxAttempts: 3},
				{ID: uuid.New(), Status: store.PlatformPostStatusPublished, AttemptCount: 2, MaxAttempts: 3},
			}, nil
		}

		w := &RetryWorker{store: ms, logger: logger}
		w.resolvePostStatus(context.Background(), accountID, postID)

		require.Len(t, ms.updatePostStatusCalls, 1)
		assert.Equal(t, store.PostStatusPublished, ms.updatePostStatusCalls[0].Status)
		assert.NotNil(t, ms.updatePostStatusCalls[0].PublishedAt)
	})

	t.Run("some published some permanently failed resolves to partially_published", func(t *testing.T) {
		t.Parallel()

		ms := &mockRetryStore{}
		ms.getPlatformPostsByPostID = func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
			return []store.PlatformPost{
				{ID: uuid.New(), Status: store.PlatformPostStatusPublished, AttemptCount: 1, MaxAttempts: 3},
				{ID: uuid.New(), Status: store.PlatformPostStatusFailed, AttemptCount: 3, MaxAttempts: 3}, // permanent
			}, nil
		}

		w := &RetryWorker{store: ms, logger: logger}
		w.resolvePostStatus(context.Background(), accountID, postID)

		require.Len(t, ms.updatePostStatusCalls, 1)
		assert.Equal(t, store.PostStatusPartiallyPublished, ms.updatePostStatusCalls[0].Status)
		assert.NotNil(t, ms.updatePostStatusCalls[0].PublishedAt)
	})

	t.Run("some retryable resolves to publishing", func(t *testing.T) {
		t.Parallel()

		retryAt := time.Now().Add(5 * time.Minute)
		ms := &mockRetryStore{}
		ms.getPlatformPostsByPostID = func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
			return []store.PlatformPost{
				{ID: uuid.New(), Status: store.PlatformPostStatusPublished, AttemptCount: 1, MaxAttempts: 3},
				{ID: uuid.New(), Status: store.PlatformPostStatusFailed, AttemptCount: 1, MaxAttempts: 3, NextRetryAt: &retryAt},
			}, nil
		}

		w := &RetryWorker{store: ms, logger: logger}
		w.resolvePostStatus(context.Background(), accountID, postID)

		require.Len(t, ms.updatePostStatusCalls, 1)
		assert.Equal(t, store.PostStatusPublishing, ms.updatePostStatusCalls[0].Status)
	})

	t.Run("pending platform posts treated as retryable", func(t *testing.T) {
		t.Parallel()

		ms := &mockRetryStore{}
		ms.getPlatformPostsByPostID = func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
			return []store.PlatformPost{
				{ID: uuid.New(), Status: store.PlatformPostStatusPending, AttemptCount: 0, MaxAttempts: 3},
			}, nil
		}

		w := &RetryWorker{store: ms, logger: logger}
		w.resolvePostStatus(context.Background(), accountID, postID)

		require.Len(t, ms.updatePostStatusCalls, 1)
		assert.Equal(t, store.PostStatusPublishing, ms.updatePostStatusCalls[0].Status)
	})

	t.Run("get platform posts error does not update status", func(t *testing.T) {
		t.Parallel()

		ms := &mockRetryStore{}
		ms.getPlatformPostsByPostID = func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
			return nil, errors.New("db error")
		}

		w := &RetryWorker{store: ms, logger: logger}
		w.resolvePostStatus(context.Background(), accountID, postID)

		assert.Len(t, ms.updatePostStatusCalls, 0)
	})
}

func TestRetryWorker_Name(t *testing.T) {
	t.Parallel()
	w := &RetryWorker{}
	assert.Equal(t, "retry-worker", w.Name())
}
