package adapters

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"path"
	"strings"
	"time"

	"base-server/internal/platform/clients/threads"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
)

const threadsCharacterLimit = 500

// threadsVideoReadyTimeout bounds how long we wait for Meta to finish
// transcoding a video container before publishing. Short capture clips
// (10-30s) usually finish in under 15s; 60s gives headroom without
// tying up the publish worker on a stuck container.
const threadsVideoReadyTimeout = 60 * time.Second

// isVideoMediaURL decides whether a media URL points at a video we
// should hand to Meta as video_url instead of image_url. We look at
// the URL path's extension — the capture-worker produces .mp4 and we
// control the S3 key, so a conservative list of video extensions is
// safe. Query params (presigner signatures) don't affect the path
// parse.
func isVideoMediaURL(raw string) bool {
	u, err := url.Parse(raw)
	if err != nil {
		return false
	}
	switch strings.ToLower(path.Ext(u.Path)) {
	case ".mp4", ".mov", ".webm", ".m4v":
		return true
	}
	return false
}

// ThreadsAdapter implements PlatformAdapter for Threads (Meta).
type ThreadsAdapter struct {
	client *threads.Client
	logger *observability.Logger
}

// NewThreadsAdapter creates a new ThreadsAdapter with an injected Threads API client.
func NewThreadsAdapter(client *threads.Client, logger *observability.Logger) *ThreadsAdapter {
	return &ThreadsAdapter{
		client: client,
		logger: logger,
	}
}

// Publish posts content to Threads using the 2-step container flow.
// conn.AccessToken = user access token, conn.PlatformUserID = Threads user ID.
func (a *ThreadsAdapter) Publish(ctx context.Context, content string, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error) {
	userID := conn.PlatformUserID

	req := threads.CreateThreadRequest{
		UserID:    userID,
		Text:      content,
		MediaType: "TEXT",
	}
	isVideo := false
	if len(mediaURLs) > 0 {
		if isVideoMediaURL(mediaURLs[0]) {
			req.MediaType = "VIDEO"
			req.VideoURL = mediaURLs[0]
			isVideo = true
		} else {
			req.MediaType = "IMAGE"
			req.ImageURL = mediaURLs[0]
		}
	}

	// Step 1: Create thread container
	container, err := a.client.CreateThread(ctx, conn.AccessToken, req)
	if err != nil {
		return PlatformPostResult{}, fmt.Errorf("threads adapter: %w", err)
	}

	// Wait for container processing. Images are usually ready within
	// the historical 2s; videos need a transcode pass — poll
	// GET /{container_id}?fields=status until FINISHED.
	if isVideo {
		if err := a.client.WaitForContainerReady(ctx, container.ID, conn.AccessToken, threadsVideoReadyTimeout); err != nil {
			return PlatformPostResult{}, fmt.Errorf("threads adapter: %w", err)
		}
	} else {
		time.Sleep(2 * time.Second)
	}

	// Step 2: Publish the thread
	published, err := a.client.PublishThread(ctx, userID, conn.AccessToken, container.ID)
	if err != nil {
		return PlatformPostResult{}, fmt.Errorf("threads adapter: %w", err)
	}

	// Get permalink
	permalink, _ := a.client.GetPermalink(ctx, published.ID, conn.AccessToken)

	return PlatformPostResult{
		PlatformPostID: published.ID,
		URL:            permalink,
	}, nil
}

// PublishThread posts a multi-part thread to Threads by chaining replies.
// The first segment is posted standalone, subsequent segments reply to the previous.
func (a *ThreadsAdapter) PublishThread(ctx context.Context, segments []ThreadSegment, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error) {
	if len(segments) == 0 {
		return PlatformPostResult{}, fmt.Errorf("threads adapter: no thread segments provided")
	}

	userID := conn.PlatformUserID
	var firstResult PlatformPostResult
	var previousPostID string

	for i, seg := range segments {
		req := threads.CreateThreadRequest{
			UserID:    userID,
			Text:      seg.Content,
			MediaType: "TEXT",
			ReplyToID: previousPostID,
		}
		isVideo := false
		if mu := mediaURLForSegment(seg, mediaURLs); mu != "" {
			if isVideoMediaURL(mu) {
				req.MediaType = "VIDEO"
				req.VideoURL = mu
				isVideo = true
			} else {
				req.MediaType = "IMAGE"
				req.ImageURL = mu
			}
		}

		// Step 1: Create container (with reply_to_id for segments after the first)
		container, err := a.client.CreateThread(ctx, conn.AccessToken, req)
		if err != nil {
			return firstResult, fmt.Errorf("threads adapter: failed to create thread segment %d: %w", i+1, err)
		}

		// Wait for container. Videos need a transcode; images are ~instant.
		if isVideo {
			if err := a.client.WaitForContainerReady(ctx, container.ID, conn.AccessToken, threadsVideoReadyTimeout); err != nil {
				return firstResult, fmt.Errorf("threads adapter: segment %d video container not ready: %w", i+1, err)
			}
		} else {
			time.Sleep(2 * time.Second)
		}

		// Step 2: Publish the container
		published, err := a.client.PublishThread(ctx, userID, conn.AccessToken, container.ID)
		if err != nil {
			return firstResult, fmt.Errorf("threads adapter: failed to publish thread segment %d: %w", i+1, err)
		}

		previousPostID = published.ID

		if i == 0 {
			permalink, _ := a.client.GetPermalink(ctx, published.ID, conn.AccessToken)
			firstResult = PlatformPostResult{
				PlatformPostID: published.ID,
				URL:            permalink,
			}
		}
	}

	return firstResult, nil
}

// ValidateContent checks that the content fits within Threads' character limit.
func (a *ThreadsAdapter) ValidateContent(content string) error {
	if len([]rune(content)) > threadsCharacterLimit {
		return errors.New("threads adapter: content exceeds 500 character limit")
	}
	return nil
}

// GetEngagement retrieves engagement metrics for a Threads post.
func (a *ThreadsAdapter) GetEngagement(ctx context.Context, postID string, conn store.PlatformConnection) (Engagement, error) {
	insights, err := a.client.GetThreadInsights(ctx, postID, conn.AccessToken)
	if err != nil {
		return Engagement{}, fmt.Errorf("threads adapter: %w", err)
	}

	return Engagement{
		Impressions: insights.Views,
		Likes:       insights.Likes,
		Comments:    insights.Replies,
		Shares:      insights.Reposts,
	}, nil
}
