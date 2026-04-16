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
