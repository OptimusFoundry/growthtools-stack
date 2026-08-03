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

// ShowcaseJob represents a persisted showcase_jobs row.
type ShowcaseJob struct {
	ID            uuid.UUID        `db:"id" json:"id"`
	AccountID     uuid.UUID        `db:"account_id" json:"account_id"`
	Brief         string           `db:"brief" json:"brief"`
	ComponentName string           `db:"component_name" json:"component_name"`
	StoryIDs      StringArray      `db:"story_ids" json:"story_ids"`
	Status        string           `db:"status" json:"status"`
	Error         *string          `db:"error" json:"error,omitempty"`
	PostID        *uuid.UUID       `db:"post_id" json:"post_id,omitempty"`
	CaptureOutput *json.RawMessage `db:"capture_output" json:"capture_output,omitempty"`
	CreatedAt     time.Time        `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time        `db:"updated_at" json:"updated_at"`
	DeletedAt     *time.Time       `db:"deleted_at" json:"deleted_at,omitempty"`
}

// ShowcaseJobForDraft is the lightweight projection used by draft generation.
type ShowcaseJobForDraft struct {
	ID            uuid.UUID        `db:"id" json:"id"`
	Brief         string           `db:"brief" json:"brief"`
	ComponentName string           `db:"component_name" json:"component_name"`
	Status        string           `db:"status" json:"status"`
	PostID        *uuid.UUID       `db:"post_id" json:"post_id,omitempty"`
	CaptureOutput *json.RawMessage `db:"capture_output" json:"capture_output,omitempty"`
	AccountID     uuid.UUID        `db:"account_id" json:"account_id"`
}

// CreateShowcaseJobParams represents parameters for creating a showcase job.
type CreateShowcaseJobParams struct {
	AccountID     uuid.UUID
	Brief         string
	ComponentName string
	StoryIDs      []string
}

// ============================================================================
// Showcase Jobs
// ============================================================================

const sqlCreateShowcaseJob = `
INSERT INTO showcase_jobs (account_id, brief, component_name, story_ids)
VALUES ($1, $2, $3, $4)
RETURNING id, account_id, brief, component_name, story_ids, status, error, post_id, capture_output, created_at, updated_at, deleted_at
`

// CreateShowcaseJob inserts a new showcase job.
func (s *Store) CreateShowcaseJob(ctx context.Context, params CreateShowcaseJobParams) (ShowcaseJob, error) {
	var job ShowcaseJob
	err := s.db.GetContext(ctx, &job, sqlCreateShowcaseJob,
		params.AccountID, params.Brief, params.ComponentName, StringArray(params.StoryIDs))
	if err != nil {
		return ShowcaseJob{}, fmt.Errorf("failed to create showcase job: %w", err)
	}
	return job, nil
}

const sqlGetShowcaseJobForDraft = `
SELECT id, brief, component_name, status, post_id, capture_output, account_id
FROM showcase_jobs
WHERE id = $1 AND deleted_at IS NULL
`

// GetShowcaseJobForDraft fetches a showcase job by ID for draft generation.
func (s *Store) GetShowcaseJobForDraft(ctx context.Context, jobID uuid.UUID) (ShowcaseJobForDraft, error) {
	var row ShowcaseJobForDraft
	err := s.db.GetContext(ctx, &row, sqlGetShowcaseJobForDraft, jobID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ShowcaseJobForDraft{}, ErrNotFound
		}
		return ShowcaseJobForDraft{}, fmt.Errorf("failed to get showcase job for draft: %w", err)
	}
	return row, nil
}

const sqlUpdateShowcaseJobStatus = `
UPDATE showcase_jobs
SET status = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND deleted_at IS NULL
`

// UpdateShowcaseJobStatus sets the status of a showcase job.
func (s *Store) UpdateShowcaseJobStatus(ctx context.Context, jobID uuid.UUID, status string) error {
	res, err := s.db.ExecContext(ctx, sqlUpdateShowcaseJobStatus, jobID, status)
	if err != nil {
		return fmt.Errorf("failed to update showcase job status: %w", err)
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

const sqlUpdateShowcaseJobCapture = `
UPDATE showcase_jobs
SET capture_output = $2, status = 'drafting', updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND deleted_at IS NULL
`

// UpdateShowcaseJobCapture sets the capture output and transitions the job to "drafting".
func (s *Store) UpdateShowcaseJobCapture(ctx context.Context, jobID uuid.UUID, captureOutput json.RawMessage) error {
	res, err := s.db.ExecContext(ctx, sqlUpdateShowcaseJobCapture, jobID, captureOutput)
	if err != nil {
		return fmt.Errorf("failed to update showcase job capture: %w", err)
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

const sqlUpdateShowcaseJobPostID = `
UPDATE showcase_jobs
SET post_id = $2, status = 'done', updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND deleted_at IS NULL
`

// UpdateShowcaseJobPostID links a showcase job to its generated post and
// transitions the job to "done".
func (s *Store) UpdateShowcaseJobPostID(ctx context.Context, jobID, postID uuid.UUID) error {
	res, err := s.db.ExecContext(ctx, sqlUpdateShowcaseJobPostID, jobID, postID)
	if err != nil {
		return fmt.Errorf("failed to update showcase job post_id: %w", err)
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

const sqlUpdateShowcaseJobFailed = `
UPDATE showcase_jobs
SET status = 'failed', error = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND deleted_at IS NULL
`

// UpdateShowcaseJobFailed records a failure on a showcase job.
func (s *Store) UpdateShowcaseJobFailed(ctx context.Context, jobID uuid.UUID, errMsg string) error {
	res, err := s.db.ExecContext(ctx, sqlUpdateShowcaseJobFailed, jobID, errMsg)
	if err != nil {
		return fmt.Errorf("failed to update showcase job failed: %w", err)
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
