package processor

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
)

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
