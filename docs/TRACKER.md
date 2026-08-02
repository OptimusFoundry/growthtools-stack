# Growth Tools — Implementation Tracker

> Canonical tracker for project status. Organized by epic → task.
> Multiple agents can claim and work on tasks in parallel.
>
> **Status key:** `done` · `in-progress` · `todo` · `blocked`
> **Priority key:** `P0` (must have for MVP) · `P1` (important) · `P2` (nice to have)
>
> **Last updated:** 2026-03-04

---

## Epic Board (PRD pipeline)

Each row is a feature epic run through the shared-writing-prds → plan-writer → supervisor
pipeline. Status flows: Backlog → Spec'd → Planned → In progress → Shipped. Tickets live in the
linked tech plan (created by plan-writer).

| Epic | Feature | PRD | Plan | Status |
|------|---------|-----|------|--------|
| EP-001 | Publish Blog Posts to shubhanshu.dev | docs/prds/2026-08-02-blog-site-publish.md | docs/plans/2026-08-02-blog-site-publish.md | Shipped (279c698, 083a133) |

---

## Epic 0: Foundation & Infrastructure

> Project scaffolding, database, config, observability.

| # | Task | Status | Priority | Notes |
|---|------|--------|----------|-------|
| 0.1 | Go backend scaffolding (Gin, sqlx, Kafka, layered arch) | `done` | P0 | handler→processor→store pattern, 23 packages |
| 0.2 | Database schema & migrations (Growth Tools tables) | `done` | P0 | V0032 drops old tables, V0033 Growth Tools schema, V0034 seed features |
| 0.3 | Store layer — CRUD for all models | `done` | P0 | 21 store files: posts, media, blog, platforms, analytics, github, voice, conversations |
| 0.4 | Configuration management (env vars) | `done` | P0 | `internal/config/config.go` — Anthropic, S3, GitHub, platform OAuth configs |
| 0.5 | Observability — structured logging + middleware | `done` | P0 | Context-based zap logger, request tracing |
| 0.6 | Centralized error handling (apierrors) | `done` | P0 | Two-tier logging, sanitized client responses |
| 0.7 | Kafka producer + consumer client | `done` | P0 | `internal/clients/kafka/` producer + consumer |
| 0.8 | HTTP server + route registration | `done` | P0 | Gin router, CORS, ~40 routes registered |
| 0.9 | Platform API research (all 8 platforms) | `done` | P0 | `docs/platform-apis/` — X, LinkedIn, BlueSky, Meta, TikTok, Pinterest |
| 0.10 | Docker Compose for local dev (Postgres, Kafka, Flyway) | `done` | P0 | docker-compose.services.yml, AUTO_CREATE_TOPICS |

---

## Epic 1: Authentication & Accounts

> JWT auth, Google OAuth, account management.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 1.1 | Email/password registration + login | `done` | P0 | — | bcrypt hashing, JWT tokens, cookie storage |
| 1.2 | JWT middleware for protected routes | `done` | P0 | — | `auth/handler.go` HandleJWTMiddleware |
| 1.3 | Google OAuth — exchange code for tokens | `done` | P0 | — | Real Google API calls |
| 1.4 | Google OAuth — create/link account flow | `done` | P0 | 1.3 | Cookie-based auth, redirect/callback flow |
| 1.5 | Auth unit tests | `done` | P1 | 1.1 | Processor mock tests (auth_test.go, oauth_test.go) |
| 1.6 | Auth integration tests | `todo` | P1 | 1.5 | httptest-based auth flow tests |

---

## Epic 2: Claude API Integration

> AI content generation — the core engine. Powers content creation, AI chat, and blog writing.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 2.1 | Implement Claude API client (message creation) | `done` | P0 | — | `clients/anthropic/client.go` — `anthropic-sdk-go` |
| 2.2 | SSE streaming from Claude to HTTP response | `done` | P0 | 2.1 | StreamConversation in chat processor |
| 2.3 | Content generation processor — prompt building | `done` | P0 | 2.1 | GeneratePost with voice profile + platform constraints |
| 2.4 | Platform-specific content adaptation | `done` | P0 | 2.3 | AdaptContent method with per-platform constraints |
| 2.5 | Thread generation for X/BlueSky | `done` | P1 | 2.3 | GenerateThread in content processor |
| 2.6 | AI chat — conversation persistence + streaming | `done` | P0 | 2.2 | Chat processor + handler with SSE endpoint |
| 2.7 | Content generation tests | `done` | P1 | 2.3 | content/processor/processor_test.go, chat/processor/processor_test.go |

---

## Epic 3: Platform Publishing Adapters

> Implement the `PlatformAdapter` interface for all 8 platforms. Each adapter handles OAuth, posting, and content validation.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 3.1 | Platform connection store (CRUD for OAuth tokens) | `done` | P0 | — | `store/platform_connection.go` |
| 3.2 | Platform OAuth flow — connect/disconnect endpoints | `done` | P0 | 3.1 | InitiateOAuth, HandleOAuthCallback, ConnectBluesky, DisconnectPlatform |
| 3.3 | X / Twitter adapter | `done` | P0 | 3.1 | OAuth 1.0a, v2 API, chunked media upload, 280 char limit |
| 3.4 | BlueSky adapter | `done` | P0 | 3.1 | AT Protocol, session auth, blob upload, 300 char limit |
| 3.5 | LinkedIn adapter | `done` | P0 | 3.1 | OAuth 2.0, REST API, 2-step image upload, 3000 char limit |
| 3.6 | Facebook adapter | `done` | P1 | 3.1 | Graph API, text/photo posts, 63K char limit |
| 3.7 | Instagram adapter | `done` | P1 | 3.1 | 2-step container flow, requires media, caption validation |
| 3.8 | Threads adapter | `done` | P1 | 3.1 | 2-step container flow, text+image, 500 char limit |
| 3.9 | TikTok adapter | `done` | P1 | 3.1 | Video upload, init+upload flow, limited analytics |
| 3.10 | Pinterest adapter | `done` | P1 | 3.1 | CreatePin, ListBoards, auto-select board, 500 char limit |
| 3.11 | Adapter registry — maps platform name to adapter | `done` | P0 | 3.3+ | `platforms/adapters/registry.go` (scaffold exists) |
| 3.12 | Adapter unit tests | `todo` | P1 | 3.3–3.10 | httptest mock servers |

---

## Epic 4: Kafka Workers & Async Processing

> Background workers that consume Kafka events for publishing, media gen, analytics.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 4.1 | Worker bootstrap — init and start consumers | `done` | P0 | — | `workers/bootstrap.go` — WorkerManager |
| 4.2 | Publish worker — dispatch to platform adapters | `done` | P0 | 3.3+ | `workers/publish.go` (scaffold — needs real adapter dispatch) |
| 4.3 | Scheduler worker — check due posts, enqueue | `done` | P0 | 4.2 | `workers/scheduler.go` — 30s ticker |
| 4.4 | GitHub webhook worker | `done` | P1 | 5.1 | `workers/github.go` |
| 4.5 | Media generation worker | `todo` | P2 | 7.1 | Screenshot/social_card/process_upload events |
| 4.6 | Analytics collection worker | `done` | P2 | 8.1 | `workers/analytics.go` |
| 4.7 | Blog generation worker | `todo` | P2 | 6.1 | Generate/generate_seo/generate_topics events via AI |
| 4.8 | Worker tests | `todo` | P1 | 4.1 | publish, github, media, analytics, blog workers |

---

## Epic 5: GitHub Activity Watcher

> Monitor repos for commits, PRs, releases, stars → generate content triggers.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 5.1 | GitHub webhook receiver — parse payload | `done` | P0 | — | `github/handler/handler.go` — public webhook endpoint |
| 5.2 | GitHub webhook signature validation | `done` | P0 | 5.1 | HMAC-SHA256 in `github/processor/processor.go` |
| 5.3 | Event deduplication + aggregation | `done` | P0 | 5.1 | X-GitHub-Delivery as dedup key, store check |
| 5.4 | GitHub API client — list repos, fetch activity | `todo` | P1 | — | ListRepositories, GetRepoActivity, GetRepoCommits |
| 5.5 | Manual scan endpoint (poll mode) | `todo` | P1 | 5.4 | ScanRepos fetches commits from last 24h |
| 5.6 | Event → content type mapping | `todo` | P0 | 5.1, 2.3 | SuggestContentType + GeneratePostFromEvent with AI |
| 5.7 | GitHub integration tests | `done` | P1 | 5.1 | `tests/github_webhook_test.go` — 10 tests |

---

## Epic 6: Blog Engine

> AI-generated SEO blog posts with CMS publishing.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 6.1 | Blog post CRUD — store + processor + handler | `done` | P1 | — | Full CRUD with slug, SEO fields, publish flow |
| 6.2 | Blog post generation via Claude | `todo` | P1 | 2.1 | GenerateBlogPost with prompt building |
| 6.3 | Topic generation from keywords + repo activity | `todo` | P1 | 2.1 | GenerateTopics with JSON parsing |
| 6.4 | SEO metadata generation | `todo` | P1 | 6.1 | meta_description, keywords, og_title, og_description |
| 6.5 | Blog tests | `done` | P1 | 6.1 | processor_test.go + blog_api_test.go |

---

## Epic 7: Media Pipeline

> Screenshots, Canva designs, Remotion videos, S3 upload.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 7.1 | S3 file upload integration | `done` | P0 | — | `clients/s3/client.go` — UploadFile, DeleteFile, GeneratePresignedURL |
| 7.2 | Media CRUD — store + processor + handler | `done` | P0 | 7.1 | Upload, Delete, List, GetPresignedURL |
| 7.3 | Puppeteer screenshot generation | `todo` | P1 | 7.1 | Node script + Go exec integration |
| 7.4 | Canva MCP integration | `todo` | P2 | 7.1 | GenerateSocialCard/Carousel/Banner |
| 7.5 | Remotion video generation | `todo` | P2 | 7.1 | render.mjs, React compositions |
| 7.6 | Media tests | `done` | P1 | 7.1 | processor_test.go + media_api_test.go |

---

## Epic 8: Analytics

> Collect engagement metrics from platforms, generate reports.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 8.1 | Analytics store + processor + handler | `done` | P1 | — | GetOverview, GetTimeSeries, GetPlatformBreakdown |
| 8.2 | Analytics collector — pull metrics from platform APIs | `todo` | P1 | 3.3+ | Needs real platform adapters to pull engagement data |
| 8.3 | Performance report generation | `todo` | P2 | 8.2 | Growth rate, best platform, recommendations |
| 8.4 | Analytics tests | `done` | P1 | 8.1 | processor_test.go + analytics_api_test.go |

---

## Epic 9: Billing & Subscriptions (Stripe)

> Checkout, customer portal, webhook handling.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 9.1 | Stripe checkout session creation | `done` | P1 | — | Embedded UI mode, `stripe-go/v79` |
| 9.2 | Stripe customer portal | `done` | P1 | 9.1 | Portal session with configuration ID |
| 9.3 | Stripe webhook handler | `done` | P1 | 9.1 | subscription lifecycle + invoice events |
| 9.4 | Product + price seeding | `done` | P1 | 9.1 | Free/Pro/Business plans |
| 9.5 | Tier gating middleware | `todo` | P2 | 9.1 | InjectTier, RequireFeature, RequireMinTier |
| 9.6 | Billing tests | `done` | P1 | 9.1 | billing/processor/processor_test.go |

---

## Epic 10: Web Dashboard (React)

> SaaS frontend — React 19 + Vite + TanStack Router + Proto Design System.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 10.1 | Project setup — Vite, TanStack Router, SCSS, biome | `done` | P0 | — | Vite 7.3, biome 2.3, sass-embedded |
| 10.2 | Proto Design System (50+ components) | `done` | P0 | 10.1 | Tokens, 30+ themes, all component categories |
| 10.3 | Auth pages — sign in, sign up, Google OAuth | `done` | P0 | 10.1 | AuthProvider, fetcher, ErrorBoundary |
| 10.4 | App shell — sidebar, navbar, routing | `done` | P0 | 10.2 | Growth Tools nav: Calendar, Posts, AI Chat, Media, Blog, Analytics, Settings |
| 10.5 | Strip old-project features + cleanup | `done` | P0 | — | Removed old types, hooks, cache keys, tier configs, e2e mocks |
| 10.6 | Dashboard home page | `done` | P0 | 10.4 | StatCards, quick actions |
| 10.7 | Content calendar view | `done` | P0 | 10.4 | Monthly grid, today highlight, prev/next navigation |
| 10.8 | Posts management page | `done` | P0 | 10.4 | Posts list, status/type filters, Create Post button, empty state |
| 10.9 | AI chat interface (SSE streaming) | `done` | P0 | 10.4 | Full chat UI with message input, send button |
| 10.10 | Media library page | `done` | P1 | 10.4 | Grid view, Upload button, empty state |
| 10.11 | Analytics dashboard | `done` | P1 | 10.4 | StatCards, empty state with connect prompt |
| 10.12 | Settings — voice profile + platform connections | `todo` | P1 | 10.4, 3.2 | Voice profile form exists, platform connections page needed |
| 10.13 | Billing page | `done` | P1 | 10.4 | Pricing plans, Stripe checkout, portal |
| 10.14 | Blog management page | `done` | P2 | 10.4 | Blog list, status filter, New Post button, empty state |
| 10.15 | Post editor page (create/edit modes) | `todo` | P0 | 10.8 | Content textarea, platform selector, media attachment, AI generate, schedule, preview |
| 10.16 | Blog editor page | `todo` | P1 | 10.14 | Title, slug, markdown editor, SEO sidebar, AI generate |
| 10.17 | Frontend API hooks | `done` | P1 | — | 15 hooks: posts, media, blog, analytics, platforms, content, voice profile |
| 10.18 | Frontend types | `done` | P0 | — | post.ts, platform.ts, media.ts, blog.ts, analytics.ts, voiceProfile.ts |
| 10.19 | Frontend E2E tests (Playwright + MSW) | `done` | P1 | 10.6+ | 6 spec files + 7 MSW handler files |

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
| 12.1 | Store tests — all CRUD operations | `done` | P0 | — | 10 test files, ~54 test functions |
| 12.2 | Processor unit tests — all 11 processors | `done` | P0 | — | 9 mock files + 9 test files, hand-written mocks |
| 12.3 | API integration tests | `done` | P1 | 12.1 | 7 test files, 67+ tests (posts, blog, media, platforms, analytics, settings, github) |
| 12.4 | Mock generation (go generate) | `done` | P0 | — | Hand-written mocks in processor test packages |
| 12.5 | CI pipeline (GitHub Actions) | `done` | P1 | 12.1 | `.github/workflows/ci.yml` |

---

## Epic 13: Infrastructure & Deployment

> AWS, Terraform, Docker, CI/CD.

| # | Task | Status | Priority | Depends On | Notes |
|---|------|--------|----------|------------|-------|
| 13.1 | Terraform — ALB, ECS, RDS, S3, CloudFront | `todo` | P1 | — | `infra-setup/` does not exist yet |
| 13.2 | Terraform — Kafka (MSK) | `todo` | P1 | 13.1 | ECS-based Kafka with EFS persistence |
| 13.3 | Terraform — Secrets Manager | `todo` | P1 | 13.1 | SSM parameters under `/gt/` namespace |
| 13.4 | Production Dockerfile | `todo` | P1 | — | Multi-stage Go build |
| 13.5 | Flyway migration container | `todo` | P1 | — | `Dockerfile.migrations` |
| 13.6 | CD pipeline — deploy on merge to main | `todo` | P2 | 13.1, 12.5 | ECR push + ECS deploy + S3/CloudFront webapp deploy |

---

## What's Next — Priority Order

### Phase A: Platform Adapters (P0 — core product value)
The platform adapters (3.3–3.10) are the **highest priority remaining work**. Without them, the app can't actually publish to social media. Start with X, BlueSky, LinkedIn (P0), then Meta, Threads, TikTok, Pinterest (P1).

### Phase B: Post Editor + Blog Editor UI (P0)
Post editor page (10.15) and blog editor page (10.16) are needed for the full content creation flow.

### Phase C: GitHub → Content Pipeline (P0)
Event-to-content mapping (5.6) connects GitHub activity to AI content generation — a key differentiator.

### Phase D: Blog AI Generation (P1)
AI blog generation (6.2, 6.3, 6.4) and settings/platform connections UI (10.12).

### Phase E: CLI (P1)
CLI app (Epic 11) for power users.

### Phase F: Infrastructure (P1)
Terraform, Docker, CI/CD (Epic 13) for production deployment.

---

## How to Use This Tracker

1. **Claim a task:** Update status to `in-progress` and add your agent/branch name in Notes
2. **Check dependencies:** Don't start a task if its `Depends On` column has incomplete tasks
3. **Mark done:** Update status to `done` when the task passes tests and builds cleanly
4. **Add tasks:** If you discover sub-tasks during implementation, add them under the right epic
5. **Blocked?** Set status to `blocked` and note what's blocking in the Notes column
