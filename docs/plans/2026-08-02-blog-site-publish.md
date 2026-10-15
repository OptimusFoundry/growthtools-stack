# Publish Blog Posts to shubhanshu.dev — Tech Plan

**Epic:** MEER-2   **PRD:** docs/prds/2026-08-02-blog-site-publish.md   **Scope:** full-stack

## AC coverage

| AC | Description | Tickets |
|----|------|---------|
| AC1 | Site publish target settings form, upsert | B2, B7, F1, F2, F4 |
| AC2 | Publish → branch + commit + PR via existing GitHub OAuth | B3, B4, B5, B6, F4 |
| AC3 | Frontmatter: title/pubDate/description/tags/readingTime | B4 |
| AC4 | Media URLs rewritten to permanent public URLs | B4 |
| AC5 | PR URL stored + shown as "View PR" link | B2, B5, B6, F1, F3, F4 |
| AC6 | GitHub failure never blocks internal publish; retry action | B5, B6, F1, F3, F4 |
| AC7 | No target configured → publish behaves as today, no error | B4, B5, F3, F4 |

## Shared contract

### Entities

`store.SitePublishTarget` (new, single row per account — mirrors `store.VoiceProfile`):
`ID` uuid, `AccountID` uuid (unique), `RepoOwner` string, `RepoName` string, `BaseBranch` string,
`ContentPath` string, `CreatedAt`/`UpdatedAt` time.Time. No `DeletedAt` (voice_profiles, its
template, has none — it's a true singleton settings row).

`store.BlogPost` (extended) gains: `SitePRURL *string` (`db:"site_pr_url" json:"site_pr_url,omitempty"`),
`SitePROpenedAt *time.Time` (`db:"site_pr_opened_at" json:"site_pr_opened_at,omitempty"`).

`processor.BlogPublishResult` (new, `blog/processor` package) — the response envelope for both
publish and retry-publish: `Post store.BlogPost \`json:"post"\`` , `SitePublishError string
\`json:"site_publish_error,omitempty"\`` . Never persisted — `SitePublishError` is a transient
report of the last attempt only.

### Endpoints

- `GET /api/protected/settings/site-publish` → 200 `store.SitePublishTarget` JSON | 404 (not
  configured — treated as normal "not set up yet" state, not an error)
- `PUT /api/protected/settings/site-publish` → req `{repo_owner, repo_name, base_branch,
  content_path}` (all 4 required strings) → 200 `store.SitePublishTarget` JSON (upsert)
- `POST /api/protected/blog/:id/publish` (existing route — **response shape changes**) → 200
  `processor.BlogPublishResult` (was bare `store.BlogPost`)
- `POST /api/protected/blog/:id/retry-site-publish` (new) → 200 `processor.BlogPublishResult` | 404
  (post not found) | 409 `BLOG_NOT_PUBLISHED` (post isn't published yet)

### Errors

invalid/missing site-publish-target fields → 400 (binding) · site publish target not found (GET) →
404 · blog post not found → 404 · blog post not published (retry) → 409 `BLOG_NOT_PUBLISHED` ·
GitHub not connected / branch / commit / PR API failure → **never** a non-2xx — captured as
`BlogPublishResult.SitePublishError` string inside the 200 response (AC6: internal publish must
never be blocked or rolled back by a site-publish failure) · no site publish target configured →
**not an error at all** — `PublishBlogToSite` returns `("", nil)`, a deliberate no-op (AC7).

### Cross-cutting design decisions (resolved here, binding on all tickets)

1. **accountID → GitHub token bridge**: `GitHubProcessor.PublishBlogToSite` takes `accountID` (matching
   `BlogProcessor`'s scoping) but the GitHub connection is keyed by `user_id`. Bridge via
   `store.GetAccountByID(ctx, accountID) → Account.OwnerUserID` then
   `store.GetGitHubConnectionByUserID(ctx, ownerUserID)`. Both store methods already exist —
   `GitHubStore` interface just needs `GetAccountByID` added to it.
2. **"Not configured" is not an error.** `SitePublisher.PublishBlogToSite` returns `("", nil)` when
   the account has no `SitePublishTarget` row — never an error type. This lets `BlogProcessor` treat
   "no target" and "nil publisher" identically (both are silent no-ops), with no cross-package
   sentinel-error coupling.
3. **Setter injection, matching `URLSigner`.** `BlogProcessor.SitePublisher` is a locally-declared
   interface (same "avoid import cycle" rationale as the file's existing `URLSigner` comment) wired
   post-construction via `SetSitePublisher`, exactly like `SetURLSigner`. `GitHubProcessor` satisfies
   it structurally — no shared package.
4. **Fresh branch every time.** Both `PublishBlogPost`'s site-publish tail and `RetrySitePublish` run
   the identical attempt logic (branch off base → commit → PR) — no resume/update of a prior PR, per
   the PRD's explicit non-goal.
5. **Migration versions**: last migration on disk is `V0052__reseed_growth_tools_plan_feature_limits_gt_free.sql`
   (confirmed via `ls base-server/migrations | sort -V | tail -5` in this worktree). Use **V0053**
   and **V0054**. `backend-migration-gen` must re-check `ls base-server/migrations | tail -1` at
   build time in case another migration lands first.
6. **`PublishBlogPost` signature change is breaking.** Return type changes from `(store.BlogPost,
   error)` to `(BlogPublishResult, error)`. Every caller/mock across `blog/processor` and
   `blog/handler` packages must update (enumerated in B5/B6). No caller exists outside those two
   packages.
7. **Mock generation differs by package** — confirm before editing:
   - `blog/processor/mocks_test.go` — **hand-rolled**, function-field style (header: "do not `go
     generate` against this file"). Add `MockSitePublisher` + a `SetBlogPostSitePRFn` field by hand.
   - `blog/handler/mocks_test.go`, `github/processor/mocks_test.go`,
     `settings/processor/mocks_test.go`, `settings/handler/mocks_test.go` — all **gomock-generated**
     (`//go:generate mockgen` header present). Regenerate via `go generate ./...` on the changed
     package; never hand-edit.
8. **FE behavior change required, not just new UI.** `BlogWizard.tsx`'s `handlePublish` today calls
   `onDone()` unconditionally after `publishBlog()` resolves, which navigates away from the post
   (`onDone` → `navigate({ to: "/blog" })` in both create/edit modes of `BlogEditor.tsx`). For AC5's
   "see the PR link after publishing" to be visible at all, publish must **stay on the post's own
   page** (`blog_.$id.tsx`, which already serves as both edit and detail view) instead of navigating
   away — F3 owns this change explicitly.
9. **`usePublishBlog` is extended, not duplicated.** It gains a `retryPublish` function and a
   `retrying` flag (separate from `loading`, so the wizard's Publish button and the status row's
   Retry button don't share a spinner) rather than adding a sibling hook — same resource, same
   response envelope.

---

## Notes for human confirmation

- **`readingTime` format** — resolved. The shubhanshudev repo's `astro-site/src/content.config.ts`
  (pushed 2026-08-02, commit 12a3c4c) declares `readingTime: z.string()` — free-form display text,
  not parsed. B4's `computeReadingTime` returning `"{N} min read"` is valid as-is; no change
  needed.
- **F3's publish-flow behavior change** (staying on the page instead of navigating to `/blog` after
  publish) is a real UX change beyond "add a status row" — flagging so it isn't missed as an
  incidental diff during review.

## Tickets

1. MEER-8 — Migration: blog_posts site-PR columns + site_publish_targets table
2. MEER-9 — Store: blog post site-PR field + site_publish_targets CRUD
3. MEER-10 — GitHub REST client: branch, commit, PR
4. MEER-11 — GitHubProcessor: PublishBlogToSite + markdown transform
5. MEER-12 — BlogProcessor: SitePublisher wiring, publish result, retry
6. MEER-13 — Blog handler, routes, bootstrap wiring
7. MEER-14 — Settings: site publish target get/update
8. MEER-15 — Types, transforms, hooks
9. MEER-16 — Settings: Site Publish tab
10. MEER-17 — Blog detail: site-publish status row + publish-flow fix
11. MEER-18 — E2E: MSW handlers + Playwright specs
