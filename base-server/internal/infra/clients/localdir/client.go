package localdir

import (
	"context"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"

	"base-server/internal/infra/observability"
)

// Client stores files on the local filesystem
type Client struct {
	baseDir string
	logger  *observability.Logger
}

// NewClient creates a new local directory storage client
func NewClient(baseDir string, logger *observability.Logger) *Client {
	return &Client{
		baseDir: baseDir,
		logger:  logger,
	}
}

// UploadFile writes data to baseDir/key, creating subdirectories as needed
func (c *Client) UploadFile(ctx context.Context, key string, data io.Reader, contentType string) (string, error) {
	fullPath := filepath.Join(c.baseDir, key)

	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		return "", fmt.Errorf("failed to create directories for %s: %w", key, err)
	}

	f, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to create file %s: %w", key, err)
	}
	defer f.Close()

	if _, err := io.Copy(f, data); err != nil {
		return "", fmt.Errorf("failed to write file %s: %w", key, err)
	}

	c.logger.Info(ctx, "File uploaded to local storage: "+key)
	return key, nil
}

// DeleteFile removes a file from the local filesystem
func (c *Client) DeleteFile(ctx context.Context, key string) error {
	fullPath := filepath.Join(c.baseDir, key)

	if err := os.Remove(fullPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete file %s: %w", key, err)
	}

	c.logger.Info(ctx, "File deleted from local storage: "+key)
	return nil
}

// GetFile opens a file from the local filesystem and returns a reader with content type
func (c *Client) GetFile(ctx context.Context, key string) (io.ReadCloser, string, error) {
	fullPath := filepath.Join(c.baseDir, key)

	f, err := os.Open(fullPath)
	if err != nil {
		return nil, "", fmt.Errorf("failed to open file %s: %w", key, err)
	}

	contentType := mime.TypeByExtension(filepath.Ext(key))
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	return f, contentType, nil
}
