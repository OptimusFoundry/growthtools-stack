package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=draft.go -destination=draft_mocks_test.go -package=processor

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"path"

	"base-server/internal/ai/commitclassifier"
	"base-server/internal/ai/mediadescriber"
	"base-server/internal/ai/mediaplanner"
	"base-server/internal/ai/socialposts"
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
	store      DraftStore
	classifier *commitclassifier.Classifier
	describer  *mediadescriber.Describer
	planner    *mediaplanner.Planner
	generator  *socialposts.Generator
	posts      PostsDrafter
	s3Head     S3HeadClient
	s3Fetch    S3Fetcher
	s3Bucket   string
	logger     *observability.Logger
}

// NewDraftGenerator wires the dependencies. s3Bucket is recorded on each
// media row's s3_url as `s3://bucket/key` so the media handler can presign
// it on read — same pattern the commit detail page uses for capture_output.
// s3Fetch may be nil; when it is, the draft generator skips media description
// and uses a fallback decision (keep all media, thread mode).
func NewDraftGenerator(
	store DraftStore,
	classifier *commitclassifier.Classifier,
	describer *mediadescriber.Describer,
	planner *mediaplanner.Planner,
	generator *socialposts.Generator,
	posts PostsDrafter,
	s3Head S3HeadClient,
	s3Fetch S3Fetcher,
	s3Bucket string,
	logger *observability.Logger,
) DraftGenerator {
	return DraftGenerator{
		store:      store,
		classifier: classifier,
		describer:  describer,
		planner:    planner,
		generator:  generator,
		posts:      posts,
		s3Head:     s3Head,
		s3Fetch:    s3Fetch,
		s3Bucket:   s3Bucket,
		logger:     logger,
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

	// Step 1: bucket artifacts by type (video + images)
	videoKey, imageKeys := bucketArtifacts(payload.Uploaded)
	componentNames := storybookComponentNames(payload.Uploaded)

	// Step 2: fetch media bytes from S3
	mediaBytes := make(map[string][]byte)
	if videoKey != "" {
		body, _, err := g.s3Fetch.GetFile(ctx, videoKey)
		if err != nil {
			g.logger.Error(ctx, "failed to fetch video from s3", err)
			return ErrDraftGenerationFailed
		}
		defer body.Close()
		data, err := io.ReadAll(body)
		if err != nil {
			g.logger.Error(ctx, "failed to read video bytes", err)
			return ErrDraftGenerationFailed
		}
		mediaBytes[videoKey] = data
	}
	for _, key := range imageKeys {
		body, _, err := g.s3Fetch.GetFile(ctx, key)
		if err != nil {
			g.logger.Error(ctx, "failed to fetch image from s3", err)
			return ErrDraftGenerationFailed
		}
		defer body.Close()
		data, err := io.ReadAll(body)
		if err != nil {
			g.logger.Error(ctx, "failed to read image bytes", err)
			return ErrDraftGenerationFailed
		}
		mediaBytes[key] = data
	}

	// Step 3: build mediadescriber.Media items (1-based indexes)
	mediaItems := make([]mediadescriber.Media, 0)
	nextIndex := 1
	if videoKey != "" {
		mediaItems = append(mediaItems, mediadescriber.Media{
			Index:    nextIndex,
			Kind:     mediadescriber.KindVideo,
			MIMEType: contentTypeFor(videoKey),
			Data:     mediaBytes[videoKey],
		})
		nextIndex++
	}
	for _, key := range imageKeys {
		mediaItems = append(mediaItems, mediadescriber.Media{
			Index:    nextIndex,
			Kind:     mediadescriber.KindImage,
			MIMEType: contentTypeFor(key),
			Data:     mediaBytes[key],
		})
		nextIndex++
	}

	// Step 4: describe all media in parallel
	descriptions := g.describer.DescribeBatch(ctx, mediaItems)

	// Step 5: plan which media to keep and post mode
	plannerReq := mediaplanner.SelectRequest{
		CommitMessage: commit.Message,
		Descriptions:  descriptions,
	}
	decision, err := g.planner.SelectAndDecide(ctx, plannerReq)
	if err != nil {
		g.logger.Error(ctx, "failed to plan media and mode", err)
		return ErrDraftGenerationFailed
	}

	decisionCtx := observability.WithFields(ctx,
		observability.Field{Key: "planner_reason", Value: decision.Reason},
		observability.Field{Key: "planner_keep_indexes", Value: decision.KeepIndexes},
		observability.Field{Key: "planner_mode", Value: decision.Mode},
		observability.Field{Key: "planner_thread_parts", Value: decision.ThreadParts},
	)
	g.logger.Info(decisionCtx, "media/mode decision")

	// Step 6: filter descriptions by keep_indexes to get selectedDescriptions
	selectedDescriptions := make([]mediadescriber.Description, 0, len(decision.KeepIndexes))
	for _, idx := range decision.KeepIndexes {
		for _, desc := range descriptions {
			if desc.Index == idx {
				selectedDescriptions = append(selectedDescriptions, desc)
				break
			}
		}
	}

	// Step 7: materialize media and build media IDs
	mediaIDs := make([]uuid.UUID, 0, len(selectedDescriptions))
	for _, desc := range selectedDescriptions {
		var key string
		nextIdx := 1
		if videoKey != "" && nextIdx == desc.Index {
			key = videoKey
		} else {
			imgIdx := desc.Index - 1
			if videoKey != "" {
				imgIdx--
			}
			if imgIdx >= 0 && imgIdx < len(imageKeys) {
				key = imageKeys[imgIdx]
			}
		}
		if key == "" {
			continue
		}

		var size int64
		var contentType string
		if g.s3Head != nil {
			s, ct, err := g.s3Head.HeadObject(ctx, key)
			if err != nil {
				g.logger.Error(ctx, "failed to head s3 object for media ingest", err)
			} else {
				size = s
				contentType = ct
			}
		}
		if extType := contentTypeFor(key); extType != "application/octet-stream" {
			contentType = extType
		}
		if contentType == "" {
			contentType = "application/octet-stream"
		}

		media, err := g.store.CreateMedia(ctx, store.CreateMediaParams{
			AccountID:   commit.AccountID,
			Filename:    lastPathComponent(key),
			ContentType: contentType,
			S3Key:       key,
			S3URL:       fmt.Sprintf("s3://%s/%s", g.s3Bucket, key),
			SizeBytes:   size,
			Source:      mediaSource,
		})
		if err != nil {
			g.logger.Error(ctx, "failed to create media row for capture artifact", err)
			return ErrDraftGenerationFailed
		}
		mediaIDs = append(mediaIDs, media.ID)
	}

	// Step 8: call socialposts.Generator
	mode := socialposts.Mode(decision.Mode)
	prompt := buildDraftPrompt(commit)
	if len(componentNames) > 0 {
		prompt = buildComponentDraftPrompt(commit, componentNames)
	}
	genReq := socialposts.Request{
		Prompt:      prompt,
		Platforms:   targets,
		Mode:        mode,
		ThreadParts: decision.ThreadParts,
		Media:       selectedDescriptions,
	}
	result, err := g.generator.Generate(ctx, genReq)
	if err != nil {
		g.logger.Error(ctx, "failed to generate social posts", err)
		return ErrDraftGenerationFailed
	}

	// Step 9: assemble platform drafts from socialposts results
	contentType := store.ContentTypeText
	if decision.Mode == "thread" {
		contentType = store.ContentTypeThread
	}

	platforms := assemblePlatformDrafts(result.Platforms, targets, mediaIDs)
	post, err := g.posts.SaveDraft(ctx, postsProc.SaveDraftParams{
		AccountID:   commit.AccountID,
		Content:     result.BaseContent,
		ContentType: contentType,
		MediaIDs:    store.UUIDArray(mediaIDs),
		AIGenerated: true,
		BaseContent: &result.BaseContent,
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

// lastPathComponent returns the base filename from a path.
func lastPathComponent(key string) string {
	return path.Base(key)
}
