package workers

import (
	"context"
	"errors"
	"fmt"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/platform/adapters"
)

// ReadyReconciler is the ticker that drives awaiting_media →
// media_ready. Polls the DB (not Kafka — Kafka has no native delayed
// delivery) and dispatches each row to its platform adapter's
// CheckReady. Done rows emit platform.publish.ready; still-pending
// rows stay put for the next tick.
//
// Single worker, N platforms — the adapter registry dispatches by the
// platform column so we don't need per-platform workers. Scale-out
// later by sharding on `platform` if one becomes hot.
type ReadyReconciler struct {
	store     AsyncPublishStore
	publisher EventPublisher
	registry  *adapters.AdapterRegistry
	tokenRefresher TokenRefresher
	logger    *observability.Logger
	interval  time.Duration
	batchSize int
	// stuckAfter is the overall deadline for a single row to reach
	// media_ready. Past this, the row is marked failed — stops a
	// stuck transcode from wedging the pipeline.
	stuckAfter time.Duration
}

func NewReadyReconciler(
	publishStore AsyncPublishStore,
	publisher EventPublisher,
	registry *adapters.AdapterRegistry,
	tokenRefresher TokenRefresher,
	logger *observability.Logger,
) *ReadyReconciler {
	return &ReadyReconciler{
		store:          publishStore,
		publisher:      publisher,
		registry:       registry,
		tokenRefresher: tokenRefresher,
		logger:         logger,
		interval:       5 * time.Second,
		batchSize:      50,
		stuckAfter:     3 * time.Minute,
	}
}

func (w *ReadyReconciler) Start(ctx context.Context) error {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			if err := w.tick(ctx); err != nil {
				w.logger.Error(ctx, "ready reconciler tick failed", err)
			}
		}
	}
}

func (w *ReadyReconciler) tick(ctx context.Context) error {
	rows, err := w.store.ListPlatformPostsAwaitingMedia(ctx, w.batchSize)
	if err != nil {
		return fmt.Errorf("list awaiting_media: %w", err)
	}
	for _, row := range rows {
		w.advance(ctx, row)
	}
	return nil
}

func (w *ReadyReconciler) advance(ctx context.Context, row store.RetryablePlatformPost) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "platform_post_id", Value: row.ID.String()},
		observability.Field{Key: "platform", Value: row.Platform},
		observability.Field{Key: "worker", Value: "ready-reconciler"},
	)

	// Overall deadline — if a row has been in awaiting_media longer
	// than stuckAfter, stop polling and fail it so the parent can
	// settle.
	if time.Since(row.UpdatedAt) > w.stuckAfter {
		w.fail(ctx, row, errors.New("media processing exceeded stuck-after deadline"))
		return
	}

	adapter, err := w.registry.Get(row.Platform)
	if err != nil || adapter == nil {
		w.fail(ctx, row, fmt.Errorf("no adapter for platform %s: %w", row.Platform, err))
		return
	}
	async, ok := adapter.(adapters.AsyncPlatformAdapter)
	if !ok {
		w.fail(ctx, row, fmt.Errorf("platform %s adapter is not async-capable", row.Platform))
		return
	}
	conn, err := lookupConnection(ctx, w.store, row.AccountID, row.Platform)
	if err != nil {
		w.fail(ctx, row, fmt.Errorf("connection lookup: %w", err))
		return
	}
	conn, err = w.tokenRefresher.EnsureFreshConnection(ctx, conn)
	if err != nil {
		w.fail(ctx, row, fmt.Errorf("refresh token: %w", err))
		return
	}

	handle := row.MediaHandle
	if handle == nil {
		w.fail(ctx, row, errors.New("missing media_handle on awaiting_media row"))
		return
	}
	ready, updated, err := async.CheckReady(ctx, *handle, conn)
	if err != nil {
		w.fail(ctx, row, fmt.Errorf("CheckReady: %w", err))
		return
	}
	if !ready {
		// Persist the updated handle (e.g. X's refreshed
		// processing_info) so the next tick reads the latest state.
		if err := w.store.SetPlatformPostAwaitingMedia(ctx, row.ID, updated); err != nil {
			w.logger.Error(ctx, "failed to persist updated handle", err)
		}
		return
	}

	if err := w.store.SetPlatformPostMediaReady(ctx, row.ID, updated); err != nil {
		w.logger.Error(ctx, "failed to mark media_ready", err)
		return
	}
	msg := asyncEvent{PlatformPostID: row.ID, PostID: row.PostID, AccountID: row.AccountID}
	if err := w.publisher.Publish(ctx, TopicPlatformPublishReady, row.ID.String(), msg); err != nil {
		w.logger.Error(ctx, "failed to emit platform.publish.ready", err)
	}
}

func (w *ReadyReconciler) fail(ctx context.Context, row store.RetryablePlatformPost, cause error) {
	w.logger.Error(ctx, "reconciler failing platform post", cause)
	errMsg := cause.Error()
	now := time.Now()
	attempt := row.AttemptCount + 1
	var nextRetry *time.Time
	if attempt < row.MaxAttempts {
		t := computeNextRetryAt(attempt)
		nextRetry = &t
	}
	_ = w.store.UpdatePlatformPostStatus(ctx, row.ID, store.PlatformPostStatusFailed, nil, nil, &errMsg, &attempt, nextRetry, &now)
	reconcileParentStatus(ctx, w.store, row.AccountID, row.PostID, w.logger)
}

func (w *ReadyReconciler) Name() string { return "ready-reconciler" }
