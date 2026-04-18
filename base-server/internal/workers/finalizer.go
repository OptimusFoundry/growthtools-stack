package workers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"base-server/internal/infra/clients/kafka"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/platform/adapters"

	"github.com/google/uuid"
)

// FinalizerWorker consumes platform.publish.ready and runs the
// adapter's Finalize phase — the actual post/tweet creation. The
// media handle has already been marked ready by either the
// MediaUploader (when readyNow was true) or the ReadyReconciler.
type FinalizerWorker struct {
	consumer       *kafka.Consumer
	store          AsyncPublishStore
	registry       *adapters.AdapterRegistry
	tokenRefresher TokenRefresher
	urlSigner      URLSigner
	logger         *observability.Logger
}

func NewFinalizerWorker(
	brokers, groupID string,
	publishStore AsyncPublishStore,
	registry *adapters.AdapterRegistry,
	tokenRefresher TokenRefresher,
	logger *observability.Logger,
) *FinalizerWorker {
	w := &FinalizerWorker{
		store:          publishStore,
		registry:       registry,
		tokenRefresher: tokenRefresher,
		logger:         logger,
	}
	w.consumer = kafka.NewConsumer(brokers, groupID, TopicPlatformPublishReady, w.handle, logger)
	return w
}

func (w *FinalizerWorker) SetURLSigner(signer URLSigner) { w.urlSigner = signer }

func (w *FinalizerWorker) handle(ctx context.Context, key, value []byte) error {
	var event asyncEvent
	if err := json.Unmarshal(value, &event); err != nil {
		return fmt.Errorf("unmarshal finalize event: %w", err)
	}
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "platform_post_id", Value: event.PlatformPostID.String()},
		observability.Field{Key: "post_id", Value: event.PostID.String()},
		observability.Field{Key: "worker", Value: "finalizer"},
	)

	pp, err := w.store.GetPlatformPostByID(ctx, event.PlatformPostID)
	if err != nil {
		return fmt.Errorf("load platform post: %w", err)
	}
	if pp.Status != store.PlatformPostStatusMediaReady {
		// Redelivery after the finalize already ran. Ignore.
		w.logger.Info(ctx, fmt.Sprintf("finalizer skip, row in state %s", pp.Status))
		return nil
	}
	post, err := w.store.GetPostByID(ctx, event.AccountID, event.PostID)
	if err != nil {
		return fmt.Errorf("load parent post: %w", err)
	}
	conn, err := lookupConnection(ctx, w.store, event.AccountID, pp.Platform)
	if err != nil {
		w.markFailed(ctx, pp, event.AccountID, fmt.Errorf("connection lookup: %w", err))
		return nil
	}
	conn, err = w.tokenRefresher.EnsureFreshConnection(ctx, conn)
	if err != nil {
		w.markFailed(ctx, pp, event.AccountID, fmt.Errorf("refresh token: %w", err))
		return nil
	}

	adapter, err := w.registry.Get(pp.Platform)
	if err != nil || adapter == nil {
		w.markFailed(ctx, pp, event.AccountID, fmt.Errorf("no adapter for platform %s: %w", pp.Platform, err))
		return nil
	}
	async, ok := adapter.(adapters.AsyncPlatformAdapter)
	if !ok {
		w.markFailed(ctx, pp, event.AccountID, fmt.Errorf("platform %s adapter is not async-capable", pp.Platform))
		return nil
	}
	spec, err := buildPostSpec(ctx, w.store, pp, post, w.urlSigner, w.logger)
	if err != nil {
		w.markFailed(ctx, pp, event.AccountID, fmt.Errorf("build spec: %w", err))
		return nil
	}

	// Flip status so retries + UI see it's in-flight while the
	// adapter's Finalize call is running.
	now := time.Now()
	attempt := pp.AttemptCount + 1
	if err := w.store.UpdatePlatformPostStatus(ctx, pp.ID, store.PlatformPostStatusPublishing, nil, nil, nil, &attempt, nil, &now); err != nil {
		w.logger.Error(ctx, "failed to mark publishing", err)
	}

	handle := pp.MediaHandle
	var rawHandle json.RawMessage
	if handle != nil {
		rawHandle = *handle
	}
	result, err := async.Finalize(ctx, spec, rawHandle, conn)
	if err != nil {
		w.markFailed(ctx, pp, event.AccountID, fmt.Errorf("Finalize: %w", err))
		return nil
	}

	publishedAt := time.Now()
	if err := w.store.UpdatePlatformPostStatus(
		ctx, pp.ID, store.PlatformPostStatusPublished,
		&result.PlatformPostID, &publishedAt, nil, &attempt, nil, &publishedAt,
	); err != nil {
		w.logger.Error(ctx, "failed to mark published", err)
	}
	reconcileParentStatus(ctx, w.store, event.AccountID, pp.PostID, w.logger)
	return nil
}

func (w *FinalizerWorker) markFailed(ctx context.Context, pp store.PlatformPost, accountID uuid.UUID, cause error) {
	w.logger.Error(ctx, "finalize phase failed", cause)
	errMsg := cause.Error()
	now := time.Now()
	attempt := pp.AttemptCount + 1
	var nextRetry *time.Time
	if attempt < pp.MaxAttempts {
		t := computeNextRetryAt(attempt)
		nextRetry = &t
	}
	_ = w.store.UpdatePlatformPostStatus(ctx, pp.ID, store.PlatformPostStatusFailed, nil, nil, &errMsg, &attempt, nextRetry, &now)
	reconcileParentStatus(ctx, w.store, accountID, pp.PostID, w.logger)
}

// Start runs the consumer loop.
func (w *FinalizerWorker) Start(ctx context.Context) error { return w.consumer.Start(ctx) }

func (w *FinalizerWorker) Name() string { return "finalizer-worker" }
