package bootstrap

import (
	"context"
	"fmt"

	"base-server/internal/infra/config"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	// Auth & billing
	adminHandler "base-server/internal/admin/handler"
	authHandler "base-server/internal/auth/handler"
	billingHandler "base-server/internal/money/billing/handler"

	// Growth Tools handlers
	analyticsHandler "base-server/internal/analytics/handler"
	blogHandler "base-server/internal/blog/handler"
	chatHandler "base-server/internal/chat/handler"
	contentHandler "base-server/internal/content/handler"
	githubHandler "base-server/internal/github/handler"
	mediaHandler "base-server/internal/media/handler"
	platformsHandler "base-server/internal/platform/handler"
	postsHandler "base-server/internal/posts/handler"
	settingsHandler "base-server/internal/settings/handler"

	"base-server/internal/workers"
)

// Dependencies holds all initialized application dependencies
type Dependencies struct {
	// Core
	Store  store.Store
	Logger *observability.Logger

	// Workers
	WorkerManager *workers.Manager

	// Handlers
	AdminHandler     adminHandler.Handler
	AuthHandler      authHandler.Handler
	BillingHandler   billingHandler.Handler
	ContentHandler   contentHandler.Handler
	ChatHandler      chatHandler.Handler
	PlatformsHandler platformsHandler.Handler
	PostsHandler     postsHandler.Handler
	MediaHandler     mediaHandler.Handler
	GitHubHandler    githubHandler.Handler
	BlogHandler      blogHandler.Handler
	AnalyticsHandler analyticsHandler.Handler
	SettingsHandler  settingsHandler.Handler
}

// Initialize sets up all application dependencies
func Initialize(ctx context.Context, cfg *config.Config, logger *observability.Logger) (*Dependencies, error) {
	deps := &Dependencies{
		Logger: logger,
	}

	// Initialize database store
	connectionString := cfg.Database.ConnectionString()
	var err error
	deps.Store, err = store.New(connectionString, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Build all external clients (OAuth, mail, gemini, s3/localdir, kafka,
	// platform API clients, adapter registry, OAuth configs).
	cl, err := buildClients(ctx, cfg, logger)
	if err != nil {
		return nil, err
	}

	// Build all processors and services (billing, auth, content, chat,
	// platforms, posts, media, github, blog, analytics, settings, draft gen).
	p, err := buildProcessors(cfg, logger, &deps.Store, cl)
	if err != nil {
		return nil, err
	}

	// Wire processors into handlers and populate deps handler fields.
	buildHandlers(cfg, logger, deps, p, &deps.Store, cl)

	// Construct workers.Manager and register all background workers.
	buildWorkers(cfg, logger, deps, &deps.Store, cl, p)

	logger.Info(ctx, "All dependencies initialized")

	return deps, nil
}

// Cleanup closes all resources that need cleanup
func (d *Dependencies) Cleanup() {
	// Add cleanup logic as needed
}
