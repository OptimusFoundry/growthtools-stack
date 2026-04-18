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
	blogExcerptMax     = 200
	// blogMaxOutputTokens caps Gemini output. 2.5 Flash supports up to 65k
	// output; 8k is enough for a long-form blog post and keeps latency +
	// cost predictable.
	blogMaxOutputTokens = 8192
	blogSystemPrompt    = "You are a technical engineering blog author. Write detailed, first-person blog posts about software changes. Cover what was built, why architectural decisions were made, what tradeoffs existed, and what the implementation looks like. Be specific — reference actual code, file names, and design patterns from the diff. Output raw markdown only, starting with a `# Title` heading. Use H2 sections. No preamble, no meta-commentary."
)

var (
	ErrBlogGuardTripped     = errors.New("blog generation guard tripped")
	ErrBlogGenerationFailed = errors.New("failed to generate blog from commit")
)

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
	rawOutput, err := g.ai.CreateMessage(ctx, blogSystemPrompt, []aiclient.Message{
		{Role: "user", Content: userMessage, Images: images},
	}, blogMaxOutputTokens)
	if err != nil {
		g.logger.Error(ctx, "gemini blog generation failed", err)
		return ErrBlogGenerationFailed
	}

	title, excerpt, content := parseBlogResponse(rawOutput)
	if title == "" || content == "" {
		g.logger.Error(ctx, "gemini blog response missing title or content", fmt.Errorf("raw length=%d", len(rawOutput)))
		return ErrBlogGenerationFailed
	}

	slug, err := g.resolveUniqueSlug(ctx, commit.AccountID, slugify(title))
	if err != nil {
		g.logger.Error(ctx, "failed to resolve unique slug", err)
		return ErrBlogGenerationFailed
	}

	params := store.CreateBlogPostParams{
		AccountID: commit.AccountID,
		Title:     title,
		Slug:      slug,
		Content:   content,
		Status:    store.BlogStatusDraft,
		Keywords:  store.StringArray{},
	}
	if excerpt != "" {
		params.Excerpt = &excerpt
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

// parseBlogResponse extracts (title, excerpt, content) from a markdown
// response. Title: first `# ...` heading. Excerpt: first non-heading,
// non-empty paragraph, truncated to blogExcerptMax chars. Content: the
// full raw markdown, unchanged.
func parseBlogResponse(raw string) (title, excerpt, content string) {
	content = strings.TrimSpace(raw)
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "# ") {
			title = strings.TrimSpace(strings.TrimPrefix(trimmed, "# "))
			break
		}
	}
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}
		excerpt = trimmed
		break
	}
	if len([]rune(excerpt)) > blogExcerptMax {
		runes := []rune(excerpt)
		excerpt = string(runes[:blogExcerptMax])
	}
	return title, excerpt, content
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
