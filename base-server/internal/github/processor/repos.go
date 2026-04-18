package processor

import (
	"context"
	"errors"

	githubclient "base-server/internal/infra/clients/github"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// AvailableRepo is a GitHub repo with a flag indicating whether it is already connected
type AvailableRepo struct {
	githubclient.GitHubRepo
	Connected bool `json:"connected"`
}

// ListAvailableRepos fetches repos from GitHub and marks which are already connected
func (p *GitHubProcessor) ListAvailableRepos(ctx context.Context, userID uuid.UUID, page int) ([]AvailableRepo, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "operation", Value: "list_available_repos"},
	)

	conn, err := p.store.GetGitHubConnectionByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, ErrConnectionNotFound
		}
		p.logger.Error(ctx, "failed to get github connection", err)
		return nil, ErrConnectionNotFound
	}

	ghRepos, err := p.githubClient.ListUserRepos(ctx, conn.AccessToken, page)
	if err != nil {
		p.logger.Error(ctx, "failed to list github repos from api", err)
		return nil, ErrFailedDisconnect
	}

	// Build a set of connected (owner, name) pairs
	localRepos, err := p.store.ListGitHubReposByConnection(ctx, conn.ID)
	if err != nil {
		p.logger.Error(ctx, "failed to list local github repos", err)
		// Non-fatal — just won't mark repos as connected
	}
	connectedSet := make(map[string]bool, len(localRepos))
	for _, r := range localRepos {
		connectedSet[r.Owner+"/"+r.Name] = true
	}

	result := make([]AvailableRepo, len(ghRepos))
	for i, r := range ghRepos {
		result[i] = AvailableRepo{
			GitHubRepo: r,
			Connected:  connectedSet[r.Owner.Login+"/"+r.Name],
		}
	}
	return result, nil
}

// ConnectRepo registers a webhook and stores the repo row
func (p *GitHubProcessor) ConnectRepo(ctx context.Context, userID uuid.UUID, owner, name string) (store.GitHubRepo, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "repo", Value: owner + "/" + name},
		observability.Field{Key: "operation", Value: "connect_repo"},
	)

	conn, err := p.store.GetGitHubConnectionByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return store.GitHubRepo{}, ErrConnectionNotFound
		}
		p.logger.Error(ctx, "failed to get github connection", err)
		return store.GitHubRepo{}, ErrConnectionNotFound
	}

	secret, err := generateSecret()
	if err != nil {
		p.logger.Error(ctx, "failed to generate webhook secret", err)
		return store.GitHubRepo{}, ErrFailedDisconnect
	}

	webhookURL := p.webAppHost + "/api/github/webhook"
	hookID, err := p.githubClient.CreateWebhook(ctx, conn.AccessToken, owner, name, webhookURL, secret)
	if err != nil {
		p.logger.Error(ctx, "failed to create github webhook", err)
		return store.GitHubRepo{}, ErrFailedDisconnect
	}

	// We don't have the GitHub repo ID here without an extra API call.
	// Use 0 as a sentinel; a follow-up can enrich this from the webhook payload.
	var defaultBranch *string
	hookIDPtr := &hookID

	repo, err := p.store.CreateGitHubRepo(ctx, conn.ID, 0, owner, name, defaultBranch, hookIDPtr, secret)
	if err != nil {
		p.logger.Error(ctx, "failed to store github repo", err)
		return store.GitHubRepo{}, ErrFailedDisconnect
	}
	return repo, nil
}

// DisconnectRepo removes the webhook and soft-deletes the repo row
func (p *GitHubProcessor) DisconnectRepo(ctx context.Context, userID uuid.UUID, owner, name string) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "repo", Value: owner + "/" + name},
		observability.Field{Key: "operation", Value: "disconnect_repo"},
	)

	conn, err := p.store.GetGitHubConnectionByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return ErrConnectionNotFound
		}
		p.logger.Error(ctx, "failed to get github connection", err)
		return ErrConnectionNotFound
	}

	repo, err := p.store.GetGitHubRepoByConnectionAndName(ctx, conn.ID, owner, name)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return ErrRepoNotFound
		}
		p.logger.Error(ctx, "failed to get github repo", err)
		return ErrRepoNotFound
	}

	if repo.WebhookID != nil {
		if delErr := p.githubClient.DeleteWebhook(ctx, conn.AccessToken, owner, name, *repo.WebhookID); delErr != nil {
			// Best-effort: log but continue to soft-delete
			p.logger.Error(ctx, "failed to delete webhook during repo disconnect", delErr)
		}
	}

	if err := p.store.SoftDeleteGitHubRepo(ctx, repo.ID); err != nil {
		p.logger.Error(ctx, "failed to soft-delete github repo", err)
		return ErrFailedDisconnect
	}
	return nil
}
