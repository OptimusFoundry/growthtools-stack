package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// PlatformPost represents a per-platform publish record
type PlatformPost struct {
	ID             uuid.UUID        `db:"id" json:"id"`
	PostID         uuid.UUID        `db:"post_id" json:"post_id"`
	Platform       string           `db:"platform" json:"platform"`
	PlatformPostID *string          `db:"platform_post_id" json:"platform_post_id,omitempty"`
	Status         string           `db:"status" json:"status"`
	Content        *string          `db:"content" json:"content,omitempty"`
	ThreadSegments *json.RawMessage `db:"thread_segments" json:"thread_segments,omitempty"`
	// MediaHandle carries whatever the platform returned during media
	// upload (container_id, media_id + processing state, blob ref,
	// jobId, etc.). Shape is adapter-owned — the pipeline workers pass
	// it through without cracking it open. Nil for text-only rows.
	MediaHandle   *json.RawMessage `db:"media_handle" json:"media_handle,omitempty"`
	PublishedAt   *time.Time       `db:"published_at" json:"published_at,omitempty"`
	ErrorMessage  *string          `db:"error_message" json:"error_message,omitempty"`
	Engagement    JSONB            `db:"engagement" json:"engagement"`
	AttemptCount  int              `db:"attempt_count" json:"attempt_count"`
	MaxAttempts   int              `db:"max_attempts" json:"max_attempts"`
	NextRetryAt   *time.Time       `db:"next_retry_at" json:"next_retry_at,omitempty"`
	LastAttemptAt *time.Time       `db:"last_attempt_at" json:"last_attempt_at,omitempty"`
	CreatedAt     time.Time        `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time        `db:"updated_at" json:"updated_at"`
}

// RetryablePlatformPost extends PlatformPost with the parent post's account_id
type RetryablePlatformPost struct {
	PlatformPost
	AccountID uuid.UUID `db:"account_id"`
}

// CreatePlatformPostParams represents parameters for creating a platform post
type CreatePlatformPostParams struct {
	PostID         uuid.UUID
	Platform       string
	Content        *string
	ThreadSegments *json.RawMessage
}

const platformPostColumns = `id, post_id, platform, platform_post_id, status, content, thread_segments, media_handle, published_at, error_message, engagement, attempt_count, max_attempts, next_retry_at, last_attempt_at, created_at, updated_at`

const sqlCreatePlatformPost = `
INSERT INTO platform_posts (post_id, platform, content, thread_segments)
VALUES ($1, $2, $3, $4)
RETURNING ` + platformPostColumns

func (s *Store) CreatePlatformPost(ctx context.Context, params CreatePlatformPostParams) (PlatformPost, error) {
	var pp PlatformPost
	err := s.db.GetContext(ctx, &pp, sqlCreatePlatformPost, params.PostID, params.Platform, params.Content, params.ThreadSegments)
	if err != nil {
		return PlatformPost{}, fmt.Errorf("failed to create platform post: %w", err)
	}
	return pp, nil
}

const sqlGetPlatformPostsByPostID = `
SELECT ` + platformPostColumns + `
FROM platform_posts
WHERE post_id = $1
ORDER BY created_at ASC
`

func (s *Store) GetPlatformPostsByPostID(ctx context.Context, postID uuid.UUID) ([]PlatformPost, error) {
	posts := make([]PlatformPost, 0)
	err := s.db.SelectContext(ctx, &posts, sqlGetPlatformPostsByPostID, postID)
	if err != nil {
		return nil, fmt.Errorf("failed to get platform posts: %w", err)
	}
	return posts, nil
}

const sqlGetPlatformPostByID = `
SELECT ` + platformPostColumns + `
FROM platform_posts
WHERE id = $1
`

func (s *Store) GetPlatformPostByID(ctx context.Context, id uuid.UUID) (PlatformPost, error) {
	var pp PlatformPost
	err := s.db.GetContext(ctx, &pp, sqlGetPlatformPostByID, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return PlatformPost{}, ErrNotFound
		}
		return PlatformPost{}, fmt.Errorf("failed to get platform post: %w", err)
	}
	return pp, nil
}

const sqlUpdatePlatformPostStatus = `
UPDATE platform_posts
SET status = $2,
    platform_post_id = COALESCE($3, platform_post_id),
    published_at = $4,
    error_message = $5,
    attempt_count = COALESCE($6, attempt_count),
    next_retry_at = $7,
    last_attempt_at = COALESCE($8, last_attempt_at),
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
`

func (s *Store) UpdatePlatformPostStatus(ctx context.Context, id uuid.UUID, status string, platformPostID *string, publishedAt any, errorMessage *string, attemptCount *int, nextRetryAt *time.Time, lastAttemptAt *time.Time) error {
	res, err := s.db.ExecContext(ctx, sqlUpdatePlatformPostStatus, id, status, platformPostID, publishedAt, errorMessage, attemptCount, nextRetryAt, lastAttemptAt)
	if err != nil {
		return fmt.Errorf("failed to update platform post status: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

// sqlClaimPlatformPostForPublishing atomically transitions a row from
// pending/failed → publishing. The conditional WHERE means only one
// concurrent caller can win the row; redelivered Kafka messages and
// concurrent worker instances see rows_affected=0 and skip.
const sqlClaimPlatformPostForPublishing = `
UPDATE platform_posts
SET status = 'publishing',
    last_attempt_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
  AND status IN ('pending', 'failed')
`

// ClaimPlatformPostForPublishing returns true if this caller successfully
// claimed the row (status flipped to publishing). False means another
// caller already claimed it, the row is already published, or the id
// does not exist.
func (s *Store) ClaimPlatformPostForPublishing(ctx context.Context, id uuid.UUID) (bool, error) {
	res, err := s.db.ExecContext(ctx, sqlClaimPlatformPostForPublishing, id)
	if err != nil {
		return false, fmt.Errorf("failed to claim platform post for publishing: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to get rows affected: %w", err)
	}
	return rows == 1, nil
}

const sqlUpdatePlatformPostEngagement = `
UPDATE platform_posts
SET engagement = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1
`

func (s *Store) UpdatePlatformPostEngagement(ctx context.Context, id uuid.UUID, engagement JSONB) error {
	res, err := s.db.ExecContext(ctx, sqlUpdatePlatformPostEngagement, id, engagement)
	if err != nil {
		return fmt.Errorf("failed to update platform post engagement: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

const sqlDeletePlatformPostsByPostID = `
DELETE FROM platform_posts
WHERE post_id = $1
`

func (s *Store) DeletePlatformPostsByPostID(ctx context.Context, postID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx, sqlDeletePlatformPostsByPostID, postID)
	if err != nil {
		return fmt.Errorf("failed to delete platform posts: %w", err)
	}
	return nil
}

// GetRetryablePlatformPosts finds failed platform posts that are ready for retry
const sqlGetRetryablePlatformPosts = `
SELECT pp.id, pp.post_id, pp.platform, pp.platform_post_id, pp.status, pp.content, pp.thread_segments, pp.media_handle,
       pp.published_at, pp.error_message, pp.engagement, pp.attempt_count, pp.max_attempts,
       pp.next_retry_at, pp.last_attempt_at, pp.created_at, pp.updated_at,
       p.account_id
FROM platform_posts pp
JOIN posts p ON p.id = pp.post_id
WHERE pp.status = 'failed'
  AND pp.attempt_count < pp.max_attempts
  AND pp.next_retry_at IS NOT NULL
  AND pp.next_retry_at <= $1
  AND p.deleted_at IS NULL
ORDER BY pp.next_retry_at ASC
LIMIT $2
`

func (s *Store) GetRetryablePlatformPosts(ctx context.Context, now time.Time, limit int) ([]RetryablePlatformPost, error) {
	posts := make([]RetryablePlatformPost, 0)
	err := s.db.SelectContext(ctx, &posts, sqlGetRetryablePlatformPosts, now, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get retryable platform posts: %w", err)
	}
	return posts, nil
}

// GetStuckPublishingPlatformPosts finds platform posts stuck in publishing state
const sqlGetStuckPublishingPlatformPosts = `
SELECT pp.id, pp.post_id, pp.platform, pp.platform_post_id, pp.status, pp.content, pp.thread_segments, pp.media_handle,
       pp.published_at, pp.error_message, pp.engagement, pp.attempt_count, pp.max_attempts,
       pp.next_retry_at, pp.last_attempt_at, pp.created_at, pp.updated_at,
       p.account_id
FROM platform_posts pp
JOIN posts p ON p.id = pp.post_id
WHERE pp.status = 'publishing'
  AND pp.updated_at < $1
  AND p.deleted_at IS NULL
ORDER BY pp.updated_at ASC
LIMIT $2
`

func (s *Store) GetStuckPublishingPlatformPosts(ctx context.Context, stuckBefore time.Time, limit int) ([]RetryablePlatformPost, error) {
	posts := make([]RetryablePlatformPost, 0)
	err := s.db.SelectContext(ctx, &posts, sqlGetStuckPublishingPlatformPosts, stuckBefore, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get stuck publishing platform posts: %w", err)
	}
	return posts, nil
}

// -----------------------------------------------------------------------------
// Async publish pipeline — state transitions owned by the new workers
// (dispatcher, uploader, reconciler, finalizer). These share a few
// primitives that the old blocking PublishWorker didn't need.
// -----------------------------------------------------------------------------

const sqlSetPlatformPostQueued = `
UPDATE platform_posts
SET status = 'queued',
    error_message = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
`

// SetPlatformPostQueued moves a row into the async pipeline. Called by
// the dispatcher right after writing platform.publish.requested.
func (s *Store) SetPlatformPostQueued(ctx context.Context, id uuid.UUID) error {
	res, err := s.db.ExecContext(ctx, sqlSetPlatformPostQueued, id)
	if err != nil {
		return fmt.Errorf("failed to mark platform post queued: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

const sqlSetPlatformPostAwaitingMedia = `
UPDATE platform_posts
SET status = 'awaiting_media',
    media_handle = $2,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
`

// SetPlatformPostAwaitingMedia stores the platform-returned handle and
// flips status into the reconciler-owned state. handle is an opaque
// JSON blob — the uploader adapter decides the shape.
func (s *Store) SetPlatformPostAwaitingMedia(ctx context.Context, id uuid.UUID, handle json.RawMessage) error {
	res, err := s.db.ExecContext(ctx, sqlSetPlatformPostAwaitingMedia, id, handle)
	if err != nil {
		return fmt.Errorf("failed to mark platform post awaiting_media: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

const sqlSetPlatformPostMediaReady = `
UPDATE platform_posts
SET status = 'media_ready',
    media_handle = COALESCE($2, media_handle),
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
`

// SetPlatformPostMediaReady signals the finalizer that media is ready
// to attach. handle may be nil (e.g. Bluesky images that were never in
// awaiting_media) or updated (X returns a refreshed processing_info
// block on STATUS calls — keeping it for debugability).
func (s *Store) SetPlatformPostMediaReady(ctx context.Context, id uuid.UUID, handle json.RawMessage) error {
	res, err := s.db.ExecContext(ctx, sqlSetPlatformPostMediaReady, id, handle)
	if err != nil {
		return fmt.Errorf("failed to mark platform post media_ready: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

const sqlListPlatformPostsAwaitingMedia = `
SELECT pp.id, pp.post_id, pp.platform, pp.platform_post_id, pp.status, pp.content, pp.thread_segments, pp.media_handle,
       pp.published_at, pp.error_message, pp.engagement, pp.attempt_count, pp.max_attempts,
       pp.next_retry_at, pp.last_attempt_at, pp.created_at, pp.updated_at,
       p.account_id
FROM platform_posts pp
JOIN posts p ON p.id = pp.post_id
WHERE pp.status = 'awaiting_media'
ORDER BY pp.updated_at ASC
LIMIT $1
`

// ListPlatformPostsAwaitingMedia is the reconciler's primary query.
// Returns rows oldest-first so slow-moving platforms get pressure
// before fresh ones. Limit keeps each tick bounded.
func (s *Store) ListPlatformPostsAwaitingMedia(ctx context.Context, limit int) ([]RetryablePlatformPost, error) {
	posts := make([]RetryablePlatformPost, 0)
	if err := s.db.SelectContext(ctx, &posts, sqlListPlatformPostsAwaitingMedia, limit); err != nil {
		return nil, fmt.Errorf("failed to list platform posts awaiting media: %w", err)
	}
	return posts, nil
}

// ResetPlatformPostsForRetry resets permanently failed platform_posts so they can be retried
const sqlResetPlatformPostsForRetry = `
UPDATE platform_posts
SET status = 'pending',
    attempt_count = 0,
    next_retry_at = CURRENT_TIMESTAMP,
    error_message = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE post_id = $1
  AND status = 'failed'
  AND (attempt_count >= max_attempts OR next_retry_at IS NULL)
`

func (s *Store) ResetPlatformPostsForRetry(ctx context.Context, postID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx, sqlResetPlatformPostsForRetry, postID)
	if err != nil {
		return fmt.Errorf("failed to reset platform posts for retry: %w", err)
	}
	return nil
}

// GetPublishedPlatformPostsForAnalytics finds published platform posts on X, Threads,
// and BlueSky that were published after cutoff, suitable for analytics collection.
const sqlGetPublishedPlatformPostsForAnalytics = `
SELECT pp.id, pp.post_id, pp.platform, pp.platform_post_id, pp.status, pp.content, pp.thread_segments, pp.media_handle,
       pp.published_at, pp.error_message, pp.engagement, pp.attempt_count, pp.max_attempts,
       pp.next_retry_at, pp.last_attempt_at, pp.created_at, pp.updated_at,
       p.account_id
FROM platform_posts pp
JOIN posts p ON p.id = pp.post_id
WHERE pp.status = 'published'
  AND pp.platform_post_id IS NOT NULL
  AND pp.platform_post_id <> ''
  AND pp.published_at > $1
  AND pp.platform IN ('x', 'threads', 'bluesky')
  AND pp.analytics_unavailable_at IS NULL
  AND p.deleted_at IS NULL
ORDER BY pp.published_at DESC
LIMIT 500
`

func (s *Store) GetPublishedPlatformPostsForAnalytics(ctx context.Context, cutoff time.Time) ([]RetryablePlatformPost, error) {
	posts := make([]RetryablePlatformPost, 0)
	err := s.db.SelectContext(ctx, &posts, sqlGetPublishedPlatformPostsForAnalytics, cutoff)
	if err != nil {
		return nil, fmt.Errorf("failed to get published platform posts for analytics: %w", err)
	}
	return posts, nil
}

const sqlMarkPlatformPostAnalyticsUnavailable = `
UPDATE platform_posts
SET analytics_unavailable_at = NOW(), updated_at = NOW()
WHERE id = $1 AND analytics_unavailable_at IS NULL
`

// MarkPlatformPostAnalyticsUnavailable flags a platform post so analytics
// collection stops querying for it (e.g. after the platform returns not-found).
// Idempotent: no-op if already marked.
func (s *Store) MarkPlatformPostAnalyticsUnavailable(ctx context.Context, id uuid.UUID) error {
	_, err := s.db.ExecContext(ctx, sqlMarkPlatformPostAnalyticsUnavailable, id)
	if err != nil {
		return fmt.Errorf("failed to mark platform post analytics unavailable: %w", err)
	}
	return nil
}
