package processor

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"sync"

	"base-server/internal/content/prompts"
	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"golang.org/x/sync/errgroup"
)

// MediaAndModeDecision is the AI's call on what to attach to a generated
// draft and whether it should be a single post or a thread.
//
// UseVideo is true only when the model actually watched the video and judged
// it worth showing. ImageIndexes lists the 1-based positions of images (from
// the input order) to keep — empty means no image adds enough to be worth
// attaching. Mode is either "single" or "thread"; when "thread", ThreadParts
// holds the part count the model asked for. Reason is a one-sentence
// explanation logged on both sides of the decision for auditability.
type MediaAndModeDecision struct {
	UseVideo     bool
	ImageIndexes []int
	Mode         string
	ThreadParts  int
	Reason       string
}

// SelectMediaAndMode is a single multimodal call that evaluates a candidate
// video + candidate images captured during a user's app session and returns
// a verdict on (a) what's worth attaching and (b) whether the resulting post
// should be a single post or a thread.
//
// The prompt leans toward video: a strong video almost always outperforms a
// grid of screenshots, so the model only picks images when they genuinely
// add information the video doesn't. Mode is biased toward "single" unless
// there's enough substance + media to pace across multiple parts.
//
// Callers treat errors as fail-open — if this call fails, they should fall
// back to attaching everything and defaulting to thread mode.
func (p *ContentProcessor) SelectMediaAndMode(
	ctx context.Context,
	video *aiclient.ImageData,
	images []aiclient.ImageData,
	commitMessage string,
) (MediaAndModeDecision, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "operation", Value: "select_media_and_mode"},
		observability.Field{Key: "has_video", Value: fmt.Sprintf("%t", video != nil)},
		observability.Field{Key: "image_candidate_count", Value: fmt.Sprintf("%d", len(images))},
	)

	systemPrompt := `You are the visual + editorial director for a solo founder's social posts. You are reviewing the raw media captured while they used their own product after a recent code change, and deciding two things:

1. Which pieces of media are worth attaching.
2. Whether the post should be a single post or a thread.

You will receive:
- An optional short video clip of the app in action (MIME type tells you it's a video).
- Zero or more screenshots, each labelled by 1-based index in the order provided.
- The commit message describing the change.

Return raw JSON only (no markdown fences, no commentary):
{
  "use_video": true|false,
  "image_indexes": [2],
  "mode": "single"|"thread",
  "thread_parts": 0,
  "reason": "one short sentence"
}

Media rules (at most one video + at most one image):
- The final post carries at most one video and at most one image. image_indexes MUST contain either zero or exactly one index.
- Video drives engagement far more than screenshots. If the video exists, watch it. If it actually shows the change in action — a working UI, a transition, a demo moment — use_video MUST be true.
- If the video is broken, stuck on a loading state, mostly blank, or fails to show the change, set use_video=false.
- For the image: pick the single screenshot that most clearly shows the change described in the commit message — ideally the final/result state of the feature. If the video already demonstrates the change end-to-end and no screenshot adds new information, image_indexes=[] is fine. Never pick a loading spinner, mid-animation frame, or a screen unrelated to the change.
- If neither video nor any image adds real value, use_video=false and image_indexes=[] are both valid answers. Better no media than bad media.

Mode rules:
- "single" when the change is small, the media is one strong video or one strong screenshot, or the commit message does not carry enough substance for multiple beats.
- "thread" when there is enough to say across multiple posts AND there is enough media (or enough narrative) to pace it. Threads with one media item and thin copy feel padded — prefer single in that case.
- When mode="thread", thread_parts is an integer 2–3. Do not exceed 3. When mode="single", thread_parts MUST be 0.

General:
- image_indexes are 1-based into the order provided. Ascending, no duplicates.
- Keep reason concrete: "video demos the new editor cleanly; screenshots redundant" beats "media is good".`

	parts := make([]string, 0, 2+len(images))
	parts = append(parts, fmt.Sprintf("Commit message:\n%s", strings.TrimSpace(commitMessage)))
	attached := make([]aiclient.ImageData, 0, 1+len(images))
	if video != nil {
		parts = append(parts, "Candidate video (next attachment).")
		attached = append(attached, *video)
	} else {
		parts = append(parts, "No candidate video was captured.")
	}
	for i := range images {
		parts = append(parts, fmt.Sprintf("Candidate image %d (next attachment):", i+1))
		attached = append(attached, images[i])
	}
	messages := []aiclient.Message{
		{
			Role:    "user",
			Content: strings.Join(parts, "\n\n"),
			Images:  attached,
		},
	}

	raw, err := p.aiClient.CreateMessage(ctx, systemPrompt, messages, 1024)
	if err != nil {
		p.logger.Error(ctx, "failed to select media and mode via ai", err)
		return MediaAndModeDecision{}, ErrSelectMediaAndMode
	}

	var parsed struct {
		UseVideo     bool   `json:"use_video"`
		ImageIndexes []int  `json:"image_indexes"`
		Mode         string `json:"mode"`
		ThreadParts  int    `json:"thread_parts"`
		Reason       string `json:"reason"`
	}
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &parsed); err != nil {
		p.logger.Error(ctx, "failed to parse media/mode selection response", err)
		return MediaAndModeDecision{}, ErrSelectMediaAndMode
	}

	decision := MediaAndModeDecision{
		UseVideo: parsed.UseVideo && video != nil, // clamp: can't use a video we don't have
		Mode:     strings.ToLower(strings.TrimSpace(parsed.Mode)),
		Reason:   strings.TrimSpace(parsed.Reason),
	}
	if decision.Mode != "thread" {
		decision.Mode = "single"
		decision.ThreadParts = 0
	} else {
		decision.ThreadParts = max(2, min(3, parsed.ThreadParts))
	}

	seen := make(map[int]struct{}, len(parsed.ImageIndexes))
	cleaned := make([]int, 0, len(parsed.ImageIndexes))
	for _, idx := range parsed.ImageIndexes {
		if idx < 1 || idx > len(images) {
			continue
		}
		if _, ok := seen[idx]; ok {
			continue
		}
		seen[idx] = struct{}{}
		cleaned = append(cleaned, idx)
	}
	for i := 1; i < len(cleaned); i++ {
		for j := i; j > 0 && cleaned[j-1] > cleaned[j]; j-- {
			cleaned[j-1], cleaned[j] = cleaned[j], cleaned[j-1]
		}
	}
	if len(cleaned) > 1 {
		cleaned = cleaned[:1]
	}
	decision.ImageIndexes = cleaned

	return decision, nil
}

// ThreadWithMediaPlanResult holds the generated output for one platform when
// GenerateWithMediaPlan runs.
type ThreadWithMediaPlanResult struct {
	Content  string          // full thread text joined with newlines
	Segments []ThreadSegment // one entry per thread part; ImageIndex left nil (caller assigns)
}

// GenerateWithMediaPlan is the non-streaming entry point used by background
// workers (e.g. the GitHub draft generator). It produces base content and
// per-platform output in one call, with the prompt instructing the AI about
// pre-assigned media layout so copy lines up with attachments.
//
// The plan's Mode field decides whether each platform is generated as a
// single post or a thread. Single-post output is returned as a
// ThreadWithMediaPlanResult with exactly one segment — callers treat the
// shape uniformly.
func (p *ContentProcessor) GenerateWithMediaPlan(
	ctx context.Context,
	accountID uuid.UUID,
	prompt string,
	platforms []string,
	plan *prompts.MediaPlan,
) (string, map[string]ThreadWithMediaPlanResult, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "operation", Value: "generate_with_media_plan"},
	)

	voice := p.getVoiceContext(ctx, accountID)
	mode := "thread"
	if plan != nil && plan.Mode != "" {
		mode = plan.Mode
	}

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

			var sysPrompt string
			isThread := mode == "thread" && platformCfg.SupportsThreads
			if isThread {
				parts := 0
				if plan != nil {
					parts = plan.ThreadParts
				}
				sysPrompt = prompts.SystemThreadWithMediaPlan(platform, parts, plan)
			} else {
				sysPrompt = prompts.SystemSingleWithMediaPlan(platform, voice, plan)
			}

			raw, err := p.aiClient.CreateMessage(gCtx, sysPrompt, []aiclient.Message{
				{Role: "user", Content: baseContent},
			}, 0)
			if err != nil {
				p.logger.Error(gCtx, "failed to generate content for platform "+platform, err)
				return err
			}

			if isThread {
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
			}

			// Single-post mode: one segment carries everything.
			content := truncateToCharLimit(strings.TrimSpace(raw), platformCfg.CharLimit)
			mu.Lock()
			results[platform] = ThreadWithMediaPlanResult{
				Content:  content,
				Segments: []ThreadSegment{{Content: content}},
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

// ModeDecision is the AI's verdict on whether a post with pre-selected media
// should be a single post or a thread, and how many parts the thread needs.
// Unlike SelectMediaAndMode it does NOT filter media — the caller trusts the
// user's selection and only needs the layout decision.
type ModeDecision struct {
	Mode        string // "single" or "thread"
	ThreadParts int    // 2–3 when Mode="thread", 0 otherwise
	Reason      string
}

// DecideMode runs a lightweight AI call to choose single vs thread mode for a
// post whose media has already been chosen by the user (trust-user-selection
// path). It does not filter or drop any media.
//
// Callers should treat errors as fail-open — if this call fails, fall back to
// thread mode with a reasonable part count.
func (p *ContentProcessor) DecideMode(
	ctx context.Context,
	video *aiclient.ImageData,
	images []aiclient.ImageData,
	prompt string,
) (ModeDecision, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "operation", Value: "decide_mode"},
		observability.Field{Key: "has_video", Value: fmt.Sprintf("%t", video != nil)},
		observability.Field{Key: "image_count", Value: fmt.Sprintf("%d", len(images))},
	)

	systemPrompt := `You are an editorial director for a solo founder's social posts. The user has already selected which media to include. You only need to decide:

1. Whether the post should be a single post or a thread.
2. If thread, how many parts.

You will receive:
- An optional short video clip (MIME type tells you it's a video).
- Zero or more screenshots, each labelled by 1-based index.
- The post prompt / commit message.

Return raw JSON only (no markdown fences, no commentary):
{
  "mode": "single"|"thread",
  "thread_parts": 0,
  "reason": "one short sentence"
}

Mode rules:
- "single" when the change is small, the media is one strong video or one strong screenshot, or the prompt does not carry enough substance for multiple beats.
- "thread" when there is enough substance + enough media (or enough narrative) to pace it across multiple posts. Threads with thin copy feel padded — prefer single in that case.
- When mode="thread", thread_parts is an integer 2–3. Do not exceed 3. When mode="single", thread_parts MUST be 0.`

	parts := make([]string, 0, 2+len(images))
	parts = append(parts, fmt.Sprintf("Post prompt:\n%s", strings.TrimSpace(prompt)))
	attached := make([]aiclient.ImageData, 0, 1+len(images))
	if video != nil {
		parts = append(parts, "Attached video (next attachment).")
		attached = append(attached, *video)
	} else {
		parts = append(parts, "No video attached.")
	}
	for i := range images {
		parts = append(parts, fmt.Sprintf("Attached image %d (next attachment):", i+1))
		attached = append(attached, images[i])
	}
	messages := []aiclient.Message{
		{
			Role:    "user",
			Content: strings.Join(parts, "\n\n"),
			Images:  attached,
		},
	}

	raw, err := p.aiClient.CreateMessage(ctx, systemPrompt, messages, 512)
	if err != nil {
		p.logger.Error(ctx, "failed to decide mode via ai", err)
		return ModeDecision{}, ErrDecideMode
	}

	var parsed struct {
		Mode        string `json:"mode"`
		ThreadParts int    `json:"thread_parts"`
		Reason      string `json:"reason"`
	}
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &parsed); err != nil {
		p.logger.Error(ctx, "failed to parse mode decision response", err)
		return ModeDecision{}, ErrDecideMode
	}

	decision := ModeDecision{
		Mode:   strings.ToLower(strings.TrimSpace(parsed.Mode)),
		Reason: strings.TrimSpace(parsed.Reason),
	}
	if decision.Mode != "thread" {
		decision.Mode = "single"
		decision.ThreadParts = 0
	} else {
		decision.ThreadParts = max(2, min(3, parsed.ThreadParts))
	}
	return decision, nil
}

// FetchAndBucketMedia fetches all media rows for the given IDs (must belong to
// accountID) from the store, then downloads each S3 object and returns a
// single video (first video/* MIME) plus remaining images. IDs not found in
// the store are silently skipped. Returns ErrFetchMedia on store or S3 errors.
func (p *ContentProcessor) FetchAndBucketMedia(
	ctx context.Context,
	accountID uuid.UUID,
	mediaIDs []uuid.UUID,
) (video *aiclient.ImageData, images []aiclient.ImageData, videoPresent bool, err error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "operation", Value: "fetch_and_bucket_media"},
		observability.Field{Key: "media_count", Value: fmt.Sprintf("%d", len(mediaIDs))},
	)

	if p.mediaStore == nil || p.s3Fetch == nil {
		p.logger.Error(ctx, "media-aware generation requested but media dependencies not wired", nil)
		return nil, nil, false, ErrFetchMedia
	}

	rows, err := p.mediaStore.GetMediaByIDs(ctx, mediaIDs)
	if err != nil {
		p.logger.Error(ctx, "failed to load media rows for generation", err)
		return nil, nil, false, ErrFetchMedia
	}

	rowByID := make(map[uuid.UUID]store.Media, len(rows))
	for _, r := range rows {
		rowByID[r.ID] = r
	}

	images = make([]aiclient.ImageData, 0, len(mediaIDs))
	for _, id := range mediaIDs {
		row, ok := rowByID[id]
		if !ok {
			continue
		}
		if row.AccountID != accountID {
			continue
		}
		if row.S3Key == "" {
			continue
		}

		body, ct, fetchErr := p.s3Fetch.GetFile(ctx, row.S3Key)
		if fetchErr != nil {
			p.logger.Error(ctx, "failed to fetch media from s3 for generation", fetchErr)
			return nil, nil, false, ErrFetchMedia
		}
		data, readErr := io.ReadAll(body)
		body.Close()
		if readErr != nil {
			p.logger.Error(ctx, "failed to read s3 media body", readErr)
			return nil, nil, false, ErrFetchMedia
		}

		mimeType := row.ContentType
		if mimeType == "" {
			mimeType = ct
		}

		img := aiclient.ImageData{MIMEType: mimeType, Data: data}
		if strings.HasPrefix(mimeType, "video/") {
			if video == nil {
				video = &img
				videoPresent = true
			}
		} else if strings.HasPrefix(mimeType, "image/") {
			images = append(images, img)
		}
	}
	return video, images, videoPresent, nil
}
