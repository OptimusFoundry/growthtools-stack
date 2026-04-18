package processor

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"base-server/internal/infra/observability"

	"github.com/google/uuid"
)

// generateState creates a cryptographically random hex string for use as OAuth state
func generateState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate random state: %w", err)
	}
	return hex.EncodeToString(b), nil
}

// generateSecret creates a cryptographically random hex string for use as webhook secret
func generateSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate webhook secret: %w", err)
	}
	return hex.EncodeToString(b), nil
}

// InitOAuth generates a random state, caches it, and returns the GitHub authorization URL
func (p *GitHubProcessor) InitOAuth(ctx context.Context, userID uuid.UUID) (string, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "operation", Value: "init_oauth"},
	)

	state, err := generateState()
	if err != nil {
		p.logger.Error(ctx, "failed to generate oauth state", err)
		return "", ErrOAuthExchangeFailed
	}

	p.oauthStates.Store(state, oauthStateEntry{
		userID:    userID,
		expiresAt: time.Now().Add(10 * time.Minute),
	})

	authorizeURL := fmt.Sprintf(
		"https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&scope=repo&state=%s",
		p.oauthClientID,
		p.webAppHost+"/api/github/oauth/callback",
		state,
	)
	return authorizeURL, nil
}

// CompleteOAuth validates the state, exchanges the code, fetches the user, and persists the connection
func (p *GitHubProcessor) CompleteOAuth(ctx context.Context, state, code string) (uuid.UUID, error) {
	ctx = observability.WithFields(ctx, observability.Field{Key: "operation", Value: "complete_oauth"})

	raw, ok := p.oauthStates.LoadAndDelete(state)
	if !ok {
		return uuid.Nil, ErrInvalidOAuthState
	}
	entry := raw.(oauthStateEntry)
	if time.Now().After(entry.expiresAt) {
		return uuid.Nil, ErrInvalidOAuthState
	}

	ctx = observability.WithFields(ctx, observability.Field{Key: "user_id", Value: entry.userID.String()})

	tokenResp, err := p.githubClient.ExchangeOAuthCode(ctx, code)
	if err != nil {
		p.logger.Error(ctx, "failed to exchange oauth code", err)
		return uuid.Nil, ErrOAuthExchangeFailed
	}

	ghUser, err := p.githubClient.GetAuthenticatedUser(ctx, tokenResp.AccessToken)
	if err != nil {
		p.logger.Error(ctx, "failed to get github user", err)
		return uuid.Nil, ErrOAuthExchangeFailed
	}

	_, err = p.store.CreateOrUpdateGitHubConnection(ctx, entry.userID, ghUser.ID, ghUser.Login, tokenResp.AccessToken, tokenResp.Scope)
	if err != nil {
		p.logger.Error(ctx, "failed to store github connection", err)
		return uuid.Nil, ErrOAuthExchangeFailed
	}

	return entry.userID, nil
}
