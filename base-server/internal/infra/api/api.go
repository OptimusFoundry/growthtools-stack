package api

import (
	"net/http"

	adminHandler "base-server/internal/admin/handler"
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

	"github.com/gin-gonic/gin"
)

type API struct {
	router           *gin.RouterGroup
	adminHandler     adminHandler.Handler
	authHandler      authHandler.Handler
	billingHandler   billingHandler.Handler
	contentHandler   contentHandler.Handler
	chatHandler      chatHandler.Handler
	platformsHandler platformsHandler.Handler
	postsHandler     postsHandler.Handler
	mediaHandler     mediaHandler.Handler
	githubHandler    githubHandler.Handler
	blogHandler      blogHandler.Handler
	analyticsHandler analyticsHandler.Handler
	settingsHandler  settingsHandler.Handler
}

func New(
	router *gin.RouterGroup,
	adminHandler adminHandler.Handler,
	authHandler authHandler.Handler,
	billingHandler billingHandler.Handler,
	contentHandler contentHandler.Handler,
	chatHandler chatHandler.Handler,
	platformsHandler platformsHandler.Handler,
	postsHandler postsHandler.Handler,
	mediaHandler mediaHandler.Handler,
	githubHandler githubHandler.Handler,
	blogHandler blogHandler.Handler,
	analyticsHandler analyticsHandler.Handler,
	settingsHandler settingsHandler.Handler,
) API {
	return API{
		router:           router,
		adminHandler:     adminHandler,
		authHandler:      authHandler,
		billingHandler:   billingHandler,
		contentHandler:   contentHandler,
		chatHandler:      chatHandler,
		platformsHandler: platformsHandler,
		postsHandler:     postsHandler,
		mediaHandler:     mediaHandler,
		githubHandler:    githubHandler,
		blogHandler:      blogHandler,
		analyticsHandler: analyticsHandler,
		settingsHandler:  settingsHandler,
	}
}

func (a *API) RegisterRoutes() {
	a.Health()
	apiGroup := a.router.Group("/api")
	{
		// Auth routes (public)
		authGroup := apiGroup.Group("/auth")
		authGroup.POST("/login/email", a.authHandler.HandleEmailLogin)
		authGroup.POST("/signup/email", a.authHandler.HandleEmailSignup)
		authGroup.GET("/google/callback", a.authHandler.HandleGoogleOauthCallback)

		// Hidden login endpoint for Playwright/E2E automation. Sets the
		// session cookie directly so browser tests can authenticate without
		// going through Google OAuth.
		authGroup.POST("/test/login", a.authHandler.HandleTestLogin)

		// GitHub webhook (public, uses signature validation)
		apiGroup.POST("/github/webhook", a.githubHandler.HandleWebhook)

		// GitHub OAuth callback (public — OAuth redirects cannot carry JWT)
		apiGroup.GET("/github/oauth/callback", a.githubHandler.HandleOAuthCallback)

		// Platform OAuth callback (public — OAuth redirects can't carry JWT)
		apiGroup.GET("/platforms/oauth/callback/:platform", a.platformsHandler.HandleOAuthCallback)

		// Meta platform webhook placeholders (required by Meta app review)
		apiGroup.POST("/platforms/webhooks/:platform/uninstall", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"success": true})
		})
		apiGroup.POST("/platforms/webhooks/:platform/delete", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"success": true})
		})

		// Public media file fetch — required so external platforms (Threads,
		// Instagram) can fetch media by URL. Root-level, not under /api.
		a.router.GET("/public/media/file/*key", a.mediaHandler.HandlePublicGetFile)
	}

	// Protected routes (JWT required)
	protectedGroup := apiGroup.Group("/protected", a.authHandler.HandleJWTMiddleware)
	{
		protectedGroup.GET("/user", a.authHandler.GetUserInfo)

		// Billing routes
		protectedGroup.GET("billing/subscription", a.billingHandler.HandleGetSubscription)
		protectedGroup.DELETE("billing/cancel-subscription", a.billingHandler.HandleCancelSubscription)
		protectedGroup.POST("billing/create-customer-portal", a.billingHandler.HandleCreateCustomerPortal)
		protectedGroup.POST("billing/create-checkout-session", a.billingHandler.HandleCreateCheckoutSession)
		protectedGroup.GET("billing/checkout-session", a.billingHandler.GetCheckoutSession)

		// Posts
		protectedGroup.POST("/posts/draft", a.postsHandler.HandleSaveDraft)
		protectedGroup.POST("/posts", a.postsHandler.HandleCreatePost)
		protectedGroup.GET("/posts", a.postsHandler.HandleListPosts)
		protectedGroup.GET("/posts/calendar", a.postsHandler.HandleGetCalendarMonth) // must be before /:id
		protectedGroup.GET("/posts/:id", a.postsHandler.HandleGetPost)
		protectedGroup.PUT("/posts/:id", a.postsHandler.HandleUpdatePost)
		protectedGroup.DELETE("/posts/:id", a.postsHandler.HandleDeletePost)
		protectedGroup.DELETE("/posts/:id/media/:mediaID", a.postsHandler.HandleUnlinkMedia)
		protectedGroup.GET("/posts/:id/details", a.postsHandler.HandleGetPostDetails)
		protectedGroup.GET("/posts/:id/analytics", a.postsHandler.HandleGetPostAnalytics)
		protectedGroup.PUT("/posts/:id/draft", a.postsHandler.HandleUpdateDraft)
		protectedGroup.POST("/posts/:id/publish", a.postsHandler.HandlePublishPost)
		protectedGroup.POST("/posts/:id/retry", a.postsHandler.HandleRetryPost)
		protectedGroup.POST("/posts/:id/schedule", a.postsHandler.HandleSchedulePost)

		// Content generation
		protectedGroup.POST("/content/generate/stream", a.contentHandler.HandleStreamGenerate)

		// AI Chat
		protectedGroup.POST("/ai/conversation", a.chatHandler.HandleChat)
		protectedGroup.GET("/ai/conversations", a.chatHandler.HandleGetConversations)
		protectedGroup.GET("/ai/conversations/:id", a.chatHandler.HandleGetConversation)
		protectedGroup.DELETE("/ai/conversations/:id", a.chatHandler.HandleDeleteConversation)

		// Platform connections
		protectedGroup.GET("/platforms", a.platformsHandler.HandleListConnections)
		protectedGroup.POST("/platforms/oauth/init", a.platformsHandler.HandleInitiateOAuth)
		protectedGroup.POST("/platforms/bluesky", a.platformsHandler.HandleConnectBluesky)
		protectedGroup.POST("/platforms/token", a.platformsHandler.HandleConnectWithToken)
		protectedGroup.DELETE("/platforms/:id", a.platformsHandler.HandleDisconnect)

		// Media
		protectedGroup.POST("/media", a.mediaHandler.HandleUpload)
		protectedGroup.GET("/media", a.mediaHandler.HandleList)
		protectedGroup.DELETE("/media/:id", a.mediaHandler.HandleDelete)
		protectedGroup.GET("/media/:id/file", a.mediaHandler.HandleGetFile)

		// Analytics
		protectedGroup.GET("/analytics/overview", a.analyticsHandler.HandleGetOverview)
		protectedGroup.GET("/analytics/timeseries", a.analyticsHandler.HandleGetTimeSeries)
		protectedGroup.GET("/analytics/platforms", a.analyticsHandler.HandleGetPlatformBreakdown)

		// Blog
		protectedGroup.GET("/blogs", a.blogHandler.HandleListBlogs)
		protectedGroup.POST("/blog", a.blogHandler.HandleCreateBlog)
		protectedGroup.POST("/blog/generate/stream", a.blogHandler.HandleStreamGenerateBlog)
		protectedGroup.POST("/blog/generate", a.blogHandler.HandleGenerateBlog)
		protectedGroup.GET("/blog/:id", a.blogHandler.HandleGetBlog)
		protectedGroup.PUT("/blog/:id", a.blogHandler.HandleUpdateBlog)
		protectedGroup.DELETE("/blog/:id", a.blogHandler.HandleDeleteBlog)
		protectedGroup.POST("/blog/:id/publish", a.blogHandler.HandlePublishBlog)

		// Settings
		protectedGroup.GET("/settings/voice", a.settingsHandler.HandleGetVoiceProfile)
		protectedGroup.PUT("/settings/voice", a.settingsHandler.HandleUpdateVoiceProfile)

		// GitHub OAuth + repo management
		protectedGroup.GET("/github/oauth/init", a.githubHandler.HandleInitOAuth)
		protectedGroup.GET("/github/connection", a.githubHandler.HandleGetConnection)
		protectedGroup.DELETE("/github/connection", a.githubHandler.HandleDisconnect)
		protectedGroup.GET("/github/repos", a.githubHandler.HandleListAvailableRepos)
		protectedGroup.POST("/github/repos/:owner/:name/connect", a.githubHandler.HandleConnectRepo)
		protectedGroup.DELETE("/github/repos/:owner/:name", a.githubHandler.HandleDisconnectRepo)
		protectedGroup.GET("/github/commits", a.githubHandler.HandleListCommits)
		protectedGroup.GET("/github/commits/:id", a.githubHandler.HandleGetCommit)
		protectedGroup.POST("/github/commits/:id/retry-capture", a.githubHandler.HandleRetryCapture)

	}

	// Admin routes — gated by HandleAdminMiddleware (empty allowlist → 403 all)
	adminGroup := protectedGroup.Group("/admin", a.adminHandler.HandleAdminMiddleware)
	adminGroup.GET("/users", a.adminHandler.SearchUsers)
	adminGroup.POST("/impersonate/:user_id", a.adminHandler.StartImpersonation)
	adminGroup.DELETE("/impersonate", a.adminHandler.StopImpersonation)

	// Public billing endpoints
	apiGroup.GET("billing/plans", a.billingHandler.ListPrices)
	apiGroup.POST("billing/webhook", a.billingHandler.HandleWebhook)
}

func (a *API) Health() {
	a.router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})
}
