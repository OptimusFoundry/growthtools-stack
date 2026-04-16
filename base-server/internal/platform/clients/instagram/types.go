package instagram

import "errors"

// ErrAPIError is returned when the Instagram API returns a non-success status code.
var ErrAPIError = errors.New("instagram api error")

// CreateMediaContainerResponse contains the container ID from the first step.
type CreateMediaContainerResponse struct {
	ID string
}

// PublishMediaResponse contains the published media ID.
type PublishMediaResponse struct {
	ID string
}

// MediaInsights contains engagement metrics for an Instagram post.
type MediaInsights struct {
	LikeCount    int
	CommentCount int
	Impressions  int
}
