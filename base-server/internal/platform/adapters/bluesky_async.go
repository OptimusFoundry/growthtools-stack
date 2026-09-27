package adapters

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"base-server/internal/infra/store"
	"base-server/internal/platform/clients/bluesky"
)

// Bluesky's async surface. Today every Bluesky operation we use (blob
// upload, createRecord) is synchronous from our side — uploadBlob
// returns a usable ref immediately, createRecord publishes in one
// call. So the split exists mainly to keep a consistent interface;
// StartPublish uploads all blobs and returns readyNow=true, CheckReady
// is a no-op, Finalize does the record creation.
//
// Once we adopt app.bsky.video.uploadVideo (which is genuinely async —
// returns a jobId that we poll), the adapter slots the async states
// into the same shape without changing the pipeline.

type blueskyHandle struct {
	// Items positional, matches spec.MediaURLs. Each item carries the
	// blob the adapter got back from uploadBlob, or nil if that slot
	// failed to upload.
	Items []blueskyHandleItem `json:"items"`
}

type blueskyHandleItem struct {
	Blob    map[string]any `json:"blob,omitempty"`
	IsVideo bool           `json:"is_video"`
	// Width/Height feed the embed's aspectRatio; zero when unknown.
	Width  int `json:"width,omitempty"`
	Height int `json:"height,omitempty"`
}

// StartPublish implements AsyncPlatformAdapter.
func (a *BlueskyAdapter) StartPublish(ctx context.Context, spec PostSpec, conn store.PlatformConnection) (json.RawMessage, bool, error) {
	session, err := a.client.CreateSession(ctx, conn.PlatformUserID, conn.AccessToken)
	if err != nil {
		return nil, false, fmt.Errorf("bluesky adapter: auth failed: %w", err)
	}

	handle := blueskyHandle{Items: make([]blueskyHandleItem, 0, len(spec.MediaURLs))}
	for _, mediaURL := range spec.MediaURLs {
		mediaBytes, contentType, err := downloadMedia(ctx, mediaURL)
		if err != nil {
			return nil, false, fmt.Errorf("bluesky adapter: download media: %w", err)
		}
		blob, err := a.client.UploadBlob(ctx, session.AccessJwt, mediaBytes, contentType)
		if err != nil {
			return nil, false, fmt.Errorf("bluesky adapter: upload blob: %w", err)
		}
		item := blueskyHandleItem{
			Blob:    blob,
			IsVideo: strings.HasPrefix(contentType, "video/"),
		}
		if !item.IsVideo {
			item.Width, item.Height = imageDimensions(mediaBytes)
		}
		handle.Items = append(handle.Items, item)
	}

	raw, err := json.Marshal(handle)
	if err != nil {
		return nil, false, fmt.Errorf("bluesky adapter: marshal handle: %w", err)
	}
	// Blobs are ready to attach the moment uploadBlob returns, so
	// readyNow skips the reconciler. Once we add the video upload
	// service this flips to false for video items.
	return raw, true, nil
}

// CheckReady implements AsyncPlatformAdapter. Never called today —
// StartPublish returns readyNow=true for every case. Present so the
// interface is complete and so the reconciler can call it once we
// adopt app.bsky.video.uploadVideo.
func (a *BlueskyAdapter) CheckReady(ctx context.Context, raw json.RawMessage, conn store.PlatformConnection) (bool, json.RawMessage, error) {
	return true, raw, nil
}

// Finalize implements AsyncPlatformAdapter. Uses the blobs stored in
// the handle to build the embed, then createRecord (chained for thread
// segments). Mirrors the existing Publish/PublishThread logic but
// sources blobs from the handle instead of re-uploading.
func (a *BlueskyAdapter) Finalize(ctx context.Context, spec PostSpec, raw json.RawMessage, conn store.PlatformConnection) (PlatformPostResult, error) {
	var handle blueskyHandle
	if err := json.Unmarshal(raw, &handle); err != nil {
		return PlatformPostResult{}, fmt.Errorf("bluesky adapter: unmarshal handle: %w", err)
	}

	// Re-auth — the accessJwt from StartPublish isn't persisted and
	// has a short TTL regardless.
	session, err := a.client.CreateSession(ctx, conn.PlatformUserID, conn.AccessToken)
	if err != nil {
		return PlatformPostResult{}, fmt.Errorf("bluesky adapter: auth failed: %w", err)
	}

	// Single post: build the embed from all handle items. Video wins
	// over images, same oneof rule as the sync path.
	if len(spec.Segments) == 0 {
		record := map[string]any{
			"$type":     "app.bsky.feed.post",
			"text":      spec.Content,
			"createdAt": nowUTC(),
		}
		if embed := buildBlueskyEmbed(handle.Items, allIndexes(handle.Items)); embed != nil {
			record["embed"] = embed
		}
		result, err := a.client.CreateRecord(ctx, session.AccessJwt, bluesky.CreateRecordRequest{
			DID:        session.DID,
			Collection: "app.bsky.feed.post",
			Record:     record,
		})
		if err != nil {
			return PlatformPostResult{}, fmt.Errorf("bluesky adapter: %w", err)
		}
		return PlatformPostResult{
			PlatformPostID: result.URI,
			URL:            atURIToWebURL(result.URI, conn.PlatformUserID),
		}, nil
	}

	// Thread chain: each segment references at most one media via
	// image_index. Reply refs thread the chain to the original root.
	var firstResult PlatformPostResult
	var rootURI, rootCID, parentURI, parentCID string
	for i, seg := range spec.Segments {
		record := map[string]any{
			"$type":     "app.bsky.feed.post",
			"text":      seg.Content,
			"createdAt": nowUTC(),
		}
		var indexes []int
		if seg.ImageIndex != nil {
			idx := *seg.ImageIndex - 1
			if idx >= 0 && idx < len(handle.Items) {
				indexes = []int{idx}
			}
		}
		if embed := buildBlueskyEmbed(handle.Items, indexes); embed != nil {
			record["embed"] = embed
		}
		if i > 0 {
			record["reply"] = map[string]any{
				"root":   map[string]any{"uri": rootURI, "cid": rootCID},
				"parent": map[string]any{"uri": parentURI, "cid": parentCID},
			}
		}

		result, err := a.client.CreateRecord(ctx, session.AccessJwt, bluesky.CreateRecordRequest{
			DID:        session.DID,
			Collection: "app.bsky.feed.post",
			Record:     record,
		})
		if err != nil {
			return firstResult, fmt.Errorf("bluesky adapter: failed to post thread segment %d: %w", i+1, err)
		}
		if i == 0 {
			rootURI, rootCID = result.URI, result.CID
			firstResult = PlatformPostResult{
				PlatformPostID: result.URI,
				URL:            atURIToWebURL(result.URI, conn.PlatformUserID),
			}
		}
		parentURI, parentCID = result.URI, result.CID
	}
	return firstResult, nil
}

// buildBlueskyEmbed picks the right embed type for the selected items:
// video first (takes precedence over images), otherwise images — matches
// Bluesky's oneof embed rule.
func buildBlueskyEmbed(items []blueskyHandleItem, indexes []int) map[string]any {
	var videoBlob map[string]any
	images := make([]map[string]any, 0, len(indexes))
	for _, idx := range indexes {
		if idx < 0 || idx >= len(items) {
			continue
		}
		item := items[idx]
		if item.Blob == nil {
			continue
		}
		if item.IsVideo {
			if videoBlob == nil {
				videoBlob = item.Blob
			}
			continue
		}
		images = append(images, blueskyImageEntry(item.Blob, item.Width, item.Height))
	}
	if videoBlob != nil {
		return map[string]any{"$type": "app.bsky.embed.video", "video": videoBlob, "alt": ""}
	}
	if len(images) > 0 {
		return map[string]any{"$type": "app.bsky.embed.images", "images": images}
	}
	return nil
}

func allIndexes(items []blueskyHandleItem) []int {
	idx := make([]int, len(items))
	for i := range items {
		idx[i] = i
	}
	return idx
}

// Preserve any `time` usage; kept here so linting doesn't strip the
// import if the file is trimmed down later.
var _ = time.Second
