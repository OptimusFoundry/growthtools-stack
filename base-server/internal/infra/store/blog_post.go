package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// BlogPost represents a blog post
type BlogPost struct {
	ID                uuid.UUID   `db:"id" json:"id"`
	AccountID         uuid.UUID   `db:"account_id" json:"account_id"`
	Title             string      `db:"title" json:"title"`
	Slug              string      `db:"slug" json:"slug"`
	Content           string      `db:"content" json:"content"`
	Excerpt           *string     `db:"excerpt" json:"excerpt,omitempty"`
	Status            string      `db:"status" json:"status"`
	SEOTitle          *string     `db:"seo_title" json:"seo_title,omitempty"`
	MetaDescription   *string     `db:"meta_description" json:"meta_description,omitempty"`
	Keywords          StringArray `db:"keywords" json:"keywords"`
	OGTitle           *string     `db:"og_title" json:"og_title,omitempty"`
	OGDescription     *string     `db:"og_description" json:"og_description,omitempty"`
	FeaturedImageID   *uuid.UUID  `db:"featured_image_id" json:"featured_image_id,omitempty"`
	SourceInstruction *string     `db:"source_instruction" json:"source_instruction,omitempty"`
	MediaIDs          UUIDArray   `db:"media_ids" json:"media_ids"`
	PublishedAt       *time.Time  `db:"published_at" json:"published_at,omitempty"`
	SitePRURL         *string     `db:"site_pr_url" json:"site_pr_url,omitempty"`
	SitePROpenedAt    *time.Time  `db:"site_pr_opened_at" json:"site_pr_opened_at,omitempty"`
	CreatedAt         time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time   `db:"updated_at" json:"updated_at"`
	DeletedAt         *time.Time  `db:"deleted_at" json:"deleted_at,omitempty"`
}

// BlogPostListItem is the slim projection returned by list queries.
// It omits content, SEO fields, media references, and other heavy columns
// that are unnecessary when rendering a list view.
type BlogPostListItem struct {
	ID          uuid.UUID  `db:"id"           json:"id"`
	Title       string     `db:"title"        json:"title"`
	Status      string     `db:"status"       json:"status"`
	PublishedAt *time.Time `db:"published_at" json:"published_at,omitempty"`
	CreatedAt   time.Time  `db:"created_at"   json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at"   json:"updated_at"`
}

// CreateBlogPostParams represents parameters for creating a blog post
type CreateBlogPostParams struct {
	AccountID         uuid.UUID
	Title             string
	Slug              string
	Content           string
	Excerpt           *string
	Status            string
	SEOTitle          *string
	MetaDescription   *string
	Keywords          StringArray
	OGTitle           *string
	OGDescription     *string
	FeaturedImageID   *uuid.UUID
	SourceInstruction *string
	MediaIDs          UUIDArray
}

const sqlCreateBlogPost = `
INSERT INTO blog_posts (account_id, title, slug, content, excerpt, status, seo_title, meta_description, keywords, og_title, og_description, featured_image_id, source_instruction, media_ids)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
RETURNING id, account_id, title, slug, content, excerpt, status, seo_title, meta_description, keywords, og_title, og_description, featured_image_id, source_instruction, media_ids, published_at, site_pr_url, site_pr_opened_at, created_at, updated_at, deleted_at
`

func (s *Store) CreateBlogPost(ctx context.Context, params CreateBlogPostParams) (BlogPost, error) {
	var bp BlogPost
	mediaIDs := params.MediaIDs
	if mediaIDs == nil {
		mediaIDs = UUIDArray{}
	}
	err := s.db.GetContext(ctx, &bp, sqlCreateBlogPost,
		params.AccountID, params.Title, params.Slug, params.Content,
		params.Excerpt, params.Status, params.SEOTitle, params.MetaDescription,
		params.Keywords, params.OGTitle, params.OGDescription, params.FeaturedImageID,
		params.SourceInstruction, mediaIDs)
	if err != nil {
		return BlogPost{}, fmt.Errorf("failed to create blog post: %w", err)
	}
	return bp, nil
}

const sqlGetBlogPostByID = `
SELECT id, account_id, title, slug, content, excerpt, status, seo_title, meta_description, keywords, og_title, og_description, featured_image_id, source_instruction, media_ids, published_at, site_pr_url, site_pr_opened_at, created_at, updated_at, deleted_at
FROM blog_posts
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
`

func (s *Store) GetBlogPostByID(ctx context.Context, accountID, id uuid.UUID) (BlogPost, error) {
	var bp BlogPost
	err := s.db.GetContext(ctx, &bp, sqlGetBlogPostByID, id, accountID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return BlogPost{}, ErrNotFound
		}
		return BlogPost{}, fmt.Errorf("failed to get blog post: %w", err)
	}
	return bp, nil
}

const sqlGetBlogPostBySlug = `
SELECT id, account_id, title, slug, content, excerpt, status, seo_title, meta_description, keywords, og_title, og_description, featured_image_id, source_instruction, media_ids, published_at, site_pr_url, site_pr_opened_at, created_at, updated_at, deleted_at
FROM blog_posts
WHERE account_id = $1 AND slug = $2 AND deleted_at IS NULL
`

func (s *Store) GetBlogPostBySlug(ctx context.Context, accountID uuid.UUID, slug string) (BlogPost, error) {
	var bp BlogPost
	err := s.db.GetContext(ctx, &bp, sqlGetBlogPostBySlug, accountID, slug)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return BlogPost{}, ErrNotFound
		}
		return BlogPost{}, fmt.Errorf("failed to get blog post by slug: %w", err)
	}
	return bp, nil
}

const sqlListBlogPosts = `
SELECT id, title, status, published_at, created_at, updated_at
FROM blog_posts
WHERE account_id = $1 AND deleted_at IS NULL
AND ($2::text IS NULL OR status = $2::blog_status)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4
`

func (s *Store) ListBlogPosts(ctx context.Context, accountID uuid.UUID, status *string, limit, offset int) ([]BlogPostListItem, error) {
	if limit <= 0 {
		limit = 20
	}
	posts := make([]BlogPostListItem, 0)
	err := s.db.SelectContext(ctx, &posts, sqlListBlogPosts, accountID, status, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list blog posts: %w", err)
	}
	return posts, nil
}

// UpdateBlogPostParams represents parameters for updating a blog post
type UpdateBlogPostParams struct {
	Title             *string
	Slug              *string
	Content           *string
	Excerpt           *string
	Status            *string
	SEOTitle          *string
	MetaDescription   *string
	Keywords          StringArray
	OGTitle           *string
	OGDescription     *string
	FeaturedImageID   *uuid.UUID
	SourceInstruction *string
	MediaIDs          UUIDArray
}

const sqlUpdateBlogPost = `
UPDATE blog_posts
SET title = COALESCE($3, title),
    slug = COALESCE($4, slug),
    content = COALESCE($5, content),
    excerpt = COALESCE($6, excerpt),
    status = COALESCE($7, status),
    seo_title = COALESCE($8, seo_title),
    meta_description = COALESCE($9, meta_description),
    keywords = COALESCE($10, keywords),
    og_title = COALESCE($11, og_title),
    og_description = COALESCE($12, og_description),
    featured_image_id = COALESCE($13, featured_image_id),
    source_instruction = COALESCE($14, source_instruction),
    media_ids = COALESCE($15, media_ids),
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
RETURNING id, account_id, title, slug, content, excerpt, status, seo_title, meta_description, keywords, og_title, og_description, featured_image_id, source_instruction, media_ids, published_at, site_pr_url, site_pr_opened_at, created_at, updated_at, deleted_at
`

func (s *Store) UpdateBlogPost(ctx context.Context, accountID, id uuid.UUID, params UpdateBlogPostParams) (BlogPost, error) {
	var bp BlogPost
	err := s.db.GetContext(ctx, &bp, sqlUpdateBlogPost,
		id, accountID, params.Title, params.Slug, params.Content,
		params.Excerpt, params.Status, params.SEOTitle, params.MetaDescription,
		params.Keywords, params.OGTitle, params.OGDescription, params.FeaturedImageID,
		params.SourceInstruction, params.MediaIDs)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return BlogPost{}, ErrNotFound
		}
		return BlogPost{}, fmt.Errorf("failed to update blog post: %w", err)
	}
	return bp, nil
}

const sqlDeleteBlogPost = `
UPDATE blog_posts
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
`

func (s *Store) DeleteBlogPost(ctx context.Context, accountID, id uuid.UUID) error {
	res, err := s.db.ExecContext(ctx, sqlDeleteBlogPost, id, accountID)
	if err != nil {
		return fmt.Errorf("failed to delete blog post: %w", err)
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

const sqlPublishBlogPost = `
UPDATE blog_posts
SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
RETURNING id, account_id, title, slug, content, excerpt, status, seo_title, meta_description, keywords, og_title, og_description, featured_image_id, source_instruction, media_ids, published_at, site_pr_url, site_pr_opened_at, created_at, updated_at, deleted_at
`

func (s *Store) PublishBlogPost(ctx context.Context, accountID, id uuid.UUID) (BlogPost, error) {
	var bp BlogPost
	err := s.db.GetContext(ctx, &bp, sqlPublishBlogPost, id, accountID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return BlogPost{}, ErrNotFound
		}
		return BlogPost{}, fmt.Errorf("failed to publish blog post: %w", err)
	}
	return bp, nil
}

const sqlSetBlogPostSitePR = `
UPDATE blog_posts
SET site_pr_url = $3, site_pr_opened_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
RETURNING id, account_id, title, slug, content, excerpt, status, seo_title, meta_description, keywords, og_title, og_description, featured_image_id, source_instruction, media_ids, published_at, site_pr_url, site_pr_opened_at, created_at, updated_at, deleted_at
`

func (s *Store) SetBlogPostSitePR(ctx context.Context, accountID, postID uuid.UUID, prURL string) (BlogPost, error) {
	var bp BlogPost
	err := s.db.GetContext(ctx, &bp, sqlSetBlogPostSitePR, postID, accountID, prURL)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return BlogPost{}, ErrNotFound
		}
		return BlogPost{}, fmt.Errorf("failed to set blog post site PR: %w", err)
	}
	return bp, nil
}
