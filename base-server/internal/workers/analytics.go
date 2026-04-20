package workers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"base-server/internal/infra/clients/kafka"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/platform/adapters"

	"github.com/google/uuid"
)

// AnalyticsCollectEvent represents an analytics.collect Kafka event
type AnalyticsCollectEvent struct {
	AccountID      uuid.UUID `json:"account_id"`
	PlatformPostID uuid.UUID `json:"platform_post_id"`
	Platform       string    `json:"platform"`
}

// AnalyticsStore defines store operations needed by the analytics worker
type AnalyticsStore interface {
	GetPlatformPostByID(ctx context.Context, id uuid.UUID) (store.PlatformPost, error)
	ListPlatformConnectionsByAccount(ctx context.Context, accountID uuid.UUID) ([]store.PlatformConnection, error)
	RecordPostAnalytics(ctx context.Context, params store.RecordPostAnalyticsParams) (store.PostAnalytics, error)
	MarkPlatformPostAnalyticsUnavailable(ctx context.Context, id uuid.UUID) error
}

// AnalyticsWorker consumes analytics.collect events and pulls metrics from platforms
type AnalyticsWorker struct {
	consumer       *kafka.Consumer
	store          AnalyticsStore
	registry       *adapters.AdapterRegistry
	tokenRefresher TokenRefresher
	logger         *observability.Logger
}

// NewAnalyticsWorker creates a new analytics collection worker
func NewAnalyticsWorker(brokers, groupID string, analyticsStore AnalyticsStore, registry *adapters.AdapterRegistry, tokenRefresher TokenRefresher, logger *observability.Logger) *AnalyticsWorker {
	w := &AnalyticsWorker{
		store:          analyticsStore,
		registry:       registry,
		tokenRefresher: tokenRefresher,
		logger:         logger,
	}

	w.consumer = kafka.NewConsumer(brokers, groupID, "analytics.collect", w.handle, logger)
	return w
}

func (w *AnalyticsWorker) handle(ctx context.Context, key, value []byte) error {
	var event AnalyticsCollectEvent
	if err := json.Unmarshal(value, &event); err != nil {
		return fmt.Errorf("failed to unmarshal analytics event: %w", err)
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "platform_post_id", Value: event.PlatformPostID.String()},
		observability.Field{Key: "platform", Value: event.Platform},
	)

	w.logger.Info(ctx, fmt.Sprintf("collecting analytics for platform post %s on %s", event.PlatformPostID, event.Platform))

	// Get the platform post to find the platform-specific post ID
	pp, err := w.store.GetPlatformPostByID(ctx, event.PlatformPostID)
	if err != nil {
		w.logger.Error(ctx, "failed to get platform post for analytics", err)
		return nil
	}

	if pp.PlatformPostID == nil || *pp.PlatformPostID == "" {
		w.logger.Info(ctx, "platform post has no external ID, skipping analytics")
		return nil
	}

	// Get platform connection for auth
	connections, err := w.store.ListPlatformConnectionsByAccount(ctx, event.AccountID)
	if err != nil {
		w.logger.Error(ctx, "failed to list connections for analytics", err)
		return nil
	}

	var conn store.PlatformConnection
	found := false
	for _, c := range connections {
		if c.Platform == event.Platform {
			conn = c
			found = true
			break
		}
	}
	if !found {
		w.logger.Info(ctx, fmt.Sprintf("no connection found for platform %s, skipping analytics", event.Platform))
		return nil
	}

	// Ensure tokens are fresh before fetching analytics
	if w.tokenRefresher != nil {
		refreshed, refreshErr := w.tokenRefresher.EnsureFreshConnection(ctx, conn)
		if refreshErr != nil {
			w.logger.Error(ctx, fmt.Sprintf("failed to refresh token for %s, skipping analytics", event.Platform), refreshErr)
			return nil
		}
		conn = refreshed
	}

	// Get adapter and fetch engagement
	adapter, err := w.registry.Get(event.Platform)
	if err != nil {
		w.logger.Error(ctx, fmt.Sprintf("adapter not found for platform %s, skipping analytics", event.Platform), err)
		return nil
	}

	engagement, err := adapter.GetEngagement(ctx, *pp.PlatformPostID, conn)
	if err != nil {
		if errors.Is(err, adapters.ErrPostNotFound) {
			w.logger.Info(ctx, fmt.Sprintf("platform post not found on %s; marking analytics unavailable", event.Platform))
			if markErr := w.store.MarkPlatformPostAnalyticsUnavailable(ctx, event.PlatformPostID); markErr != nil {
				w.logger.Error(ctx, "failed to mark analytics unavailable", markErr)
			}
			return nil
		}
		w.logger.Error(ctx, "failed to get engagement for analytics", err)
		return nil
	}

	// Record analytics
	_, err = w.store.RecordPostAnalytics(ctx, store.RecordPostAnalyticsParams{
		PlatformPostID: event.PlatformPostID,
		Platform:       event.Platform,
		Impressions:    engagement.Impressions,
		Likes:          engagement.Likes,
		Comments:       engagement.Comments,
		Shares:         engagement.Shares,
		Clicks:         engagement.Clicks,
	})
	if err != nil {
		w.logger.Error(ctx, "failed to record analytics", err)
		return nil
	}

	w.logger.Info(ctx, fmt.Sprintf("recorded analytics for %s: impressions=%d, likes=%d", event.Platform, engagement.Impressions, engagement.Likes))

	return nil
}

func (w *AnalyticsWorker) Start(ctx context.Context) error {
	return w.consumer.Start(ctx)
}

func (w *AnalyticsWorker) Name() string {
	return "analytics-worker"
}
