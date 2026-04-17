package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

import (
	"context"
	"encoding/json"
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
	ErrSelectImages   = errors.New("failed to select meaningful images")
	ErrClassifyCommit = errors.New("failed to classify commit")
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

	systemPrompt := prompts.SystemThread(platform, 0, nil)

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
	isThread := contentType == "thread" && platformCfg.SupportsThreads

	if isThread {
		cb.OnPhase("threading", platform)
	} else {
		cb.OnPhase("adapting", platform)
	}

	var sysPrompt string
	if isThread {
		sysPrompt = prompts.SystemThread(platform, maxThreadParts, imageDescriptionsForPrompts(imageDescriptions))
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

// CommitVerdict is the classifier's call on a single pushed commit.
type CommitVerdict struct {
	// Worthwhile is true when the change is visible to end users — a feature,
	// a fix, a UI tweak, something that would make sense as a social post.
	Worthwhile bool
	// Reason is a short human-readable sentence the classifier writes either
	// way, so skip decisions (and pick decisions) are auditable in logs.
	Reason string
}

// ClassifyCommit decides whether a pushed commit is worth running the
// capture + draft pipeline on. The classifier reads the commit message +
// diff and returns a verdict plus a short reason (logged on both sides of
// the decision so operators can sanity-check what the AI is dropping).
//
// Callers should treat errors as fail-open — if classification fails,
// proceed with the capture rather than silently swallowing user changes.
func (p *ContentProcessor) ClassifyCommit(ctx context.Context, message, diff string) (CommitVerdict, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "operation", Value: "classify_commit"},
	)

	systemPrompt := `You are a release-notes editor for a solo founder's product. You decide whether a single git commit is worth turning into a short social media post — videos captured from the app, a thread announcing the change.

You receive:
1. The commit message.
2. A unified diff (possibly truncated).

Return raw JSON only (no markdown, no commentary):
{"worthwhile": true|false, "reason": "one short sentence"}

"Worthwhile" means: a reasonable end user would notice this change, OR the change ships something a founder would plausibly announce (new feature, UX improvement, visible bug fix, copy change on a user-facing screen, new page, new integration, public API addition).

"Not worthwhile" means any of:
- Pure test additions or test-only changes
- Dependency bumps / lockfile churn with no source edits
- CI / infra / Dockerfile / Terraform / deploy config changes
- Internal refactors, renames, code moves with no behavioural change
- Dev tooling, scripts, migrations with no user-visible effect
- Dead code removal
- Comment, typo, formatting, or lint fixes
- Documentation-only changes (README, internal docs)
- Commented-out / disabled code
- Revert commits where the reverted change itself wouldn't be announced

Rules:
- Lean toward NOT worthwhile when the diff is ambiguous — false positives waste a video render and clutter the user's feed with noise.
- If the commit message clearly describes a user-facing change AND the diff touches UI code (components, routes, templates, styles, copy strings, user-facing endpoints), say yes.
- Weight the diff over the message. A "feat: x" message with a diff that's just tests is NOT worthwhile.
- Keep the reason concrete ("adds new /pricing page", "lockfile-only bump", "tests for existing behaviour") — not "this is a feature".
- Never include anything other than the JSON object.`

	const maxDiffChars = 40_000
	if len(diff) > maxDiffChars {
		diff = diff[:maxDiffChars] + "\n… [truncated]"
	}
	userMessage := fmt.Sprintf("Commit message:\n%s\n\nDiff:\n```\n%s\n```", strings.TrimSpace(message), diff)

	raw, err := p.aiClient.CreateMessage(ctx, systemPrompt, []aiclient.Message{
		{Role: "user", Content: userMessage},
	}, 512)
	if err != nil {
		p.logger.Error(ctx, "failed to classify commit via ai", err)
		return CommitVerdict{}, ErrClassifyCommit
	}

	// The provider occasionally returns a blank body (rate-limited /
	// truncated / token ran out). Treat that as "no verdict, let the
	// commit through" without an error — the caller already treats
	// errors as fail-open, but returning success here keeps the log at
	// info level instead of firing "commit classifier failed" on what
	// is really a transient provider blip.
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		p.logger.Info(ctx, "commit classifier returned empty response; defaulting to include")
		return CommitVerdict{
			Worthwhile: true,
			Reason:     "classifier returned empty response; defaulting to include",
		}, nil
	}

	var parsed struct {
		Worthwhile bool   `json:"worthwhile"`
		Reason     string `json:"reason"`
	}
	if err := json.Unmarshal([]byte(trimmed), &parsed); err != nil {
		p.logger.Error(ctx, "failed to parse commit classifier response", err)
		return CommitVerdict{}, ErrClassifyCommit
	}
	if parsed.Reason == "" {
		// Don't leave the log line empty — something is better than nothing
		// when an operator later asks "why did we skip commit X".
		parsed.Reason = "classifier returned no reason"
	}
	return CommitVerdict{Worthwhile: parsed.Worthwhile, Reason: parsed.Reason}, nil
}

// SelectMeaningfulImages picks the subset of supplied images worth including
// in a social post. Capture workers emit one frame per UI step, so the raw
// set usually contains redundant shots (loading states, mid-transitions,
// near-duplicate screens). This uses a multimodal AI call to keep only the
// images that add distinct visual context and returns the chosen 1-based
// indexes in ascending order. An empty slice means "no image is worth
// attaching".
func (p *ContentProcessor) SelectMeaningfulImages(ctx context.Context, images []aiclient.ImageData) ([]int, error) {
	if len(images) == 0 {
		return nil, nil
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "operation", Value: "select_meaningful_images"},
		observability.Field{Key: "candidate_count", Value: fmt.Sprintf("%d", len(images))},
	)

	systemPrompt := `You are a visual editor for social media. You are reviewing a sequence of screenshots captured while someone was using a product. The sequence contains redundant frames — loading states, mid-transitions, duplicate views, screens that do not add new information. Your job is to keep only the frames that are genuinely worth showing to an audience.

Return raw JSON (no markdown fences, no commentary) of the form:
{"selected": [1, 3]}

Rules:
- Indexes are 1-based, referring to the order the images were given.
- Err on the side of fewer — one or two strong frames usually beats five weak ones.
- Skip frames that repeat a state already shown by an earlier selected frame.
- Skip loading spinners, empty mid-animation states, blurred frames.
- Prefer frames that show a distinct, finished UI state, an important result, or a visual highlight.
- If every frame is redundant or uninteresting, return {"selected": []}.
- Return indexes in ascending order, no duplicates.`

	parts := make([]string, 0, len(images))
	msgImages := make([]aiclient.ImageData, 0, len(images))
	for i, img := range images {
		parts = append(parts, fmt.Sprintf("Image %d:", i+1))
		msgImages = append(msgImages, img)
	}
	messages := []aiclient.Message{
		{
			Role:    "user",
			Content: "Here are the candidate frames, labelled in order:\n" + strings.Join(parts, "\n"),
			Images:  msgImages,
		},
	}

	raw, err := p.aiClient.CreateMessage(ctx, systemPrompt, messages, 512)
	if err != nil {
		p.logger.Error(ctx, "failed to select meaningful images via ai", err)
		return nil, ErrSelectImages
	}

	var parsed struct {
		Selected []int `json:"selected"`
	}
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &parsed); err != nil {
		p.logger.Error(ctx, "failed to parse image selection response", err)
		return nil, ErrSelectImages
	}

	// Sanitize: drop out-of-range and duplicate indexes, sort ascending.
	seen := make(map[int]struct{}, len(parsed.Selected))
	cleaned := make([]int, 0, len(parsed.Selected))
	for _, idx := range parsed.Selected {
		if idx < 1 || idx > len(images) {
			continue
		}
		if _, ok := seen[idx]; ok {
			continue
		}
		seen[idx] = struct{}{}
		cleaned = append(cleaned, idx)
	}
	// Ascending order for caller sanity.
	for i := 1; i < len(cleaned); i++ {
		for j := i; j > 0 && cleaned[j-1] > cleaned[j]; j-- {
			cleaned[j-1], cleaned[j] = cleaned[j], cleaned[j-1]
		}
	}
	return cleaned, nil
}

// ThreadWithMediaPlanResult holds the generated output for one platform when
// GenerateWithMediaPlan runs.
type ThreadWithMediaPlanResult struct {
	Content  string          // full thread text joined with newlines
	Segments []ThreadSegment // one entry per thread part; ImageIndex left nil (caller assigns)
}

// GenerateWithMediaPlan is the non-streaming entry point used by background
// workers (e.g. the GitHub draft generator). It produces base content and
// per-platform threads in one call, with the prompt instructing the AI about
// pre-assigned media layout so copy lines up with attachments.
//
// Only thread-capable platforms are accepted; single-post platforms should be
// filtered out by the caller.
func (p *ContentProcessor) GenerateWithMediaPlan(
	ctx context.Context,
	accountID uuid.UUID,
	prompt string,
	platforms []string,
	maxThreadParts int,
	plan *prompts.MediaPlan,
) (string, map[string]ThreadWithMediaPlanResult, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "operation", Value: "generate_with_media_plan"},
	)

	voice := p.getVoiceContext(ctx, accountID)

	baseSystem := prompts.SystemGenerate(platforms, voice)
	baseContent, err := p.aiClient.CreateMessage(ctx, baseSystem, []aiclient.Message{
		{Role: "user", Content: prompt},
	}, 0)
	if err != nil {
		p.logger.Error(ctx, "failed to generate base content", err)
		return "", nil, ErrStreamGenerate
	}
	baseContent = strings.TrimSpace(baseContent)

	results := make(map[string]ThreadWithMediaPlanResult, len(platforms))
	var mu sync.Mutex
	g, gCtx := errgroup.WithContext(ctx)

	for _, platform := range platforms {
		g.Go(func() error {
			platformCfg := prompts.GetPlatform(platform)
			sysPrompt := prompts.SystemThreadWithMediaPlan(platform, maxThreadParts, plan)

			raw, err := p.aiClient.CreateMessage(gCtx, sysPrompt, []aiclient.Message{
				{Role: "user", Content: baseContent},
			}, 0)
			if err != nil {
				p.logger.Error(gCtx, "failed to generate thread for platform "+platform, err)
				return err
			}

			charLimit := platformCfg.ThreadCharLimit
			if charLimit == 0 {
				charLimit = platformCfg.CharLimit
			}

			parts := parseThreadSegments(raw)
			segments := make([]ThreadSegment, 0, len(parts))
			joined := make([]string, 0, len(parts))
			for _, s := range parts {
				trimmed := truncateToCharLimit(s, charLimit)
				segments = append(segments, ThreadSegment{Content: trimmed})
				joined = append(joined, trimmed)
			}

			mu.Lock()
			results[platform] = ThreadWithMediaPlanResult{
				Content:  strings.Join(joined, "\n"),
				Segments: segments,
			}
			mu.Unlock()
			return nil
		})
	}
	if err := g.Wait(); err != nil {
		return "", nil, ErrStreamGenerate
	}
	return baseContent, results, nil
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

