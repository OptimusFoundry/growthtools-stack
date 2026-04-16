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

// CreatePlatformPostParams represents parameters for creating a platform post
type CreatePlatformPostParams struct {
	PostID         uuid.UUID
	Platform       string
	Content        *string
	ThreadSegments *json.RawMessage
}

const platformPostColumns = `id, post_id, platform, platform_post_id, status, content, thread_segments, published_at, error_message, engagement, attempt_count, max_attempts, next_retry_at, last_attempt_at, created_at, updated_at`

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
	var posts []PlatformPost
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
SELECT pp.id, pp.post_id, pp.platform, pp.platform_post_id, pp.status, pp.content, pp.thread_segments,
       pp.published_at, pp.error_message, pp.engagement, pp.attempt_count, pp.max_attempts,
       pp.next_retry_at, pp.last_attempt_at, pp.created_at, pp.updated_at,
       p.account_id
FROM platform_posts pp
JOIN posts p ON p.id = pp.post_id
WHERE pp.status = 'failed'
  AND pp.attempt_count < pp.max_attempts
  AND pp.next_retry_at IS NOT NULL
  AND pp.next_retry_at <= $1
ORDER BY pp.next_retry_at ASC
LIMIT $2
`

func (s *Store) GetRetryablePlatformPosts(ctx context.Context, now time.Time, limit int) ([]RetryablePlatformPost, error) {
	var posts []RetryablePlatformPost
	err := s.db.SelectContext(ctx, &posts, sqlGetRetryablePlatformPosts, now, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get retryable platform posts: %w", err)
	}
	return posts, nil
}

// GetStuckPublishingPlatformPosts finds platform posts stuck in publishing state
const sqlGetStuckPublishingPlatformPosts = `
SELECT pp.id, pp.post_id, pp.platform, pp.platform_post_id, pp.status, pp.content, pp.thread_segments,
       pp.published_at, pp.error_message, pp.engagement, pp.attempt_count, pp.max_attempts,
       pp.next_retry_at, pp.last_attempt_at, pp.created_at, pp.updated_at,
       p.account_id
FROM platform_posts pp
JOIN posts p ON p.id = pp.post_id
WHERE pp.status = 'publishing'
  AND pp.updated_at < $1
ORDER BY pp.updated_at ASC
LIMIT $2
`

func (s *Store) GetStuckPublishingPlatformPosts(ctx context.Context, stuckBefore time.Time, limit int) ([]RetryablePlatformPost, error) {
	var posts []RetryablePlatformPost
	err := s.db.SelectContext(ctx, &posts, sqlGetStuckPublishingPlatformPosts, stuckBefore, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get stuck publishing platform posts: %w", err)
	}
	return posts, nil
}

// ResetPlatformPostsForRetry resets permanently failed platform_posts so they can be retried
const sqlResetPlatformPostsForRetry = `
UPDATE platform_posts
SET status = 'failed',
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
