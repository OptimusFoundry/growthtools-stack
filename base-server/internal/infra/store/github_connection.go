package store

import (
	"context"
	"database/sql"
	"encoding/json"
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

// GitHubRepo represents a connected GitHub repository
type GitHubRepo struct {
	ID            uuid.UUID  `db:"id" json:"id"`
	ConnectionID  uuid.UUID  `db:"connection_id" json:"connection_id"`
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

// GitHubCommit represents a persisted GitHub commit
type GitHubCommit struct {
	ID                 uuid.UUID        `db:"id" json:"id"`
	RepoID             uuid.UUID        `db:"repo_id" json:"repo_id"`
	SHA                string           `db:"sha" json:"sha"`
	AuthorName         *string          `db:"author_name" json:"author_name,omitempty"`
	AuthorEmail        *string          `db:"author_email" json:"author_email,omitempty"`
	Message            string           `db:"message" json:"message"`
	Branch             *string          `db:"branch" json:"branch,omitempty"`
	CommitURL          *string          `db:"commit_url" json:"commit_url,omitempty"`
	PushedAt           time.Time        `db:"pushed_at" json:"pushed_at"`
	Payload            *json.RawMessage `db:"payload" json:"payload,omitempty"`
	PostID             *uuid.UUID       `db:"post_id" json:"post_id,omitempty"`
	CaptureOutput      *json.RawMessage `db:"capture_output" json:"capture_output,omitempty"`
	CaptureRequestedAt *time.Time       `db:"capture_requested_at" json:"capture_requested_at,omitempty"`
	SkippedReason      *string          `db:"skipped_reason" json:"skipped_reason,omitempty"`
	ProcessedAt        *time.Time       `db:"processed_at" json:"processed_at,omitempty"`
	CreatedAt          time.Time        `db:"created_at" json:"created_at"`
	// Repo context — populated by ListGitHubCommitsByConnection so the UI can
	// group / label without a second round-trip.
	RepoOwner *string `db:"repo_owner" json:"repo_owner,omitempty"`
	RepoName  *string `db:"repo_name" json:"repo_name,omitempty"`
}

// GitHubCommitSummary is the lightweight row returned by list endpoints. It
// drops the heavy payload + full capture_output blob and exposes just the
// two fields the UI needs to render a status badge — a capture artifact count
// and the capture error string if the worker failed.
type GitHubCommitSummary struct {
	ID                   uuid.UUID  `db:"id" json:"id"`
	RepoID               uuid.UUID  `db:"repo_id" json:"repo_id"`
	SHA                  string     `db:"sha" json:"sha"`
	AuthorName           *string    `db:"author_name" json:"author_name,omitempty"`
	AuthorEmail          *string    `db:"author_email" json:"author_email,omitempty"`
	Message              string     `db:"message" json:"message"`
	Branch               *string    `db:"branch" json:"branch,omitempty"`
	CommitURL            *string    `db:"commit_url" json:"commit_url,omitempty"`
	PushedAt             time.Time  `db:"pushed_at" json:"pushed_at"`
	PostID               *uuid.UUID `db:"post_id" json:"post_id,omitempty"`
	CaptureRequestedAt   *time.Time `db:"capture_requested_at" json:"capture_requested_at,omitempty"`
	SkippedReason        *string    `db:"skipped_reason" json:"skipped_reason,omitempty"`
	ProcessedAt          *time.Time `db:"processed_at" json:"processed_at,omitempty"`
	CreatedAt            time.Time  `db:"created_at" json:"created_at"`
	RepoOwner            *string    `db:"repo_owner" json:"repo_owner,omitempty"`
	RepoName             *string    `db:"repo_name" json:"repo_name,omitempty"`
	CaptureArtifactCount int        `db:"capture_artifact_count" json:"capture_artifact_count"`
	CaptureError         *string    `db:"capture_error" json:"capture_error,omitempty"`
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

// ============================================================================
// GitHub Commits
// ============================================================================

// InsertGitHubCommit upserts a commit. Returns the row and a bool that is
// true when the insert produced a new row (false means the commit already
// existed — caller shouldn't re-trigger the capture pipeline on duplicates).
const sqlInsertGitHubCommit = `
INSERT INTO github_commits (repo_id, sha, author_name, author_email, message, branch, commit_url, pushed_at, payload)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (repo_id, sha) DO NOTHING
RETURNING id, repo_id, sha, author_name, author_email, message, branch, commit_url, pushed_at, payload, post_id, capture_output, capture_requested_at, skipped_reason, processed_at, created_at
`

const sqlGetGitHubCommitByRepoSHA = `
SELECT id, repo_id, sha, author_name, author_email, message, branch, commit_url, pushed_at, payload, post_id, capture_output, capture_requested_at, skipped_reason, processed_at, created_at
FROM github_commits
WHERE repo_id = $1 AND sha = $2
`

func (s *Store) InsertGitHubCommit(
	ctx context.Context,
	repoID uuid.UUID,
	sha string,
	authorName, authorEmail *string,
	message string,
	branch, commitURL *string,
	pushedAt time.Time,
	payload *json.RawMessage,
) (GitHubCommit, bool, error) {
	var commit GitHubCommit
	err := s.db.GetContext(ctx, &commit, sqlInsertGitHubCommit,
		repoID, sha, authorName, authorEmail, message, branch, commitURL, pushedAt, payload)
	if err == nil {
		return commit, true, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return GitHubCommit{}, false, fmt.Errorf("failed to insert github commit: %w", err)
	}
	// ON CONFLICT DO NOTHING returned no row — load the existing one.
	err = s.db.GetContext(ctx, &commit, sqlGetGitHubCommitByRepoSHA, repoID, sha)
	if err != nil {
		return GitHubCommit{}, false, fmt.Errorf("failed to load existing github commit: %w", err)
	}
	return commit, false, nil
}

const sqlUpdateGitHubCommitCapture = `
UPDATE github_commits
SET capture_output = $2, processed_at = NOW()
WHERE id = $1
`

// UpdateGitHubCommitCapture stores the raw capture-worker response and marks
// the commit as processed, regardless of success/failure.
func (s *Store) UpdateGitHubCommitCapture(ctx context.Context, commitID uuid.UUID, captureOutput json.RawMessage) error {
	res, err := s.db.ExecContext(ctx, sqlUpdateGitHubCommitCapture, commitID, captureOutput)
	if err != nil {
		return fmt.Errorf("failed to update github commit capture: %w", err)
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

// GetGitHubCommitByRepoSHA looks up a stored commit by its repo + SHA.
// Used by the workflow_run webhook path to find the commit we stored on the
// prior push delivery.
func (s *Store) GetGitHubCommitByRepoSHA(ctx context.Context, repoID uuid.UUID, sha string) (GitHubCommit, error) {
	var commit GitHubCommit
	err := s.db.GetContext(ctx, &commit, sqlGetGitHubCommitByRepoSHA, repoID, sha)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return GitHubCommit{}, ErrNotFound
		}
		return GitHubCommit{}, fmt.Errorf("failed to get github commit: %w", err)
	}
	return commit, nil
}

// MarkGitHubCommitCaptureRequested sets capture_requested_at atomically, but
// ONLY if it was null. Returns (true, nil) when this call was the one that
// set the timestamp — the caller should enqueue the Kafka request. Returns
// (false, nil) when some other delivery already did it — caller should skip.
const sqlMarkGitHubCommitCaptureRequested = `
UPDATE github_commits
SET capture_requested_at = NOW()
WHERE id = $1 AND capture_requested_at IS NULL
`

func (s *Store) MarkGitHubCommitCaptureRequested(ctx context.Context, commitID uuid.UUID) (bool, error) {
	res, err := s.db.ExecContext(ctx, sqlMarkGitHubCommitCaptureRequested, commitID)
	if err != nil {
		return false, fmt.Errorf("failed to mark github commit capture requested: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to get rows affected: %w", err)
	}
	return rows > 0, nil
}

const sqlMarkGitHubCommitSkipped = `
UPDATE github_commits
SET skipped_reason = $2, processed_at = NOW()
WHERE id = $1
`

// MarkGitHubCommitSkipped records the classifier's verdict on a commit that
// will not be captured. processed_at is stamped so the row looks "finished"
// in the UI alongside commits that did go through the worker.
func (s *Store) MarkGitHubCommitSkipped(ctx context.Context, commitID uuid.UUID, reason string) error {
	res, err := s.db.ExecContext(ctx, sqlMarkGitHubCommitSkipped, commitID, reason)
	if err != nil {
		return fmt.Errorf("failed to mark github commit skipped: %w", err)
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

const sqlUpdateGitHubCommitPostID = `
UPDATE github_commits
SET post_id = $2
WHERE id = $1
`

// UpdateGitHubCommitPostID links a commit to the post that was drafted from it.
func (s *Store) UpdateGitHubCommitPostID(ctx context.Context, commitID, postID uuid.UUID) error {
	res, err := s.db.ExecContext(ctx, sqlUpdateGitHubCommitPostID, commitID, postID)
	if err != nil {
		return fmt.Errorf("failed to update github commit post_id: %w", err)
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

// GitHubCommitForDraft is the commit + owning account + repo context a
// background worker needs to generate a draft post. No user scope — the
// worker fires on a Kafka event and doesn't run under a user session.
type GitHubCommitForDraft struct {
	ID            uuid.UUID        `db:"id"`
	SHA           string           `db:"sha"`
	Message       string           `db:"message"`
	Branch        *string          `db:"branch"`
	PostID        *uuid.UUID       `db:"post_id"`
	CaptureOutput *json.RawMessage `db:"capture_output"`
	AccountID     uuid.UUID        `db:"account_id"`
	RepoOwner     string           `db:"repo_owner"`
	RepoName      string           `db:"repo_name"`
}

const sqlGetGitHubCommitForDraft = `
SELECT gc.id, gc.sha, gc.message, gc.branch, gc.post_id, gc.capture_output,
       a.id AS account_id,
       gr.owner AS repo_owner, gr.name AS repo_name
FROM github_commits gc
JOIN github_repos gr ON gr.id = gc.repo_id AND gr.deleted_at IS NULL
JOIN github_connections c ON c.id = gr.connection_id AND c.deleted_at IS NULL
JOIN accounts a ON a.owner_user_id = c.user_id AND a.deleted_at IS NULL
WHERE gc.id = $1
`

// GetGitHubCommitForDraft resolves the owning account and repo metadata for a
// commit id. Used by the draft-generator worker which has only a commit id.
func (s *Store) GetGitHubCommitForDraft(ctx context.Context, commitID uuid.UUID) (GitHubCommitForDraft, error) {
	var row GitHubCommitForDraft
	err := s.db.GetContext(ctx, &row, sqlGetGitHubCommitForDraft, commitID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return GitHubCommitForDraft{}, ErrNotFound
		}
		return GitHubCommitForDraft{}, fmt.Errorf("failed to get github commit for draft: %w", err)
	}
	return row, nil
}

const sqlListGitHubCommitsByConnection = `
SELECT gc.id, gc.repo_id, gc.sha, gc.author_name, gc.author_email, gc.message, gc.branch, gc.commit_url, gc.pushed_at, gc.post_id, gc.capture_requested_at, gc.skipped_reason, gc.processed_at, gc.created_at,
       gr.owner AS repo_owner, gr.name AS repo_name,
       COALESCE(jsonb_array_length(gc.capture_output->'uploaded'), 0) AS capture_artifact_count,
       gc.capture_output->>'error' AS capture_error
FROM github_commits gc
JOIN github_repos gr ON gr.id = gc.repo_id
WHERE gr.connection_id = $1 AND gr.deleted_at IS NULL
ORDER BY gc.pushed_at DESC
LIMIT $2 OFFSET $3
`

func (s *Store) ListGitHubCommitsByConnection(ctx context.Context, connectionID uuid.UUID, limit, offset int) ([]GitHubCommitSummary, error) {
	if limit <= 0 {
		limit = 50
	}
	commits := make([]GitHubCommitSummary, 0)
	err := s.db.SelectContext(ctx, &commits, sqlListGitHubCommitsByConnection, connectionID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list github commits: %w", err)
	}
	return commits, nil
}

// GetGitHubCommitByIDForUser looks up a single commit by id and verifies that
// it belongs to a repo under the given user's connection. Used by the
// authenticated details endpoint.
const sqlGetGitHubCommitByIDForUser = `
SELECT gc.id, gc.repo_id, gc.sha, gc.author_name, gc.author_email, gc.message, gc.branch, gc.commit_url, gc.pushed_at, gc.payload, gc.post_id, gc.capture_output, gc.capture_requested_at, gc.skipped_reason, gc.processed_at, gc.created_at,
       gr.owner AS repo_owner, gr.name AS repo_name
FROM github_commits gc
JOIN github_repos gr ON gr.id = gc.repo_id
JOIN github_connections conn ON conn.id = gr.connection_id
WHERE gc.id = $1
  AND conn.user_id = $2
  AND gr.deleted_at IS NULL
  AND conn.deleted_at IS NULL
`

func (s *Store) GetGitHubCommitByIDForUser(ctx context.Context, userID, commitID uuid.UUID) (GitHubCommit, error) {
	var commit GitHubCommit
	err := s.db.GetContext(ctx, &commit, sqlGetGitHubCommitByIDForUser, commitID, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return GitHubCommit{}, ErrNotFound
		}
		return GitHubCommit{}, fmt.Errorf("failed to get github commit by id: %w", err)
	}
	return commit, nil
}

const sqlCountGitHubCommitsByConnection = `
SELECT COUNT(*)
FROM github_commits gc
JOIN github_repos gr ON gr.id = gc.repo_id
WHERE gr.connection_id = $1 AND gr.deleted_at IS NULL
`

func (s *Store) CountGitHubCommitsByConnection(ctx context.Context, connectionID uuid.UUID) (int, error) {
	var total int
	if err := s.db.GetContext(ctx, &total, sqlCountGitHubCommitsByConnection, connectionID); err != nil {
		return 0, fmt.Errorf("failed to count github commits: %w", err)
	}
	return total, nil
}
