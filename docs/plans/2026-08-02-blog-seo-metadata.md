# Blog SEO Metadata Wiring — Tech Plan

**Epic:** MEER-3   **PRD:** docs/prds/2026-08-02-blog-seo-metadata.md   **Scope:** full-stack (growth-tools only)

## Scope note

The PRD's "Data & API surface" section also describes `astro-site` changes
(`content.config.ts` schema, `Base.astro` props, `[slug].astro` JSON-LD +
`article:*` meta). Those live in a **separate repo**, outside this pipeline,
and are built directly rather than through plan-writer/supervisor — exactly
how EP-002's Astro-side prerequisite was handled. This plan covers **only**
the growth-tools side: the `buildBlogMarkdown` wiring in `base-server` and
the featured-image picker in the blog editor UI in `webapp`.

Persistence for `featured_image_id` (AC4's data half) is **already shipped**
— `store.BlogPost.FeaturedImageID`, `CreateBlogPostParams`/`UpdateBlogPostParams`,
and `CreateBlogRequest`/`UpdateBlogRequest` all already parse and accept it
end-to-end. No new DB columns, no new endpoints. The remaining work is (1)
`buildBlogMarkdown` actually reading the already-persisted SEO fields and
resolving the featured image to a URL, and (2) the editor UI to let a user
set `featured_image_id` in the first place (today nothing in the UI ever
sends it).

## AC coverage

| AC | Description | Tickets |
|----|------|---------|
| AC1 | `buildBlogMarkdown` writes `seoTitle`/`ogTitle`/`ogDescription` when set, omits when unset | B1 |
| AC2 | Astro `content.config.ts` schema accepts the new fields | Out of scope — astro-site repo |
| AC3 | Astro `[slug].astro` / `Base.astro` prop wiring for seoTitle/ogTitle/ogDescription | Out of scope — astro-site repo |
| AC4 | Blog editor lets user mark an attached image as featured; persists via existing endpoints | F2 (UI); persistence already shipped, no ticket needed |
| AC5 | `buildBlogMarkdown` resolves `FeaturedImageID` to a public URL, writes `ogImage` | B1 |
| AC6 | Astro passes `ogImage` through to `Base`'s `image` prop | Out of scope — astro-site repo (automatic once AC5 ships) |
| AC7 | Astro emits `Article`/`BlogPosting` JSON-LD | Out of scope — astro-site repo |
| AC8 | Astro emits `article:published_time`/`article:modified_time` meta | Out of scope — astro-site repo |

Growth-tools-scoped ACs (AC1, AC4, AC5) each map to ≥1 ticket below.

## Shared contract

### Entities

No new entities, no new columns. `store.BlogPost` already has `SEOTitle *string`,
`OGTitle *string`, `OGDescription *string`, `FeaturedImageID *uuid.UUID`
(`base-server/internal/infra/store/blog_post.go:22,25-27`). `store.Media`
already has `ID uuid.UUID` and `S3Key string`
(`base-server/internal/infra/store/media.go:14-20`). `webapp`'s `BlogPost`
type already has `featuredImageId?: string`
(`webapp/src/types/blog.ts`), and `CreateBlogPostRequest`/`UpdateBlogPostRequest`
already declare `featured_image_id?: string` — the wire contract is
unchanged by this plan, only which code paths *use* it.

### Endpoints

No new endpoints, no request/response shape changes. `POST /api/protected/blog`
and `PUT /api/protected/blog/:id` already accept `featured_image_id` in the
body and persist it (`base-server/internal/blog/handler/handler.go:60,76,140-146,278-284`).
This plan wires the frontend to actually send it, and the site-publish
pipeline to actually read it.

### Errors

No new error conditions. `buildBlogMarkdown` never errors (it's a pure
`[]byte` builder) — an unresolvable `FeaturedImageID` (nil, or not present
in the loaded `media` slice) degrades to omitting `ogImage`, not a publish
failure.

### Cross-cutting design decisions (resolved here, binding on all tickets)

1. **No second store fetch for the featured image.** `GitHubProcessor.PublishBlogToSite`
   already loads `media []store.Media` for every ID in `post.MediaIDs`
   (`site_publish.go:45-52`) before calling `buildBlogMarkdown`. Because the
   frontend (F1/F2) only ever lets a user mark one of the post's **already-
   attached** media items as featured, `FeaturedImageID` is always a member
   of `MediaIDs`, so it is always already present in that same `media`
   slice — `buildBlogMarkdown`'s signature does not change
   (`buildBlogMarkdown(post store.BlogPost, media []store.Media, publicURLBase string) []byte`)
   and no new store call is added to `PublishBlogToSite`.
2. **Defensive, not enforced, invariant.** The backend does not validate
   that `featured_image_id ⊆ media_ids` on create/update (out of scope — no
   AC asks for it). If a `FeaturedImageID` ever points to media not in the
   loaded slice (stale reference, direct API call bypassing the UI),
   `buildBlogMarkdown` SHALL silently omit `ogImage` rather than error —
   consistent with how `seoTitle`/`ogTitle`/`ogDescription` are already
   schema-optional-and-omitted when unset.
3. **Featured-image picker reuses the existing attached-media list, not a
   new picker.** Per the PRD's explicit non-goal, F1/F2 add a toggle
   affordance to the *existing* `existingFiles` tiles already rendered by
   `FileUpload`/`MediaUploadSection` inside `BlogWizard`'s Media section —
   no new media-browsing component, no new route.
4. **Single-select, and only images.** `FeaturedImageID` is a single
   `*uuid.UUID` (not an array) — the toggle is a radio, not a multi-select.
   The toggle only renders on tiles whose `contentType` starts with
   `image/` (videos aren't "share images").
5. **Removing the featured attachment clears the selection.** If the user
   removes (via the existing remove-X) the media item currently marked
   featured, `BlogWizard` SHALL clear its local `featuredImageId` state to
   `undefined` in the same handler — otherwise the request would carry a
   `featured_image_id` for media no longer in `media_ids`.

---

## Notes for human confirmation

- **F1 modifies a shared design-system component** (`FileUpload`, also used
  by `create-post`'s `MediaUploadSection`). The change is additive/optional
  (new props default to `undefined`, no toggle renders without them), so
  existing consumers are unaffected — flagging this so a reviewer double-
  checks that assumption holds rather than assuming it silently.
- **No backend validation that `featured_image_id ⊆ media_ids`** (decision
  2) — this was a deliberate scope call (no AC asks for it, and the UI-only
  constraint is sufficient for a single-account personal-use tool per the
  PRD's persona). Revisit if this tool ever gets a public API surface.
- The astro-site changes (AC2, AC3, AC6, AC7, AC8) are **not tracked as
  tickets in this plan** per the task's explicit scope instruction — they
  ship directly in the astro-site repo, matching EP-002's precedent.

## Tickets

1. MEER-4 — `buildBlogMarkdown`: SEO frontmatter + featured-image resolution
2. MEER-5 — `FileUpload`: featured-image toggle affordance
3. MEER-6 — `MediaUploadSection` + `BlogWizard`: featured-image state wiring
4. MEER-7 — E2E: MSW handler + Playwright coverage for the featured-image toggle
