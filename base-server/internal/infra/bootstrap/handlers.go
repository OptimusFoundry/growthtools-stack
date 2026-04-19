package bootstrap

import (
	"base-server/internal/infra/config"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	authHandler "base-server/internal/auth/handler"
	billingHandler "base-server/internal/billing/handler"

	analyticsHandler "base-server/internal/analytics/handler"
	blogHandler "base-server/internal/blog/handler"
	chatHandler "base-server/internal/chat/handler"
	contentHandler "base-server/internal/content/handler"
	githubHandler "base-server/internal/github/handler"
	mediaHandler "base-server/internal/media/handler"
	platformsHandler "base-server/internal/platform/handler"
	postsHandler "base-server/internal/posts/handler"
	settingsHandler "base-server/internal/settings/handler"
)

// buildHandlers wires processors into handler structs and populates the
// handler fields on deps.
func buildHandlers(cfg *config.Config, logger *observability.Logger, deps *Dependencies, p *procs, s *store.Store, cl *clients) {
	deps.BillingHandler = billingHandler.New(p.billing, logger)
	deps.AuthHandler = authHandler.New(p.auth, p.tierService, logger)
	deps.ContentHandler = contentHandler.New(&p.content, logger)
	deps.ChatHandler = chatHandler.New(&p.chat, logger)
	deps.PlatformsHandler = platformsHandler.New(&p.platforms, logger, cfg.Services.WebAppURI)
	deps.PostsHandler = postsHandler.New(&p.posts, logger)
	deps.MediaHandler = mediaHandler.New(&p.media, logger)
	deps.GitHubHandler = githubHandler.New(&p.github, cfg.Services.WebAppURI, logger)
	deps.BlogHandler = blogHandler.New(&p.blog, logger)
	deps.AnalyticsHandler = analyticsHandler.New(&p.analytics, logger)
	deps.SettingsHandler = settingsHandler.New(&p.settings, logger)
}
