package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// GitHubRepo represents a connected GitHub repository
type GitHubRepo struct {
	ID           uuid.UUID `db:"id" json:"id"`
	ConnectionID uuid.UUID `db:"connection_id" json:"connection_id"`
	// AccountID is the account that owns this repo (resolved via the connection
	// owner → accounts join). Populated by GetGitHubRepoByGitHubID and
	// GetGitHubRepoByOwnerName so the webhook processor can attribute events.
	AccountID     uuid.UUID  `db:"account_id" json:"account_id"`
	GitHubRepoID  int64      `db:"github_repo_id" json:"github_repo_id"`
	Owner         string     `db:"owner" json:"owner"`
	Name          string     `db:"name" json:"name"`
	DefaultBranch *string    `db:"default_branch" json:"default_branch,omitempty"`
	WebhookID     *int64     `db:"webhook_id" json:"webhook_id,omitempty"`
	WebhookSecret string     `db:"webhook_secret" json:"-"`
	Enabled       bool       `db:"enabled" json:"enabled"`
	CreatedAt     time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt     *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}

// ============================================================================
// GitHub Repos
// ============================================================================

const sqlCreateGitHubRepo = `
INSERT INTO github_repos (connection_id, github_repo_id, owner, name, default_branch, webhook_id, webhook_secret)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (connection_id, owner, name) DO UPDATE
  SET github_repo_id  = EXCLUDED.github_repo_id,
      default_branch  = EXCLUDED.default_branch,
      webhook_id      = EXCLUDED.webhook_id,
      webhook_secret  = EXCLUDED.webhook_secret,
      updated_at      = NOW(),
      deleted_at      = NULL
RETURNING id, connection_id, github_repo_id, owner, name, default_branch, webhook_id, webhook_secret, enabled, created_at, updated_at, deleted_at
`

func (s *Store) CreateGitHubRepo(
	ctx context.Context,
	connectionID uuid.UUID,
	ghRepoID int64,
	owner, name string,
	defaultBranch *string,
	webhookID *int64,
	webhookSecret string,
) (GitHubRepo, error) {
	var repo GitHubRepo
	err := s.db.GetContext(ctx, &repo, sqlCreateGitHubRepo,
		connectionID, ghRepoID, owner, name, defaultBranch, webhookID, webhookSecret)
	if err != nil {
		return GitHubRepo{}, fmt.Errorf("failed to create github repo: %w", err)
	}
	return repo, nil
}

const sqlListGitHubReposByConnection = `
SELECT id, connection_id, github_repo_id, owner, name, default_branch, webhook_id, webhook_secret, enabled, created_at, updated_at, deleted_at
FROM github_repos
WHERE connection_id = $1 AND deleted_at IS NULL
ORDER BY owner, name
`

func (s *Store) ListGitHubReposByConnection(ctx context.Context, connectionID uuid.UUID) ([]GitHubRepo, error) {
	repos := make([]GitHubRepo, 0)
	err := s.db.SelectContext(ctx, &repos, sqlListGitHubReposByConnection, connectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to list github repos: %w", err)
	}
	return repos, nil
}

const sqlGetGitHubRepoByConnectionAndName = `
SELECT id, connection_id, github_repo_id, owner, name, default_branch, webhook_id, webhook_secret, enabled, created_at, updated_at, deleted_at
FROM github_repos
WHERE connection_id = $1 AND owner = $2 AND name = $3 AND deleted_at IS NULL
`

func (s *Store) GetGitHubRepoByConnectionAndName(ctx context.Context, connectionID uuid.UUID, owner, name string) (GitHubRepo, error) {
	var repo GitHubRepo
	err := s.db.GetContext(ctx, &repo, sqlGetGitHubRepoByConnectionAndName, connectionID, owner, name)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return GitHubRepo{}, ErrNotFound
		}
		return GitHubRepo{}, fmt.Errorf("failed to get github repo: %w", err)
	}
	return repo, nil
}

// GetGitHubRepoByGitHubID finds a connected repo by the github.com numeric id.
// Webhook payloads carry repository.id so we can look up the repo + its
// per-hook secret without trusting any other field first.
// The query joins github_connections → accounts to surface the account_id so
// the webhook processor can attribute events without an extra round-trip.
const sqlGetGitHubRepoByGitHubID = `
SELECT r.id, r.connection_id, a.id AS account_id, r.github_repo_id, r.owner, r.name,
       r.default_branch, r.webhook_id, r.webhook_secret, r.enabled,
       r.created_at, r.updated_at, r.deleted_at
FROM github_repos r
JOIN github_connections c ON c.id = r.connection_id AND c.deleted_at IS NULL
JOIN accounts a ON a.owner_user_id = c.user_id AND a.deleted_at IS NULL
WHERE r.github_repo_id = $1 AND r.deleted_at IS NULL
`

func (s *Store) GetGitHubRepoByGitHubID(ctx context.Context, githubRepoID int64) (GitHubRepo, error) {
	var repo GitHubRepo
	err := s.db.GetContext(ctx, &repo, sqlGetGitHubRepoByGitHubID, githubRepoID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return GitHubRepo{}, ErrNotFound
		}
		return GitHubRepo{}, fmt.Errorf("failed to get github repo by github id: %w", err)
	}
	return repo, nil
}

// GetGitHubRepoByOwnerName finds a repo by owner/name across all connections.
// Used as a fallback when github_repo_id hasn't been backfilled yet (still 0).
// Joins to surface account_id for event attribution.
const sqlGetGitHubRepoByOwnerName = `
SELECT r.id, r.connection_id, a.id AS account_id, r.github_repo_id, r.owner, r.name,
       r.default_branch, r.webhook_id, r.webhook_secret, r.enabled,
       r.created_at, r.updated_at, r.deleted_at
FROM github_repos r
JOIN github_connections c ON c.id = r.connection_id AND c.deleted_at IS NULL
JOIN accounts a ON a.owner_user_id = c.user_id AND a.deleted_at IS NULL
WHERE r.owner = $1 AND r.name = $2 AND r.deleted_at IS NULL
`

func (s *Store) GetGitHubRepoByOwnerName(ctx context.Context, owner, name string) (GitHubRepo, error) {
	var repo GitHubRepo
	err := s.db.GetContext(ctx, &repo, sqlGetGitHubRepoByOwnerName, owner, name)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return GitHubRepo{}, ErrNotFound
		}
		return GitHubRepo{}, fmt.Errorf("failed to get github repo by owner/name: %w", err)
	}
	return repo, nil
}

// UpdateGitHubRepoID backfills the github.com numeric id on a repo row.
// Called the first time a webhook delivers payload.repository.id for a repo
// that was stored with github_repo_id=0 (we skip the API call on connect).
const sqlUpdateGitHubRepoID = `
UPDATE github_repos
SET github_repo_id = $2, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL
`

func (s *Store) UpdateGitHubRepoID(ctx context.Context, repoID uuid.UUID, githubRepoID int64) error {
	res, err := s.db.ExecContext(ctx, sqlUpdateGitHubRepoID, repoID, githubRepoID)
	if err != nil {
		return fmt.Errorf("failed to update github repo id: %w", err)
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

const sqlSoftDeleteGitHubRepo = `
UPDATE github_repos
SET deleted_at = NOW(), updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL
`

func (s *Store) SoftDeleteGitHubRepo(ctx context.Context, repoID uuid.UUID) error {
	res, err := s.db.ExecContext(ctx, sqlSoftDeleteGitHubRepo, repoID)
	if err != nil {
		return fmt.Errorf("failed to soft-delete github repo: %w", err)
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
