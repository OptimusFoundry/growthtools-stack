package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	githubclient "base-server/internal/infra/clients/github"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// GitHubStore defines the database operations required by GitHubProcessor
type GitHubStore interface {
	// Webhook event operations (pre-existing)
	CreateGitHubEvent(ctx context.Context, params store.CreateGitHubEventParams) (store.GitHubEvent, error)
	GetGitHubEventByDeliveryID(ctx context.Context, deliveryID string) (store.GitHubEvent, error)
	ListUnprocessedGitHubEvents(ctx context.Context, limit int) ([]store.GitHubEvent, error)
	MarkGitHubEventProcessed(ctx context.Context, id uuid.UUID, postID *uuid.UUID) error

	// OAuth connection operations
	CreateOrUpdateGitHubConnection(ctx context.Context, userID uuid.UUID, githubUserID int64, username, token, scope string) (store.GitHubConnection, error)
	GetGitHubConnectionByUserID(ctx context.Context, userID uuid.UUID) (store.GitHubConnection, error)
	SoftDeleteGitHubConnection(ctx context.Context, userID uuid.UUID) error

	// Repo operations
	CreateGitHubRepo(ctx context.Context, connectionID uuid.UUID, ghRepoID int64, owner, name string, defaultBranch *string, webhookID *int64, webhookSecret string) (store.GitHubRepo, error)
	ListGitHubReposByConnection(ctx context.Context, connectionID uuid.UUID) ([]store.GitHubRepo, error)
	GetGitHubRepoByConnectionAndName(ctx context.Context, connectionID uuid.UUID, owner, name string) (store.GitHubRepo, error)
	SoftDeleteGitHubRepo(ctx context.Context, repoID uuid.UUID) error

	// Commit operations
	ListGitHubCommitsByConnection(ctx context.Context, connectionID uuid.UUID, limit, offset int) ([]store.GitHubCommit, error)
}

// GitHubClient defines the GitHub API calls required by GitHubProcessor
type GitHubClient interface {
	ExchangeOAuthCode(ctx context.Context, code string) (githubclient.OAuthTokenResponse, error)
	GetAuthenticatedUser(ctx context.Context, token string) (githubclient.GitHubUser, error)
	ListUserRepos(ctx context.Context, token string, page int) ([]githubclient.GitHubRepo, error)
	CreateWebhook(ctx context.Context, token, owner, name, webhookURL, secret string) (int64, error)
	DeleteWebhook(ctx context.Context, token, owner, name string, hookID int64) error
}

var (
	ErrInvalidSignature    = errors.New("invalid webhook signature")
	ErrDuplicateEvent      = errors.New("duplicate webhook event")
	ErrInvalidOAuthState   = errors.New("invalid or expired oauth state")
	ErrOAuthExchangeFailed = errors.New("oauth code exchange failed")
	ErrConnectionNotFound  = errors.New("github connection not found")
	ErrRepoNotFound        = errors.New("github repo not found")
	ErrRepoAlreadyLinked   = errors.New("github repo already linked")
	ErrFailedDisconnect    = errors.New("failed to disconnect github")
)

// oauthStateCache is a short-lived in-process store of state → userID.
// TODO: replace with Redis for multi-instance deployments.
type oauthStateEntry struct {
	userID    uuid.UUID
	expiresAt time.Time
}

type GitHubProcessor struct {
	store         GitHubStore
	githubClient  GitHubClient
	webhookSecret string
	webAppHost    string
	oauthClientID string
	// oauthStates maps random state string → oauthStateEntry. Pointer so
	// the processor can still be passed by value (sync.Map itself embeds
	// sync.noCopy and can't be copied).
	oauthStates *sync.Map
	logger      *observability.Logger
}

func New(store GitHubStore, webhookSecret string, logger *observability.Logger) GitHubProcessor {
	return GitHubProcessor{
		store:         store,
		webhookSecret: webhookSecret,
		oauthStates:   &sync.Map{},
		logger:        logger,
	}
}

// NewWithOAuth creates a GitHubProcessor with OAuth and webhook capabilities
func NewWithOAuth(
	store GitHubStore,
	githubClient GitHubClient,
	webhookSecret string,
	oauthClientID string,
	webAppHost string,
	logger *observability.Logger,
) GitHubProcessor {
	return GitHubProcessor{
		store:         store,
		githubClient:  githubClient,
		webhookSecret: webhookSecret,
		oauthClientID: oauthClientID,
		webAppHost:    webAppHost,
		oauthStates:   &sync.Map{},
		logger:        logger,
	}
}

// ValidateSignature verifies the HMAC-SHA256 signature from GitHub
func (p *GitHubProcessor) ValidateSignature(payload []byte, signature string) error {
	if !strings.HasPrefix(signature, "sha256=") {
		return ErrInvalidSignature
	}

	mac := hmac.New(sha256.New, []byte(p.webhookSecret))
	mac.Write(payload)
	expectedMAC := hex.EncodeToString(mac.Sum(nil))
	expectedSig := "sha256=" + expectedMAC

	if !hmac.Equal([]byte(signature), []byte(expectedSig)) {
		return ErrInvalidSignature
	}
	return nil
}

// HandleWebhookEvent validates the signature, deduplicates, and persists the event
func (p *GitHubProcessor) HandleWebhookEvent(ctx context.Context, deliveryID string, eventType string, payload []byte, signature string) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "delivery_id", Value: deliveryID},
		observability.Field{Key: "event_type", Value: eventType},
		observability.Field{Key: "operation", Value: "handle_webhook_event"},
	)

	if err := p.ValidateSignature(payload, signature); err != nil {
		p.logger.Warn(ctx, "invalid webhook signature received")
		return ErrInvalidSignature
	}

	_, err := p.store.GetGitHubEventByDeliveryID(ctx, deliveryID)
	if err == nil {
		// Event already exists — duplicate delivery
		p.logger.Warn(ctx, "duplicate webhook event received")
		return ErrDuplicateEvent
	}
	if !errors.Is(err, store.ErrNotFound) {
		p.logger.Error(ctx, "failed to check for duplicate event", err)
		return err
	}

	params := store.CreateGitHubEventParams{
		EventType:  eventType,
		DeliveryID: deliveryID,
		Payload:    store.JSONB{},
	}

	_, err = p.store.CreateGitHubEvent(ctx, params)
	if err != nil {
		p.logger.Error(ctx, "failed to persist GitHub event", err)
		return err
	}

	return nil
}

// ============================================================================
// OAuth flow
// ============================================================================

// AvailableRepo is a GitHub repo with a flag indicating whether it is already connected
type AvailableRepo struct {
	githubclient.GitHubRepo
	Connected bool `json:"connected"`
}

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

// ListRecentCommits returns recent commits across all repos for a user's connection
func (p *GitHubProcessor) ListRecentCommits(ctx context.Context, userID uuid.UUID, limit int) ([]store.GitHubCommit, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "operation", Value: "list_recent_commits"},
	)

	conn, err := p.store.GetGitHubConnectionByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, ErrConnectionNotFound
		}
		p.logger.Error(ctx, "failed to get github connection", err)
		return nil, ErrConnectionNotFound
	}

	commits, err := p.store.ListGitHubCommitsByConnection(ctx, conn.ID, limit, 0)
	if err != nil {
		p.logger.Error(ctx, "failed to list github commits", err)
		return nil, ErrFailedDisconnect
	}
	return commits, nil
}
