# Publish Blog Posts to shubhanshu.dev — PRD

**Epic:** MEER-2   **Status:** Spec'd   **Date:** 2026-08-02   **Size:** M

## Problem / why
Blog posts authored and published in growth-tools live only inside the app — there's no way to
get them onto the public site (shubhanshu.dev) without manual copy-paste. The site is a git-backed
Astro site on Cloudflare Pages (auto-deploys on push to `main`), so publishing should be a
one-click extension of the existing internal "Publish" action rather than a separate manual step.

## Users & personas
Single account owner (this is a personal-use tool) — the person running growth-tools who also
owns the GitHub account and the target site repo.

## Goals
- Publishing a blog post in growth-tools also delivers it to the shubhanshu.dev site repo as a
  reviewable PR.
- Reuse the existing GitHub OAuth connection (`repo` scope) — no new auth flow.
- Images referenced in posts resolve to permanent public URLs, not expiring presigned S3 links.
- A GitHub push failure never blocks the internal publish action; the user gets clear feedback and
  a retry path.

## Non-goals
- Building the Astro site's blog collection/post pages — already shipped directly to the
  shubhanshudev repo as a prerequisite; out of scope here since that repo isn't part of this
  pipeline.
- Auto-merging or auto-deploying the PR — merge stays a manual step on GitHub.
- Tracking "is it actually live" back in growth-tools (no webhook listener for PR-merge/deploy
  status in v1).
- Multi-site / multi-repo publish targets — exactly one configured target repo per account.
- Reconciling an already-PR'd post after further edits — re-publishing opens a fresh PR; no
  attempt to update/rebase a prior one.
- Committing images into the site repo — images stay on growth-tools' S3, served via the existing
  public media route.

## User stories
- As the account owner, I want clicking Publish on a blog post to open a PR on my site repo with
  the post's markdown, so I can review and merge it to go live.
- As the account owner, I want to configure which repo/branch/content path growth-tools publishes
  into, so it targets the right site.
- As the account owner, I want to see the PR link on the blog post after publishing, so I can jump
  straight to review.
- As the account owner, I want a clear error and a retry action if the GitHub push fails, so a
  flaky API call doesn't silently lose my publish.

## Acceptance criteria
1. AC1 — Account settings has a "Site publish target" form (repo owner, repo name, base branch,
   content path) that persists via upsert, same pattern as the existing voice-profile settings.
2. AC2 — Clicking Publish on a blog post: (a) flips internal status to published — unchanged
   existing behavior — and (b) creates a branch off the configured base branch, commits one
   markdown file (frontmatter + content) to the configured content path, and opens a PR back to
   the base branch, using the account's existing GitHub OAuth connection.
3. AC3 — The generated markdown's frontmatter includes `title`, `pubDate`, `description` (from
   excerpt/meta description), `tags` (from keywords), and a computed `readingTime` — matching the
   schema the Astro site's `src/content.config.ts` blog collection expects.
4. AC4 — Any `s3://` or presigned media URL inside the post content is rewritten to the permanent
   public URL (`{PublicURLBase}/public/media/file/{key}`) before being committed.
5. AC5 — On success, the blog post record stores the PR URL, shown in the UI as a "View PR" link.
6. AC6 — On failure (no GitHub connection, API error, etc.) the internal publish still succeeds,
   the error is surfaced in the UI, and a "Retry site publish" action re-attempts the GitHub push
   without re-flipping the internal status.
7. AC7 — If no site publish target is configured, Publish behaves exactly as it does today
   (internal-only, no error) — the GitHub push step is skipped entirely rather than attempted
   with empty config.

## Data & API surface (rough)
- New account-scoped settings row (upsert, like `VoiceProfile`): repo owner, repo name, base
  branch, content path.
- `blog_posts` gains `site_pr_url` (nullable text) and `site_pr_opened_at` (nullable timestamp).
- `GitHubClient` (`internal/infra/clients/github`) gains `CreateBranch`,
  `CreateOrUpdateFileContents`, `CreatePullRequest`.
- `GitHubProcessor` gains `PublishBlogToSite(ctx, accountID, post) (prURL string, err error)`.
- `BlogProcessor.PublishBlogPost` takes an optional `SitePublisher` interface (setter-injected,
  same pattern as the existing `URLSigner`) and calls it after the internal publish; a failure
  there is caught and does not roll back the internal status change.
- New/extended endpoints: `GET/PUT /api/protected/settings/site-publish` (config),
  `POST /api/protected/blog/:id/retry-site-publish`.

## UX notes
- Settings: new "Site Publish" tab/section alongside the existing voice/platform settings, a
  4-field form.
- Blog post detail: after publish, a status row — "Pushed to GitHub → PR #123" (link) on success,
  or an inline error with a "Retry" button on failure. Matches existing post-detail
  loading/empty/error state patterns.

## Dependencies
- Existing GitHub OAuth connection (`repo` scope) — `internal/github`.
- Existing public media route `/public/media/file/*key` + `STORAGE_PUBLIC_URL_BASE` config —
  `internal/media`.
- Existing settings upsert pattern — `internal/settings`.
- External (already shipped, not built by this plan): shubhanshudev repo's
  `astro-site/src/content/blog/` collection and `astro-site/src/pages/writing/[slug].astro`,
  pushed to `origin/main` 2026-08-02.

## Open questions & assumptions
- Assumption: single site-publish target per account, matching this being a personal/solo tool.
  Not designed to extend to multiple targets without a data-model change.
- Assumption: "retry" and "re-publish after edit" both always open a fresh branch/PR rather than
  amending a prior attempt — simplest given the GitHub Contents API has no partial-commit state to
  resume from.
