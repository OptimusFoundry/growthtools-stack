package workers

import (
	"context"
	"fmt"
	"time"

	"base-server/internal/infra/clients/kafka"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
)

// SchedulerStore defines store operations needed by the scheduler worker
type SchedulerStore interface {
	GetDueScheduledPosts(ctx context.Context, now time.Time) ([]store.Post, error)
}

// SchedulerWorker polls for due scheduled posts and publishes events
type SchedulerWorker struct {
	store    SchedulerStore
	producer *kafka.Producer
	logger   *observability.Logger
	interval time.Duration
}

// NewSchedulerWorker creates a new scheduler worker
func NewSchedulerWorker(schedulerStore SchedulerStore, producer *kafka.Producer, logger *observability.Logger) *SchedulerWorker {
	return &SchedulerWorker{
		store:    schedulerStore,
		producer: producer,
		logger:   logger,
		interval: 30 * time.Second,
	}
}

func (w *SchedulerWorker) Start(ctx context.Context) error {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			if err := w.processScheduled(ctx); err != nil {
				w.logger.Error(ctx, "failed to process scheduled posts", err)
			}
		}
	}
}

func (w *SchedulerWorker) processScheduled(ctx context.Context) error {
	posts, err := w.store.GetDueScheduledPosts(ctx, time.Now())
	if err != nil {
		return fmt.Errorf("failed to get due scheduled posts: %w", err)
	}

	for _, post := range posts {
		event := PublishEvent{
			PostID:    post.ID,
			AccountID: post.AccountID,
		}

		if err := w.producer.Publish(ctx, "post.publish", post.ID.String(), event); err != nil {
			w.logger.Error(ctx, fmt.Sprintf("failed to publish scheduled post %s", post.ID), err)
			continue
		}
	}

	if len(posts) > 0 {
		w.logger.Info(ctx, fmt.Sprintf("scheduled %d posts for publishing", len(posts)))
	}

	return nil
}

func (w *SchedulerWorker) Name() string {
	return "scheduler-worker"
}
