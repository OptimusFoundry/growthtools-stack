package processor

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"strings"

	"base-server/internal/ai/mediadescriber"
	"base-server/internal/ai/socialposts"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	postsProc "base-server/internal/posts/processor"

	"github.com/google/uuid"
)

var (
	ErrRegenerateNoMedia        = errors.New("select at least one media item to regenerate with")
	ErrRegeneratePostNotFound   = errors.New("post not found")
	ErrRegenerateNotDraft       = errors.New("only draft posts can be regenerated")
	ErrRegenerateMediaNotInPool = errors.New("selected media is not one of this post's captures")
	ErrRegenerateUnsupported    = errors.New("post was not generated from a commit")
)

// RegenerateDraftWithMedia rewrites a commit-generated draft's copy around a
// user-chosen subset of its capture media. The selection (in the given order)
// becomes the post's media_ids; the post keeps its single/thread mode. Unlike
// GenerateDraftFromCommit, the media planner is skipped — the user already
// chose.
func (g *DraftGenerator) RegenerateDraftWithMedia(ctx context.Context, accountID, postID uuid.UUID, mediaIDs []uuid.UUID) (store.Post, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "operation", Value: "regenerate_draft_with_media"},
	)

	if len(mediaIDs) == 0 {
		return store.Post{}, ErrRegenerateNoMedia
	}

	post, err := g.store.GetPostByID(ctx, accountID, postID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return store.Post{}, ErrRegeneratePostNotFound
		}
		g.logger.Error(ctx, "failed to load post for regenerate", err)
		return store.Post{}, ErrDraftGenerationFailed
	}
	if post.Status != store.PostStatusDraft {
		return store.Post{}, ErrRegenerateNotDraft
	}

	pool := make(map[uuid.UUID]struct{}, len(post.CaptureMediaIDs))
	for _, id := range post.CaptureMediaIDs {
		pool[id] = struct{}{}
	}
	selected := make([]uuid.UUID, 0, len(mediaIDs))
	seen := make(map[uuid.UUID]struct{}, len(mediaIDs))
	for _, id := range mediaIDs {
		if _, ok := pool[id]; !ok {
			return store.Post{}, ErrRegenerateMediaNotInPool
		}
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}
		selected = append(selected, id)
	}

	commit, err := g.store.GetGitHubCommitForDraftByPostID(ctx, accountID, postID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return store.Post{}, ErrRegenerateUnsupported
		}
		g.logger.Error(ctx, "failed to load source commit for regenerate", err)
		return store.Post{}, ErrDraftGenerationFailed
	}

	connections, err := g.store.ListPlatformConnectionsByAccount(ctx, accountID)
	if err != nil {
		g.logger.Error(ctx, "failed to list platform connections", err)
		return store.Post{}, ErrDraftGenerationFailed
	}
	targets := filterTargetPlatforms(connections)
	if len(targets) == 0 {
		return store.Post{}, ErrDraftGuardTripped
	}

	rows, err := g.store.GetMediaByIDs(ctx, selected)
	if err != nil {
		g.logger.Error(ctx, "failed to load selected media", err)
		return store.Post{}, ErrDraftGenerationFailed
	}
	byID := make(map[uuid.UUID]store.Media, len(rows))
	for _, m := range rows {
		byID[m.ID] = m
	}

	// Describe the selection in the requested order; indexes are 1-based
	// positions in selected, which is also how thread segments reference
	// media_ids.
	items := make([]mediadescriber.Media, 0, len(selected))
	keys := make([]string, 0, len(selected))
	for i, id := range selected {
		m, ok := byID[id]
		if !ok {
			g.logger.Error(ctx, "selected media row missing", errors.New(id.String()))
			return store.Post{}, ErrDraftGenerationFailed
		}
		data, err := g.readS3(ctx, m.S3Key)
		if err != nil {
			g.logger.Error(ctx, "failed to fetch selected media from s3", err)
			return store.Post{}, ErrDraftGenerationFailed
		}
		kind := mediadescriber.KindImage
		if strings.HasPrefix(m.ContentType, "video/") {
			kind = mediadescriber.KindVideo
		}
		items = append(items, mediadescriber.Media{Index: i + 1, Kind: kind, MIMEType: m.ContentType, Data: data})
		keys = append(keys, m.S3Key)
	}
	descriptions := g.describer.DescribeBatch(ctx, items)

	mode := socialposts.ModeSingle
	threadParts := 0
	if post.ContentType == store.ContentTypeThread {
		mode = socialposts.ModeThread
		threadParts = g.existingThreadParts(ctx, postID)
	}

	prompt := buildDraftPrompt(commit)
	uploaded := make([]captureUpload, 0, len(keys))
	for _, k := range keys {
		uploaded = append(uploaded, captureUpload{Key: k})
	}
	if names := storybookComponentNames(uploaded); len(names) > 0 {
		prompt = buildComponentDraftPrompt(commit, names)
	}

	result, err := g.generator.Generate(ctx, socialposts.Request{
		Prompt:      prompt,
		Platforms:   targets,
		Mode:        mode,
		ThreadParts: threadParts,
		Media:       descriptions,
	})
	if err != nil {
		g.logger.Error(ctx, "failed to regenerate social posts", err)
		return store.Post{}, ErrDraftGenerationFailed
	}

	updated, err := g.posts.UpdateDraft(ctx, postsProc.UpdateDraftParams{
		AccountID:   accountID,
		PostID:      postID,
		Content:     result.BaseContent,
		ContentType: post.ContentType,
		MediaIDs:    store.UUIDArray(selected),
		AIGenerated: true,
		BaseContent: &result.BaseContent,
		Platforms:   assemblePlatformDrafts(result.Platforms, targets, selected),
	})
	if err != nil {
		g.logger.Error(ctx, "failed to save regenerated draft", err)
		return store.Post{}, ErrDraftGenerationFailed
	}
	return updated, nil
}

func (g *DraftGenerator) readS3(ctx context.Context, key string) ([]byte, error) {
	body, _, err := g.s3Fetch.GetFile(ctx, key)
	if err != nil {
		return nil, err
	}
	defer body.Close()
	return io.ReadAll(body)
}

// existingThreadParts keeps a regenerated thread the same length as the
// current draft, falling back to fallbackThreadParts when it can't tell.
func (g *DraftGenerator) existingThreadParts(ctx context.Context, postID uuid.UUID) int {
	pps, err := g.store.GetPlatformPostsByPostID(ctx, postID)
	if err != nil {
		g.logger.Error(ctx, "failed to load platform posts for thread length", err)
		return fallbackThreadParts
	}
	for _, pp := range pps {
		if pp.ThreadSegments == nil {
			continue
		}
		var segs []json.RawMessage
		if json.Unmarshal(*pp.ThreadSegments, &segs) == nil && len(segs) > 1 {
			return len(segs)
		}
	}
	return fallbackThreadParts
}
