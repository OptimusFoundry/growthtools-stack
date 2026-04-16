package adapters

import (
	"context"
	"errors"
	"fmt"
	"time"

	"base-server/internal/platform/clients/threads"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
)

const threadsCharacterLimit = 500

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

	mediaType := "TEXT"
	imageURL := ""
	if len(mediaURLs) > 0 {
		mediaType = "IMAGE"
		imageURL = mediaURLs[0]
	}

	// Step 1: Create thread container
	container, err := a.client.CreateThread(ctx, conn.AccessToken, threads.CreateThreadRequest{
		UserID:    userID,
		Text:      content,
		MediaType: mediaType,
		ImageURL:  imageURL,
	})
	if err != nil {
		return PlatformPostResult{}, fmt.Errorf("threads adapter: %w", err)
	}

	// Brief wait for container processing
	time.Sleep(2 * time.Second)

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
		mediaType := "TEXT"
		imageURL := ""
		if mu := mediaURLForSegment(seg, mediaURLs); mu != "" {
			mediaType = "IMAGE"
			imageURL = mu
		}

		// Step 1: Create container (with reply_to_id for segments after the first)
		container, err := a.client.CreateThread(ctx, conn.AccessToken, threads.CreateThreadRequest{
			UserID:    userID,
			Text:      seg.Content,
			MediaType: mediaType,
			ImageURL:  imageURL,
			ReplyToID: previousPostID,
		})
		if err != nil {
			return firstResult, fmt.Errorf("threads adapter: failed to create thread segment %d: %w", i+1, err)
		}

		// Brief wait for container processing
		time.Sleep(2 * time.Second)

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
