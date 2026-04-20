package processor

// mocks_test.go is hand-rolled (function-field style) — do not `go generate`
// against this file, it would overwrite the mocks the tests rely on.

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	aiblog "base-server/internal/ai/blog"
	"base-server/internal/ai/mediadescriber"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// URLSigner turns an s3 object key into a time-limited HTTPS URL. Same shape
// as media/processor.URLSigner — declared locally to avoid an import cycle.
type URLSigner interface {
	PresignGetURL(ctx context.Context, key string, ttl time.Duration) (string, error)
}

// BlogGenerator is the interface for the AI blog generator.
type BlogGenerator interface {
	Generate(ctx context.Context, req aiblog.Request) (aiblog.Result, error)
	GenerateStream(ctx context.Context, req aiblog.Request) (<-chan aiblog.BlogEvent, error)
}

// blogMediaPresignTTL is intentionally long because the URL gets baked into
// the stored markdown. One hour (the media-processor default) would make
// images 404 almost immediately. Until we switch to a stable public-media
// route, a 7-day window at least survives the authoring session and the
// first day of the post being live.
const blogMediaPresignTTL = 7 * 24 * time.Hour

// BlogStore defines the database operations required by BlogProcessor
type BlogStore interface {
	CreateBlogPost(ctx context.Context, params store.CreateBlogPostParams) (store.BlogPost, error)
	GetBlogPostByID(ctx context.Context, accountID, postID uuid.UUID) (store.BlogPost, error)
	GetBlogPostBySlug(ctx context.Context, accountID uuid.UUID, slug string) (store.BlogPost, error)
	ListBlogPosts(ctx context.Context, accountID uuid.UUID, status *string, limit, offset int) ([]store.BlogPostListItem, error)
	UpdateBlogPost(ctx context.Context, accountID, id uuid.UUID, params store.UpdateBlogPostParams) (store.BlogPost, error)
	DeleteBlogPost(ctx context.Context, accountID, postID uuid.UUID) error
	PublishBlogPost(ctx context.Context, accountID, id uuid.UUID) (store.BlogPost, error)
	GetMediaByIDs(ctx context.Context, ids []uuid.UUID) ([]store.Media, error)
}

var (
	ErrBlogPostNotFound     = errors.New("blog post not found")
	ErrSlugAlreadyExists    = errors.New("slug already exists")
	ErrBlogGenerationFailed = errors.New("blog generation failed")
)

// BlogStreamCallbacks holds callbacks for streaming blog generation.
type BlogStreamCallbacks struct {
	OnPhase func(phase string)        // phases: "generating", "done"
	OnChunk func(chunk string)        // raw markdown delta from AI
	OnDone  func(post store.BlogPost) // final persisted post (media_ids only — frontend already has media metadata locally)
	OnError func(err error)           // terminal error — no further callbacks fire
}

// BlogPostWithMedia bundles a blog post with its attached media, hydrated
// (and presigned) on the server so the editor doesn't need a second roundtrip
// to render thumbnails. Mirrors PostWithPlatformPosts in posts/processor.
type BlogPostWithMedia struct {
	Post  store.BlogPost `json:"post"`
	Media []store.Media  `json:"media"`
}

// blogSlugPattern strips everything that is not a-z0-9.
var blogSlugPattern = regexp.MustCompile(`[^a-z0-9]+`)

// blogSlugify lowercases, replaces runs of non-alphanumerics with hyphens, and
// trims leading / trailing hyphens. Empty result defaults to "post".
func blogSlugify(title string) string {
	s := strings.ToLower(strings.TrimSpace(title))
	s = blogSlugPattern.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "post"
	}
	return s
}

// blogResolveUniqueSlug looks up the natural slug once. If it is free, return
// it. If a row already owns it for this account, append an 8-character UUID
// suffix and return that. No retry loop — the suffix is effectively
// collision-free.
func (p *BlogProcessor) blogResolveUniqueSlug(ctx context.Context, accountID uuid.UUID, base string) (string, error) {
	_, err := p.store.GetBlogPostBySlug(ctx, accountID, base)
	if errors.Is(err, store.ErrNotFound) {
		return base, nil
	}
	if err != nil {
		return "", err
	}
	suffix := strings.ReplaceAll(uuid.New().String(), "-", "")[:8]
	return fmt.Sprintf("%s-%s", base, suffix), nil
}

type BlogProcessor struct {
	store     BlogStore
	blogGen   BlogGenerator
	urlSigner URLSigner
	logger    *observability.Logger
}

func New(store BlogStore, blogGen BlogGenerator, logger *observability.Logger) BlogProcessor {
	return BlogProcessor{
		store:   store,
		blogGen: blogGen,
		logger:  logger,
	}
}

// SetURLSigner wires the presigner used to turn `s3://` media URLs into
// browser-resolvable HTTPS URLs before they're baked into generated markdown.
// Matches the setter pattern used by media/workers processors. Optional — if
// nil, `s3://` URLs are skipped.
func (p *BlogProcessor) SetURLSigner(signer URLSigner) {
	p.urlSigner = signer
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

func (p *BlogProcessor) GetBlogPost(ctx context.Context, accountID, postID uuid.UUID) (BlogPostWithMedia, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "operation", Value: "get_blog_post"},
	)

	post, err := p.store.GetBlogPostByID(ctx, accountID, postID)
	if err != nil {
		p.logger.Error(ctx, "failed to get blog post", err)
		if errors.Is(err, store.ErrNotFound) {
			return BlogPostWithMedia{}, ErrBlogPostNotFound
		}
		return BlogPostWithMedia{}, err
	}

	media := p.hydrateBlogMedia(ctx, post.MediaIDs)
	return BlogPostWithMedia{Post: post, Media: media}, nil
}

// hydrateBlogMedia loads media rows for the given IDs and presigns any `s3://`
// URLs so the editor can render thumbnails directly. Errors are logged and the
// media slice is returned empty rather than failing the request — missing
// thumbnails are a degraded UX, not a fatal one.
func (p *BlogProcessor) hydrateBlogMedia(ctx context.Context, ids store.UUIDArray) []store.Media {
	out := make([]store.Media, 0)
	if len(ids) == 0 {
		return out
	}
	fetched, err := p.store.GetMediaByIDs(ctx, []uuid.UUID(ids))
	if err != nil {
		p.logger.Error(ctx, "failed to load media for blog post", err)
		return out
	}
	for i := range fetched {
		p.presignBlogMedia(ctx, &fetched[i])
	}
	return fetched
}

// presignBlogMedia rewrites an `s3://` media URL to a presigned HTTPS URL in
// place. Non-`s3://` URLs are left alone. Errors are logged and the URL is
// left unchanged — same policy as posts/processor.presignMediaURL.
func (p *BlogProcessor) presignBlogMedia(ctx context.Context, m *store.Media) {
	if p.urlSigner == nil || m == nil || !strings.HasPrefix(m.S3URL, "s3://") {
		return
	}
	signed, err := p.urlSigner.PresignGetURL(ctx, m.S3Key, blogMediaPresignTTL)
	if err != nil {
		p.logger.Error(ctx, "failed to presign media url for blog response", err)
		return
	}
	m.S3URL = signed
}

func (p *BlogProcessor) ListBlogPosts(ctx context.Context, accountID uuid.UUID, status *string, limit, offset int) ([]store.BlogPostListItem, error) {
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

// GenerateBlogPost uses the AI to generate a blog post from the given
// instruction and keywords, then persists it as a draft. mediaIDs are stored
// with the post so the frontend can reconstruct thumbnails.
func (p *BlogProcessor) GenerateBlogPost(ctx context.Context, accountID uuid.UUID, instruction string, keywords []string, mediaIDs []uuid.UUID) (store.BlogPost, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "operation", Value: "generate_blog_post"},
	)

	mediaItems := p.buildMediaItems(ctx, mediaIDs)
	req := aiblog.Request{Prompt: instruction, Keywords: keywords, Media: mediaItems}

	result, err := p.blogGen.Generate(ctx, req)
	if err != nil {
		p.logger.Error(ctx, "blog AI generation failed", err)
		return store.BlogPost{}, ErrBlogGenerationFailed
	}

	slug, err := p.blogResolveUniqueSlug(ctx, accountID, blogSlugify(result.Title))
	if err != nil {
		p.logger.Error(ctx, "failed to resolve unique slug", err)
		return store.BlogPost{}, ErrBlogGenerationFailed
	}

	kws := store.StringArray(result.Keywords)
	if kws == nil {
		kws = store.StringArray{}
	}
	mids := store.UUIDArray(mediaIDs)
	if mids == nil {
		mids = store.UUIDArray{}
	}

	params := store.CreateBlogPostParams{
		AccountID:         accountID,
		Title:             result.Title,
		Slug:              slug,
		Content:           result.Content,
		Status:            store.BlogStatusDraft,
		Keywords:          kws,
		MediaIDs:          mids,
		SourceInstruction: &instruction,
	}
	if result.Excerpt != "" {
		params.Excerpt = &result.Excerpt
	}
	if result.SEOTitle != "" {
		params.SEOTitle = &result.SEOTitle
	}
	if result.MetaDescription != "" {
		params.MetaDescription = &result.MetaDescription
	}
	if result.OGTitle != "" {
		params.OGTitle = &result.OGTitle
	}
	if result.OGDescription != "" {
		params.OGDescription = &result.OGDescription
	}

	post, err := p.store.CreateBlogPost(ctx, params)
	if err != nil {
		p.logger.Error(ctx, "failed to persist generated blog post", err)
		return store.BlogPost{}, ErrBlogGenerationFailed
	}
	return post, nil
}

// StreamGenerateBlogPost streams blog post generation via AI and persists the
// result atomically once the full response is validated. Callbacks are invoked
// as generation progresses: OnPhase("generating") before streaming starts,
// OnChunk for each AI token, OnPhase("done") and OnDone after DB persist.
// OnError is called on any terminal error; no further callbacks fire after it.
func (p *BlogProcessor) StreamGenerateBlogPost(
	ctx context.Context,
	accountID uuid.UUID,
	instruction string,
	keywords []string,
	mediaIDs []uuid.UUID,
	cb BlogStreamCallbacks,
) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "operation", Value: "stream_generate_blog_post"},
	)

	mediaItems := p.buildMediaItems(ctx, mediaIDs)
	cb.OnPhase("generating")

	ch, _ := p.blogGen.GenerateStream(ctx, aiblog.Request{Prompt: instruction, Keywords: keywords, Media: mediaItems})
	for evt := range ch {
		switch e := evt.(type) {
		case aiblog.BlogChunkEvent:
			cb.OnChunk(e.Chunk)
		case aiblog.BlogDoneEvent:
			slug, err := p.blogResolveUniqueSlug(ctx, accountID, blogSlugify(e.Result.Title))
			if err != nil {
				p.logger.Error(ctx, "failed to resolve unique slug", err)
				cb.OnError(ErrBlogGenerationFailed)
				return ErrBlogGenerationFailed
			}

			kws := store.StringArray(e.Result.Keywords)
			if kws == nil {
				kws = store.StringArray{}
			}
			mids := store.UUIDArray(mediaIDs)
			if mids == nil {
				mids = store.UUIDArray{}
			}

			params := store.CreateBlogPostParams{
				AccountID:         accountID,
				Title:             e.Result.Title,
				Slug:              slug,
				Content:           e.Result.Content,
				Status:            store.BlogStatusDraft,
				Keywords:          kws,
				MediaIDs:          mids,
				SourceInstruction: &instruction,
			}
			if e.Result.Excerpt != "" {
				params.Excerpt = &e.Result.Excerpt
			}
			if e.Result.SEOTitle != "" {
				params.SEOTitle = &e.Result.SEOTitle
			}
			if e.Result.MetaDescription != "" {
				params.MetaDescription = &e.Result.MetaDescription
			}
			if e.Result.OGTitle != "" {
				params.OGTitle = &e.Result.OGTitle
			}
			if e.Result.OGDescription != "" {
				params.OGDescription = &e.Result.OGDescription
			}

			post, err := p.store.CreateBlogPost(ctx, params)
			if err != nil {
				p.logger.Error(ctx, "failed to persist generated blog post", err)
				cb.OnError(ErrBlogGenerationFailed)
				return ErrBlogGenerationFailed
			}

			cb.OnPhase("done")
			cb.OnDone(post)
		case aiblog.BlogErrorEvent:
			cb.OnError(e.Err)
			return e.Err
		}
	}
	return nil
}

// buildMediaItems converts store media rows into aiblog.MediaItem, presigning
// URLs and populating descriptions from alt text. Images and videos that can't
// be presigned are skipped.
func (p *BlogProcessor) buildMediaItems(ctx context.Context, mediaIDs []uuid.UUID) []aiblog.MediaItem {
	if len(mediaIDs) == 0 {
		return nil
	}
	media, err := p.store.GetMediaByIDs(ctx, mediaIDs)
	if err != nil {
		p.logger.Error(ctx, "failed to load media for blog generation", err)
		return nil
	}
	out := make([]aiblog.MediaItem, 0, len(media))
	for _, m := range media {
		url := m.S3URL
		if strings.HasPrefix(url, "s3://") {
			if p.urlSigner == nil {
				continue
			}
			signed, err := p.urlSigner.PresignGetURL(ctx, m.S3Key, blogMediaPresignTTL)
			if err != nil {
				p.logger.Error(ctx, "failed to presign media url for blog generation", err)
				continue
			}
			url = signed
		}

		// Build description from alt text if available.
		desc := mediadescriber.Description{Usable: false}
		if m.AltText != nil && *m.AltText != "" {
			desc = mediadescriber.Description{
				Description: *m.AltText,
				Usable:      true,
			}
		}

		out = append(out, aiblog.MediaItem{
			Description: desc,
			URL:         url,
		})
	}
	return out
}
