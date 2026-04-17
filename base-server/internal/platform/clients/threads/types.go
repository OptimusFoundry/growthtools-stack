package threads

import "errors"

// ErrAPIError is returned when the Threads API returns a non-success status code.
var ErrAPIError = errors.New("threads api error")

// CreateThreadRequest contains the parameters for creating a thread container.
type CreateThreadRequest struct {
	UserID    string
	Text      string
	MediaType string // "TEXT", "IMAGE", or "VIDEO"
	ImageURL  string // only when MediaType is "IMAGE"
	VideoURL  string // only when MediaType is "VIDEO"
	ReplyToID string // if set, this post is a reply to the given thread ID
}

// CreateThreadResponse contains the container ID from step 1.
type CreateThreadResponse struct {
	ID string
}

// PublishThreadResponse contains the published thread ID.
type PublishThreadResponse struct {
	ID string
}

// ThreadInsights contains engagement metrics for a Threads post.
type ThreadInsights struct {
	Views   int
	Likes   int
	Replies int
	Reposts int
}
