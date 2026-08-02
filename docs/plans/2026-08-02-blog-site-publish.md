# Publish Blog Posts to shubhanshu.dev — Tech Plan

**Epic:** EP-002   **PRD:** docs/prds/2026-08-02-blog-site-publish.md   **Scope:** full-stack

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

## Tickets

| Ticket | Epic | Layer | Depends-on | AC refs | Status |
|--------|------|-------|-----------|---------|--------|
| B1 | EP-002 | db  | —          | AC1,AC5 | Todo |
| B2 | EP-002 | db  | B1         | AC1,AC5 | Todo |
| B3 | EP-002 | api | —          | AC2 | Todo |
| B4 | EP-002 | api | B2,B3      | AC2,AC3,AC4,AC7 | Todo |
| B5 | EP-002 | api | B2,B4      | AC2,AC5,AC6,AC7 | Todo |
| B6 | EP-002 | api | B5         | AC2,AC5,AC6 | Todo |
| B7 | EP-002 | api | B2         | AC1 | Todo |
| F1 | EP-002 | fe  | B6,B7      | AC1,AC5,AC6 | Todo |
| F2 | EP-002 | fe  | F1         | AC1 | Todo |
| F3 | EP-002 | fe  | F1         | AC5,AC6,AC7 | Todo |
| F4 | EP-002 | fe  | F2,F3      | AC1,AC2,AC5,AC6,AC7 | Todo |

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

## B1 — Migration: blog_posts site-PR columns + site_publish_targets table

**Files:** `base-server/migrations/V0053__blog_posts_site_pr_fields.sql`,
`base-server/migrations/V0054__create_site_publish_targets.sql`
**Placement:** confirm `V0052` is still the latest (`ls base-server/migrations | tail -1`) before
assigning V0053/V0054.

**V0053 contract** — `ALTER TABLE blog_posts`: add `site_pr_url` (TEXT, nullable), add
`site_pr_opened_at` (TIMESTAMPTZ, nullable). No default, no backfill needed (new rows/existing rows
alike start NULL).

**V0054 contract** — `CREATE TABLE site_publish_targets`, matching `voice_profiles`' exact
conventions (confirmed from `V0001__init.sql` / `voice_profile.go`): `id` UUID PK default
`uuid_generate_v4()` (not `gen_random_uuid()` — `uuid-ossp` extension already enabled, no new
`CREATE EXTENSION`), `account_id` UUID NOT NULL REFERENCES `accounts(id)` ON DELETE CASCADE,
`repo_owner`/`repo_name`/`base_branch`/`content_path` all TEXT NOT NULL, `created_at`/`updated_at`
TIMESTAMPTZ NOT NULL DEFAULT `CURRENT_TIMESTAMP` (not `now()`), table-level `UNIQUE(account_id)`
constraint (not a column modifier — matches this repo's singleton-settings-table style). No
`deleted_at`.

**Rules:** backend-store-rules:S-7

---

## B2 — Store: blog post site-PR field + site_publish_targets CRUD

**Files:** `base-server/internal/infra/store/blog_post.go` (extend),
`base-server/internal/infra/store/site_publish_target.go` (new),
`base-server/internal/infra/store/blog_post_test.go` (extend),
`base-server/internal/infra/store/site_publish_target_test.go` (new)
**Placement:** `BlogPost` struct — add the two new fields after `PublishedAt`, before `CreatedAt`
(blog_post.go). Every SELECT/RETURNING clause that lists all `blog_posts` columns
(`sqlGetBlogPostByID`, `sqlGetBlogPostBySlug`, `sqlUpdateBlogPost`'s RETURNING, `sqlPublishBlogPost`'s
RETURNING, and `sqlCreateBlogPost`'s RETURNING) needs the two columns appended. `sqlListBlogPosts` /
`BlogPostListItem` stay unchanged (slim list projection already omits SEO/media fields — PR fields
follow the same omission). New `SetBlogPostSitePR` method appended after `PublishBlogPost`.
`site_publish_target.go` is a new file mirroring `voice_profile.go` file-for-file.

**Signatures:**
```
func (s *Store) SetBlogPostSitePR(ctx context.Context, accountID, postID uuid.UUID, prURL string) (BlogPost, error)

type SitePublishTarget struct {
    ID          uuid.UUID `db:"id" json:"id"`
    AccountID   uuid.UUID `db:"account_id" json:"account_id"`
    RepoOwner   string    `db:"repo_owner" json:"repo_owner"`
    RepoName    string    `db:"repo_name" json:"repo_name"`
    BaseBranch  string    `db:"base_branch" json:"base_branch"`
    ContentPath string    `db:"content_path" json:"content_path"`
    CreatedAt   time.Time `db:"created_at" json:"created_at"`
    UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}
type CreateSitePublishTargetParams struct {
    AccountID   uuid.UUID `db:"account_id" json:"account_id"`
    RepoOwner   string    `db:"repo_owner" json:"repo_owner"`
    RepoName    string    `db:"repo_name" json:"repo_name"`
    BaseBranch  string    `db:"base_branch" json:"base_branch"`
    ContentPath string    `db:"content_path" json:"content_path"`
}
type UpdateSitePublishTargetParams struct {
    RepoOwner   *string `db:"repo_owner" json:"repo_owner,omitempty"`
    RepoName    *string `db:"repo_name" json:"repo_name,omitempty"`
    BaseBranch  *string `db:"base_branch" json:"base_branch,omitempty"`
    ContentPath *string `db:"content_path" json:"content_path,omitempty"`
}

func (s *Store) CreateSitePublishTarget(ctx context.Context, params CreateSitePublishTargetParams) (SitePublishTarget, error)
func (s *Store) GetSitePublishTargetByAccount(ctx context.Context, accountID uuid.UUID) (SitePublishTarget, error)
func (s *Store) UpdateSitePublishTarget(ctx context.Context, accountID uuid.UUID, params UpdateSitePublishTargetParams) (SitePublishTarget, error)
```

**Behavior:**
- `SetBlogPostSitePR`: WHEN id+account_id match a live row SHALL set `site_pr_url`, bump
  `site_pr_opened_at` and `updated_at` to now, and return the full row; WHEN no row matches SHALL
  return `store.ErrNotFound`.
- `CreateSitePublishTarget`: WHEN params are valid SHALL insert and return the row; a second insert
  for the same `account_id` SHALL violate the unique constraint (surfaced as a wrapped DB error, no
  special-casing needed at this layer).
- `GetSitePublishTargetByAccount`: WHEN a row exists for accountID SHALL return it; otherwise
  `store.ErrNotFound`.
- `UpdateSitePublishTarget`: `COALESCE($n, column)` per field (all 4 always non-nil from the caller
  in practice, since the HTTP layer requires all 4); WHEN no row matches SHALL return
  `store.ErrNotFound`.

**Rules:** backend-store-rules:S-1, backend-store-rules:S-2, backend-store-rules:S-5, backend-store-rules:S-6

---

## B3 — GitHub REST client: branch, commit, PR

**Files:** `base-server/internal/infra/clients/github/client.go`
**Placement:** append after `DeleteWebhook` (end of file). Follow the file's existing idiom exactly:
plain `net/http`, `http.NewRequestWithContext`, `c.httpClient.Do`, explicit status-code checks,
`fmt.Errorf("...: %w", err)` wraps — model on `GetCommitDiff`/`CreateWebhook`.

**Signatures:**
```
func (c *Client) CreateBranch(ctx context.Context, token, owner, repo, baseBranch, newBranch string) error
func (c *Client) CreateOrUpdateFileContents(ctx context.Context, token, owner, repo, filePath, branch string, content []byte, commitMessage string) error
func (c *Client) CreatePullRequest(ctx context.Context, token, owner, repo, headBranch, baseBranch, title, body string) (string, error)

type GitRefResponse struct { Object GitRefObject `json:"object"` }
type GitRefObject struct { SHA string `json:"sha"` }
type RepoContentResponse struct { SHA string `json:"sha"` }
type PullRequestResponse struct { HTMLURL string `json:"html_url"` }
```

**REST call contracts:**
| Method | Calls | Reads | Special-casing |
|---|---|---|---|
| `CreateBranch` | `GET /repos/{owner}/{repo}/git/ref/heads/{baseBranch}` (200) → `POST /repos/{owner}/{repo}/git/refs` (201) body `{ref:"refs/heads/{newBranch}", sha}` | step1 `.object.sha` | none — a 422 ref-exists collision is tolerated as a generic failure (branch names carry an 8-char random-hex suffix) |
| `CreateOrUpdateFileContents` | `GET /repos/{owner}/{repo}/contents/{filePath}?ref={branch}` (200 or 404) → `PUT /repos/{owner}/{repo}/contents/{filePath}` (200/201) body `{message, content: base64(content), branch, sha?}` | step1 `.sha` | 404 on step1 → new file, omit `sha` in step2 body |
| `CreatePullRequest` | `POST /repos/{owner}/{repo}/pulls` (201) body `{title, head:headBranch, base:baseBranch, body}` | `.html_url` | none |

**Behavior:** each method returns a wrapped error on any non-success status or transport failure
(matching every other method in this file); no retries.

**Rules:** backend-architecture-rules:A-2, backend-architecture-rules:A-4

---

## B4 — GitHubProcessor: PublishBlogToSite + markdown transform

**Files:** `base-server/internal/github/processor/processor.go` (extend interfaces/struct/errors),
`base-server/internal/github/processor/site_publish.go` (new)
**Placement:** `GitHubStore` interface — new `// Blog site-publish operations` block after `Commit
operations`, before closing brace. `GitHubClient` interface — append the 3 B3 methods after
`GetCommitDiff`. Error `var (...)` block — append `ErrGitHubNotConnected`, `ErrSitePublishFailed`.
`GitHubProcessor` struct — add `publicURLBase string` field near `webAppHost`. Setter
`SetPublicURLBase` placed alongside `SetURLSigner`/`SetCommitClassifier`, before `func New(...)`.

**Signatures:**
```
// GitHubStore additions
GetAccountByID(ctx context.Context, accountID uuid.UUID) (store.Account, error)
GetSitePublishTargetByAccount(ctx context.Context, accountID uuid.UUID) (store.SitePublishTarget, error)
GetMediaByIDs(ctx context.Context, ids []uuid.UUID) ([]store.Media, error)

// GitHubClient additions — same 3 signatures as B3

var ( ErrGitHubNotConnected = errors.New("github account not connected"); ErrSitePublishFailed = errors.New("site publish failed") )

func (p *GitHubProcessor) SetPublicURLBase(base string)

// site_publish.go
func (p *GitHubProcessor) PublishBlogToSite(ctx context.Context, accountID uuid.UUID, post store.BlogPost) (string, error)
func buildBlogMarkdown(post store.BlogPost, media []store.Media, publicURLBase string) []byte
func computeReadingTime(content string) string
```

**Behavior — `PublishBlogToSite`:**
- WHEN no `SitePublishTarget` row exists for accountID (`store.ErrNotFound`) SHALL return `("",
  nil)` — silent no-op (AC7).
- WHEN `GetAccountByID` → `GetGitHubConnectionByUserID(OwnerUserID)` finds no connection SHALL
  return `("", ErrGitHubNotConnected)`.
- WHEN any of `CreateBranch`/`CreateOrUpdateFileContents`/`CreatePullRequest` fails SHALL log the
  error and return `("", ErrSitePublishFailed)`.
- WHEN all steps succeed SHALL return `(prURL, nil)`. Branch name = `blog/{slug}-{8-char-random-hex}`
  (new local hex helper, sized correctly — do not reuse `oauth.go`'s `generateSecret`, which is
  32 bytes). Commit message = `blog: publish "{title}"`. File path = `path.Join(target.ContentPath,
  post.Slug+".md")`. PR title = `Publish: {title}`; PR body = a short static description line.

**Behavior — `buildBlogMarkdown`:** renders YAML frontmatter (`title`=post.Title, `pubDate`
=post.PublishedAt formatted RFC3339 date, falling back to now if nil, `description`=post.Excerpt
falling back to post.MetaDescription falling back to `""`, `tags`=post.Keywords, `readingTime`
=`computeReadingTime(post.Content)`) + a blank line + `post.Content`, with every occurrence of each
`media[i].S3URL` substring replaced by `{publicURLBase}/public/media/file/{media[i].S3Key}` (AC3, AC4).

**Behavior — `computeReadingTime`:** returns `"{N} min read"` where `N = max(1, ceil(wordCount /
200))`.

**Rules:** backend-architecture-rules:A-1, backend-architecture-rules:A-3, backend-architecture-rules:A-5, backend-error-rules:E-2

---

## B5 — BlogProcessor: SitePublisher wiring, publish result, retry

**Files:** `base-server/internal/blog/processor/processor.go`,
`base-server/internal/blog/processor/mocks_test.go` (hand-edit — see contract note 7)
**Placement:** `SitePublisher` interface right after the existing `URLSigner` interface. `BlogStore`
interface — add `SetBlogPostSitePR` after `PublishBlogPost`. Error block — append
`ErrBlogPostNotPublished`. `BlogPublishResult` struct near `BlogPostWithMedia`. `BlogProcessor`
struct — add `sitePublisher SitePublisher` field after `urlSigner`. `SetSitePublisher` setter right
after `SetURLSigner`. `PublishBlogPost`'s internal-flip body is unchanged; its tail and the new
`RetrySitePublish` share a private helper for the site-publish attempt.

**Signatures:**
```
type SitePublisher interface {
    PublishBlogToSite(ctx context.Context, accountID uuid.UUID, post store.BlogPost) (prURL string, err error)
}
type BlogPublishResult struct {
    Post             store.BlogPost `json:"post"`
    SitePublishError string         `json:"site_publish_error,omitempty"`
}
func (p *BlogProcessor) SetSitePublisher(sp SitePublisher)
func (p *BlogProcessor) PublishBlogPost(ctx context.Context, accountID, postID uuid.UUID) (BlogPublishResult, error) // BREAKING — was (store.BlogPost, error)
func (p *BlogProcessor) RetrySitePublish(ctx context.Context, accountID, postID uuid.UUID) (BlogPublishResult, error)

var ErrBlogPostNotPublished = errors.New("blog post is not published")
// BlogStore addition:
SetBlogPostSitePR(ctx context.Context, accountID, postID uuid.UUID, prURL string) (store.BlogPost, error)
```

**Behavior — `PublishBlogPost`:**
- Unchanged: fetch + flip internal status exactly as today; pre-existing error cases
  (`ErrBlogPostNotFound` etc.) unchanged.
- AFTER a successful internal flip: WHEN `sitePublisher` is nil SHALL return
  `BlogPublishResult{Post: published}` (no attempt — same effective outcome as "not configured").
- WHEN `sitePublisher.PublishBlogToSite` returns `("", nil)` SHALL return
  `BlogPublishResult{Post: published}` unchanged (AC7).
- WHEN it returns `(url, nil)` SHALL call `store.SetBlogPostSitePR` and return
  `BlogPublishResult{Post: <updated row>}`; a persistence failure SHALL set `SitePublishError` and
  keep `Post: published` (internal publish state is never rolled back — AC6).
- WHEN it returns an error SHALL log it and return `BlogPublishResult{Post: published,
  SitePublishError: err.Error()}, nil` — the site-publish failure is never turned into a
  `PublishBlogPost` error return (AC6).

**Behavior — `RetrySitePublish`:**
- WHEN the post doesn't exist SHALL return `ErrBlogPostNotFound`.
- WHEN `post.Status != store.BlogStatusPublished` SHALL return `ErrBlogPostNotPublished`.
- Otherwise SHALL run the identical site-publish-attempt + persistence logic as `PublishBlogPost`'s
  tail (shared private helper), without re-flipping internal status.

**Rules:** backend-architecture-rules:A-1, backend-architecture-rules:A-3, backend-error-rules:E-2

---

## B6 — Blog handler, routes, bootstrap wiring

**Files:** `base-server/internal/blog/handler/handler.go`,
`base-server/internal/blog/handler/mocks_test.go` (regenerate — gomock),
`base-server/internal/infra/api/api.go`, `base-server/internal/infra/bootstrap/processors.go`
**Placement:** `BlogProcessor` interface (handler.go) — change `PublishBlogPost`'s return type;
add `RetrySitePublish` right after it. `HandlePublishBlog` needs no structural change beyond its
`c.JSON` now serializing `processor.BlogPublishResult`. New `HandleRetrySitePublish` inserted right
after `HandlePublishBlog`, mirroring its structure (same accountID/postID extraction). `handleError`
gains a case before `default`. api.go — insert
`protectedGroup.POST("/blog/:id/retry-site-publish", a.blogHandler.HandleRetrySitePublish)` directly
after the existing `.../blog/:id/publish` route. bootstrap/processors.go — after `p.blog =
blogProcessor.New(...)` and `p.blog.SetURLSigner(cl.urlSigner)` (both `p.github` and `p.blog` are
fully constructed by this point), add `p.github.SetPublicURLBase(cfg.Storage.PublicURLBase)` and
`p.blog.SetSitePublisher(&p.github)`.

**Signatures:**
```
type BlogProcessor interface {
    // ...unchanged methods...
    PublishBlogPost(ctx context.Context, accountID, postID uuid.UUID) (processor.BlogPublishResult, error)
    RetrySitePublish(ctx context.Context, accountID, postID uuid.UUID) (processor.BlogPublishResult, error)
}
func (h *Handler) HandleRetrySitePublish(c *gin.Context)
```

**Behavior:**
- `HandlePublishBlog`: unchanged extraction/error flow; `c.JSON(200, result)`.
- `HandleRetrySitePublish`: same accountID (`getAccountID`) + postID (`uuid.Parse(c.Param("id"))`)
  extraction as `HandlePublishBlog`; calls `RetrySitePublish`; `c.JSON(200, result)`; on error routes
  through `handleError`.
- `handleError` new case: `errors.Is(err, processor.ErrBlogPostNotPublished)` →
  `apierrors.Conflict(c, "BLOG_NOT_PUBLISHED", "Blog post is not published yet")`.

**Signature-change blast radius (must all be updated in this ticket):**
`blog/processor/processor_test.go` (`TestBlogProcessor_PublishBlogPost` assertions on return
type/fields), `blog/processor/mocks_test.go` (hand-add `MockSitePublisher` +
`SetBlogPostSitePRFn`), `blog/handler/handler_test.go` (`.Return()` values for
`PublishBlogPost`), `blog/handler/mocks_test.go` (regenerate). No caller exists outside the
`blog/processor` and `blog/handler` packages.

**Rules:** backend-architecture-rules:A-6, backend-architecture-rules:A-7, backend-error-rules:E-3, backend-error-rules:E-4, backend-error-rules:E-5

---

## B7 — Settings: site publish target get/update

**Files:** `base-server/internal/settings/processor/processor.go`,
`base-server/internal/settings/handler/handler.go`, `base-server/internal/infra/api/api.go`
**Placement:** processor.go — `SettingsStore` interface gains 3 methods after
`UpdateVoiceProfile`; new `ErrSitePublishTargetNotFound`; new `GetSitePublishTarget` inserted after
`GetVoiceProfile` (direct mirror, swap the sentinel error); new `UpdateSitePublishTarget` inserted
after `UpdateVoiceProfile` (mirror its exact upsert-by-existence-check shape: try
`GetSitePublishTargetByAccount`, `store.ErrNotFound` or nil-ID → `CreateSitePublishTarget`, else →
`UpdateSitePublishTarget`). handler.go — interface additions;
`UpdateSitePublishTargetRequest` inserted after `UpdateVoiceProfileRequest`;
`HandleGetSitePublishTarget`/`HandleUpdateSitePublishTarget` inserted after
`HandleUpdateVoiceProfile`, mirroring `HandleGetVoiceProfile`/`HandleUpdateVoiceProfile` exactly;
`handleError` gains a case. api.go — insert the two site-publish routes directly after the existing
`/settings/voice` routes.

**Signatures:**
```
// SettingsStore additions
GetSitePublishTargetByAccount(ctx context.Context, accountID uuid.UUID) (store.SitePublishTarget, error)
CreateSitePublishTarget(ctx context.Context, params store.CreateSitePublishTargetParams) (store.SitePublishTarget, error)
UpdateSitePublishTarget(ctx context.Context, accountID uuid.UUID, params store.UpdateSitePublishTargetParams) (store.SitePublishTarget, error)

var ErrSitePublishTargetNotFound = errors.New("site publish target not found")
func (p *SettingsProcessor) GetSitePublishTarget(ctx context.Context, accountID uuid.UUID) (store.SitePublishTarget, error)
func (p *SettingsProcessor) UpdateSitePublishTarget(ctx context.Context, accountID uuid.UUID, repoOwner, repoName, baseBranch, contentPath string) (store.SitePublishTarget, error)

// handler.go
type UpdateSitePublishTargetRequest struct {
    RepoOwner   string `json:"repo_owner" binding:"required"`
    RepoName    string `json:"repo_name" binding:"required"`
    BaseBranch  string `json:"base_branch" binding:"required"`
    ContentPath string `json:"content_path" binding:"required"`
}
func (h *Handler) HandleGetSitePublishTarget(c *gin.Context)
func (h *Handler) HandleUpdateSitePublishTarget(c *gin.Context)
```
Routes:
```
protectedGroup.GET("/settings/site-publish", a.settingsHandler.HandleGetSitePublishTarget)
protectedGroup.PUT("/settings/site-publish", a.settingsHandler.HandleUpdateSitePublishTarget)
```

**Behavior:**
- `GetSitePublishTarget`: mirrors `GetVoiceProfile` — `store.ErrNotFound` → `ErrSitePublishTargetNotFound`.
- `UpdateSitePublishTarget`: mirrors `UpdateVoiceProfile`'s upsert logic exactly (check-then-branch).
- `HandleGetSitePublishTarget`: 200 on success, 404 via `handleError` when unconfigured.
- `HandleUpdateSitePublishTarget`: binds request (400 on validation failure), upserts, 200.

**Rules:** backend-architecture-rules:A-1, backend-architecture-rules:A-6, backend-architecture-rules:A-8, backend-error-rules:E-3, backend-error-rules:E-5

---

## F1 — Types, transforms, hooks

**Files:** `webapp/src/types/sitePublishTarget.ts` (new), `webapp/src/api/types/sitePublishTarget.ts`
(new), `webapp/src/api/transforms/sitePublishTarget.ts` (new), `webapp/src/hooks/useSitePublishTarget.ts`
(new), `webapp/src/types/blog.ts` (extend `BlogPost`), `webapp/src/api/types/blog.ts` (extend
`ApiBlogPost`, add `ApiBlogPublishResponse`), `webapp/src/api/transforms/blog.ts` (extend
`toBlogPost`, add `toBlogPublishResult`), `webapp/src/hooks/usePublishBlog.ts` (extend)
**Placement:** the `sitePublishTarget` triad is new, mirroring the `voiceProfile.ts` triad
file-for-file (`types/`, `api/types/`, `api/transforms/`). Blog type/transform files get additive
changes only — extend existing interfaces, don't restructure.

**TS contracts:**
```ts
// types/sitePublishTarget.ts
export interface SitePublishTarget {
  id: string; accountId: string; repoOwner: string; repoName: string;
  baseBranch: string; contentPath: string; createdAt: string; updatedAt: string;
}
export interface UpdateSitePublishTargetRequest {
  repo_owner: string; repo_name: string; base_branch: string; content_path: string;
}

// api/types/sitePublishTarget.ts
export interface ApiSitePublishTarget {
  id: string; account_id: string; repo_owner: string; repo_name: string;
  base_branch: string; content_path: string; created_at: string; updated_at: string;
}

// api/transforms/sitePublishTarget.ts
export function toSitePublishTarget(api: ApiSitePublishTarget): SitePublishTarget;

// types/blog.ts — BlogPost additions
sitePrUrl?: string; sitePrOpenedAt?: string;
sitePrNumber?: number; // derived client-side in toBlogPost (trailing numeric URL segment; falls
                        // back to undefined if not numeric, in which case the UI links the full URL)

// api/types/blog.ts additions
site_pr_url?: string; site_pr_opened_at?: string; // on ApiBlogPost
export interface ApiBlogPublishResponse { post: ApiBlogPost; site_publish_error?: string }

// types/blog.ts addition
export interface BlogPublishResult { post: BlogPost; sitePublishError?: string }

// api/transforms/blog.ts
export function toBlogPublishResult(api: ApiBlogPublishResponse): BlogPublishResult;

// hooks/useSitePublishTarget.ts
export const useSitePublishTarget: () => {
  sitePublishTarget: SitePublishTarget | null; loading: boolean; error: string | null;
  updateSitePublishTarget: (data: UpdateSitePublishTargetRequest) => Promise<SitePublishTarget>;
  refetch: () => void;
};

// hooks/usePublishBlog.ts — signature change
export const usePublishBlog: () => {
  publishBlog: (id: string) => Promise<BlogPublishResult>; // was Promise<void>
  retryPublish: (id: string) => Promise<BlogPublishResult>; // NEW — POST .../retry-site-publish
  loading: boolean; retrying: boolean; error: string | null;
};
```

**Behavior:**
- `useSitePublishTarget`'s fetch SHALL treat a 404 response as `sitePublishTarget: null, error: null`
  (not-configured is a normal state, matching `VoiceProfileTab`'s existing `isNotFoundError` handling
  — bake it into the hook here so `SitePublishTab` doesn't repeat it).
- `toBlogPost`/`toBlogPublishResult` SHALL derive `sitePrNumber` from the trailing path segment of
  `site_pr_url` when it parses as an integer, else leave it `undefined`.
- `usePublishBlog.publishBlog`/`retryPublish` SHALL both parse and return the full
  `BlogPublishResult` (not discard the body, as `publishBlog` does today).

**Rules:** frontend-composition-rules

---

## F2 — Settings: Site Publish tab

**Files:** `webapp/src/features/account/components/AccountPage/SitePublishTab.tsx` (new),
`SitePublishTab.module.scss` (new), `webapp/src/features/account/components/AccountPage/component.tsx`
(extend)
**Placement:** `SitePublishTab.tsx` mirrors `VoiceProfileTab.tsx` file-for-file (same loading /
not-configured / error / success branches, same `Alert` usage). `component.tsx`: add `"site-publish"`
to the `VALID_TABS` array, a new `<Tab id="site-publish">Site Publish</Tab>` placed next to the
`voice-profile` tab, and the matching `<TabPanel id="site-publish"><SitePublishTab /></TabPanel>`.

**Contract:** 4-field form — Repository Owner, Repository Name, Base Branch, Content Path (all
required text inputs) — bound to `useSitePublishTarget`. Save calls `updateSitePublishTarget`.

**States:** loading (first mount, no data yet) → spinner; not-configured (404) → empty form, no
error banner; error (non-404 GET failure) → full-tab `Alert variant="error"`; save success →
dismissible success `Alert`; save error → dismissible error `Alert`.

**Selector contract** (house convention is role/label-based per `TESTING-PATTERNS.md`, not
`data-testid` — use these accessible names/roles):
- Repo owner field: `getByLabel('Repository Owner')`
- Repo name field: `getByLabel('Repository Name')`
- Base branch field: `getByLabel('Base Branch')`
- Content path field: `getByLabel('Content Path')`
- Save button: `getByRole('button', { name: /save/i })`

**Rules:** frontend-page-rules:PL-2, frontend-page-rules:C-5, frontend-composition-rules

---

## F3 — Blog detail: site-publish status row + publish-flow fix

**Files:** `webapp/src/components/blog/BlogSitePublishStatus.tsx` (new),
`blog-site-publish-status.module.scss` (new), `webapp/src/components/blog/useBlogSitePublishStatus.ts`
(new, co-located per the `useGitHubConnectionFlow` precedent), `webapp/src/features/blog/BlogWizard.tsx`
(edit — behavior change per shared-contract decision 8), `webapp/src/routes/blog_.$id.tsx` (wire the
new component in)
**Placement:** `BlogSitePublishStatus` renders below the existing post-detail content on
`blog_.$id.tsx`. `BlogWizard.handlePublish` SHALL stay on the current page after a successful
`publishBlog()` call (no `onDone()`/navigate-away) so the status row has something to render onto —
this is the ticket that fixes that.

**Contract:**
```ts
export interface BlogSitePublishStatusProps {
  post: BlogPost;               // reads post.sitePrUrl / sitePrNumber
  sitePublishError?: string;    // from the last publish/retry response
  onRetry: () => void;
  retrying: boolean;
}
export const BlogSitePublishStatus: React.FC<BlogSitePublishStatusProps>;
```

**States:**
- No target configured (AC7): `post.sitePrUrl` unset AND `sitePublishError` unset → render nothing
  (today's UI, unchanged).
- Success: `post.sitePrUrl` set → link "Pushed to GitHub → PR #{sitePrNumber ?? full URL}",
  `href={post.sitePrUrl}`, opens in a new tab.
- Error: `sitePublishError` set → inline `role="alert"` message (use `<Alert variant="error">`, same
  as every other error surface in this codebase) + a "Retry" button calling
  `usePublishBlog().retryPublish(post.id)`.
- Retrying: button shows `isLoading` while `retrying` is true.

**Selector contract:**
- PR link: `getByRole('link', { name: /pushed to github/i })`
- Error alert: `getByRole('alert')` scoped to the status row
- Retry button: `getByRole('button', { name: /retry/i })`

**Rules:** frontend-composition-rules, frontend-page-rules:C-5

---

## F4 — E2E: MSW handlers + Playwright specs

**Files:** `webapp/e2e/handlers/blog.handlers.ts` (extend), a settings-scoped handler file (check
`webapp/e2e/handlers/` first — extend an existing settings handler file if one already covers
voice-profile; otherwise new `webapp/e2e/handlers/sitePublish.handlers.ts`),
`webapp/e2e/handlers/index.ts` (register), `webapp/e2e/mocks/data/` (extend blog post fixtures with
a `publishedBlogWithPr` variant), `webapp/e2e/account.spec.ts` (extend or create), `webapp/e2e/blog.spec.ts`
(extend)
**Depends-on:** F2, F3

**Endpoint × handler table:**
| Endpoint | Handler change |
|---|---|
| `GET/PUT /settings/site-publish` | new `sitePublishEndpoints` + `sitePublishScenarios` (`notConfigured` 404, `unauthorized`, `serverError`, etc.) |
| `POST /blog/:id/publish` | success body changes from bare post to `{post, site_publish_error: undefined}`; add a `publishWithSiteError` 2xx scenario varying `site_publish_error` |
| `POST /blog/:id/retry-site-publish` | new `retrySitePublish` endpoint + scenarios: success, `notFound` (404), `notPublished` (409, code `BLOG_NOT_PUBLISHED`), `serverError` |

**Playwright coverage (table headings only, per frontend-e2e-rules — golden path + every status
code + every interaction):**
- `account.spec.ts` — Site Publish tab: loading / not-configured (404→empty form) / save success /
  save error (400, 401, 403, 409, 500, network error).
- `blog.spec.ts` — status row: not-configured (row absent, AC7) / success (PR link visible, correct
  href, opens new tab) / error (alert + retry button visible) / retry click → success / retry click
  → error persists / retry status codes (404, 409, 500, 401, network error) / publish-flow no longer
  navigates away (regression test for the F3 behavior change).

**Rules:** frontend-e2e-rules

---

## Notes for human confirmation

- **`readingTime` format** — resolved. The shubhanshudev repo's `astro-site/src/content.config.ts`
  (pushed 2026-08-02, commit 12a3c4c) declares `readingTime: z.string()` — free-form display text,
  not parsed. B4's `computeReadingTime` returning `"{N} min read"` is valid as-is; no change
  needed.
- **F3's publish-flow behavior change** (staying on the page instead of navigating to `/blog` after
  publish) is a real UX change beyond "add a status row" — flagging so it isn't missed as an
  incidental diff during review.
