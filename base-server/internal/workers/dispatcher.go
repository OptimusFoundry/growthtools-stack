package workers

import (
	"context"
	"encoding/json"
	"fmt"

	"base-server/internal/infra/clients/kafka"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// DispatchWorker consumes post.publish (the external entry point) and
// fans it out to platform.publish.requested — one message per platform
// connected to the post. Keeps the entry topic contract stable (so
// web + scheduler clients don't change) while letting the downstream
// workers operate per-platform.
type DispatchWorker struct {
	consumer  *kafka.Consumer
	publisher EventPublisher
	store     AsyncPublishStore
	logger    *observability.Logger
}

// NewDispatchWorker wires a consumer for post.publish.
func NewDispatchWorker(
	brokers, groupID string,
	publishStore AsyncPublishStore,
	publisher EventPublisher,
	logger *observability.Logger,
) *DispatchWorker {
	w := &DispatchWorker{
		publisher: publisher,
		store:     publishStore,
		logger:    logger,
	}
	w.consumer = kafka.NewConsumer(brokers, groupID, "post.publish", w.handle, logger)
	return w
}

func (w *DispatchWorker) handle(ctx context.Context, key, value []byte) error {
	var event PublishEvent
	if err := json.Unmarshal(value, &event); err != nil {
		return fmt.Errorf("failed to unmarshal publish event: %w", err)
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "post_id", Value: event.PostID.String()},
		observability.Field{Key: "account_id", Value: event.AccountID.String()},
		observability.Field{Key: "worker", Value: "dispatcher"},
	)

	// Verify the post exists + belongs to the account. Cheap guard
	// against stale events from before a post was deleted.
	if _, err := w.store.GetPostByID(ctx, event.AccountID, event.PostID); err != nil {
		return fmt.Errorf("dispatcher: load post: %w", err)
	}
	platformPosts, err := w.store.GetPlatformPostsByPostID(ctx, event.PostID)
	if err != nil {
		return fmt.Errorf("dispatcher: load platform posts: %w", err)
	}

	for _, pp := range platformPosts {
		// Skip anything already in-flight or done. Retries re-enter
		// the pipeline through their own path, not a fresh
		// post.publish event.
		if pp.Status != store.PlatformPostStatusPending {
			continue
		}

		if err := w.store.SetPlatformPostQueued(ctx, pp.ID); err != nil {
			w.logger.Error(ctx, fmt.Sprintf("failed to mark %s queued", pp.ID), err)
			continue
		}

		msg := asyncEvent{
			PlatformPostID: pp.ID,
			PostID:         pp.PostID,
			AccountID:      event.AccountID,
		}
		if err := w.publisher.Publish(ctx, TopicPlatformPublishRequested, pp.ID.String(), msg); err != nil {
			w.logger.Error(ctx, fmt.Sprintf("failed to enqueue %s for upload", pp.ID), err)
		}
	}
	return nil
}

// Start runs the consumer loop.
func (w *DispatchWorker) Start(ctx context.Context) error { return w.consumer.Start(ctx) }

// Name reports the worker name for the manager's log lines.
func (w *DispatchWorker) Name() string { return "dispatch-worker" }

// Guard so `uuid` import stays necessary if the struct ever changes.
var _ = uuid.Nil
