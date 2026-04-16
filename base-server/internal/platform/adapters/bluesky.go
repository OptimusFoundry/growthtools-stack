package adapters

import (
	"context"
	"errors"
	"fmt"

	"base-server/internal/platform/clients/bluesky"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
)

const blueskyCharacterLimit = 300

// BlueskyAdapter implements PlatformAdapter for Bluesky via the AT Protocol.
type BlueskyAdapter struct {
	client *bluesky.Client
	logger *observability.Logger
}

// NewBlueskyAdapter creates a new BlueskyAdapter with an injected Bluesky API client.
func NewBlueskyAdapter(client *bluesky.Client, logger *observability.Logger) *BlueskyAdapter {
	return &BlueskyAdapter{
		client: client,
		logger: logger,
	}
}

// Publish posts content to Bluesky.
// conn.PlatformUserID = handle (e.g. user.bsky.social), conn.AccessToken = app password.
func (a *BlueskyAdapter) Publish(ctx context.Context, content string, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error) {
	// Authenticate — create session to get accessJwt
	session, err := a.client.CreateSession(ctx, conn.PlatformUserID, conn.AccessToken)
	if err != nil {
		return PlatformPostResult{}, fmt.Errorf("bluesky adapter: auth failed: %w", err)
	}

	// Upload blobs for media
	var images []map[string]any
	for _, mediaURL := range mediaURLs {
		mediaBytes, contentType, err := downloadMedia(ctx, mediaURL)
		if err != nil {
			a.logger.Error(ctx, "failed to download media for bluesky", err)
			continue
		}

		blob, err := a.client.UploadBlob(ctx, session.AccessJwt, mediaBytes, contentType)
		if err != nil {
			a.logger.Error(ctx, "failed to upload blob to bluesky", err)
			continue
		}
		images = append(images, map[string]any{
			"alt":   "",
			"image": blob,
		})
	}

	// Build record
	record := map[string]any{
		"$type":     "app.bsky.feed.post",
		"text":      content,
		"createdAt": fmt.Sprintf("%s", nowUTC()),
	}
	if len(images) > 0 {
		record["embed"] = map[string]any{
			"$type":  "app.bsky.embed.images",
			"images": images,
		}
	}

	result, err := a.client.CreateRecord(ctx, session.AccessJwt, bluesky.CreateRecordRequest{
		DID:        session.DID,
		Collection: "app.bsky.feed.post",
		Record:     record,
	})
	if err != nil {
		return PlatformPostResult{}, fmt.Errorf("bluesky adapter: %w", err)
	}

	postURL := atURIToWebURL(result.URI, conn.PlatformUserID)

	return PlatformPostResult{
		PlatformPostID: result.URI,
		URL:            postURL,
	}, nil
}

// PublishThread posts a multi-post thread to Bluesky by chaining replies.
func (a *BlueskyAdapter) PublishThread(ctx context.Context, segments []ThreadSegment, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error) {
	if len(segments) == 0 {
		return PlatformPostResult{}, fmt.Errorf("bluesky adapter: no thread segments provided")
	}

	session, err := a.client.CreateSession(ctx, conn.PlatformUserID, conn.AccessToken)
	if err != nil {
		return PlatformPostResult{}, fmt.Errorf("bluesky adapter: auth failed: %w", err)
	}

	var firstResult PlatformPostResult
	var rootURI, rootCID string
	var parentURI, parentCID string

	for i, seg := range segments {
		// Upload media for this segment if it references one
		var images []map[string]any
		if mediaURL := mediaURLForSegment(seg, mediaURLs); mediaURL != "" {
			mediaBytes, contentType, err := downloadMedia(ctx, mediaURL)
			if err != nil {
				a.logger.Error(ctx, "failed to download media for bluesky thread segment", err)
			} else {
				blob, err := a.client.UploadBlob(ctx, session.AccessJwt, mediaBytes, contentType)
				if err != nil {
					a.logger.Error(ctx, "failed to upload blob to bluesky for thread segment", err)
				} else {
					images = append(images, map[string]any{
						"alt":   "",
						"image": blob,
					})
				}
			}
		}

		record := map[string]any{
			"$type":     "app.bsky.feed.post",
			"text":      seg.Content,
			"createdAt": fmt.Sprintf("%s", nowUTC()),
		}
		if len(images) > 0 {
			record["embed"] = map[string]any{
				"$type":  "app.bsky.embed.images",
				"images": images,
			}
		}
		// Set reply reference for all posts after the first
		if i > 0 {
			record["reply"] = map[string]any{
				"root": map[string]any{
					"uri": rootURI,
					"cid": rootCID,
				},
				"parent": map[string]any{
					"uri": parentURI,
					"cid": parentCID,
				},
			}
		}

		result, err := a.client.CreateRecord(ctx, session.AccessJwt, bluesky.CreateRecordRequest{
			DID:        session.DID,
			Collection: "app.bsky.feed.post",
			Record:     record,
		})
		if err != nil {
			return firstResult, fmt.Errorf("bluesky adapter: failed to post thread segment %d: %w", i+1, err)
		}

		// Track root and parent for reply chain
		if i == 0 {
			rootURI = result.URI
			rootCID = result.CID
			postURL := atURIToWebURL(result.URI, conn.PlatformUserID)
			firstResult = PlatformPostResult{
				PlatformPostID: result.URI,
				URL:            postURL,
			}
		}
		parentURI = result.URI
		parentCID = result.CID
	}

	return firstResult, nil
}

// ValidateContent checks that the content fits within Bluesky's character limit.
func (a *BlueskyAdapter) ValidateContent(content string) error {
	if len([]rune(content)) > blueskyCharacterLimit {
		return errors.New("bluesky adapter: content exceeds 300 character limit")
	}
	return nil
}

// GetEngagement returns zero engagement — Bluesky's API has limited analytics access.
func (a *BlueskyAdapter) GetEngagement(ctx context.Context, postID string, conn store.PlatformConnection) (Engagement, error) {
	return Engagement{}, nil
}

// atURIToWebURL converts an AT URI to a Bluesky web URL.
func atURIToWebURL(atURI, handle string) string {
	// at://did:plc:xxx/app.bsky.feed.post/rkey → https://bsky.app/profile/handle/post/rkey
	parts := splitATURI(atURI)
	if len(parts) >= 3 {
		return fmt.Sprintf("https://bsky.app/profile/%s/post/%s", handle, parts[2])
	}
	return ""
}

// splitATURI splits "at://did/collection/rkey" into [did, collection, rkey].
func splitATURI(uri string) []string {
	if len(uri) > 5 && uri[:5] == "at://" {
		uri = uri[5:]
	}
	parts := make([]string, 0, 3)
	start := 0
	for i := 0; i < len(uri); i++ {
		if uri[i] == '/' {
			parts = append(parts, uri[start:i])
			start = i + 1
		}
	}
	if start < len(uri) {
		parts = append(parts, uri[start:])
	}
	return parts
}
