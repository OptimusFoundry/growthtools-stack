package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

import (
	"context"
	"errors"
	"io"
	"strings"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

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
	store     MediaStore
	fileStore FileStore
	logger    *observability.Logger
}

func New(store MediaStore, fileStore FileStore, logger *observability.Logger) MediaProcessor {
	return MediaProcessor{
		store:     store,
		fileStore: fileStore,
		logger:    logger,
	}
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

	s3URL, err := p.fileStore.UploadFile(ctx, key, data, contentType)
	if err != nil {
		p.logger.Error(ctx, "failed to upload file to S3", err)
		return store.Media{}, ErrFailedUpload
	}

	params := store.CreateMediaParams{
		AccountID:   accountID,
		Filename:    filename,
		ContentType: contentType,
		S3Key:       key,
		S3URL:       s3URL,
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
	return media, nil
}

// GetFile retrieves a file from storage by media ID
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
