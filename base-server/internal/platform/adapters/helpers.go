package adapters

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"
)

func nowUTC() string {
	return time.Now().UTC().Format(time.RFC3339Nano)
}

// downloadMedia fetches media bytes from a URL (typically S3) and returns the bytes and content type.
func downloadMedia(ctx context.Context, mediaURL string) ([]byte, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, mediaURL, nil)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create media download request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("failed to download media: %w", err)
	}
	defer resp.Body.Close()

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
