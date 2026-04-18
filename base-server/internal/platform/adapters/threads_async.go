package adapters

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"base-server/internal/infra/store"
	"base-server/internal/platform/clients/threads"
)

// Threads async surface. Meta's container flow splits naturally into
// the three phases:
//
//   StartPublish — create the first container (text + media_url or
//                  video_url). Return its container_id. readyNow is
//                  true for images (containers finish in ~100ms) and
//                  false for video.
//   CheckReady   — GET /{container_id}?fields=status. Ready when
//                  status == FINISHED.
//   Finalize     — publish the container, get post_id. For multi-
//                  segment threads, create + wait + publish each
//                  remaining segment inline (chaining requires the
//                  previous post's id, so there's no easy way to
//                  parallelize without passing the whole pipeline
//                  through N times — scope decision: accept per-segment
//                  block for now).

type threadsHandle struct {
	ContainerID string `json:"container_id"`
	IsVideo     bool   `json:"is_video"`
}

// StartPublish implements AsyncPlatformAdapter.
func (a *ThreadsAdapter) StartPublish(ctx context.Context, spec PostSpec, conn store.PlatformConnection) (json.RawMessage, bool, error) {
	userID := conn.PlatformUserID

	// For single posts the container gets the whole text + media
	// directly. For threads we only start segment 0 here; Finalize
	// walks the rest.
	text := spec.Content
	firstMediaURL := ""
	if len(spec.Segments) > 0 {
		text = spec.Segments[0].Content
		firstMediaURL = mediaURLForSegment(spec.Segments[0], spec.MediaURLs)
	} else if len(spec.MediaURLs) > 0 {
		firstMediaURL = spec.MediaURLs[0]
	}

	req := threads.CreateThreadRequest{
		UserID:    userID,
		Text:      text,
		MediaType: "TEXT",
	}
	isVideo := false
	if firstMediaURL != "" {
		if isVideoMediaURL(firstMediaURL) {
			req.MediaType = "VIDEO"
			req.VideoURL = firstMediaURL
			isVideo = true
		} else {
			req.MediaType = "IMAGE"
			req.ImageURL = firstMediaURL
		}
	}

	container, err := a.client.CreateThread(ctx, conn.AccessToken, req)
	if err != nil {
		return nil, false, fmt.Errorf("threads adapter: %w", err)
	}

	handle := threadsHandle{ContainerID: container.ID, IsVideo: isVideo}
	raw, err := json.Marshal(handle)
	if err != nil {
		return nil, false, fmt.Errorf("threads adapter: marshal handle: %w", err)
	}
	// Images need a brief (~1s) settle server-side before publish but
	// don't need a full reconcile cycle — readyNow=true keeps them on
	// the fast path. Videos require polling.
	return raw, !isVideo, nil
}

// CheckReady implements AsyncPlatformAdapter. Called by the reconciler
// for video containers.
func (a *ThreadsAdapter) CheckReady(ctx context.Context, raw json.RawMessage, conn store.PlatformConnection) (bool, json.RawMessage, error) {
	var handle threadsHandle
	if err := json.Unmarshal(raw, &handle); err != nil {
		return false, nil, fmt.Errorf("threads adapter: unmarshal handle: %w", err)
	}
	status, errMsg, err := a.client.GetContainerStatus(ctx, handle.ContainerID, conn.AccessToken)
	if err != nil {
		return false, raw, fmt.Errorf("threads adapter: GetContainerStatus: %w", err)
	}
	switch status {
	case "FINISHED":
		return true, raw, nil
	case "ERROR", "EXPIRED":
		if errMsg != "" {
			return false, raw, fmt.Errorf("threads adapter: container %s entered terminal state %s: %s", handle.ContainerID, status, errMsg)
		}
		return false, raw, fmt.Errorf("threads adapter: container %s entered terminal state %s", handle.ContainerID, status)
	default:
		return false, raw, nil
	}
}

// Finalize implements AsyncPlatformAdapter. Publishes segment 0
// (already ready), then walks any remaining segments inline —
// each requires a new container tied to the previous post's id.
func (a *ThreadsAdapter) Finalize(ctx context.Context, spec PostSpec, raw json.RawMessage, conn store.PlatformConnection) (PlatformPostResult, error) {
	var handle threadsHandle
	if err := json.Unmarshal(raw, &handle); err != nil {
		return PlatformPostResult{}, fmt.Errorf("threads adapter: unmarshal handle: %w", err)
	}

	userID := conn.PlatformUserID

	// Publish segment 0.
	first, err := a.client.PublishThread(ctx, userID, conn.AccessToken, handle.ContainerID)
	if err != nil {
		return PlatformPostResult{}, fmt.Errorf("threads adapter: %w", err)
	}
	permalink, _ := a.client.GetPermalink(ctx, first.ID, conn.AccessToken)
	firstResult := PlatformPostResult{PlatformPostID: first.ID, URL: permalink}

	// No segments → single post, done.
	if len(spec.Segments) <= 1 {
		return firstResult, nil
	}

	// Thread chain: each remaining segment needs its own container
	// keyed to the previous published id. Videos here still block the
	// caller for the container transcode; fully parallelizing this
	// would require threading the reconciler through the chain.
	previousPostID := first.ID
	for i := 1; i < len(spec.Segments); i++ {
		seg := spec.Segments[i]
		req := threads.CreateThreadRequest{
			UserID:    userID,
			Text:      seg.Content,
			MediaType: "TEXT",
			ReplyToID: previousPostID,
		}
		isVideo := false
		if mu := mediaURLForSegment(seg, spec.MediaURLs); mu != "" {
			if isVideoMediaURL(mu) {
				req.MediaType = "VIDEO"
				req.VideoURL = mu
				isVideo = true
			} else {
				req.MediaType = "IMAGE"
				req.ImageURL = mu
			}
		}

		container, err := a.client.CreateThread(ctx, conn.AccessToken, req)
		if err != nil {
			return firstResult, fmt.Errorf("threads adapter: failed to create thread segment %d: %w", i+1, err)
		}
		if isVideo {
			if err := a.client.WaitForContainerReady(ctx, container.ID, conn.AccessToken, threadsVideoReadyTimeout); err != nil {
				return firstResult, fmt.Errorf("threads adapter: segment %d video container not ready: %w", i+1, err)
			}
		} else {
			time.Sleep(2 * time.Second)
		}
		published, err := a.client.PublishThread(ctx, userID, conn.AccessToken, container.ID)
		if err != nil {
			return firstResult, fmt.Errorf("threads adapter: failed to publish thread segment %d: %w", i+1, err)
		}
		previousPostID = published.ID
	}
	return firstResult, nil
}
