# Delete Blog Posts (including live site removal) — Tech Plan

**Epic:** MEER-25   **PRD:** docs/prds/2026-08-03-blog-delete.md   **Scope:** full-stack

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

## Notes for human confirmation

- **Branch/commit/PR wording for delete** (decision 4 — `blog/remove-{slug}-{suffix}`, `blog: remove
  "{title}"`, `Remove: {title}`) is a naming choice, not dictated by the PRD verbatim — flagging in
  case a different convention is preferred before `backend-code-editor` implements B3.
- **List-item `sitePrUrl` addition (B1)** is a small scope expansion beyond the PRD's literal "Data
  & API surface" section (which only mentions the `DELETE` endpoint's response envelope) — resolved
  here to keep the list row and editor's confirm-modal copy consistent for the same post (decision
  6). Flagging since it's the one place this plan adds beyond what the PRD explicitly listed.

## Tickets

1. MEER-27 — Store: `site_pr_url` on the blog post list projection
2. MEER-28 — GitHub REST client: `DeleteFileContents`
3. MEER-29 — GitHubProcessor: `DeleteBlogFromSite`
4. MEER-30 — BlogProcessor: `DeleteBlogPost` envelope + `SitePublisher` extension
5. MEER-31 — Blog handler: response envelope
6. MEER-32 — Types, transforms, hooks
7. MEER-33 — Blog list: BlogRow gate removal + copy branch + warning banner
8. MEER-34 — Editor: BlogWizard `canDelete` gate removal + migration onto `useConfirmableDelete`
9. MEER-35 — E2E: MSW handlers + Playwright specs
