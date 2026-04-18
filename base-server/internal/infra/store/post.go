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

// Post represents a content item
type Post struct {
	ID            uuid.UUID  `db:"id" json:"id"`
	AccountID     uuid.UUID  `db:"account_id" json:"account_id"`
	Title         *string    `db:"title" json:"title,omitempty"`
	Content       string     `db:"content" json:"content"`
	ContentType   string     `db:"content_type" json:"content_type"`
	Status        string     `db:"status" json:"status"`
	ScheduledAt   *time.Time `db:"scheduled_at" json:"scheduled_at,omitempty"`
	PublishedAt   *time.Time `db:"published_at" json:"published_at,omitempty"`
	MediaIDs      UUIDArray  `db:"media_ids" json:"media_ids"`
	Tags          StringArray `db:"tags" json:"tags"`
	AIGenerated   bool       `db:"ai_generated" json:"ai_generated"`
	BaseContent   *string    `db:"base_content" json:"base_content,omitempty"`
	Source        string     `db:"source" json:"source"`
	GitHubEventID *uuid.UUID  `db:"github_event_id" json:"github_event_id,omitempty"`
	Platforms     StringArray `db:"platforms" json:"platforms"`
	CreatedAt     time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time   `db:"updated_at" json:"updated_at"`
	DeletedAt     *time.Time  `db:"deleted_at" json:"deleted_at,omitempty"`
}

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

// UnlinkMediaFromPost removes a single media ID from a post's media_ids
// array and renumbers every platform_post's thread_segments so that
// image_index values still line up with the new array: refs to the removed
// slot are cleared, refs above it are decremented by one. All in one
// transaction so a half-applied state can't leak out.
//
// Returns ErrNotFound if the post doesn't exist on the account, or if the
// mediaID isn't in the post's media_ids.
func (s *Store) UnlinkMediaFromPost(ctx context.Context, accountID, postID, mediaID uuid.UUID) error {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	var mediaIDs UUIDArray
	err = tx.GetContext(ctx, &mediaIDs,
		`SELECT media_ids FROM posts WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL FOR UPDATE`,
		postID, accountID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("failed to load post for unlink: %w", err)
	}

	// 1-based position of the target media in the array. 0 means not
	// present — treat as not-found so the caller can surface a clear error.
	removedPosition := 0
	newMediaIDs := make(UUIDArray, 0, len(mediaIDs))
	for i, id := range mediaIDs {
		if id == mediaID {
			removedPosition = i + 1
			continue
		}
		newMediaIDs = append(newMediaIDs, id)
	}
	if removedPosition == 0 {
		return ErrNotFound
	}

	if _, err = tx.ExecContext(ctx,
		`UPDATE posts SET media_ids = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
		newMediaIDs, postID); err != nil {
		return fmt.Errorf("failed to update post media_ids: %w", err)
	}

	// Walk every platform_post and rewrite thread_segments in-place so
	// image_index stays aligned with the new media_ids array.
	type segmentRow struct {
		ID             uuid.UUID        `db:"id"`
		ThreadSegments *json.RawMessage `db:"thread_segments"`
	}
	rows := make([]segmentRow, 0)
	if err = tx.SelectContext(ctx, &rows,
		`SELECT id, thread_segments FROM platform_posts WHERE post_id = $1 AND thread_segments IS NOT NULL`,
		postID); err != nil {
		return fmt.Errorf("failed to load platform post segments: %w", err)
	}

	for _, row := range rows {
		if row.ThreadSegments == nil {
			continue
		}
		rewritten, rewriteErr := rewriteSegmentsAfterUnlink(*row.ThreadSegments, removedPosition)
		if rewriteErr != nil {
			err = fmt.Errorf("failed to rewrite segments for platform_post %s: %w", row.ID, rewriteErr)
			return err
		}
		if _, err = tx.ExecContext(ctx,
			`UPDATE platform_posts SET thread_segments = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
			rewritten, row.ID); err != nil {
			return fmt.Errorf("failed to update platform_post segments: %w", err)
		}
	}

	return tx.Commit()
}

// rewriteSegmentsAfterUnlink adjusts image_index values in a serialized
// ThreadSegment array after a media slot at `removedPosition` (1-based)
// has been spliced out of the owning post's media_ids.
//
// - Segments with image_index == removedPosition lose their image_index
//   (the segment stays; its text may still read fine).
// - Segments with image_index > removedPosition get decremented by one.
// - Segments with image_index < removedPosition, or no image_index, are
//   untouched.
func rewriteSegmentsAfterUnlink(raw json.RawMessage, removedPosition int) (json.RawMessage, error) {
	var segments []map[string]any
	if err := json.Unmarshal(raw, &segments); err != nil {
		return nil, fmt.Errorf("invalid thread_segments json: %w", err)
	}
	for i, seg := range segments {
		rawIdx, ok := seg["image_index"]
		if !ok || rawIdx == nil {
			continue
		}
		// JSON numbers decode to float64 under map[string]any.
		idx, numOK := rawIdx.(float64)
		if !numOK {
			continue
		}
		switch {
		case int(idx) == removedPosition:
			delete(segments[i], "image_index")
		case int(idx) > removedPosition:
			segments[i]["image_index"] = int(idx) - 1
		}
	}
	out, err := json.Marshal(segments)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal rewritten segments: %w", err)
	}
	return out, nil
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
	posts := make([]Post, 0)
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
