package adapters

import (
	"context"
	"errors"
	"fmt"
	"time"

	"base-server/internal/platform/clients/instagram"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
)

const instagramCharacterLimit = 2200

// InstagramAdapter implements PlatformAdapter for Instagram via the Graph API.
type InstagramAdapter struct {
	client *instagram.Client
	logger *observability.Logger
}

// NewInstagramAdapter creates a new InstagramAdapter with an injected Instagram API client.
func NewInstagramAdapter(client *instagram.Client, logger *observability.Logger) *InstagramAdapter {
	return &InstagramAdapter{
		client: client,
		logger: logger,
	}
}

// Publish posts content to Instagram using the 2-step container flow.
// conn.AccessToken = user access token, conn.PlatformUserID = IG business account ID.
// Instagram requires at least one image — text-only posts are not supported.
func (a *InstagramAdapter) Publish(ctx context.Context, content string, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error) {
	if len(mediaURLs) == 0 {
		return PlatformPostResult{}, errors.New("instagram adapter: at least one image is required")
	}

	igAccountID := conn.PlatformUserID

	// Step 1: Create media container
	container, err := a.client.CreateMediaContainer(ctx, igAccountID, conn.AccessToken, mediaURLs[0], content)
	if err != nil {
		return PlatformPostResult{}, fmt.Errorf("instagram adapter: %w", err)
	}

	// Brief wait for container processing
	time.Sleep(2 * time.Second)

	// Step 2: Publish the container
	published, err := a.client.PublishMedia(ctx, igAccountID, conn.AccessToken, container.ID)
	if err != nil {
		return PlatformPostResult{}, fmt.Errorf("instagram adapter: %w", err)
	}

	// Get permalink
	permalink, _ := a.client.GetPermalink(ctx, published.ID, conn.AccessToken)

	return PlatformPostResult{
		PlatformPostID: published.ID,
		URL:            permalink,
	}, nil
}

// PublishThread concatenates thread segments into a single Instagram caption.
func (a *InstagramAdapter) PublishThread(ctx context.Context, segments []ThreadSegment, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error) {
	return a.Publish(ctx, concatenateSegments(segments), mediaURLs, conn)
}

// ValidateContent checks that the content fits within Instagram's caption character limit.
func (a *InstagramAdapter) ValidateContent(content string) error {
	if len([]rune(content)) > instagramCharacterLimit {
		return errors.New("instagram adapter: content exceeds 2200 character limit")
	}
	return nil
}

// GetEngagement retrieves engagement metrics for an Instagram post.
func (a *InstagramAdapter) GetEngagement(ctx context.Context, postID string, conn store.PlatformConnection) (Engagement, error) {
	insights, err := a.client.GetMediaInsights(ctx, postID, conn.AccessToken)
	if err != nil {
		return Engagement{}, fmt.Errorf("instagram adapter: %w", err)
	}

	return Engagement{
		Impressions: insights.Impressions,
		Likes:       insights.LikeCount,
		Comments:    insights.CommentCount,
	}, nil
}
