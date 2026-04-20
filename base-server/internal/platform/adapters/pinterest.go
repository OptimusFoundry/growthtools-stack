package adapters

import (
	"context"
	"errors"
	"fmt"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/platform/clients/pinterest"
)

const pinterestCharacterLimit = 500

// PinterestAdapter implements PlatformAdapter for Pinterest.
type PinterestAdapter struct {
	client *pinterest.Client
	logger *observability.Logger
}

// NewPinterestAdapter creates a new PinterestAdapter with an injected Pinterest API client.
func NewPinterestAdapter(client *pinterest.Client, logger *observability.Logger) *PinterestAdapter {
	return &PinterestAdapter{
		client: client,
		logger: logger,
	}
}

// Publish creates a Pin on Pinterest.
// conn.AccessToken = OAuth 2.0 bearer token, conn.PlatformUserID = username.
func (a *PinterestAdapter) Publish(ctx context.Context, content string, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error) {
	// Auto-select first board
	boards, err := a.client.ListBoards(ctx, conn.AccessToken)
	if err != nil {
		return PlatformPostResult{}, fmt.Errorf("pinterest adapter: failed to get board: %w", err)
	}
	if len(boards) == 0 {
		return PlatformPostResult{}, fmt.Errorf("pinterest adapter: account has no boards")
	}

	title := content
	if len(title) > 100 {
		title = title[:100]
	}

	imageURL := ""
	if len(mediaURLs) > 0 {
		imageURL = mediaURLs[0]
	}

	result, err := a.client.CreatePin(ctx, conn.AccessToken, pinterest.CreatePinRequest{
		BoardID:     boards[0].ID,
		Title:       title,
		Description: content,
		ImageURL:    imageURL,
	})
	if err != nil {
		return PlatformPostResult{}, fmt.Errorf("pinterest adapter: %w", err)
	}

	pinURL := fmt.Sprintf("https://www.pinterest.com/pin/%s/", result.ID)

	return PlatformPostResult{
		PlatformPostID: result.ID,
		URL:            pinURL,
	}, nil
}

// PublishThread concatenates thread segments into a single Pinterest pin description.
func (a *PinterestAdapter) PublishThread(ctx context.Context, segments []ThreadSegment, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error) {
	return a.Publish(ctx, concatenateSegments(segments), mediaURLs, conn)
}

// ValidateContent checks that the content fits within Pinterest's description character limit.
func (a *PinterestAdapter) ValidateContent(content string) error {
	if len([]rune(content)) > pinterestCharacterLimit {
		return errors.New("pinterest adapter: content exceeds 500 character limit")
	}
	return nil
}

// GetEngagement retrieves engagement metrics for a Pinterest Pin.
func (a *PinterestAdapter) GetEngagement(ctx context.Context, postID string, conn store.PlatformConnection) (Engagement, error) {
	analytics, err := a.client.GetPinAnalytics(ctx, conn.AccessToken, postID)
	if err != nil {
		return Engagement{}, fmt.Errorf("pinterest adapter: %w", err)
	}

	return Engagement{
		Impressions: analytics.Impressions,
		Likes:       analytics.Saves,
		Clicks:      analytics.PinClicks + analytics.OutboundClicks,
	}, nil
}
