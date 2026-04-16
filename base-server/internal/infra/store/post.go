package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// CreatePostParams represents parameters for creating a post
type CreatePostParams struct {
	AccountID     uuid.UUID
	Title         *string
	Content       string
	ContentType   string
	Status        string
	ScheduledAt   *time.Time
	MediaIDs      UUIDArray
	Tags          StringArray
	AIGenerated   bool
	Source        string
	GitHubEventID *uuid.UUID
	BaseContent   *string
}

// ListPostsParams represents parameters for listing posts
type ListPostsParams struct {
	AccountID   uuid.UUID
	Status      *string
	ContentType *string
	Source      *string
	Limit       int
	Offset      int
}

const sqlCreatePost = `
INSERT INTO posts (account_id, title, content, content_type, status, scheduled_at, media_ids, tags, ai_generated, source, github_event_id, base_content)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING id, account_id, title, content, content_type, status, scheduled_at, published_at, media_ids, tags, ai_generated, base_content, source, github_event_id, '{}' AS platforms, created_at, updated_at, deleted_at
`

func (s *Store) CreatePost(ctx context.Context, params CreatePostParams) (Post, error) {
	var post Post
	err := s.db.GetContext(ctx, &post, sqlCreatePost,
		params.AccountID, params.Title, params.Content, params.ContentType,
		params.Status, params.ScheduledAt, params.MediaIDs, params.Tags,
		params.AIGenerated, params.Source, params.GitHubEventID, params.BaseContent)
	if err != nil {
		return Post{}, fmt.Errorf("failed to create post: %w", err)
	}
	return post, nil
}

const sqlGetPostByID = `
SELECT p.id, p.account_id, p.title, p.content, p.content_type, p.status, p.scheduled_at, p.published_at, p.media_ids, p.tags, p.ai_generated, p.base_content, p.source, p.github_event_id,
       COALESCE((SELECT array_agg(DISTINCT pp.platform) FROM platform_posts pp WHERE pp.post_id = p.id), '{}') AS platforms,
       p.created_at, p.updated_at, p.deleted_at
FROM posts p
WHERE p.id = $1 AND p.account_id = $2 AND p.deleted_at IS NULL
`

func (s *Store) GetPostByID(ctx context.Context, accountID, id uuid.UUID) (Post, error) {
	var post Post
	err := s.db.GetContext(ctx, &post, sqlGetPostByID, id, accountID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Post{}, ErrNotFound
		}
		return Post{}, fmt.Errorf("failed to get post: %w", err)
	}
	return post, nil
}

const sqlListPosts = `
SELECT p.id, p.account_id, p.title, p.content, p.content_type, p.status, p.scheduled_at, p.published_at, p.media_ids, p.tags, p.ai_generated, p.base_content, p.source, p.github_event_id,
       COALESCE((SELECT array_agg(DISTINCT pp.platform) FROM platform_posts pp WHERE pp.post_id = p.id), '{}') AS platforms,
       p.created_at, p.updated_at, p.deleted_at
FROM posts p
WHERE p.account_id = $1 AND p.deleted_at IS NULL
AND ($2::text IS NULL OR p.status = $2::post_status)
AND ($3::text IS NULL OR p.content_type = $3::content_type)
AND ($4::text IS NULL OR p.source = $4::post_source)
ORDER BY p.created_at DESC
LIMIT $5 OFFSET $6
`

func (s *Store) ListPosts(ctx context.Context, params ListPostsParams) ([]Post, error) {
	limit := params.Limit
	if limit <= 0 {
		limit = 20
	}
	posts := make([]Post, 0)
	err := s.db.SelectContext(ctx, &posts, sqlListPosts,
		params.AccountID, params.Status, params.ContentType, params.Source, limit, params.Offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list posts: %w", err)
	}
	return posts, nil
}

const sqlCountPostsByAccount = `
SELECT COUNT(*) FROM posts WHERE account_id = $1 AND deleted_at IS NULL
`

func (s *Store) CountPostsByAccount(ctx context.Context, accountID uuid.UUID) (int, error) {
	var count int
	err := s.db.GetContext(ctx, &count, sqlCountPostsByAccount, accountID)
	if err != nil {
		return 0, fmt.Errorf("failed to count posts: %w", err)
	}
	return count, nil
}

// UpdatePostParams represents parameters for updating a post
type UpdatePostParams struct {
	Title       *string
	Content     *string
	ContentType *string
	Status      *string
	ScheduledAt *time.Time
	MediaIDs    UUIDArray
	Tags        StringArray
	BaseContent *string
}

const sqlUpdatePost = `
UPDATE posts
SET title = COALESCE($3, title),
    content = COALESCE($4, content),
    content_type = COALESCE($5, content_type),
    status = COALESCE($6, status),
    scheduled_at = COALESCE($7, scheduled_at),
    media_ids = COALESCE($8, media_ids),
    tags = COALESCE($9, tags),
    base_content = COALESCE($10, base_content),
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
RETURNING id, account_id, title, content, content_type, status, scheduled_at, published_at, media_ids, tags, ai_generated, base_content, source, github_event_id, '{}' AS platforms, created_at, updated_at, deleted_at
`

func (s *Store) UpdatePost(ctx context.Context, accountID, id uuid.UUID, params UpdatePostParams) (Post, error) {
	var post Post
	err := s.db.GetContext(ctx, &post, sqlUpdatePost,
		id, accountID, params.Title, params.Content, params.ContentType,
		params.Status, params.ScheduledAt, params.MediaIDs, params.Tags, params.BaseContent)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Post{}, ErrNotFound
		}
		return Post{}, fmt.Errorf("failed to update post: %w", err)
	}
	return post, nil
}

const sqlDeletePost = `
UPDATE posts
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
`

func (s *Store) DeletePost(ctx context.Context, accountID, id uuid.UUID) error {
	res, err := s.db.ExecContext(ctx, sqlDeletePost, id, accountID)
	if err != nil {
		return fmt.Errorf("failed to delete post: %w", err)
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

const sqlGetDueScheduledPosts = `
SELECT id, account_id, title, content, content_type, status, scheduled_at, published_at, media_ids, tags, ai_generated, base_content, source, github_event_id, '{}' AS platforms, created_at, updated_at, deleted_at
FROM posts
WHERE status = 'scheduled' AND scheduled_at <= $1 AND deleted_at IS NULL
ORDER BY scheduled_at ASC
LIMIT 100
`

func (s *Store) GetDueScheduledPosts(ctx context.Context, now time.Time) ([]Post, error) {
	var posts []Post
	err := s.db.SelectContext(ctx, &posts, sqlGetDueScheduledPosts, now)
	if err != nil {
		return nil, fmt.Errorf("failed to get due scheduled posts: %w", err)
	}
	return posts, nil
}

const sqlUpdatePostStatus = `
UPDATE posts
SET status = $3, published_at = $4, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
`

func (s *Store) UpdatePostStatus(ctx context.Context, accountID, id uuid.UUID, status string, publishedAt *time.Time) error {
	res, err := s.db.ExecContext(ctx, sqlUpdatePostStatus, id, accountID, status, publishedAt)
	if err != nil {
		return fmt.Errorf("failed to update post status: %w", err)
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
