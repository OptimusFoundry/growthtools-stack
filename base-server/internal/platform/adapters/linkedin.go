package adapters

import (
	"context"
	"errors"
	"fmt"

	"base-server/internal/platform/clients/linkedin"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
)

const linkedinCharacterLimit = 3000

// LinkedInAdapter implements PlatformAdapter for LinkedIn.
type LinkedInAdapter struct {
	client *linkedin.Client
	logger *observability.Logger
}

// NewLinkedInAdapter creates a new LinkedInAdapter with an injected LinkedIn API client.
func NewLinkedInAdapter(client *linkedin.Client, logger *observability.Logger) *LinkedInAdapter {
	return &LinkedInAdapter{
		client: client,
		logger: logger,
	}
}

// Publish posts content to LinkedIn via the REST API.
// conn.AccessToken = OAuth 2.0 bearer token, conn.PlatformUserID = person ID.
func (a *LinkedInAdapter) Publish(ctx context.Context, content string, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error) {
	authorURN := "urn:li:person:" + conn.PlatformUserID

	// Upload images if present
	var mediaAssets []map[string]any
	for _, mediaURL := range mediaURLs {
		mediaBytes, _, err := downloadMedia(ctx, mediaURL)
		if err != nil {
			return PlatformPostResult{}, fmt.Errorf("linkedin adapter: download media: %w", err)
		}

		initResp, err := a.client.InitializeImageUpload(ctx, conn.AccessToken, authorURN)
		if err != nil {
			return PlatformPostResult{}, fmt.Errorf("linkedin adapter: initialize image upload: %w", err)
		}

		if err := a.client.UploadImage(ctx, conn.AccessToken, initResp.UploadURL, mediaBytes); err != nil {
			return PlatformPostResult{}, fmt.Errorf("linkedin adapter: upload image: %w", err)
		}

		mediaAssets = append(mediaAssets, map[string]any{
			"id": initResp.ImageURN,
		})
	}

	result, err := a.client.CreatePost(ctx, conn.AccessToken, linkedin.CreatePostRequest{
		AuthorURN:   authorURN,
		Content:     content,
		MediaAssets: mediaAssets,
	})
	if err != nil {
		return PlatformPostResult{}, fmt.Errorf("linkedin adapter: %w", err)
	}

	postURL := fmt.Sprintf("https://www.linkedin.com/feed/update/%s", result.PostURN)

	return PlatformPostResult{
		PlatformPostID: result.PostURN,
		URL:            postURL,
	}, nil
}

// PublishThread concatenates thread segments into a single LinkedIn post.
func (a *LinkedInAdapter) PublishThread(ctx context.Context, segments []ThreadSegment, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error) {
	return a.Publish(ctx, concatenateSegments(segments), mediaURLs, conn)
}

// ValidateContent checks that the content fits within LinkedIn's character limit.
func (a *LinkedInAdapter) ValidateContent(content string) error {
	if len([]rune(content)) > linkedinCharacterLimit {
		return errors.New("linkedin adapter: content exceeds 3000 character limit")
	}
	return nil
}

// GetEngagement retrieves engagement metrics for a LinkedIn post.
func (a *LinkedInAdapter) GetEngagement(ctx context.Context, postID string, conn store.PlatformConnection) (Engagement, error) {
	metadata, err := a.client.GetSocialMetadata(ctx, conn.AccessToken, postID)
	if err != nil {
		return Engagement{}, fmt.Errorf("linkedin adapter: %w", err)
	}

	return Engagement{
		Likes:    metadata.TotalLikes,
		Comments: metadata.TotalFirstLevelComments,
		Shares:   metadata.TotalShares,
	}, nil
}
