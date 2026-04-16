# GitHub Auto-Post — PRD

**Status:** Proposed
**Owner:** Shubhanshu
**Target:** MVP in 2 weeks

## Problem

Solo founders and indie hackers ship features constantly but forget (or don't have time) to post about them. Every new feature, UI change, or improvement is a marketing opportunity that evaporates when the dev moves on to the next task.

## Vision

When a developer commits code that introduces a new feature or UI change, Growth Tools automatically:

1. Detects it's a user-facing change (not a bugfix or refactor)
2. Takes screenshots of the new/changed UI
3. Drafts a social media post with those screenshots
4. Publishes across all connected platforms (X, BlueSky, Threads, LinkedIn, etc.)

The founder commits code. The marketing happens by itself.

## Users

- **Primary**: Solo developers and indie hackers running their own SaaS / app
- **Secondary**: Small startup teams with no dedicated marketing person

## User Stories

### Story 1 — Happy path
As a solo founder, I push a commit that adds a new dashboard page. Within 5 minutes, a draft post appears in Growth Tools showing a screenshot of the new page, with copy like "Just shipped: a brand new dashboard for tracking your metrics in real time." I review it, hit publish, and it goes to all my connected platforms.

### Story 2 — Auto-publish
As a confident user who trusts the AI, I enable auto-publish. My commits now ship to social media without me ever opening the app.

### Story 3 — Smart filtering
As a founder who commits 30+ times a day, I don't want a post for every typo fix. The system should only generate posts for meaningful user-facing changes — new features, UI changes, new pages, etc. Never for refactors, chore commits, CI fixes, or dependency bumps.

### Story 4 — Review before publish
As a cautious user, I want auto-drafting but manual publishing. The system creates drafts from commits; I review and publish when I'm ready.

## Non-Goals (for MVP)

- Supporting non-web apps (mobile, CLI, backend-only services) — screenshots are web-focused
- Supporting private repos without user's local app running (no self-hosted preview URL)
- Automatic A/B testing of post variants
- Scheduling optimization (best time to post)
- Multi-repo aggregation (one post summarizing multiple commits)

## Architecture

```
GitHub (push event)
    ↓ webhook
[webhook handler]
    ↓ Kafka
[github-worker]
    ↓ filter (is this postable?)
    ↓ if yes
[screenshot-worker]
    ↓ Playwright → S3
[content generation]
    ↓ Claude AI
[draft post]
    ↓ (if auto-publish)
[publish-worker]
    ↓ fan out
X, BlueSky, Threads, LinkedIn
```

## Feature Breakdown

### 1. GitHub App integration

- User installs the Growth Tools GitHub App on their repo
- App has `contents: read` and `metadata: read` permissions
- Webhooks fire on `push` events
- We store: installation_id, account_id, repo_name, default_branch
- User configures per-repo:
  - Enable/disable auto-posts
  - Auto-publish vs draft-only
  - Preview URL (where to take screenshots — e.g. `https://staging.myapp.com`)
  - Branches to watch (default: main only)

### 2. Commit analysis (the "postability" filter)

Claude receives:
- Commit messages (from the push event)
- List of changed files (paths + additions/deletions count)
- Optional: diff content for small changes

Claude returns:
- `is_postable: bool`
- `change_type: "new_feature" | "ui_change" | "new_page" | "improvement" | "skip"`
- `skip_reason: string` (if not postable)
- `affected_routes: string[]` (URL paths that changed, for screenshot targeting)
- `summary: string` (one-line description)

**Filtering rules:**
- Skip: refactors, bugfixes, tests, docs, CI/CD, dependency bumps, formatting
- Skip: commits touching only backend code (no frontend/UI changes)
- Keep: new route files, significant UI changes, new components on existing pages
- Threshold: changes must affect > X lines of UI code OR add a new route

### 3. Screenshot generation

**Playwright service** — standalone Go service or Node CLI invoked by the worker:

Input:
- Preview URL (from user config)
- List of routes (from Claude analysis)
- Auth config (cookies / tokens for protected routes)

Output:
- Screenshots uploaded to S3
- Media IDs returned to the worker

Key decisions:
- Run Playwright in Docker, separate worker pool (heavy dependency, long-running)
- Viewport: 1440x900 desktop + 375x667 mobile (both for variety)
- Full-page screenshots
- 5-second settle time after navigation (wait for animations, lazy images)
- Timeout: 30 seconds per route

**Auth problem**: Protected routes need auth. MVP solution:

**Storage state reuse** — one-time setup, reuse until session expires.

1. User triggers "Connect preview" in settings for a repo
2. User runs a small Growth Tools CLI on their machine: `gt connect-preview <repo>`
3. CLI launches a local Playwright browser, navigates to their preview URL
4. User logs in normally (Google SSO, email/password, magic link — whatever)
5. CLI captures the full browser storage state (cookies + localStorage + sessionStorage), encrypts it, uploads to Growth Tools
6. All subsequent screenshot runs launch Playwright with `storageState: <decrypted blob>` — app treats them as already-logged-in
7. If session expires during a screenshot run, we detect auth failure and notify the user to reconnect

**Why not automate Google SSO directly?** Google actively blocks automation and breaks flows on every UI change. Storage state sidesteps the whole problem — we never touch credentials, never simulate SSO, and it works for any auth method.

**Why a local CLI (not headful in-cloud)?** No infrastructure to run VNC-accessible browsers; user's credentials never leave their machine (only the resulting session tokens do); simplest possible UX for MVP. Cloud-hosted browser with streamed CDP is a follow-up if the CLI step is a friction point.

### 3b. Storybook as a first-class posting surface

Many commits change individual components, not full pages. For those, Storybook gives a cleaner screenshot than the app — no auth, no data loading, no scaffolding around the component.

**How it works:**
- User configures a Storybook URL per repo (optional, separate from preview URL) — e.g. `https://storybook.myapp.com` or a Chromatic preview URL
- When commits touch files matching configured patterns (default: `**/components/**/*.tsx`), worker extracts component names
- Maps component file → Storybook story ID (Storybook follows `category-component--variant` convention, e.g. `Button.tsx` → `primitives-button--default`)
- Playwright navigates to each story URL (`{storybook_url}/iframe.html?id={storyId}&viewMode=story`) and screenshots
- Screenshots are wrapped in a marketing-friendly decorator (branded background, padding, centered)

**Branded showcase decorator** — a tiny helper shipped in the design system:

```tsx
// proto-design-system/storybook/showcaseDecorator.tsx
export const showcaseDecorator = (Story) => (
  <div style={{
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    padding: 64,
    minHeight: 400,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <Story />
  </div>
);
```

User opts in globally (applied to all stories via `.storybook/preview.ts`) or per-tag (`tags: ['showcase']`). Background, padding, and accent color configurable via Storybook globals.

**Why this is great:** component-level commits are the most common for mature codebases. App-level screenshots miss them or show them buried in context. Storybook + showcase decorator captures them beautifully with zero page-level auth.

**Screenshot strategy per commit type:**

| Commit changes | Screenshot target |
|---|---|
| New route / page | App at that route (via preview URL) |
| Component in `components/` | Storybook story (if Storybook URL configured) |
| Both | Both |
| Neither | Text-only post, no screenshots |

### 4. Post generation

Feed Claude:
- Commit summary (from step 2)
- Screenshots (as image inputs)
- User's voice profile
- List of selected platforms

Claude generates per-platform adapted content (existing flow from `/api/protected/content/generate/stream`).

### 5. Publishing

If auto-publish is on:
- Auto-create `platform_posts` rows
- Fire `post.publish` event
- Existing publish worker handles the rest

If draft-only:
- Create post with `status: "draft"`
- Send a notification to the user (email or in-app)
- User reviews and publishes from the existing UI

## Data Model Changes

### New table: `github_installations`

```sql
CREATE TABLE github_installations (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id),
  installation_id BIGINT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

### New table: `github_repos`

```sql
CREATE TABLE github_repos (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id),
  installation_id UUID NOT NULL REFERENCES github_installations(id),
  repo_full_name TEXT NOT NULL, -- "owner/repo"
  default_branch TEXT NOT NULL DEFAULT 'main',
  auto_post_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_publish_enabled BOOLEAN NOT NULL DEFAULT false,
  preview_url TEXT,
  storybook_url TEXT,
  component_globs TEXT[] NOT NULL DEFAULT ARRAY['**/components/**/*.tsx', '**/proto-design-system/**/*.tsx'],
  watched_branches TEXT[] NOT NULL DEFAULT ARRAY['main'],
  default_platforms TEXT[] NOT NULL DEFAULT '{}',
  preview_storage_state BYTEA, -- encrypted browser storage state (cookies + localStorage)
  storage_state_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(account_id, repo_full_name)
);
```

### Existing table: `github_events`

Currently stores webhook delivery info but not the payload. Need to:
- Store the actual payload in the `payload JSONB` column
- Link to `github_repos.id` via new `repo_id` column
- Add `change_type`, `is_postable`, `skip_reason` columns from Claude analysis

## API Changes

### New endpoints

- `POST /api/protected/github/install/callback` — complete GitHub App install
- `GET /api/protected/github/repos` — list connected repos
- `PUT /api/protected/github/repos/:id` — update repo config
- `DELETE /api/protected/github/repos/:id` — disconnect repo
- `POST /api/protected/github/repos/:id/test` — manually trigger a test post (useful for debugging)

### Updated endpoints

- `POST /api/github/webhook` — now routes `push` events to the new flow

## Success Metrics

- **Adoption**: % of active users who enable auto-posting on at least one repo
- **Quality**: % of auto-drafts that users publish without editing (target: >60%)
- **Filter accuracy**: % of skipped commits that users manually regretted (target: <5%)
- **Time saved**: Self-reported time per post (target: <30 seconds vs 5+ minutes manual)

## Risks

1. **Screenshot quality** — Taking good screenshots is hard. Apps with auth, loading states, animations, or dynamic data will produce bad screenshots. Mitigation: Let users preview and regenerate screenshots before publishing.

2. **Filter false positives** — The AI might skip a real feature shipped as a small commit, or generate a post for a refactor disguised as a feature. Mitigation: Log all skip decisions; user can retroactively generate posts from the commit history.

3. **Preview URL availability** — If the user's staging/preview deploy is down when a commit lands, screenshots fail. Mitigation: Retry logic + fallback to no screenshots (text-only post).

4. **GitHub API rate limits** — Fetching commit details + file changes hits the API. Mitigation: Use push event payload as much as possible; only hit the API for diffs when needed.

5. **Cost** — Every commit = Claude API call + potentially Playwright run. Could get expensive for active repos. Mitigation: Rate limit per-account; add opt-in threshold (e.g. "skip commits with <N lines changed").

## Open Questions

1. Should screenshots be full-page or viewport-sized? Full-page can be very tall.
2. Should the user see a dry-run / preview of the "postability" decision before we generate a post?
3. How do we handle a push with multiple commits? One post per commit or one summary post per push?
4. If Playwright fails, do we still create a text-only draft or skip entirely?
5. Self-hosted preview URLs (`localhost:3000`) — skip, require public URL, or offer a tunneling helper?
6. Storage state expiry: detect proactively (check session age) or reactively (fail on screenshot run)? Reactive is simpler but can delay notifications.
7. Storybook story ID mapping: rely on Storybook's CSF conventions (filename → auto-generated ID) or require users to tag stories they want auto-screenshotted?
8. Multiple components in one commit: separate post per component or one post with multiple screenshots?
