package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// PostStore defines the database operations required by PostProcessor
type PostStore interface {
	CreatePost(ctx context.Context, params store.CreatePostParams) (store.Post, error)
	GetPostByID(ctx context.Context, accountID, postID uuid.UUID) (store.Post, error)
	ListPosts(ctx context.Context, params store.ListPostsParams) ([]store.Post, error)
	UpdatePost(ctx context.Context, accountID, id uuid.UUID, params store.UpdatePostParams) (store.Post, error)
	DeletePost(ctx context.Context, accountID, postID uuid.UUID) error
	UpdatePostStatus(ctx context.Context, accountID, id uuid.UUID, status string, publishedAt *time.Time) error
	CreatePlatformPost(ctx context.Context, params store.CreatePlatformPostParams) (store.PlatformPost, error)
	GetPlatformPostsByPostID(ctx context.Context, postID uuid.UUID) ([]store.PlatformPost, error)
	DeletePlatformPostsByPostID(ctx context.Context, postID uuid.UUID) error
	ResetPlatformPostsForRetry(ctx context.Context, postID uuid.UUID) error
	GetMediaByIDs(ctx context.Context, ids []uuid.UUID) ([]store.Media, error)
}

// EventPublisher publishes events to a message broker
type EventPublisher interface {
	Publish(ctx context.Context, topic string, key string, value interface{}) error
}

var (
	ErrPostNotFound       = errors.New("post not found")
	ErrFailedCreatePost   = errors.New("failed to create post")
	ErrFailedUpdatePost   = errors.New("failed to update post")
	ErrFailedDeletePost   = errors.New("failed to delete post")
	ErrFailedSaveDraft    = errors.New("failed to save draft")
	ErrFailedRetryPost    = errors.New("failed to retry post")
)

type PostProcessor struct {
	store     PostStore
	publisher EventPublisher
	logger    *observability.Logger
}

func New(store PostStore, publisher EventPublisher, logger *observability.Logger) PostProcessor {
	return PostProcessor{
		store:     store,
		publisher: publisher,
		logger:    logger,
	}
}

// PostWithPlatformPosts combines a post with its platform posts and attached media
type PostWithPlatformPosts struct {
	Post          store.Post           `json:"post"`
	PlatformPosts []store.PlatformPost `json:"platform_posts"`
	Media         []store.Media        `json:"media"`
}

func (p *PostProcessor) CreatePost(ctx context.Context, params store.CreatePostParams) (store.Post, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: params.AccountID.String()},
		observability.Field{Key: "operation", Value: "create_post"},
	)

	created, err := p.store.CreatePost(ctx, params)
	if err != nil {
		p.logger.Error(ctx, "failed to create post", err)
		return store.Post{}, ErrFailedCreatePost
	}
	return created, nil
}

func (p *PostProcessor) GetPost(ctx context.Context, accountID, postID uuid.UUID) (store.Post, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "operation", Value: "get_post"},
	)

	post, err := p.store.GetPostByID(ctx, accountID, postID)
	if err != nil {
		p.logger.Error(ctx, "failed to get post", err)
		if errors.Is(err, store.ErrNotFound) {
			return store.Post{}, ErrPostNotFound
		}
		return store.Post{}, ErrFailedCreatePost
	}
	return post, nil
}

func (p *PostProcessor) ListPosts(ctx context.Context, params store.ListPostsParams) ([]store.Post, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: params.AccountID.String()},
		observability.Field{Key: "operation", Value: "list_posts"},
	)

	posts, err := p.store.ListPosts(ctx, params)
	if err != nil {
		p.logger.Error(ctx, "failed to list posts", err)
		return nil, ErrFailedCreatePost
	}
	return posts, nil
}

func (p *PostProcessor) UpdatePost(ctx context.Context, accountID, postID uuid.UUID, params store.UpdatePostParams) (store.Post, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "operation", Value: "update_post"},
	)

	updated, err := p.store.UpdatePost(ctx, accountID, postID, params)
	if err != nil {
		p.logger.Error(ctx, "failed to update post", err)
		if errors.Is(err, store.ErrNotFound) {
			return store.Post{}, ErrPostNotFound
		}
		return store.Post{}, ErrFailedUpdatePost
	}
	return updated, nil
}

func (p *PostProcessor) DeletePost(ctx context.Context, accountID, postID uuid.UUID) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "operation", Value: "delete_post"},
	)

	err := p.store.DeletePost(ctx, accountID, postID)
	if err != nil {
		p.logger.Error(ctx, "failed to delete post", err)
		if errors.Is(err, store.ErrNotFound) {
			return ErrPostNotFound
		}
		return ErrFailedDeletePost
	}
	return nil
}

// PublishPost creates platform_posts for each target platform and updates post status to publishing
func (p *PostProcessor) PublishPost(ctx context.Context, accountID, postID uuid.UUID, platforms []string) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "operation", Value: "publish_post"},
	)

	_, err := p.store.GetPostByID(ctx, accountID, postID)
	if err != nil {
		p.logger.Error(ctx, "failed to get post for publishing", err)
		if errors.Is(err, store.ErrNotFound) {
			return ErrPostNotFound
		}
		return ErrFailedUpdatePost
	}

	// Only create platform_posts for platforms that don't already exist (saveDraft creates them with content)
	existing, err := p.store.GetPlatformPostsByPostID(ctx, postID)
	if err != nil {
		p.logger.Error(ctx, "failed to get existing platform posts", err)
		return ErrFailedUpdatePost
	}
	existingPlatforms := make(map[string]bool, len(existing))
	for _, pp := range existing {
		existingPlatforms[pp.Platform] = true
	}

	for _, platform := range platforms {
		if existingPlatforms[platform] {
			continue
		}
		params := store.CreatePlatformPostParams{
			PostID:   postID,
			Platform: platform,
		}
		_, err := p.store.CreatePlatformPost(ctx, params)
		if err != nil {
			p.logger.Error(ctx, "failed to create platform post", err)
			return ErrFailedUpdatePost
		}
	}

	err = p.store.UpdatePostStatus(ctx, accountID, postID, "publishing", nil)
	if err != nil {
		p.logger.Error(ctx, "failed to update post status to publishing", err)
		return ErrFailedUpdatePost
	}

	// Publish event to trigger the publish worker
	event := map[string]interface{}{
		"post_id":    postID.String(),
		"account_id": accountID.String(),
		"platforms":  platforms,
	}
	if err := p.publisher.Publish(ctx, "post.publish", postID.String(), event); err != nil {
		p.logger.Error(ctx, "failed to publish post.publish event", err)
		// Don't fail the request — the scheduler can pick it up as a fallback
	}

	return nil
}

// SchedulePost sets the post status to scheduled and records the scheduled time
func (p *PostProcessor) SchedulePost(ctx context.Context, accountID, postID uuid.UUID, scheduledAt time.Time) (store.Post, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "operation", Value: "schedule_post"},
	)

	_, err := p.store.GetPostByID(ctx, accountID, postID)
	if err != nil {
		p.logger.Error(ctx, "failed to get post for scheduling", err)
		if errors.Is(err, store.ErrNotFound) {
			return store.Post{}, ErrPostNotFound
		}
		return store.Post{}, ErrFailedUpdatePost
	}

	updateParams := store.UpdatePostParams{
		Status:      strPtr("scheduled"),
		ScheduledAt: &scheduledAt,
	}

	updated, err := p.store.UpdatePost(ctx, accountID, postID, updateParams)
	if err != nil {
		p.logger.Error(ctx, "failed to update post for scheduling", err)
		return store.Post{}, ErrFailedUpdatePost
	}

	return updated, nil
}

// GetPostWithPlatformPosts retrieves a post along with all of its platform posts
func (p *PostProcessor) GetPostWithPlatformPosts(ctx context.Context, accountID, postID uuid.UUID) (PostWithPlatformPosts, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "operation", Value: "get_post_with_platform_posts"},
	)

	post, err := p.store.GetPostByID(ctx, accountID, postID)
	if err != nil {
		p.logger.Error(ctx, "failed to get post", err)
		if errors.Is(err, store.ErrNotFound) {
			return PostWithPlatformPosts{}, ErrPostNotFound
		}
		return PostWithPlatformPosts{}, ErrFailedCreatePost
	}

	platformPosts, err := p.store.GetPlatformPostsByPostID(ctx, postID)
	if err != nil {
		p.logger.Error(ctx, "failed to get platform posts", err)
		return PostWithPlatformPosts{}, ErrFailedCreatePost
	}

	var media []store.Media
	if len(post.MediaIDs) > 0 {
		media, err = p.store.GetMediaByIDs(ctx, []uuid.UUID(post.MediaIDs))
		if err != nil {
			p.logger.Error(ctx, "failed to get media for post", err)
			// Non-fatal: return post without media rather than failing entirely
			media = nil
		}
	}

	return PostWithPlatformPosts{
		Post:          post,
		PlatformPosts: platformPosts,
		Media:         media,
	}, nil
}

// PlatformDraftContent holds per-platform content for a draft
type PlatformDraftContent struct {
	Platform       string
	Content        *string
	ThreadSegments *json.RawMessage
}

// SaveDraftParams holds the parameters for saving a draft post
type SaveDraftParams struct {
	AccountID   uuid.UUID
	Content     string
	ContentType string
	Tags        []string
	MediaIDs    store.UUIDArray
	AIGenerated bool
	BaseContent *string
	Platforms   []PlatformDraftContent
}

// SaveDraft creates a post with draft status and platform_post rows with adapted content
func (p *PostProcessor) SaveDraft(ctx context.Context, params SaveDraftParams) (store.Post, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: params.AccountID.String()},
		observability.Field{Key: "operation", Value: "save_draft"},
	)

	createParams := store.CreatePostParams{
		AccountID:   params.AccountID,
		Content:     params.Content,
		ContentType: params.ContentType,
		Status:      "draft",
		Tags:        store.StringArray(params.Tags),
		MediaIDs:    params.MediaIDs,
		AIGenerated: params.AIGenerated,
		Source:      "manual",
		BaseContent: params.BaseContent,
	}

	post, err := p.store.CreatePost(ctx, createParams)
	if err != nil {
		p.logger.Error(ctx, "failed to create draft post", err)
		return store.Post{}, ErrFailedSaveDraft
	}

	for _, platform := range params.Platforms {
		ppParams := store.CreatePlatformPostParams{
			PostID:         post.ID,
			Platform:       platform.Platform,
			Content:        platform.Content,
			ThreadSegments: platform.ThreadSegments,
		}
		_, err := p.store.CreatePlatformPost(ctx, ppParams)
		if err != nil {
			p.logger.Error(ctx, "failed to create platform post for draft", err)
			return store.Post{}, ErrFailedSaveDraft
		}
	}

	return post, nil
}

// UpdateDraftParams holds the parameters for updating an existing draft post
type UpdateDraftParams struct {
	AccountID   uuid.UUID
	PostID      uuid.UUID
	Content     string
	ContentType string
	Tags        []string
	MediaIDs    store.UUIDArray
	AIGenerated bool
	BaseContent *string
	Platforms   []PlatformDraftContent
}

// UpdateDraft updates a draft post and replaces its platform_post rows
func (p *PostProcessor) UpdateDraft(ctx context.Context, params UpdateDraftParams) (store.Post, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: params.AccountID.String()},
		observability.Field{Key: "post_id", Value: params.PostID.String()},
		observability.Field{Key: "operation", Value: "update_draft"},
	)

	contentType := params.ContentType
	updateParams := store.UpdatePostParams{
		Content:     &params.Content,
		ContentType: &contentType,
		BaseContent: params.BaseContent,
	}
	if params.Tags != nil {
		updateParams.Tags = store.StringArray(params.Tags)
	}

	post, err := p.store.UpdatePost(ctx, params.AccountID, params.PostID, updateParams)
	if err != nil {
		p.logger.Error(ctx, "failed to update draft post", err)
		if errors.Is(err, store.ErrNotFound) {
			return store.Post{}, ErrPostNotFound
		}
		return store.Post{}, ErrFailedUpdatePost
	}

	if err := p.store.DeletePlatformPostsByPostID(ctx, params.PostID); err != nil {
		p.logger.Error(ctx, "failed to delete old platform posts", err)
		return store.Post{}, ErrFailedSaveDraft
	}

	for _, platform := range params.Platforms {
		ppParams := store.CreatePlatformPostParams{
			PostID:         params.PostID,
			Platform:       platform.Platform,
			Content:        platform.Content,
			ThreadSegments: platform.ThreadSegments,
		}
		_, err := p.store.CreatePlatformPost(ctx, ppParams)
		if err != nil {
			p.logger.Error(ctx, "failed to create platform post for draft update", err)
			return store.Post{}, ErrFailedSaveDraft
		}
	}

	return post, nil
}

// RetryFailedPlatformPosts resets permanently failed platform_posts and sets the post back to publishing
func (p *PostProcessor) RetryFailedPlatformPosts(ctx context.Context, accountID, postID uuid.UUID) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "operation", Value: "retry_failed_platform_posts"},
	)

	_, err := p.store.GetPostByID(ctx, accountID, postID)
	if err != nil {
		p.logger.Error(ctx, "failed to get post for retry", err)
		if errors.Is(err, store.ErrNotFound) {
			return ErrPostNotFound
		}
		return ErrFailedRetryPost
	}

	if err := p.store.ResetPlatformPostsForRetry(ctx, postID); err != nil {
		p.logger.Error(ctx, "failed to reset platform posts for retry", err)
		return ErrFailedRetryPost
	}

	if err := p.store.UpdatePostStatus(ctx, accountID, postID, store.PostStatusPublishing, nil); err != nil {
		p.logger.Error(ctx, "failed to update post status to publishing for retry", err)
		return ErrFailedRetryPost
	}

	return nil
}

func strPtr(s string) *string {
	return &s
}
