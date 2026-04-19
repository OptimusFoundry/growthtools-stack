package bluesky

import "errors"

// ErrAPIError is returned when the Bluesky API returns a non-success status code.
var ErrAPIError = errors.New("bluesky api error")

// SessionResponse contains authentication details from createSession.
type SessionResponse struct {
	AccessJwt string
	DID       string
}

// CreateRecordRequest contains the parameters for creating an AT Protocol record.
type CreateRecordRequest struct {
	DID        string
	Collection string
	Record     map[string]any
}

// CreateRecordResponse contains the result of creating a record.
type CreateRecordResponse struct {
	URI string
	CID string
}

// FeedPostView is a minimal view of a single post as returned by app.bsky.feed.getPosts.
type FeedPostView struct {
	URI         string `json:"uri"`
	LikeCount   int    `json:"likeCount"`
	RepostCount int    `json:"repostCount"`
	ReplyCount  int    `json:"replyCount"`
}

// GetPostsResponse is the response shape for app.bsky.feed.getPosts.
type GetPostsResponse struct {
	Posts []FeedPostView `json:"posts"`
}
