package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"base-server/internal/infra/clients/aiclient"
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
	ErrBlogPostNotFound      = errors.New("blog post not found")
	ErrSlugAlreadyExists     = errors.New("slug already exists")
	ErrBlogGenerationFailed  = errors.New("blog generation failed")
)

const (
	generateBlogMaxTokens = 8192
	generateBlogSystemPrompt = `You are a technical blog author. Write engaging, first-person blog posts on the given topic. Cover the subject thoroughly with clear explanations, examples, and insights.

Respond with a single JSON object and nothing else. The object must have these fields:
- "title": string — blog post title
- "content": string — full blog post in Markdown, starting with a # heading, using H2 sections
- "excerpt": string — one-sentence summary (max 200 chars)
- "seo_title": string — SEO-optimised title (max 60 chars)
- "meta_description": string — meta description (max 160 chars)
- "keywords": array of strings — 3–8 relevant keywords
- "og_title": string — Open Graph title (max 60 chars)
- "og_description": string — Open Graph description (max 200 chars)

No markdown fences, no preamble — raw JSON only.`
)

// blogGenJSONResponse is the expected JSON structure returned by the AI.
type blogGenJSONResponse struct {
	Title           string   `json:"title"`
	Content         string   `json:"content"`
	Excerpt         string   `json:"excerpt"`
	SEOTitle        string   `json:"seo_title"`
	MetaDescription string   `json:"meta_description"`
	Keywords        []string `json:"keywords"`
	OGTitle         string   `json:"og_title"`
	OGDescription   string   `json:"og_description"`
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
	store  BlogStore
	ai     aiclient.Client
	logger *observability.Logger
}

func New(store BlogStore, ai aiclient.Client, logger *observability.Logger) BlogProcessor {
	return BlogProcessor{
		store:  store,
		ai:     ai,
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

// GenerateBlogPost uses the AI to generate a blog post from the given
// instruction and keywords, then persists it as a draft. mediaIDs are stored
// with the post so the frontend can reconstruct thumbnails.
func (p *BlogProcessor) GenerateBlogPost(ctx context.Context, accountID uuid.UUID, instruction string, keywords []string, mediaIDs []uuid.UUID) (store.BlogPost, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "operation", Value: "generate_blog_post"},
	)

	userMsg := buildGenerateBlogUserMessage(instruction, keywords)
	rawOutput, err := p.ai.CreateMessage(ctx, generateBlogSystemPrompt, []aiclient.Message{
		{Role: "user", Content: userMsg},
	}, generateBlogMaxTokens)
	if err != nil {
		p.logger.Error(ctx, "AI blog generation failed", err)
		return store.BlogPost{}, ErrBlogGenerationFailed
	}

	var resp blogGenJSONResponse
	if parseErr := json.Unmarshal([]byte(strings.TrimSpace(rawOutput)), &resp); parseErr != nil {
		p.logger.Error(ctx, "failed to parse blog generation JSON", fmt.Errorf("parse: %w, raw length=%d", parseErr, len(rawOutput)))
		return store.BlogPost{}, ErrBlogGenerationFailed
	}

	if resp.Title == "" || resp.Content == "" {
		p.logger.Error(ctx, "blog generation JSON missing title or content", fmt.Errorf("raw length=%d", len(rawOutput)))
		return store.BlogPost{}, ErrBlogGenerationFailed
	}

	slug, err := p.blogResolveUniqueSlug(ctx, accountID, blogSlugify(resp.Title))
	if err != nil {
		p.logger.Error(ctx, "failed to resolve unique slug", err)
		return store.BlogPost{}, ErrBlogGenerationFailed
	}

	kws := store.StringArray(resp.Keywords)
	if kws == nil {
		kws = store.StringArray{}
	}
	mids := store.UUIDArray(mediaIDs)
	if mids == nil {
		mids = store.UUIDArray{}
	}

	params := store.CreateBlogPostParams{
		AccountID:         accountID,
		Title:             resp.Title,
		Slug:              slug,
		Content:           resp.Content,
		Status:            store.BlogStatusDraft,
		Keywords:          kws,
		MediaIDs:          mids,
		SourceInstruction: &instruction,
	}
	if resp.Excerpt != "" {
		params.Excerpt = &resp.Excerpt
	}
	if resp.SEOTitle != "" {
		params.SEOTitle = &resp.SEOTitle
	}
	if resp.MetaDescription != "" {
		params.MetaDescription = &resp.MetaDescription
	}
	if resp.OGTitle != "" {
		params.OGTitle = &resp.OGTitle
	}
	if resp.OGDescription != "" {
		params.OGDescription = &resp.OGDescription
	}

	post, err := p.store.CreateBlogPost(ctx, params)
	if err != nil {
		p.logger.Error(ctx, "failed to persist generated blog post", err)
		return store.BlogPost{}, ErrBlogGenerationFailed
	}
	return post, nil
}

// buildGenerateBlogUserMessage formats the user instruction + keywords for the AI.
func buildGenerateBlogUserMessage(instruction string, keywords []string) string {
	var b strings.Builder
	b.WriteString("Topic / Instructions:\n")
	b.WriteString(instruction)
	if len(keywords) > 0 {
		b.WriteString("\n\nKeywords: ")
		b.WriteString(strings.Join(keywords, ", "))
	}
	return b.String()
}
