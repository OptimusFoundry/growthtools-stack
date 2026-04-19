package adapters

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"
)

func nowUTC() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000Z07:00")
}

// mediaHTTPClient is the HTTP client used by downloadMedia. Overridable in tests
// if needed; defaults to http.DefaultTransport with no custom transport.
var mediaHTTPClient = &http.Client{}

// downloadMedia fetches media bytes from a URL (typically S3) and returns the bytes and content type.
func downloadMedia(ctx context.Context, mediaURL string) ([]byte, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, mediaURL, nil)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create media download request: %w", err)
	}

	resp, err := mediaHTTPClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("failed to download media: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		io.Copy(io.Discard, resp.Body)
		return nil, "", fmt.Errorf("media download returned status %d", resp.StatusCode)
	}

	mediaBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read media: %w", err)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	return mediaBytes, contentType, nil
}
