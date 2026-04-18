package bootstrap

import (
	"base-server/internal/infra/config"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/workers"
)

// buildWorkers constructs the workers.Manager and registers all background
// workers. The Manager is stored on deps.WorkerManager.
func buildWorkers(cfg *config.Config, logger *observability.Logger, deps *Dependencies, s *store.Store, cl *clients, p *procs) {
	// Async publish pipeline: dispatcher consumes post.publish and
	// fans out per-platform onto platform.publish.requested, the
	// uploader runs each platform's StartPublish and either hands
	// media_ready rows to the finalizer or parks awaiting_media rows
	// for the reconciler to poll. Replaces the old blocking
	// PublishWorker; retry worker still handles permanent failures.
	dispatchWorker := workers.NewDispatchWorker(cfg.Kafka.Brokers, cfg.Kafka.ConsumerGroup, s, cl.kafka, logger)
	mediaUploadWorker := workers.NewMediaUploadWorker(cfg.Kafka.Brokers, cfg.Kafka.ConsumerGroup, s, cl.kafka, cl.adapterRegistry, &p.platforms, logger)
	readyReconciler := workers.NewReadyReconciler(s, cl.kafka, cl.adapterRegistry, &p.platforms, logger)
	finalizerWorker := workers.NewFinalizerWorker(cfg.Kafka.Brokers, cfg.Kafka.ConsumerGroup, s, cl.adapterRegistry, &p.platforms, logger)

	analyticsWorker := workers.NewAnalyticsWorker(cfg.Kafka.Brokers, cfg.Kafka.ConsumerGroup, s, cl.adapterRegistry, &p.platforms, logger)
	schedulerWorker := workers.NewSchedulerWorker(s, cl.kafka, logger)
	githubWorker := workers.NewGitHubWorker(cfg.Kafka.Brokers, cfg.Kafka.ConsumerGroup, logger)
	captureResultWorker := workers.NewCaptureResultWorker(cfg.Kafka.Brokers, cfg.Kafka.ConsumerGroup, s, cl.kafka, logger)
	retryWorker := workers.NewRetryWorker(s, cl.adapterRegistry, &p.platforms, logger)

	// Presign s3:// media URLs before handing them to platform adapters
	// so Bluesky/X can http.Get them and Threads accepts the image_url.
	if cl.urlSigner != nil {
		mediaUploadWorker.SetURLSigner(cl.urlSigner)
		finalizerWorker.SetURLSigner(cl.urlSigner)
		retryWorker.SetURLSigner(cl.urlSigner)
	}

	// Draft generator: consumes github.draft.generate, builds an AI draft
	// from the commit + capture artifacts, persists it through SaveDraft.
	draftGeneratorWorker := workers.NewDraftGeneratorWorker(cfg.Kafka.Brokers, cfg.Kafka.ConsumerGroup, &p.draftGen, logger)

	deps.WorkerManager = workers.NewManager(logger)
	deps.WorkerManager.Register(dispatchWorker)
	deps.WorkerManager.Register(mediaUploadWorker)
	deps.WorkerManager.Register(readyReconciler)
	deps.WorkerManager.Register(finalizerWorker)
	deps.WorkerManager.Register(analyticsWorker)
	deps.WorkerManager.Register(schedulerWorker)
	deps.WorkerManager.Register(githubWorker)
	deps.WorkerManager.Register(captureResultWorker)
	deps.WorkerManager.Register(retryWorker)
	deps.WorkerManager.Register(draftGeneratorWorker)
}

