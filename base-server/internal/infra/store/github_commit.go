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
	// PostDeleted is true when PostID references a soft-deleted post.
	// See GitHubCommitSummary.PostDeleted for the why.
	PostDeleted        bool             `db:"post_deleted" json:"post_deleted"`
	BlogPostID         *uuid.UUID       `db:"blog_post_id" json:"blog_post_id,omitempty"`
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
	// PostDeleted is true only when PostID is set AND the referenced post
	// row has been soft-deleted. Lets the UI distinguish a deleted draft
	// (show a "Post deleted" badge) from a commit that simply hasn't been
	// drafted yet (PostID still null).
	PostDeleted          bool       `db:"post_deleted" json:"post_deleted"`
	CaptureRequestedAt   *time.Time `db:"capture_requested_at" json:"capture_requested_at,omitempty"`
	SkippedReason        *string    `db:"skipped_reason" json:"skipped_reason,omitempty"`
	ProcessedAt          *time.Time `db:"processed_at" json:"processed_at,omitempty"`
	CreatedAt            time.Time  `db:"created_at" json:"created_at"`
	RepoOwner            *string    `db:"repo_owner" json:"repo_owner,omitempty"`
	RepoName             *string    `db:"repo_name" json:"repo_name,omitempty"`
	CaptureArtifactCount int        `db:"capture_artifact_count" json:"capture_artifact_count"`
	CaptureError         *string    `db:"capture_error" json:"capture_error,omitempty"`
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
RETURNING id, repo_id, sha, author_name, author_email, message, branch, commit_url, pushed_at, payload, post_id, FALSE AS post_deleted, blog_post_id, capture_output, capture_requested_at, skipped_reason, processed_at, created_at
`

// sqlGetGitHubCommitByRepoSHA joins posts so post_deleted reflects whether
// the linked draft has been soft-deleted. NULL post_id (never drafted)
// produces post_deleted=false, so the UI's "Post deleted" branch only
// trips when a draft was created and later removed.
const sqlGetGitHubCommitByRepoSHA = `
SELECT gc.id, gc.repo_id, gc.sha, gc.author_name, gc.author_email, gc.message, gc.branch, gc.commit_url, gc.pushed_at, gc.payload, gc.post_id,
       (gc.post_id IS NOT NULL AND p.deleted_at IS NOT NULL) AS post_deleted,
       gc.blog_post_id,
       gc.capture_output, gc.capture_requested_at, gc.skipped_reason, gc.processed_at, gc.created_at
FROM github_commits gc
LEFT JOIN posts p ON p.id = gc.post_id
WHERE gc.repo_id = $1 AND gc.sha = $2
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

// GitHubCommitForBlog is the commit + owning account + repo context + OAuth
// token a background worker needs to generate a blog post. Includes the
// connection's access token because the blog generator re-fetches the full
// diff from GitHub — the one stored on the commit at webhook time is only the
// message and metadata.
type GitHubCommitForBlog struct {
	ID                    uuid.UUID        `db:"id"`
	SHA                   string           `db:"sha"`
	Message               string           `db:"message"`
	Branch                *string          `db:"branch"`
	BlogPostID            *uuid.UUID       `db:"blog_post_id"`
	CaptureOutput         *json.RawMessage `db:"capture_output"`
	AccountID             uuid.UUID        `db:"account_id"`
	RepoOwner             string           `db:"repo_owner"`
	RepoName              string           `db:"repo_name"`
	ConnectionAccessToken string           `db:"connection_access_token"`
}

const sqlGetGitHubCommitForBlog = `
SELECT gc.id, gc.sha, gc.message, gc.branch, gc.blog_post_id, gc.capture_output,
       a.id AS account_id,
       gr.owner AS repo_owner, gr.name AS repo_name,
       c.access_token AS connection_access_token
FROM github_commits gc
JOIN github_repos gr ON gr.id = gc.repo_id AND gr.deleted_at IS NULL
JOIN github_connections c ON c.id = gr.connection_id AND c.deleted_at IS NULL
JOIN accounts a ON a.owner_user_id = c.user_id AND a.deleted_at IS NULL
WHERE gc.id = $1
`

// GetGitHubCommitForBlog resolves the account, repo metadata, and OAuth token
// needed to generate a blog post from a commit id. Used by the blog-generator
// worker which has only a commit id.
func (s *Store) GetGitHubCommitForBlog(ctx context.Context, commitID uuid.UUID) (GitHubCommitForBlog, error) {
	var row GitHubCommitForBlog
	err := s.db.GetContext(ctx, &row, sqlGetGitHubCommitForBlog, commitID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return GitHubCommitForBlog{}, ErrNotFound
		}
		return GitHubCommitForBlog{}, fmt.Errorf("failed to get github commit for blog: %w", err)
	}
	return row, nil
}

const sqlUpdateGitHubCommitBlogPostID = `
UPDATE github_commits
SET blog_post_id = $2
WHERE id = $1
`

// UpdateGitHubCommitBlogPostID links a commit to the blog post that was
// generated from it. Mirrors UpdateGitHubCommitPostID.
func (s *Store) UpdateGitHubCommitBlogPostID(ctx context.Context, commitID, blogPostID uuid.UUID) error {
	res, err := s.db.ExecContext(ctx, sqlUpdateGitHubCommitBlogPostID, commitID, blogPostID)
	if err != nil {
		return fmt.Errorf("failed to update github commit blog_post_id: %w", err)
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

const sqlListGitHubCommitsByConnection = `
SELECT gc.id, gc.repo_id, gc.sha, gc.author_name, gc.author_email, gc.message, gc.branch, gc.commit_url, gc.pushed_at, gc.post_id,
       (gc.post_id IS NOT NULL AND p.deleted_at IS NOT NULL) AS post_deleted,
       gc.capture_requested_at, gc.skipped_reason, gc.processed_at, gc.created_at,
       gr.owner AS repo_owner, gr.name AS repo_name,
       COALESCE(jsonb_array_length(gc.capture_output->'uploaded'), 0) AS capture_artifact_count,
       gc.capture_output->>'error' AS capture_error
FROM github_commits gc
JOIN github_repos gr ON gr.id = gc.repo_id
LEFT JOIN posts p ON p.id = gc.post_id
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
SELECT gc.id, gc.repo_id, gc.sha, gc.author_name, gc.author_email, gc.message, gc.branch, gc.commit_url, gc.pushed_at, gc.payload, gc.post_id,
       (gc.post_id IS NOT NULL AND p.deleted_at IS NOT NULL) AS post_deleted,
       gc.blog_post_id,
       gc.capture_output, gc.capture_requested_at, gc.skipped_reason, gc.processed_at, gc.created_at,
       gr.owner AS repo_owner, gr.name AS repo_name
FROM github_commits gc
JOIN github_repos gr ON gr.id = gc.repo_id
JOIN github_connections conn ON conn.id = gr.connection_id
LEFT JOIN posts p ON p.id = gc.post_id
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
