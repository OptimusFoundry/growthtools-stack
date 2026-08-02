package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// SitePublishTarget represents a site publishing configuration
type SitePublishTarget struct {
	ID          uuid.UUID `db:"id" json:"id"`
	AccountID   uuid.UUID `db:"account_id" json:"account_id"`
	RepoOwner   string    `db:"repo_owner" json:"repo_owner"`
	RepoName    string    `db:"repo_name" json:"repo_name"`
	BaseBranch  string    `db:"base_branch" json:"base_branch"`
	ContentPath string    `db:"content_path" json:"content_path"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

// CreateSitePublishTargetParams represents parameters for creating a site publish target
type CreateSitePublishTargetParams struct {
	AccountID   uuid.UUID
	RepoOwner   string
	RepoName    string
	BaseBranch  string
	ContentPath string
}

const sqlCreateSitePublishTarget = `
INSERT INTO site_publish_targets (account_id, repo_owner, repo_name, base_branch, content_path)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, account_id, repo_owner, repo_name, base_branch, content_path, created_at, updated_at
`

func (s *Store) CreateSitePublishTarget(ctx context.Context, params CreateSitePublishTargetParams) (SitePublishTarget, error) {
	var spt SitePublishTarget
	err := s.db.GetContext(ctx, &spt, sqlCreateSitePublishTarget,
		params.AccountID, params.RepoOwner, params.RepoName, params.BaseBranch, params.ContentPath)
	if err != nil {
		return SitePublishTarget{}, fmt.Errorf("failed to create site publish target: %w", err)
	}
	return spt, nil
}

const sqlGetSitePublishTargetByAccount = `
SELECT id, account_id, repo_owner, repo_name, base_branch, content_path, created_at, updated_at
FROM site_publish_targets
WHERE account_id = $1
`

func (s *Store) GetSitePublishTargetByAccount(ctx context.Context, accountID uuid.UUID) (SitePublishTarget, error) {
	var spt SitePublishTarget
	err := s.db.GetContext(ctx, &spt, sqlGetSitePublishTargetByAccount, accountID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return SitePublishTarget{}, ErrNotFound
		}
		return SitePublishTarget{}, fmt.Errorf("failed to get site publish target: %w", err)
	}
	return spt, nil
}

// UpdateSitePublishTargetParams represents parameters for updating a site publish target
type UpdateSitePublishTargetParams struct {
	RepoOwner   *string
	RepoName    *string
	BaseBranch  *string
	ContentPath *string
}

const sqlUpdateSitePublishTarget = `
UPDATE site_publish_targets
SET repo_owner = COALESCE($2, repo_owner),
    repo_name = COALESCE($3, repo_name),
    base_branch = COALESCE($4, base_branch),
    content_path = COALESCE($5, content_path),
    updated_at = CURRENT_TIMESTAMP
WHERE account_id = $1
RETURNING id, account_id, repo_owner, repo_name, base_branch, content_path, created_at, updated_at
`

func (s *Store) UpdateSitePublishTarget(ctx context.Context, accountID uuid.UUID, params UpdateSitePublishTargetParams) (SitePublishTarget, error) {
	var spt SitePublishTarget
	err := s.db.GetContext(ctx, &spt, sqlUpdateSitePublishTarget,
		accountID, params.RepoOwner, params.RepoName, params.BaseBranch, params.ContentPath)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return SitePublishTarget{}, ErrNotFound
		}
		return SitePublishTarget{}, fmt.Errorf("failed to update site publish target: %w", err)
	}
	return spt, nil
}
