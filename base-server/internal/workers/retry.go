package workers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/platform/adapters"

	"github.com/google/uuid"
)

// RetryStore defines store operations needed by the retry worker
type RetryStore interface {
	GetRetryablePlatformPosts(ctx context.Context, now time.Time, limit int) ([]store.RetryablePlatformPost, error)
	GetStuckPublishingPlatformPosts(ctx context.Context, stuckBefore time.Time, limit int) ([]store.RetryablePlatformPost, error)
	GetPostByID(ctx context.Context, accountID, id uuid.UUID) (store.Post, error)
	GetPlatformPostsByPostID(ctx context.Context, postID uuid.UUID) ([]store.PlatformPost, error)
	ListPlatformConnectionsByAccount(ctx context.Context, accountID uuid.UUID) ([]store.PlatformConnection, error)
	UpdatePlatformPostStatus(ctx context.Context, id uuid.UUID, status string, platformPostID *string, publishedAt any, errMessage *string, attemptCount *int, nextRetryAt *time.Time, lastAttemptAt *time.Time) error
	UpdatePostStatus(ctx context.Context, accountID, id uuid.UUID, status string, publishedAt *time.Time) error
	GetMediaByIDs(ctx context.Context, ids []uuid.UUID) ([]store.Media, error)
}

// RetryWorker polls for failed/stuck platform posts and retries publishing
type RetryWorker struct {
	store          RetryStore
	registry       *adapters.AdapterRegistry
	tokenRefresher TokenRefresher
	logger         *observability.Logger
	interval       time.Duration
	stuckThreshold time.Duration
}

// NewRetryWorker creates a new retry worker
func NewRetryWorker(retryStore RetryStore, registry *adapters.AdapterRegistry, tokenRefresher TokenRefresher, logger *observability.Logger) *RetryWorker {
	return &RetryWorker{
		store:          retryStore,
		registry:       registry,
		tokenRefresher: tokenRefresher,
		logger:         logger,
		interval:       30 * time.Second,
		stuckThreshold: 5 * time.Minute,
	}
}

func (w *RetryWorker) Start(ctx context.Context) error {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			if err := w.processRetries(ctx); err != nil {
				w.logger.Error(ctx, "failed to process retries", err)
			}
			if err := w.recoverStuckPublishing(ctx); err != nil {
				w.logger.Error(ctx, "failed to recover stuck publishing", err)
			}
		}
	}
}

func (w *RetryWorker) processRetries(ctx context.Context) error {
	now := time.Now()
	retryable, err := w.store.GetRetryablePlatformPosts(ctx, now, 50)
	if err != nil {
		return fmt.Errorf("failed to get retryable posts: %w", err)
	}

	if len(retryable) == 0 {
		return nil
	}

	w.logger.Info(ctx, fmt.Sprintf("found %d platform posts to retry", len(retryable)))

	// Group by post_id to batch connection lookups
	byPost := make(map[uuid.UUID][]store.RetryablePlatformPost)
	for _, rp := range retryable {
		byPost[rp.PostID] = append(byPost[rp.PostID], rp)
	}

	for postID, platformPosts := range byPost {
		accountID := platformPosts[0].AccountID

		ctx := observability.WithFields(ctx,
			observability.Field{Key: "post_id", Value: postID.String()},
			observability.Field{Key: "account_id", Value: accountID.String()},
		)

		post, err := w.store.GetPostByID(ctx, accountID, postID)
		if err != nil {
			w.logger.Error(ctx, "failed to get post for retry", err)
			continue
		}

		connections, err := w.store.ListPlatformConnectionsByAccount(ctx, accountID)
		if err != nil {
			w.logger.Error(ctx, "failed to list connections for retry", err)
			continue
		}
		connByPlatform := make(map[string]store.PlatformConnection)
		for _, c := range connections {
			connByPlatform[c.Platform] = c
		}

		// Resolve media URLs
		var mediaURLs []string
		if len(post.MediaIDs) > 0 {
			mediaItems, err := w.store.GetMediaByIDs(ctx, []uuid.UUID(post.MediaIDs))
			if err != nil {
				w.logger.Error(ctx, "failed to resolve media URLs for retry", err)
			} else {
				for _, m := range mediaItems {
					mediaURLs = append(mediaURLs, m.S3URL)
				}
			}
		}

		for _, rp := range platformPosts {
			w.retryPlatformPost(ctx, rp.PlatformPost, connByPlatform, post.Content, mediaURLs)
		}

		// Recalculate parent post status
		w.resolvePostStatus(ctx, accountID, postID)
	}

	return nil
}

func (w *RetryWorker) retryPlatformPost(ctx context.Context, pp store.PlatformPost, connByPlatform map[string]store.PlatformConnection, postContent string, mediaURLs []string) {
	now := time.Now()
	attemptCount := pp.AttemptCount + 1

	conn, ok := connByPlatform[pp.Platform]
	if !ok {
		errMsg := "no platform connection found"
		w.markFailed(ctx, pp.ID, attemptCount, pp.MaxAttempts, &errMsg, &now)
		return
	}

	if w.tokenRefresher != nil {
		refreshed, refreshErr := w.tokenRefresher.EnsureFreshConnection(ctx, conn)
		if refreshErr != nil {
			errMsg := fmt.Sprintf("token refresh failed: %v", refreshErr)
			w.markFailed(ctx, pp.ID, attemptCount, pp.MaxAttempts, &errMsg, &now)
			w.logger.Error(ctx, fmt.Sprintf("retry: failed to refresh token for %s", pp.Platform), refreshErr)
			return
		}
		conn = refreshed
	}

	adapter, err := w.registry.Get(pp.Platform)
	if err != nil {
		errMsg := fmt.Sprintf("adapter not found: %s", pp.Platform)
		w.store.UpdatePlatformPostStatus(ctx, pp.ID, store.PlatformPostStatusFailed, nil, nil, &errMsg, &attemptCount, nil, &now)
		return
	}

	// Check if this is a threaded post with segments
	if pp.ThreadSegments != nil {
		var segments []adapters.ThreadSegment
		if err := json.Unmarshal(*pp.ThreadSegments, &segments); err == nil && len(segments) > 0 {
			result, err := adapter.PublishThread(ctx, segments, mediaURLs, conn)
			if err != nil {
				errMsg := err.Error()
				w.markFailed(ctx, pp.ID, attemptCount, pp.MaxAttempts, &errMsg, &now)
				w.logger.Error(ctx, fmt.Sprintf("retry: failed to publish thread to %s (attempt %d/%d)", pp.Platform, attemptCount, pp.MaxAttempts), err)
				return
			}

			w.store.UpdatePlatformPostStatus(ctx, pp.ID, store.PlatformPostStatusPublished, &result.PlatformPostID, &now, nil, &attemptCount, nil, &now)
			w.logger.Info(ctx, fmt.Sprintf("retry: published thread to %s on attempt %d: %s", pp.Platform, attemptCount, result.URL))
			return
		}
	}

	content := postContent
	if pp.Content != nil && *pp.Content != "" {
		content = *pp.Content
	}

	result, err := adapter.Publish(ctx, content, mediaURLs, conn)
	if err != nil {
		errMsg := err.Error()
		w.markFailed(ctx, pp.ID, attemptCount, pp.MaxAttempts, &errMsg, &now)
		w.logger.Error(ctx, fmt.Sprintf("retry: failed to publish to %s (attempt %d/%d)", pp.Platform, attemptCount, pp.MaxAttempts), err)
		return
	}

	w.store.UpdatePlatformPostStatus(ctx, pp.ID, store.PlatformPostStatusPublished, &result.PlatformPostID, &now, nil, &attemptCount, nil, &now)
	w.logger.Info(ctx, fmt.Sprintf("retry: published to %s on attempt %d: %s", pp.Platform, attemptCount, result.URL))
}

func (w *RetryWorker) markFailed(ctx context.Context, id uuid.UUID, attemptCount, maxAttempts int, errMsg *string, now *time.Time) {
	var nextRetry *time.Time
	if attemptCount < maxAttempts {
		t := computeNextRetryAt(attemptCount)
		nextRetry = &t
	}
	w.store.UpdatePlatformPostStatus(ctx, id, store.PlatformPostStatusFailed, nil, nil, errMsg, &attemptCount, nextRetry, now)
}

func (w *RetryWorker) recoverStuckPublishing(ctx context.Context) error {
	stuckBefore := time.Now().Add(-w.stuckThreshold)
	stuck, err := w.store.GetStuckPublishingPlatformPosts(ctx, stuckBefore, 50)
	if err != nil {
		return fmt.Errorf("failed to get stuck publishing posts: %w", err)
	}

	if len(stuck) == 0 {
		return nil
	}

	w.logger.Info(ctx, fmt.Sprintf("found %d stuck publishing platform posts", len(stuck)))

	affectedPosts := make(map[uuid.UUID]uuid.UUID) // postID -> accountID

	for _, rp := range stuck {
		now := time.Now()
		attemptCount := rp.AttemptCount + 1
		errMsg := "stuck in publishing state, reset for retry"

		var nextRetry *time.Time
		if attemptCount < rp.MaxAttempts {
			t := computeNextRetryAt(attemptCount)
			nextRetry = &t
		}

		w.store.UpdatePlatformPostStatus(ctx, rp.ID, store.PlatformPostStatusFailed, nil, nil, &errMsg, &attemptCount, nextRetry, &now)
		affectedPosts[rp.PostID] = rp.AccountID
	}

	// Recalculate parent post status for affected posts
	for postID, accountID := range affectedPosts {
		w.resolvePostStatus(ctx, accountID, postID)
	}

	return nil
}

// resolvePostStatus re-reads all platform_posts and updates the parent post status
func (w *RetryWorker) resolvePostStatus(ctx context.Context, accountID, postID uuid.UUID) {
	platformPosts, err := w.store.GetPlatformPostsByPostID(ctx, postID)
	if err != nil {
		w.logger.Error(ctx, "failed to get platform posts for status resolution", err)
		return
	}

	results := make(map[uuid.UUID]platformResult)
	for _, pp := range platformPosts {
		switch pp.Status {
		case store.PlatformPostStatusPublished:
			results[pp.ID] = resultPublished
		case store.PlatformPostStatusFailed:
			if pp.AttemptCount < pp.MaxAttempts && pp.NextRetryAt != nil {
				results[pp.ID] = resultRetryable
			} else {
				results[pp.ID] = resultPermanentFail
			}
		default:
			// pending or publishing — treat as retryable (in progress)
			results[pp.ID] = resultRetryable
		}
	}

	postStatus := resolvePostStatus(results)
	var publishedAt *time.Time
	if postStatus == store.PostStatusPublished || postStatus == store.PostStatusPartiallyPublished {
		now := time.Now()
		publishedAt = &now
	}

	if err := w.store.UpdatePostStatus(ctx, accountID, postID, postStatus, publishedAt); err != nil {
		w.logger.Error(ctx, "failed to update post status after resolution", err)
	}
}

func (w *RetryWorker) Name() string {
	return "retry-worker"
}
