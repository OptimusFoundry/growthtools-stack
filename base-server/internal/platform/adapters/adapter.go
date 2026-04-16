package adapters

import (
	"context"
	"strings"

	"base-server/internal/infra/store"
)

// PlatformPostResult contains the result of publishing a post to a platform.
type PlatformPostResult struct {
	PlatformPostID string
	URL            string
}

// ThreadSegment represents a single part of a threaded post with optional media.
type ThreadSegment struct {
	Content    string `json:"content"`
	ImageIndex *int   `json:"image_index,omitempty"` // 1-based index into the media array
}

// Engagement holds engagement metrics for a published post.
type Engagement struct {
	Impressions int
	Likes       int
	Comments    int
	Shares      int
	Clicks      int
}

// PlatformAdapter is the interface each social media platform adapter must implement.
// Adapters are stateless singletons — user tokens come from conn at call time.
type PlatformAdapter interface {
	// Publish posts content with optional media to the platform.
	Publish(ctx context.Context, content string, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error)

	// PublishThread posts a multi-segment thread to the platform.
	// Each segment may reference media by index. Returns the result for the first segment.
	// Platforms that don't support native threads concatenate segments into a single post.
	PublishThread(ctx context.Context, segments []ThreadSegment, mediaURLs []string, conn store.PlatformConnection) (PlatformPostResult, error)

	// ValidateContent checks whether the content satisfies platform constraints.
	ValidateContent(content string) error

	// GetEngagement retrieves engagement metrics for a previously published post.
	GetEngagement(ctx context.Context, postID string, conn store.PlatformConnection) (Engagement, error)
}

// mediaURLForSegment returns the media URL for a segment's image_index, or empty string.
func mediaURLForSegment(seg ThreadSegment, mediaURLs []string) string {
	if seg.ImageIndex == nil {
		return ""
	}
	idx := *seg.ImageIndex - 1 // 1-based to 0-based
	if idx >= 0 && idx < len(mediaURLs) {
		return mediaURLs[idx]
	}
	return ""
}

// concatenateSegments joins thread segments into a single string for platforms
// that don't support native threading.
func concatenateSegments(segments []ThreadSegment) string {
	parts := make([]string, len(segments))
	for i, seg := range segments {
		parts[i] = seg.Content
	}
	return strings.Join(parts, "\n\n")
}
