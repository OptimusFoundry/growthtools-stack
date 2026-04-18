package processor

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

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

// joinScopes joins scopes with a space separator for OAuth URL construction.
func joinScopes(scopes []string) string {
	return strings.Join(scopes, " ")
}
