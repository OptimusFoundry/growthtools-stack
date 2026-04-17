package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
)

// CreateGitHubEventParams represents parameters for creating a GitHub event
type CreateGitHubEventParams struct {
	AccountID  uuid.UUID
	RepoName   string
	EventType  string
	Payload    JSONB
	DeliveryID string
}

const sqlCreateGitHubEvent = `
INSERT INTO github_events (account_id, repo_name, event_type, payload, delivery_id)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, account_id, repo_name, event_type, payload, delivery_id, processed, post_id, created_at
`

func (s *Store) CreateGitHubEvent(ctx context.Context, params CreateGitHubEventParams) (GitHubEvent, error) {
	var event GitHubEvent
	err := s.db.GetContext(ctx, &event, sqlCreateGitHubEvent,
		params.AccountID, params.RepoName, params.EventType, params.Payload, params.DeliveryID)
	if err != nil {
		return GitHubEvent{}, fmt.Errorf("failed to create github event: %w", err)
	}
	return event, nil
}

const sqlGetGitHubEventByDeliveryID = `
SELECT id, account_id, repo_name, event_type, payload, delivery_id, processed, post_id, created_at
FROM github_events
WHERE delivery_id = $1
`

func (s *Store) GetGitHubEventByDeliveryID(ctx context.Context, deliveryID string) (GitHubEvent, error) {
	var event GitHubEvent
	err := s.db.GetContext(ctx, &event, sqlGetGitHubEventByDeliveryID, deliveryID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return GitHubEvent{}, ErrNotFound
		}
		return GitHubEvent{}, fmt.Errorf("failed to get github event: %w", err)
	}
	return event, nil
}

const sqlListUnprocessedGitHubEvents = `
SELECT id, account_id, repo_name, event_type, payload, delivery_id, processed, post_id, created_at
FROM github_events
WHERE processed = false
ORDER BY created_at ASC
LIMIT $1
`

func (s *Store) ListUnprocessedGitHubEvents(ctx context.Context, limit int) ([]GitHubEvent, error) {
	if limit <= 0 {
		limit = 50
	}
	events := make([]GitHubEvent, 0)
	err := s.db.SelectContext(ctx, &events, sqlListUnprocessedGitHubEvents, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to list unprocessed github events: %w", err)
	}
	return events, nil
}

const sqlMarkGitHubEventProcessed = `
UPDATE github_events
SET processed = true, post_id = $2
WHERE id = $1
`

func (s *Store) MarkGitHubEventProcessed(ctx context.Context, id uuid.UUID, postID *uuid.UUID) error {
	res, err := s.db.ExecContext(ctx, sqlMarkGitHubEventProcessed, id, postID)
	if err != nil {
		return fmt.Errorf("failed to mark github event processed: %w", err)
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
