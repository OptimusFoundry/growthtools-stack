package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=draft.go -destination=draft_mocks_test.go -package=processor

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"path"
	"strings"

	"base-server/internal/content/prompts"
	contentProc "base-server/internal/content/processor"
	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	postsProc "base-server/internal/posts/processor"

	"github.com/google/uuid"
)

// Platforms we support drafting for today. All three support threads, so the
// pipeline does not need to branch on single vs thread per-platform.
var draftTargetPlatforms = []string{"x", "bluesky", "threads"}

// Media extensions we recognize. Anything else in capture_output.uploaded is
// ignored (png/jpg/jpeg accepted as images; mp4/mov/webm as video).
var (
	imageExts = map[string]struct{}{
		".jpg":  {},
		".jpeg": {},
		".png":  {},
	}
	videoExts = map[string]struct{}{
		".mp4":  {},
		".mov":  {},
		".webm": {},
	}
)

const (
	// fallbackThreadParts is the part count used only when the media/mode
	// assessor call fails AND we're falling back to thread mode. Happy-path
	// generation uses the AI-chosen count.
	fallbackThreadParts = 5
	draftPostSource     = "github_event"
	mediaSource         = "github_capture"
)

var (
	ErrDraftGuardTripped     = errors.New("draft generation guard tripped")
	ErrDraftGenerationFailed = errors.New("failed to generate draft from commit")
)

// DraftStore is the slice of the store the draft generator needs. It's
// separate from GitHubStore so the dependency surface stays minimal and the
// mocks stay focused.
type DraftStore interface {
	GetGitHubCommitForDraft(ctx context.Context, commitID uuid.UUID) (store.GitHubCommitForDraft, error)
	ListPlatformConnectionsByAccount(ctx context.Context, accountID uuid.UUID) ([]store.PlatformConnection, error)
	CreateMedia(ctx context.Context, params store.CreateMediaParams) (store.Media, error)
	UpdateGitHubCommitPostID(ctx context.Context, commitID, postID uuid.UUID) error
}

// ContentGenerator is the non-streaming generation entrypoint on the content
// processor. It decides (via a multimodal assessor call) what media is worth
// attaching and whether the post should be single or thread, then generates
// per-platform content honouring that decision.
type ContentGenerator interface {
	GenerateWithMediaPlan(
		ctx context.Context,
		accountID uuid.UUID,
		prompt string,
		platforms []string,
		plan *prompts.MediaPlan,
	) (string, map[string]contentProc.ThreadWithMediaPlanResult, error)

	// SelectMediaAndMode evaluates a candidate video + candidate images and
	// decides both what to attach and whether the output should be single or
	// thread mode.
	SelectMediaAndMode(
		ctx context.Context,
		video *aiclient.ImageData,
		images []aiclient.ImageData,
		commitMessage string,
	) (contentProc.MediaAndModeDecision, error)
}

// PostsDrafter lets us persist a draft without depending on the whole posts
// processor.
type PostsDrafter interface {
	SaveDraft(ctx context.Context, params postsProc.SaveDraftParams) (store.Post, error)
}

// S3HeadClient returns size + content-type for an S3 key so we can store
// accurate media metadata without reading the object body.
type S3HeadClient interface {
	HeadObject(ctx context.Context, key string) (int64, string, error)
}

// S3Fetcher reads an object body from S3. The draft generator uses it to
// fetch image bytes so a multimodal AI call can pick which capture frames
// actually belong in the post.
type S3Fetcher interface {
	GetFile(ctx context.Context, key string) (io.ReadCloser, string, error)
}

// DraftGenerator turns a completed capture (video + screenshots in S3) into a
// draft post with thread variants for every connected platform.
type DraftGenerator struct {
	store    DraftStore
	content  ContentGenerator
	posts    PostsDrafter
	s3Head   S3HeadClient
	s3Fetch  S3Fetcher
	s3Bucket string
	logger   *observability.Logger
}

// NewDraftGenerator wires the dependencies. s3Bucket is recorded on each
// media row's s3_url as `s3://bucket/key` so the media handler can presign
// it on read — same pattern the commit detail page uses for capture_output.
// s3Fetch may be nil; when it is, the draft generator skips AI-driven image
// selection and keeps every captured image (same behaviour as before the
// selection step existed).
func NewDraftGenerator(
	store DraftStore,
	content ContentGenerator,
	posts PostsDrafter,
	s3Head S3HeadClient,
	s3Fetch S3Fetcher,
	s3Bucket string,
	logger *observability.Logger,
) DraftGenerator {
	return DraftGenerator{
		store:    store,
		content:  content,
		posts:    posts,
		s3Head:   s3Head,
		s3Fetch:  s3Fetch,
		s3Bucket: s3Bucket,
		logger:   logger,
	}
}

// capturePayload mirrors the subset of capture_output we consume. Keep
// compatible with the capture-worker's result-message schema and with the
// rewrite shape used by GetCommit.
type capturePayload struct {
	Uploaded []captureUpload `json:"uploaded,omitempty"`
	Error    string          `json:"error,omitempty"`
}

type captureUpload struct {
	Key string `json:"key"`
	URL string `json:"url,omitempty"`
}

// GenerateDraftFromCommit is the top-level flow invoked by the worker.
// Guards + persistence + AI + link-back, all in order. Returns
// ErrDraftGuardTripped for expected no-ops (commit already drafted, capture
// failed, no platforms) so the worker can log at INFO rather than ERROR.
func (g *DraftGenerator) GenerateDraftFromCommit(ctx context.Context, commitID uuid.UUID) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "commit_id", Value: commitID.String()},
		observability.Field{Key: "operation", Value: "generate_draft_from_commit"},
	)

	commit, err := g.store.GetGitHubCommitForDraft(ctx, commitID)
	if err != nil {
		g.logger.Error(ctx, "failed to load commit for draft generation", err)
		return ErrDraftGenerationFailed
	}

	if commit.PostID != nil {
		g.logger.Info(ctx, "commit already linked to a post; skipping draft generation")
		return ErrDraftGuardTripped
	}
	if commit.CaptureOutput == nil {
		g.logger.Info(ctx, "commit has no capture_output; skipping draft generation")
		return ErrDraftGuardTripped
	}

	var payload capturePayload
	if err := json.Unmarshal(*commit.CaptureOutput, &payload); err != nil {
		g.logger.Error(ctx, "failed to parse capture_output", err)
		return ErrDraftGenerationFailed
	}
	if payload.Error != "" {
		g.logger.Info(ctx, "capture output reports failure; skipping draft generation")
		return ErrDraftGuardTripped
	}

	connections, err := g.store.ListPlatformConnectionsByAccount(ctx, commit.AccountID)
	if err != nil {
		g.logger.Error(ctx, "failed to list platform connections", err)
		return ErrDraftGenerationFailed
	}
	targets := filterTargetPlatforms(connections)
	if len(targets) == 0 {
		g.logger.Info(ctx, "no supported platform connections for account; skipping draft generation")
		return ErrDraftGuardTripped
	}

	videoKey, imageKeys := bucketArtifacts(payload.Uploaded)
	decision := g.assessMediaAndMode(ctx, commit.Message, videoKey, imageKeys)
	if decision.UseVideo {
		g.logger.Info(ctx, "media/mode decision: "+decision.Reason)
	} else {
		videoKey = ""
	}
	imageKeys = pickImagesByIndex(imageKeys, decision.ImageIndexes)

	mediaIDs, mediaPlan, err := g.materializeMedia(ctx, commit.AccountID, videoKey, imageKeys)
	if err != nil {
		return ErrDraftGenerationFailed
	}
	mediaPlan.Mode = decision.Mode
	mediaPlan.ThreadParts = decision.ThreadParts

	prompt := buildDraftPrompt(commit)
	baseContent, perPlatform, err := g.content.GenerateWithMediaPlan(
		ctx, commit.AccountID, prompt, targets, mediaPlan,
	)
	if err != nil {
		g.logger.Error(ctx, "failed to generate draft content", err)
		return ErrDraftGenerationFailed
	}

	contentType := store.ContentTypeText
	if decision.Mode == "thread" {
		contentType = store.ContentTypeThread
	}

	platforms := assemblePlatformDrafts(perPlatform, targets, mediaIDs, mediaPlan)
	post, err := g.posts.SaveDraft(ctx, postsProc.SaveDraftParams{
		AccountID:   commit.AccountID,
		Content:     baseContent,
		ContentType: contentType,
		MediaIDs:    store.UUIDArray(mediaIDs),
		AIGenerated: true,
		BaseContent: &baseContent,
		Platforms:   platforms,
		Source:      draftPostSource,
	})
	if err != nil {
		g.logger.Error(ctx, "failed to save draft from commit", err)
		return ErrDraftGenerationFailed
	}

	if err := g.store.UpdateGitHubCommitPostID(ctx, commit.ID, post.ID); err != nil {
		// Draft is already persisted — log but don't surface as a hard
		// failure, the post is visible to the user either way.
		g.logger.Error(ctx, "failed to link commit to drafted post", err)
	}

	return nil
}

// filterTargetPlatforms returns the intersection of a user's active
// connections and the platforms we support drafting for.
func filterTargetPlatforms(connections []store.PlatformConnection) []string {
	active := make(map[string]bool, len(connections))
	for _, c := range connections {
		if c.Status == "active" {
			active[c.Platform] = true
		}
	}
	result := make([]string, 0, len(draftTargetPlatforms))
	for _, p := range draftTargetPlatforms {
		if active[p] {
			result = append(result, p)
		}
	}
	return result
}

// assessMediaAndMode fetches the candidate video + image bytes from S3 and
// asks the content processor for a single verdict on (a) which media is
// worth attaching and (b) whether the post should be single or thread.
//
// This step is best-effort: if the S3 fetcher is nil (local-dir deploys),
// any fetch fails, or the AI call fails, we fall back to "keep everything,
// use thread mode with the fallback part count" so the draft still makes
// it out. Failing open preserves behaviour parity with the pre-assessor
// pipeline when the multimodal provider is flaky.
func (g *DraftGenerator) assessMediaAndMode(
	ctx context.Context,
	commitMessage, videoKey string,
	imageKeys []string,
) contentProc.MediaAndModeDecision {
	fallbackIndexes := make([]int, len(imageKeys))
	for i := range imageKeys {
		fallbackIndexes[i] = i + 1
	}
	fallback := contentProc.MediaAndModeDecision{
		UseVideo:     videoKey != "",
		ImageIndexes: fallbackIndexes,
		Mode:         "thread",
		ThreadParts:  fallbackThreadParts,
		Reason:       "assessor unavailable; keeping all captured media",
	}

	if g.s3Fetch == nil || (videoKey == "" && len(imageKeys) == 0) {
		return fallback
	}

	var video *aiclient.ImageData
	if videoKey != "" {
		v, err := g.fetchMedia(ctx, videoKey)
		if err != nil {
			g.logger.Error(ctx, "failed to fetch capture video for assessment; keeping all media", err)
			return fallback
		}
		video = &v
	}

	images := make([]aiclient.ImageData, 0, len(imageKeys))
	for _, key := range imageKeys {
		img, err := g.fetchMedia(ctx, key)
		if err != nil {
			g.logger.Error(ctx, "failed to fetch capture image for assessment; keeping all media", err)
			return fallback
		}
		images = append(images, img)
	}

	decision, err := g.content.SelectMediaAndMode(ctx, video, images, commitMessage)
	if err != nil {
		g.logger.Error(ctx, "media/mode assessment failed; keeping all captured media", err)
		return fallback
	}
	if decision.Mode == "" {
		decision.Mode = "single"
	}
	return decision
}

// pickImagesByIndex returns the subset of imageKeys matching the 1-based
// indexes in `selected`, preserving the order the caller provided. Invalid
// indexes are silently dropped so a malformed AI response degrades to
// "fewer images" rather than a crash.
func pickImagesByIndex(imageKeys []string, selected []int) []string {
	if len(imageKeys) == 0 || len(selected) == 0 {
		return []string{}
	}
	out := make([]string, 0, len(selected))
	for _, idx := range selected {
		if idx < 1 || idx > len(imageKeys) {
			continue
		}
		out = append(out, imageKeys[idx-1])
	}
	return out
}

// fetchMedia downloads an S3 object and returns it shaped for a multimodal
// AI request. Works for both image and video keys — the MIME type is read
// from S3 metadata and falls back to the extension.
func (g *DraftGenerator) fetchMedia(ctx context.Context, key string) (aiclient.ImageData, error) {
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

// bucketArtifacts splits uploaded items by extension. Returns the first
// recognized video key (or "" if none) and every recognized image key.
func bucketArtifacts(uploaded []captureUpload) (string, []string) {
	var video string
	images := make([]string, 0, len(uploaded))
	for _, u := range uploaded {
		ext := strings.ToLower(path.Ext(u.Key))
		if _, ok := videoExts[ext]; ok {
			if video == "" {
				video = u.Key
			}
			continue
		}
		if _, ok := imageExts[ext]; ok {
			images = append(images, u.Key)
		}
	}
	return video, images
}

// materializeMedia HEADs each artifact for size/content-type metadata and
// creates one media row per key. Order: video first (if present), then the
// images in the order provided. Returns the media ids and a MediaPlan that
// mirrors that ordering (1-based indexes for prompt consumption).
func (g *DraftGenerator) materializeMedia(
	ctx context.Context,
	accountID uuid.UUID,
	videoKey string,
	imageKeys []string,
) (store.UUIDArray, *prompts.MediaPlan, error) {
	mediaIDs := make([]uuid.UUID, 0, 1+len(imageKeys))
	plan := &prompts.MediaPlan{}

	createOne := func(key string, fallbackContentType string) (uuid.UUID, error) {
		var size int64
		var contentType string
		if g.s3Head != nil {
			s, ct, err := g.s3Head.HeadObject(ctx, key)
			if err != nil {
				g.logger.Error(ctx, "failed to head s3 object for media ingest", err)
				// Still store the row with what we know — a zero size and the
				// fallback content-type keep the media usable for publishing.
			} else {
				size = s
				contentType = ct
			}
		}
		// The file extension is authoritative for capture artifacts — we
		// produced them ourselves, so we know a `.mp4` is `video/mp4` no
		// matter what S3 records. Override whenever the extension maps to
		// a known media mime: this undoes cases where the uploader stamped
		// the object with `application/octet-stream` (the previous
		// capture-worker behaviour for unlabelled types), which otherwise
		// trips the webapp's `contentType.startsWith("video/")` check and
		// renders the video as a generic file icon.
		if extType := contentTypeFor(key); extType != "application/octet-stream" {
			contentType = extType
		}
		if contentType == "" {
			contentType = fallbackContentType
		}
		row, err := g.store.CreateMedia(ctx, store.CreateMediaParams{
			AccountID:   accountID,
			Filename:    path.Base(key),
			ContentType: contentType,
			S3Key:       key,
			S3URL:       fmt.Sprintf("s3://%s/%s", g.s3Bucket, key),
			SizeBytes:   size,
			Source:      mediaSource,
		})
		if err != nil {
			g.logger.Error(ctx, "failed to create media row for capture artifact", err)
			return uuid.Nil, err
		}
		return row.ID, nil
	}

	nextIndex := 1
	if videoKey != "" {
		id, err := createOne(videoKey, contentTypeFor(videoKey))
		if err != nil {
			return nil, nil, err
		}
		mediaIDs = append(mediaIDs, id)
		plan.VideoIndex = nextIndex
		nextIndex++
	}
	for _, key := range imageKeys {
		id, err := createOne(key, contentTypeFor(key))
		if err != nil {
			return nil, nil, err
		}
		mediaIDs = append(mediaIDs, id)
		plan.ImageIndexes = append(plan.ImageIndexes, nextIndex)
		nextIndex++
	}
	return store.UUIDArray(mediaIDs), plan, nil
}

// contentTypeFor maps known extensions to a sensible MIME type. Used when
// HeadObject fails or returns an empty content-type.
func contentTypeFor(key string) string {
	switch strings.ToLower(path.Ext(key)) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".mp4":
		return "video/mp4"
	case ".mov":
		return "video/quicktime"
	case ".webm":
		return "video/webm"
	}
	return "application/octet-stream"
}

// assemblePlatformDrafts walks each platform's generated segments and assigns
// ImageIndex values from the media plan — segment 0 gets the video (if any)
// or the first image, subsequent segments get subsequent images, remaining
// segments carry no media.
//
// ThreadSegment.ImageIndex is 1-based into post.media_ids. The adapter layer
// (see internal/platform/adapters/adapter.go: mediaURLForSegment) subtracts
// 1 before indexing; storing 0-based values here would make mediaURLForSegment
// miss the first media entry entirely — which is why the video used to never
// actually attach to the first post in the thread.
func assemblePlatformDrafts(
	perPlatform map[string]contentProc.ThreadWithMediaPlanResult,
	targets []string,
	mediaIDs store.UUIDArray,
	plan *prompts.MediaPlan,
) []postsProc.PlatformDraftContent {
	// Build the 1-based index list for the post.media_ids array, in the
	// order the plan assigns media to thread segments.
	oneBasedIndexes := make([]int, 0, 1+len(plan.ImageIndexes))
	if plan.VideoIndex > 0 {
		oneBasedIndexes = append(oneBasedIndexes, 1)
	}
	for i := range plan.ImageIndexes {
		offset := i
		if plan.VideoIndex > 0 {
			offset = i + 1
		}
		if offset < len(mediaIDs) {
			oneBasedIndexes = append(oneBasedIndexes, offset+1)
		}
	}

	drafts := make([]postsProc.PlatformDraftContent, 0, len(targets))
	for _, platform := range targets {
		result, ok := perPlatform[platform]
		if !ok {
			continue
		}
		segments := make([]contentProc.ThreadSegment, len(result.Segments))
		for i, seg := range result.Segments {
			segments[i] = seg
			if i < len(oneBasedIndexes) {
				idx := oneBasedIndexes[i]
				segments[i].ImageIndex = &idx
			}
		}
		raw, err := json.Marshal(segments)
		if err != nil {
			// Extremely unlikely — []ThreadSegment is plain JSON.
			continue
		}
		rawMsg := json.RawMessage(raw)
		content := result.Content
		drafts = append(drafts, postsProc.PlatformDraftContent{
			Platform:       platform,
			Content:        &content,
			ThreadSegments: &rawMsg,
		})
	}
	return drafts
}

// buildDraftPrompt turns the commit into a blurb the content generator can
// expand on. We keep the framing concrete so the AI has real material to
// work with even when capture media is missing.
func buildDraftPrompt(commit store.GitHubCommitForDraft) string {
	var sb strings.Builder
	sb.WriteString("Write social posts announcing a shipped change in a product.\n\n")
	fmt.Fprintf(&sb, "Repository: %s/%s\n", commit.RepoOwner, commit.RepoName)
	sb.WriteString("Commit message:\n")
	sb.WriteString(commit.Message)
	sb.WriteString("\n\nTurn this into a thread that reads like the builder talking to peers — what changed, why it matters, how it feels to use. Do not reference commit shas, branch names, or internal repo mechanics.")
	return sb.String()
}
