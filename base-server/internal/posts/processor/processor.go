package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// URLSigner turns an S3 key into a time-limited HTTPS URL. Mirrors the
// same-named interface in media/processor and github/processor; bootstrap
// wires the S3 client to all three.
type URLSigner interface {
	PresignGetURL(ctx context.Context, key string, ttl time.Duration) (string, error)
}

// TitleGenerator auto-generates a short post title from content.
// It is optional — set via SetTitler after construction.
type TitleGenerator interface {
	GenerateTitle(ctx context.Context, content string) (string, error)
}

const postsMediaPresignTTL = time.Hour

// PostStore defines the database operations required by PostProcessor
type PostStore interface {
	CreatePost(ctx context.Context, params store.CreatePostParams) (store.Post, error)
	GetPostByID(ctx context.Context, accountID, postID uuid.UUID) (store.Post, error)
	ListPosts(ctx context.Context, params store.ListPostsParams) ([]store.PostListItem, error)
	UpdatePost(ctx context.Context, accountID, id uuid.UUID, params store.UpdatePostParams) (store.Post, error)
	DeletePost(ctx context.Context, accountID, postID uuid.UUID) error
	UnlinkMediaFromPost(ctx context.Context, accountID, postID, mediaID uuid.UUID) error
	UpdatePostStatus(ctx context.Context, accountID, id uuid.UUID, status string, publishedAt *time.Time) error
	CreatePlatformPost(ctx context.Context, params store.CreatePlatformPostParams) (store.PlatformPost, error)
	GetPlatformPostsByPostID(ctx context.Context, postID uuid.UUID) ([]store.PlatformPost, error)
	DeletePlatformPostsByPostID(ctx context.Context, postID uuid.UUID) error
	ResetPlatformPostsForRetry(ctx context.Context, postID uuid.UUID) error
	GetMediaByIDs(ctx context.Context, ids []uuid.UUID) ([]store.Media, error)
	GetCalendarStatusCounts(ctx context.Context, params store.CalendarParams) ([]store.CalendarStatusRow, error)
	GetCalendarPlatformCounts(ctx context.Context, params store.CalendarParams) ([]store.CalendarPlatformRow, error)
	GetLatestAnalyticsByPost(ctx context.Context, postID uuid.UUID) ([]store.PlatformPostLatest, error)
	GetAnalyticsByPlatformPost(ctx context.Context, platformPostID uuid.UUID) ([]store.PostAnalytics, error)
}

// EventPublisher publishes events to a message broker
type EventPublisher interface {
	Publish(ctx context.Context, topic string, key string, value interface{}) error
}

var (
	ErrPostNotFound           = errors.New("post not found")
	ErrFailedCreatePost       = errors.New("failed to create post")
	ErrFailedUpdatePost       = errors.New("failed to update post")
	ErrFailedDeletePost       = errors.New("failed to delete post")
	ErrMediaNotAttached       = errors.New("media is not attached to post")
	ErrFailedUnlinkMedia      = errors.New("failed to unlink media from post")
	ErrFailedSaveDraft        = errors.New("failed to save draft")
	ErrFailedRetryPost        = errors.New("failed to retry post")
	ErrInvalidCalendarParams  = errors.New("invalid calendar year or month")
	ErrFailedGetPostAnalytics = errors.New("failed to get post analytics")
)

type PostProcessor struct {
	store     PostStore
	publisher EventPublisher
	urlSigner URLSigner
	titler    TitleGenerator
	logger    *observability.Logger
}

func New(store PostStore, publisher EventPublisher, logger *observability.Logger) PostProcessor {
	return PostProcessor{
		store:     store,
		publisher: publisher,
		logger:    logger,
	}
}

// SetURLSigner wires the presign dependency after construction so existing
// callsites don't need to change. Pass nil to leave `s3://bucket/key` URLs
// untouched (local/dev storage).
func (p *PostProcessor) SetURLSigner(signer URLSigner) {
	p.urlSigner = signer
}

// SetTitler wires the title-generation dependency after construction.
// Pass nil to leave titles as whatever the caller provided (or empty).
func (p *PostProcessor) SetTitler(t TitleGenerator) {
	p.titler = t
}

// presignMediaURL rewrites a single media row's s3:// URL to a presigned
// https URL in place. Non-`s3://` URLs (e.g. uploaded media already carrying
// a direct https URL) are left alone.
func (p *PostProcessor) presignMediaURL(ctx context.Context, m *store.Media) {
	if p.urlSigner == nil || m == nil || !strings.HasPrefix(m.S3URL, "s3://") {
		return
	}
	signed, err := p.urlSigner.PresignGetURL(ctx, m.S3Key, postsMediaPresignTTL)
	if err != nil {
		p.logger.Error(ctx, "failed to presign media url for post response", err)
		return
	}
	m.S3URL = signed
}

// PostWithPlatformPosts combines a post with its platform posts and attached media
type PostWithPlatformPosts struct {
	Post          store.Post           `json:"post"`
	PlatformPosts []store.PlatformPost `json:"platform_posts"`
	Media         []store.Media        `json:"media"`
}

// StatusBreakdown holds a count per post status. All six keys are always
// present even when zero, so the frontend can render consistently.
type StatusBreakdown struct {
	Draft              int `json:"draft"`
	Scheduled          int `json:"scheduled"`
	Publishing         int `json:"publishing"`
	Published          int `json:"published"`
	Failed             int `json:"failed"`
	PartiallyPublished int `json:"partially_published"`
}

// PlatformBreakdown holds a count per platform. All 8 canonical platform
// keys are always present even when zero.
type PlatformBreakdown struct {
	X         int `json:"x"`
	LinkedIn  int `json:"linkedin"`
	BlueSky   int `json:"bluesky"`
	Facebook  int `json:"facebook"`
	Instagram int `json:"instagram"`
	Threads   int `json:"threads"`
	TikTok    int `json:"tiktok"`
	Pinterest int `json:"pinterest"`
}

// CalendarDay is one entry in the CalendarMonth.Days slice. Only days that
// have at least one post are included; the frontend fills empty-day gaps.
type CalendarDay struct {
	Date       string            `json:"date"` // "YYYY-MM-DD"
	ByStatus   StatusBreakdown   `json:"by_status"`
	ByPlatform PlatformBreakdown `json:"by_platform"`
}

// CalendarMonth is the response shape for GetCalendarMonth.
type CalendarMonth struct {
	Month       string        `json:"month"` // "YYYY-MM"
	Days        []CalendarDay `json:"days"`
	MonthTotals struct {
		ByStatus   StatusBreakdown   `json:"by_status"`
		ByPlatform PlatformBreakdown `json:"by_platform"`
	} `json:"month_totals"`
}

func (p *PostProcessor) CreatePost(ctx context.Context, params store.CreatePostParams) (store.Post, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: params.AccountID.String()},
		observability.Field{Key: "operation", Value: "create_post"},
	)

	// Auto-generate title only when the caller did not supply one.
	if params.Title == nil {
		title := p.generateTitle(ctx, params.Content)
		if title != "" {
			params.Title = &title
		}
	}

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

func (p *PostProcessor) ListPosts(ctx context.Context, params store.ListPostsParams) ([]store.PostListItem, error) {
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
	// Leave github_commits.post_id intact — the commit detail UI
	// differentiates "linked to a post that was then deleted" from
	// "no post was ever created" by joining on posts.deleted_at.
	return nil
}

// UnlinkMedia removes a media attachment from a post. The media row + S3
// object are preserved so the user can re-attach it later; only this post's
// reference is dropped. Per-platform thread segments pointing at the removed
// slot are rewritten by the store so image_index values stay in sync with
// the new media_ids array.
func (p *PostProcessor) UnlinkMedia(ctx context.Context, accountID, postID, mediaID uuid.UUID) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "media_id", Value: mediaID.String()},
		observability.Field{Key: "operation", Value: "unlink_media_from_post"},
	)

	if err := p.store.UnlinkMediaFromPost(ctx, accountID, postID, mediaID); err != nil {
		p.logger.Error(ctx, "failed to unlink media from post", err)
		if errors.Is(err, store.ErrNotFound) {
			// The store returns ErrNotFound both when the post is missing
			// and when the media isn't in this post's media_ids. Verify
			// the post itself so the handler can give the caller a useful
			// 404 vs 409 distinction.
			if _, getErr := p.store.GetPostByID(ctx, accountID, postID); getErr != nil {
				if errors.Is(getErr, store.ErrNotFound) {
					return ErrPostNotFound
				}
			}
			return ErrMediaNotAttached
		}
		return ErrFailedUnlinkMedia
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

	media := make([]store.Media, 0)
	if len(post.MediaIDs) > 0 {
		fetched, err := p.store.GetMediaByIDs(ctx, []uuid.UUID(post.MediaIDs))
		if err != nil {
			p.logger.Error(ctx, "failed to get media for post", err)
			// Non-fatal: return post without media rather than failing entirely
		} else {
			for i := range fetched {
				p.presignMediaURL(ctx, &fetched[i])
			}
			media = fetched
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
	AccountID     uuid.UUID
	Content       string
	ContentType   string
	Tags          []string
	MediaIDs      store.UUIDArray
	AIGenerated   bool
	BaseContent   *string
	Platforms     []PlatformDraftContent
	Source        string
	GitHubEventID *uuid.UUID
}

// SaveDraft creates a post with draft status and platform_post rows with adapted content
func (p *PostProcessor) SaveDraft(ctx context.Context, params SaveDraftParams) (store.Post, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: params.AccountID.String()},
		observability.Field{Key: "operation", Value: "save_draft"},
	)

	source := params.Source
	if source == "" {
		source = "manual"
	}
	// SaveDraft always auto-generates a title from the draft content.
	generatedTitle := p.generateTitle(ctx, params.Content)

	createParams := store.CreatePostParams{
		AccountID:     params.AccountID,
		Content:       params.Content,
		ContentType:   params.ContentType,
		Status:        "draft",
		Tags:          store.StringArray(params.Tags),
		MediaIDs:      params.MediaIDs,
		AIGenerated:   params.AIGenerated,
		Source:        source,
		BaseContent:   params.BaseContent,
		GitHubEventID: params.GitHubEventID,
	}
	if generatedTitle != "" {
		createParams.Title = &generatedTitle
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
	if params.MediaIDs != nil {
		updateParams.MediaIDs = params.MediaIDs
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

	// Publish event so the publish worker picks the reset rows up immediately.
	// Without this, the post sits in 'publishing' until RetryWorker.recoverStuckPublishing
	// times it out after ~5 min, which both delays the retry and allows the original
	// in-flight Kafka event (if any) to redeliver and double-publish.
	platformPosts, err := p.store.GetPlatformPostsByPostID(ctx, postID)
	if err != nil {
		p.logger.Error(ctx, "failed to load platform posts for retry event", err)
		return ErrFailedRetryPost
	}
	platforms := make([]string, 0, len(platformPosts))
	for _, pp := range platformPosts {
		platforms = append(platforms, pp.Platform)
	}
	event := map[string]interface{}{
		"post_id":    postID.String(),
		"account_id": accountID.String(),
		"platforms":  platforms,
	}
	if err := p.publisher.Publish(ctx, "post.publish", postID.String(), event); err != nil {
		p.logger.Error(ctx, "failed to publish post.publish event for retry", err)
		// Don't fail the request — RetryWorker fallback will eventually pick it up.
	}

	return nil
}

func strPtr(s string) *string {
	return &s
}

// GetCalendarMonth aggregates posts for a single calendar month into per-day
// status and platform breakdowns plus month totals. It issues two queries
// (status counts, platform counts) and merges them in Go so the DB only
// groups the needed month, not the entire posts table.
//
// Validation: year must be 2000-2100, month must be 1-12.
func (p *PostProcessor) GetCalendarMonth(ctx context.Context, accountID uuid.UUID, year, month int) (CalendarMonth, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "year", Value: year},
		observability.Field{Key: "month", Value: month},
		observability.Field{Key: "operation", Value: "get_calendar_month"},
	)

	if year < 2000 || year > 2100 || month < 1 || month > 12 {
		return CalendarMonth{}, ErrInvalidCalendarParams
	}

	storeParams := store.CalendarParams{
		AccountID: accountID,
		Year:      year,
		Month:     month,
	}

	statusRows, err := p.store.GetCalendarStatusCounts(ctx, storeParams)
	if err != nil {
		p.logger.Error(ctx, "failed to get calendar status counts", err)
		return CalendarMonth{}, ErrInvalidCalendarParams
	}

	platformRows, err := p.store.GetCalendarPlatformCounts(ctx, storeParams)
	if err != nil {
		p.logger.Error(ctx, "failed to get calendar platform counts", err)
		return CalendarMonth{}, ErrInvalidCalendarParams
	}

	// Index platform rows by day for O(1) lookup during merge.
	platformByDay := make(map[string][]store.CalendarPlatformRow, len(platformRows))
	for _, row := range platformRows {
		platformByDay[row.Day] = append(platformByDay[row.Day], row)
	}

	// Collect all days that appear in either result set.
	daySet := make(map[string]struct{}, len(statusRows))
	for _, row := range statusRows {
		daySet[row.Day] = struct{}{}
	}
	for _, row := range platformRows {
		daySet[row.Day] = struct{}{}
	}

	// Build a lookup for status rows.
	statusByDay := make(map[string]store.CalendarStatusRow, len(statusRows))
	for _, row := range statusRows {
		statusByDay[row.Day] = row
	}

	days := make([]CalendarDay, 0, len(daySet))
	var totStatus StatusBreakdown
	var totPlatform PlatformBreakdown

	// Sort days so the response is deterministic.
	sortedDays := make([]string, 0, len(daySet))
	for day := range daySet {
		sortedDays = append(sortedDays, day)
	}
	// Simple insertion sort — days are YYYY-MM-DD so lexicographic == chronological.
	for i := 1; i < len(sortedDays); i++ {
		for j := i; j > 0 && sortedDays[j] < sortedDays[j-1]; j-- {
			sortedDays[j], sortedDays[j-1] = sortedDays[j-1], sortedDays[j]
		}
	}

	for _, day := range sortedDays {
		var bySt StatusBreakdown
		if sr, ok := statusByDay[day]; ok {
			bySt = StatusBreakdown{
				Draft:              sr.StatusDraft,
				Scheduled:          sr.StatusScheduled,
				Publishing:         sr.StatusPublishing,
				Published:          sr.StatusPublished,
				Failed:             sr.StatusFailed,
				PartiallyPublished: sr.StatusPartial,
			}
		}
		totStatus.Draft += bySt.Draft
		totStatus.Scheduled += bySt.Scheduled
		totStatus.Publishing += bySt.Publishing
		totStatus.Published += bySt.Published
		totStatus.Failed += bySt.Failed
		totStatus.PartiallyPublished += bySt.PartiallyPublished

		var byPl PlatformBreakdown
		for _, pr := range platformByDay[day] {
			addPlatformCount(&byPl, pr.Platform, pr.Count)
			addPlatformCount(&totPlatform, pr.Platform, pr.Count)
		}

		days = append(days, CalendarDay{
			Date:       day,
			ByStatus:   bySt,
			ByPlatform: byPl,
		})
	}

	result := CalendarMonth{
		Month: fmt.Sprintf("%04d-%02d", year, month),
		Days:  days,
	}
	result.MonthTotals.ByStatus = totStatus
	result.MonthTotals.ByPlatform = totPlatform
	return result, nil
}

// addPlatformCount increments the correct field of a PlatformBreakdown.
func addPlatformCount(pb *PlatformBreakdown, platform string, n int) {
	switch platform {
	case store.PlatformX:
		pb.X += n
	case store.PlatformLinkedIn:
		pb.LinkedIn += n
	case store.PlatformBlueSky:
		pb.BlueSky += n
	case store.PlatformFacebook:
		pb.Facebook += n
	case store.PlatformInstagram:
		pb.Instagram += n
	case store.PlatformThreads:
		pb.Threads += n
	case store.PlatformTikTok:
		pb.TikTok += n
	case store.PlatformPinterest:
		pb.Pinterest += n
	}
}

// AnalyticsSnapshot is one metrics point in a history slice or latest reading.
type AnalyticsSnapshot struct {
	Impressions int       `json:"impressions"`
	Likes       int       `json:"likes"`
	Comments    int       `json:"comments"`
	Shares      int       `json:"shares"`
	Clicks      int       `json:"clicks"`
	CollectedAt time.Time `json:"collected_at"`
}

// PlatformPostAnalytics is the per-platform block in GetPostAnalyticsResult.
type PlatformPostAnalytics struct {
	PlatformPostID         string              `json:"platform_post_id"`
	Platform               string              `json:"platform"`
	Status                 string              `json:"status"`
	PublishedAt            *time.Time          `json:"published_at"`
	PostURL                *string             `json:"post_url"`
	AnalyticsUnavailableAt *time.Time          `json:"analytics_unavailable_at"`
	Latest                 *AnalyticsSnapshot  `json:"latest"`
	History                []AnalyticsSnapshot `json:"history"`
}

// GetPostAnalyticsResult is the response shape for HandleGetPostAnalytics.
type GetPostAnalyticsResult struct {
	PlatformPosts []PlatformPostAnalytics `json:"platform_posts"`
}

// buildPostURL constructs a human-readable URL for a published platform post
// from the raw platform_post_id string. Returns nil when platformPostIDStr is
// nil or empty, or when the platform doesn't have a deterministic URL shape.
func buildPostURL(platform string, platformPostIDStr *string) *string {
	if platformPostIDStr == nil || *platformPostIDStr == "" {
		return nil
	}
	id := *platformPostIDStr
	var u string
	switch platform {
	case store.PlatformX:
		u = "https://x.com/i/web/status/" + id
	case store.PlatformBlueSky:
		// BlueSky AT URIs are not direct web URLs; skip rather than expose raw AT URI.
		return nil
	case store.PlatformThreads:
		u = "https://www.threads.net/t/" + id
	default:
		return nil
	}
	return &u
}

// GetPostAnalytics returns per-platform analytics for a single post. It first
// verifies the post belongs to the caller's account, then fetches each
// platform_post's latest snapshot and full history.
func (p *PostProcessor) GetPostAnalytics(ctx context.Context, accountID, postID uuid.UUID) (GetPostAnalyticsResult, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "operation", Value: "get_post_analytics"},
	)

	// Verify ownership.
	if _, err := p.store.GetPostByID(ctx, accountID, postID); err != nil {
		p.logger.Error(ctx, "failed to verify post ownership for analytics", err)
		if errors.Is(err, store.ErrNotFound) {
			return GetPostAnalyticsResult{}, ErrPostNotFound
		}
		return GetPostAnalyticsResult{}, ErrFailedGetPostAnalytics
	}

	latestRows, err := p.store.GetLatestAnalyticsByPost(ctx, postID)
	if err != nil {
		p.logger.Error(ctx, "failed to get latest analytics by post", err)
		return GetPostAnalyticsResult{}, ErrFailedGetPostAnalytics
	}

	platformPosts := make([]PlatformPostAnalytics, 0, len(latestRows))
	for _, row := range latestRows {
		var latest *AnalyticsSnapshot
		if row.CollectedAt != nil {
			imp := 0
			if row.Impressions != nil {
				imp = *row.Impressions
			}
			lk := 0
			if row.Likes != nil {
				lk = *row.Likes
			}
			cm := 0
			if row.Comments != nil {
				cm = *row.Comments
			}
			sh := 0
			if row.Shares != nil {
				sh = *row.Shares
			}
			cl := 0
			if row.Clicks != nil {
				cl = *row.Clicks
			}
			latest = &AnalyticsSnapshot{
				Impressions: imp,
				Likes:       lk,
				Comments:    cm,
				Shares:      sh,
				Clicks:      cl,
				CollectedAt: *row.CollectedAt,
			}
		}

		historyRows, err := p.store.GetAnalyticsByPlatformPost(ctx, row.PlatformPostID)
		if err != nil {
			p.logger.Error(ctx, "failed to get analytics history for platform post", err)
			return GetPostAnalyticsResult{}, ErrFailedGetPostAnalytics
		}

		history := make([]AnalyticsSnapshot, 0, len(historyRows))
		for _, h := range historyRows {
			history = append(history, AnalyticsSnapshot{
				Impressions: h.Impressions,
				Likes:       h.Likes,
				Comments:    h.Comments,
				Shares:      h.Shares,
				Clicks:      h.Clicks,
				CollectedAt: h.CollectedAt,
			})
		}

		platformPosts = append(platformPosts, PlatformPostAnalytics{
			PlatformPostID:         row.PlatformPostID.String(),
			Platform:               row.Platform,
			Status:                 row.Status,
			PublishedAt:            row.PublishedAt,
			PostURL:                buildPostURL(row.Platform, row.PlatformPostIDStr),
			AnalyticsUnavailableAt: row.AnalyticsUnavailableAt,
			Latest:                 latest,
			History:                history,
		})
	}

	return GetPostAnalyticsResult{PlatformPosts: platformPosts}, nil
}

// generateTitle calls the AI titler with a fail-soft fallback.
// If content is empty, returns an empty string (caller should not set Title).
// If the AI call fails or returns empty, truncates the first line of content to 60 chars.
// Never blocks post creation.
func (p *PostProcessor) generateTitle(ctx context.Context, content string) string {
	if strings.TrimSpace(content) == "" {
		return ""
	}
	if p.titler != nil {
		title, err := p.titler.GenerateTitle(ctx, content)
		if err == nil && strings.TrimSpace(title) != "" {
			return strings.TrimSpace(title)
		}
		if err != nil {
			p.logger.Error(ctx, "failed to generate post title via ai; using fallback", err)
		}
	}
	// Fallback: first line of content, capped at 60 chars.
	line := strings.SplitN(strings.TrimSpace(content), "\n", 2)[0]
	if len(line) > 60 {
		line = line[:60]
	}
	return line
}
