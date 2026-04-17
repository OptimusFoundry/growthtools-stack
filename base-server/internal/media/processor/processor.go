package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

import (
	"context"
	"errors"
	"io"
	"strings"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// URLSigner turns an S3 key into a time-limited HTTPS URL the browser can
// fetch directly. Mirrors the same-named interface in github/processor so
// bootstrap can wire the S3 client to both.
type URLSigner interface {
	PresignGetURL(ctx context.Context, key string, ttl time.Duration) (string, error)
}

// mediaPresignTTL matches the commit-detail presign window so users see
// consistent URL lifetimes across the app.
const mediaPresignTTL = time.Hour

// MediaStore defines the database operations required by MediaProcessor
type MediaStore interface {
	CreateMedia(ctx context.Context, params store.CreateMediaParams) (store.Media, error)
	GetMediaByID(ctx context.Context, accountID, mediaID uuid.UUID) (store.Media, error)
	ListMediaByAccount(ctx context.Context, accountID uuid.UUID, limit, offset int) ([]store.Media, error)
	DeleteMedia(ctx context.Context, accountID, mediaID uuid.UUID) error
	CountMediaByAccount(ctx context.Context, accountID uuid.UUID) (int, error)
}

// FileStore defines the file storage operations required by MediaProcessor
type FileStore interface {
	UploadFile(ctx context.Context, key string, data io.Reader, contentType string) (string, error)
	DeleteFile(ctx context.Context, key string) error
	GetFile(ctx context.Context, key string) (io.ReadCloser, string, error)
}

var (
	ErrMediaNotFound = errors.New("media not found")
	ErrFailedUpload  = errors.New("failed to upload media")
	ErrFailedDelete  = errors.New("failed to delete media")
	ErrFailedGetFile = errors.New("failed to get file")
)

type MediaProcessor struct {
	store         MediaStore
	fileStore     FileStore
	publicBaseURL string
	urlSigner     URLSigner
	logger        *observability.Logger
}

func New(store MediaStore, fileStore FileStore, publicBaseURL string, logger *observability.Logger) MediaProcessor {
	return MediaProcessor{
		store:         store,
		fileStore:     fileStore,
		publicBaseURL: publicBaseURL,
		logger:        logger,
	}
}

// SetURLSigner wires the presign dependency after construction so existing
// callsites don't need to change. Pass nil to leave `s3://bucket/key` URLs
// untouched (local/dev storage).
func (p *MediaProcessor) SetURLSigner(signer URLSigner) {
	p.urlSigner = signer
}

// Upload uploads a file to S3 and persists the media record to the store
func (p *MediaProcessor) Upload(ctx context.Context, accountID uuid.UUID, filename, contentType string, size int64, data io.Reader) (store.Media, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "filename", Value: filename},
		observability.Field{Key: "operation", Value: "upload_media"},
	)

	ext := ""
	if dot := strings.LastIndex(filename, "."); dot >= 0 {
		ext = filename[dot:]
	}
	key := accountID.String() + "/" + uuid.New().String() + ext

	if _, err := p.fileStore.UploadFile(ctx, key, data, contentType); err != nil {
		p.logger.Error(ctx, "failed to upload file to S3", err)
		return store.Media{}, ErrFailedUpload
	}

	params := store.CreateMediaParams{
		AccountID:   accountID,
		Filename:    filename,
		ContentType: contentType,
		S3Key:       key,
		S3URL:       p.publicURL(key),
		SizeBytes:   size,
		Source:      "upload",
	}

	created, err := p.store.CreateMedia(ctx, params)
	if err != nil {
		p.logger.Error(ctx, "failed to persist media record", err)
		// Attempt to clean up S3 object on DB failure
		if deleteErr := p.fileStore.DeleteFile(ctx, key); deleteErr != nil {
			p.logger.Error(ctx, "failed to clean up S3 object after DB failure", deleteErr)
		}
		return store.Media{}, ErrFailedUpload
	}

	return created, nil
}

// Delete removes a media record from the store and deletes the file from S3
func (p *MediaProcessor) Delete(ctx context.Context, accountID, mediaID uuid.UUID) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "media_id", Value: mediaID.String()},
		observability.Field{Key: "operation", Value: "delete_media"},
	)

	media, err := p.store.GetMediaByID(ctx, accountID, mediaID)
	if err != nil {
		p.logger.Error(ctx, "failed to get media for deletion", err)
		if errors.Is(err, store.ErrNotFound) {
			return ErrMediaNotFound
		}
		return ErrFailedDelete
	}

	if err := p.store.DeleteMedia(ctx, accountID, mediaID); err != nil {
		p.logger.Error(ctx, "failed to delete media record", err)
		if errors.Is(err, store.ErrNotFound) {
			return ErrMediaNotFound
		}
		return ErrFailedDelete
	}

	if err := p.fileStore.DeleteFile(ctx, media.S3Key); err != nil {
		p.logger.Error(ctx, "failed to delete S3 object", err)
		// Media record is already deleted; log but don't fail
	}

	return nil
}

// List returns paginated media for an account
func (p *MediaProcessor) List(ctx context.Context, accountID uuid.UUID, limit, offset int) ([]store.Media, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "operation", Value: "list_media"},
	)

	media, err := p.store.ListMediaByAccount(ctx, accountID, limit, offset)
	if err != nil {
		p.logger.Error(ctx, "failed to list media", err)
		return nil, ErrFailedUpload
	}
	for i := range media {
		p.PresignIfNeeded(ctx, &media[i])
	}
	return media, nil
}

// PresignIfNeeded rewrites `s3://bucket/key` s3_url values to a time-limited
// presigned HTTPS URL. Uploaded media (which already carry a direct https
// URL) are left alone. Exposed so other processors that return Media rows
// (e.g. posts.GetPostWithPlatformPosts) can apply the same rewrite.
func (p *MediaProcessor) PresignIfNeeded(ctx context.Context, m *store.Media) {
	if p.urlSigner == nil || m == nil || !strings.HasPrefix(m.S3URL, "s3://") {
		return
	}
	signed, err := p.urlSigner.PresignGetURL(ctx, m.S3Key, mediaPresignTTL)
	if err != nil {
		p.logger.Error(ctx, "failed to presign media url", err)
		return
	}
	m.S3URL = signed
}

// GetFile retrieves a file from storage by media ID
// GetFileByKey fetches a file by its storage key without requiring account context.
// Used by the public media endpoint so external platforms can fetch media by URL.
// The key format (account_id/uuid.ext) provides enough entropy to prevent enumeration.
func (p *MediaProcessor) GetFileByKey(ctx context.Context, key string) (io.ReadCloser, string, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "key", Value: key},
		observability.Field{Key: "operation", Value: "get_file_by_key"},
	)

	reader, contentType, err := p.fileStore.GetFile(ctx, key)
	if err != nil {
		p.logger.Error(ctx, "failed to get file from storage by key", err)
		return nil, "", ErrFailedGetFile
	}
	return reader, contentType, nil
}

// publicURL builds a fetchable URL for a stored object key from the configured base.
func (p *MediaProcessor) publicURL(key string) string {
	if p.publicBaseURL == "" {
		return key
	}
	return strings.TrimRight(p.publicBaseURL, "/") + "/" + key
}

func (p *MediaProcessor) GetFile(ctx context.Context, accountID, mediaID uuid.UUID) (io.ReadCloser, string, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "media_id", Value: mediaID.String()},
		observability.Field{Key: "operation", Value: "get_file"},
	)

	media, err := p.store.GetMediaByID(ctx, accountID, mediaID)
	if err != nil {
		p.logger.Error(ctx, "failed to get media for file retrieval", err)
		if errors.Is(err, store.ErrNotFound) {
			return nil, "", ErrMediaNotFound
		}
		return nil, "", ErrFailedGetFile
	}

	reader, contentType, err := p.fileStore.GetFile(ctx, media.S3Key)
	if err != nil {
		p.logger.Error(ctx, "failed to get file from storage", err)
		return nil, "", ErrFailedGetFile
	}

	if contentType == "" {
		contentType = media.ContentType
	}

	return reader, contentType, nil
}
