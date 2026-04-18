package bootstrap

import (
	authProcessor "base-server/internal/auth/processor"
	billingProcessor "base-server/internal/billing/processor"
	"base-server/internal/billing/products"
	"base-server/internal/billing/subscriptions"
	"base-server/internal/infra/config"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/infra/tiers"

	analyticsProcessor "base-server/internal/analytics/processor"
	blogProcessor "base-server/internal/blog/processor"
	chatProcessor "base-server/internal/chat/processor"
	contentProcessor "base-server/internal/content/processor"
	githubProcessor "base-server/internal/github/processor"
	mediaProcessor "base-server/internal/media/processor"
	platformsProcessor "base-server/internal/platform/processor"
	postsProcessor "base-server/internal/posts/processor"
	settingsProcessor "base-server/internal/settings/processor"
)

// procs holds all processor and service instances constructed during initialization.
type procs struct {
	billing     billingProcessor.BillingProcessor
	auth        authProcessor.AuthProcessor
	tierService *tiers.TierService
	content     contentProcessor.ContentProcessor
	chat        chatProcessor.ChatProcessor
	platforms   platformsProcessor.PlatformProcessor
	posts       postsProcessor.PostProcessor
	media       mediaProcessor.MediaProcessor
	github      githubProcessor.GitHubProcessor
	blog        blogProcessor.BlogProcessor
	analytics   analyticsProcessor.AnalyticsProcessor
	settings    settingsProcessor.SettingsProcessor
	draftGen    githubProcessor.DraftGenerator
	blogGen     githubProcessor.BlogDraftGenerator
}

// buildProcessors constructs all processor and service instances.
// s must be a pointer to the store allocated in Initialize so that
// the same address can be passed to workers (which share it).
func buildProcessors(cfg *config.Config, logger *observability.Logger, s *store.Store, cl *clients) (*procs, error) {
	p := &procs{}

	// Billing — products/subscriptions take the store by value (interface);
	// billingProcessor takes a pointer so it can share the store with auth.
	productService := products.New(cfg.Services.StripeSecretKey, *s, logger)
	subscriptionService := subscriptions.New(logger, cfg.Services.StripeSecretKey, *s)
	p.billing = billingProcessor.New(
		cfg.Services.StripeSecretKey,
		cfg.Services.StripeWebhookSecret,
		cfg.Services.WebAppURI,
		s,
		&productService,
		&subscriptionService,
		cl.emailService,
		logger,
	)

	// Tier service
	p.tierService = tiers.New(s, logger)

	// Auth
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
	p.auth = authProcessor.New(s, authConfig, cl.googleOAuth, &p.billing, cl.emailService, logger)

	// Content generation
	p.content = contentProcessor.New(s, cl.gemini, logger)
	// Wire the media-aware regenerate path so HandleStreamGenerate can fetch
	// persisted media from S3 when the frontend sends media_ids (edit / regenerate
	// flow). Only available when S3 is configured.
	if cl.s3Fetch != nil {
		p.content.WithMediaFetcher(s, cl.s3Fetch)
	}

	// AI Chat
	p.chat = chatProcessor.New(s, cl.gemini, logger)

	// Platform connections
	p.platforms = platformsProcessor.New(s, cl.oauthConfigs, cl.staticTokens, logger, cl.xClient, cl.threads, cl.bluesky)

	// Posts
	// Capture-sourced media rows carry `s3://bucket/key` URLs; the posts
	// processor presigns them on read so the draft preview can render the
	// attached video and screenshots directly in the browser.
	p.posts = postsProcessor.New(s, cl.kafka, logger)
	if cl.urlSigner != nil {
		p.posts.SetURLSigner(cl.urlSigner)
	}

	// Media
	// MEDIA_PUBLIC_URL_BASE is the source of truth for media URLs. Set it to a public S3
	// URL (https://bucket.s3.region.amazonaws.com) for direct fetches, or to a proxy
	// endpoint (https://api.example.com/public/media/file) when the bucket is private.
	p.media = mediaProcessor.New(s, cl.fileStore, cfg.Storage.PublicURLBase, logger)
	// Same presign hook as posts, for the /media list response.
	if cl.urlSigner != nil {
		p.media.SetURLSigner(cl.urlSigner)
	}

	// GitHub integration — the capture pipeline is fully async over Kafka:
	// webhook writes commits, publishes github.capture.requests, returns 200;
	// capture-worker consumes and publishes github.capture.results; a worker
	// below reads results and updates commit rows.
	p.github = githubProcessor.NewWithOAuth(
		s,
		cl.ghClient,
		cl.kafka,
		cfg.GitHub.WebhookSecret,
		cfg.GitHub.OAuthClientID,
		cfg.Services.WebAppURI,
		logger,
	)
	p.github.SetURLSigner(cl.urlSigner)
	// AI-filter pushed commits: only commits the content processor flags as
	// worthwhile (user-visible change) survive into the capture pipeline.
	// Fail-open inside the processor means a classifier outage doesn't drop
	// user features on the floor.
	p.github.SetCommitClassifier(&p.content)

	// Blog
	p.blog = blogProcessor.New(s, logger)

	// Analytics
	p.analytics = analyticsProcessor.New(s, logger)

	// Settings (voice profile)
	p.settings = settingsProcessor.New(s, logger)

	// Draft generator: consumes github.draft.generate, builds an AI draft
	// from the commit + capture artifacts, persists it through SaveDraft.
	p.draftGen = githubProcessor.NewDraftGenerator(s, &p.content, &p.posts, cl.s3Head, cl.s3Fetch, cfg.S3.Bucket, logger)

	// Blog draft generator: consumes github.blog.generate, fetches the full
	// commit diff from GitHub + capture screenshots from S3, calls Gemini,
	// and persists a draft blog_posts row. cl.ghClient implements
	// GetCommitDiff; cl.gemini implements aiclient.Client.
	p.blogGen = githubProcessor.NewBlogDraftGenerator(s, cl.gemini, cl.s3Fetch, cl.ghClient, logger)

	return p, nil
}
