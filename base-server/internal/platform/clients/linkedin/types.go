package linkedin

import "errors"

// ErrAPIError is returned when the LinkedIn API returns a non-success status code.
var ErrAPIError = errors.New("linkedin api error")

// CreatePostRequest contains the parameters for creating a LinkedIn post.
type CreatePostRequest struct {
	AuthorURN   string
	Content     string
	MediaAssets []map[string]any
}

// CreatePostResponse contains the result of creating a LinkedIn post.
type CreatePostResponse struct {
	PostURN string
}

// InitializeImageUploadResponse contains the upload URL and image URN.
type InitializeImageUploadResponse struct {
	UploadURL string
	ImageURN  string
}

// SocialMetadata contains engagement metrics for a LinkedIn post.
type SocialMetadata struct {
	TotalLikes              int
	TotalFirstLevelComments int
	TotalShares             int
}
