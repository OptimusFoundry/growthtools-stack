// Package blog generates blog posts using the AI. It is a pure AI library:
// it has no store, no HTTP, and no presigning. The blog/processor wraps it
// and handles persistence.
package blog

//go:generate go run go.uber.org/mock/mockgen@latest -source=blog.go -destination=mocks_test.go -package=blog

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"base-server/internal/ai/mediadescriber"
	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
)

// AIClient is the subset of aiclient.Client used by this package.
type AIClient interface {
	CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
	StreamJSONMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error
}

var ErrGenerate = errors.New("blog: generation failed")

// MediaItem pairs a Description (for alt text) with a presigned URL to bake
// into the generated markdown. The caller is responsible for presigning.
type MediaItem struct {
	Description mediadescriber.Description
	URL         string // presigned HTTPS URL
}

// Request is the input to Generate and GenerateStream.
type Request struct {
	Prompt   string
	Keywords []string
	Media    []MediaItem
}

// Result is the parsed AI output.
type Result struct {
	Title           string
	Content         string // markdown
	Excerpt         string
	SEOTitle        string
	MetaDescription string
	Keywords        []string
	OGTitle         string
	OGDescription   string
}

// BlogEvent is the streaming event sum type for blog generation.
type BlogEvent interface{ isBlogEvent() }

// BlogChunkEvent carries one streamed AI token.
type BlogChunkEvent struct{ Chunk string }

// BlogDoneEvent signals successful completion with the parsed result.
type BlogDoneEvent struct{ Result Result }

// BlogErrorEvent is the terminal error event.
type BlogErrorEvent struct{ Err error }

func (BlogChunkEvent) isBlogEvent() {}
func (BlogDoneEvent)  isBlogEvent() {}
func (BlogErrorEvent) isBlogEvent() {}

const (
	generateMaxTokens = 8192
	systemPrompt      = `You are a technical blog author. Write engaging, first-person blog posts on the given topic. Cover the subject thoroughly with clear explanations, examples, and insights.

If the user provides attached images, embed EVERY image inline in the "content" markdown using the exact syntax ` + "`![alt](url)`" + ` on its own line, placed at a natural spot in the narrative where it reinforces the surrounding prose. Write descriptive alt text. Do not skip images and do not invent URLs — use only the URLs the user provided.

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

type jsonResponse struct {
	Title           string   `json:"title"`
	Content         string   `json:"content"`
	Excerpt         string   `json:"excerpt"`
	SEOTitle        string   `json:"seo_title"`
	MetaDescription string   `json:"meta_description"`
	Keywords        []string `json:"keywords"`
	OGTitle         string   `json:"og_title"`
	OGDescription   string   `json:"og_description"`
}

// Generator creates blog posts using the AI.
type Generator struct {
	aiClient AIClient
	logger   *observability.Logger
}

// New creates a Generator.
func New(aiClient AIClient, logger *observability.Logger) *Generator {
	return &Generator{aiClient: aiClient, logger: logger}
}

// Generate creates a blog post synchronously.
func (g *Generator) Generate(ctx context.Context, req Request) (Result, error) {
	ctx = observability.WithFields(ctx, observability.Field{Key: "operation", Value: "blog_generate"})
	userMsg := buildUserMessage(req)
	raw, err := g.aiClient.CreateMessage(ctx, systemPrompt, []aiclient.Message{{Role: "user", Content: userMsg}}, generateMaxTokens)
	if err != nil {
		g.logger.Error(ctx, "AI blog generation failed", err)
		return Result{}, ErrGenerate
	}
	return parseResult(ctx, g.logger, raw)
}

// GenerateStream streams blog generation events. Setup failures return a
// synchronous error. Runtime failures are sent as BlogErrorEvent and the
// channel is closed.
func (g *Generator) GenerateStream(ctx context.Context, req Request) (<-chan BlogEvent, error) {
	ch := make(chan BlogEvent, 32)
	go func() {
		defer close(ch)
		g.runStream(ctx, req, ch)
	}()
	return ch, nil
}

func (g *Generator) runStream(ctx context.Context, req Request, ch chan<- BlogEvent) {
	ctx = observability.WithFields(ctx, observability.Field{Key: "operation", Value: "blog_generate_stream"})
	userMsg := buildUserMessage(req)

	var rawBuilder strings.Builder
	err := g.aiClient.StreamJSONMessage(ctx, systemPrompt, []aiclient.Message{{Role: "user", Content: userMsg}}, generateMaxTokens, func(chunk string) {
		rawBuilder.WriteString(chunk)
		ch <- BlogChunkEvent{Chunk: chunk}
	})
	if err != nil {
		g.logger.Error(ctx, "AI blog stream failed", err)
		ch <- BlogErrorEvent{Err: ErrGenerate}
		return
	}

	result, err := parseResult(ctx, g.logger, rawBuilder.String())
	if err != nil {
		ch <- BlogErrorEvent{Err: err}
		return
	}
	ch <- BlogDoneEvent{Result: result}
}

func parseResult(ctx context.Context, logger *observability.Logger, raw string) (Result, error) {
	var resp jsonResponse
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &resp); err != nil {
		logger.Error(ctx, "failed to parse blog generation JSON", err)
		return Result{}, ErrGenerate
	}
	if resp.Title == "" || resp.Content == "" {
		logger.Error(ctx, "blog generation JSON missing title or content", nil)
		return Result{}, ErrGenerate
	}
	return Result{
		Title:           resp.Title,
		Content:         resp.Content,
		Excerpt:         resp.Excerpt,
		SEOTitle:        resp.SEOTitle,
		MetaDescription: resp.MetaDescription,
		Keywords:        resp.Keywords,
		OGTitle:         resp.OGTitle,
		OGDescription:   resp.OGDescription,
	}, nil
}

func buildUserMessage(req Request) string {
	var b strings.Builder
	b.WriteString("Topic / Instructions:\n")
	b.WriteString(req.Prompt)
	if len(req.Keywords) > 0 {
		b.WriteString("\n\nKeywords: ")
		b.WriteString(strings.Join(req.Keywords, ", "))
	}
	if len(req.Media) > 0 {
		b.WriteString("\n\nAttached images (embed EVERY one inline in the content markdown using `![alt](url)`):\n")
		for i, item := range req.Media {
			alt := item.Description.Description
			fmt.Fprintf(&b, "%d. url=%s", i+1, item.URL)
			if alt != "" {
				fmt.Fprintf(&b, " alt=%q", alt)
			}
			b.WriteString("\n")
		}
	}
	return b.String()
}
