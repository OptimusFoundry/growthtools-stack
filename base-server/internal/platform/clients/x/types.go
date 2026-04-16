package x

import "errors"

// ErrAPIError is returned when the X API returns a non-success status code.
var ErrAPIError = errors.New("x api error")

// CreateTweetRequest contains the parameters for creating a tweet.
type CreateTweetRequest struct {
	Text      string
	MediaIDs  []string
	ReplyToID string // If set, this tweet is a reply to the given tweet ID
}

// CreateTweetResponse contains the result of creating a tweet.
type CreateTweetResponse struct {
	ID string
}

// UploadMediaRequest contains the parameters for uploading media to X.
type UploadMediaRequest struct {
	MediaBytes []byte
	MediaType  string
}

// TweetMetrics contains public engagement metrics for a tweet.
type TweetMetrics struct {
	ImpressionCount int
	LikeCount       int
	ReplyCount      int
	RetweetCount    int
	QuoteCount      int
	BookmarkCount   int
}
