package processor

import (
	"context"
	"fmt"
	"io"
	"path"
	"strings"

	"base-server/internal/content/prompts"
	contentProc "base-server/internal/content/processor"
	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

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
