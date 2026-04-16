package adapters

import (
	"context"
	"errors"
	"fmt"

	"base-server/internal/platform/clients/tiktok"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
)

const tiktokCharacterLimit = 2200

// TikTokAdapter implements PlatformAdapter for TikTok.
type TikTokAdapter struct {
	client *tiktok.Client
	logger *observability.Logger
}

// NewTikTokAdapter creates a new TikTokAdapter with an injected TikTok API client.
func NewTikTokAdapter(client *tiktok.Client, logger *observability.Logger) *TikTokAdapter {
	return &TikTokAdapter{
		client: client,
		logger: logger,
	}
}

// Publish posts a video to TikTok using the FILE_UPLOAD mode via the Content Posting API.
// conn.AccessToken = OAuth 2.0 bearer token, conn.PlatformUserID = open_id.
// Requires at least one media URL (video).
func (a *TikTokAdapter) Publish(ctx context.Context, content string, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error) {
	if len(mediaURLs) == 0 {
		return PlatformPostResult{}, errors.New("tiktok adapter: at least one video URL is required")
	}

	initResp, err := a.client.InitVideoUpload(ctx, conn.AccessToken, content)
	if err != nil {
		return PlatformPostResult{}, fmt.Errorf("tiktok adapter: %w", err)
	}

	// Upload the video to the provided URL
	if initResp.UploadURL != "" {
		videoBytes, _, err := downloadMedia(ctx, mediaURLs[0])
		if err != nil {
			return PlatformPostResult{}, fmt.Errorf("tiktok adapter: failed to download video: %w", err)
		}

		if err := a.client.UploadVideo(ctx, initResp.UploadURL, videoBytes); err != nil {
			return PlatformPostResult{}, fmt.Errorf("tiktok adapter: video upload failed: %w", err)
		}
	}

	return PlatformPostResult{
		PlatformPostID: initResp.PublishID,
	}, nil
}

// PublishThread concatenates thread segments into a single TikTok caption.
func (a *TikTokAdapter) PublishThread(ctx context.Context, segments []ThreadSegment, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error) {
	return a.Publish(ctx, concatenateSegments(segments), mediaURLs, conn)
}

// ValidateContent checks that the content fits within TikTok's caption character limit.
func (a *TikTokAdapter) ValidateContent(content string) error {
	if len([]rune(content)) > tiktokCharacterLimit {
		return errors.New("tiktok adapter: content exceeds 2200 character limit")
	}
	return nil
}

// GetEngagement returns zero engagement — TikTok's Content Posting API has limited analytics.
func (a *TikTokAdapter) GetEngagement(ctx context.Context, postID string, conn store.PlatformConnection) (Engagement, error) {
	return Engagement{}, nil
}
