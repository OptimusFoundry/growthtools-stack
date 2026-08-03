# Blog SEO Metadata Wiring — Tech Plan

**Epic:** EP-003   **PRD:** docs/prds/2026-08-02-blog-seo-metadata.md   **Scope:** full-stack (growth-tools only)

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

## Tickets

| Ticket | Epic | Layer | Depends-on | AC refs | Status |
|--------|------|-------|-----------|---------|--------|
| B1 | EP-003 | api | —  | AC1,AC5 | Todo |
| F1 | EP-003 | fe  | —  | AC4 | Todo |
| F2 | EP-003 | fe  | F1 | AC4 | Todo |
| F3 | EP-003 | fe  | F2 | AC4 | Todo |

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

## B1 — `buildBlogMarkdown`: SEO frontmatter + featured-image resolution

**Files:** `base-server/internal/github/processor/site_publish.go` (edit
`buildBlogMarkdown`), `base-server/internal/github/processor/site_publish_test.go`
(extend `TestBuildBlogMarkdown`)

**Placement:** Inside `buildBlogMarkdown` (`site_publish.go:98-136`):
- Insert the three new conditional frontmatter writes (`seoTitle`, `ogTitle`,
  `ogDescription`) immediately after the existing `description` line
  (`fmt.Fprintf(&b, "description: %q\n", description)`, line 129) and
  before the `tags` line.
- Insert the conditional `ogImage` write immediately after the `tags` line
  (line 130) and before the `readingTime` line — reusing the same
  `%s/public/media/file/%s` URL shape already built for in-body media
  rewriting at line 121 (`fmt.Sprintf("%s/public/media/file/%s", publicURLBase, m.S3Key)`).

**Signature:** unchanged — `buildBlogMarkdown(post store.BlogPost, media []store.Media, publicURLBase string) []byte`.

**Behavior (extends the function's existing behavior, doesn't replace it):**
- WHEN `post.SEOTitle` is non-nil SHALL write `seoTitle: %q` with its
  dereferenced value; WHEN nil SHALL omit the line entirely (not an empty
  string — the frontmatter key itself must not appear).
- WHEN `post.OGTitle` is non-nil SHALL write `ogTitle: %q`; WHEN nil SHALL
  omit the line.
- WHEN `post.OGDescription` is non-nil SHALL write `ogDescription: %q`;
  WHEN nil SHALL omit the line.
- WHEN `post.FeaturedImageID` is non-nil AND some `m` in `media` has
  `m.ID == *post.FeaturedImageID` SHALL write `ogImage: %q` with value
  `fmt.Sprintf("%s/public/media/file/%s", publicURLBase, m.S3Key)`.
- WHEN `post.FeaturedImageID` is nil, OR non-nil but no `m` in `media` has a
  matching `ID`, SHALL omit the `ogImage` line — never an error, never an
  empty-string line.

**Test additions to `TestBuildBlogMarkdown`** (table-driven, same shape as
the existing cases in `site_publish_test.go:344-443`):
- `SEOTitle`/`OGTitle`/`OGDescription` all set → all three lines present
  with correct quoted values.
- all three nil (today's default zero-value post) → none of the three keys
  appear anywhere in the output (`assert.NotContains`).
- `FeaturedImageID` set, matching `store.Media` present in `media` →
  `ogImage: "<publicURLBase>/public/media/file/<s3Key>"` present.
- `FeaturedImageID` set, but no matching `store.Media` in `media` (stale
  reference) → no `ogImage` key in the output, no panic.
- `FeaturedImageID` nil → no `ogImage` key in the output.

**Rules:** backend-architecture-rules:A-4, backend-testing-rules:TS-1, backend-testing-rules:TS-2

---

## F1 — `FileUpload`: featured-image toggle affordance

**Files:** `webapp/src/proto-design-system/components/composite/FileUpload/FileUpload.tsx`
(edit), `webapp/src/proto-design-system/components/composite/FileUpload/FileUpload.module.scss`
(edit — new classes)

**Placement:** `FileUploadProps` (`FileUpload.tsx:45-71`) — add two new
**optional** props next to the existing `onRemoveExisting`. Render logic —
inside the `existingFiles.map(...)` loop (`FileUpload.tsx:270-311`), extend
the per-tile block (`existingTile` → `existingThumb`) that already renders
the remove-X button, adding a sibling toggle button gated on
`isImage && onSetFeatured`. Because both new props are optional and the
toggle only renders when `onSetFeatured` is passed, no other `FileUpload`
consumer (e.g. `create-post`'s `MediaUploadSection` usage) is affected —
this is additive, not a behavior change to the shared component's default
shape.

**Contract (props added to `FileUploadProps`):**
```
featuredId?: string;                    // id of the existing file currently marked featured
onSetFeatured?: (id: string) => void;   // called with the clicked tile's id (toggle semantics owned by the caller)
```

**Behavior:**
- WHEN `onSetFeatured` is provided AND a tile's `existing.contentType`
  starts with `image/` SHALL render a toggle button in that tile (alongside
  the existing remove-X), calling `onSetFeatured(existing.id)` on click.
- WHEN `onSetFeatured` is provided AND a tile's `existing.contentType` does
  NOT start with `image/` (e.g. video) SHALL NOT render the toggle.
- WHEN `onSetFeatured` is undefined SHALL render no toggle on any tile —
  today's shape, unchanged (back-compat for other `FileUpload` consumers).
- WHEN `existing.id === featuredId` the tile SHALL carry a distinct
  "featured" visual state (new `existingTileFeatured` class) and the toggle
  button's accessible name SHALL read `"{existing.name} is the featured
  image"`; otherwise the accessible name SHALL read `"Set {existing.name}
  as featured image"` — the file name discriminates the name across
  multiple tiles (mirrors the existing `Remove ${existing.name}` pattern on
  the same tile, `FileUpload.tsx:303`).
- Toggle semantics (unset) are the caller's responsibility: `FileUpload`
  itself is stateless here — it always calls `onSetFeatured(existing.id)`
  on click, even for the currently-featured tile. F2 turns a click on the
  already-featured tile into "unset" by comparing ids in `BlogWizard`.

**Rules:** frontend-style-rules:I-1, frontend-a11y-rules:A-4

---

## F2 — `MediaUploadSection` + `BlogWizard`: featured-image state wiring

**Files:** `webapp/src/components/create-post/compose/MediaUploadSection.tsx`
(edit — pass-through props), `webapp/src/components/blog/BlogWizard.tsx`
(edit — state + `buildRequest`)
**Depends-on:** F1

**Placement:** `MediaUploadSectionProps` (`MediaUploadSection.tsx:9-14`) —
add `featuredImageId`/`onSetFeatured` next to `existingMedia`/
`onRemoveExisting`; pass through to the existing `<FileUpload>` call
(`MediaUploadSection.tsx:27-38`) as `featuredId`/`onSetFeatured`. In
`BlogWizard.tsx` — new `useState` next to the existing `existingMedia`
state (`BlogWizard.tsx:93-95`); the inline `onRemoveExisting` arrow
currently passed to `<MediaUploadSection>` (`BlogWizard.tsx:462-464`)
becomes a named `useCallback` handler so it can also clear
`featuredImageId`; wiring into the `<MediaUploadSection>` call
(`BlogWizard.tsx:458-465`) and into `buildRequest()` (`BlogWizard.tsx:189-223`).

**Contract:**
```
// MediaUploadSectionProps additions
featuredImageId?: string;
onSetFeatured?: (id: string) => void;

// BlogWizard.tsx additions
featuredImageId: string | undefined   // new component state; initial value = initialBlogPost?.featuredImageId
handleRemoveMedia(id: string): void   // replaces the inline onRemoveExisting arrow currently passed to MediaUploadSection
handleSetFeatured(id: string): void
```

**Behavior:**
- `handleRemoveMedia(id)` SHALL filter `id` out of `existingMedia` (today's
  behavior, unchanged) AND, WHEN `id === featuredImageId`, SHALL also clear
  `featuredImageId` to `undefined` — decision 5 above.
- `handleSetFeatured(id)` SHALL set `featuredImageId` to `undefined` WHEN
  `id === featuredImageId` (toggle-off, clicking the already-featured
  tile), otherwise SHALL set `featuredImageId` to `id`.
- `<MediaUploadSection>` SHALL receive `featuredImageId={featuredImageId}`
  and `onSetFeatured={handleSetFeatured}` in addition to its existing props.
- `buildRequest()` SHALL include `featured_image_id: featuredImageId ||
  undefined` in its returned object (same `|| undefined` convention already
  used for `excerpt`/`seo_title`/etc. in the same function), and
  `featuredImageId` SHALL be added to its `useCallback` dependency array.
- No change to the SSE-generate `useEffect` (`BlogWizard.tsx:124-135`) —
  `featuredImageId` is never part of the generated-post payload, matching
  how `existingMedia`/media metadata already isn't round-tripped there.

**Rules:** frontend-composition-rules

---

## F3 — E2E: MSW handler + Playwright coverage for the featured-image toggle

**Files:** `webapp/e2e/handlers/blog.handlers.ts` (extend — `featured_image_id`
in create/update scenario bodies), `webapp/e2e/blog.spec.ts` (extend)
**Depends-on:** F2

**Endpoint × handler table:**
| Endpoint | Handler change |
|---|---|
| `POST /api/protected/blog` | request-body assertion scenario: `featured_image_id` present when a toggle was clicked, absent when it wasn't |
| `PUT /api/protected/blog/:id` | same — request-body assertion scenario for `featured_image_id` |

**Playwright coverage (table headings only, per `frontend-e2e-rules` —
golden path + every interaction this ticket introduces):**
- `blog.spec.ts`, editor with ≥2 attached images: clicking a tile's "Set as
  featured" toggle marks that tile featured (accessible name flips to "is
  the featured image") and un-marks any previously-featured tile (single-
  select).
- Clicking the already-featured tile's toggle un-marks it (toggle-off).
- Removing the currently-featured attachment (existing remove-X) clears the
  featured state — no tile shows as featured afterward.
- Save draft / Publish with a featured image selected → outgoing request
  body includes `featured_image_id` matching the selected tile's id.
- Save draft / Publish with no featured image selected → outgoing request
  body's `featured_image_id` is `undefined`/absent (regression check — this
  is the "nothing sends it today" gap this plan closes).
- Editing an existing post whose `featuredImageId` is already set → that
  tile renders as featured on load (state hydrates from `initialBlogPost`).
- Non-image attachments (e.g. video, if present in fixtures) never render
  the toggle.

**Selector contract** (house convention is role/label-based, not
`data-testid`, per `webapp/docs/TESTING-PATTERNS.md`):
- Featured toggle (unfeatured tile): `getByRole('button', { name: \`Set ${fileName} as featured image\` })`
- Featured toggle (featured tile): `getByRole('button', { name: \`${fileName} is the featured image\` })`
- Existing remove button (unchanged): `getByRole('button', { name: \`Remove ${fileName}\` })`

**Rules:** frontend-e2e-rules

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
