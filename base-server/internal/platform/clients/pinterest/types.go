package pinterest

import "errors"

// ErrAPIError is returned when the Pinterest API returns a non-success status code.
var ErrAPIError = errors.New("pinterest api error")

// ErrNoBoardsFound is returned when the user has no Pinterest boards.
var ErrNoBoardsFound = errors.New("no boards found — please create a board on Pinterest first")

// Board represents a Pinterest board.
type Board struct {
	ID string
}

// CreatePinRequest contains the parameters for creating a Pin.
type CreatePinRequest struct {
	BoardID     string
	Title       string
	Description string
	ImageURL    string // optional
}

// CreatePinResponse contains the result of creating a Pin.
type CreatePinResponse struct {
	ID   string
	Link string
}

// PinAnalytics contains engagement metrics for a Pinterest Pin.
type PinAnalytics struct {
	Impressions    int
	PinClicks      int
	Saves          int
	OutboundClicks int
}
