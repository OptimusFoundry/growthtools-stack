package workers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"base-server/internal/infra/clients/kafka"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/platform/adapters"

	"github.com/google/uuid"
)

// PublishEvent represents a post.publish Kafka event
type PublishEvent struct {
	PostID    uuid.UUID `json:"post_id"`
	AccountID uuid.UUID `json:"account_id"`
	Platforms []string  `json:"platforms"`
}

// TokenRefresher ensures platform connection tokens are fresh before use.
type TokenRefresher interface {
	EnsureFreshConnection(ctx context.Context, conn store.PlatformConnection) (store.PlatformConnection, error)
}

// PublishStore defines store operations needed by the publish worker
type PublishStore interface {
	GetPostByID(ctx context.Context, accountID, id uuid.UUID) (store.Post, error)
	GetPlatformPostsByPostID(ctx context.Context, postID uuid.UUID) ([]store.PlatformPost, error)
	GetPlatformConnectionByAccountAndPlatform(ctx context.Context, accountID uuid.UUID, platform, platformUserID string) (store.PlatformConnection, error)
	ListPlatformConnectionsByAccount(ctx context.Context, accountID uuid.UUID) ([]store.PlatformConnection, error)
	UpdatePostStatus(ctx context.Context, accountID, id uuid.UUID, status string, publishedAt *time.Time) error
	UpdatePlatformPostStatus(ctx context.Context, id uuid.UUID, status string, platformPostID *string, publishedAt any, errMessage *string, attemptCount *int, nextRetryAt *time.Time, lastAttemptAt *time.Time) error
	ClaimPlatformPostForPublishing(ctx context.Context, id uuid.UUID) (bool, error)
	GetMediaByIDs(ctx context.Context, ids []uuid.UUID) ([]store.Media, error)
}

// PublishWorker consumes post.publish events and dispatches to platform adapters
type PublishWorker struct {
	consumer       *kafka.Consumer
	store          PublishStore
	registry       *adapters.AdapterRegistry
	tokenRefresher TokenRefresher
	urlSigner      URLSigner
	logger         *observability.Logger
}

// NewPublishWorker creates a new publish worker
func NewPublishWorker(brokers, groupID string, publishStore PublishStore, registry *adapters.AdapterRegistry, tokenRefresher TokenRefresher, logger *observability.Logger) *PublishWorker {
	w := &PublishWorker{
		store:          publishStore,
		registry:       registry,
		tokenRefresher: tokenRefresher,
		logger:         logger,
	}

	w.consumer = kafka.NewConsumer(brokers, groupID, "post.publish", w.handle, logger)
	return w
}

// SetURLSigner wires the presigner used to turn s3:// media URLs into
// HTTPS URLs the adapters can fetch. Nil leaves URLs untouched (local
// storage mode).
func (w *PublishWorker) SetURLSigner(signer URLSigner) {
	w.urlSigner = signer
}

// platformResult tracks the outcome of a single platform publish attempt
type platformResult int

const (
	resultPublished    platformResult = iota
	resultRetryable                   // failed but will retry
	resultPermanentFail               // failed, no more retries
)

func (w *PublishWorker) handle(ctx context.Context, key, value []byte) error {
	var event PublishEvent
	if err := json.Unmarshal(value, &event); err != nil {
		return fmt.Errorf("failed to unmarshal publish event: %w", err)
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "post_id", Value: event.PostID.String()},
		observability.Field{Key: "account_id", Value: event.AccountID.String()},
	)

	w.logger.Info(ctx, fmt.Sprintf("processing publish event for post %s", event.PostID))

	// Get the post
	post, err := w.store.GetPostByID(ctx, event.AccountID, event.PostID)
	if err != nil {
		return fmt.Errorf("failed to get post: %w", err)
	}

	// Get platform posts for this post
	platformPosts, err := w.store.GetPlatformPostsByPostID(ctx, post.ID)
	if err != nil {
		return fmt.Errorf("failed to get platform posts: %w", err)
	}

	// Get all platform connections for the account (build map by platform)
	connections, err := w.store.ListPlatformConnectionsByAccount(ctx, event.AccountID)
	if err != nil {
		return fmt.Errorf("failed to list platform connections: %w", err)
	}
	connByPlatform := make(map[string]store.PlatformConnection)
	for _, c := range connections {
		connByPlatform[c.Platform] = c
	}

	// Resolve media URLs from post.MediaIDs. S3 URLs are presigned so
	// platform adapters (which either http.Get the URL themselves or pass
	// it to the remote platform as an image_url) receive a fetchable
	// HTTPS endpoint instead of a raw s3:// URI.
	var mediaURLs []string
	if len(post.MediaIDs) > 0 {
		mediaItems, err := w.store.GetMediaByIDs(ctx, []uuid.UUID(post.MediaIDs))
		if err != nil {
			w.logger.Error(ctx, "failed to resolve media URLs", err)
		} else {
			mediaURLs, err = mediaURLsForPublish(ctx, w.urlSigner, mediaItems)
			if err != nil {
				w.logger.Error(ctx, "failed to presign media URLs for publish", err)
				mediaURLs = nil
			}
		}
	}

	// Dispatch to each platform independently
	results := make(map[uuid.UUID]platformResult)
	for _, pp := range platformPosts {
		// Skip rows that are already finalized or in-flight on another worker.
		// 'publishing' covers the redelivery race where a previous handler
		// claimed the row, called the platform API, and is mid-flight.
		if pp.Status == store.PlatformPostStatusPublished || pp.Status == store.PlatformPostStatusPublishing {
			results[pp.ID] = resultPublished
			continue
		}

		// Atomic claim: only one caller wins the pending/failed → publishing
		// transition. Loser sees claimed=false and skips, which prevents
		// double-publishing on Kafka redelivery after a broker restart.
		claimed, err := w.store.ClaimPlatformPostForPublishing(ctx, pp.ID)
		if err != nil {
			w.logger.Error(ctx, fmt.Sprintf("failed to claim platform post %s", pp.ID), err)
			results[pp.ID] = resultRetryable
			continue
		}
		if !claimed {
			w.logger.Info(ctx, fmt.Sprintf("platform post %s already claimed, skipping", pp.ID))
			results[pp.ID] = resultPublished
			continue
		}

		result := w.publishToPlatform(ctx, pp, connByPlatform, post.Content, mediaURLs)
		results[pp.ID] = result
	}

	// Resolve parent post status
	postStatus := resolvePostStatus(results)
	var publishedAt *time.Time
	if postStatus == store.PostStatusPublished || postStatus == store.PostStatusPartiallyPublished {
		now := time.Now()
		publishedAt = &now
	}
	if err := w.store.UpdatePostStatus(ctx, event.AccountID, post.ID, postStatus, publishedAt); err != nil {
		w.logger.Error(ctx, "failed to update post status", err)
	}

	return nil
}

func (w *PublishWorker) publishToPlatform(ctx context.Context, pp store.PlatformPost, connByPlatform map[string]store.PlatformConnection, postContent string, mediaURLs []string) platformResult {
	now := time.Now()
	attemptCount := pp.AttemptCount + 1

	conn, ok := connByPlatform[pp.Platform]
	if !ok {
		errMsg := "no platform connection found"
		w.markFailed(ctx, pp.ID, attemptCount, pp.MaxAttempts, &errMsg, &now)
		if attemptCount >= pp.MaxAttempts {
			return resultPermanentFail
		}
		return resultRetryable
	}

	// Ensure tokens are fresh before publishing
	if w.tokenRefresher != nil {
		refreshed, refreshErr := w.tokenRefresher.EnsureFreshConnection(ctx, conn)
		if refreshErr != nil {
			errMsg := fmt.Sprintf("token refresh failed: %v", refreshErr)
			w.markFailed(ctx, pp.ID, attemptCount, pp.MaxAttempts, &errMsg, &now)
			w.logger.Error(ctx, fmt.Sprintf("failed to refresh token for %s", pp.Platform), refreshErr)
			if attemptCount >= pp.MaxAttempts {
				return resultPermanentFail
			}
			return resultRetryable
		}
		conn = refreshed
	}

	adapter, err := w.registry.Get(pp.Platform)
	if err != nil {
		errMsg := fmt.Sprintf("adapter not found: %s", pp.Platform)
		// Adapter not found is a permanent failure
		w.store.UpdatePlatformPostStatus(ctx, pp.ID, store.PlatformPostStatusFailed, nil, nil, &errMsg, &attemptCount, nil, &now)
		return resultPermanentFail
	}

	// Check if this is a threaded post with segments
	if pp.ThreadSegments != nil {
		var segments []adapters.ThreadSegment
		if err := json.Unmarshal(*pp.ThreadSegments, &segments); err == nil && len(segments) > 0 {
			result, err := adapter.PublishThread(ctx, segments, mediaURLs, conn)
			if err != nil {
				errMsg := err.Error()
				w.markFailed(ctx, pp.ID, attemptCount, pp.MaxAttempts, &errMsg, &now)
				w.logger.Error(ctx, fmt.Sprintf("failed to publish thread to %s", pp.Platform), err)
				if attemptCount >= pp.MaxAttempts {
					return resultPermanentFail
				}
				return resultRetryable
			}

			w.store.UpdatePlatformPostStatus(ctx, pp.ID, store.PlatformPostStatusPublished, &result.PlatformPostID, &now, nil, &attemptCount, nil, &now)
			w.logger.Info(ctx, fmt.Sprintf("published thread to %s: %s", pp.Platform, result.URL))
			return resultPublished
		}
	}

	// Use platform-specific content if available, otherwise use post content
	content := postContent
	if pp.Content != nil && *pp.Content != "" {
		content = *pp.Content
	}

	result, err := adapter.Publish(ctx, content, mediaURLs, conn)
	if err != nil {
		errMsg := err.Error()
		w.markFailed(ctx, pp.ID, attemptCount, pp.MaxAttempts, &errMsg, &now)
		w.logger.Error(ctx, fmt.Sprintf("failed to publish to %s", pp.Platform), err)
		if attemptCount >= pp.MaxAttempts {
			return resultPermanentFail
		}
		return resultRetryable
	}

	w.store.UpdatePlatformPostStatus(ctx, pp.ID, store.PlatformPostStatusPublished, &result.PlatformPostID, &now, nil, &attemptCount, nil, &now)
	w.logger.Info(ctx, fmt.Sprintf("published to %s: %s", pp.Platform, result.URL))
	return resultPublished
}

// markFailed sets a platform post to failed with appropriate retry scheduling
func (w *PublishWorker) markFailed(ctx context.Context, id uuid.UUID, attemptCount, maxAttempts int, errMsg *string, now *time.Time) {
	var nextRetry *time.Time
	if attemptCount < maxAttempts {
		t := computeNextRetryAt(attemptCount)
		nextRetry = &t
	}
	w.store.UpdatePlatformPostStatus(ctx, id, store.PlatformPostStatusFailed, nil, nil, errMsg, &attemptCount, nextRetry, now)
}

// computeNextRetryAt returns the next retry time using exponential backoff
func computeNextRetryAt(attemptCount int) time.Time {
	delays := []time.Duration{1 * time.Minute, 5 * time.Minute, 15 * time.Minute}
	idx := attemptCount - 1
	if idx < 0 {
		idx = 0
	}
	if idx >= len(delays) {
		idx = len(delays) - 1
	}
	return time.Now().Add(delays[idx])
}

// resolvePostStatus determines the parent post status from platform results
func resolvePostStatus(results map[uuid.UUID]platformResult) string {
	if len(results) == 0 {
		return store.PostStatusFailed
	}

	allPublished := true
	anyRetryable := false
	anyPublished := false

	for _, r := range results {
		switch r {
		case resultPublished:
			anyPublished = true
		case resultRetryable:
			allPublished = false
			anyRetryable = true
		case resultPermanentFail:
			allPublished = false
		}
	}

	if allPublished {
		return store.PostStatusPublished
	}
	if anyRetryable {
		return store.PostStatusPublishing
	}
	if anyPublished {
		return store.PostStatusPartiallyPublished
	}
	return store.PostStatusFailed
}

func (w *PublishWorker) Start(ctx context.Context) error {
	return w.consumer.Start(ctx)
}

func (w *PublishWorker) Name() string {
	return "publish-worker"
}
