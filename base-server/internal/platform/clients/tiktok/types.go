package tiktok

import "errors"

// ErrAPIError is returned when the TikTok API returns a non-success status code.
var ErrAPIError = errors.New("tiktok api error")

// InitVideoUploadResponse contains the publish ID and upload URL from the init step.
type InitVideoUploadResponse struct {
	PublishID string
	UploadURL string
}
