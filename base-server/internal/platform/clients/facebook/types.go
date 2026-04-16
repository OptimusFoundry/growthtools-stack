package facebook

import "errors"

// ErrAPIError is returned when the Facebook API returns a non-success status code.
var ErrAPIError = errors.New("facebook api error")

// PostResponse contains the result of creating a Facebook post.
type PostResponse struct {
	ID     string
	PostID string
}

// PostInsights contains engagement metrics for a Facebook post.
type PostInsights struct {
	Impressions int
	Likes       int
	Comments    int
	Shares      int
}
