# Delete Blog Posts (including live site removal) — Tech Plan

**Epic:** EP-004   **PRD:** docs/prds/2026-08-03-blog-delete.md   **Scope:** full-stack

No DB migration in this plan — `blog_posts.site_pr_url` already exists (shipped in EP-002); this
epic only reads it earlier (list projection) and reaches it before delete, no schema change.

## AC coverage

| AC | Description | Tickets |
|----|------|---------|
| AC1 | Delete available for any post status (list row + editor topbar) | F2, F3 |
| AC2 | Confirm-modal copy differs for a live (ever-published) post | B1, F1, F2, F3 |
| AC3 | Delete on a post with `SitePRURL` set attempts site-file removal (branch→delete→PR→merge) | B3, B4 |
| AC4 | Post never published (`SitePRURL` nil) skips the GitHub step entirely, no error | B3 |
| AC5 | Site-removal failure never blocks the internal delete; surfaced as `site_delete_error` / warning banner | B4, B5, F1, F2, F3 |
| AC6 | GET-contents 404 on the target file is a successful no-op, not an error | B2 |

## Tickets

| Ticket | Epic | Layer | Depends-on | AC refs | Status |
|--------|------|-------|-----------|---------|--------|
| B1 | EP-004 | db  | —          | AC2 | Todo |
| B2 | EP-004 | api | —          | AC6 | Todo |
| B3 | EP-004 | api | B2         | AC3,AC4 | Todo |
| B4 | EP-004 | api | B3         | AC3,AC5 | Todo |
| B5 | EP-004 | api | B4         | AC5 | Todo |
| F1 | EP-004 | fe  | B1,B5      | AC2,AC5 | Todo |
| F2 | EP-004 | fe  | F1         | AC1,AC2,AC5 | Todo |
| F3 | EP-004 | fe  | F1         | AC1,AC2,AC5 | Todo |
| F4 | EP-004 | fe  | F2,F3      | AC1,AC2,AC3,AC4,AC5,AC6 | Todo |

## Shared contract

### Entities

No new/changed entities. `store.BlogPost.SitePRURL *string` (EP-002) is the sole signal used
throughout. `store.BlogPostListItem` (slim list projection) gains one field:
`SitePRURL *string` `db:"site_pr_url" json:"site_pr_url,omitempty"` (B1) so the list route can
apply the same "is this post live" branch as the editor without a second fetch.

### New types

```go
// base-server/internal/blog/processor/processor.go
type DeleteBlogPostResult struct {
    Message         string `json:"message"`
    SiteDeleteError string `json:"site_delete_error,omitempty"`
}
```
```ts
// webapp/src/api/types/blog.ts
export interface ApiDeleteBlogResponse { message: string; site_delete_error?: string }
// webapp/src/types/blog.ts
export interface DeleteBlogResult { message: string; siteDeleteError?: string }
```

### Endpoint (existing route, response shape changes)

`DELETE /api/protected/blog/:id` → 200 `processor.DeleteBlogPostResult` (was bare
`gin.H{"message": "..."}`) | 404 `BLOG_NOT_FOUND` (post not found) — unchanged mapping.

### Errors

blog post not found (delete) → 404 `BLOG_NOT_FOUND` (existing, unchanged) · site-file removal
failure (no GitHub connection, API failure, etc.) → **never** a non-2xx — captured as
`DeleteBlogPostResult.SiteDeleteError` string inside the 200 response (AC5) · GET-contents 404
inside `DeleteFileContents` → not an error, treated as done (AC6) · post never published
(`SitePRURL == nil`) → `DeleteBlogFromSite` no-op, returns `nil`, zero GitHub calls (AC4) · no site
publish target configured (settings cleared after the post went live) → same silent no-op
precedent as `PublishBlogToSite`.

### Cross-cutting design decisions (resolved here, binding on all tickets)

1. **Ordering inverts publish's shape.** `BlogProcessor.DeleteBlogPost` fetches the post FIRST
   (`GetBlogPostByID`) so `Slug`/`SitePRURL` are available, THEN attempts the site-delete, THEN
   performs the internal soft-delete — regardless of the site-delete outcome. This is the opposite
   order from `PublishBlogPost` (internal flip happens first there) because delete needs the row's
   data to resolve the site-file path *before* the row is gone.
2. **"Skip when never published" lives inside `DeleteBlogFromSite`, not the caller** — mirrors the
   existing precedent where "no site publish target configured" is a silent no-op INSIDE
   `PublishBlogToSite` rather than a caller-side check. `BlogProcessor.DeleteBlogPost` calls
   `sitePublisher.DeleteBlogFromSite` unconditionally (when `sitePublisher != nil`), exactly like
   `PublishBlogPost` calls `PublishBlogToSite` unconditionally. `DeleteBlogFromSite`'s first line is
   `if post.SitePRURL == nil { return nil }`.
3. **New sentinel `ErrSiteDeleteFailed`**, not a reuse of `ErrSitePublishFailed` — one `ErrXxx` per
   failure domain (backend-architecture-rules:A-4), keeps publish-vs-delete failures distinguishable
   in logs/tests. `ErrGitHubNotConnected` IS reused (same connection-resolution failure as publish).
4. **Branch/commit/PR naming for delete** (distinct from publish's wording, same `Client` methods):
   branch `blog/remove-{slug}-{8hex}` (reuses the existing `randomHexSuffix` helper — the
   `remove-` infix keeps a delete branch visually distinguishable from a publish branch in the site
   repo's branch list), commit message `blog: remove "{title}"`, PR title `Remove: {title}`, PR body
   `"Automated PR removing a blog post from the site."` Best-effort auto-merge, identical to
   publish's (log-only failure, PR left open).
5. **`DeleteFileContents`'s DELETE success status is 200, not 204.** Do not copy `DeleteWebhook`'s
   204/404-tolerant check — that's the webhooks endpoint's semantics. GitHub's
   `DELETE /repos/{owner}/{repo}/contents/{path}` returns 200 with a JSON body on success. The 404
   tolerance in this method applies ONLY to the GET-for-sha step (AC6), never to the DELETE call
   itself (which is skipped entirely when GET returns 404).
6. **List-item `sitePrUrl` gap resolved by adding the field** (B1), not by approximating on
   `status === "published"` in the list route. An archived-but-previously-published post still has
   `SitePRURL` set (per the PRD's own "Open questions" note) and its delete DOES attempt site
   removal (AC3 keys on `SitePRURL` presence, not current status) — so the confirm-modal copy in
   BOTH the list row and the editor must key off the same signal (`sitePrUrl` presence) or the two
   entry points would warn inconsistently about the exact same post. The SELECT/struct addition is
   one line each; cheaper than living with the inconsistency.
7. **`useConfirmableDelete` (shared hook, also used by `posts.tsx` etc.) is widened, not
   duplicated** — adds a generic `TResult` param, widens `onSuccess` to receive the resolved mutation
   value, adds an optional `getWarning?: (result: TResult) => string | undefined`, and widens
   `copy.confirmBody` to accept `string | ((targetId: string) => string)`. All three additions are
   optional/backward-compatible — existing callers (string `confirmBody`, no `getWarning`, zero-arg
   `onSuccess`) are unaffected structurally (a function accepting fewer params than the declared
   type is assignable in TS).
8. **`BlogWizard`'s delete wiring is migrated onto `useConfirmableDelete` + `<ConfirmDeleteModal>`
   in this same change** (F3) — it currently hand-rolls `useState<boolean>` + a raw `<Modal>` +
   inline try/catch banner logic (the exact anti-pattern `frontend-composition-rules` calls out),
   and this ticket already has to touch `handleConfirmDelete` to thread `siteDeleteError` through, so
   fixing it here avoids maintaining two divergent delete implementations with two different
   copy-branch mechanisms.
9. **Warning-banner mechanism**: `BannerCenterProvider` is mounted above the router
   (`webapp/src/contexts/providers.tsx`), so `addBanner(...)` state already survives `navigate()` —
   no new toast/search-param/router-state plumbing is needed for the editor's navigate-away-after-delete
   case. The mechanism to mirror is `BlogWizard.handlePublish`'s existing
   `if (result.sitePublishError) { addBanner({type:"warning", ...}) } else { addBanner({type:"success", ...}) }`
   branch — NOT the persistent `BlogSitePublishStatus` inline-alert row (that's for staying on a page
   that still exists; the deleted post has no page to stay on).

---

## B1 — Store: `site_pr_url` on the blog post list projection

**Files:** `base-server/internal/infra/store/blog_post.go`,
`base-server/internal/infra/store/blog_post_test.go`
**Placement:** `BlogPostListItem` struct (currently `ID, Title, Status, PublishedAt, CreatedAt,
UpdatedAt`) — add `SitePRURL *string` after `PublishedAt`, before `CreatedAt` (mirrors the ordering
EP-002 used when it added `SitePRURL`/`SitePROpenedAt` to the full `BlogPost` struct).
`sqlListBlogPosts`'s `SELECT` clause — add `site_pr_url` after `published_at`.

**Signature:** field addition only — no method signature changes.
```go
type BlogPostListItem struct {
    ID          uuid.UUID  `db:"id"           json:"id"`
    Title       string     `db:"title"        json:"title"`
    Status      string     `db:"status"       json:"status"`
    PublishedAt *time.Time `db:"published_at" json:"published_at,omitempty"`
    SitePRURL   *string    `db:"site_pr_url"  json:"site_pr_url,omitempty"`
    CreatedAt   time.Time  `db:"created_at"   json:"created_at"`
    UpdatedAt   time.Time  `db:"updated_at"   json:"updated_at"`
}
```

**Behavior:**
- `ListBlogPosts`: SHALL include `site_pr_url` (nullable) in every returned row so callers can
  detect "this post is/was live" without a second `GetBlogPostByID` fetch; all other behavior
  (status filter, pagination, ordering) unchanged.

**Rules:** backend-store-rules:S-1

---

## B2 — GitHub REST client: `DeleteFileContents`

**Files:** `base-server/internal/infra/clients/github/client.go`,
a `client_test.go` in the same package (extend if it exists, else new)
**Placement:** append immediately after `CreateOrUpdateFileContents`, before `CreatePullRequest`.
Reuses the existing `RepoContentResponse` struct (already has `SHA`) — no new response type.

**Signature:**
```go
func (c *Client) DeleteFileContents(ctx context.Context, token, owner, repo, filePath, branch, commitMessage string) error
```

**Behavior:**
- WHEN the GET-contents call (`GET /repos/{owner}/{repo}/contents/{filePath}?ref={branch}`) returns
  404, THE method SHALL return `nil` immediately — no DELETE request issued (AC6).
- WHEN the GET-contents call returns 200, THE method SHALL parse `RepoContentResponse.SHA` and issue
  `DELETE /repos/{owner}/{repo}/contents/{filePath}` with body `{message: commitMessage, sha, branch}`.
- WHEN the GET-contents call returns any other status, THE method SHALL return a wrapped error
  (mirrors `CreateOrUpdateFileContents`'s `else if StatusCode != 404` branch).
- WHEN the DELETE call returns any status other than 200, THE method SHALL return a wrapped error
  including status code + response body (matches `CreateOrUpdateFileContents`'s error-formatting
  idiom). 200 is success — **do not** reuse `DeleteWebhook`'s 204/404-tolerant check.

**Rules:** backend-architecture-rules:A-4

---

## B3 — GitHubProcessor: `DeleteBlogFromSite`

**Files:** `base-server/internal/github/processor/site_publish.go` (extend),
`base-server/internal/github/processor/processor.go` (error var + `GitHubClient` interface),
`base-server/internal/github/processor/site_publish_test.go` (extend),
`base-server/internal/github/processor/mocks_test.go` (gomock — regenerate)
**Placement:** `DeleteBlogFromSite` added to `site_publish.go` immediately after
`PublishBlogToSite`, before `buildBlogMarkdown`. `processor.go`'s error var block — append
`ErrSiteDeleteFailed` after `ErrSitePublishFailed`. `GitHubClient` interface — append
`DeleteFileContents` (B2's signature) after `MergePullRequest`. No `GitHubStore` interface change
(`GetAccountByID`, `GetSitePublishTargetByAccount`, `GetGitHubConnectionByUserID` already present).

**Signatures:**
```go
var ErrSiteDeleteFailed = errors.New("site delete failed") // in processor.go's existing var block

func (p *GitHubProcessor) DeleteBlogFromSite(ctx context.Context, accountID uuid.UUID, post store.BlogPost) error
```

**Behavior:**
- WHEN `post.SitePRURL == nil` SHALL return `nil` immediately — zero store/GitHub calls (AC4).
- WHEN `GetSitePublishTargetByAccount` returns `store.ErrNotFound` SHALL return `nil` (silent no-op —
  settings cleared since the post was published; same precedent as `PublishBlogToSite`).
- WHEN `GetAccountByID` or `GetGitHubConnectionByUserID` fails SHALL return `ErrGitHubNotConnected`.
- Otherwise SHALL compute `filePath := path.Join(target.ContentPath, post.Slug+".md")` (same
  convention as publish) and run `CreateBranch` → `DeleteFileContents` → `CreatePullRequest` →
  best-effort `MergePullRequest`, using the naming from shared-contract decision 4.
- WHEN `CreateBranch`, `DeleteFileContents`, or `CreatePullRequest` fails SHALL log and return
  `ErrSiteDeleteFailed`.
- WHEN `MergePullRequest` fails after a successful PR creation SHALL log the error but still return
  `nil` (best-effort, matches publish precedent — PR left open for manual merge).

**Rules:** backend-architecture-rules:A-1, backend-architecture-rules:A-3, backend-architecture-rules:A-5, backend-error-rules:E-2, backend-testing-rules:TS-6

---

## B4 — BlogProcessor: `DeleteBlogPost` envelope + `SitePublisher` extension

**Files:** `base-server/internal/blog/processor/processor.go`,
`base-server/internal/blog/processor/mocks_test.go` (hand-rolled — hand-edit, do not `go generate`),
`base-server/internal/blog/processor/processor_test.go`
**Placement:** `DeleteBlogPostResult` struct added immediately after `BlogPublishResult`. `SitePublisher`
interface gains `DeleteBlogFromSite` as a second method (same interface block as `PublishBlogToSite`).
`DeleteBlogPost`'s body is fully replaced (order inversion — decision 1). No `BlogStore` interface
change (`GetBlogPostByID`, `DeleteBlogPost` already present). `MockSitePublisher` in
`mocks_test.go` (current shape: one `PublishBlogToSiteFn` field + method) gains a hand-added
`DeleteBlogFromSiteFn func(ctx context.Context, accountID uuid.UUID, post store.BlogPost) error`
field + matching method, same style as the existing one.

**Signatures:**
```go
type DeleteBlogPostResult struct {
    Message         string `json:"message"`
    SiteDeleteError string `json:"site_delete_error,omitempty"`
}
type SitePublisher interface {
    PublishBlogToSite(ctx context.Context, accountID uuid.UUID, post store.BlogPost) (prURL string, err error)
    DeleteBlogFromSite(ctx context.Context, accountID uuid.UUID, post store.BlogPost) error
}
func (p *BlogProcessor) DeleteBlogPost(ctx context.Context, accountID, postID uuid.UUID) (DeleteBlogPostResult, error) // BREAKING — was (error)
```

**Behavior:**
- WHEN the post does not exist for the account (`GetBlogPostByID` → `store.ErrNotFound`) SHALL
  return `ErrBlogPostNotFound`, `DeleteBlogPostResult{}` — no site-delete or store-delete attempted.
- WHEN the post exists and `p.sitePublisher != nil` SHALL call `DeleteBlogFromSite(ctx, accountID,
  post)` BEFORE calling `store.DeleteBlogPost`, unconditionally (the nil-`SitePRURL` no-op check
  lives inside `DeleteBlogFromSite` per decision 2, not here).
- WHEN `sitePublisher` is nil SHALL skip the site-delete call entirely (mirrors `attemptSitePublish`'s
  nil-check) and proceed directly to the store delete.
- WHEN `DeleteBlogFromSite` returns an error SHALL capture `err.Error()` into `SiteDeleteError` and
  SHALL still call `store.DeleteBlogPost` (AC5 — never blocked by a site-delete failure).
- WHEN `store.DeleteBlogPost` returns `store.ErrNotFound` SHALL return `ErrBlogPostNotFound`; any
  other store error SHALL propagate as-is (both unchanged from today).
- WHEN `store.DeleteBlogPost` succeeds SHALL return `DeleteBlogPostResult{Message: "Blog post
  deleted successfully", SiteDeleteError: <captured or empty>}, nil` regardless of the site-delete
  outcome.

**Test-fixture blast radius (this ticket, not B5):** `DeleteBlogPost` now calls `GetBlogPostByID` as
its unconditional FIRST store call (decision 1) — a behavior change to an already-passing test file.
`processor_test.go`'s `TestBlogProcessor_DeleteBlogPost` has two PRE-EXISTING sub-tests ("happy
path", "other error propagated") that currently construct `MockBlogStore` with only
`DeleteBlogPostFn` set. `MockBlogStore.GetBlogPostByID` has no nil-guard on its stub func
(`mocks_test.go`), so leaving `GetBlogPostByIDFn` unset makes it panic the instant `DeleteBlogPost`
calls it. Both pre-existing sub-tests MUST have `GetBlogPostByIDFn` added alongside
`DeleteBlogPostFn` (returning a valid `store.BlogPost{}` — accountID/postID don't need to match
anything specific for these two cases) BEFORE the new `(result, error)` signature and call-order
land, or the suite panics rather than fails.

**Rules:** backend-architecture-rules:A-1, backend-architecture-rules:A-3, backend-error-rules:E-1, backend-error-rules:E-2, backend-testing-rules:TS-1, backend-testing-rules:TS-2, backend-testing-rules:TS-6

---

## B5 — Blog handler: response envelope

**Files:** `base-server/internal/blog/handler/handler.go`,
`base-server/internal/blog/handler/mocks_test.go` (gomock — regenerate),
`base-server/internal/blog/handler/handler_test.go`
**Placement:** `BlogProcessor` interface — change `DeleteBlogPost`'s return type. `HandleDeleteBlog`
body — capture the result, keep the existing `if err != nil { h.handleError(c, err); return }`,
replace the hardcoded `gin.H{"message": ...}` with `c.JSON(http.StatusOK, result)` (mirrors
`HandlePublishBlog`'s `c.JSON(http.StatusOK, published)`). No `handleError` change — no new error
type crosses the handler boundary (`ErrGitHubNotConnected`/`ErrSiteDeleteFailed` are captured as
strings inside `BlogProcessor.DeleteBlogPost`, never returned to the handler).

**Signature:**
```go
type BlogProcessor interface {
    // ...unchanged methods...
    DeleteBlogPost(ctx context.Context, accountID, postID uuid.UUID) (processor.DeleteBlogPostResult, error)
}
```

**Behavior:**
- `HandleDeleteBlog`: unchanged accountID/postID extraction; WHEN `DeleteBlogPost` succeeds SHALL
  respond `200 OK` with the `DeleteBlogPostResult` JSON body directly; WHEN it returns
  `ErrBlogPostNotFound` SHALL route through the existing `handleError` switch (404), unchanged.

**Signature-change blast radius:** two `m.EXPECT().DeleteBlogPost(...)` call sites in
`handler_test.go` currently `.Return(nil)` / `.Return(err)` — update to
`.Return(processor.DeleteBlogPostResult{...}, nil)` / `.Return(processor.DeleteBlogPostResult{},
err)`. `blog/processor/processor_test.go`'s `TestBlogProcessor_DeleteBlogPost` sub-tests currently
assert on `err` alone from a bare call — update to `result, err := ...` and add sub-tests for:
site-delete success (no error captured), site-delete error captured but store-delete still
proceeds, and post-not-found short-circuit (no site-delete or store-delete attempted). **This is
IN ADDITION to, not instead of, B4's fixture fix above**: the two PRE-EXISTING sub-tests ("happy
path", "other error propagated") ALSO need a `GetBlogPostByIDFn` stub added — not just the 3 new
sub-tests being added here — or they panic on the nil stub func the moment `DeleteBlogPost` calls
`GetBlogPostByID` as its first step. Concretely, all five sub-tests after this ticket lands need
`GetBlogPostByIDFn` set: "happy path" and "other error propagated" (pre-existing, B4's fix) return a
valid `store.BlogPost{}`; the new "post-not-found short-circuit" sub-test returns
`store.BlogPost{}, store.ErrNotFound`; the two other new sub-tests (site-delete success, site-delete
error captured) return a valid `store.BlogPost{}` alongside their respective
`MockSitePublisher.DeleteBlogFromSiteFn` stub.

**Rules:** backend-architecture-rules:A-8, backend-error-rules:E-3, backend-testing-rules:TS-6

---

## F1 — Types, transforms, hooks

**Files:** `webapp/src/api/types/blog.ts` (extend), `webapp/src/types/blog.ts` (extend),
`webapp/src/api/transforms/blog.ts` (extend), `webapp/src/hooks/useDeleteBlog.ts` (extend),
`webapp/src/hooks/useConfirmableDelete.ts` (extend — shared hook)
**Depends-on:** B1, B5

**TS contracts:**
```ts
// api/types/blog.ts additions
export interface ApiDeleteBlogResponse { message: string; site_delete_error?: string }
// ApiBlogPostListItem gains: site_pr_url?: string;

// types/blog.ts additions
export interface DeleteBlogResult { message: string; siteDeleteError?: string }
// BlogPostListItem gains: sitePrUrl?: string;

// api/transforms/blog.ts
export function toDeleteBlogResult(api: ApiDeleteBlogResponse): DeleteBlogResult;
// toBlogPostListItem extended to map site_pr_url -> sitePrUrl

// hooks/useDeleteBlog.ts — signature change
export const useDeleteBlog: () => {
  deleteBlog: (id: string) => Promise<DeleteBlogResult>; // was Promise<void>
  loading: boolean;
  error: string | null;
};

// hooks/useConfirmableDelete.ts — widened (backward-compatible), shared across CRUD list pages
export interface ConfirmableDeleteCopy {
  resource: string;
  confirmBody: string | ((targetId: string) => string); // was string only
  modalTitle?: string;
}
export interface UseConfirmableDeleteOptions<TResult = unknown> {
  mutate: (id: string) => Promise<TResult>;
  mutating: boolean;
  onSuccess?: (result: TResult) => void;       // was () => void
  getWarning?: (result: TResult) => string | undefined; // NEW
  copy: ConfirmableDeleteCopy;
}
export function useConfirmableDelete<TResult = unknown>(
  options: UseConfirmableDeleteOptions<TResult>
): ConfirmableDeleteFlow; // ConfirmableDeleteFlow shape unchanged
```

**Behavior:**
- `toBlogPostListItem` SHALL map `site_pr_url` → `sitePrUrl` (undefined when absent/null), same
  omission style as every other optional field in this transform.
- `useDeleteBlog.deleteBlog` SHALL parse and return the full `DeleteBlogResult` (not discard the
  body, as it does today).
- `useConfirmableDelete`'s RETURNED `confirmBody` field (today: `confirmBody: copy.confirmBody` in
  the object returned from the hook, ~line 74 — evaluated on every render, i.e. while the modal is
  OPEN and the user is reading it, BEFORE they click confirm) SHALL resolve to
  `copy.confirmBody(targetId)` when `copy.confirmBody` is a function, else use it as a literal
  string unchanged (existing callers unaffected). This resolution happens in the hook's return
  value, NOT inside `confirm()` — `confirm()` (the click-triggered async handler) runs only after
  the modal is already open and the copy has already been shown, so resolving there would be too
  late for the by-target-id copy branch F2/F3 depend on.
- `useConfirmableDelete.confirm()` SHALL call `getWarning?.(result)` after a successful `mutate()`;
  WHEN it returns a non-empty string SHALL fire a `type: "warning"` banner (title:
  `` `${capitalize(resource)} deleted, but site removal failed` ``, description: that string)
  INSTEAD OF the existing generic `type: "success"` banner; WHEN it returns `undefined` (or
  `getWarning` isn't supplied) SHALL fire the existing generic success banner unchanged. Either way
  SHALL then call `onSuccess?.(result)`.

**Rules:** frontend-composition-rules

---

## F2 — Blog list: BlogRow gate removal + copy branch + warning banner

**Files:** `webapp/src/features/blog/components/BlogRow/BlogRow.tsx`,
`webapp/src/routes/blog.tsx`
**Depends-on:** F1
**Placement:** `BlogRow.tsx` — remove the `{post.status === "draft" && (...)}` wrapper (line ~37)
around the delete `<button>`; render it unconditionally for every status. `aria-label={`Delete blog
post "${post.title || "untitled"}"`}` is unchanged. `blog.tsx` — extend the `useConfirmableDelete`
call: add `getWarning: (result) => result.siteDeleteError`, and change `copy.confirmBody` from the
current fixed string to a function that looks up the target post from `blogPosts` by
`deleteFlow.targetId` (or the `targetId` param passed into the function) and branches on
`sitePrUrl` presence.

**Contract:**
```ts
confirmBody: (targetId: string) => {
  const target = blogPosts.find((p) => p.id === targetId);
  return target?.sitePrUrl
    ? "This post is live on shubhanshu.dev — deleting it will also open a PR to remove it from the site."
    : "Are you sure you want to delete this blog post? This action cannot be undone.";
}
```

**Behavior:**
- Delete button SHALL render for every `post.status` (AC1).
- Confirm modal body SHALL show the live-post copy above whenever the targeted post has `sitePrUrl`
  set, regardless of its current status (AC2, consistent with AC3's own `SitePRURL`-presence trigger
  — decision 6); otherwise SHALL show the existing generic copy, unchanged.
- WHEN the delete resolves with `siteDeleteError` set SHALL show the warning banner (via F1's
  `getWarning`) instead of the generic success banner (AC5).

**Selector contract:**
- Delete button (any status): `getByRole('button', { name: /delete blog post/i })`
- Confirm dialog: `getByRole('dialog', { name: /delete blog post/i })`
- Live-post copy: `getByText(/live on shubhanshu\.dev/i)`
- Default copy: `getByText(/cannot be undone/i)`
- Warning banner: `getByRole('alert')` containing text matching `/site removal failed/i`; dismiss
  control `getByRole('button', { name: /dismiss banner/i })`

**Rules:** frontend-composition-rules, frontend-page-rules:S-4

---

## F3 — Editor: BlogWizard `canDelete` gate removal + migration onto `useConfirmableDelete`

**Files:** `webapp/src/components/blog/BlogWizard.tsx`
**Depends-on:** F1
**Placement:** remove `deleteOpen` state (line ~121), the inline `<Modal>` block (lines ~621-645),
and `handleConfirmDelete` (lines ~361-380) — replace with a `useConfirmableDelete<DeleteBlogResult>`
call + `<ConfirmDeleteModal flow={deleteFlow} />` rendered where the removed `<Modal>` was, mirroring
`blog.tsx`'s wiring exactly (decision 8). `canDelete` (line 359) drops its `postStatus === "draft"`
condition. Topbar delete `<Button>` (line ~384) changes its `onClick` from `() =>
setDeleteOpen(true)` to `() => deleteFlow.request(initialBlogPost!.id)`.

**Contract:**
```ts
const canDelete = isEditMode && !!initialBlogPost; // drops postStatus === "draft"

const deleteFlow = useConfirmableDelete<DeleteBlogResult>({
  mutate: deleteBlog,
  mutating: deleting,
  onSuccess: () => onDone(),
  getWarning: (result) => result.siteDeleteError,
  copy: {
    resource: "blog post",
    modalTitle: "Delete blog post",
    confirmBody: initialBlogPost?.sitePrUrl
      ? "This post is live on shubhanshu.dev — deleting it will also open a PR to remove it from the site."
      : "Are you sure you want to delete this blog post? This action cannot be undone.",
  },
});
```

**Behavior:**
- Delete button in the editor topbar SHALL render for any post status once `canDelete` is true
  (AC1) — still hidden in create mode before the post has ever been saved (`!initialBlogPost`,
  unchanged).
- Confirm modal copy SHALL branch on `initialBlogPost?.sitePrUrl` presence, same rule as F2 (AC2).
- On successful delete SHALL navigate away via `onDone()` regardless of `siteDeleteError`; WHEN
  `siteDeleteError` is set SHALL show the warning banner (via F1's `getWarning`) instead of the
  generic success banner BEFORE `onDone()` fires (banner survives the navigation — decision 9).

**Selector contract:** same as F2 (editor topbar delete button `aria-label="Delete blog post"`
unchanged; confirm dialog / copy / warning banner selectors identical to F2's, since both now go
through `<ConfirmDeleteModal>`).

**Rules:** frontend-composition-rules, frontend-page-rules:S-4

---

## F4 — E2E: MSW handlers + Playwright specs

**Files:** `webapp/e2e/handlers/blog.handlers.ts` (extend), `webapp/e2e/blog.spec.ts` (extend/rewrite)
**Depends-on:** F2, F3

**Endpoint × handler change:**
| Endpoint | Change |
|---|---|
| `DELETE /blog/:id` | success body changes from `{message}` to `{message, site_delete_error?}`; add a `deleteWithSiteError` 200-variant scenario alongside the existing success/404/500/network scenarios |

**Playwright coverage (table headings only, per frontend-e2e-rules — golden path + every status
code + every interaction):**
- `blog.spec.ts` — delete button visible for every status (draft/published/archived) at both the
  list row and editor topbar — this REPLACES the existing defensive
  `isVisible().catch(() => false)` guards (lines ~218-275) with unconditional assertions, since
  those guards exist only because the button used to be conditionally hidden.
- Confirm-modal copy: published/live post (has a PR) shows the live-post copy; draft/never-published
  shows the default copy — both from the list row AND the editor.
- Delete success (200, no `site_delete_error`) → success banner, row/post gone.
- Delete success with `site_delete_error` (200, field set) → warning banner with the error text,
  dismissible, survives navigation (editor case).
- Delete status codes: 404 (not found), 500 (server error), network/transport failure — each from
  both the list row and the editor topbar.

**Rules:** frontend-e2e-rules

---

## Notes for human confirmation

- **Branch/commit/PR wording for delete** (decision 4 — `blog/remove-{slug}-{suffix}`, `blog: remove
  "{title}"`, `Remove: {title}`) is a naming choice, not dictated by the PRD verbatim — flagging in
  case a different convention is preferred before `backend-code-editor` implements B3.
- **List-item `sitePrUrl` addition (B1)** is a small scope expansion beyond the PRD's literal "Data
  & API surface" section (which only mentions the `DELETE` endpoint's response envelope) — resolved
  here to keep the list row and editor's confirm-modal copy consistent for the same post (decision
  6). Flagging since it's the one place this plan adds beyond what the PRD explicitly listed.
