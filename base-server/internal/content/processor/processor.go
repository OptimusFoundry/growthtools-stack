package processor

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"sync"

	"base-server/internal/content/prompts"
	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"golang.org/x/sync/errgroup"
)

var (
	ErrGeneratePost   = errors.New("failed to generate post")
	ErrAdaptContent   = errors.New("failed to adapt content")
	ErrGenerateThread = errors.New("failed to generate thread")
	ErrVoiceProfile   = errors.New("failed to get voice profile")
	ErrStreamGenerate = errors.New("failed to stream generate and adapt")
)

// ContentStore defines the database operations required by ContentProcessor.
type ContentStore interface {
	GetVoiceProfileByAccount(ctx context.Context, accountID uuid.UUID) (store.VoiceProfile, error)
}

// AIClient defines the AI operations required by ContentProcessor.
type AIClient interface {
	CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
	StreamMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error
}

// ImageDescription holds the result of describing a single image.
type ImageDescription struct {
	Index       int
	Description string
	MIMEType    string
}

// ThreadSegment represents a single part of a thread with optional image placement.
type ThreadSegment struct {
	Content    string `json:"content"`
	ImageIndex *int   `json:"image_index,omitempty"`
}

// StreamCallbacks holds the callback functions for streaming generation.
// All callbacks must be safe for concurrent use — multiple platform goroutines call them simultaneously.
type StreamCallbacks struct {
	OnPhase        func(phase string, platform string)
	OnChunk        func(platform string, chunk string)
	OnBaseDone     func(content string)
	OnPlatformDone func(platform string, content string)
	OnThreadDone   func(platform string, segments []ThreadSegment)
}

// ContentProcessor handles AI-powered content generation.
type ContentProcessor struct {
	store    ContentStore
	aiClient AIClient
	logger   *observability.Logger
}

// New creates a new ContentProcessor.
func New(store ContentStore, aiClient AIClient, logger *observability.Logger) ContentProcessor {
	return ContentProcessor{
		store:    store,
		aiClient: aiClient,
		logger:   logger,
	}
}

// GeneratePost generates social media post content using the account's voice profile.
func (p *ContentProcessor) GeneratePost(ctx context.Context, accountID uuid.UUID, prompt string, platforms []string) (string, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "operation", Value: "generate_post"},
	)

	voice := p.getVoiceContext(ctx, accountID)
	systemPrompt := prompts.SystemGenerate(platforms, voice)

	messages := []aiclient.Message{
		{Role: "user", Content: prompt},
	}

	content, err := p.aiClient.CreateMessage(ctx, systemPrompt, messages, 0)
	if err != nil {
		p.logger.Error(ctx, "failed to generate post via ai", err)
		return "", ErrGeneratePost
	}

	return content, nil
}

// AdaptContent adapts existing content for the constraints of a specific platform.
func (p *ContentProcessor) AdaptContent(ctx context.Context, accountID uuid.UUID, content string, platform string) (string, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "platform", Value: platform},
		observability.Field{Key: "operation", Value: "adapt_content"},
	)

	voice := p.getVoiceContext(ctx, accountID)
	systemPrompt := prompts.SystemAdapt(platform, voice, nil)

	messages := []aiclient.Message{
		{Role: "user", Content: content},
	}

	adapted, err := p.aiClient.CreateMessage(ctx, systemPrompt, messages, 0)
	if err != nil {
		p.logger.Error(ctx, "failed to adapt content via ai", err)
		return "", ErrAdaptContent
	}

	return adapted, nil
}

// GenerateThread generates a thread of posts from a piece of content for a given platform.
func (p *ContentProcessor) GenerateThread(ctx context.Context, content string, platform string) ([]string, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "platform", Value: platform},
		observability.Field{Key: "operation", Value: "generate_thread"},
	)

	systemPrompt := prompts.SystemThread(platform, nil)

	messages := []aiclient.Message{
		{Role: "user", Content: content},
	}

	result, err := p.aiClient.CreateMessage(ctx, systemPrompt, messages, 0)
	if err != nil {
		p.logger.Error(ctx, "failed to generate thread via ai", err)
		return nil, ErrGenerateThread
	}

	parts := strings.Split(result, "---THREAD_BREAK---")
	thread := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			thread = append(thread, trimmed)
		}
	}

	return thread, nil
}

// DescribeImages fires parallel multimodal AI calls to describe each image.
func (p *ContentProcessor) DescribeImages(ctx context.Context, images []aiclient.ImageData) []ImageDescription {
	descriptions := make([]ImageDescription, len(images))
	g, gCtx := errgroup.WithContext(ctx)

	for i, img := range images {
		g.Go(func() error {
			sysPrompt := "Describe this image concisely for social media context. Focus on the key visual elements, mood, and subject matter. Keep it to 1-2 sentences."
			messages := []aiclient.Message{
				{
					Role:    "user",
					Content: "Describe what you see in this image.",
					Images:  []aiclient.ImageData{img},
				},
			}

			desc, err := p.aiClient.CreateMessage(gCtx, sysPrompt, messages, 256)
			if err != nil {
				p.logger.Error(gCtx, "failed to describe image", err)
				descriptions[i] = ImageDescription{
					Index:       i + 1,
					Description: "An attached image",
					MIMEType:    img.MIMEType,
				}
				return nil // Don't fail the whole batch for one image.
			}

			descriptions[i] = ImageDescription{
				Index:       i + 1,
				Description: desc,
				MIMEType:    img.MIMEType,
			}
			return nil
		})
	}

	_ = g.Wait()
	return descriptions
}

// buildImageContext formats image descriptions into a text block for prompts.
func buildImageContext(descriptions []ImageDescription) string {
	if len(descriptions) == 0 {
		return ""
	}
	var sb strings.Builder
	sb.WriteString("\n\n## Attached Images\n")
	sb.WriteString("The user has attached the following images to accompany this post. ALL images MUST be used in the content:\n")
	for _, d := range descriptions {
		fmt.Fprintf(&sb, "- Image %d: %s\n", d.Index, d.Description)
	}
	return sb.String()
}

// StreamGenerateAndAdapt generates base content (streamed to user), then fans out
// parallel per-platform adaptation streams. Each platform runs as its own goroutine.
func (p *ContentProcessor) StreamGenerateAndAdapt(
	ctx context.Context,
	accountID uuid.UUID,
	prompt string,
	platforms []string,
	contentType string,
	images []aiclient.ImageData,
	maxThreadParts int,
	cb StreamCallbacks,
) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "operation", Value: "stream_generate_and_adapt"},
	)

	voice := p.getVoiceContext(ctx, accountID)

	// Step 0: Describe images if present.
	var imageDescriptions []ImageDescription
	if len(images) > 0 {
		cb.OnPhase("describing", "")
		imageDescriptions = p.DescribeImages(ctx, images)
	}

	// Step 1: Stream base content generation (visible to user).
	cb.OnPhase("generating", "")

	userPrompt := prompt
	if len(imageDescriptions) > 0 {
		userPrompt += buildImageContext(imageDescriptions)
	}

	systemPrompt := prompts.SystemGenerate(platforms, voice)
	messages := []aiclient.Message{
		{Role: "user", Content: userPrompt},
	}

	var baseBuilder strings.Builder
	err := p.aiClient.StreamMessage(ctx, systemPrompt, messages, 0, func(chunk string) {
		baseBuilder.WriteString(chunk)
		cb.OnChunk("", chunk)
	})
	if err != nil {
		p.logger.Error(ctx, "failed to stream base content", err)
		return ErrStreamGenerate
	}

	baseContent := strings.TrimSpace(baseBuilder.String())
	if cb.OnBaseDone != nil {
		cb.OnBaseDone(baseContent)
	}

	// Step 2: Fan out parallel per-platform adaptations.
	g, gCtx := errgroup.WithContext(ctx)

	for _, platform := range platforms {
		g.Go(func() error {
			return p.streamPlatform(gCtx, platform, baseContent, contentType, voice, imageDescriptions, maxThreadParts, cb)
		})
	}

	if err := g.Wait(); err != nil {
		return ErrStreamGenerate
	}

	return nil
}

// streamPlatform streams content generation for a single platform.
func (p *ContentProcessor) streamPlatform(
	ctx context.Context,
	platform string,
	baseContent string,
	contentType string,
	voice *prompts.VoiceContext,
	imageDescriptions []ImageDescription,
	maxThreadParts int,
	cb StreamCallbacks,
) error {
	platformCfg := prompts.GetPlatform(platform)
	if maxThreadParts > 0 {
		platformCfg.MaxThreadParts = maxThreadParts
	}
	isThread := contentType == "thread" && platformCfg.SupportsThreads

	if isThread {
		cb.OnPhase("threading", platform)
	} else {
		cb.OnPhase("adapting", platform)
	}

	var sysPrompt string
	if isThread {
		sysPrompt = prompts.SystemThread(platform, imageDescriptionsForPrompts(imageDescriptions))
	} else {
		sysPrompt = prompts.SystemAdapt(platform, voice, imageDescriptionsForPrompts(imageDescriptions))
	}

	messages := []aiclient.Message{
		{Role: "user", Content: baseContent},
	}

	var builder strings.Builder
	platformCtx := observability.WithFields(ctx, observability.Field{Key: "platform", Value: platform})
	err := p.aiClient.StreamMessage(platformCtx, sysPrompt, messages, 0, func(chunk string) {
		builder.WriteString(chunk)
		cb.OnChunk(platform, chunk)
	})
	if err != nil {
		p.logger.Error(platformCtx, "failed to stream platform content", err)
		return err
	}

	fullContent := strings.TrimSpace(builder.String())

	// Enforce character limit as a safety net.
	charLimit := platformCfg.CharLimit
	if isThread && platformCfg.ThreadCharLimit > 0 {
		charLimit = platformCfg.ThreadCharLimit
	}

	if isThread {
		if len(imageDescriptions) > 0 {
			threadSegments := parseThreadSegmentsWithImages(fullContent)
			for i, seg := range threadSegments {
				threadSegments[i].Content = truncateToCharLimit(seg.Content, charLimit)
			}
			contentParts := make([]string, len(threadSegments))
			for i, seg := range threadSegments {
				contentParts[i] = seg.Content
			}
			cb.OnPlatformDone(platform, strings.Join(contentParts, "\n"))
			if cb.OnThreadDone != nil {
				cb.OnThreadDone(platform, threadSegments)
			}
		} else {
			segments := parseThreadSegments(fullContent)
			for i, seg := range segments {
				segments[i] = truncateToCharLimit(seg, charLimit)
			}
			truncated := strings.Join(segments, "\n")
			cb.OnPlatformDone(platform, truncated)
			if cb.OnThreadDone != nil {
				threadSegs := make([]ThreadSegment, len(segments))
				for i, s := range segments {
					threadSegs[i] = ThreadSegment{Content: s}
				}
				cb.OnThreadDone(platform, threadSegs)
			}
		}
	} else {
		cb.OnPlatformDone(platform, truncateToCharLimit(fullContent, charLimit))
	}

	return nil
}

// imageDescriptionsForPrompts converts ImageDescription slice to the format used by prompts.
func imageDescriptionsForPrompts(descriptions []ImageDescription) []prompts.ImageDescription {
	if len(descriptions) == 0 {
		return nil
	}
	result := make([]prompts.ImageDescription, len(descriptions))
	for i, d := range descriptions {
		result[i] = prompts.ImageDescription{
			Index:       d.Index,
			Description: d.Description,
		}
	}
	return result
}

// imageMarkerRegex matches [IMAGE:N] directives in thread content.
var imageMarkerRegex = regexp.MustCompile(`\[IMAGE:(\d+)\]`)

// parseThreadSegmentsWithImages splits raw thread output by ---THREAD_BREAK--- and
// extracts [IMAGE:N] markers into structured ThreadSegments.
func parseThreadSegmentsWithImages(raw string) []ThreadSegment {
	parts := strings.Split(raw, "---THREAD_BREAK---")
	segments := make([]ThreadSegment, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}

		seg := ThreadSegment{}

		// Extract [IMAGE:N] marker
		if matches := imageMarkerRegex.FindStringSubmatch(trimmed); len(matches) == 2 {
			if idx, err := strconv.Atoi(matches[1]); err == nil {
				seg.ImageIndex = &idx
			}
			// Remove the marker from the content
			trimmed = strings.TrimSpace(imageMarkerRegex.ReplaceAllString(trimmed, ""))
		}

		seg.Content = trimmed
		segments = append(segments, seg)
	}
	return segments
}

// truncateToCharLimit trims content to fit within a character limit.
// It tries to break at a word boundary to avoid cutting mid-word.
func truncateToCharLimit(content string, limit int) string {
	runes := []rune(content)
	if len(runes) <= limit {
		return content
	}
	truncated := string(runes[:limit])
	if lastSpace := strings.LastIndex(truncated, " "); lastSpace > limit*3/4 {
		truncated = truncated[:lastSpace]
	}
	return strings.TrimSpace(truncated)
}

// parseThreadSegments splits raw thread output by the ---THREAD_BREAK--- delimiter.
func parseThreadSegments(raw string) []string {
	parts := strings.Split(raw, "---THREAD_BREAK---")
	segments := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			segments = append(segments, trimmed)
		}
	}
	return segments
}

// getVoiceContext fetches the account's voice profile and converts it to a VoiceContext.
// Returns nil if no profile is configured (graceful fallback).
func (p *ContentProcessor) getVoiceContext(ctx context.Context, accountID uuid.UUID) *prompts.VoiceContext {
	vp, err := p.store.GetVoiceProfileByAccount(ctx, accountID)
	if err != nil {
		if !errors.Is(err, store.ErrNotFound) {
			p.logger.Error(ctx, "failed to get voice profile", err)
		}
		return nil
	}

	voice := &prompts.VoiceContext{
		Tone:         vp.Tone,
		Style:        vp.Style,
		ExamplePosts: vp.ExamplePosts,
	}
	if vp.Industry != nil {
		voice.Industry = *vp.Industry
	}
	if vp.TargetAudience != nil {
		voice.TargetAudience = *vp.TargetAudience
	}
	if vp.CustomInstructions != nil {
		voice.CustomInstructions = *vp.CustomInstructions
	}

	return voice
}

// Ensure sync is used (needed for handler-side mutex, not processor).
var _ = sync.Mutex{}
