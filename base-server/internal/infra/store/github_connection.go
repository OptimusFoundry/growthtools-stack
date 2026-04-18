package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// GitHubConnection represents a user's GitHub OAuth connection
type GitHubConnection struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	UserID         uuid.UUID  `db:"user_id" json:"user_id"`
	GitHubUserID   int64      `db:"github_user_id" json:"github_user_id"`
	GitHubUsername string     `db:"github_username" json:"github_username"`
	AccessToken    string     `db:"access_token" json:"-"`
	Scope          string     `db:"scope" json:"scope"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt      *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}

// ============================================================================
// GitHub Connections
// ============================================================================

const sqlUpsertGitHubConnection = `
INSERT INTO github_connections (user_id, github_user_id, github_username, access_token, scope)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id) DO UPDATE
  SET github_user_id   = EXCLUDED.github_user_id,
      github_username  = EXCLUDED.github_username,
      access_token     = EXCLUDED.access_token,
      scope            = EXCLUDED.scope,
      updated_at       = NOW(),
      deleted_at       = NULL
RETURNING id, user_id, github_user_id, github_username, access_token, scope, created_at, updated_at, deleted_at
`

func (s *Store) CreateOrUpdateGitHubConnection(
	ctx context.Context,
	userID uuid.UUID,
	githubUserID int64,
	username, token, scope string,
) (GitHubConnection, error) {
	var conn GitHubConnection
	err := s.db.GetContext(ctx, &conn, sqlUpsertGitHubConnection,
		userID, githubUserID, username, token, scope)
	if err != nil {
		return GitHubConnection{}, fmt.Errorf("failed to upsert github connection: %w", err)
	}
	return conn, nil
}

const sqlGetGitHubConnectionByUserID = `
SELECT id, user_id, github_user_id, github_username, access_token, scope, created_at, updated_at, deleted_at
FROM github_connections
WHERE user_id = $1 AND deleted_at IS NULL
`

func (s *Store) GetGitHubConnectionByUserID(ctx context.Context, userID uuid.UUID) (GitHubConnection, error) {
	var conn GitHubConnection
	err := s.db.GetContext(ctx, &conn, sqlGetGitHubConnectionByUserID, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return GitHubConnection{}, ErrNotFound
		}
		return GitHubConnection{}, fmt.Errorf("failed to get github connection: %w", err)
	}
	return conn, nil
}

const sqlGetGitHubConnectionByID = `
SELECT id, user_id, github_user_id, github_username, access_token, scope, created_at, updated_at, deleted_at
FROM github_connections
WHERE id = $1 AND deleted_at IS NULL
`

// GetGitHubConnectionByID looks up a connection by its primary key, which is
// what github_repos.connection_id points at — useful in the webhook path
// where we have a repo row but not a user id.
func (s *Store) GetGitHubConnectionByID(ctx context.Context, id uuid.UUID) (GitHubConnection, error) {
	var conn GitHubConnection
	err := s.db.GetContext(ctx, &conn, sqlGetGitHubConnectionByID, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return GitHubConnection{}, ErrNotFound
		}
		return GitHubConnection{}, fmt.Errorf("failed to get github connection by id: %w", err)
	}
	return conn, nil
}

const sqlSoftDeleteGitHubConnection = `
UPDATE github_connections
SET deleted_at = NOW(), updated_at = NOW()
WHERE user_id = $1 AND deleted_at IS NULL
`

const sqlSoftDeleteReposByConnection = `
UPDATE github_repos
SET deleted_at = NOW(), updated_at = NOW()
WHERE connection_id = $1 AND deleted_at IS NULL
`

func (s *Store) SoftDeleteGitHubConnection(ctx context.Context, userID uuid.UUID) error {
	// First find the connection ID so we can cascade to repos
	conn, err := s.GetGitHubConnectionByUserID(ctx, userID)
	if err != nil {
		return err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	if _, err = tx.ExecContext(ctx, sqlSoftDeleteReposByConnection, conn.ID); err != nil {
		return fmt.Errorf("failed to soft-delete github repos: %w", err)
	}

	res, err := tx.ExecContext(ctx, sqlSoftDeleteGitHubConnection, userID)
	if err != nil {
		return fmt.Errorf("failed to soft-delete github connection: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return ErrNotFound
	}

	return tx.Commit()
}
