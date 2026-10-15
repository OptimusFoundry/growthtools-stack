# Delete Blog Posts (including live site removal) — PRD

**Epic:** MEER-25   **Status:** Spec'd   **Date:** 2026-08-03   **Size:** M

## Problem / why
Delete already exists in growth-tools, but only for `draft` posts — the
delete button is hidden for `published`/`archived` posts in both the blog
list row and the editor's topbar. There's no way to delete a post that's
already live. Separately, since EP-002 shipped, a published post also has a
markdown file merged into the shubhanshudev site repo — deleting it
internally today would leave that file live forever with no path to remove
it, since growth-tools never reaches back into a repo after the initial
publish.

## Users & personas
Single account owner (personal-use tool).

## Goals
- Delete works for posts in any status (draft, published, archived), not
  just draft.
- Deleting a post that was ever published to the site also removes its
  markdown file from shubhanshudev via an auto-merged PR — mirroring the
  existing publish flow (branch → commit → PR → auto-merge).
- If the site-file removal fails (no GitHub connection, API error, file
  already gone, etc.), the internal delete still succeeds — matching the
  existing "GitHub operations never block the internal action" precedent
  from publish. The failure is surfaced to the user, not silent.
- The delete confirmation makes it unambiguous when a post is live, so
  deleting isn't a surprise "this also disappears from my public site."

## Non-goals
- No "trash" / restore-after-delete UI — delete remains the existing
  soft-delete (`deleted_at`), just newly extended to reach the site copy too.
  Un-deleting in growth-tools does NOT restore the site file.
- No retry mechanism for a failed site-file removal (unlike site-publish's
  retry) — once the post is internally deleted there's no ticket to retry
  against; the surfaced error is informational, pointing at manual cleanup.
- No bulk-delete — one post at a time, matching the existing UI.
- No change to how deletion of a *never-published* post behaves — no site
  file ever existed, so there's nothing to remove there (skip the GitHub
  step entirely, don't attempt it against a target with no matching file).

## User stories
- As the account owner, I want to delete a published post and have it
  actually stop being served on my site, so deleting means deleting.
- As the account owner, I want a clear warning before deleting a live post
  specifically (distinct from deleting a draft), so I don't do it by
  accident.
- As the account owner, I want to know if the site-side removal failed, so
  I can go clean it up manually instead of assuming it's gone.

## Acceptance criteria
1. AC1 — The delete action (list row + editor topbar) is available for
   posts in any status, not just `draft`.
2. AC2 — The delete confirmation modal's copy differs for a published post:
   it states the post is live and will also be removed from the site.
3. AC3 — `DeleteBlogPost` on a post with `SitePRURL` set (i.e. ever
   published) attempts to remove `{content_path}/{slug}.md` from the site
   repo: create a branch off the configured base branch, delete the file,
   open a PR, auto-merge it — same account/target/connection resolution as
   `PublishBlogToSite`.
4. AC4 — A post with no `SitePRURL` (never published) skips the GitHub step
   entirely — no branch/PR attempt, no error.
5. AC5 — If the site-file removal fails for any reason, the internal
   soft-delete still completes; the failure is returned to the caller as a
   `site_delete_error` string (analogous to `site_publish_error`), and the
   frontend surfaces it as a warning banner rather than silently succeeding.
6. AC6 — If the repo's `GET contents` for the target file returns 404 (file
   already doesn't exist — e.g. manually removed, or the target repo/path
   changed since publish), treat this as a successful no-op, not an error.

## Data & API surface (rough)
- `DELETE /api/protected/blog/:id` (existing route) — response envelope
  changes from empty/message-only to `{site_delete_error?: string}` (or
  similar), analogous to the `BlogPublishResult` envelope change from EP-002.
- `GitHubClient` (`internal/infra/clients/github`) gains `DeleteFileContents`
  (GET contents for sha — tolerate 404 as "nothing to delete" — then DELETE
  with that sha).
- `SitePublisher` interface (`blog/processor`) gains
  `DeleteBlogFromSite(ctx, accountID uuid.UUID, post store.BlogPost) error`,
  implemented by `GitHubProcessor` alongside the existing
  `PublishBlogToSite`.
- `BlogProcessor.DeleteBlogPost` return type changes from `error` to
  `(DeleteBlogPostResult, error)` (or similar) carrying the site-delete
  outcome — same shape of change as `PublishBlogPost` → `BlogPublishResult`
  in EP-002.

## UX notes
- List row (`BlogRow`): delete button becomes visible for all statuses, not
  gated to `draft`.
- Editor topbar: `canDelete` drops its `postStatus === "draft"` restriction.
- Confirm modal: published-post copy explicitly mentions site removal
  (e.g. "This post is live on shubhanshu.dev — deleting it will also open a
  PR to remove it from the site."); draft/archived copy stays as today.
- After a delete with a site-delete failure, show a warning banner (same
  pattern as the existing site-publish-failure banner) before navigating
  away from the list/editor.

## Dependencies
- Existing site-publish pipeline (`PublishBlogToSite`, `buildBlogMarkdown`'s
  file-path convention) — this extends it with the mirror-image delete
  operation, same GitHub connection/target resolution.
- Existing GitHub REST client (`CreateBranch`, `CreatePullRequest`,
  `MergePullRequest` already built in EP-002) — only `DeleteFileContents` is
  new.

## Open questions & assumptions
- Assumption: the branch name for a delete PR follows the same
  `blog/{slug}-{suffix}` convention as publish (distinct random suffix per
  attempt) — no reason to diverge.
- Assumption: "published" is not the only status that can carry a
  `SitePRURL` — an archived post that was published earlier still has one,
  so AC3's check is on `SitePRURL` presence, not on current status.
