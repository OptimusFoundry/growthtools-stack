package workers

import (
	"context"
	"encoding/json"
	"fmt"

	"base-server/internal/infra/clients/kafka"
	"base-server/internal/infra/observability"
	"base-server/internal/platform/adapters"
	"base-server/internal/infra/store"

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
		return fmt.Errorf("failed to get platform post: %w", err)
	}

	if pp.PlatformPostID == nil || *pp.PlatformPostID == "" {
		w.logger.Info(ctx, "platform post has no external ID, skipping analytics")
		return nil
	}

	// Get platform connection for auth
	connections, err := w.store.ListPlatformConnectionsByAccount(ctx, event.AccountID)
	if err != nil {
		return fmt.Errorf("failed to list connections: %w", err)
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
		return fmt.Errorf("no connection found for platform %s", event.Platform)
	}

	// Ensure tokens are fresh before fetching analytics
	if w.tokenRefresher != nil {
		refreshed, refreshErr := w.tokenRefresher.EnsureFreshConnection(ctx, conn)
		if refreshErr != nil {
			return fmt.Errorf("failed to refresh token for %s: %w", event.Platform, refreshErr)
		}
		conn = refreshed
	}

	// Get adapter and fetch engagement
	adapter, err := w.registry.Get(event.Platform)
	if err != nil {
		return fmt.Errorf("adapter not found for platform %s: %w", event.Platform, err)
	}

	engagement, err := adapter.GetEngagement(ctx, *pp.PlatformPostID, conn)
	if err != nil {
		return fmt.Errorf("failed to get engagement: %w", err)
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
		return fmt.Errorf("failed to record analytics: %w", err)
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
