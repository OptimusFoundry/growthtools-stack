# GitHub Auto-Post — Implementation Tracker

**PRD:** [GITHUB_AUTOPOST_PRD.md](./GITHUB_AUTOPOST_PRD.md)

Legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[-]` skipped

---

## Phase 0 — Foundation (existing state)

- [x] GitHub webhook endpoint (`POST /api/github/webhook`)
- [x] HMAC signature validation
- [x] Duplicate event deduplication
- [x] `github_events` table with basic schema
- [x] GitHub worker consuming `github.event` Kafka topic (stub)

## Phase 1 — Data model & repo management

- [ ] Migration: create `github_installations` table
- [ ] Migration: create `github_repos` table
- [ ] Migration: add `repo_id`, `payload`, `change_type`, `is_postable`, `skip_reason` columns to `github_events`
- [ ] Store methods for `github_installations` (create, get by installation_id, list by account)
- [ ] Store methods for `github_repos` (CRUD, get by repo_full_name, list by account)

## Phase 2 — GitHub App setup

- [ ] Register Growth Tools GitHub App (manifest, permissions, webhook URL)
- [ ] Document GitHub App config in `docs/GITHUB_APP_SETUP.md`
- [ ] Env vars: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`
- [ ] GitHub App client package (`internal/platform/clients/github`)
  - [ ] JWT generation for app auth
  - [ ] Installation access token fetch
  - [ ] Fetch commit details (`GET /repos/{owner}/{repo}/commits/{sha}`)
  - [ ] Fetch compare (`GET /repos/{owner}/{repo}/compare/{base}...{head}`)

## Phase 3 — Installation flow

- [ ] Handler: `POST /api/protected/github/install/callback` — exchange installation_id for installation
- [ ] Processor: `HandleInstallation` — upsert installation + fetch repos
- [ ] Handler: `GET /api/protected/github/repos` — list
- [ ] Handler: `PUT /api/protected/github/repos/:id` — update config (auto_post, preview_url, branches, platforms)
- [ ] Handler: `DELETE /api/protected/github/repos/:id` — soft-delete
- [ ] Webhook handler: route `installation` events to install/uninstall repos

## Phase 4 — Webhook ingestion (proper)

- [ ] Parse `push` event payload for: repo_full_name, ref (branch), commits, installation_id
- [ ] Lookup `github_repos` by repo_full_name + installation
- [ ] Skip if repo not enabled or branch not watched
- [ ] Persist full payload to `github_events.payload`
- [ ] Publish to Kafka with `account_id`, `repo_id`, `commits`

## Phase 5 — Commit analysis (postability filter)

- [ ] Prompt design: `SystemGitHubAnalyze` — returns structured JSON
  - `is_postable`, `change_type`, `summary`, `affected_routes`, `skip_reason`
- [ ] Processor method `AnalyzeCommits(ctx, commits, files)` — calls Claude
- [ ] GitHub worker: fetch commit details + files, call AnalyzeCommits
- [ ] Store result on `github_events` row
- [ ] If not postable, mark event processed and stop

## Phase 6 — Screenshot service (app screenshots)

- [ ] Spike: Playwright in Go (chromedp) vs Playwright Node CLI
- [ ] Decision: standalone Docker service or in-process worker
- [ ] Service: accepts `{preview_url, routes[], storage_state}`, returns media URLs
- [ ] Viewport strategy: 1440x900 desktop + 375x667 mobile
- [ ] 5-second settle time, 30-second timeout per route
- [ ] Full-page vs viewport (decide from open question #1)
- [ ] Upload screenshots to S3 via existing media service
- [ ] Load encrypted storage state, launch Playwright with it, capture auth failures

## Phase 6b — Screenshot bot credentials (email/password)

- [ ] Schema: add login_url, login_email, login_password_encrypted, selector overrides, success pattern to github_repos
- [ ] AES-256-GCM encryption with per-account key for password field
- [ ] Endpoints:
  - [ ] `PUT /api/protected/github/repos/:id/credentials` — set/update (password never echoed back)
  - [ ] `DELETE /api/protected/github/repos/:id/credentials` — clear
- [ ] Screenshot worker auth step:
  - [ ] Navigate to login_url
  - [ ] Fill email/password fields (selectors with fallback defaults)
  - [ ] Submit, wait for success signal (URL pattern / element / default timeout)
  - [ ] On failure, capture error screenshot + notify user
- [ ] Settings UI:
  - [ ] Form with login URL, email, password fields
  - [ ] "Advanced" collapsible section for selector overrides
  - [ ] Test button: performs login flow and reports success/failure
- [ ] Docs: setup guide for creating a screenshot bot account
- [ ] Safety: if login fails 3 runs in a row, disable auto-posting for the repo + notify user

## Phase 6c — Storybook screenshot path

- [ ] Add `storybook_url` and `component_globs` to `github_repos`
- [ ] Component-file → story-ID mapping helper (handles CSF naming conventions)
- [ ] Screenshot service: accepts `{storybook_url, story_ids[]}` as alternate input
- [ ] Ship `showcaseDecorator` in `proto-design-system/storybook/`
  - [ ] Gradient background (configurable via Storybook globals)
  - [ ] Padding + centered layout
  - [ ] Optional component name label
- [ ] Document decorator usage in design system README
- [ ] Worker logic: if commit touches `component_globs` and `storybook_url` is set, route to Storybook screenshots (in addition to or instead of app screenshots)

## Phase 7 — Post generation

- [ ] Enhance `StreamGenerateAndAdapt` to accept pre-uploaded media IDs
- [ ] Worker step: call content generation with commit summary + screenshots
- [ ] Create draft post with `source: "github_event"`, link `github_event_id`
- [ ] Platform selection: from `github_repos.default_platforms`

## Phase 8 — Auto-publish

- [ ] If `auto_publish_enabled`, fire `post.publish` event
- [ ] If draft-only, send in-app notification (or email)
- [ ] Surface recent drafts on dashboard with "new" badge

## Phase 9 — Frontend: settings

- [ ] Route: `/settings/integrations/github`
- [ ] "Install GitHub App" button (OAuth-style flow to GitHub)
- [ ] List connected repos with status
- [ ] Per-repo config form: enable, auto-publish, preview URL, branches, platforms
- [ ] "Test" button to trigger a dry run

## Phase 10 — Frontend: post attribution

- [ ] Post detail page: show source commit (link to GitHub)
- [ ] Posts list: show source icon (GitHub) for auto-generated posts
- [ ] Filter: "Show only GitHub auto-posts"

## Phase 11 — Observability & safety

- [ ] Rate limit: max N auto-generated posts per account per day
- [ ] Logging: every skip decision with reason
- [ ] Metrics: % postable, % successfully screenshotted, % published without edits
- [ ] Admin dry-run endpoint: `POST /api/protected/github/repos/:id/test`

## Phase 12 — Polish & launch

- [ ] E2E test: real push → post published on a test platform
- [ ] Cost analysis: Claude tokens + Playwright runtime per push
- [ ] Docs: user-facing setup guide
- [ ] Launch post (eating our own dogfood)

---

## Current sprint focus

_Update this as you go._

**Now:** _not started_

**Next up:** Phase 1 — data model migrations

**Blocked:** nothing

---

## Decisions log

- _date_ — decision — rationale

_Add decisions here as they're made so future-you remembers why._

---

## Open questions (also in PRD)

1. Full-page vs viewport screenshots?
2. Show postability dry-run before generating a post?
3. One post per commit or per push?
4. Playwright fails → text-only draft or skip?
5. Self-hosted preview URLs — skip, require public, or offer tunnel?
