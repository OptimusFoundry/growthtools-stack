package adapters

import (
	"context"
	"errors"
	"fmt"

	"base-server/internal/platform/clients/facebook"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
)

const facebookCharacterLimit = 63206

// FacebookAdapter implements PlatformAdapter for Facebook Pages.
type FacebookAdapter struct {
	client *facebook.Client
	logger *observability.Logger
}

// NewFacebookAdapter creates a new FacebookAdapter with an injected Facebook API client.
func NewFacebookAdapter(client *facebook.Client, logger *observability.Logger) *FacebookAdapter {
	return &FacebookAdapter{
		client: client,
		logger: logger,
	}
}

// Publish posts content to a Facebook Page.
// conn.AccessToken = page access token, conn.PlatformUserID = page ID.
func (a *FacebookAdapter) Publish(ctx context.Context, content string, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error) {
	pageID := conn.PlatformUserID

	var result facebook.PostResponse
	var err error

	if len(mediaURLs) > 0 {
		result, err = a.client.PostPhoto(ctx, pageID, conn.AccessToken, content, mediaURLs[0])
	} else {
		result, err = a.client.PostToFeed(ctx, pageID, conn.AccessToken, content)
	}
	if err != nil {
		return PlatformPostResult{}, fmt.Errorf("facebook adapter: %w", err)
	}

	postID := result.PostID
	if postID == "" {
		postID = result.ID
	}
	postURL := fmt.Sprintf("https://www.facebook.com/%s", postID)

	return PlatformPostResult{
		PlatformPostID: postID,
		URL:            postURL,
	}, nil
}

// PublishThread concatenates thread segments into a single Facebook post.
func (a *FacebookAdapter) PublishThread(ctx context.Context, segments []ThreadSegment, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error) {
	return a.Publish(ctx, concatenateSegments(segments), mediaURLs, conn)
}

// ValidateContent checks that the content fits within Facebook's character limit.
func (a *FacebookAdapter) ValidateContent(content string) error {
	if len([]rune(content)) > facebookCharacterLimit {
		return errors.New("facebook adapter: content exceeds character limit")
	}
	return nil
}

// GetEngagement retrieves engagement metrics for a Facebook post.
func (a *FacebookAdapter) GetEngagement(ctx context.Context, postID string, conn store.PlatformConnection) (Engagement, error) {
	insights, err := a.client.GetPostInsights(ctx, postID, conn.AccessToken)
	if err != nil {
		return Engagement{}, fmt.Errorf("facebook adapter: %w", err)
	}

	return Engagement{
		Impressions: insights.Impressions,
		Likes:       insights.Likes,
		Comments:    insights.Comments,
		Shares:      insights.Shares,
	}, nil
}
