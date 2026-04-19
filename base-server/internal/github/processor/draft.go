package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=draft.go -destination=draft_mocks_test.go -package=processor

import (
	"context"
	"encoding/json"
	"errors"
	"io"

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

const (
	// fallbackThreadParts is the part count used only when the media/mode
	// assessor call fails AND we're falling back to thread mode. Happy-path
	// generation uses the AI-chosen count.
	fallbackThreadParts = 3
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
		images []aiclient.ImageData,
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
	decisionCtx := observability.WithFields(ctx,
		observability.Field{Key: "assessor_reason", Value: decision.Reason},
		observability.Field{Key: "assessor_use_video", Value: decision.UseVideo},
		observability.Field{Key: "assessor_image_indexes", Value: decision.ImageIndexes},
		observability.Field{Key: "assessor_mode", Value: decision.Mode},
	)
	g.logger.Info(decisionCtx, "media/mode decision")
	if !decision.UseVideo {
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
		ctx, commit.AccountID, prompt, targets, mediaPlan, nil,
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
