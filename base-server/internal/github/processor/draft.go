package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=draft.go -destination=draft_mocks_test.go -package=processor

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"path"
	"strings"

	"base-server/internal/content/prompts"
	contentProc "base-server/internal/content/processor"
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
	defaultMaxThreadParts = 7
	draftPostSource       = "github_event"
	mediaSource           = "github_capture"
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
// processor. Accepts a prompt + a pre-computed media plan and returns base
// content plus per-platform thread segments (ImageIndex unset — the caller
// assigns it).
type ContentGenerator interface {
	GenerateWithMediaPlan(
		ctx context.Context,
		accountID uuid.UUID,
		prompt string,
		platforms []string,
		maxThreadParts int,
		plan *prompts.MediaPlan,
	) (string, map[string]contentProc.ThreadWithMediaPlanResult, error)
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

// DraftGenerator turns a completed capture (video + screenshots in S3) into a
// draft post with thread variants for every connected platform.
type DraftGenerator struct {
	store    DraftStore
	content  ContentGenerator
	posts    PostsDrafter
	s3Head   S3HeadClient
	s3Bucket string
	logger   *observability.Logger
}

// NewDraftGenerator wires the dependencies. s3Bucket is recorded on each
// media row's s3_url as `s3://bucket/key` so the media handler can presign
// it on read — same pattern the commit detail page uses for capture_output.
func NewDraftGenerator(
	store DraftStore,
	content ContentGenerator,
	posts PostsDrafter,
	s3Head S3HeadClient,
	s3Bucket string,
	logger *observability.Logger,
) DraftGenerator {
	return DraftGenerator{
		store:    store,
		content:  content,
		posts:    posts,
		s3Head:   s3Head,
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
	mediaIDs, mediaPlan, err := g.materializeMedia(ctx, commit.AccountID, videoKey, imageKeys)
	if err != nil {
		return ErrDraftGenerationFailed
	}

	prompt := buildDraftPrompt(commit)
	baseContent, perPlatform, err := g.content.GenerateWithMediaPlan(
		ctx, commit.AccountID, prompt, targets, defaultMaxThreadParts, mediaPlan,
	)
	if err != nil {
		g.logger.Error(ctx, "failed to generate thread content", err)
		return ErrDraftGenerationFailed
	}

	platforms := assemblePlatformDrafts(perPlatform, targets, mediaIDs, mediaPlan)
	post, err := g.posts.SaveDraft(ctx, postsProc.SaveDraftParams{
		AccountID:   commit.AccountID,
		Content:     baseContent,
		ContentType: "thread",
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
// the pre-computed ImageIndex values from the media plan — segment 0 gets the
// video (if any) or the first image, subsequent segments get subsequent
// images, remaining segments carry no media.
func assemblePlatformDrafts(
	perPlatform map[string]contentProc.ThreadWithMediaPlanResult,
	targets []string,
	mediaIDs store.UUIDArray,
	plan *prompts.MediaPlan,
) []postsProc.PlatformDraftContent {
	// Build the zero-based index list for the post.media_ids array, in the
	// same order the plan assigns to segments.
	zeroIndexes := make([]int, 0, 1+len(plan.ImageIndexes))
	if plan.VideoIndex > 0 {
		zeroIndexes = append(zeroIndexes, 0)
	}
	for i := range plan.ImageIndexes {
		offset := i
		if plan.VideoIndex > 0 {
			offset = i + 1
		}
		if offset < len(mediaIDs) {
			zeroIndexes = append(zeroIndexes, offset)
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
			if i < len(zeroIndexes) {
				idx := zeroIndexes[i]
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
