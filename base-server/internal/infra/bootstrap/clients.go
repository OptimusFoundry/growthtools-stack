package bootstrap

import (
	"context"
	"fmt"
	"os"

	"base-server/internal/infra/config"
	"base-server/internal/infra/observability"

	"base-server/internal/infra/clients/gemini"
	githubclient "base-server/internal/infra/clients/github"
	"base-server/internal/infra/clients/googleoauth"
	"base-server/internal/infra/clients/kafka"
	"base-server/internal/infra/clients/localdir"
	"base-server/internal/infra/clients/mail"
	"base-server/internal/infra/clients/s3"
	"base-server/internal/infra/email"
	"base-server/internal/infra/httpclient"

	"base-server/internal/platform/adapters"
	"base-server/internal/platform/clients/bluesky"
	"base-server/internal/platform/clients/facebook"
	"base-server/internal/platform/clients/instagram"
	"base-server/internal/platform/clients/linkedin"
	"base-server/internal/platform/clients/pinterest"
	"base-server/internal/platform/clients/threads"
	"base-server/internal/platform/clients/tiktok"
	"base-server/internal/platform/clients/x"

	githubProcessor "base-server/internal/github/processor"
	mediaProcessor "base-server/internal/media/processor"
	platformsProcessor "base-server/internal/platform/processor"
)

// clients holds all external clients constructed during initialization.
type clients struct {
	googleOAuth     *googleoauth.Client
	emailService    *email.EmailService
	gemini          *gemini.Client
	kafka           *kafka.Producer
	ghClient        *githubclient.Client
	fileStore       mediaProcessor.FileStore
	urlSigner       githubProcessor.URLSigner
	s3Head          githubProcessor.S3HeadClient
	s3Fetch         githubProcessor.S3Fetcher
	xClient         *x.Client
	bluesky         *bluesky.Client
	linkedin        *linkedin.Client
	facebook        *facebook.Client
	instagram       *instagram.Client
	threads         *threads.Client
	tiktok          *tiktok.Client
	pinterest       *pinterest.Client
	adapterRegistry *adapters.AdapterRegistry
	oauthConfigs    platformsProcessor.PlatformOAuthConfigs
	staticTokens    platformsProcessor.StaticTokens
}

// buildClients constructs all external clients needed by the application.
func buildClients(ctx context.Context, cfg *config.Config, logger *observability.Logger) (*clients, error) {
	c := &clients{}

	// Shared tracing HTTP client — propagates X-Request-ID + X-User-ID outbound.
	tracingClient := httpclient.NewTracingClient()

	// Google OAuth
	c.googleOAuth = googleoauth.NewClient(
		cfg.Auth.GoogleClientID,
		cfg.Auth.GoogleClientSecret,
		cfg.Auth.GoogleRedirectURI,
		cfg.ExternalURLs.GoogleOAuthTokenURL,
		cfg.ExternalURLs.GoogleUserInfoURL,
		tracingClient,
		logger,
	)

	// Mail + email service
	mailClient, err := mail.NewResendClient(cfg.Services.ResendAPIKey, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create resend client: %w", err)
	}
	c.emailService = email.New(mailClient, cfg.Services.DefaultEmailSender, logger)

	// Gemini (Google AI)
	c.gemini, err = gemini.NewClient(ctx, cfg.Gemini.APIKey, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create gemini client: %w", err)
	}

	// File storage: S3 or local directory
	// urlSigner is optional — only wired for S3 so GetCommit can presign
	// capture artefacts for the browser. In localdir mode it stays nil and
	// the github processor leaves capture URLs unchanged.
	// s3Head is used by the draft generator to read size + content-type of
	// capture artifacts when creating media rows. Nil in localdir mode —
	// draft generation only runs in deployments that have S3 anyway.
	// s3Fetch lets the draft generator download capture screenshots so the
	// multimodal AI can pick which ones actually belong in the post.
	switch cfg.Storage.Type {
	case "s3":
		s3Client := s3.NewClient(s3.S3Config{
			Bucket:          cfg.S3.Bucket,
			Region:          cfg.S3.Region,
			AccessKeyID:     cfg.S3.AccessKeyID,
			SecretAccessKey: cfg.S3.SecretAccessKey,
		}, logger)
		c.fileStore = s3Client
		c.urlSigner = s3Client
		c.s3Head = s3Client
		c.s3Fetch = s3Client
	default:
		c.fileStore = localdir.NewClient(cfg.Storage.MediaDir, logger)
	}

	// Kafka producer
	c.kafka = kafka.NewProducer(cfg.Kafka.Brokers, logger)

	// GitHub client
	c.ghClient = githubclient.NewClient(
		cfg.GitHub.OAuthClientID,
		cfg.GitHub.OAuthClientSecret,
		cfg.ExternalURLs.GitHubAPIBase,
		cfg.ExternalURLs.GitHubOAuthTokenURL,
		httpclient.NewTracingClient(),
		logger,
	)

	// Platform API clients
	c.xClient = x.NewClient(cfg.Platforms.XAPIKey, cfg.Platforms.XAPISecret, cfg.ExternalURLs.XAPIBase, httpclient.NewTracingClient(), logger)
	c.bluesky = bluesky.NewClient(cfg.ExternalURLs.BlueskyPDSHost, httpclient.NewTracingClient(), logger)
	c.linkedin = linkedin.NewClient(cfg.ExternalURLs.LinkedInAPIBase, httpclient.NewTracingClient(), logger)
	c.facebook = facebook.NewClient(cfg.ExternalURLs.FacebookGraphBase, httpclient.NewTracingClient(), logger)
	c.instagram = instagram.NewClient(cfg.ExternalURLs.InstagramGraphBase, httpclient.NewTracingClient(), logger)
	c.threads = threads.NewClient(cfg.ExternalURLs.ThreadsAPIBase, httpclient.NewTracingClient(), logger)
	c.tiktok = tiktok.NewClient(cfg.ExternalURLs.TikTokAPIBase, httpclient.NewTracingClient(), logger)
	c.pinterest = pinterest.NewClient(cfg.ExternalURLs.PinterestAPIBase, httpclient.NewTracingClient(), logger)

	// Platform adapters (stateless singletons)
	xAdapter := adapters.NewXAdapter(c.xClient, logger)
	blueskyAdapter := adapters.NewBlueskyAdapter(c.bluesky, logger)
	linkedinAdapter := adapters.NewLinkedInAdapter(c.linkedin, logger)
	facebookAdapter := adapters.NewFacebookAdapter(c.facebook, logger)
	instagramAdapter := adapters.NewInstagramAdapter(c.instagram, logger)
	threadsAdapter := adapters.NewThreadsAdapter(c.threads, logger)
	tiktokAdapter := adapters.NewTikTokAdapter(c.tiktok, logger)
	pinterestAdapter := adapters.NewPinterestAdapter(c.pinterest, logger)

	c.adapterRegistry = adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{
		"x":         xAdapter,
		"bluesky":   blueskyAdapter,
		"linkedin":  linkedinAdapter,
		"facebook":  facebookAdapter,
		"instagram": instagramAdapter,
		"threads":   threadsAdapter,
		"tiktok":    tiktokAdapter,
		"pinterest": pinterestAdapter,
	})

	// Platform OAuth configs
	oauthRedirectBase := os.Getenv("OAUTH_REDIRECT_BASE")
	if oauthRedirectBase == "" {
		oauthRedirectBase = fmt.Sprintf("http://localhost:%d", cfg.Server.Port)
	}
	redirectBase := oauthRedirectBase + "/api/platforms/oauth/callback"
	c.oauthConfigs = platformsProcessor.PlatformOAuthConfigs{
		"x": {
			ClientID:     cfg.Platforms.XAPIKey,
			ClientSecret: cfg.Platforms.XAPISecret,
			RedirectURL:  redirectBase + "/x",
			Scopes:       []string{"tweet.read", "tweet.write", "users.read", "media.write", "offline.access"},
			AuthURL:      "https://x.com/i/oauth2/authorize",
			TokenURL:     cfg.ExternalURLs.XAPIBase + "/2/oauth2/token",
		},
		"linkedin": {
			ClientID:     cfg.Platforms.LinkedInClientID,
			ClientSecret: cfg.Platforms.LinkedInSecret,
			RedirectURL:  redirectBase + "/linkedin",
			Scopes:       []string{"openid", "profile", "w_member_social"},
			AuthURL:      "https://www.linkedin.com/oauth/v2/authorization",
			TokenURL:     cfg.ExternalURLs.LinkedInAPIBase + "/oauth/v2/accessToken",
		},
		"facebook": {
			ClientID:     cfg.Platforms.MetaAppID,
			ClientSecret: cfg.Platforms.MetaAppSecret,
			RedirectURL:  redirectBase + "/facebook",
			Scopes:       []string{"pages_manage_posts", "pages_read_engagement", "pages_show_list"},
			AuthURL:      "https://www.facebook.com/v21.0/dialog/oauth",
			TokenURL:     cfg.ExternalURLs.FacebookOAuthTokenURL,
		},
		"instagram": {
			ClientID:     cfg.Platforms.MetaAppID,
			ClientSecret: cfg.Platforms.MetaAppSecret,
			RedirectURL:  redirectBase + "/instagram",
			Scopes:       []string{"instagram_basic", "instagram_content_publish", "pages_show_list"},
			AuthURL:      "https://www.facebook.com/v21.0/dialog/oauth",
			TokenURL:     cfg.ExternalURLs.InstagramOAuthTokenURL,
		},
		"threads": {
			ClientID:     cfg.Platforms.ThreadsAppID,
			ClientSecret: cfg.Platforms.ThreadsAppSecret,
			RedirectURL:  redirectBase + "/threads",
			Scopes:       []string{"threads_basic", "threads_content_publish", "threads_manage_insights"},
			AuthURL:      "https://threads.net/oauth/authorize",
			TokenURL:     cfg.ExternalURLs.ThreadsAPIBase + "/oauth/access_token",
		},
		"tiktok": {
			ClientID:     cfg.Platforms.TikTokClientKey,
			ClientSecret: cfg.Platforms.TikTokClientSecret,
			RedirectURL:  redirectBase + "/tiktok",
			Scopes:       []string{"user.info.basic", "video.publish"},
			AuthURL:      "https://www.tiktok.com/v2/auth/authorize/",
			TokenURL:     cfg.ExternalURLs.TikTokOAuthTokenURL,
		},
		"pinterest": {
			ClientID:     cfg.Platforms.PinterestAppID,
			ClientSecret: cfg.Platforms.PinterestAppSecret,
			RedirectURL:  redirectBase + "/pinterest",
			Scopes:       []string{"boards:read", "pins:read", "pins:write", "user_accounts:read"},
			AuthURL:      "https://www.pinterest.com/oauth/",
			TokenURL:     cfg.ExternalURLs.PinterestOAuthTokenURL,
		},
	}

	// Static tokens for platforms that bypass OAuth
	c.staticTokens = platformsProcessor.StaticTokens{}
	if cfg.Platforms.ThreadsAccessToken != "" {
		c.staticTokens["threads"] = cfg.Platforms.ThreadsAccessToken
	}

	return c, nil
}
