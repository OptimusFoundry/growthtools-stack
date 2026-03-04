# Product Requirements Document: Growth Tools

**Version:** 2.0
**Date:** February 18, 2026
**Status:** Draft

---

## 1. Executive Summary

Growth Tools is an AI-powered growth engine for solo founders. It automates the entire marketing pipeline — from detecting what you build (via GitHub activity) to generating content, creating visual assets, and publishing across 8 social media platforms and blogs. The founder focuses on shipping; the AI agent handles marketing.

**Core value proposition:** A marketing co-founder that never sleeps. Push code, and your audience knows about it.

**Two interfaces:**
- **CLI** — the AI agent's primary interface for automated content generation and publishing
- **SaaS Dashboard** — the founder's interface for review, approval, manual posting, and analytics

**Architecture:** Mirrors the first-saas-repo — Go backend (Gin + sqlx + Kafka), React frontend (Vite + TanStack Router + Proto Design System), PostgreSQL with Flyway migrations, AWS infrastructure (ALB, ECS, RDS, S3, CloudFront).

---

## 2. Problem Statement

Solo founders launching micro-SaaS and iOS apps face a critical bottleneck: they can build products but don't have the time, experience, or bandwidth to market them consistently. Marketing requires:

- Writing social media posts daily across multiple platforms
- Creating visual assets (images, carousels, videos)
- Maintaining a consistent posting schedule
- Writing SEO-optimized blog content
- Tracking performance and iterating on what works

Most solo founders either neglect marketing entirely or spend disproportionate time on it at the expense of building. There is no tool that watches what you build and autonomously markets it in your voice.

---

## 3. Target Users

### Primary Persona: Solo Founder
- Builds micro-SaaS products and/or iOS apps
- Technical — comfortable with CLI, GitHub, and APIs
- No marketing experience or desire to learn marketing deeply
- Wants to "build in public" but doesn't have time to post consistently
- Values authenticity — wants posts in their own voice, not generic AI slop

### Use Case Progression
1. **Start:** Personal brand growth (founder account)
2. **Iterate:** Product-specific accounts (separate social presence per product)
3. **Scale:** Full marketing automation (SEO, email, ASO, launches)

---

## 4. Product Vision

### The Workflow
```
Founder pushes code → AI detects changes → AI generates content →
AI creates media → AI publishes on schedule → Founder reviews from dashboard
```

### Guiding Principles
- **GitHub is the single source of truth.** Commits drive content. No manual input needed.
- **AI is autonomous but reviewable.** Posts are generated and queued automatically; the founder can approve, edit, or override before publishing.
- **Generate once, adapt everywhere.** Content is created once and adapted per platform (text post on X, carousel on Instagram, short video on TikTok, pin on Pinterest).
- **Founder's voice, not AI's voice.** Content matches the founder's tone, style, and personality via configurable voice profiles.

---

## 5. Features

### 5.1 GitHub Activity Watcher

**Description:** Monitors configured GitHub repositories for activity that triggers content generation.

**Triggers:**
| Event | Content Type | Priority |
|-------|-------------|----------|
| New release/tag | Ship announcement | High |
| Commits to main/default branch | WIP update | Medium |
| Stars/users/revenue milestones | Milestone post | High |
| New feature branch merged | Feature demo | Medium |
| PR merged | Progress update | Low |

**Requirements:**
- Poll GitHub API or use webhooks for real-time detection
- Deduplicate events (don't post about the same commit twice)
- Aggregate small commits into meaningful updates (e.g., 5 commits to onboarding → 1 "working on onboarding" post)
- Support multiple repositories per product
- Configurable event filters (ignore dependency bumps, CI changes, etc.)

**Configuration (products.yaml):**
```yaml
products:
  - name: "FocusTimer"
    type: ios
    repo: "github.com/you/focustimer"
    url: "https://focustimer.app"
    audience: "productivity enthusiasts, remote workers"
    keywords:
      - pomodoro
      - focus
      - productivity
      - time management
    watch:
      branches: ["main"]
      ignore_patterns: ["chore:", "deps:", "ci:"]
```

---

### 5.2 AI Content Generation

**Description:** Uses Claude API to generate social media posts in the founder's voice based on GitHub activity and scheduled content types. Follows the same AI architecture as first-saas-repo — SSE streaming for real-time generation, conversation persistence, usage tracking.

**Content Types:**
| Type | Trigger | Example |
|------|---------|---------|
| Ship it | New release/tag | "Just shipped v1.2 of FocusTimer -- now with Pomodoro streaks" |
| WIP update | Commits to main | "Working on the onboarding flow today. Here's a sneak peek..." |
| Milestone | Stars, users, revenue | "FocusTimer just hit 1,000 users. Here's what I learned..." |
| Insight / Hot take | Manual or scheduled | "3 things I wish I knew before building a productivity app" |
| Feature demo | New feature commits | Screenshot/video + description of what it does |
| Engagement | Scheduled | Polls, questions, "What feature should I build next?" |
| Thread / Carousel | Weekly or milestone | Deep dive into architecture, decisions, or learnings |
| Tips & tutorials | Scheduled | Technical how-tos related to founder's stack |
| Personal story | Manual or scheduled | Founder journey, lessons learned, wins and failures |

**Requirements:**
- Generate content using Claude API with founder voice profile as system prompt
- SSE streaming for real-time content generation in dashboard AI chat (same pattern as first-saas-repo's `useSSEChat`)
- Adapt content per platform (character limits, hashtags, formatting, media requirements)
- Support thread generation for X/Twitter (multi-tweet narratives)
- Deduplication — don't generate similar content within a configurable window
- Content queue with approval states: `draft` → `pending_review` → `approved` → `published`
- Manual content creation via CLI (`growth post`) and dashboard AI chat
- Conversation persistence (conversations + messages tables) for AI chat history
- Usage tracking (tokens used per generation) for cost monitoring

**Voice Profile (founder.yaml):**
```yaml
name: "Your Name"
handle: "@yourhandle"
bio: "Solo founder building micro-SaaS products"
tone: "casual, technical, honest"
topics:
  - building in public
  - indie hacking
  - productivity
  - iOS development
avoid:
  - corporate jargon
  - clickbait
  - excessive emojis
examples:
  - "Just shipped dark mode. Took 3 hours. Should've done it months ago."
  - "TIL: SwiftUI animations are either trivial or impossible. No middle ground."
```

---

### 5.3 Media Pipeline

#### 5.3.1 Screenshots (Puppeteer)
- Automated browser screenshots of product pages
- Used for feature announcements, progress updates, before/after comparisons
- Configurable viewport sizes for different platforms
- Support for annotated screenshots (highlight areas, add arrows)

#### 5.3.2 Canva Integration (via MCP)
- Design polished assets using Canva's MCP integration
- Asset types: social cards, carousels, banners, story templates
- Templates configured per product with brand colors, fonts, and logos
- Programmatic text/image swapping for templated designs

#### 5.3.3 Remotion Video Generation
- Generate short videos programmatically using React (Remotion)
- Runs as a separate TypeScript/Node process, invoked by the Go backend
- Video types:
  - **Feature demos:** Screen recording style with annotations
  - **Changelogs:** Animated list of changes with product screenshots
  - **Launch announcements:** Product showcase with call-to-action
- Compositions are data-driven — feed in product data, get a rendered video
- Output formats optimized per platform (9:16 for TikTok/Reels, 1:1 for feed, 16:9 for YouTube)

**Media Selection Logic:**
The AI decides which media to attach based on content type:
- Ship announcement → screenshot + Canva social card
- Feature demo → Remotion video or screenshot
- Carousel/Thread → Canva carousel slides
- Engagement post → text only or poll
- Milestone → Canva celebration graphic

---

### 5.4 Cross-Platform Publishing

**Architecture:** Adapter-based. Each platform implements a common interface (same adapter pattern used in first-saas-repo for integrations):

```go
type PlatformAdapter interface {
    Name() string
    Authenticate(ctx context.Context) error
    Publish(ctx context.Context, post *Post) (*PublishResult, error)
    GetMetrics(ctx context.Context, postID string) (*PostMetrics, error)
    ValidateContent(post *Post) *ValidationResult
}
```

**Platforms:**

| Platform | API | Supported Formats | Notes |
|----------|-----|-------------------|-------|
| X / Twitter | v2 REST API | Text, images, videos, threads | Thread support (multi-tweet) |
| BlueSky | AT Protocol | Text, images, videos | Decentralized protocol |
| LinkedIn | LinkedIn API | Text, images, articles, carousels | Professional tone adaptation |
| Facebook | Graph API | Text, images, videos, reels | Page posting |
| Instagram | Graph API | Images, reels, carousels, stories | Media required for all posts |
| Threads | Threads API (Meta) | Text, images, carousels | Text-first, casual tone |
| TikTok | TikTok API | Short-form videos | Video required |
| Pinterest | Pinterest API | Pins (image + link), idea pins | SEO-friendly descriptions |

**Content Adaptation Rules:**
A single piece of content is adapted per platform:
- **X:** Concise text (280 chars), optional image/video, thread for long-form
- **BlueSky:** Similar to X, 300 char limit, alt text for images
- **LinkedIn:** Professional framing, longer text allowed, article format for deep content
- **Facebook:** Casual but informative, image/video preferred
- **Instagram:** Visual-first — always needs an image or video, caption with hashtags
- **Threads:** Conversational, text-first, short and punchy
- **TikTok:** Video only — short, engaging, with text overlays
- **Pinterest:** Image + SEO-rich description + link back to product

**Scheduling:**
- Optimal posting times per platform (configurable, with sensible defaults)
- Queue management — spread posts throughout the day, avoid flooding
- Timezone-aware scheduling
- Rate limiting per platform API

---

### 5.5 Blog Engine

**Description:** AI-powered blog writing system that generates SEO-optimized long-form content.

**Components:**

#### Topic Generation (`internal/blog/topics.go`)
- Generate topic ideas from:
  - Keyword gap analysis (what competitors rank for, you don't)
  - Repository activity (turn major features/releases into blog posts)
  - Industry trends and founder expertise areas
- Output: ranked list of topics with estimated search volume and difficulty

#### Blog Writer (`internal/blog/writer.go`)
- Generate long-form SEO-optimized blog posts using Claude API
- Structure: title, meta description, headers (H2/H3), body, internal links, CTA
- Support for technical tutorials, product announcements, thought leadership, and listicles
- Drafts go through the same approval flow as social posts

#### SEO Optimization (`internal/blog/seo.go`)
- Keyword research and density optimization
- Meta tags, Open Graph tags, schema markup suggestions
- Internal linking recommendations
- Readability scoring

#### CMS Publishing (`internal/blog/publisher.go`)
- Publish to supported CMS platforms:
  - Ghost (Admin API)
  - WordPress (REST API)
  - MDX (file-based, push to repo)
  - Hashnode (GraphQL API)
- Configurable per product — different products can use different CMS

---

### 5.6 CLI Application

**Framework:** Go CLI (cobra or built-in flag package, matching Go backend)

**Commands:**

```
growth plan [--days <n>]
  Scan all configured repos, generate a content plan for the next N days.
  Output: list of planned posts with types, platforms, and scheduled times.

growth post --type <type> --product <product> [--screenshot] [--text <text>]
  Generate a single post. Optionally attach a screenshot.
  Types: ship, wip, milestone, insight, feature, engagement, thread, tip, story

growth video --type <type> --product <product>
  Generate a Remotion video for the given product.
  Types: demo, changelog, announcement

growth media --type <type> [--topic <topic>] [--product <product>]
  Generate a Canva media asset.
  Types: carousel, social-card, banner, story

growth publish [--today] [--post-id <id>] [--platform <platform>]
  Publish queued content. --today publishes everything scheduled for today.

growth report [--period <weekly|monthly>]
  Generate a performance report across all platforms.

growth blog write --product <product> --topic <topic>
  Generate a blog post draft.

growth blog topics --product <product> [--count <n>]
  Generate N blog topic ideas with keyword data.

growth blog publish --draft <slug>
  Publish a draft blog post to configured CMS.

growth config [--edit]
  View or edit founder/product configuration.

growth status
  Show current queue, upcoming scheduled posts, and platform connection status.
```

---

### 5.7 SaaS Dashboard (Web)

**Framework:** React 19 + Vite + TanStack Router (file-based routing) + Proto Design System

Uses the same frontend architecture, design system, and patterns from first-saas-repo:
- **Routing:** TanStack Router with file-based routing and auto code-splitting
- **Styling:** SCSS + CSS Modules + BEM naming + Proto Design System tokens
- **State:** React Context (AuthProvider, ThemeProvider, SidebarContext)
- **API Client:** Centralized `fetcher` / `publicFetcher` with credential handling
- **Components:** Proto Design System (50+ components: primitives, forms, layout, navigation, overlays, feedback, data, composite)
- **Theming:** 40+ themes via CSS custom properties (light, dark, neon, cyberpunk, etc.)

**Pages:**

#### Content Calendar (`/calendar`)
- Visual calendar showing all scheduled posts across platforms
- Drag-and-drop rescheduling
- Color-coded by platform and content type (using Proto Badge/Tag components)
- Filter by platform, product, content type, or status

#### Post Editor (`/posts`)
- List view of all posts (drafts, pending review, approved, published) using Proto DataGrid
- Rich text editor with platform preview (see how the post looks on each platform)
- Approval workflow: approve, edit, reject, reschedule
- Bulk actions (approve all, reschedule batch)

#### AI Chat (`/chat`)
- Chat interface for creating posts conversationally
- SSE streaming for real-time AI responses (same pattern as first-saas-repo's `useSSEChat` hook)
- "Write a thread about the technical decisions behind FocusTimer's sync engine"
- "Create an engagement poll about productivity tools"
- Conversation persistence — chat history stored in conversations/messages tables
- Generated content goes into the post queue for review

#### Media Library (`/media`)
- Browse all generated assets: screenshots, Canva designs, Remotion videos
- Filter by product, type, date
- Preview and download assets
- Re-render Remotion videos with updated data

#### Analytics (`/analytics`)
- Per-platform metrics: followers, impressions, engagement rate, top posts (Proto StatCard)
- Growth charts over time
- Content type performance comparison
- Blog metrics: traffic, search rankings, backlinks
- Best posting times heatmap

#### Settings (`/settings`)
- Founder profile (voice, tone, topics, bio)
- Product configuration (repos, URLs, keywords)
- Platform connections (OAuth, API keys)
- Posting schedule and frequency
- Notification preferences

---

## 6. Technical Architecture

### 6.1 Project Structure

Mirrors first-saas-repo layout — Go backend, React frontend, separate directories:

```
growth-tools/
├── base-server/                         # Go backend API
│   ├── main.go                          # Entry point
│   ├── go.mod / go.sum
│   ├── Makefile                         # dev-up, dev-test, build targets
│   ├── Dockerfile
│   │
│   ├── server/
│   │   └── server.go                    # Gin router, CORS, middleware, graceful shutdown
│   │
│   ├── bootstrap/
│   │   └── bootstrap.go                 # Dependency injection — wires all handlers, processors, store
│   │
│   ├── api/
│   │   └── api.go                       # Route registration (auth, protected, public)
│   │
│   ├── config/
│   │   └── config.go                    # Environment-based configuration
│   │
│   ├── store/
│   │   ├── store.go                     # PostgreSQL connection pool (sqlx)
│   │   ├── posts.go                     # Post CRUD operations
│   │   ├── media.go                     # Media asset operations
│   │   ├── platform_posts.go            # Platform-specific post records
│   │   ├── events.go                    # GitHub event storage
│   │   ├── analytics.go                 # Metrics storage & aggregation
│   │   ├── blog_posts.go               # Blog post CRUD
│   │   ├── conversations.go             # AI chat history
│   │   └── messages.go                  # AI conversation messages
│   │
│   ├── internal/
│   │   ├── auth/                        # JWT + Google OAuth (same as first-saas-repo)
│   │   │   ├── handler/
│   │   │   └── processor/
│   │   │
│   │   ├── github/                      # GitHub activity watcher
│   │   │   ├── handler/handler.go       # Webhook receiver + manual scan endpoint
│   │   │   ├── processor/processor.go   # Event processing, dedup, aggregation
│   │   │   └── events.go               # Event type definitions
│   │   │
│   │   ├── content/                     # AI content generation
│   │   │   ├── handler/handler.go       # POST /api/protected/content/generate
│   │   │   ├── processor/processor.go   # Claude API calls, voice profile, adaptation
│   │   │   └── templates.go             # Post templates by content type
│   │   │
│   │   ├── ai-chat/                     # AI chat (SSE streaming, same as first-saas-repo)
│   │   │   ├── handler/handler.go       # SSE endpoint for streaming AI responses
│   │   │   └── processor/processor.go   # Claude API conversation management
│   │   │
│   │   ├── publish/                     # Cross-platform publishing
│   │   │   ├── handler/handler.go       # Publish endpoints
│   │   │   ├── processor/processor.go   # Orchestrates publishing across platforms
│   │   │   ├── adapters/               # Platform adapter implementations
│   │   │   │   ├── adapter.go          # PlatformAdapter interface
│   │   │   │   ├── x.go               # X/Twitter API v2
│   │   │   │   ├── bluesky.go         # AT Protocol
│   │   │   │   ├── linkedin.go        # LinkedIn API
│   │   │   │   ├── facebook.go        # Facebook Graph API
│   │   │   │   ├── instagram.go       # Instagram Graph API
│   │   │   │   ├── threads.go         # Threads API (Meta)
│   │   │   │   ├── tiktok.go          # TikTok API
│   │   │   │   └── pinterest.go       # Pinterest API
│   │   │   └── scheduler/
│   │   │       └── scheduler.go        # Queue + optimal timing
│   │   │
│   │   ├── media/                       # Media asset creation
│   │   │   ├── handler/handler.go       # Media generation endpoints
│   │   │   ├── processor/processor.go   # Orchestrates media pipeline
│   │   │   ├── screenshots.go          # Puppeteer integration (exec node script)
│   │   │   └── canva.go               # Canva MCP integration
│   │   │
│   │   ├── blog/                        # Blog engine
│   │   │   ├── handler/handler.go       # Blog CRUD + generation endpoints
│   │   │   ├── processor/processor.go   # AI blog writing, SEO, topic generation
│   │   │   ├── seo.go                  # Keyword research + on-page SEO
│   │   │   ├── topics.go              # Topic generation from gaps + repo activity
│   │   │   └── publisher.go           # CMS publishing (Ghost, WordPress, MDX, Hashnode)
│   │   │
│   │   ├── analytics/                   # Performance tracking
│   │   │   ├── handler/handler.go       # Analytics endpoints
│   │   │   ├── processor/processor.go   # Metric aggregation, reports
│   │   │   └── collector.go            # Pull engagement data from platforms
│   │   │
│   │   ├── money/                       # Stripe billing (same as first-saas-repo)
│   │   │   ├── handler/
│   │   │   └── processor/
│   │   │
│   │   └── apierrors/
│   │       └── errors.go               # Centralized error responses (400, 401, 403, 404, 500)
│   │
│   ├── workers/                         # Kafka background consumers
│   │   ├── publish_consumer.go          # Async post publishing
│   │   ├── media_consumer.go            # Async media generation
│   │   ├── analytics_consumer.go        # Async metrics collection
│   │   ├── blog_consumer.go             # Async blog generation
│   │   ├── github_consumer.go           # Process GitHub webhook events
│   │   └── scheduler_worker.go          # Periodic: check scheduled posts, trigger publish
│   │
│   └── migrations/                      # Flyway SQL migrations
│       ├── V0001__create_posts.sql
│       ├── V0002__create_media.sql
│       ├── V0003__create_platform_posts.sql
│       ├── V0004__create_events.sql
│       ├── V0005__create_analytics.sql
│       ├── V0006__create_blog_posts.sql
│       ├── V0007__create_conversations.sql
│       ├── V0008__create_messages.sql
│       ├── V0009__create_users_and_auth.sql
│       └── V0010__create_subscriptions.sql
│
├── webapp/                              # React frontend (SaaS dashboard)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── biome.json                       # Linting (same as first-saas-repo)
│   │
│   ├── src/
│   │   ├── main.tsx                     # Entry point
│   │   ├── routeTree.gen.ts             # Auto-generated route tree
│   │   │
│   │   ├── proto-design-system/         # Copied from first-saas-repo
│   │   │   ├── components/
│   │   │   │   ├── primitives/          # Button, Badge, Text, Icon, Avatar, Spinner, Tag
│   │   │   │   ├── forms/              # Input, Select, Checkbox, Radio, Textarea, Switch
│   │   │   │   ├── layout/            # Stack, Grid, Card, Container, Divider
│   │   │   │   ├── navigation/        # Tabs, Sidebar, Breadcrumb, Pagination, Navbar
│   │   │   │   ├── overlays/          # Modal, Dropdown, Popover, Tooltip
│   │   │   │   ├── feedback/          # Alert, Toast, Progress, Banner
│   │   │   │   ├── data/             # Table, DataGrid, StatCard, List, EmptyState
│   │   │   │   └── composite/        # Accordion, DatePicker, FileUpload
│   │   │   ├── tokens/                 # Design tokens (spacing, colors, typography)
│   │   │   ├── themes/                 # 40+ theme definitions
│   │   │   ├── hooks/                  # useMediaQuery, useFocusTrap, useClickOutside
│   │   │   └── context/               # ThemeProvider, MotionProvider
│   │   │
│   │   ├── routes/                      # File-based routing (TanStack Router)
│   │   │   ├── __root.tsx              # Root layout with sidebar
│   │   │   ├── index.tsx               # Dashboard home
│   │   │   ├── calendar.tsx            # Content calendar
│   │   │   ├── posts/                  # Post list + editor
│   │   │   │   ├── index.tsx
│   │   │   │   └── $postId.tsx         # Single post editor
│   │   │   ├── chat.tsx                # AI chat interface
│   │   │   ├── media.tsx               # Media library
│   │   │   ├── analytics.tsx           # Performance dashboard
│   │   │   ├── blog/                   # Blog management
│   │   │   │   ├── index.tsx
│   │   │   │   └── $slug.tsx           # Blog post editor
│   │   │   ├── settings.tsx            # Configuration
│   │   │   ├── billing.tsx             # Stripe billing
│   │   │   └── signin.tsx              # Auth page
│   │   │
│   │   ├── features/                    # Domain-specific feature modules
│   │   │   ├── calendar/               # Calendar view components
│   │   │   ├── posts/                  # Post editor, approval queue
│   │   │   ├── chat/                   # AI chat UI components
│   │   │   ├── media/                  # Media library components
│   │   │   ├── analytics/             # Charts, stat cards, reports
│   │   │   ├── blog/                  # Blog editor components
│   │   │   └── settings/             # Settings form components
│   │   │
│   │   ├── hooks/                       # Custom React hooks
│   │   │   ├── useSSEChat.ts           # AI chat with SSE streaming (from first-saas-repo)
│   │   │   ├── usePosts.ts            # Post CRUD operations
│   │   │   ├── useCalendar.ts         # Calendar data fetching
│   │   │   ├── useMedia.ts            # Media library operations
│   │   │   ├── useAnalytics.ts        # Analytics data
│   │   │   ├── useBlog.ts             # Blog post operations
│   │   │   └── usePublish.ts          # Publishing operations
│   │   │
│   │   ├── api/
│   │   │   ├── client.ts              # fetcher / publicFetcher (from first-saas-repo)
│   │   │   └── types/                 # API response types
│   │   │
│   │   ├── contexts/
│   │   │   ├── auth.tsx               # AuthProvider (from first-saas-repo)
│   │   │   ├── providers.tsx          # Wraps all providers
│   │   │   └── tier.tsx               # Subscription tier context
│   │   │
│   │   ├── types/                      # TypeScript type definitions
│   │   └── utils/                      # Utility functions
│   │
│   └── public/
│
├── cli/                                 # Go CLI binary
│   ├── main.go                         # CLI entry point
│   ├── commands/                       # CLI commands (plan, post, publish, etc.)
│   │   ├── plan.go
│   │   ├── post.go
│   │   ├── publish.go
│   │   ├── video.go
│   │   ├── media.go
│   │   ├── blog.go
│   │   ├── report.go
│   │   ├── status.go
│   │   └── config.go
│   └── go.mod                          # Shares packages with base-server
│
├── remotion/                            # Remotion video generation (TypeScript/Node)
│   ├── package.json
│   ├── src/
│   │   ├── compositions/              # Video templates
│   │   │   ├── FeatureDemo.tsx
│   │   │   ├── Changelog.tsx
│   │   │   └── LaunchAnnouncement.tsx
│   │   ├── Root.tsx
│   │   └── render.ts                  # CLI render script (called by Go backend)
│   └── remotion.config.ts
│
├── infra-setup/                         # Terraform (same as first-saas-repo)
│   ├── main.tf
│   ├── alb.tf                          # Application Load Balancer
│   ├── ecs.tf                          # ECS for Go server
│   ├── rds.tf                          # PostgreSQL RDS
│   ├── s3.tf                           # S3 for media assets
│   ├── cloudfront.tf                   # CDN for webapp + media
│   ├── kafka.tf                        # Kafka cluster (MSK)
│   ├── secrets.tf                      # Secrets Manager
│   └── route53.tf                      # DNS
│
├── config/
│   ├── founder.yaml                    # Founder voice profile
│   └── products.yaml                   # Product configurations
│
├── docker-compose.services.yml          # Local dev (postgres, kafka, flyway)
├── docker-compose.test.yml              # Isolated test environment
└── README.md
```

### 6.2 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Backend Language | Go 1.23 | Matches first-saas-repo; fast, concurrent, production-proven |
| Web Framework | Gin | Mature Go HTTP framework with middleware support |
| Database | PostgreSQL | Same as first-saas-repo; robust, JSONB support for flexible data |
| ORM / DB Client | sqlx | Lightweight, type-safe SQL; no magic ORM layer |
| Migrations | Flyway | Versioned SQL migrations; same as first-saas-repo |
| Event Streaming | Apache Kafka | Async processing for publishing, media gen, analytics |
| Frontend Framework | React 19 + Vite | Same as first-saas-repo; fast dev server, HMR |
| Routing | TanStack Router | File-based routing with auto code-splitting |
| Design System | Proto Design System | 50+ components, 40+ themes; copied from first-saas-repo |
| Styling | SCSS + CSS Modules + BEM | Same as first-saas-repo; scoped styles, design tokens |
| AI | Claude API (Anthropic) | Content generation, voice matching, blog writing |
| AI Streaming | SSE (Server-Sent Events) | Real-time AI responses in dashboard chat |
| Auth | JWT + Google OAuth | Same as first-saas-repo |
| Billing | Stripe | Same as first-saas-repo |
| Screenshots | Puppeteer (Node) | Headless Chrome; invoked by Go via exec |
| Design Assets | Canva MCP | Programmatic design asset creation |
| Video | Remotion (TypeScript) | React-based video gen; separate Node process |
| Infrastructure | AWS (ALB, ECS, RDS, S3, CloudFront) | Same as first-saas-repo |
| IaC | Terraform | Same as first-saas-repo |
| Linting | Biome (frontend), golangci-lint (backend) | Same as first-saas-repo |
| Testing | Go testing + Playwright + MSW | Same as first-saas-repo |

### 6.3 Backend Architecture Pattern

Follows first-saas-repo's **Handler → Processor → Store** pattern:

```
HTTP Request
    ↓
Gin Router → CORS Middleware → Auth Middleware (JWT)
    ↓
Handler (validate input, parse request, HTTP concerns)
    ↓
Processor (business logic, AI calls, platform adapters)
    ↓
Store (database operations via sqlx)
    ↓
PostgreSQL
```

**Dependency Injection (bootstrap.go):**
All components are wired together in `bootstrap.go` — handlers receive processors, processors receive store + external clients. No global state.

**Background Workers (Kafka Consumers):**

| Worker | Kafka Topic | Purpose |
|--------|------------|---------|
| PublishConsumer | `growth.publish` | Async publishing to platforms |
| MediaConsumer | `growth.media` | Async screenshot/Canva/Remotion generation |
| AnalyticsConsumer | `growth.analytics` | Pull engagement metrics from platforms |
| BlogConsumer | `growth.blog` | Async blog generation via Claude API |
| GitHubConsumer | `growth.github` | Process incoming GitHub webhook events |
| SchedulerWorker | (periodic, 30s) | Check for posts due to publish, enqueue to Kafka |

**Error Handling:**
- Domain-specific errors as package variables (e.g., `ErrPostNotFound`, `ErrPlatformRateLimited`)
- Centralized error mapping to HTTP responses in `apierrors/errors.go`
- Never expose internal errors to API consumers

### 6.4 Frontend Architecture Pattern

Mirrors first-saas-repo exactly:

```
main.tsx → Router (TanStack) → AuthProvider → Providers → Routes → Features → Proto Components
```

**API Communication:**
- `fetcher(url)` — authenticated requests (includes credentials, JWT)
- `publicFetcher(url)` — unauthenticated requests
- Custom hooks wrap API calls (e.g., `usePosts`, `useAnalytics`)
- SSE via `useSSEChat` hook for streaming AI responses

**State Management:**
- AuthContext — user, isLoggedIn, tokens
- ThemeProvider — theme selection (40+ themes)
- SidebarContext — navigation state
- TierContext — subscription tier info

### 6.5 Database Schema

All tables use PostgreSQL. Migrations managed by Flyway (V0001, V0002, etc.).

```sql
-- V0001: Core posts table
CREATE TABLE posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES accounts(id),
    product_id      TEXT NOT NULL,
    content_type    TEXT NOT NULL,          -- ship, wip, milestone, insight, feature, engagement, thread, tip, story
    status          TEXT NOT NULL DEFAULT 'draft',  -- draft, pending_review, approved, scheduled, published, failed
    body            TEXT NOT NULL,          -- source text content
    platform_data   JSONB,                 -- per-platform adapted content
    media_ids       JSONB,                 -- array of media UUIDs
    source_event_id UUID REFERENCES events(id),
    scheduled_at    TIMESTAMPTZ,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_account_status ON posts(account_id, status);
CREATE INDEX idx_posts_scheduled ON posts(scheduled_at) WHERE status = 'scheduled';

-- V0002: Media assets
CREATE TABLE media (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES accounts(id),
    type            TEXT NOT NULL,          -- screenshot, canva, remotion
    url             TEXT NOT NULL,          -- S3 URL or local path
    metadata        JSONB,                 -- dimensions, duration, platform target
    product_id      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- V0003: Platform-specific published posts
CREATE TABLE platform_posts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id           UUID NOT NULL REFERENCES posts(id),
    platform          TEXT NOT NULL,        -- x, bluesky, linkedin, facebook, instagram, threads, tiktok, pinterest
    platform_post_id  TEXT,                 -- ID on the external platform
    url               TEXT,                 -- link to published post
    status            TEXT NOT NULL DEFAULT 'pending', -- pending, published, failed, deleted
    published_at      TIMESTAMPTZ,
    error             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_posts_post ON platform_posts(post_id);

-- V0004: GitHub events
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES accounts(id),
    product_id      TEXT NOT NULL,
    source          TEXT NOT NULL DEFAULT 'github',
    event_type      TEXT NOT NULL,          -- commit, pr_merged, release, star_milestone
    payload         JSONB NOT NULL,         -- raw event data
    processed       BOOLEAN NOT NULL DEFAULT FALSE,
    post_id         UUID REFERENCES posts(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_unprocessed ON events(account_id, processed) WHERE processed = FALSE;

-- V0005: Analytics metrics
CREATE TABLE analytics (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_post_id  UUID NOT NULL REFERENCES platform_posts(id),
    impressions       INTEGER DEFAULT 0,
    likes             INTEGER DEFAULT 0,
    replies           INTEGER DEFAULT 0,
    reposts           INTEGER DEFAULT 0,
    clicks            INTEGER DEFAULT 0,
    followers_delta   INTEGER DEFAULT 0,
    fetched_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_post ON analytics(platform_post_id);

-- V0006: Blog posts
CREATE TABLE blog_posts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id        UUID NOT NULL REFERENCES accounts(id),
    product_id        TEXT,
    title             TEXT NOT NULL,
    slug              TEXT NOT NULL UNIQUE,
    body              TEXT NOT NULL,        -- markdown content
    meta_description  TEXT,
    keywords          JSONB,
    status            TEXT NOT NULL DEFAULT 'draft',
    cms_platform      TEXT,                -- ghost, wordpress, mdx, hashnode
    cms_post_id       TEXT,
    published_url     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at      TIMESTAMPTZ
);

-- V0007: AI conversations (same as first-saas-repo)
CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    title           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- V0008: AI conversation messages (same as first-saas-repo)
CREATE TABLE messages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id   UUID NOT NULL REFERENCES conversations(id),
    role              TEXT NOT NULL,        -- user, assistant
    content           TEXT NOT NULL,
    tokens_used       INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- V0009: Users & auth (same as first-saas-repo)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name      TEXT,
    last_name       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    owner_user_id   UUID NOT NULL REFERENCES users(id),
    plan            TEXT NOT NULL DEFAULT 'free',
    stripe_customer_id TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_auth (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    auth_type       TEXT NOT NULL           -- email, google
);

CREATE TABLE email_auth (
    auth_id         UUID PRIMARY KEY REFERENCES user_auth(id),
    email           TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL
);

CREATE TABLE oauth_auth (
    auth_id         UUID PRIMARY KEY REFERENCES user_auth(id),
    external_id     TEXT NOT NULL,
    email           TEXT NOT NULL,
    auth_provider   TEXT NOT NULL           -- google
);

-- V0010: Subscriptions & billing (same as first-saas-repo)
CREATE TABLE products (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_product_id TEXT NOT NULL UNIQUE,
    name              TEXT NOT NULL
);

CREATE TABLE prices (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id        UUID NOT NULL REFERENCES products(id),
    stripe_price_id   TEXT NOT NULL UNIQUE,
    amount            INTEGER NOT NULL
);

CREATE TABLE subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id),
    stripe_subscription_id  TEXT NOT NULL UNIQUE,
    status                  TEXT NOT NULL,
    current_period_end      TIMESTAMPTZ
);

-- V0011: Voice profiles & product configs (stored in DB, not just YAML)
CREATE TABLE voice_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES accounts(id),
    name            TEXT NOT NULL,
    handle          TEXT,
    bio             TEXT,
    tone            TEXT,
    topics          JSONB,
    avoid           JSONB,
    examples        JSONB,
    platform_handles JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES accounts(id),
    name            TEXT NOT NULL,
    type            TEXT,                   -- ios, saas, web
    repo_url        TEXT,
    product_url     TEXT,
    audience        TEXT,
    keywords        JSONB,
    watch_config    JSONB,                  -- branches, ignore_patterns
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 6.6 API Routes

```
# Auth (same as first-saas-repo)
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/google/callback

# Protected routes (JWT required)
GET    /api/protected/user/info
PUT    /api/protected/user/info

# Posts
GET    /api/protected/posts                     # List posts (filter by status, product, type)
GET    /api/protected/posts/:id                  # Get single post
POST   /api/protected/posts/generate             # AI generate a post
PUT    /api/protected/posts/:id                  # Edit post
PUT    /api/protected/posts/:id/approve          # Approve post
PUT    /api/protected/posts/:id/reject           # Reject post
PUT    /api/protected/posts/:id/schedule         # Schedule post
DELETE /api/protected/posts/:id                  # Delete post

# Publishing
POST   /api/protected/publish/:id               # Publish single post
POST   /api/protected/publish/today              # Publish all scheduled for today
POST   /api/protected/publish/bulk               # Bulk publish

# AI Chat (SSE streaming)
POST   /api/protected/ai/conversation            # Create/continue conversation (SSE)
GET    /api/protected/ai/conversations           # List conversations
GET    /api/protected/ai/conversations/:id       # Get conversation with messages

# Media
GET    /api/protected/media                      # List media assets
POST   /api/protected/media/screenshot           # Generate screenshot
POST   /api/protected/media/canva                # Generate Canva asset
POST   /api/protected/media/video                # Generate Remotion video
DELETE /api/protected/media/:id                  # Delete media

# GitHub
POST   /api/webhooks/github                      # GitHub webhook receiver (public)
POST   /api/protected/github/scan                # Manual scan trigger
GET    /api/protected/events                     # List GitHub events

# Blog
GET    /api/protected/blog                       # List blog posts
POST   /api/protected/blog/generate              # AI generate blog post
POST   /api/protected/blog/topics                # Generate topic ideas
PUT    /api/protected/blog/:id                   # Edit blog post
POST   /api/protected/blog/:id/publish           # Publish to CMS

# Analytics
GET    /api/protected/analytics/overview         # Dashboard overview stats
GET    /api/protected/analytics/posts/:id        # Metrics for a specific post
GET    /api/protected/analytics/platforms         # Per-platform breakdown
GET    /api/protected/analytics/report            # Generate performance report

# Calendar
GET    /api/protected/calendar                   # Calendar view (posts by date range)
PUT    /api/protected/calendar/reschedule        # Drag-and-drop reschedule

# Settings
GET    /api/protected/settings/voice-profile     # Get voice profile
PUT    /api/protected/settings/voice-profile     # Update voice profile
GET    /api/protected/settings/products          # List product configs
POST   /api/protected/settings/products          # Add product config
PUT    /api/protected/settings/products/:id      # Update product config
GET    /api/protected/settings/platforms          # Platform connection status
POST   /api/protected/settings/platforms/:name/connect  # Connect platform (OAuth)

# Billing (same as first-saas-repo)
POST   /api/protected/billing/checkout
POST   /api/protected/billing/portal
GET    /api/protected/billing/subscription
```

---

## 7. User Flows

### 7.1 Automated Content Pipeline (CLI / Cron)

```
1. `growth plan --days 7` runs (via cron or manually)
2. GitHub watcher scans all configured repos for activity since last scan
3. Events are deduplicated and stored in the events table
4. Content generator processes unprocessed events:
   a. Maps event type → content type(s)
   b. Generates post text via Claude API using founder voice profile
   c. Determines which media to create (screenshot, Canva, Remotion)
   d. Adapts content per platform
   e. Stores posts with status=pending_review
5. Scheduler assigns optimal posting times based on platform + timezone
6. Founder reviews from dashboard (or CLI: `growth status`)
7. `growth publish --today` publishes approved posts for today
8. Post-publish: platform post IDs are stored, analytics collection begins
```

### 7.2 Manual Post Creation (Dashboard)

```
1. Founder opens /chat in dashboard
2. Types: "Write a thread about why I chose SwiftUI over UIKit"
3. AI generates a thread draft via SSE streaming (real-time token display)
4. Founder reviews in /posts editor, sees platform previews
5. Founder edits, approves, and schedules
6. SchedulerWorker picks up post at scheduled time → publishes via Kafka
```

### 7.3 Manual Post Creation (CLI)

```
1. growth post --type insight --product focustimer --text "3 lessons from launching FocusTimer"
2. CLI calls base-server API: POST /api/protected/posts/generate
3. AI expands the text into full posts for each platform
4. Posts are stored with status=pending_review
5. Founder approves via dashboard or CLI
6. growth publish --today → calls POST /api/protected/publish/today
```

### 7.4 Blog Post Workflow

```
1. growth blog topics --product focustimer --count 10
   → Calls POST /api/protected/blog/topics
   → Returns 10 ranked topic ideas with keyword data
2. Founder picks a topic
3. growth blog write --product focustimer --topic "pomodoro vs timeboxing"
   → Calls POST /api/protected/blog/generate
   → AI generates a full blog post draft
4. Founder reviews and edits in dashboard
5. growth blog publish --draft "pomodoro-vs-timeboxing"
   → Calls POST /api/protected/blog/:id/publish
   → Publishes to configured CMS
6. AI generates social posts promoting the blog post
```

### 7.5 Event-Driven Publishing Flow

```
1. SchedulerWorker runs every 30s, queries posts WHERE status='approved' AND scheduled_at <= NOW()
2. For each due post, publishes event to Kafka topic `growth.publish`
3. PublishConsumer picks up event:
   a. For each target platform, calls the appropriate PlatformAdapter.Publish()
   b. Creates platform_posts record with platform_post_id and URL
   c. Updates post status to 'published'
   d. On failure: updates status to 'failed', stores error, schedules retry
4. After successful publish, enqueues analytics collection to `growth.analytics`
5. AnalyticsConsumer periodically pulls metrics from platform APIs
```

---

## 8. Configuration

### 8.1 Environment Variables (.env)

```env
# Server
SERVER_PORT=8080
JWT_SECRET=...

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=growth
DB_PASSWORD=...
DB_NAME=growth_tools

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=growth-events
KAFKA_CONSUMER_GROUP=growth-workers

# AI
ANTHROPIC_API_KEY=sk-ant-...

# GitHub
GITHUB_TOKEN=ghp_...
GITHUB_WEBHOOK_SECRET=...

# Social Platforms
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_SECRET=...

BLUESKY_HANDLE=you.bsky.social
BLUESKY_APP_PASSWORD=...

LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_ACCESS_TOKEN=...

FACEBOOK_PAGE_ID=...
FACEBOOK_ACCESS_TOKEN=...

INSTAGRAM_BUSINESS_ACCOUNT_ID=...
INSTAGRAM_ACCESS_TOKEN=...

THREADS_ACCESS_TOKEN=...

TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
TIKTOK_ACCESS_TOKEN=...

PINTEREST_ACCESS_TOKEN=...

# Blog CMS
GHOST_API_URL=...
GHOST_ADMIN_API_KEY=...

# Stripe (same as first-saas-repo)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Google OAuth (same as first-saas-repo)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# S3 (media storage)
AWS_S3_BUCKET=growth-tools-media
AWS_REGION=us-east-1
```

### 8.2 founder.yaml

Defines the founder's voice, tone, and platform handles. Used as the system prompt context for all AI content generation. Also stored in DB via `voice_profiles` table for dashboard editing. See section 5.2 for full example.

### 8.3 products.yaml

Defines each product the founder is building. Also stored in DB via `product_configs` table for dashboard editing. See section 5.1 for full example.

---

## 9. Non-Functional Requirements

### 9.1 Performance
- Content generation should complete within 30 seconds per post
- Publishing queue should handle 50+ posts per day without bottlenecking
- Dashboard should load within 2 seconds
- Analytics data should refresh at least every 6 hours
- Kafka consumers should process events within 5 seconds

### 9.2 Reliability
- Failed publishes should retry with exponential backoff (max 3 retries) via Kafka
- Platform API rate limits must be respected with proper throttling
- Content generation failures should not block the pipeline — skip and log
- Database backed up daily via RDS automated backups
- Graceful shutdown with in-flight request completion (same as first-saas-repo)

### 9.3 Security
- API keys stored in environment / AWS Secrets Manager, never committed to git
- OAuth tokens encrypted at rest in PostgreSQL
- JWT authentication on all protected routes
- GitHub webhook secret validation
- GitHub token should have minimal required permissions (read-only for repos)
- CORS configured for dashboard origin only

### 9.4 Observability
- Structured logging with context fields (same as first-saas-repo)
- CLI output should be clear and actionable
- Dashboard should show real-time status of the publishing pipeline
- Error notifications (failed publishes, API auth issues, rate limits)

---

## 10. Phased Roadmap

### Phase 1 -- Social Engine (MVP)
**Goal:** Generate and publish social posts from GitHub activity to all 8 platforms.

Deliverables:
- Project setup (Go backend, React frontend, PostgreSQL, Kafka, Flyway, Terraform)
- Copy Proto Design System + auth + billing from first-saas-repo
- GitHub activity watcher (webhooks + polling)
- AI content generation (Claude API) with founder voice profile
- All 8 platform adapters (X, BlueSky, LinkedIn, Facebook, Instagram, Threads, TikTok, Pinterest)
- Cross-platform content adaptation
- Kafka workers for async publishing
- Go CLI: `plan`, `post`, `publish`, `status`
- Web dashboard: content calendar, post editor, approval queue, AI chat
- Docker Compose for local dev

### Phase 2 -- Media + Blog
**Goal:** Rich media creation and SEO blog engine.

Deliverables:
- Automated screenshots (Puppeteer via Node exec)
- Canva MCP integration for designed assets
- Remotion video generation (separate Node process)
- Media library in dashboard (S3 storage)
- AI blog post writer (SEO-optimized, long-form)
- Keyword research + topic generation
- CMS publishing (Ghost, WordPress, MDX, Hashnode)
- CLI commands: `video`, `media`, `blog write`, `blog topics`, `blog publish`

### Phase 3 -- Intelligence
**Goal:** Track performance and optimize content strategy.

Deliverables:
- Analytics tracking across all 8 platforms
- Blog performance tracking (traffic, rankings, backlinks)
- Performance reports (weekly/monthly)
- Content optimization recommendations (learn what works, adjust tone/timing)
- CLI command: `report`

### Phase 4 -- Product Accounts
**Goal:** Support separate social accounts per product.

Deliverables:
- Multiple accounts per platform (founder + product accounts)
- Product-specific content strategies and voice profiles
- Separate analytics per account
- Account switching in dashboard

### Phase 5 -- Extended Marketing
**Goal:** Full-stack marketing automation beyond social media.

Deliverables:
- Landing page generator
- Advanced SEO toolkit (competitor analysis, backlink outreach)
- Email marketing (drip campaigns, onboarding sequences, newsletters)
- App Store Optimization (ASO) for iOS apps
- Product Hunt launch automation
- Community seeding (Reddit, Indie Hackers, HN, Discord)

---

## 11. Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Posts generated per week | 15-25 across all platforms | Database query |
| Approval rate | >80% of generated posts approved without major edits | Post status transitions |
| Follower growth | Measurable uptrend within 30 days of use | Platform analytics |
| Engagement rate | Platform-specific benchmarks (e.g., >2% on X) | Analytics module |
| Time saved | Founder spends <30 min/week on marketing | Self-reported |
| Blog posts published | 2-4 per month | CMS tracking |
| Publish success rate | >95% of approved posts successfully published | Platform post status |

---

## 12. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Platform API changes/deprecation | Publishing breaks | Adapter pattern isolates changes; version-pin APIs |
| Rate limiting by platforms | Posts delayed or blocked | Respect rate limits, queue with backoff, spread posts |
| AI generating off-brand content | Reputation damage | Approval queue is default; voice profile tuning; rejection feedback loop |
| Platform bans for automated posting | Account suspension | Stay within platform ToS, use official APIs, don't spam |
| Canva MCP instability | Media generation fails | Graceful fallback to screenshots; media is optional |
| Remotion render times | Slow pipeline | Render asynchronously via Kafka, cache compositions, lower quality previews |
| Kafka consumer lag | Delayed publishing | Monitor consumer lag, scale workers, alerting |

---

## 13. What We Reuse from First-SaaS-Repo

| Component | What's Copied | What's Modified |
|-----------|--------------|-----------------|
| **Proto Design System** | Entire `proto-design-system/` directory | Add growth-specific components (calendar, post editor, platform previews) |
| **Auth** | JWT + Google OAuth handler/processor/store | No changes needed |
| **Billing** | Stripe checkout/portal/subscription | No changes needed |
| **Server setup** | Gin router, CORS, middleware, graceful shutdown | Add growth-specific routes |
| **Bootstrap** | Dependency injection pattern | Wire growth-specific handlers/processors |
| **Store** | Connection pool setup, query patterns | Add growth-specific tables |
| **Workers** | Kafka consumer/producer pattern | New consumers for publishing, media, analytics |
| **API client** | `fetcher` / `publicFetcher` | No changes needed |
| **Auth context** | AuthProvider, redirect logic | No changes needed |
| **Tier context** | TierContext for subscription gating | Map tiers to growth features |
| **SSE Chat** | `useSSEChat` hook + backend SSE handler | Adapt prompts for content generation |
| **Infrastructure** | Terraform modules (ALB, ECS, RDS, S3, CloudFront) | Add Kafka (MSK), adjust instance sizes |
| **Docker Compose** | Local dev setup (postgres, kafka, flyway) | No changes needed |
| **Biome config** | Frontend linting | No changes needed |
| **Vite config** | Build config, code splitting | Adjust chunk splitting for growth deps |

---

## 14. Open Questions

1. **Approval workflow default:** Should posts auto-publish after approval, or require explicit `growth publish` each time? Recommendation: auto-publish at scheduled time once approved.
2. **Multi-user support:** Is this strictly single-founder, or should the dashboard support team members (e.g., a VA reviewing posts)?
3. **Content recycling:** Should the AI re-post high-performing content with variations (evergreen recycling)?
4. **A/B testing:** Should the system generate multiple versions of a post and test which performs better?
5. **Notification channel:** How should the system alert the founder of pending reviews — email, Slack, push notification, or dashboard-only?
6. **CLI ↔ Server communication:** Should the CLI call the base-server API directly (HTTP), or share Go packages and talk to the DB directly? Recommendation: CLI calls the API (single source of truth, works remotely).
7. **Remotion hosting:** Should Remotion renders happen locally (CLI), on the server (ECS), or via Remotion's cloud rendering service?
