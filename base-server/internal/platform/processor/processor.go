package processor

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

var (
	ErrInitiateOAuth       = errors.New("failed to initiate oauth")
	ErrHandleOAuthCallback = errors.New("failed to handle oauth callback")
	ErrConnectBluesky      = errors.New("failed to connect bluesky")
	ErrConnectThreads      = errors.New("failed to connect threads")
	ErrDisconnectPlatform  = errors.New("failed to disconnect platform")
	ErrListConnections     = errors.New("failed to list connections")
	ErrUnsupportedPlatform = errors.New("unsupported platform")
	ErrConnectionNotFound  = errors.New("platform connection not found")
	ErrAlreadyConnected    = errors.New("platform already connected")
	ErrTokenExchange       = errors.New("failed to exchange token")
	ErrMissingToken        = errors.New("no access token configured for platform")
	ErrTokenRefresh        = errors.New("failed to refresh token")
	ErrTokenRevoked        = errors.New("token has been revoked")
	ErrNoRefreshToken      = errors.New("no refresh token available")
)

// PlatformStore defines the database operations required by PlatformProcessor.
type PlatformStore interface {
	CreatePlatformConnection(ctx context.Context, params store.CreatePlatformConnectionParams) (store.PlatformConnection, error)
	GetPlatformConnectionByID(ctx context.Context, accountID, id uuid.UUID) (store.PlatformConnection, error)
	GetPlatformConnectionByAccountAndPlatform(ctx context.Context, accountID uuid.UUID, platform, platformUserID string) (store.PlatformConnection, error)
	ListPlatformConnectionsByAccount(ctx context.Context, accountID uuid.UUID) ([]store.PlatformConnection, error)
	UpdatePlatformConnectionStatus(ctx context.Context, accountID, id uuid.UUID, status string) error
	UpdatePlatformConnectionTokens(ctx context.Context, accountID, id uuid.UUID, accessToken string, refreshToken *string, expiresAt *time.Time) error
	DeletePlatformConnection(ctx context.Context, accountID, id uuid.UUID) error
}

// XClient defines the X API operations needed for health checks.
type XClient interface {
	VerifyCredentials(ctx context.Context, accessToken string) error
}

// ThreadsClient defines the Threads API operations needed for health checks.
type ThreadsClient interface {
	VerifyCredentials(ctx context.Context, accessToken string) error
}

// BlueskyClient defines the Bluesky API operations needed for health checks.
type BlueskyClient interface {
	VerifyCredentials(ctx context.Context, handle, appPassword string) error
}

// OAuthConfig holds OAuth credentials for a platform.
type OAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	Scopes       []string
	AuthURL      string
	TokenURL     string
}

// PlatformOAuthConfigs maps platform names to their OAuth configurations.
type PlatformOAuthConfigs map[string]OAuthConfig

// StaticTokens holds pre-configured access tokens for platforms that bypass OAuth.
type StaticTokens map[string]string

// PlatformProcessor handles platform connection logic.
type PlatformProcessor struct {
	store          PlatformStore
	oauthConfigs   PlatformOAuthConfigs
	staticTokens   StaticTokens
	logger         *observability.Logger
	xClient        XClient
	threadsClient  ThreadsClient
	blueskyClient  BlueskyClient
	pkceVerifiers  map[string]string // accountID -> code_verifier for PKCE flows
	pkceVerifierMu sync.Mutex
	refreshMu      sync.Mutex                    // guards concurrent token refreshes
	refreshing     map[uuid.UUID]chan struct{}     // tracks in-flight refresh per connection ID
}

// New creates a new PlatformProcessor.
func New(store PlatformStore, oauthConfigs PlatformOAuthConfigs, staticTokens StaticTokens, logger *observability.Logger, xClient XClient, threadsClient ThreadsClient, blueskyClient BlueskyClient) PlatformProcessor {
	return PlatformProcessor{
		store:         store,
		oauthConfigs:  oauthConfigs,
		staticTokens:  staticTokens,
		logger:        logger,
		xClient:       xClient,
		threadsClient: threadsClient,
		blueskyClient: blueskyClient,
		pkceVerifiers: make(map[string]string),
		refreshing:    make(map[uuid.UUID]chan struct{}),
	}
}

// InitiateOAuth builds the OAuth authorization URL for the given platform.
func (p *PlatformProcessor) InitiateOAuth(ctx context.Context, accountID uuid.UUID, platform string) (string, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "platform", Value: platform},
		observability.Field{Key: "operation", Value: "initiate_oauth"},
	)

	cfg, ok := p.oauthConfigs[platform]
	if !ok {
		return "", ErrUnsupportedPlatform
	}

	// X uses OAuth 2.0 with PKCE (code_challenge)
	if platform == "x" {
		return p.initiateXOAuth2PKCE(ctx, accountID, cfg)
	}

	authURL := fmt.Sprintf(
		"%s?client_id=%s&redirect_uri=%s&response_type=code&scope=%s&state=%s",
		cfg.AuthURL,
		cfg.ClientID,
		url.QueryEscape(cfg.RedirectURL),
		joinScopes(cfg.Scopes),
		accountID.String(),
	)

	return authURL, nil
}

// HandleOAuthCallback processes the OAuth callback and creates a platform connection.
func (p *PlatformProcessor) HandleOAuthCallback(ctx context.Context, accountID uuid.UUID, platform string, code string) (store.PlatformConnection, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "platform", Value: platform},
		observability.Field{Key: "operation", Value: "handle_oauth_callback"},
	)

	cfg, ok := p.oauthConfigs[platform]
	if !ok {
		return store.PlatformConnection{}, ErrUnsupportedPlatform
	}

	// Exchange the authorization code for tokens
	var accessToken, refreshToken, platformUserID, displayName string
	var tokenExpiresAt *time.Time
	var err error

	if platform == "x" {
		accessToken, refreshToken, platformUserID, displayName, tokenExpiresAt, err = p.exchangeXOAuth2Token(ctx, accountID, code, cfg)
	} else {
		accessToken, refreshToken, platformUserID, displayName, tokenExpiresAt, err = p.exchangeOAuth2Token(ctx, platform, code, cfg)
	}

	if err != nil {
		p.logger.Error(ctx, "token exchange failed", err)
		return store.PlatformConnection{}, ErrTokenExchange
	}

	var refreshTokenPtr *string
	if refreshToken != "" {
		refreshTokenPtr = &refreshToken
	}

	var displayNamePtr *string
	if displayName != "" {
		displayNamePtr = &displayName
	}

	params := store.CreatePlatformConnectionParams{
		AccountID:      accountID,
		Platform:       platform,
		PlatformUserID: platformUserID,
		DisplayName:    displayNamePtr,
		AccessToken:    accessToken,
		RefreshToken:   refreshTokenPtr,
		TokenExpiresAt: tokenExpiresAt,
		Scopes:         store.StringArray(cfg.Scopes),
	}

	conn, err := p.store.CreatePlatformConnection(ctx, params)
	if err != nil {
		p.logger.Error(ctx, "failed to create platform connection", err)
		return store.PlatformConnection{}, ErrHandleOAuthCallback
	}

	return conn, nil
}

// ConnectBluesky creates a platform connection for Bluesky using an app password.
func (p *PlatformProcessor) ConnectBluesky(ctx context.Context, accountID uuid.UUID, handle string, appPassword string) (store.PlatformConnection, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "platform", Value: "bluesky"},
		observability.Field{Key: "handle", Value: handle},
		observability.Field{Key: "operation", Value: "connect_bluesky"},
	)

	// Check for existing connection with the same handle.
	_, err := p.store.GetPlatformConnectionByAccountAndPlatform(ctx, accountID, "bluesky", handle)
	if err == nil {
		return store.PlatformConnection{}, ErrAlreadyConnected
	}
	if !errors.Is(err, store.ErrNotFound) {
		p.logger.Error(ctx, "failed to check existing bluesky connection", err)
		return store.PlatformConnection{}, ErrConnectBluesky
	}

	params := store.CreatePlatformConnectionParams{
		AccountID:      accountID,
		Platform:       "bluesky",
		PlatformUserID: handle,
		DisplayName:    &handle,
		AccessToken:    appPassword, // stored as the access token for Bluesky app-password auth
		Scopes:         store.StringArray{"write", "read"},
	}

	conn, err := p.store.CreatePlatformConnection(ctx, params)
	if err != nil {
		p.logger.Error(ctx, "failed to create bluesky connection", err)
		return store.PlatformConnection{}, ErrConnectBluesky
	}

	return conn, nil
}

// ConnectWithToken connects a platform using a pre-configured static access token.
func (p *PlatformProcessor) ConnectWithToken(ctx context.Context, accountID uuid.UUID, platform string) (store.PlatformConnection, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "platform", Value: platform},
		observability.Field{Key: "operation", Value: "connect_with_token"},
	)

	token, ok := p.staticTokens[platform]
	if !ok || token == "" {
		return store.PlatformConnection{}, ErrMissingToken
	}

	// Fetch user profile using the token
	platformUserID, displayName, err := p.fetchUserProfile(ctx, platform, token, "")
	if err != nil {
		p.logger.Error(ctx, "failed to fetch profile with static token", err)
		return store.PlatformConnection{}, fmt.Errorf("%w: %v", ErrConnectThreads, err)
	}

	// Check for existing connection
	_, err = p.store.GetPlatformConnectionByAccountAndPlatform(ctx, accountID, platform, platformUserID)
	if err == nil {
		return store.PlatformConnection{}, ErrAlreadyConnected
	}
	if !errors.Is(err, store.ErrNotFound) {
		p.logger.Error(ctx, "failed to check existing connection", err)
		return store.PlatformConnection{}, ErrConnectThreads
	}

	var displayNamePtr *string
	if displayName != "" {
		displayNamePtr = &displayName
	}

	params := store.CreatePlatformConnectionParams{
		AccountID:      accountID,
		Platform:       platform,
		PlatformUserID: platformUserID,
		DisplayName:    displayNamePtr,
		AccessToken:    token,
		Scopes:         store.StringArray{"threads_basic", "threads_content_publish", "threads_manage_insights"},
	}

	conn, err := p.store.CreatePlatformConnection(ctx, params)
	if err != nil {
		p.logger.Error(ctx, "failed to create platform connection", err)
		return store.PlatformConnection{}, ErrConnectThreads
	}

	return conn, nil
}

// DisconnectPlatform soft-deletes a platform connection.
func (p *PlatformProcessor) DisconnectPlatform(ctx context.Context, accountID uuid.UUID, connectionID uuid.UUID) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "connection_id", Value: connectionID.String()},
		observability.Field{Key: "operation", Value: "disconnect_platform"},
	)

	if err := p.store.DeletePlatformConnection(ctx, accountID, connectionID); err != nil {
		p.logger.Error(ctx, "failed to delete platform connection", err)
		if errors.Is(err, store.ErrNotFound) {
			return ErrConnectionNotFound
		}
		return ErrDisconnectPlatform
	}

	return nil
}

// ListConnections returns all active platform connections for an account,
// performing parallel health checks on each active connection first.
func (p *PlatformProcessor) ListConnections(ctx context.Context, accountID uuid.UUID) ([]store.PlatformConnection, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "operation", Value: "list_connections"},
	)

	connections, err := p.store.ListPlatformConnectionsByAccount(ctx, accountID)
	if err != nil {
		p.logger.Error(ctx, "failed to list platform connections", err)
		return nil, ErrListConnections
	}

	p.runHealthChecks(ctx, accountID, connections)

	return connections, nil
}

// healthCheckResult carries the outcome of a single platform health check.
type healthCheckResult struct {
	index     int
	newStatus string
}

// runHealthChecks refreshes tokens that are near expiry and verifies active connections.
// Token refresh only happens when token_expires_at is within 5 minutes of expiry.
// Verification failures alone do NOT trigger refresh — only expiry does.
func (p *PlatformProcessor) runHealthChecks(ctx context.Context, accountID uuid.UUID, connections []store.PlatformConnection) {
	healthCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	var wg sync.WaitGroup
	results := make(chan healthCheckResult, len(connections))

	for i, conn := range connections {
		if conn.Status != "active" {
			continue
		}

		wg.Add(1)
		go func(idx int, c store.PlatformConnection) {
			defer wg.Done()

			// If token is near expiry, refresh it proactively
			if c.TokenExpiresAt != nil && time.Until(*c.TokenExpiresAt) <= 5*time.Minute {
				refreshed, refreshErr := p.RefreshConnection(healthCtx, c)
				if refreshErr != nil {
					p.logger.Info(ctx, fmt.Sprintf("proactive refresh failed for %s connection %s: %v", c.Platform, c.ID, refreshErr))
					results <- healthCheckResult{index: idx, newStatus: "expired"}
					return
				}
				connections[idx] = refreshed
				return
			}

			// Otherwise just verify the connection is still valid
			err := p.verifyConnection(healthCtx, c)
			if err != nil {
				p.logger.Info(ctx, fmt.Sprintf("health check failed for %s connection %s: %v", c.Platform, c.ID, err))
				results <- healthCheckResult{index: idx, newStatus: "expired"}
			}
		}(i, conn)
	}

	// Close results channel when all goroutines finish.
	go func() {
		wg.Wait()
		close(results)
	}()

	for r := range results {
		connections[r.index].Status = r.newStatus
		if err := p.store.UpdatePlatformConnectionStatus(ctx, accountID, connections[r.index].ID, r.newStatus); err != nil {
			p.logger.Error(ctx, fmt.Sprintf("failed to update status for connection %s", connections[r.index].ID), err)
		}
	}
}

// verifyConnection pings the appropriate platform API to check if credentials are valid.
func (p *PlatformProcessor) verifyConnection(ctx context.Context, conn store.PlatformConnection) error {
	switch conn.Platform {
	case "x":
		if p.xClient != nil {
			return p.xClient.VerifyCredentials(ctx, conn.AccessToken)
		}
	case "threads":
		if p.threadsClient != nil {
			return p.threadsClient.VerifyCredentials(ctx, conn.AccessToken)
		}
	case "bluesky":
		if p.blueskyClient != nil {
			// BlueSky stores the app password as AccessToken and handle as PlatformUserID.
			return p.blueskyClient.VerifyCredentials(ctx, conn.PlatformUserID, conn.AccessToken)
		}
	}
	return nil
}

// exchangeOAuth2Token handles the standard OAuth 2.0 token exchange for most platforms.
func (p *PlatformProcessor) exchangeOAuth2Token(ctx context.Context, platform, code string, cfg OAuthConfig) (accessToken, refreshToken, platformUserID, displayName string, expiresAt *time.Time, err error) {
	params := url.Values{}
	params.Set("grant_type", "authorization_code")
	params.Set("code", code)
	params.Set("redirect_uri", cfg.RedirectURL)
	params.Set("client_id", cfg.ClientID)
	params.Set("client_secret", cfg.ClientSecret)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.TokenURL, strings.NewReader(params.Encode()))
	if err != nil {
		return "", "", "", "", nil, fmt.Errorf("failed to create token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", "", "", nil, fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return "", "", "", "", nil, fmt.Errorf("token endpoint returned %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int64  `json:"expires_in"`
		OpenID       string `json:"open_id"` // TikTok
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", "", "", "", nil, fmt.Errorf("failed to parse token response: %w", err)
	}

	accessToken = tokenResp.AccessToken
	refreshToken = tokenResp.RefreshToken

	if tokenResp.ExpiresIn > 0 {
		t := time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second)
		expiresAt = &t
	}

	// Fetch user profile to get platform user ID and display name
	platformUserID, displayName, err = p.fetchUserProfile(ctx, platform, accessToken, tokenResp.OpenID)
	if err != nil {
		p.logger.Error(ctx, "failed to fetch user profile, using fallback", err)
		platformUserID = "unknown"
	}

	return accessToken, refreshToken, platformUserID, displayName, expiresAt, nil
}

// generatePKCEVerifier creates a random code_verifier for OAuth 2.0 PKCE.
func generatePKCEVerifier() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate PKCE verifier: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// pkceChallenge computes the S256 code_challenge from a code_verifier.
func pkceChallenge(verifier string) string {
	h := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(h[:])
}

// initiateXOAuth2PKCE starts the X OAuth 2.0 + PKCE flow.
func (p *PlatformProcessor) initiateXOAuth2PKCE(ctx context.Context, accountID uuid.UUID, cfg OAuthConfig) (string, error) {
	verifier, err := generatePKCEVerifier()
	if err != nil {
		p.logger.Error(ctx, "failed to generate PKCE verifier", err)
		return "", ErrInitiateOAuth
	}

	// Store verifier keyed by accountID so we can retrieve it in the callback.
	p.pkceVerifierMu.Lock()
	p.pkceVerifiers[accountID.String()] = verifier
	p.pkceVerifierMu.Unlock()

	challenge := pkceChallenge(verifier)

	authURL := fmt.Sprintf(
		"%s?response_type=code&client_id=%s&redirect_uri=%s&scope=%s&state=%s&code_challenge=%s&code_challenge_method=S256",
		cfg.AuthURL,
		cfg.ClientID,
		url.QueryEscape(cfg.RedirectURL),
		joinScopes(cfg.Scopes),
		accountID.String(),
		challenge,
	)

	return authURL, nil
}

// exchangeXOAuth2Token exchanges an authorization code for tokens using OAuth 2.0 + PKCE for X.
func (p *PlatformProcessor) exchangeXOAuth2Token(ctx context.Context, accountID uuid.UUID, code string, cfg OAuthConfig) (accessToken, refreshToken, platformUserID, displayName string, expiresAt *time.Time, err error) {
	// Retrieve and remove the stored PKCE verifier.
	p.pkceVerifierMu.Lock()
	verifier, ok := p.pkceVerifiers[accountID.String()]
	if ok {
		delete(p.pkceVerifiers, accountID.String())
	}
	p.pkceVerifierMu.Unlock()

	if !ok {
		return "", "", "", "", nil, fmt.Errorf("PKCE verifier not found for account %s", accountID)
	}

	params := url.Values{}
	params.Set("grant_type", "authorization_code")
	params.Set("code", code)
	params.Set("redirect_uri", cfg.RedirectURL)
	params.Set("code_verifier", verifier)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.TokenURL, strings.NewReader(params.Encode()))
	if err != nil {
		return "", "", "", "", nil, fmt.Errorf("failed to create X token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	// X OAuth 2.0 uses Basic auth with client_id:client_secret
	req.SetBasicAuth(cfg.ClientID, cfg.ClientSecret)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", "", "", nil, fmt.Errorf("X token request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return "", "", "", "", nil, fmt.Errorf("X token endpoint returned %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int64  `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", "", "", "", nil, fmt.Errorf("failed to parse X token response: %w", err)
	}

	if tokenResp.ExpiresIn > 0 {
		t := time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second)
		expiresAt = &t
	}

	// Fetch user profile from X API v2
	platformUserID, displayName, err = p.fetchXProfile(ctx, tokenResp.AccessToken)
	if err != nil {
		p.logger.Error(ctx, "failed to fetch X profile, using fallback", err)
		platformUserID = "unknown"
	}

	return tokenResp.AccessToken, tokenResp.RefreshToken, platformUserID, displayName, expiresAt, nil
}

// fetchXProfile retrieves the authenticated user's profile from X API v2.
func (p *PlatformProcessor) fetchXProfile(ctx context.Context, accessToken string) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.x.com/2/users/me?user.fields=username", nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Data struct {
			ID       string `json:"id"`
			Username string `json:"username"`
			Name     string `json:"name"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", err
	}
	displayName := result.Data.Name
	if displayName == "" {
		displayName = "@" + result.Data.Username
	}
	return result.Data.ID, displayName, nil
}

// fetchUserProfile retrieves the user's profile info from the platform to get their ID and display name.
func (p *PlatformProcessor) fetchUserProfile(ctx context.Context, platform, accessToken, openID string) (userID, displayName string, err error) {
	switch platform {
	case "linkedin":
		return p.fetchLinkedInProfile(ctx, accessToken)
	case "facebook":
		return p.fetchFacebookProfile(ctx, accessToken)
	case "instagram":
		return p.fetchInstagramProfile(ctx, accessToken)
	case "threads":
		return p.fetchThreadsProfile(ctx, accessToken)
	case "tiktok":
		return p.fetchTikTokProfile(ctx, accessToken, openID)
	case "pinterest":
		return p.fetchPinterestProfile(ctx, accessToken)
	default:
		return "", "", fmt.Errorf("unsupported platform: %s", platform)
	}
}

func (p *PlatformProcessor) fetchLinkedInProfile(ctx context.Context, accessToken string) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.linkedin.com/v2/userinfo", nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Sub  string `json:"sub"`
		Name string `json:"name"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", err
	}
	return result.Sub, result.Name, nil
}

func (p *PlatformProcessor) fetchFacebookProfile(ctx context.Context, accessToken string) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://graph.facebook.com/v21.0/me?fields=id,name&access_token="+accessToken, nil)
	if err != nil {
		return "", "", err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", err
	}
	return result.ID, result.Name, nil
}

func (p *PlatformProcessor) fetchInstagramProfile(ctx context.Context, accessToken string) (string, string, error) {
	// First get the user's pages, then get the IG business account from the page
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account,name&access_token="+accessToken, nil)
	if err != nil {
		return "", "", err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Data []struct {
			InstagramBusinessAccount struct {
				ID string `json:"id"`
			} `json:"instagram_business_account"`
			Name string `json:"name"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", err
	}

	for _, page := range result.Data {
		if page.InstagramBusinessAccount.ID != "" {
			return page.InstagramBusinessAccount.ID, page.Name, nil
		}
	}
	return "", "", errors.New("no Instagram business account found")
}

func (p *PlatformProcessor) fetchThreadsProfile(ctx context.Context, accessToken string) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://graph.threads.net/v1.0/me?fields=id,username&access_token="+accessToken, nil)
	if err != nil {
		return "", "", err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		ID       string `json:"id"`
		Username string `json:"username"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", err
	}
	return result.ID, result.Username, nil
}

func (p *PlatformProcessor) fetchTikTokProfile(ctx context.Context, accessToken, openID string) (string, string, error) {
	if openID != "" {
		// TikTok returns open_id in the token response
		return openID, "", nil
	}

	payload := `{"fields":["open_id","display_name"]}`
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://open.tiktokapis.com/v2/user/info/", strings.NewReader(payload))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Data struct {
			User struct {
				OpenID      string `json:"open_id"`
				DisplayName string `json:"display_name"`
			} `json:"user"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", err
	}
	return result.Data.User.OpenID, result.Data.User.DisplayName, nil
}

func (p *PlatformProcessor) fetchPinterestProfile(ctx context.Context, accessToken string) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.pinterest.com/v5/user_account", nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Username string `json:"username"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", err
	}
	return result.Username, result.Username, nil
}

// refreshOAuth2Token performs a standard OAuth 2.0 token refresh for most platforms.
// Uses client credentials in the POST body (LinkedIn, Facebook, Instagram, TikTok, Pinterest).
func (p *PlatformProcessor) refreshOAuth2Token(ctx context.Context, conn store.PlatformConnection, cfg OAuthConfig) (string, string, *time.Time, error) {
	params := url.Values{}
	params.Set("grant_type", "refresh_token")
	params.Set("refresh_token", *conn.RefreshToken)
	params.Set("client_id", cfg.ClientID)
	params.Set("client_secret", cfg.ClientSecret)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.TokenURL, strings.NewReader(params.Encode()))
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to create refresh request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", nil, fmt.Errorf("refresh request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode == http.StatusBadRequest || resp.StatusCode == http.StatusUnauthorized {
		return "", "", nil, ErrTokenRevoked
	}
	if resp.StatusCode != http.StatusOK {
		return "", "", nil, fmt.Errorf("refresh endpoint returned %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int64  `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", "", nil, fmt.Errorf("failed to parse refresh response: %w", err)
	}

	var expiresAt *time.Time
	if tokenResp.ExpiresIn > 0 {
		t := time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second)
		expiresAt = &t
	}

	newRefresh := tokenResp.RefreshToken
	if newRefresh == "" {
		newRefresh = *conn.RefreshToken
	}

	return tokenResp.AccessToken, newRefresh, expiresAt, nil
}

// refreshXToken performs token refresh for X (Twitter) using Basic auth header.
func (p *PlatformProcessor) refreshXToken(ctx context.Context, conn store.PlatformConnection, cfg OAuthConfig) (string, string, *time.Time, error) {
	params := url.Values{}
	params.Set("grant_type", "refresh_token")
	params.Set("refresh_token", *conn.RefreshToken)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.TokenURL, strings.NewReader(params.Encode()))
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to create X refresh request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(cfg.ClientID, cfg.ClientSecret)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", nil, fmt.Errorf("X refresh request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode == http.StatusBadRequest || resp.StatusCode == http.StatusUnauthorized {
		return "", "", nil, ErrTokenRevoked
	}
	if resp.StatusCode != http.StatusOK {
		return "", "", nil, fmt.Errorf("X refresh endpoint returned %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int64  `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", "", nil, fmt.Errorf("failed to parse X refresh response: %w", err)
	}

	var expiresAt *time.Time
	if tokenResp.ExpiresIn > 0 {
		t := time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second)
		expiresAt = &t
	}

	newRefresh := tokenResp.RefreshToken
	if newRefresh == "" {
		newRefresh = *conn.RefreshToken
	}

	return tokenResp.AccessToken, newRefresh, expiresAt, nil
}

// refreshThreadsToken refreshes a Threads long-lived token via GET request.
func (p *PlatformProcessor) refreshThreadsToken(ctx context.Context, conn store.PlatformConnection) (string, *time.Time, error) {
	refreshURL := fmt.Sprintf("https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=%s", conn.AccessToken)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, refreshURL, nil)
	if err != nil {
		return "", nil, fmt.Errorf("failed to create Threads refresh request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", nil, fmt.Errorf("Threads refresh request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode == http.StatusBadRequest || resp.StatusCode == http.StatusUnauthorized {
		return "", nil, ErrTokenRevoked
	}
	if resp.StatusCode != http.StatusOK {
		return "", nil, fmt.Errorf("Threads refresh endpoint returned %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int64  `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", nil, fmt.Errorf("failed to parse Threads refresh response: %w", err)
	}

	var expiresAt *time.Time
	if tokenResp.ExpiresIn > 0 {
		t := time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second)
		expiresAt = &t
	}

	return tokenResp.AccessToken, expiresAt, nil
}

// RefreshConnection refreshes OAuth tokens for a platform connection.
// It picks the platform-specific refresh method, persists new tokens, and
// marks the connection as expired if the token has been revoked.
// Concurrent calls for the same connection ID are serialized — the second caller
// waits for the first to finish, then re-reads the connection from the DB.
func (p *PlatformProcessor) RefreshConnection(ctx context.Context, conn store.PlatformConnection) (store.PlatformConnection, error) {
	// Serialize concurrent refreshes for the same connection
	p.refreshMu.Lock()
	if ch, ok := p.refreshing[conn.ID]; ok {
		// Another goroutine is already refreshing this connection — wait for it
		p.refreshMu.Unlock()
		select {
		case <-ch:
		case <-ctx.Done():
			return conn, ctx.Err()
		}
		// Re-read from DB to get the refreshed tokens
		updated, err := p.store.GetPlatformConnectionByID(ctx, conn.AccountID, conn.ID)
		if err != nil {
			return conn, err
		}
		return updated, nil
	}
	// Mark this connection as being refreshed
	ch := make(chan struct{})
	p.refreshing[conn.ID] = ch
	p.refreshMu.Unlock()
	defer func() {
		p.refreshMu.Lock()
		delete(p.refreshing, conn.ID)
		close(ch)
		p.refreshMu.Unlock()
	}()

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "connection_id", Value: conn.ID.String()},
		observability.Field{Key: "platform", Value: conn.Platform},
		observability.Field{Key: "operation", Value: "refresh_connection"},
	)

	// BlueSky uses app passwords — no refresh needed.
	if conn.Platform == "bluesky" {
		return conn, nil
	}

	if conn.RefreshToken == nil || *conn.RefreshToken == "" {
		return conn, ErrNoRefreshToken
	}

	var accessToken, refreshToken string
	var expiresAt *time.Time
	var err error

	switch conn.Platform {
	case "x":
		cfg, ok := p.oauthConfigs["x"]
		if !ok {
			return conn, ErrUnsupportedPlatform
		}
		accessToken, refreshToken, expiresAt, err = p.refreshXToken(ctx, conn, cfg)

	case "threads":
		var newAccessToken string
		newAccessToken, expiresAt, err = p.refreshThreadsToken(ctx, conn)
		if err == nil {
			accessToken = newAccessToken
			refreshToken = *conn.RefreshToken // Threads doesn't rotate refresh tokens
		}

	default:
		cfg, ok := p.oauthConfigs[conn.Platform]
		if !ok {
			return conn, ErrUnsupportedPlatform
		}
		accessToken, refreshToken, expiresAt, err = p.refreshOAuth2Token(ctx, conn, cfg)
	}

	if err != nil {
		if errors.Is(err, ErrTokenRevoked) {
			p.logger.Info(ctx, "token revoked, marking connection expired")
			if updateErr := p.store.UpdatePlatformConnectionStatus(ctx, conn.AccountID, conn.ID, "expired"); updateErr != nil {
				p.logger.Error(ctx, "failed to update connection status to expired", updateErr)
			}
			conn.Status = "expired"
			return conn, ErrTokenRevoked
		}
		p.logger.Error(ctx, "token refresh failed", err)
		return conn, fmt.Errorf("%w: %v", ErrTokenRefresh, err)
	}

	// Persist new tokens
	var refreshTokenPtr *string
	if refreshToken != "" {
		refreshTokenPtr = &refreshToken
	}

	if err := p.store.UpdatePlatformConnectionTokens(ctx, conn.AccountID, conn.ID, accessToken, refreshTokenPtr, expiresAt); err != nil {
		p.logger.Error(ctx, "failed to persist refreshed tokens", err)
		return conn, fmt.Errorf("%w: %v", ErrTokenRefresh, err)
	}

	// Update the in-memory connection
	conn.AccessToken = accessToken
	conn.RefreshToken = refreshTokenPtr
	conn.TokenExpiresAt = expiresAt
	conn.Status = "active"

	p.logger.Info(ctx, fmt.Sprintf("successfully refreshed %s token", conn.Platform))
	return conn, nil
}

// EnsureFreshConnection checks whether a connection's token is near expiry
// (within 5 minutes) and refreshes it if needed. Returns the connection unchanged
// if the token is still fresh or if no expiry is set.
func (p *PlatformProcessor) EnsureFreshConnection(ctx context.Context, conn store.PlatformConnection) (store.PlatformConnection, error) {
	// BlueSky uses app passwords — always fresh.
	if conn.Platform == "bluesky" {
		return conn, nil
	}

	// If no expiry is set, assume the token is valid.
	if conn.TokenExpiresAt == nil {
		return conn, nil
	}

	// Refresh if token expires within 5 minutes.
	if time.Until(*conn.TokenExpiresAt) > 5*time.Minute {
		return conn, nil
	}

	return p.RefreshConnection(ctx, conn)
}

// joinScopes joins scopes with a space separator for OAuth URL construction.
func joinScopes(scopes []string) string {
	result := ""
	for i, s := range scopes {
		if i > 0 {
			result += "%20"
		}
		result += s
	}
	return result
}
