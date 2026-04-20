package workers

import (
	"context"
	"fmt"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
)

// AnalyticsProducerStore defines the store operations needed by the analytics producer worker.
type AnalyticsProducerStore interface {
	GetPublishedPlatformPostsForAnalytics(ctx context.Context, cutoff time.Time) ([]store.RetryablePlatformPost, error)
}

// analyticsEventPublisher is the minimal Kafka interface used by this worker.
// Satisfied by *kafka.Producer.
type analyticsEventPublisher interface {
	Publish(ctx context.Context, topic, key string, payload any) error
}

// AnalyticsProducerWorker periodically finds published platform posts and emits
// analytics.collect Kafka events for the AnalyticsWorker to consume.
type AnalyticsProducerWorker struct {
	store    AnalyticsProducerStore
	producer analyticsEventPublisher
	logger   *observability.Logger
	interval time.Duration
}

// NewAnalyticsProducerWorker creates a new analytics producer worker.
func NewAnalyticsProducerWorker(s AnalyticsProducerStore, producer analyticsEventPublisher, logger *observability.Logger) *AnalyticsProducerWorker {
	return &AnalyticsProducerWorker{
		store:    s,
		producer: producer,
		logger:   logger,
		interval: 1 * time.Hour,
	}
}

func (w *AnalyticsProducerWorker) Start(ctx context.Context) error {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			if err := w.processAnalytics(ctx); err != nil {
				w.logger.Error(ctx, "failed to process analytics collection", err)
			}
		}
	}
}

func (w *AnalyticsProducerWorker) processAnalytics(ctx context.Context) error {
	cutoff := time.Now().UTC().Add(-7 * 24 * time.Hour)

	posts, err := w.store.GetPublishedPlatformPostsForAnalytics(ctx, cutoff)
	if err != nil {
		return fmt.Errorf("failed to get published platform posts for analytics: %w", err)
	}

	for _, pp := range posts {
		event := AnalyticsCollectEvent{
			AccountID:      pp.AccountID,
			PlatformPostID: pp.ID,
			Platform:       pp.Platform,
		}

		if err := w.producer.Publish(ctx, "analytics.collect", pp.ID.String(), event); err != nil {
			w.logger.Error(ctx, fmt.Sprintf("failed to publish analytics.collect for platform post %s", pp.ID), err)
			continue
		}
	}

	if len(posts) > 0 {
		w.logger.Info(ctx, fmt.Sprintf("queued %d platform posts for analytics collection", len(posts)))
	}

	return nil
}

func (w *AnalyticsProducerWorker) Name() string {
	return "analytics-producer-worker"
}
