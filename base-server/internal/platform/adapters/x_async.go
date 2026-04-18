package adapters

import (
	"context"
	"encoding/json"
	"fmt"

	"base-server/internal/infra/store"
	"base-server/internal/platform/clients/x"
)

// XAdapter's async surface. Splits the old blocking Publish/PublishThread
// into three phases the pipeline can drive independently:
//
//   StartPublish — download + single-shot upload each media item; no
//                  blocking poll. Return media_ids + per-item processing
//                  state. readyNow when every item is already
//                  'succeeded' (images) — lets the pipeline skip the
//                  reconciler and go straight to Finalize.
//   CheckReady   — poll STATUS once per still-pending media id. Update
//                  the handle; report ready when all are succeeded.
//   Finalize     — create tweet (or chain of tweets for threads),
//                  attaching the now-ready media ids by image_index.
//
// The handle persisted on platform_posts.media_handle is the below
// xMediaHandle shape. Opaque to the workers; the adapter owns it.

// xMediaHandle carries per-media state so the reconciler + finalizer
// can resume. Order matches spec.MediaURLs positionally so image_index
// in a thread segment maps one-to-one into Items[].
type xMediaHandle struct {
	Items []xMediaItem `json:"items"`
}

type xMediaItem struct {
	MediaID string              `json:"media_id"`
	State   string              `json:"state"` // "succeeded" for images; "pending"/"in_progress"/"succeeded"/"failed" for video
	Info    *x.ProcessingInfo   `json:"info,omitempty"`
}

// StartPublish implements AsyncPlatformAdapter.
func (a *XAdapter) StartPublish(ctx context.Context, spec PostSpec, conn store.PlatformConnection) (json.RawMessage, bool, error) {
	accessToken := conn.AccessToken
	tokenSecret := "" // OAuth 2.0: always Bearer

	handle := xMediaHandle{Items: make([]xMediaItem, 0, len(spec.MediaURLs))}
	readyNow := true

	for _, mediaURL := range spec.MediaURLs {
		mediaBytes, contentType, err := downloadMedia(ctx, mediaURL)
		if err != nil {
			a.logger.Error(ctx, "failed to download media for X", err)
			// Keep going — a failed media download shouldn't block
			// other media. We skip this slot entirely; the finalizer
			// maps image_index positionally so a missing item just
			// means that thread part posts without media.
			handle.Items = append(handle.Items, xMediaItem{})
			continue
		}

		res, err := a.client.UploadMediaAsync(ctx, x.UploadMediaRequest{
			MediaBytes: mediaBytes,
			MediaType:  contentType,
		}, accessToken, tokenSecret)
		if err != nil {
			a.logger.Error(ctx, "failed to upload media to X", err)
			handle.Items = append(handle.Items, xMediaItem{})
			readyNow = false
			continue
		}

		item := xMediaItem{MediaID: res.MediaID, Info: res.ProcessingInfo}
		if res.ProcessingInfo == nil || res.ProcessingInfo.State == "" || res.ProcessingInfo.State == "succeeded" {
			item.State = "succeeded"
		} else {
			item.State = res.ProcessingInfo.State
			readyNow = false
		}
		handle.Items = append(handle.Items, item)
	}

	raw, err := json.Marshal(handle)
	if err != nil {
		return nil, false, fmt.Errorf("x adapter: marshal handle: %w", err)
	}
	return raw, readyNow, nil
}

// CheckReady implements AsyncPlatformAdapter. Polls STATUS once per
// still-pending media id. Returns ready only when every item is
// succeeded; returns an error when any item has terminally failed.
func (a *XAdapter) CheckReady(ctx context.Context, raw json.RawMessage, conn store.PlatformConnection) (bool, json.RawMessage, error) {
	var handle xMediaHandle
	if err := json.Unmarshal(raw, &handle); err != nil {
		return false, nil, fmt.Errorf("x adapter: unmarshal handle: %w", err)
	}

	allReady := true
	for i := range handle.Items {
		item := &handle.Items[i]
		if item.MediaID == "" || item.State == "succeeded" {
			continue
		}
		status, err := a.client.GetMediaStatus(ctx, item.MediaID, conn.AccessToken)
		if err != nil {
			return false, raw, fmt.Errorf("x adapter: GetMediaStatus media %s: %w", item.MediaID, err)
		}
		item.Info = status
		item.State = status.State
		switch status.State {
		case "succeeded":
			// done with this one
		case "failed":
			msg := "unknown"
			if status.Error != nil {
				msg = status.Error.Message
			}
			return false, raw, fmt.Errorf("x adapter: media %s processing failed: %s", item.MediaID, msg)
		default:
			allReady = false
		}
	}

	updated, err := json.Marshal(handle)
	if err != nil {
		return false, raw, fmt.Errorf("x adapter: marshal handle: %w", err)
	}
	return allReady, updated, nil
}

// Finalize implements AsyncPlatformAdapter. Builds the tweet (or thread
// chain) using the ready media ids the handle carries. Mirrors the
// logic of the old Publish/PublishThread but trusts that any videos
// are already transcoded.
func (a *XAdapter) Finalize(ctx context.Context, spec PostSpec, raw json.RawMessage, conn store.PlatformConnection) (PlatformPostResult, error) {
	accessToken := conn.AccessToken
	tokenSecret := "" // OAuth 2.0

	var handle xMediaHandle
	if err := json.Unmarshal(raw, &handle); err != nil {
		return PlatformPostResult{}, fmt.Errorf("x adapter: unmarshal handle: %w", err)
	}

	mediaIDForIndex := func(imageIndex *int) []string {
		if imageIndex == nil {
			return nil
		}
		idx := *imageIndex - 1
		if idx < 0 || idx >= len(handle.Items) {
			return nil
		}
		id := handle.Items[idx].MediaID
		if id == "" {
			return nil
		}
		return []string{id}
	}

	// Single post: attach every media id positionally.
	if len(spec.Segments) == 0 {
		mediaIDs := make([]string, 0, len(handle.Items))
		for _, it := range handle.Items {
			if it.MediaID != "" {
				mediaIDs = append(mediaIDs, it.MediaID)
			}
		}
		result, err := a.client.CreateTweet(ctx, x.CreateTweetRequest{
			Text:     spec.Content,
			MediaIDs: mediaIDs,
		}, accessToken, tokenSecret)
		if err != nil {
			return PlatformPostResult{}, fmt.Errorf("x adapter: %w", err)
		}
		return PlatformPostResult{
			PlatformPostID: result.ID,
			URL:            fmt.Sprintf("https://x.com/%s/status/%s", conn.PlatformUserID, result.ID),
		}, nil
	}

	// Thread: chain replies, each segment attaches the media its
	// image_index points at (or none).
	var firstResult PlatformPostResult
	var previousTweetID string
	for i, seg := range spec.Segments {
		result, err := a.client.CreateTweet(ctx, x.CreateTweetRequest{
			Text:      seg.Content,
			MediaIDs:  mediaIDForIndex(seg.ImageIndex),
			ReplyToID: previousTweetID,
		}, accessToken, tokenSecret)
		if err != nil {
			return firstResult, fmt.Errorf("x adapter: failed to post thread segment %d: %w", i+1, err)
		}
		previousTweetID = result.ID
		if i == 0 {
			firstResult = PlatformPostResult{
				PlatformPostID: result.ID,
				URL:            fmt.Sprintf("https://x.com/%s/status/%s", conn.PlatformUserID, result.ID),
			}
		}
	}
	return firstResult, nil
}
