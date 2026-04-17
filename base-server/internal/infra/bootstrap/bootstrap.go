package bootstrap

import (
	"context"
	"fmt"
	"os"

	"base-server/internal/infra/config"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	// Auth & billing
	authHandler "base-server/internal/auth/handler"
	authProcessor "base-server/internal/auth/processor"
	"base-server/internal/infra/clients/googleoauth"
	"base-server/internal/infra/clients/mail"
	"base-server/internal/infra/email"
	billingHandler "base-server/internal/billing/handler"
	billingProcessor "base-server/internal/billing/processor"
	"base-server/internal/billing/products"
	"base-server/internal/billing/subscriptions"
	"base-server/internal/infra/tiers"

	// Growth Tools clients
	githubclient "base-server/internal/infra/clients/github"
	"base-server/internal/infra/clients/gemini"
	"base-server/internal/platform/clients/bluesky"
	"base-server/internal/platform/clients/facebook"
	"base-server/internal/platform/clients/instagram"
	"base-server/internal/infra/clients/kafka"
	"base-server/internal/platform/clients/linkedin"
	"base-server/internal/platform/clients/pinterest"
	"base-server/internal/infra/clients/localdir"
	"base-server/internal/infra/clients/s3"
	"base-server/internal/platform/clients/threads"
	"base-server/internal/platform/clients/tiktok"
	"base-server/internal/platform/clients/x"

	// Growth Tools handlers & processors
	analyticsHandler "base-server/internal/analytics/handler"
	analyticsProcessor "base-server/internal/analytics/processor"
	blogHandler "base-server/internal/blog/handler"
	blogProcessor "base-server/internal/blog/processor"
	chatHandler "base-server/internal/chat/handler"
	chatProcessor "base-server/internal/chat/processor"
	contentHandler "base-server/internal/content/handler"
	contentProcessor "base-server/internal/content/processor"
	githubHandler "base-server/internal/github/handler"
	githubProcessor "base-server/internal/github/processor"
	mediaHandler "base-server/internal/media/handler"
	mediaProcessor "base-server/internal/media/processor"
	platformsHandler "base-server/internal/platform/handler"
	"base-server/internal/platform/adapters"
	platformsProcessor "base-server/internal/platform/processor"
	postsHandler "base-server/internal/posts/handler"
	postsProcessor "base-server/internal/posts/processor"
	settingsHandler "base-server/internal/settings/handler"
	settingsProcessor "base-server/internal/settings/processor"
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

	// Initialize clients
	googleOAuthClient := googleoauth.NewClient(
		cfg.Auth.GoogleClientID,
		cfg.Auth.GoogleClientSecret,
		cfg.Auth.GoogleRedirectURI,
		logger,
	)

	mailClient, err := mail.NewResendClient(cfg.Services.ResendAPIKey, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create resend client: %w", err)
	}

	// Initialize email service
	emailService := email.New(mailClient, cfg.Services.DefaultEmailSender, logger)

	// Initialize product and subscription services
	productService := products.New(cfg.Services.StripeSecretKey, deps.Store, logger)
	subscriptionService := subscriptions.New(logger, cfg.Services.StripeSecretKey, deps.Store)

	// Initialize billing processor and handler
	billingProc := billingProcessor.New(
		cfg.Services.StripeSecretKey,
		cfg.Services.StripeWebhookSecret,
		cfg.Services.WebAppURI,
		&deps.Store,
		&productService,
		&subscriptionService,
		emailService,
		logger,
	)
	deps.BillingHandler = billingHandler.New(billingProc, logger)

	// Initialize tier service
	tierService := tiers.New(&deps.Store, logger)

	// Initialize auth processor and handler
	authConfig := authProcessor.AuthConfig{
		Email: authProcessor.EmailConfig{
			JWTSecret: cfg.Auth.JWTSecret,
		},
		Google: authProcessor.GoogleOauthConfig{
			ClientID:          cfg.Auth.GoogleClientID,
			ClientSecret:      cfg.Auth.GoogleClientSecret,
			ClientRedirectURL: cfg.Auth.GoogleRedirectURI,
			WebAppHost:        cfg.Services.WebAppURI,
		},
	}
	authProc := authProcessor.New(&deps.Store, authConfig, googleOAuthClient, &billingProc, emailService, logger)
	deps.AuthHandler = authHandler.New(authProc, tierService, logger)

	// --- Growth Tools dependencies ---

	// Gemini client (Google AI)
	geminiClient, err := gemini.NewClient(ctx, cfg.Gemini.APIKey, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create gemini client: %w", err)
	}

	// File storage client
	var fileStore mediaProcessor.FileStore
	// urlSigner is optional — only wired for S3 so GetCommit can presign
	// capture artefacts for the browser. In localdir mode it stays nil and
	// the github processor leaves capture URLs unchanged.
	var urlSigner githubProcessor.URLSigner
	// s3Head is used by the draft generator to read size + content-type of
	// capture artifacts when creating media rows. Nil in localdir mode —
	// draft generation only runs in deployments that have S3 anyway.
	var s3Head githubProcessor.S3HeadClient
	switch cfg.Storage.Type {
	case "s3":
		s3Client := s3.NewClient(s3.S3Config{
			Bucket:          cfg.S3.Bucket,
			Region:          cfg.S3.Region,
			AccessKeyID:     cfg.S3.AccessKeyID,
			SecretAccessKey: cfg.S3.SecretAccessKey,
		}, logger)
		fileStore = s3Client
		urlSigner = s3Client
		s3Head = s3Client
	default:
		fileStore = localdir.NewClient(cfg.Storage.MediaDir, logger)
	}

	// Content generation
	contentProc := contentProcessor.New(&deps.Store, geminiClient, logger)
	deps.ContentHandler = contentHandler.New(&contentProc, logger)

	// AI Chat
	chatProc := chatProcessor.New(&deps.Store, geminiClient, logger)
	deps.ChatHandler = chatHandler.New(&chatProc, logger)

	// --- Platform API clients ---
	xClient := x.NewClient(cfg.Platforms.XAPIKey, cfg.Platforms.XAPISecret, logger)
	blueskyClient := bluesky.NewClient(logger)
	linkedinClient := linkedin.NewClient(logger)
	facebookClient := facebook.NewClient(logger)
	instagramClient := instagram.NewClient(logger)
	threadsClient := threads.NewClient(logger)
	tiktokClient := tiktok.NewClient(logger)
	pinterestClient := pinterest.NewClient(logger)

	// --- Platform adapters (stateless singletons) ---
	xAdapter := adapters.NewXAdapter(xClient, logger)
	blueskyAdapter := adapters.NewBlueskyAdapter(blueskyClient, logger)
	linkedinAdapter := adapters.NewLinkedInAdapter(linkedinClient, logger)
	facebookAdapter := adapters.NewFacebookAdapter(facebookClient, logger)
	instagramAdapter := adapters.NewInstagramAdapter(instagramClient, logger)
	threadsAdapter := adapters.NewThreadsAdapter(threadsClient, logger)
	tiktokAdapter := adapters.NewTikTokAdapter(tiktokClient, logger)
	pinterestAdapter := adapters.NewPinterestAdapter(pinterestClient, logger)

	registry := adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{
		"x":         xAdapter,
		"bluesky":   blueskyAdapter,
		"linkedin":  linkedinAdapter,
		"facebook":  facebookAdapter,
		"instagram": instagramAdapter,
		"threads":   threadsAdapter,
		"tiktok":    tiktokAdapter,
		"pinterest": pinterestAdapter,
	})

	// Platform OAuth configs with real URLs and scopes
	oauthRedirectBase := os.Getenv("OAUTH_REDIRECT_BASE")
	if oauthRedirectBase == "" {
		oauthRedirectBase = fmt.Sprintf("http://localhost:%d", cfg.Server.Port)
	}
	redirectBase := oauthRedirectBase + "/api/platforms/oauth/callback"
	oauthConfigs := platformsProcessor.PlatformOAuthConfigs{
		"x": {
			ClientID:     cfg.Platforms.XAPIKey,
			ClientSecret: cfg.Platforms.XAPISecret,
			RedirectURL:  redirectBase + "/x",
			Scopes:       []string{"tweet.read", "tweet.write", "users.read", "media.write", "offline.access"},
			AuthURL:      "https://x.com/i/oauth2/authorize",
			TokenURL:     "https://api.x.com/2/oauth2/token",
		},
		"linkedin": {
			ClientID:     cfg.Platforms.LinkedInClientID,
			ClientSecret: cfg.Platforms.LinkedInSecret,
			RedirectURL:  redirectBase + "/linkedin",
			Scopes:       []string{"openid", "profile", "w_member_social"},
			AuthURL:      "https://www.linkedin.com/oauth/v2/authorization",
			TokenURL:     "https://www.linkedin.com/oauth/v2/accessToken",
		},
		"facebook": {
			ClientID:     cfg.Platforms.MetaAppID,
			ClientSecret: cfg.Platforms.MetaAppSecret,
			RedirectURL:  redirectBase + "/facebook",
			Scopes:       []string{"pages_manage_posts", "pages_read_engagement", "pages_show_list"},
			AuthURL:      "https://www.facebook.com/v21.0/dialog/oauth",
			TokenURL:     "https://graph.facebook.com/v21.0/oauth/access_token",
		},
		"instagram": {
			ClientID:     cfg.Platforms.MetaAppID,
			ClientSecret: cfg.Platforms.MetaAppSecret,
			RedirectURL:  redirectBase + "/instagram",
			Scopes:       []string{"instagram_basic", "instagram_content_publish", "pages_show_list"},
			AuthURL:      "https://www.facebook.com/v21.0/dialog/oauth",
			TokenURL:     "https://graph.facebook.com/v21.0/oauth/access_token",
		},
		"threads": {
			ClientID:     cfg.Platforms.ThreadsAppID,
			ClientSecret: cfg.Platforms.ThreadsAppSecret,
			RedirectURL:  redirectBase + "/threads",
			Scopes:       []string{"threads_basic", "threads_content_publish", "threads_manage_insights"},
			AuthURL:      "https://threads.net/oauth/authorize",
			TokenURL:     "https://graph.threads.net/oauth/access_token",
		},
		"tiktok": {
			ClientID:     cfg.Platforms.TikTokClientKey,
			ClientSecret: cfg.Platforms.TikTokClientSecret,
			RedirectURL:  redirectBase + "/tiktok",
			Scopes:       []string{"user.info.basic", "video.publish"},
			AuthURL:      "https://www.tiktok.com/v2/auth/authorize/",
			TokenURL:     "https://open.tiktokapis.com/v2/oauth/token/",
		},
		"pinterest": {
			ClientID:     cfg.Platforms.PinterestAppID,
			ClientSecret: cfg.Platforms.PinterestAppSecret,
			RedirectURL:  redirectBase + "/pinterest",
			Scopes:       []string{"boards:read", "pins:read", "pins:write", "user_accounts:read"},
			AuthURL:      "https://www.pinterest.com/oauth/",
			TokenURL:     "https://api.pinterest.com/v5/oauth/token",
		},
	}

	// Static tokens for platforms that bypass OAuth
	staticTokens := platformsProcessor.StaticTokens{}
	if cfg.Platforms.ThreadsAccessToken != "" {
		staticTokens["threads"] = cfg.Platforms.ThreadsAccessToken
	}

	// Platform connections
	platformsProc := platformsProcessor.New(&deps.Store, oauthConfigs, staticTokens, logger, xClient, threadsClient, blueskyClient)
	deps.PlatformsHandler = platformsHandler.New(&platformsProc, logger, cfg.Services.WebAppURI)

	// Kafka producer (needed by posts processor and workers)
	kafkaProducer := kafka.NewProducer(cfg.Kafka.Brokers, logger)

	// Posts
	postsProc := postsProcessor.New(&deps.Store, kafkaProducer, logger)
	deps.PostsHandler = postsHandler.New(&postsProc, logger)

	// Media
	// MEDIA_PUBLIC_URL_BASE is the source of truth for media URLs. Set it to a public S3
	// URL (https://bucket.s3.region.amazonaws.com) for direct fetches, or to a proxy
	// endpoint (https://api.example.com/public/media/file) when the bucket is private.
	mediaProc := mediaProcessor.New(&deps.Store, fileStore, cfg.Storage.PublicURLBase, logger)
	deps.MediaHandler = mediaHandler.New(&mediaProc, logger)

	// GitHub integration — the capture pipeline is fully async over Kafka:
	// webhook writes commits, publishes github.capture.requests, returns 200;
	// capture-worker consumes and publishes github.capture.results; a worker
	// below reads results and updates commit rows.
	ghClient := githubclient.NewClient(cfg.GitHub.OAuthClientID, cfg.GitHub.OAuthClientSecret, logger)
	githubProc := githubProcessor.NewWithOAuth(
		&deps.Store,
		ghClient,
		kafkaProducer,
		cfg.GitHub.WebhookSecret,
		cfg.GitHub.OAuthClientID,
		cfg.Services.WebAppURI,
		logger,
	)
	githubProc.SetURLSigner(urlSigner)
	deps.GitHubHandler = githubHandler.New(&githubProc, cfg.Services.WebAppURI, logger)

	// Blog
	blogProc := blogProcessor.New(&deps.Store, logger)
	deps.BlogHandler = blogHandler.New(&blogProc, logger)

	// Analytics
	analyticsProc := analyticsProcessor.New(&deps.Store, logger)
	deps.AnalyticsHandler = analyticsHandler.New(&analyticsProc, logger)

	// Settings (voice profile)
	settingsProc := settingsProcessor.New(&deps.Store, logger)
	deps.SettingsHandler = settingsHandler.New(&settingsProc, logger)

	// --- Workers ---

	publishWorker := workers.NewPublishWorker(cfg.Kafka.Brokers, cfg.Kafka.ConsumerGroup, &deps.Store, registry, &platformsProc, logger)
	analyticsWorker := workers.NewAnalyticsWorker(cfg.Kafka.Brokers, cfg.Kafka.ConsumerGroup, &deps.Store, registry, &platformsProc, logger)
	schedulerWorker := workers.NewSchedulerWorker(&deps.Store, kafkaProducer, logger)
	githubWorker := workers.NewGitHubWorker(cfg.Kafka.Brokers, cfg.Kafka.ConsumerGroup, logger)
	captureResultWorker := workers.NewCaptureResultWorker(cfg.Kafka.Brokers, cfg.Kafka.ConsumerGroup, &deps.Store, kafkaProducer, logger)
	retryWorker := workers.NewRetryWorker(&deps.Store, registry, &platformsProc, logger)

	// Draft generator: consumes github.draft.generate, builds an AI draft
	// from the commit + capture artifacts, persists it through SaveDraft.
	draftGen := githubProcessor.NewDraftGenerator(&deps.Store, &contentProc, &postsProc, s3Head, logger)
	draftGeneratorWorker := workers.NewDraftGeneratorWorker(cfg.Kafka.Brokers, cfg.Kafka.ConsumerGroup, &draftGen, logger)

	deps.WorkerManager = workers.NewManager(logger)
	deps.WorkerManager.Register(publishWorker)
	deps.WorkerManager.Register(analyticsWorker)
	deps.WorkerManager.Register(schedulerWorker)
	deps.WorkerManager.Register(githubWorker)
	deps.WorkerManager.Register(captureResultWorker)
	deps.WorkerManager.Register(retryWorker)
	deps.WorkerManager.Register(draftGeneratorWorker)

	logger.Info(ctx, "All dependencies initialized")

	return deps, nil
}

// Cleanup closes all resources that need cleanup
func (d *Dependencies) Cleanup() {
	// Add cleanup logic as needed
}
