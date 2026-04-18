package adapters

import (
	"context"
	"errors"
	"fmt"

	"base-server/internal/platform/clients/x"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
)

const xCharacterLimit = 280

// XAdapter implements PlatformAdapter for X (formerly Twitter).
type XAdapter struct {
	client *x.Client
	logger *observability.Logger
}

// NewXAdapter creates a new XAdapter with an injected X API client.
func NewXAdapter(client *x.Client, logger *observability.Logger) *XAdapter {
	return &XAdapter{
		client: client,
		logger: logger,
	}
}

// Publish posts content to X via the v2 API.
// conn.AccessToken = OAuth 2.0 Bearer token.
func (a *XAdapter) Publish(ctx context.Context, content string, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error) {
	accessToken := conn.AccessToken
	tokenSecret := "" // OAuth 2.0: always use Bearer auth, RefreshToken is not a token secret

	// Upload media if present
	var mediaIDs []string
	for _, mediaURL := range mediaURLs {
		mediaBytes, contentType, err := downloadMedia(ctx, mediaURL)
		if err != nil {
			return PlatformPostResult{}, fmt.Errorf("x adapter: download media: %w", err)
		}

		mediaID, err := a.client.UploadMedia(ctx, x.UploadMediaRequest{
			MediaBytes: mediaBytes,
			MediaType:  contentType,
		}, accessToken, tokenSecret)
		if err != nil {
			return PlatformPostResult{}, fmt.Errorf("x adapter: upload media: %w", err)
		}
		mediaIDs = append(mediaIDs, mediaID)
	}

	result, err := a.client.CreateTweet(ctx, x.CreateTweetRequest{
		Text:     content,
		MediaIDs: mediaIDs,
	}, accessToken, tokenSecret)
	if err != nil {
		return PlatformPostResult{}, fmt.Errorf("x adapter: %w", err)
	}

	tweetURL := fmt.Sprintf("https://x.com/%s/status/%s", conn.PlatformUserID, result.ID)
	return PlatformPostResult{
		PlatformPostID: result.ID,
		URL:            tweetURL,
	}, nil
}

// PublishThread posts a multi-tweet thread to X by chaining replies.
func (a *XAdapter) PublishThread(ctx context.Context, segments []ThreadSegment, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error) {
	if len(segments) == 0 {
		return PlatformPostResult{}, fmt.Errorf("x adapter: no thread segments provided")
	}

	accessToken := conn.AccessToken
	tokenSecret := "" // OAuth 2.0: always use Bearer auth

	var firstResult PlatformPostResult
	var previousTweetID string

	for i, seg := range segments {
		// Upload media for this segment if it references one
		var mediaIDs []string
		if mediaURL := mediaURLForSegment(seg, mediaURLs); mediaURL != "" {
			mediaBytes, contentType, err := downloadMedia(ctx, mediaURL)
			if err != nil {
				return firstResult, fmt.Errorf("x adapter: failed to download media for thread segment %d: %w", i+1, err)
			}

			mediaID, err := a.client.UploadMedia(ctx, x.UploadMediaRequest{
				MediaBytes: mediaBytes,
				MediaType:  contentType,
			}, accessToken, tokenSecret)
			if err != nil {
				return firstResult, fmt.Errorf("x adapter: failed to upload media for thread segment %d: %w", i+1, err)
			}

			mediaIDs = append(mediaIDs, mediaID)
		}

		result, err := a.client.CreateTweet(ctx, x.CreateTweetRequest{
			Text:      seg.Content,
			MediaIDs:  mediaIDs,
			ReplyToID: previousTweetID,
		}, accessToken, tokenSecret)
		if err != nil {
			return firstResult, fmt.Errorf("x adapter: failed to post thread segment %d: %w", i+1, err)
		}

		previousTweetID = result.ID

		if i == 0 {
			tweetURL := fmt.Sprintf("https://x.com/%s/status/%s", conn.PlatformUserID, result.ID)
			firstResult = PlatformPostResult{
				PlatformPostID: result.ID,
				URL:            tweetURL,
			}
		}
	}

	return firstResult, nil
}

// ValidateContent checks that the content fits within X's character limit.
func (a *XAdapter) ValidateContent(content string) error {
	if len([]rune(content)) > xCharacterLimit {
		return errors.New("x adapter: content exceeds 280 character limit")
	}
	return nil
}

// GetEngagement retrieves engagement metrics for an X post.
func (a *XAdapter) GetEngagement(ctx context.Context, postID string, conn store.PlatformConnection) (Engagement, error) {
	accessToken := conn.AccessToken
	tokenSecret := "" // OAuth 2.0: always use Bearer auth

	metrics, err := a.client.GetTweetMetrics(ctx, postID, accessToken, tokenSecret)
	if err != nil {
		return Engagement{}, fmt.Errorf("x adapter: %w", err)
	}

	return Engagement{
		Impressions: metrics.ImpressionCount,
		Likes:       metrics.LikeCount,
		Comments:    metrics.ReplyCount,
		Shares:      metrics.RetweetCount + metrics.QuoteCount,
	}, nil
}
