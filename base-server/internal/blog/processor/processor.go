package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

import (
	"context"
	"errors"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// BlogStore defines the database operations required by BlogProcessor
type BlogStore interface {
	CreateBlogPost(ctx context.Context, params store.CreateBlogPostParams) (store.BlogPost, error)
	GetBlogPostByID(ctx context.Context, accountID, postID uuid.UUID) (store.BlogPost, error)
	GetBlogPostBySlug(ctx context.Context, accountID uuid.UUID, slug string) (store.BlogPost, error)
	ListBlogPosts(ctx context.Context, accountID uuid.UUID, status *string, limit, offset int) ([]store.BlogPost, error)
	UpdateBlogPost(ctx context.Context, accountID, id uuid.UUID, params store.UpdateBlogPostParams) (store.BlogPost, error)
	DeleteBlogPost(ctx context.Context, accountID, postID uuid.UUID) error
	PublishBlogPost(ctx context.Context, accountID, id uuid.UUID) (store.BlogPost, error)
}

var (
	ErrBlogPostNotFound  = errors.New("blog post not found")
	ErrSlugAlreadyExists = errors.New("slug already exists")
)

type BlogProcessor struct {
	store  BlogStore
	logger *observability.Logger
}

func New(store BlogStore, logger *observability.Logger) BlogProcessor {
	return BlogProcessor{
		store:  store,
		logger: logger,
	}
}

func (p *BlogProcessor) CreateBlogPost(ctx context.Context, params store.CreateBlogPostParams) (store.BlogPost, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: params.AccountID.String()},
		observability.Field{Key: "slug", Value: params.Slug},
		observability.Field{Key: "operation", Value: "create_blog_post"},
	)

	existing, err := p.store.GetBlogPostBySlug(ctx, params.AccountID, params.Slug)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		p.logger.Error(ctx, "failed to check for slug uniqueness", err)
		return store.BlogPost{}, ErrBlogPostNotFound
	}
	if existing.ID != uuid.Nil {
		return store.BlogPost{}, ErrSlugAlreadyExists
	}

	created, err := p.store.CreateBlogPost(ctx, params)
	if err != nil {
		p.logger.Error(ctx, "failed to create blog post", err)
		return store.BlogPost{}, ErrBlogPostNotFound
	}
	return created, nil
}

func (p *BlogProcessor) GetBlogPost(ctx context.Context, accountID, postID uuid.UUID) (store.BlogPost, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "operation", Value: "get_blog_post"},
	)

	post, err := p.store.GetBlogPostByID(ctx, accountID, postID)
	if err != nil {
		p.logger.Error(ctx, "failed to get blog post", err)
		if errors.Is(err, store.ErrNotFound) {
			return store.BlogPost{}, ErrBlogPostNotFound
		}
		return store.BlogPost{}, err
	}
	return post, nil
}

func (p *BlogProcessor) ListBlogPosts(ctx context.Context, accountID uuid.UUID, status *string, limit, offset int) ([]store.BlogPost, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "operation", Value: "list_blog_posts"},
	)

	posts, err := p.store.ListBlogPosts(ctx, accountID, status, limit, offset)
	if err != nil {
		p.logger.Error(ctx, "failed to list blog posts", err)
		return nil, err
	}
	return posts, nil
}

func (p *BlogProcessor) UpdateBlogPost(ctx context.Context, accountID, postID uuid.UUID, params store.UpdateBlogPostParams) (store.BlogPost, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "operation", Value: "update_blog_post"},
	)

	updated, err := p.store.UpdateBlogPost(ctx, accountID, postID, params)
	if err != nil {
		p.logger.Error(ctx, "failed to update blog post", err)
		if errors.Is(err, store.ErrNotFound) {
			return store.BlogPost{}, ErrBlogPostNotFound
		}
		return store.BlogPost{}, err
	}
	return updated, nil
}

func (p *BlogProcessor) DeleteBlogPost(ctx context.Context, accountID, postID uuid.UUID) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "operation", Value: "delete_blog_post"},
	)

	err := p.store.DeleteBlogPost(ctx, accountID, postID)
	if err != nil {
		p.logger.Error(ctx, "failed to delete blog post", err)
		if errors.Is(err, store.ErrNotFound) {
			return ErrBlogPostNotFound
		}
		return err
	}
	return nil
}

func (p *BlogProcessor) PublishBlogPost(ctx context.Context, accountID, postID uuid.UUID) (store.BlogPost, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "operation", Value: "publish_blog_post"},
	)

	_, err := p.store.GetBlogPostByID(ctx, accountID, postID)
	if err != nil {
		p.logger.Error(ctx, "failed to get blog post for publishing", err)
		if errors.Is(err, store.ErrNotFound) {
			return store.BlogPost{}, ErrBlogPostNotFound
		}
		return store.BlogPost{}, err
	}

	published, err := p.store.PublishBlogPost(ctx, accountID, postID)
	if err != nil {
		p.logger.Error(ctx, "failed to publish blog post", err)
		if errors.Is(err, store.ErrNotFound) {
			return store.BlogPost{}, ErrBlogPostNotFound
		}
		return store.BlogPost{}, err
	}
	return published, nil
}
