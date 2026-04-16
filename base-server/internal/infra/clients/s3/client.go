package s3

import (
	"context"
	"fmt"
	"io"

	"base-server/internal/infra/observability"
)

// S3Config holds the configuration for the S3 client
type S3Config struct {
	Bucket          string
	Region          string
	AccessKeyID     string
	SecretAccessKey string
}

// Client is a stub S3 client that returns expected URLs without making real AWS calls
type Client struct {
	config S3Config
	logger *observability.Logger
}

// NewClient creates a new S3 Client with the provided configuration
func NewClient(config S3Config, logger *observability.Logger) *Client {
	return &Client{
		config: config,
		logger: logger,
	}
}

// UploadFile uploads data to S3 at the given key and returns the object URL.
// This is a stub implementation that returns the expected S3 URL format.
func (c *Client) UploadFile(ctx context.Context, key string, data io.Reader, contentType string) (string, error) {
	c.logger.Info(ctx, "S3 UploadFile stub called")
	// Stub: return the expected S3 URL without making a real AWS call
	url := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", c.config.Bucket, c.config.Region, key)
	return url, nil
}

// DeleteFile removes an object from S3 at the given key.
// This is a stub implementation.
func (c *Client) DeleteFile(ctx context.Context, key string) error {
	c.logger.Info(ctx, "S3 DeleteFile stub called")
	// Stub: no-op
	return nil
}

// GetFile retrieves a file from S3 and returns a reader with content type.
// This is a stub implementation.
func (c *Client) GetFile(ctx context.Context, key string) (io.ReadCloser, string, error) {
	c.logger.Info(ctx, "S3 GetFile stub called")
	// Stub: return error since no real S3 connection exists
	return nil, "", fmt.Errorf("S3 GetFile not implemented: configure STORAGE_TYPE=local for development")
}
