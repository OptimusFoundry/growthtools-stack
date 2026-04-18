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
)

// MediaUploadWorker consumes platform.publish.requested — one message
// per (post, platform) — and runs the adapter's StartPublish phase.
// For platforms that implement AsyncPlatformAdapter the upload is
// non-blocking: handle persisted to platform_posts.media_handle, then
// either (a) readyNow → emit platform.publish.ready immediately or
// (b) leave status=awaiting_media for the reconciler to pick up.
// Platforms that don't implement the async interface fall back to the
// blocking Publish/PublishThread path inline — same single-shot
// semantics as the legacy publish worker, just routed through the
// new dispatcher.
type MediaUploadWorker struct {
	consumer       *kafka.Consumer
	publisher      EventPublisher
	store          AsyncPublishStore
	registry       *adapters.AdapterRegistry
	tokenRefresher TokenRefresher
	urlSigner      URLSigner
	logger         *observability.Logger
}

func NewMediaUploadWorker(
	brokers, groupID string,
	publishStore AsyncPublishStore,
	publisher EventPublisher,
	registry *adapters.AdapterRegistry,
	tokenRefresher TokenRefresher,
	logger *observability.Logger,
) *MediaUploadWorker {
	w := &MediaUploadWorker{
		publisher:      publisher,
		store:          publishStore,
		registry:       registry,
		tokenRefresher: tokenRefresher,
		logger:         logger,
	}
	w.consumer = kafka.NewConsumer(brokers, groupID, TopicPlatformPublishRequested, w.handle, logger)
	return w
}

func (w *MediaUploadWorker) SetURLSigner(signer URLSigner) { w.urlSigner = signer }

func (w *MediaUploadWorker) handle(ctx context.Context, key, value []byte) error {
	var event asyncEvent
	if err := json.Unmarshal(value, &event); err != nil {
		return fmt.Errorf("unmarshal upload event: %w", err)
	}
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "platform_post_id", Value: event.PlatformPostID.String()},
		observability.Field{Key: "post_id", Value: event.PostID.String()},
		observability.Field{Key: "worker", Value: "media-uploader"},
	)

	pp, err := w.store.GetPlatformPostByID(ctx, event.PlatformPostID)
	if err != nil {
		return fmt.Errorf("load platform post: %w", err)
	}
	// Only pick up rows the dispatcher just queued — guard against
	// redelivery after a successful upload.
	if pp.Status != store.PlatformPostStatusQueued {
		w.logger.Info(ctx, fmt.Sprintf("skipping upload, platform post in unexpected state %s", pp.Status))
		return nil
	}
	post, err := w.store.GetPostByID(ctx, event.AccountID, event.PostID)
	if err != nil {
		return fmt.Errorf("load parent post: %w", err)
	}
	conn, err := lookupConnection(ctx, w.store, event.AccountID, pp.Platform)
	if err != nil {
		w.markFailed(ctx, pp, fmt.Errorf("connection lookup: %w", err))
		return nil
	}
	conn, err = w.tokenRefresher.EnsureFreshConnection(ctx, conn)
	if err != nil {
		w.markFailed(ctx, pp, fmt.Errorf("refresh token: %w", err))
		return nil
	}

	adapter, err := w.registry.Get(pp.Platform)
	if err != nil || adapter == nil {
		w.markFailed(ctx, pp, fmt.Errorf("no adapter for platform %s: %w", pp.Platform, err))
		return nil
	}
	spec, err := buildPostSpec(ctx, w.store, pp, post, w.urlSigner, w.logger)
	if err != nil {
		w.markFailed(ctx, pp, fmt.Errorf("build spec: %w", err))
		return nil
	}

	async, ok := adapter.(adapters.AsyncPlatformAdapter)
	if !ok {
		// Legacy synchronous path: do the whole publish inline. Same
		// behaviour as the old PublishWorker for platforms that
		// haven't adopted the async interface.
		w.publishSynchronously(ctx, pp, adapter, spec, conn)
		return nil
	}

	handle, readyNow, err := async.StartPublish(ctx, spec, conn)
	if err != nil {
		w.markFailed(ctx, pp, fmt.Errorf("StartPublish: %w", err))
		return nil
	}

	if readyNow {
		// Short-circuit the reconciler — hand to the finalizer.
		if err := w.store.SetPlatformPostMediaReady(ctx, pp.ID, handle); err != nil {
			w.markFailed(ctx, pp, fmt.Errorf("mark media_ready: %w", err))
			return nil
		}
		msg := asyncEvent{PlatformPostID: pp.ID, PostID: pp.PostID, AccountID: event.AccountID}
		if err := w.publisher.Publish(ctx, TopicPlatformPublishReady, pp.ID.String(), msg); err != nil {
			w.logger.Error(ctx, "failed to emit platform.publish.ready", err)
		}
		return nil
	}

	// Async: park the row for the reconciler.
	if err := w.store.SetPlatformPostAwaitingMedia(ctx, pp.ID, handle); err != nil {
		w.markFailed(ctx, pp, fmt.Errorf("mark awaiting_media: %w", err))
		return nil
	}
	w.logger.Info(ctx, fmt.Sprintf("platform post %s awaiting media", pp.ID))
	return nil
}

func (w *MediaUploadWorker) publishSynchronously(
	ctx context.Context,
	pp store.PlatformPost,
	adapter adapters.PlatformAdapter,
	spec adapters.PostSpec,
	conn store.PlatformConnection,
) {
	var result adapters.PlatformPostResult
	var err error
	if len(spec.Segments) > 0 {
		result, err = adapter.PublishThread(ctx, spec.Segments, spec.MediaURLs, conn)
	} else {
		result, err = adapter.Publish(ctx, spec.Content, spec.MediaURLs, conn)
	}
	if err != nil {
		w.markFailed(ctx, pp, fmt.Errorf("synchronous publish: %w", err))
		return
	}
	now := time.Now()
	attempt := pp.AttemptCount + 1
	if err := w.store.UpdatePlatformPostStatus(ctx, pp.ID, store.PlatformPostStatusPublished, &result.PlatformPostID, &now, nil, &attempt, nil, &now); err != nil {
		w.logger.Error(ctx, "failed to mark platform post published", err)
	}
	reconcileParentStatus(ctx, w.store, conn.AccountID, pp.PostID, w.logger)
}

func (w *MediaUploadWorker) markFailed(ctx context.Context, pp store.PlatformPost, cause error) {
	w.logger.Error(ctx, "upload phase failed", cause)
	errMsg := cause.Error()
	now := time.Now()
	attempt := pp.AttemptCount + 1
	retry := now.Add(time.Minute)
	_ = w.store.UpdatePlatformPostStatus(ctx, pp.ID, store.PlatformPostStatusFailed, nil, nil, &errMsg, &attempt, &retry, &now)
}

// Start runs the consumer loop.
func (w *MediaUploadWorker) Start(ctx context.Context) error { return w.consumer.Start(ctx) }

func (w *MediaUploadWorker) Name() string { return "media-upload-worker" }
