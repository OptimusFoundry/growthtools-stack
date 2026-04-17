package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
)

// CreateBlogPostParams represents parameters for creating a blog post
type CreateBlogPostParams struct {
	AccountID       uuid.UUID
	Title           string
	Slug            string
	Content         string
	Excerpt         *string
	Status          string
	SEOTitle        *string
	MetaDescription *string
	Keywords        StringArray
	OGTitle         *string
	OGDescription   *string
	FeaturedImageID *uuid.UUID
}

const sqlCreateBlogPost = `
INSERT INTO blog_posts (account_id, title, slug, content, excerpt, status, seo_title, meta_description, keywords, og_title, og_description, featured_image_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING id, account_id, title, slug, content, excerpt, status, seo_title, meta_description, keywords, og_title, og_description, featured_image_id, published_at, created_at, updated_at, deleted_at
`

func (s *Store) CreateBlogPost(ctx context.Context, params CreateBlogPostParams) (BlogPost, error) {
	var bp BlogPost
	err := s.db.GetContext(ctx, &bp, sqlCreateBlogPost,
		params.AccountID, params.Title, params.Slug, params.Content,
		params.Excerpt, params.Status, params.SEOTitle, params.MetaDescription,
		params.Keywords, params.OGTitle, params.OGDescription, params.FeaturedImageID)
	if err != nil {
		return BlogPost{}, fmt.Errorf("failed to create blog post: %w", err)
	}
	return bp, nil
}

const sqlGetBlogPostByID = `
SELECT id, account_id, title, slug, content, excerpt, status, seo_title, meta_description, keywords, og_title, og_description, featured_image_id, published_at, created_at, updated_at, deleted_at
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
SELECT id, account_id, title, slug, content, excerpt, status, seo_title, meta_description, keywords, og_title, og_description, featured_image_id, published_at, created_at, updated_at, deleted_at
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
SELECT id, account_id, title, slug, content, excerpt, status, seo_title, meta_description, keywords, og_title, og_description, featured_image_id, published_at, created_at, updated_at, deleted_at
FROM blog_posts
WHERE account_id = $1 AND deleted_at IS NULL
AND ($2::text IS NULL OR status = $2::blog_status)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4
`

func (s *Store) ListBlogPosts(ctx context.Context, accountID uuid.UUID, status *string, limit, offset int) ([]BlogPost, error) {
	if limit <= 0 {
		limit = 20
	}
	posts := make([]BlogPost, 0)
	err := s.db.SelectContext(ctx, &posts, sqlListBlogPosts, accountID, status, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list blog posts: %w", err)
	}
	return posts, nil
}

// UpdateBlogPostParams represents parameters for updating a blog post
type UpdateBlogPostParams struct {
	Title           *string
	Slug            *string
	Content         *string
	Excerpt         *string
	Status          *string
	SEOTitle        *string
	MetaDescription *string
	Keywords        StringArray
	OGTitle         *string
	OGDescription   *string
	FeaturedImageID *uuid.UUID
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
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
RETURNING id, account_id, title, slug, content, excerpt, status, seo_title, meta_description, keywords, og_title, og_description, featured_image_id, published_at, created_at, updated_at, deleted_at
`

func (s *Store) UpdateBlogPost(ctx context.Context, accountID, id uuid.UUID, params UpdateBlogPostParams) (BlogPost, error) {
	var bp BlogPost
	err := s.db.GetContext(ctx, &bp, sqlUpdateBlogPost,
		id, accountID, params.Title, params.Slug, params.Content,
		params.Excerpt, params.Status, params.SEOTitle, params.MetaDescription,
		params.Keywords, params.OGTitle, params.OGDescription, params.FeaturedImageID)
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
RETURNING id, account_id, title, slug, content, excerpt, status, seo_title, meta_description, keywords, og_title, og_description, featured_image_id, published_at, created_at, updated_at, deleted_at
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
