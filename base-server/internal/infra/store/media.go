package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
)

// CreateMediaParams represents parameters for creating a media record
type CreateMediaParams struct {
	AccountID   uuid.UUID
	Filename    string
	ContentType string
	S3Key       string
	S3URL       string
	SizeBytes   int64
	Width       *int
	Height      *int
	AltText     *string
	Source      string
}

const sqlCreateMedia = `
INSERT INTO media (account_id, filename, content_type, s3_key, s3_url, size_bytes, width, height, alt_text, source)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING id, account_id, filename, content_type, s3_key, s3_url, size_bytes, width, height, alt_text, source, created_at, updated_at, deleted_at
`

func (s *Store) CreateMedia(ctx context.Context, params CreateMediaParams) (Media, error) {
	var media Media
	err := s.db.GetContext(ctx, &media, sqlCreateMedia,
		params.AccountID, params.Filename, params.ContentType,
		params.S3Key, params.S3URL, params.SizeBytes,
		params.Width, params.Height, params.AltText, params.Source)
	if err != nil {
		return Media{}, fmt.Errorf("failed to create media: %w", err)
	}
	return media, nil
}

const sqlGetMediaByID = `
SELECT id, account_id, filename, content_type, s3_key, s3_url, size_bytes, width, height, alt_text, source, created_at, updated_at, deleted_at
FROM media
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
`

func (s *Store) GetMediaByID(ctx context.Context, accountID, id uuid.UUID) (Media, error) {
	var media Media
	err := s.db.GetContext(ctx, &media, sqlGetMediaByID, id, accountID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Media{}, ErrNotFound
		}
		return Media{}, fmt.Errorf("failed to get media: %w", err)
	}
	return media, nil
}

const sqlListMediaByAccount = `
SELECT id, account_id, filename, content_type, s3_key, s3_url, size_bytes, width, height, alt_text, source, created_at, updated_at, deleted_at
FROM media
WHERE account_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2 OFFSET $3
`

func (s *Store) ListMediaByAccount(ctx context.Context, accountID uuid.UUID, limit, offset int) ([]Media, error) {
	if limit <= 0 {
		limit = 20
	}
	var items []Media
	err := s.db.SelectContext(ctx, &items, sqlListMediaByAccount, accountID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list media: %w", err)
	}
	return items, nil
}

const sqlCountMediaByAccount = `
SELECT COUNT(*) FROM media WHERE account_id = $1 AND deleted_at IS NULL
`

func (s *Store) CountMediaByAccount(ctx context.Context, accountID uuid.UUID) (int, error) {
	var count int
	err := s.db.GetContext(ctx, &count, sqlCountMediaByAccount, accountID)
	if err != nil {
		return 0, fmt.Errorf("failed to count media: %w", err)
	}
	return count, nil
}

const sqlGetMediaByIDs = `
SELECT id, account_id, filename, content_type, s3_key, s3_url, size_bytes, width, height, alt_text, source, created_at, updated_at, deleted_at
FROM media
WHERE id = ANY($1) AND deleted_at IS NULL
`

func (s *Store) GetMediaByIDs(ctx context.Context, ids []uuid.UUID) ([]Media, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var items []Media
	err := s.db.SelectContext(ctx, &items, sqlGetMediaByIDs, UUIDArray(ids))
	if err != nil {
		return nil, fmt.Errorf("failed to get media by ids: %w", err)
	}
	return items, nil
}

const sqlDeleteMedia = `
UPDATE media
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
`

func (s *Store) DeleteMedia(ctx context.Context, accountID, id uuid.UUID) error {
	res, err := s.db.ExecContext(ctx, sqlDeleteMedia, id, accountID)
	if err != nil {
		return fmt.Errorf("failed to delete media: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}
