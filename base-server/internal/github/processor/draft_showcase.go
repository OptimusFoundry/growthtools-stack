package processor

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"base-server/internal/ai/mediadescriber"
	"base-server/internal/ai/mediaplanner"
	"base-server/internal/ai/socialposts"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	postsProc "base-server/internal/posts/processor"

	"github.com/google/uuid"
)

// buildShowcaseDraftPrompt produces a prompt for a showcase job — a
// component the user described in a natural-language brief rather than one
// discovered from a real commit. Showcase jobs have no repository context
// (no commit sha, no branch, no repo owner/name), so unlike buildDraftPrompt
// and buildComponentDraftPrompt this never frames the post around a repo.
func buildShowcaseDraftPrompt(job store.ShowcaseJobForDraft) string {
	var sb strings.Builder
	fmt.Fprintf(&sb, "This is a UI/component showcase for %s — write social posts announcing it, based on the brief below.\n\n", job.ComponentName)
	sb.WriteString("Brief:\n")
	sb.WriteString(job.Brief)
	sb.WriteString("\n\nTurn this into a thread that reads like the builder talking to peers — what the component does, why it matters, how it feels to use. Do not reference commit shas, branch names, or internal repo mechanics.")
	return sb.String()
}

// GenerateDraftFromShowcaseJob is the top-level flow invoked by the worker
// for showcase jobs (a brief-driven capture with no backing commit). It
// mirrors GenerateDraftFromCommit's guard + persistence + AI + link-back
// pipeline, keyed off a showcase_jobs row instead of a github_commits row.
// Unlike the commit path, a capture-reports-error or a hard pipeline failure
// is durably recorded on the job row via UpdateShowcaseJobFailed, since
// ShowcaseJob (unlike GitHubCommit) has a status/error field to surface to
// the user.
//
// Note: unlike GenerateDraftFromCommit, this does not gate on
// ListPlatformConnectionsByAccount — a showcase job always targets the full
// draftTargetPlatforms set, since it's a manually-triggered demo post rather
// than an automatic per-commit capture.
func (g *DraftGenerator) GenerateDraftFromShowcaseJob(ctx context.Context, jobID uuid.UUID) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "showcase_job_id", Value: jobID.String()},
		observability.Field{Key: "operation", Value: "generate_draft_from_showcase_job"},
	)

	job, err := g.store.GetShowcaseJobForDraft(ctx, jobID)
	if err != nil {
		g.logger.Error(ctx, "failed to load showcase job for draft generation", err)
		return ErrDraftGenerationFailed
	}

	if job.PostID != nil {
		g.logger.Info(ctx, "showcase job already linked to a post; skipping draft generation")
		return ErrDraftGuardTripped
	}
	if job.CaptureOutput == nil {
		g.logger.Info(ctx, "showcase job has no capture_output; skipping draft generation")
		return ErrDraftGuardTripped
	}

	var payload capturePayload
	if err := json.Unmarshal(*job.CaptureOutput, &payload); err != nil {
		g.logger.Error(ctx, "failed to parse showcase job capture_output", err)
		return ErrDraftGenerationFailed
	}
	if payload.Error != "" {
		g.logger.Info(ctx, "showcase job capture output reports failure; skipping draft generation")
		if err := g.store.UpdateShowcaseJobFailed(ctx, jobID, payload.Error); err != nil {
			g.logger.Error(ctx, "failed to record showcase job capture failure", err)
		}
		return ErrDraftGuardTripped
	}

	targets := draftTargetPlatforms

	// Step 1: bucket artifacts by type (video + images)
	videoKey, imageKeys := bucketArtifacts(payload.Uploaded)

	// Step 2: fetch media bytes from S3
	mediaBytes := make(map[string][]byte)
	if videoKey != "" {
		body, _, err := g.s3Fetch.GetFile(ctx, videoKey)
		if err != nil {
			g.logger.Error(ctx, "failed to fetch video from s3", err)
			return g.failShowcaseJob(ctx, jobID, err)
		}
		defer body.Close()
		data, err := io.ReadAll(body)
		if err != nil {
			g.logger.Error(ctx, "failed to read video bytes", err)
			return g.failShowcaseJob(ctx, jobID, err)
		}
		mediaBytes[videoKey] = data
	}
	for _, key := range imageKeys {
		body, _, err := g.s3Fetch.GetFile(ctx, key)
		if err != nil {
			g.logger.Error(ctx, "failed to fetch image from s3", err)
			return g.failShowcaseJob(ctx, jobID, err)
		}
		defer body.Close()
		data, err := io.ReadAll(body)
		if err != nil {
			g.logger.Error(ctx, "failed to read image bytes", err)
			return g.failShowcaseJob(ctx, jobID, err)
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
		CommitMessage: job.Brief,
		Descriptions:  descriptions,
	}
	decision, err := g.planner.SelectAndDecide(ctx, plannerReq)
	if err != nil {
		g.logger.Error(ctx, "failed to plan media and mode", err)
		return g.failShowcaseJob(ctx, jobID, err)
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
			AccountID:   job.AccountID,
			Filename:    lastPathComponent(key),
			ContentType: contentType,
			S3Key:       key,
			S3URL:       fmt.Sprintf("s3://%s/%s", g.s3Bucket, key),
			SizeBytes:   size,
			Source:      mediaSource,
		})
		if err != nil {
			g.logger.Error(ctx, "failed to create media row for showcase capture artifact", err)
			return g.failShowcaseJob(ctx, jobID, err)
		}
		mediaIDs = append(mediaIDs, media.ID)
	}

	// Step 8: call socialposts.Generator
	mode := socialposts.Mode(decision.Mode)
	prompt := buildShowcaseDraftPrompt(job)
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
		return g.failShowcaseJob(ctx, jobID, err)
	}

	// Step 9: assemble platform drafts from socialposts results
	contentType := store.ContentTypeText
	if decision.Mode == "thread" {
		contentType = store.ContentTypeThread
	}

	platforms := assemblePlatformDrafts(result.Platforms, targets, mediaIDs)
	post, err := g.posts.SaveDraft(ctx, postsProc.SaveDraftParams{
		AccountID:   job.AccountID,
		Content:     result.BaseContent,
		ContentType: contentType,
		MediaIDs:    store.UUIDArray(mediaIDs),
		AIGenerated: true,
		BaseContent: &result.BaseContent,
		Platforms:   platforms,
		Source:      draftPostSource,
	})
	if err != nil {
		g.logger.Error(ctx, "failed to save draft from showcase job", err)
		return g.failShowcaseJob(ctx, jobID, err)
	}

	if err := g.store.UpdateShowcaseJobPostID(ctx, jobID, post.ID); err != nil {
		// Draft is already persisted — log but don't surface as a hard
		// failure, the post is visible to the user either way.
		g.logger.Error(ctx, "failed to link showcase job to drafted post", err)
	}

	return nil
}

// failShowcaseJob records a hard pipeline failure on the job row and
// returns the sentinel error the worker logs at ERROR level.
func (g *DraftGenerator) failShowcaseJob(ctx context.Context, jobID uuid.UUID, err error) error {
	if updateErr := g.store.UpdateShowcaseJobFailed(ctx, jobID, err.Error()); updateErr != nil {
		g.logger.Error(ctx, "failed to record showcase job failure", updateErr)
	}
	return ErrDraftGenerationFailed
}
