package bootstrap

import (
	adminProcessor "base-server/internal/admin/processor"
	aiblog "base-server/internal/ai/blog"
	commitclassifier "base-server/internal/ai/commitclassifier"
	mediadescriber "base-server/internal/ai/mediadescriber"
	mediaplanner "base-server/internal/ai/mediaplanner"
	posttitler "base-server/internal/ai/posttitler"
	socialposts "base-server/internal/ai/socialposts"

	authProcessor "base-server/internal/auth/processor"
	contentProcessor "base-server/internal/content/processor"
	"base-server/internal/infra/config"
	"base-server/internal/infra/httpclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	stripeclient "base-server/internal/infra/stripeclient"
	"base-server/internal/infra/tiers"
	billingProcessor "base-server/internal/money/billing/processor"
	"base-server/internal/money/products"
	"base-server/internal/money/subscriptions"

	analyticsProcessor "base-server/internal/analytics/processor"
	blogProcessor "base-server/internal/blog/processor"
	chatProcessor "base-server/internal/chat/processor"
	githubProcessor "base-server/internal/github/processor"
	mediaProcessor "base-server/internal/media/processor"
	platformsProcessor "base-server/internal/platform/processor"
	postsProcessor "base-server/internal/posts/processor"
	settingsProcessor "base-server/internal/settings/processor"
)

// procs holds all processor and service instances constructed during initialization.
type procs struct {
	admin       adminProcessor.AdminProcessor
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

	// AI packages (no store, no HTTP — pure AI libraries)
	aiDescriber  *mediadescriber.Describer
	aiClassifier *commitclassifier.Classifier
	aiPlanner    *mediaplanner.Planner
	aiPosts      *socialposts.Generator
	aiBlog       *aiblog.Generator
	aiTitler     *posttitler.Titler
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

	// Initialize Stripe client wrapper (stamps product metadata on all creates)
	sc := stripeclient.New(cfg.Services.StripeSecretKey, cfg.Services.ProductName, logger)

	p.billing = billingProcessor.New(
		cfg.Services.StripeSecretKey,
		cfg.Services.StripeWebhookSecret,
		cfg.Services.WebAppURI,
		s,
		&productService,
		&subscriptionService,
		cl.emailService,
		logger,
		sc,
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

	// AI packages — constructed once, injected by value into feature processors.
	p.aiDescriber = mediadescriber.New(cl.gemini, logger)
	p.aiClassifier = commitclassifier.New(cl.gemini, logger)
	p.aiPlanner = mediaplanner.New(cl.gemini, logger)
	p.aiPosts = socialposts.New(cl.gemini, logger)
	p.aiBlog = aiblog.New(cl.gemini, logger)
	p.aiTitler = posttitler.New(cl.gemini, logger)

	// AI Chat
	p.chat = chatProcessor.New(s, cl.gemini, logger)

	// Content generation
	p.content = contentProcessor.New(s, cl.s3Fetch, p.aiDescriber, p.aiPosts, logger)

	// Platform connections
	p.platforms = platformsProcessor.New(s, cl.oauthConfigs, cl.staticTokens, httpclient.NewTracingClient(), logger, cl.xClient, cl.threads, cl.bluesky)

	// Posts
	// Capture-sourced media rows carry `s3://bucket/key` URLs; the posts
	// processor presigns them on read so the draft preview can render the
	// attached video and screenshots directly in the browser.
	p.posts = postsProcessor.New(s, cl.kafka, logger)
	if cl.urlSigner != nil {
		p.posts.SetURLSigner(cl.urlSigner)
	}
	p.posts.SetTitler(p.aiTitler)

	// Media
	// STORAGE_PUBLIC_URL_BASE is the source of truth for media URLs. Set it to a public S3
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
	// AI-filter pushed commits: only commits the classifier flags as
	// worthwhile (user-visible change) survive into the capture pipeline.
	// Fail-open inside the processor means a classifier outage doesn't drop
	// user features on the floor.
	p.github.SetCommitClassifier(p.aiClassifier)

	// Blog
	p.blog = blogProcessor.New(s, p.aiBlog, logger)
	p.blog.SetURLSigner(cl.urlSigner)

	p.github.SetPublicURLBase(cfg.Storage.PublicURLBase)
	p.blog.SetSitePublisher(&p.github)

	// Analytics
	p.analytics = analyticsProcessor.New(s, logger)

	// Settings (voice profile)
	p.settings = settingsProcessor.New(s, logger)

	// Admin — empty allowlist means feature is disabled; all /api/admin/* → 403.
	p.admin = adminProcessor.New(s, adminProcessor.AdminConfig{
		JWTSecret:   cfg.Auth.JWTSecret,
		AdminEmails: cfg.Auth.AdminEmails,
	}, logger)

	// Draft generator: consumes github.draft.generate, builds an AI draft
	// from the commit + capture artifacts, persists it through SaveDraft.
	p.draftGen = githubProcessor.NewDraftGenerator(
		s,
		p.aiClassifier,
		p.aiDescriber,
		p.aiPlanner,
		p.aiPosts,
		&p.posts,
		cl.s3Head,
		cl.s3Fetch,
		cfg.S3.Bucket,
		logger,
	)

	// Blog draft generator: consumes github.blog.generate, fetches the full
	// commit diff from GitHub + capture screenshots from S3, calls Gemini,
	// and persists a draft blog_posts row. cl.ghClient implements
	// GetCommitDiff; cl.gemini implements aiclient.Client.
	p.blogGen = githubProcessor.NewBlogDraftGenerator(s, cl.gemini, cl.s3Fetch, cl.ghClient, logger)

	return p, nil
}
