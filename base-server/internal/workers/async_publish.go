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

// Topics that wire the async publish pipeline together. post.publish
// stays as the external entry point — web + scheduler continue to
// produce to it — the dispatcher consumes it and fans out.
const (
	TopicPlatformPublishRequested = "platform.publish.requested"
	TopicPlatformPublishReady     = "platform.publish.ready"
)

// EventPublisher produces to the internal async-pipeline topics.
// Matches the shape the Kafka producer already exposes elsewhere in
// the codebase (draft generator, github processor).
type EventPublisher interface {
	Publish(ctx context.Context, topic, key string, payload any) error
}

// asyncEvent is the single shape passed along both internal topics.
// PlatformPostID is the authoritative pointer; each worker reloads
// fresh state from the DB so events are safe to redeliver.
type asyncEvent struct {
	PlatformPostID uuid.UUID `json:"platform_post_id"`
	PostID         uuid.UUID `json:"post_id"`
	AccountID      uuid.UUID `json:"account_id"`
}

// AsyncPublishStore is the combined store surface the async workers
// need. A single interface keeps bootstrap wiring simple (one store
// satisfies all of them) while letting each worker test against a
// narrower mock if needed.
type AsyncPublishStore interface {
	GetPostByID(ctx context.Context, accountID, id uuid.UUID) (store.Post, error)
	GetPlatformPostByID(ctx context.Context, id uuid.UUID) (store.PlatformPost, error)
	GetPlatformPostsByPostID(ctx context.Context, postID uuid.UUID) ([]store.PlatformPost, error)
	GetPlatformConnectionByAccountAndPlatform(ctx context.Context, accountID uuid.UUID, platform, platformUserID string) (store.PlatformConnection, error)
	ListPlatformConnectionsByAccount(ctx context.Context, accountID uuid.UUID) ([]store.PlatformConnection, error)
	GetMediaByIDs(ctx context.Context, ids []uuid.UUID) ([]store.Media, error)
	UpdatePostStatus(ctx context.Context, accountID, id uuid.UUID, status string, publishedAt *time.Time) error
	UpdatePlatformPostStatus(ctx context.Context, id uuid.UUID, status string, platformPostID *string, publishedAt any, errorMessage *string, attemptCount *int, nextRetryAt *time.Time, lastAttemptAt *time.Time) error
	SetPlatformPostQueued(ctx context.Context, id uuid.UUID) error
	SetPlatformPostAwaitingMedia(ctx context.Context, id uuid.UUID, handle json.RawMessage) error
	SetPlatformPostMediaReady(ctx context.Context, id uuid.UUID, handle json.RawMessage) error
	ListPlatformPostsAwaitingMedia(ctx context.Context, limit int) ([]store.RetryablePlatformPost, error)
}

// buildPostSpec assembles the adapters.PostSpec each async method
// consumes. Pulls the post + media + content out of the row state —
// media URLs are presigned here so adapters receive HTTPS endpoints
// they can actually fetch.
func buildPostSpec(
	ctx context.Context,
	s AsyncPublishStore,
	pp store.PlatformPost,
	post store.Post,
	signer URLSigner,
	logger *observability.Logger,
) (adapters.PostSpec, error) {
	spec := adapters.PostSpec{
		Content: post.Content,
	}
	if pp.Content != nil && *pp.Content != "" {
		spec.Content = *pp.Content
	}
	if pp.ThreadSegments != nil && len(*pp.ThreadSegments) > 0 {
		var segs []adapters.ThreadSegment
		if err := json.Unmarshal(*pp.ThreadSegments, &segs); err != nil {
			return spec, fmt.Errorf("unmarshal thread_segments: %w", err)
		}
		spec.Segments = segs
	}

	if len(post.MediaIDs) > 0 {
		items, err := s.GetMediaByIDs(ctx, []uuid.UUID(post.MediaIDs))
		if err != nil {
			logger.Error(ctx, "failed to load media for post spec", err)
		} else {
			spec.MediaURLs = mediaURLsForPublish(ctx, signer, items, logger)
		}
	}
	return spec, nil
}

// lookupConnection resolves the platform connection for a given
// platform_post. Uses ListPlatformConnectionsByAccount because the
// platform_post row doesn't carry a platform_user_id — the user has
// exactly one connected account per platform in today's data model.
func lookupConnection(
	ctx context.Context,
	s AsyncPublishStore,
	accountID uuid.UUID,
	platform string,
) (store.PlatformConnection, error) {
	connections, err := s.ListPlatformConnectionsByAccount(ctx, accountID)
	if err != nil {
		return store.PlatformConnection{}, err
	}
	for _, c := range connections {
		if c.Platform == platform {
			return c, nil
		}
	}
	return store.PlatformConnection{}, fmt.Errorf("no connection for platform %s", platform)
}

// reconcileParentStatus re-reads the platform_posts for a parent post
// and updates the parent's status to reflect how many children have
// published. Mirrors the logic the old PublishWorker's
// resolvePostStatus used.
func reconcileParentStatus(
	ctx context.Context,
	s AsyncPublishStore,
	accountID, postID uuid.UUID,
	logger *observability.Logger,
) {
	platformPosts, err := s.GetPlatformPostsByPostID(ctx, postID)
	if err != nil {
		logger.Error(ctx, "failed to load platform posts for status reconciliation", err)
		return
	}
	total := len(platformPosts)
	if total == 0 {
		return
	}
	published := 0
	failed := 0
	inflight := 0
	for _, pp := range platformPosts {
		switch pp.Status {
		case store.PlatformPostStatusPublished:
			published++
		case store.PlatformPostStatusFailed:
			if pp.AttemptCount >= pp.MaxAttempts {
				failed++
			} else {
				inflight++
			}
		default:
			inflight++
		}
	}

	var newStatus string
	switch {
	case inflight > 0:
		// Still moving; don't yet settle the parent.
		return
	case published == total:
		newStatus = store.PostStatusPublished
	case published > 0:
		newStatus = store.PostStatusPartiallyPublished
	default:
		newStatus = store.PostStatusFailed
	}

	var publishedAt *time.Time
	if newStatus == store.PostStatusPublished || newStatus == store.PostStatusPartiallyPublished {
		now := time.Now()
		publishedAt = &now
	}
	if err := s.UpdatePostStatus(ctx, accountID, postID, newStatus, publishedAt); err != nil {
		logger.Error(ctx, "failed to update parent post status", err)
	}
}
