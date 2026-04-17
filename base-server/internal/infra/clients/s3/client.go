package s3

import (
	"context"
	"fmt"
	"io"
	"time"

	"base-server/internal/infra/observability"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Config holds the configuration for the S3 client
type S3Config struct {
	Bucket          string
	Region          string
	AccessKeyID     string
	SecretAccessKey string
}

// Client wraps the AWS S3 client.
type Client struct {
	config    S3Config
	s3        *awss3.Client
	presigner *awss3.PresignClient
	logger    *observability.Logger
}

// NewClient creates a new S3 Client. If creds are provided in config, they are used;
// otherwise the SDK's default credential chain is used.
func NewClient(config S3Config, logger *observability.Logger) *Client {
	loadOpts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(config.Region),
	}
	if config.AccessKeyID != "" && config.SecretAccessKey != "" {
		loadOpts = append(loadOpts, awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(config.AccessKeyID, config.SecretAccessKey, ""),
		))
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(), loadOpts...)
	if err != nil {
		logger.Error(context.Background(), "failed to load AWS config", err)
	}

	s3Client := awss3.NewFromConfig(awsCfg)
	return &Client{
		config:    config,
		s3:        s3Client,
		presigner: awss3.NewPresignClient(s3Client),
		logger:    logger,
	}
}

// UploadFile uploads data to S3 at the given key.
func (c *Client) UploadFile(ctx context.Context, key string, data io.Reader, contentType string) (string, error) {
	_, err := c.s3.PutObject(ctx, &awss3.PutObjectInput{
		Bucket:      &c.config.Bucket,
		Key:         &key,
		Body:        data,
		ContentType: &contentType,
	})
	if err != nil {
		return "", fmt.Errorf("s3: PutObject failed: %w", err)
	}
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", c.config.Bucket, c.config.Region, key), nil
}

// DeleteFile removes an object from S3 at the given key.
func (c *Client) DeleteFile(ctx context.Context, key string) error {
	_, err := c.s3.DeleteObject(ctx, &awss3.DeleteObjectInput{
		Bucket: &c.config.Bucket,
		Key:    &key,
	})
	if err != nil {
		return fmt.Errorf("s3: DeleteObject failed: %w", err)
	}
	return nil
}

// PresignGetURL returns a time-limited HTTPS URL for a GetObject request,
// letting the browser fetch a private S3 object directly without proxying
// through the server.
func (c *Client) PresignGetURL(ctx context.Context, key string, ttl time.Duration) (string, error) {
	req, err := c.presigner.PresignGetObject(ctx, &awss3.GetObjectInput{
		Bucket: &c.config.Bucket,
		Key:    &key,
	}, awss3.WithPresignExpires(ttl))
	if err != nil {
		return "", fmt.Errorf("s3: PresignGetObject failed: %w", err)
	}
	return req.URL, nil
}

// Bucket returns the bucket this client is configured against. Useful for
// callers that need to verify an `s3://bucket/key` URL matches before
// presigning.
func (c *Client) Bucket() string {
	return c.config.Bucket
}

// HeadObject returns size and content type for an object without fetching its body.
func (c *Client) HeadObject(ctx context.Context, key string) (int64, string, error) {
	out, err := c.s3.HeadObject(ctx, &awss3.HeadObjectInput{
		Bucket: &c.config.Bucket,
		Key:    &key,
	})
	if err != nil {
		return 0, "", fmt.Errorf("s3: HeadObject failed: %w", err)
	}
	var size int64
	if out.ContentLength != nil {
		size = *out.ContentLength
	}
	contentType := ""
	if out.ContentType != nil {
		contentType = *out.ContentType
	}
	return size, contentType, nil
}

// GetFile retrieves a file from S3 and returns a reader plus the content type.
func (c *Client) GetFile(ctx context.Context, key string) (io.ReadCloser, string, error) {
	out, err := c.s3.GetObject(ctx, &awss3.GetObjectInput{
		Bucket: &c.config.Bucket,
		Key:    &key,
	})
	if err != nil {
		return nil, "", fmt.Errorf("s3: GetObject failed: %w", err)
	}
	contentType := ""
	if out.ContentType != nil {
		contentType = *out.ContentType
	}
	return out.Body, contentType, nil
}
