// Package socialposts generates single posts and thread sequences for
// multiple social platforms, with optional streaming via a channel event sum type.
package socialposts

//go:generate go run go.uber.org/mock/mockgen@latest -source=socialposts.go -destination=mocks_test.go -package=socialposts

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"base-server/internal/ai/mediadescriber"
	"base-server/internal/ai/platforms"
	"base-server/internal/ai/socialposts/prompts"
	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"

	"golang.org/x/sync/errgroup"
)

// AIClient is the subset of aiclient.Client used by this package.
type AIClient interface {
	CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
	StreamMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error
}

var (
	ErrGenerate    = errors.New("socialposts: generation failed")
	ErrInvalidMode = errors.New("socialposts: mode must be 'single', 'thread', or 'text'")
	ErrNoPlatforms = errors.New("socialposts: at least one platform is required")
)

// Mode describes the post layout.
type Mode string

const (
	ModeSingle Mode = "single"
	ModeThread Mode = "thread"
	ModeText   Mode = "text" // alias for single; treated identically
)

// VoiceContext holds optional voice profile fields for prompt injection.
// Mirrors prompts.VoiceContext; declared here so callers don't import
// the internal prompts package directly.
type VoiceContext struct {
	Tone               string   `json:"tone,omitempty"`
	Style              string   `json:"style,omitempty"`
	Industry           string   `json:"industry,omitempty"`
	TargetAudience     string   `json:"target_audience,omitempty"`
	CustomInstructions string   `json:"custom_instructions,omitempty"`
	ExamplePosts       []string `json:"example_posts,omitempty"`
}

// Request is the input to Generate and GenerateStream.
type Request struct {
	Prompt      string
	BaseContent string   // optional; when empty, generator produces base content first
	Platforms   []string // e.g. ["x", "linkedin"]
	Mode        Mode     // required; caller decides — handler validates this
	ThreadParts int      // required when Mode=="thread" (2–3); 0 = use platform default
	Media       []mediadescriber.Description
	Voice       *VoiceContext
}

// Segment is a thread-segment sum type.
type Segment interface{ isSegment() }

// TextSegment is a thread part with no media attachment.
type TextSegment struct{ Content string }

// MediaSegment is a thread part with a media attachment.
// ImageIndex is 1-based into Request.Media.
type MediaSegment struct {
	Content    string
	ImageIndex int
}

func (TextSegment)  isSegment() {}
func (MediaSegment) isSegment() {}

// PlatformResult is the per-platform generation sum type.
type PlatformResult interface {
	Platform() string
	ModeKind() Mode
}

// SinglePost is the result for a platform in single/text mode.
type SinglePost struct {
	PlatformName string
	Content      string
}

// Thread is the result for a platform in thread mode.
type Thread struct {
	PlatformName string
	Segments     []Segment // always ≥ 2
}

func (s SinglePost) Platform() string { return s.PlatformName }
func (s SinglePost) ModeKind() Mode   { return ModeSingle }
func (t Thread)     Platform() string { return t.PlatformName }
func (t Thread)     ModeKind() Mode   { return ModeThread }

// Result is the non-streaming output of Generate.
type Result struct {
	BaseContent string
	Platforms   map[string]PlatformResult
}

var imageMarkerRegex = regexp.MustCompile(`\[IMAGE:(\d+)\]`)

// Generator creates social posts for multiple platforms.
type Generator struct {
	aiClient AIClient
	logger   *observability.Logger
}

// New creates a Generator.
func New(aiClient AIClient, logger *observability.Logger) *Generator {
	return &Generator{aiClient: aiClient, logger: logger}
}

// Generate produces posts for all platforms synchronously.
func (g *Generator) Generate(ctx context.Context, req Request) (Result, error) {
	if err := validateRequest(req); err != nil {
		return Result{}, err
	}
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "operation", Value: "socialposts_generate"},
		observability.Field{Key: "platform_count", Value: len(req.Platforms)},
		observability.Field{Key: "mode", Value: string(req.Mode)},
	)

	baseContent := strings.TrimSpace(req.BaseContent)
	if baseContent == "" {
		sysPrompt := prompts.SystemGenerate(req.Platforms, toPromptsVoice(req.Voice))
		userMsg := buildUserPrompt(req.Prompt, req.Media)
		raw, err := g.aiClient.CreateMessage(ctx, sysPrompt, []aiclient.Message{{Role: "user", Content: userMsg}}, 0)
		if err != nil {
			g.logger.Error(ctx, "failed to generate base content", err)
			return Result{}, ErrGenerate
		}
		baseContent = strings.TrimSpace(raw)
	}

	platformResults := make(map[string]PlatformResult, len(req.Platforms))
	var mu errgroup.Group

	resultCh := make(chan struct {
		platform string
		result   PlatformResult
	}, len(req.Platforms))

	for _, platform := range req.Platforms {
		eg, egCtx := errgroup.WithContext(ctx)
		eg.Go(func() error {
			r, err := g.generatePlatform(egCtx, platform, baseContent, req)
			if err != nil {
				return err
			}
			resultCh <- struct {
				platform string
				result   PlatformResult
			}{platform, r}
			return nil
		})
		mu.Go(func() error { return eg.Wait() })
	}

	if err := mu.Wait(); err != nil {
		close(resultCh)
		return Result{}, ErrGenerate
	}
	close(resultCh)

	for entry := range resultCh {
		platformResults[entry.platform] = entry.result
	}
	return Result{BaseContent: baseContent, Platforms: platformResults}, nil
}

// GenerateStream produces posts via a channel of typed events.
// Setup failures (invalid mode, no platforms) are returned synchronously.
// Runtime failures are sent as a terminal ErrorEvent before channel close.
func (g *Generator) GenerateStream(ctx context.Context, req Request) (<-chan Event, error) {
	if err := validateRequest(req); err != nil {
		return nil, err
	}

	bufSize := len(req.Platforms) * 4
	if bufSize < 8 {
		bufSize = 8
	}
	ch := make(chan Event, bufSize)

	go func() {
		defer close(ch)
		g.runStream(ctx, req, ch)
	}()

	return ch, nil
}

func (g *Generator) runStream(ctx context.Context, req Request, ch chan<- Event) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "operation", Value: "socialposts_generate_stream"},
		observability.Field{Key: "platform_count", Value: len(req.Platforms)},
		observability.Field{Key: "mode", Value: string(req.Mode)},
	)

	sendEvent := func(e Event) bool {
		select {
		case ch <- e:
			return true
		case <-ctx.Done():
			ch <- ErrorEvent{Err: ctx.Err()}
			return false
		}
	}

	// Step 1: base content.
	baseContent := strings.TrimSpace(req.BaseContent)
	if baseContent == "" {
		if !sendEvent(PhaseEvent{Phase: "generating", Platform: ""}) {
			return
		}
		sysPrompt := prompts.SystemGenerate(req.Platforms, toPromptsVoice(req.Voice))
		userMsg := buildUserPrompt(req.Prompt, req.Media)

		var baseBuilder strings.Builder
		err := g.aiClient.StreamMessage(ctx, sysPrompt, []aiclient.Message{{Role: "user", Content: userMsg}}, 0, func(chunk string) {
			baseBuilder.WriteString(chunk)
			ch <- ChunkEvent{Platform: "", Chunk: chunk}
		})
		if err != nil {
			g.logger.Error(ctx, "failed to stream base content", err)
			ch <- ErrorEvent{Err: ErrGenerate}
			return
		}
		baseContent = strings.TrimSpace(baseBuilder.String())
	}

	if !sendEvent(BaseDoneEvent{Content: baseContent}) {
		return
	}

	// Step 2: fan out per-platform.
	eg, egCtx := errgroup.WithContext(ctx)
	for _, platform := range req.Platforms {
		eg.Go(func() error {
			result, err := g.generatePlatform(egCtx, platform, baseContent, req)
			if err != nil {
				return err
			}
			select {
			case ch <- PlatformDoneEvent{Platform: platform, Result: result}:
			case <-egCtx.Done():
				return egCtx.Err()
			}
			return nil
		})
	}

	if err := eg.Wait(); err != nil {
		ch <- ErrorEvent{Err: ErrGenerate}
	}
}

// generatePlatform generates content for one platform (non-streaming).
func (g *Generator) generatePlatform(ctx context.Context, platform, baseContent string, req Request) (PlatformResult, error) {
	cfg := platforms.Get(platform)
	isThread := (req.Mode == ModeThread) && cfg.SupportsThreads

	ctx = observability.WithFields(ctx, observability.Field{Key: "platform", Value: platform})

	var sysPrompt string
	if isThread {
		parts := req.ThreadParts
		if parts == 0 {
			parts = 3
		}
		sysPrompt = prompts.SystemThread(platform, parts, req.Media, toPromptsVoice(req.Voice))
	} else {
		sysPrompt = prompts.SystemAdapt(platform, req.Media, toPromptsVoice(req.Voice))
	}

	raw, err := g.aiClient.CreateMessage(ctx, sysPrompt, []aiclient.Message{{Role: "user", Content: baseContent}}, 0)
	if err != nil {
		g.logger.Error(ctx, "failed to generate content for platform", err)
		return nil, err
	}

	charLimit := cfg.CharLimit
	if isThread && cfg.ThreadCharLimit > 0 {
		charLimit = cfg.ThreadCharLimit
	}

	if isThread {
		rawSegs := parseThreadSegments(raw)
		segs := make([]Segment, 0, len(rawSegs))
		for _, s := range rawSegs {
			content := truncate(s.content, charLimit)
			if s.imageIndex > 0 {
				segs = append(segs, MediaSegment{Content: content, ImageIndex: s.imageIndex})
			} else {
				segs = append(segs, TextSegment{Content: content})
			}
		}
		return Thread{PlatformName: platform, Segments: segs}, nil
	}

	return SinglePost{PlatformName: platform, Content: truncate(strings.TrimSpace(raw), charLimit)}, nil
}

type rawSegment struct {
	content    string
	imageIndex int
}

func parseThreadSegments(raw string) []rawSegment {
	parts := strings.Split(raw, "---THREAD_BREAK---")
	segs := make([]rawSegment, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		seg := rawSegment{}
		if m := imageMarkerRegex.FindStringSubmatch(trimmed); len(m) == 2 {
			if idx, err := strconv.Atoi(m[1]); err == nil {
				seg.imageIndex = idx
			}
			trimmed = strings.TrimSpace(imageMarkerRegex.ReplaceAllString(trimmed, ""))
		}
		seg.content = trimmed
		segs = append(segs, seg)
	}
	return segs
}

func truncate(s string, limit int) string {
	runes := []rune(s)
	if len(runes) <= limit {
		return s
	}
	cut := string(runes[:limit])
	if last := strings.LastIndex(cut, " "); last > limit*3/4 {
		cut = cut[:last]
	}
	return strings.TrimSpace(cut)
}

func buildUserPrompt(prompt string, media []mediadescriber.Description) string {
	if len(media) == 0 {
		return prompt
	}
	var sb strings.Builder
	sb.WriteString(prompt)
	sb.WriteString("\n\n## Attached Media\n")
	for _, d := range media {
		if d.Usable {
			fmt.Fprintf(&sb, "- Media %d (%s): %s\n", d.Index, d.Kind, d.Description)
		}
	}
	return sb.String()
}

func validateRequest(req Request) error {
	if len(req.Platforms) == 0 {
		return ErrNoPlatforms
	}
	switch req.Mode {
	case ModeSingle, ModeThread, ModeText:
		// valid
	default:
		return ErrInvalidMode
	}
	return nil
}

func toPromptsVoice(v *VoiceContext) *prompts.VoiceContext {
	if v == nil {
		return nil
	}
	return &prompts.VoiceContext{
		Tone:               v.Tone,
		Style:              v.Style,
		Industry:           v.Industry,
		TargetAudience:     v.TargetAudience,
		CustomInstructions: v.CustomInstructions,
		ExamplePosts:       v.ExamplePosts,
	}
}
