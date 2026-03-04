# Growth Tools — Implementation Tracker

> Canonical tracker for project status. Organized by epic → task.
> Multiple agents can claim and work on tasks in parallel.
>
> **Status key:** `done` · `in-progress` · `todo` · `blocked`
> **Priority key:** `P0` (must have for MVP) · `P1` (important) · `P2` (nice to have)
>
> **RESET NOTE (2026-03-04):** All backend Go code was deleted. Webapp exists but contains
> old-project features (campaigns, referrals, rewards, email-builder, form-builder, blasts,
> segments, webhooks, integrations, team, users/leads) that must be stripped.
> Reusable webapp pieces: Proto Design System, auth pages, billing, app shell, useSSEChat hook, build config.

---

## Epic 0: Foundation & Infrastructure

> Project scaffolding, database, config, observability.

| # | Task | Status | Priority | Notes |
|---|------|--------|----------|-------|
| 0.1 | Go backend scaffolding (Gin, sqlx, Kafka, layered arch) | `todo` | P0 | Previously: 57 Go files, handler→processor→store pattern. **All deleted.** |
| 0.2 | Database schema & migrations (Growth Tools tables) | `todo` | P0 | Need: accounts, posts, platform_posts, media, conversations, blog_posts, github_events, platform_connections, analytics, subscriptions |
| 0.3 | Store layer — CRUD for all models | `todo` | P0 | accounts, posts, media, platform_posts, blog_posts, etc. |
| 0.4 | Configuration management (env vars) | `todo` | P0 | `internal/config/config.go` |
| 0.5 | Observability — structured logging + middleware | `todo` | P0 | Context-based zap logger, request tracing |
| 0.6 | Centralized error handling (apierrors) | `todo` | P0 | Two-tier logging, sanitized client responses |
| 0.7 | Kafka producer + consumer client | `todo` | P0 | `internal/clients/kafka/` |
| 0.8 | HTTP server + route registration | `todo` | P0 | Gin router, CORS, 30+ routes |
| 0.9 | Platform API research (all 8 platforms) | `done` | P0 | `docs/platform-apis/` — X, LinkedIn, BlueSky, Meta, TikTok, Pinterest |
| 0.10 | Docker Compose for local dev (Postgres, Kafka, Flyway) | `todo` | P0 | Dockerfile, docker-compose, entrypoint — **all deleted** |

---

## Epic 1: Authentication & Accounts

> JWT auth, Google OAuth, account management.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 1.1 | Email/password registration + login | `todo` | P0 | — | bcrypt hashing, JWT tokens, cookie storage. **Backend deleted.** |
| 1.2 | JWT middleware for protected routes | `todo` | P0 | — | `auth/handler.go` HandleJWTMiddleware |
| 1.3 | Google OAuth — exchange code for tokens | `todo` | P0 | — | Real Google API calls |
| 1.4 | Google OAuth — create/link account flow | `todo` | P0 | 1.3 | Cookie-based auth, redirect/callback flow |
| 1.5 | Auth unit tests | `todo` | P1 | 1.1 | Processor mock tests |
| 1.6 | Auth integration tests | `todo` | P1 | 1.5 | httptest-based integration tests |

---

## Epic 2: Claude API Integration

> AI content generation — the core engine. Powers content creation, AI chat, and blog writing.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 2.1 | Implement Claude API client (message creation) | `todo` | P0 | — | `clients/anthropic/client.go` — `anthropic-sdk-go` |
| 2.2 | SSE streaming from Claude to HTTP response | `todo` | P0 | 2.1 | `StreamCompletion()` with `MessageStreamEventUnion` |
| 2.3 | Content generation processor — prompt building | `todo` | P0 | 2.1 | `buildGeneratePrompt()`, `platformConstraints()`, `contentTypeDescription()` |
| 2.4 | Platform-specific content adaptation | `todo` | P0 | 2.3 | `AdaptContent()` method with per-platform constraints |
| 2.5 | Thread generation for X/BlueSky | `todo` | P1 | 2.3 | AI-powered `GenerateThread` + pure `SplitIntoThread` |
| 2.6 | AI chat — conversation persistence + streaming | `todo` | P0 | 2.2 | StreamCompletion, saves assistant msg, JSON SSE events |
| 2.7 | Content generation tests | `todo` | P1 | 2.3 | Prompt building, platform constraints, content types, edge cases |

---

## Epic 3: Platform Publishing Adapters

> Implement the `PlatformAdapter` interface for all 8 platforms. Each adapter handles OAuth, posting, and content validation.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 3.1 | Platform connection store (CRUD for OAuth tokens) | `todo` | P0 | — | `store/platform_connections.go` |
| 3.2 | Platform OAuth flow — connect/disconnect endpoints | `todo` | P0 | 3.1 | InitiateOAuth, HandleOAuthCallback, ConnectBluesky, DisconnectPlatform, RefreshToken |
| 3.3 | X / Twitter adapter | `todo` | P0 | 3.1 | OAuth 1.0a, v2 API, text + media upload |
| 3.4 | BlueSky adapter | `todo` | P0 | 3.1 | AT Protocol, session auth, facets, blob upload |
| 3.5 | LinkedIn adapter | `todo` | P0 | 3.1 | OAuth 2.0, REST API, 2-step image upload |
| 3.6 | Facebook adapter | `todo` | P1 | 3.1 | Graph API, text/photo/multi-photo posts |
| 3.7 | Instagram adapter | `todo` | P1 | 3.1 | 2-step container flow, status polling, caption validation |
| 3.8 | Threads adapter | `todo` | P1 | 3.1 | 2-step container flow, text-only, 500 char limit |
| 3.9 | TikTok adapter | `todo` | P1 | 3.1 | PostVideo, PostPhotoSlideshow, CheckPublishStatus |
| 3.10 | Pinterest adapter | `todo` | P1 | 3.1 | CreatePin, ListBoards, CreateBoard, PublishToBoard |
| 3.11 | Adapter unit tests | `todo` | P1 | 3.3–3.10 | httptest mock servers |

---

## Epic 4: Kafka Workers & Async Processing

> Background workers that consume Kafka events for publishing, media gen, analytics.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 4.1 | Worker bootstrap — init and start consumers | `todo` | P0 | — | Kafka consumer wired in bootstrap, graceful shutdown |
| 4.2 | Publish worker — dispatch to platform adapters | `todo` | P0 | 3.3+ | Dispatches to adapter registry, updates PlatformPost status |
| 4.3 | Scheduler worker — check due posts, enqueue | `todo` | P0 | 4.2 | 30s ticker, GetDueScheduledPosts, publishes Kafka events |
| 4.4 | GitHub webhook worker | `todo` | P1 | 5.1 | Handles push/pr_merged/release/star_milestone, generates draft posts via AI |
| 4.5 | Media generation worker | `todo` | P2 | 7.1 | Handles screenshot/social_card/process_upload events |
| 4.6 | Analytics collection worker | `todo` | P2 | 8.1 | Handles collect/collect_all/aggregate events |
| 4.7 | Blog generation worker | `todo` | P2 | 6.1 | Handles generate/generate_seo/generate_topics events via AI |
| 4.8 | Worker tests | `todo` | P1 | 4.1 | publish, github, media, analytics, blog workers |

---

## Epic 5: GitHub Activity Watcher

> Monitor repos for commits, PRs, releases, stars → generate content triggers.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 5.1 | GitHub webhook receiver — parse payload | `todo` | P0 | — | Parses push, PR, release, issue, star, fork events |
| 5.2 | GitHub webhook signature validation | `todo` | P0 | 5.1 | HMAC-SHA256 with constant-time comparison |
| 5.3 | Event deduplication + aggregation | `todo` | P0 | 5.1 | X-GitHub-Delivery header as dedup key |
| 5.4 | GitHub API client — list repos, fetch activity | `todo` | P1 | — | ListRepositories, GetRepoActivity, GetRepoCommits |
| 5.5 | Manual scan endpoint (poll mode) | `todo` | P1 | 5.4 | ScanRepos fetches commits from last 24h |
| 5.6 | Event → content type mapping | `todo` | P0 | 5.1, 2.3 | SuggestContentType + GeneratePostFromEvent with AI |
| 5.7 | GitHub integration tests | `todo` | P1 | 5.1 | Webhook parsing, scan repos, content type mapping |

---

## Epic 6: Blog Engine

> AI-generated SEO blog posts with CMS publishing.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 6.1 | Blog post generation via Claude | `todo` | P1 | 2.1 | GenerateBlogPost with prompt building, slug generation |
| 6.2 | Topic generation from keywords + repo activity | `todo` | P1 | 2.1 | GenerateTopics with JSON parsing |
| 6.3 | SEO metadata generation | `todo` | P1 | 6.1 | meta_description, keywords, og_title, og_description |
| 6.4 | ~~CMS publishing — Ghost adapter~~ | `n/a` | — | — | Not needed — using Astro sites instead |
| 6.5 | ~~CMS publishing — WordPress adapter~~ | `n/a` | — | — | Not needed — using Astro sites instead |
| 6.6 | Blog tests | `todo` | P1 | 6.1 | Slug edge cases, parse edge cases, SEO error paths |

---

## Epic 7: Media Pipeline

> Screenshots, Canva designs, Remotion videos, S3 upload.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 7.1 | S3 file upload integration | `todo` | P0 | — | AWS SDK v2, UploadFile, DeleteFile, GeneratePresignedURL |
| 7.2 | Puppeteer screenshot generation | `todo` | P1 | 7.1 | Node script + Go exec integration, S3 upload |
| 7.3 | Canva MCP integration | `todo` | P2 | 7.1 | GenerateSocialCard/Carousel/Banner |
| 7.4 | Remotion video generation | `todo` | P2 | 7.1 | render.mjs, React compositions, Go exec integration |
| 7.5 | Media library store operations | `todo` | P1 | 7.1 | ListMediaByAccountID + CountMediaByAccountID |
| 7.6 | Media tests | `todo` | P1 | 7.1 | Upload/list/get/delete, S3 errors, type detection |

---

## Epic 8: Analytics

> Collect engagement metrics from platforms, generate reports.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 8.1 | Analytics collector — pull metrics from platform APIs | `todo` | P1 | 3.3+ | RecordAnalytics, GetAnalyticsOverview, GetEngagementOverTime |
| 8.2 | Analytics aggregation — overview, per-post, per-platform | `todo` | P1 | 8.1 | Gap-filling, period bucketing (day/week/month) |
| 8.3 | Performance report generation | `todo` | P2 | 8.2 | Growth rate, best platform, recommendations |
| 8.4 | Analytics tests | `todo` | P1 | 8.1 | Overview, time-series, gap filling, platform breakdown |

---

## Epic 9: Billing & Subscriptions (Stripe)

> Checkout, customer portal, webhook handling.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 9.1 | Stripe checkout session creation | `todo` | P1 | — | Embedded UI mode, `stripe-go/v79` |
| 9.2 | Stripe customer portal | `todo` | P1 | 9.1 | Portal session with configuration ID |
| 9.3 | Stripe webhook handler | `todo` | P1 | 9.1 | subscription lifecycle + invoice events |
| 9.4 | Product + price seeding | `todo` | P1 | 9.1 | Free/Pro/Business plans |
| 9.5 | Tier gating middleware | `todo` | P2 | 9.1 | InjectTier, RequireFeature, RequireMinTier |
| 9.6 | Billing tests | `todo` | P1 | 9.1 | Checkout, portal, cancel, webhook events |

---

## Epic 10: Web Dashboard (React)

> SaaS frontend — React 19 + Vite + TanStack Router + Proto Design System.
>
> **Webapp state:** Copied from first-saas-repo. Infrastructure is reusable, but feature
> modules must be stripped and rebuilt for Growth Tools.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 10.1 | Project setup — Vite, TanStack Router, SCSS, biome | `done` | P0 | — | Vite 7.3, biome 2.3, sass-embedded, compression |
| 10.2 | Proto Design System (50+ components) | `done` | P0 | 10.1 | Tokens, 30+ themes, all component categories |
| 10.3 | Auth pages — sign in, sign up, Google OAuth | `done` | P0 | 10.1, 1.1 | AuthProvider, fetcher, ErrorBoundary — **exists, reusable** |
| 10.4 | App shell — sidebar, navbar, routing | `todo` | P0 | 10.2 | Layout exists but nav config has old-project items. **Must update navigation.ts** |
| 10.5 | **Strip old-project features** | `todo` | P0 | — | **DELETE:** features/{campaigns,referrals,rewards,emails,email-builder,form-builder,users,blasts,segments,webhooks,integrations,team}, related routes, hooks, mocks, e2e tests, types |
| 10.6 | Dashboard home page | `todo` | P0 | 10.4 | StatCards, recent posts, quick actions |
| 10.7 | Content calendar view | `todo` | P0 | 10.4 | Monthly grid, platform/status filters |
| 10.8 | Post editor + approval queue | `todo` | P0 | 10.4 | Posts list, $postId editor, create/edit modes |
| 10.9 | AI chat interface (SSE streaming) | `todo` | P0 | 10.4, 2.6 | **useSSEChat hook exists and is reusable** |
| 10.10 | Media library page | `todo` | P1 | 10.4, 7.1 | Grid view, type filters, delete, upload |
| 10.11 | Analytics dashboard (social media metrics) | `todo` | P1 | 10.4, 8.2 | StatCards, EngagementChart, PlatformBreakdown — **old analytics page exists but is for campaign analytics, must rebuild** |
| 10.12 | Settings — voice profile + platform connections | `todo` | P1 | 10.4, 3.2 | Profile tab, Connections tab (platform OAuth cards) |
| 10.13 | Billing page | `done` | P1 | 10.4, 9.1 | **Exists and reusable** — pricing plans, Stripe checkout, portal |
| 10.14 | Blog management page | `todo` | P2 | 10.4, 6.1 | Posts list, BlogEditor, AI generate/topics modal, SEO |
| 10.15 | Frontend tests (Playwright + MSW) | `todo` | P1 | 10.6+ | **Old tests exist but are for old features, must rewrite** |

---

## Epic 11: CLI Application

> Go CLI for automated content generation and publishing.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 11.1 | CLI project setup (cobra or flag) | `todo` | P0 | — | Cobra-based CLI, `~/.growth/config.yaml`, Bearer token auth |
| 11.2 | `growth plan --days N` — generate content plan | `todo` | P0 | 2.3, 5.1 | `--days N --platforms x,linkedin` |
| 11.3 | `growth post` — generate a single post | `todo` | P0 | 2.3 | `--type short --platform x --topic "..."` |
| 11.4 | `growth publish` — publish queued content | `todo` | P0 | 4.2 | `--today/--post-id/--dry-run` |
| 11.5 | `growth status` — show queue + connections | `todo` | P0 | — | Colored output, ASCII table |
| 11.6 | `growth report` — performance report | `todo` | P1 | 8.3 | --period weekly/monthly --platform filter |
| 11.7 | `growth blog` — write, topics, publish | `todo` | P1 | 6.1 | `growth blog write/topics/list/publish` subcommands |
| 11.8 | `growth video` — generate Remotion video | `todo` | P2 | 7.4 | --type demo/changelog/announcement |
| 11.9 | `growth media` — generate Canva asset | `todo` | P2 | 7.3 | social-card/carousel/banner/list subcommands |
| 11.10 | `growth config` — view/edit configuration | `todo` | P1 | — | `growth config show/set/init` subcommands |
| 11.11 | CLI tests | `todo` | P1 | 11.1 | config, status, report, blog, plan with httptest mocks |

---

## Epic 12: Testing & Quality

> Cross-cutting: store tests, unit tests, integration tests.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 12.1 | Store tests — all CRUD operations | `todo` | P0 | — | accounts, posts, media, conversations, blog_posts, subscriptions |
| 12.2 | Processor unit tests — content, publish, blog, auth | `todo` | P0 | — | gomock for store interfaces |
| 12.3 | API integration tests | `todo` | P1 | 12.1 | posts, media, analytics, blog, connections, billing, health |
| 12.4 | Mock generation (go generate) | `todo` | P0 | — | `go.uber.org/mock` |
| 12.5 | CI pipeline (GitHub Actions) | `done` | P1 | 12.1 | `.github/workflows/ci.yml` — **exists, may need updates** |

---

## Epic 13: Infrastructure & Deployment

> AWS, Terraform, Docker, CI/CD.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 13.1 | Terraform — ALB, ECS, RDS, S3, CloudFront | `todo` | P1 | — | **infra-setup/ does not exist in repo yet** |
| 13.2 | Terraform — Kafka (MSK) | `todo` | P1 | 13.1 | ECS-based Kafka with EFS persistence |
| 13.3 | Terraform — Secrets Manager | `todo` | P1 | 13.1 | SSM parameters under `/gt/` namespace |
| 13.4 | Production Dockerfile | `todo` | P1 | — | Multi-stage Go 1.23-alpine, **deleted** |
| 13.5 | Flyway migration container | `todo` | P1 | — | `Dockerfile.migrations` — **deleted** |
| 13.6 | CD pipeline — deploy on merge to main | `todo` | P2 | 13.1, 12.5 | ECR push + ECS deploy + S3/CloudFront webapp deploy |

---

## Webapp Cleanup Checklist

> Old-project artifacts to strip before building Growth Tools features.

| # | What to delete | Type | Notes |
|---|---------------|------|-------|
| C.1 | `src/features/campaigns/` | Feature module | Referral campaigns — not needed |
| C.2 | `src/features/referrals/` | Feature module | Referral tracking — not needed |
| C.3 | `src/features/rewards/` | Feature module | Referral rewards — not needed |
| C.4 | `src/features/emails/` | Feature module | Email editor — not needed |
| C.5 | `src/features/email-builder/` | Feature module | Email template builder — not needed |
| C.6 | `src/features/form-builder/` | Feature module | Signup form builder — not needed |
| C.7 | `src/features/users/` | Feature module | Leads/waitlist users — not needed |
| C.8 | `src/features/blasts/` | Feature module | Email blasts — not needed |
| C.9 | `src/features/segments/` | Feature module | User segments — not needed |
| C.10 | `src/features/webhooks/` | Feature module | Webhook management — not needed |
| C.11 | `src/features/integrations/` | Feature module | Zapier integrations — not needed |
| C.12 | `src/features/team/` | Feature module | Team members — not needed |
| C.13 | `src/routes/campaigns/` | Routes | All campaign routes |
| C.14 | `src/routes/blasts/`, `src/routes/blasts.tsx` | Routes | All blast routes |
| C.15 | `src/routes/email-templates/`, `src/routes/email-templates.tsx` | Routes | Email template routes |
| C.16 | `src/routes/webhooks/`, `src/routes/webhooks.tsx` | Routes | Webhook routes |
| C.17 | `src/routes/segments/`, `src/routes/segments.tsx` | Routes | Segment routes |
| C.18 | `src/routes/integrations/`, `src/routes/integrations.tsx` | Routes | Integration routes |
| C.19 | `src/routes/contacts.tsx`, `src/routes/deals.tsx` | Routes | Old CRM routes |
| C.20 | `src/routes/embed.$campaignId.tsx` | Routes | Form embed route |
| C.21 | `src/routes/articles.tsx` | Routes | Old articles route |
| C.22 | `src/routes/test-variable-input.tsx` | Routes | Test route |
| C.23 | Old hooks | Hooks | useBlasts, useBlastEmailTemplates, useCampaignEmailTemplates, useCampaignStatus, useCreateCampaign, useCreateReward, useCreateWebhook, useDeleteCampaign, useDeleteReward, useDeleteWebhook, useExportCampaignUsers, useFormConfigFromCampaign, useFormSubmission, useGetCampaign, useGetCampaigns, useGetCampaignUsers, useGetReward, useGetRewards, useGetWebhook, useGetWebhookDeliveries, useGetWebhooks, usePublicCampaign, useSegments, useTestWebhook, useUpdateCampaign, useUpdateCampaignStatus, useUpdateReward, useUpdateWebhook, useZapierIntegration, useConversionTracking, useTrackingData, useUserStatus, useChartNavigation |
| C.24 | Old mocks | Mocks | referrals.mock.ts, forms.mock.ts, team.mock.ts, rewards.mock.ts, emails.mock.ts, team-integrations.mock.ts, campaigns.mock.ts |
| C.25 | Old types | Types | campaign.ts, blast.ts, segment.ts, webhook.ts, blastEmailTemplate.ts, campaignEmailTemplate.ts, users.types.ts |
| C.26 | Old e2e tests | E2E | campaigns.spec.ts, webhooks.spec.ts, variable-text-input.spec.ts, old handlers |
| C.27 | `src/contexts/persona.tsx` | Context | Old persona switcher — not needed |
| C.28 | `src/config/navigation.ts` | Config | **Rewrite** for Growth Tools nav (Dashboard, Calendar, Posts, AI Chat, Media, Analytics, Blog, Settings) |

---

## Implementation Order (Recommended)

Designed so multiple agents can work in parallel on independent epics.

### Wave 0 — Cleanup (prerequisite)
- **Task:** Strip old-project features from webapp (Epic 10, task 10.5 + Cleanup Checklist)
- **Task:** Update navigation config for Growth Tools

### Wave 1 — Core Backend (parallel)
- **Agent A:** Epic 0 (Foundation) — tasks 0.1 → 0.2 → 0.3 → 0.4 → 0.5 → 0.6 → 0.7 → 0.8 → 0.10
- **Agent B:** Epic 1 (Auth) — tasks 1.1 → 1.2 → 1.3 → 1.4

### Wave 2 — AI + Platform Adapters (parallel, after Wave 1)
- **Agent A:** Epic 2 (Claude API) — tasks 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6
- **Agent B:** Epic 3 (Platform adapters) — tasks 3.1 → 3.2 → 3.3 → 3.4 → 3.5
- **Agent C:** Epic 9 (Billing) — tasks 9.1 → 9.2 → 9.3 → 9.4 → 9.5

### Wave 3 — Workers + GitHub (parallel, after Wave 2)
- **Agent A:** Epic 4 (Workers) — tasks 4.1 → 4.2 → 4.3 → 4.4
- **Agent B:** Epic 5 (GitHub watcher) — tasks 5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6
- **Agent C:** Epic 3 continued — tasks 3.6 → 3.7 → 3.8 → 3.9 → 3.10

### Wave 4 — Dashboard + CLI (parallel, after Wave 2)
- **Agent A:** Epic 10 (Dashboard) — tasks 10.6 → 10.7 → 10.8 → 10.9 → 10.10 → 10.11 → 10.12 → 10.14
- **Agent B:** Epic 11 (CLI) — tasks 11.1 → 11.2 → 11.3 → 11.4 → 11.5 → 11.6

### Wave 5 — Phase 2+ Features (parallel)
- Epic 6 (Blog) — tasks 6.1 → 6.2 → 6.3
- Epic 7 (Media pipeline) — S3, Puppeteer, Canva, Remotion
- Epic 8 (Analytics) — collection, aggregation, reports
- Epic 12 (Tests) — store, processor, integration, mocks
- Epic 13 (Infrastructure) — Terraform, Docker, CI/CD

---

## How to Use This Tracker

1. **Claim a task:** Update status to `in-progress` and add your agent/branch name in Notes
2. **Check dependencies:** Don't start a task if its `Depends On` column has incomplete tasks
3. **Mark done:** Update status to `done` when the task passes tests and builds cleanly
4. **Add tasks:** If you discover sub-tasks during implementation, add them under the right epic
5. **Blocked?** Set status to `blocked` and note what's blocking in the Notes column
