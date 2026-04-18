package processor

import (
	"context"
	"errors"
	"fmt"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

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
