package adapters

import (
	"context"
	"encoding/json"
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

// PostSpec carries the post the async pipeline is trying to publish.
// Segments is nil for single posts.
type PostSpec struct {
	Content   string
	Segments  []ThreadSegment
	MediaURLs []string // presigned HTTPS, positional — image_index points here
}

// AsyncPlatformAdapter is an opt-in extension of PlatformAdapter that
// lets an adapter participate in the async publish pipeline:
// StartPublish → (CheckReady loop, driven by the reconciler) → Finalize.
//
// Workers type-assert on this interface; adapters that don't implement
// it fall back to the blocking PlatformAdapter.Publish /
// PlatformAdapter.PublishThread path. Implement this when the
// platform's flow has a legitimately async step (media transcode,
// container processing) whose wait we don't want hogging a worker
// goroutine.
type AsyncPlatformAdapter interface {
	PlatformAdapter

	// StartPublish performs the parts of the flow that don't need to
	// wait on platform-side processing: downloading local-ish media,
	// uploading blobs, creating containers. Returns an opaque handle
	// the pipeline will persist as platform_posts.media_handle. If
	// readyNow is true the pipeline skips the reconciler and calls
	// Finalize directly — use it when there's no async step.
	StartPublish(ctx context.Context, spec PostSpec, conn store.PlatformConnection) (handle json.RawMessage, readyNow bool, err error)

	// CheckReady polls the platform for the handle's processing state.
	// Returns ready=true once the platform reports success; the
	// returned updatedHandle replaces what's stored so the finalizer
	// sees the latest per-platform fields (e.g. X's succeeded
	// processing_info, Threads' FINISHED status).
	CheckReady(ctx context.Context, handle json.RawMessage, conn store.PlatformConnection) (ready bool, updatedHandle json.RawMessage, err error)

	// Finalize consumes a handle the reconciler (or StartPublish
	// readyNow) has flagged as ready, creates the actual post(s), and
	// returns the public result. Finalize may still block internally
	// for work that isn't worth a second trip through Kafka — e.g.
	// chaining the 2nd+ segments of a Threads thread.
	Finalize(ctx context.Context, spec PostSpec, handle json.RawMessage, conn store.PlatformConnection) (PlatformPostResult, error)
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
