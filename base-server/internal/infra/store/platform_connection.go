package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// CreatePlatformConnectionParams represents parameters for creating a platform connection
type CreatePlatformConnectionParams struct {
	AccountID      uuid.UUID
	Platform       string
	PlatformUserID string
	DisplayName    *string
	AccessToken    string
	RefreshToken   *string
	TokenExpiresAt *time.Time
	Scopes         StringArray
}

const sqlCreatePlatformConnection = `
INSERT INTO platform_connections (account_id, platform, platform_user_id, display_name, access_token, refresh_token, token_expires_at, scopes)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (account_id, platform, platform_user_id)
DO UPDATE SET
    display_name = EXCLUDED.display_name,
    access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    token_expires_at = EXCLUDED.token_expires_at,
    scopes = EXCLUDED.scopes,
    status = 'active',
    connected_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP,
    deleted_at = NULL
RETURNING id, account_id, platform, platform_user_id, display_name, access_token, refresh_token, token_expires_at, scopes, status, connected_at, created_at, updated_at, deleted_at
`

func (s *Store) CreatePlatformConnection(ctx context.Context, params CreatePlatformConnectionParams) (PlatformConnection, error) {
	var pc PlatformConnection
	err := s.db.GetContext(ctx, &pc, sqlCreatePlatformConnection,
		params.AccountID, params.Platform, params.PlatformUserID, params.DisplayName,
		params.AccessToken, params.RefreshToken, params.TokenExpiresAt, params.Scopes)
	if err != nil {
		return PlatformConnection{}, fmt.Errorf("failed to create platform connection: %w", err)
	}
	return pc, nil
}

const sqlGetPlatformConnectionByID = `
SELECT id, account_id, platform, platform_user_id, display_name, access_token, refresh_token, token_expires_at, scopes, status, connected_at, created_at, updated_at, deleted_at
FROM platform_connections
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
`

func (s *Store) GetPlatformConnectionByID(ctx context.Context, accountID, id uuid.UUID) (PlatformConnection, error) {
	var pc PlatformConnection
	err := s.db.GetContext(ctx, &pc, sqlGetPlatformConnectionByID, id, accountID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return PlatformConnection{}, ErrNotFound
		}
		return PlatformConnection{}, fmt.Errorf("failed to get platform connection: %w", err)
	}
	return pc, nil
}

const sqlGetPlatformConnectionByAccountAndPlatform = `
SELECT id, account_id, platform, platform_user_id, display_name, access_token, refresh_token, token_expires_at, scopes, status, connected_at, created_at, updated_at, deleted_at
FROM platform_connections
WHERE account_id = $1 AND platform = $2 AND platform_user_id = $3 AND deleted_at IS NULL
`

func (s *Store) GetPlatformConnectionByAccountAndPlatform(ctx context.Context, accountID uuid.UUID, platform, platformUserID string) (PlatformConnection, error) {
	var pc PlatformConnection
	err := s.db.GetContext(ctx, &pc, sqlGetPlatformConnectionByAccountAndPlatform, accountID, platform, platformUserID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return PlatformConnection{}, ErrNotFound
		}
		return PlatformConnection{}, fmt.Errorf("failed to get platform connection: %w", err)
	}
	return pc, nil
}

const sqlListPlatformConnectionsByAccount = `
SELECT id, account_id, platform, platform_user_id, display_name, access_token, refresh_token, token_expires_at, scopes, status, connected_at, created_at, updated_at, deleted_at
FROM platform_connections
WHERE account_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC
`

func (s *Store) ListPlatformConnectionsByAccount(ctx context.Context, accountID uuid.UUID) ([]PlatformConnection, error) {
	var connections []PlatformConnection
	err := s.db.SelectContext(ctx, &connections, sqlListPlatformConnectionsByAccount, accountID)
	if err != nil {
		return nil, fmt.Errorf("failed to list platform connections: %w", err)
	}
	return connections, nil
}

const sqlUpdatePlatformConnectionTokens = `
UPDATE platform_connections
SET access_token = $3, refresh_token = $4, token_expires_at = $5, status = 'active', updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
`

func (s *Store) UpdatePlatformConnectionTokens(ctx context.Context, accountID, id uuid.UUID, accessToken string, refreshToken *string, expiresAt *time.Time) error {
	res, err := s.db.ExecContext(ctx, sqlUpdatePlatformConnectionTokens, id, accountID, accessToken, refreshToken, expiresAt)
	if err != nil {
		return fmt.Errorf("failed to update platform connection tokens: %w", err)
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

const sqlUpdatePlatformConnectionStatus = `
UPDATE platform_connections
SET status = $3, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
`

func (s *Store) UpdatePlatformConnectionStatus(ctx context.Context, accountID, id uuid.UUID, status string) error {
	res, err := s.db.ExecContext(ctx, sqlUpdatePlatformConnectionStatus, id, accountID, status)
	if err != nil {
		return fmt.Errorf("failed to update platform connection status: %w", err)
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

const sqlDeletePlatformConnection = `
UPDATE platform_connections
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
`

func (s *Store) DeletePlatformConnection(ctx context.Context, accountID, id uuid.UUID) error {
	res, err := s.db.ExecContext(ctx, sqlDeletePlatformConnection, id, accountID)
	if err != nil {
		return fmt.Errorf("failed to delete platform connection: %w", err)
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
