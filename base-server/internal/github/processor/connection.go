package processor

import (
	"context"
	"errors"
	"fmt"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// GetConnection returns the stored GitHub connection for a user (token is stripped)
func (p *GitHubProcessor) GetConnection(ctx context.Context, userID uuid.UUID) (store.GitHubConnection, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "operation", Value: "get_connection"},
	)

	conn, err := p.store.GetGitHubConnectionByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return store.GitHubConnection{}, ErrConnectionNotFound
		}
		p.logger.Error(ctx, "failed to get github connection", err)
		return store.GitHubConnection{}, ErrConnectionNotFound
	}
	// Strip token before returning
	conn.AccessToken = ""
	return conn, nil
}

// Disconnect deletes webhooks (best-effort) then soft-deletes connection + repos
func (p *GitHubProcessor) Disconnect(ctx context.Context, userID uuid.UUID) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "operation", Value: "disconnect"},
	)

	conn, err := p.store.GetGitHubConnectionByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return ErrConnectionNotFound
		}
		p.logger.Error(ctx, "failed to get github connection for disconnect", err)
		return ErrFailedDisconnect
	}

	repos, err := p.store.ListGitHubReposByConnection(ctx, conn.ID)
	if err != nil {
		p.logger.Error(ctx, "failed to list github repos for disconnect", err)
		// Continue anyway — soft-delete is more important
	}

	for _, repo := range repos {
		if repo.WebhookID != nil {
			if delErr := p.githubClient.DeleteWebhook(ctx, conn.AccessToken, repo.Owner, repo.Name, *repo.WebhookID); delErr != nil {
				// Best-effort: log but continue
				p.logger.Error(ctx, fmt.Sprintf("failed to delete webhook for repo %s/%s", repo.Owner, repo.Name), delErr)
			}
		}
	}

	if err := p.store.SoftDeleteGitHubConnection(ctx, userID); err != nil {
		p.logger.Error(ctx, "failed to soft-delete github connection", err)
		return ErrFailedDisconnect
	}
	return nil
}
