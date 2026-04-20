package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=blog.go -destination=blog_mocks_test.go -package=processor

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"regexp"
	"strings"

	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

const (
	blogMaxScreenshots = 5
	// blogMaxOutputTokens caps Gemini output. Raised to 200k to give headroom
	// well above the target post length so truncation cannot produce malformed
	// JSON. The prompt constrains actual length to a ~3 minute read.
	blogMaxOutputTokens = 200000
	blogSystemPrompt    = `You are a technical engineering blog author. Write detailed, first-person blog posts about software changes. Cover what was built, why architectural decisions were made, what tradeoffs existed, and what the implementation looks like. Be specific — reference actual code, file names, and design patterns from the diff.

Length: aim for a ~3 minute read (roughly 600–750 words). Do not exceed 800 words. Be concise — cut anything that doesn't sharpen the narrative.

Respond with a single JSON object and nothing else. The object must have these fields:
- "title": string — blog post title
- "content": string — full blog post in Markdown, starting with a # heading, using H2 sections, 600–750 words
- "excerpt": string — one-sentence summary (max 200 chars)
- "seo_title": string — SEO-optimised title (max 60 chars)
- "meta_description": string — meta description (max 160 chars)
- "keywords": array of strings — 3–8 relevant keywords
- "og_title": string — Open Graph title (max 60 chars)
- "og_description": string — Open Graph description (max 200 chars)

No markdown fences, no preamble — raw JSON only.`
)

var (
	ErrBlogGuardTripped     = errors.New("blog generation guard tripped")
	ErrBlogGenerationFailed = errors.New("failed to generate blog from commit")
)

// blogJSONResponse is the expected JSON structure returned by the AI.
type blogJSONResponse struct {
	Title           string   `json:"title"`
	Content         string   `json:"content"`
	Excerpt         string   `json:"excerpt"`
	SEOTitle        string   `json:"seo_title"`
	MetaDescription string   `json:"meta_description"`
	Keywords        []string `json:"keywords"`
	OGTitle         string   `json:"og_title"`
	OGDescription   string   `json:"og_description"`
}

// BlogDraftStore is the slice of the store the blog generator needs.
type BlogDraftStore interface {
	GetGitHubCommitForBlog(ctx context.Context, commitID uuid.UUID) (store.GitHubCommitForBlog, error)
	UpdateGitHubCommitBlogPostID(ctx context.Context, commitID, blogPostID uuid.UUID) error
	CreateBlogPost(ctx context.Context, params store.CreateBlogPostParams) (store.BlogPost, error)
	GetBlogPostBySlug(ctx context.Context, accountID uuid.UUID, slug string) (store.BlogPost, error)
}

// GitHubDiffFetcher returns the full unified diff for a commit. Interface
// wrapper around the real GitHub REST client so tests can stub it.
type GitHubDiffFetcher interface {
	GetCommitDiff(ctx context.Context, token, owner, name, sha string) (string, error)
}

// BlogDraftGenerator turns a completed capture into a long-form markdown
// blog post draft.
type BlogDraftGenerator struct {
	store   BlogDraftStore
	ai      aiclient.Client
	s3Fetch S3Fetcher
	diffs   GitHubDiffFetcher
	logger  *observability.Logger
}

// NewBlogDraftGenerator wires the dependencies. s3Fetch may be nil (localdir
// deploy); the generator will skip screenshot attachment and call Gemini
// with the diff only.
func NewBlogDraftGenerator(
	st BlogDraftStore,
	ai aiclient.Client,
	s3Fetch S3Fetcher,
	diffs GitHubDiffFetcher,
	logger *observability.Logger,
) BlogDraftGenerator {
	return BlogDraftGenerator{
		store:   st,
		ai:      ai,
		s3Fetch: s3Fetch,
		diffs:   diffs,
		logger:  logger,
	}
}

// GenerateBlogFromCommit is the top-level flow invoked by the worker.
// Returns ErrBlogGuardTripped for expected no-ops so the worker can log at
// INFO. Hard failures return ErrBlogGenerationFailed.
func (g *BlogDraftGenerator) GenerateBlogFromCommit(ctx context.Context, commitID uuid.UUID) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "commit_id", Value: commitID.String()},
		observability.Field{Key: "operation", Value: "generate_blog_from_commit"},
	)

	commit, err := g.store.GetGitHubCommitForBlog(ctx, commitID)
	if err != nil {
		g.logger.Error(ctx, "failed to load commit for blog generation", err)
		return ErrBlogGenerationFailed
	}

	if commit.BlogPostID != nil {
		g.logger.Info(ctx, "commit already linked to a blog post; skipping blog generation")
		return ErrBlogGuardTripped
	}
	if commit.CaptureOutput == nil {
		g.logger.Info(ctx, "commit has no capture_output; skipping blog generation")
		return ErrBlogGuardTripped
	}

	var payload capturePayload
	if err := json.Unmarshal(*commit.CaptureOutput, &payload); err != nil {
		g.logger.Error(ctx, "failed to parse capture_output", err)
		return ErrBlogGenerationFailed
	}
	if payload.Error != "" {
		g.logger.Info(ctx, "capture output reports failure; skipping blog generation")
		return ErrBlogGuardTripped
	}

	// Full diff: re-fetched at generation time rather than pulled from the
	// webhook payload because push events only ship the commit metadata.
	diff, err := g.diffs.GetCommitDiff(ctx, commit.ConnectionAccessToken, commit.RepoOwner, commit.RepoName, commit.SHA)
	if err != nil {
		g.logger.Error(ctx, "failed to fetch commit diff", err)
		return ErrBlogGenerationFailed
	}

	// Screenshots: bucket the capture artefacts and pick up to N images.
	// Video is intentionally skipped — Gemini gets far more value from the
	// diff + screenshots than from a 30-second screen capture.
	_, imageKeys := bucketArtifacts(payload.Uploaded)
	if len(imageKeys) > blogMaxScreenshots {
		imageKeys = imageKeys[:blogMaxScreenshots]
	}
	images := make([]aiclient.ImageData, 0, len(imageKeys))
	if g.s3Fetch != nil {
		for _, key := range imageKeys {
			img, err := g.fetchImage(ctx, key)
			if err != nil {
				g.logger.Error(ctx, "failed to fetch capture image for blog; continuing without it", err)
				continue
			}
			images = append(images, img)
		}
	}

	userMessage := buildBlogUserMessage(commit, diff)
	rawOutput, err := g.ai.CreateJSONMessage(ctx, blogSystemPrompt, []aiclient.Message{
		{Role: "user", Content: userMessage, Images: images},
	}, blogMaxOutputTokens)
	if err != nil {
		g.logger.Error(ctx, "gemini blog generation failed", err)
		return ErrBlogGenerationFailed
	}

	var blogResp blogJSONResponse
	cleaned := extractJSONObject(rawOutput)
	if parseErr := json.Unmarshal([]byte(cleaned), &blogResp); parseErr != nil {
		snippet := rawSnippet(rawOutput, 400)
		g.logger.Error(ctx, "failed to parse blog JSON response",
			fmt.Errorf("parse: %w, raw length=%d, snippet=%s", parseErr, len(rawOutput), snippet))
		return ErrBlogGenerationFailed
	}

	if blogResp.Title == "" || blogResp.Content == "" {
		g.logger.Error(ctx, "blog JSON response missing title or content", fmt.Errorf("raw length=%d", len(rawOutput)))
		return ErrBlogGenerationFailed
	}

	slug, err := g.resolveUniqueSlug(ctx, commit.AccountID, slugify(blogResp.Title))
	if err != nil {
		g.logger.Error(ctx, "failed to resolve unique slug", err)
		return ErrBlogGenerationFailed
	}

	keywords := store.StringArray(blogResp.Keywords)
	if keywords == nil {
		keywords = store.StringArray{}
	}

	params := store.CreateBlogPostParams{
		AccountID:         commit.AccountID,
		Title:             blogResp.Title,
		Slug:              slug,
		Content:           blogResp.Content,
		Status:            store.BlogStatusDraft,
		Keywords:          keywords,
		MediaIDs:          store.UUIDArray{},
		SourceInstruction: &userMessage,
	}
	if blogResp.Excerpt != "" {
		params.Excerpt = &blogResp.Excerpt
	}
	if blogResp.SEOTitle != "" {
		params.SEOTitle = &blogResp.SEOTitle
	}
	if blogResp.MetaDescription != "" {
		params.MetaDescription = &blogResp.MetaDescription
	}
	if blogResp.OGTitle != "" {
		params.OGTitle = &blogResp.OGTitle
	}
	if blogResp.OGDescription != "" {
		params.OGDescription = &blogResp.OGDescription
	}

	bp, err := g.store.CreateBlogPost(ctx, params)
	if err != nil {
		g.logger.Error(ctx, "failed to persist blog post", err)
		return ErrBlogGenerationFailed
	}

	if err := g.store.UpdateGitHubCommitBlogPostID(ctx, commit.ID, bp.ID); err != nil {
		// Blog post is already persisted — log but don't surface: the user
		// can still see the draft on the Blog page.
		g.logger.Error(ctx, "failed to link commit to blog post", err)
	}
	return nil
}

// fetchImage downloads an image body from S3 and packages it for a
// multimodal AI request. Falls back to the extension-derived MIME type
// when S3 returns an empty / generic content-type.
func (g *BlogDraftGenerator) fetchImage(ctx context.Context, key string) (aiclient.ImageData, error) {
	body, contentType, err := g.s3Fetch.GetFile(ctx, key)
	if err != nil {
		return aiclient.ImageData{}, err
	}
	defer body.Close()
	data, err := io.ReadAll(body)
	if err != nil {
		return aiclient.ImageData{}, err
	}
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = contentTypeFor(key)
	}
	return aiclient.ImageData{MIMEType: contentType, Data: data}, nil
}

// buildBlogUserMessage formats the repo + commit + diff context for Gemini.
func buildBlogUserMessage(c store.GitHubCommitForBlog, diff string) string {
	branch := ""
	if c.Branch != nil {
		branch = *c.Branch
	}
	var b strings.Builder
	b.WriteString("Repo: ")
	b.WriteString(c.RepoOwner)
	b.WriteString("/")
	b.WriteString(c.RepoName)
	b.WriteString("\nBranch: ")
	b.WriteString(branch)
	b.WriteString("\nSHA: ")
	b.WriteString(c.SHA)
	b.WriteString("\nCommit message:\n")
	b.WriteString(c.Message)
	b.WriteString("\n\nFull diff:\n")
	b.WriteString(diff)
	return b.String()
}

// extractJSONObject pulls the JSON object substring from an AI response,
// tolerating markdown fences or surrounding prose. Falls back to the trimmed
// input when no braces are found so json.Unmarshal yields a useful error.
func extractJSONObject(raw string) string {
	s := strings.TrimSpace(raw)
	if strings.HasPrefix(s, "```") {
		s = strings.TrimPrefix(s, "```json")
		s = strings.TrimPrefix(s, "```")
		if idx := strings.LastIndex(s, "```"); idx != -1 {
			s = s[:idx]
		}
		s = strings.TrimSpace(s)
	}
	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start == -1 || end == -1 || end < start {
		return s
	}
	return s[start : end+1]
}

// rawSnippet returns a length-bounded excerpt of raw — first n and last n
// bytes, separated by an ellipsis when the input is longer than 2n. Used to
// log just enough of a malformed AI response to diagnose without blowing up
// log volume on long bodies.
func rawSnippet(raw string, n int) string {
	if len(raw) <= 2*n {
		return raw
	}
	return raw[:n] + "...[truncated]..." + raw[len(raw)-n:]
}

// slugPattern strips everything that is not a-z0-9.
var slugPattern = regexp.MustCompile(`[^a-z0-9]+`)

// slugify lowercases, replaces runs of non-alphanumerics with hyphens, and
// trims leading / trailing hyphens. Empty result defaults to "post".
func slugify(title string) string {
	s := strings.ToLower(strings.TrimSpace(title))
	s = slugPattern.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "post"
	}
	return s
}

// resolveUniqueSlug looks up the natural slug once. If it is free, return it.
// If a row already owns it for this account, append an 8-character UUID suffix
// and return that. No retry loop — the suffix is effectively collision-free.
func (g *BlogDraftGenerator) resolveUniqueSlug(ctx context.Context, accountID uuid.UUID, base string) (string, error) {
	_, err := g.store.GetBlogPostBySlug(ctx, accountID, base)
	if errors.Is(err, store.ErrNotFound) {
		return base, nil
	}
	if err != nil {
		return "", err
	}
	// Collision — derive a disambiguating suffix from a fresh UUID.
	suffix := strings.ReplaceAll(uuid.New().String(), "-", "")[:8]
	return fmt.Sprintf("%s-%s", base, suffix), nil
}
