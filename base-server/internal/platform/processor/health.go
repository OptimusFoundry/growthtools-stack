package processor

import (
	"context"
	"fmt"
	"sync"
	"time"

	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

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
