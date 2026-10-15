# Blog SEO Metadata Wiring — PRD

**Epic:** MEER-3   **Status:** Spec'd   **Date:** 2026-08-02   **Size:** M

## Problem / why
The blog editor already captures SEO title, OG title, OG description, and (via
`FeaturedImageID`) a featured image on every post — but the site-publish
pipeline (`buildBlogMarkdown`) only ever writes `title`, `description`, `tags`,
and `readingTime` into the pushed markdown. The rest is silently dropped.
Separately, the site itself has no per-post structured data (`Article`/
`BlogPosting` JSON-LD) or `article:published_time`/`article:modified_time` OG
meta — both standard, low-cost wins for search/social. Every published post
also shares the exact same generic homepage OG share image, since there's no
UI to set a featured image and nothing downstream would use it if there were.

## Users & personas
Single account owner (personal-use tool) — publishing their own blog to
shubhanshu.dev and wanting it to perform well in search/social shares.

## Goals
- `SEOTitle`, `OGTitle`, `OGDescription` flow from a growth-tools post into
  the published markdown frontmatter, and the Astro post page actually uses
  them (distinct `<title>`/`og:title`/`og:description` from the display
  title/description), falling back to the existing title/description when
  unset.
- A featured image can be picked in the blog editor from the post's already-
  attached media (no new media-library browsing UI — just mark one of the
  images already uploaded to the post as the share image), and it resolves to
  a permanent public URL written to frontmatter as `ogImage`, giving each post
  its own social-share image instead of the generic site-wide one.
- The Astro post page emits `Article`/`BlogPosting` JSON-LD (headline,
  description, datePublished, dateModified, author, image, url).
- The Astro post page emits `article:published_time` and
  `article:modified_time` OG meta tags.

## Non-goals
- No changes to the site-wide dynamic OG image generator (`og.png.ts`) — it
  remains the fallback for posts without a featured image and for the
  homepage.
- No backfill of SEO fields on already-published posts — this only affects
  posts published/republished after the change ships.
- No general media-library picker — featured image selection is scoped to
  "pick one of this post's own attached images," not browsing all uploaded
  media account-wide.
- No author byline UI — the JSON-LD author is always the fixed site owner
  (Shubhanshu Aarsay), matching the site's existing `Person` schema.

## User stories
- As the account owner, I want to set a distinct SEO title/OG title/OG
  description on a post when the display title isn't ideal for search/social,
  so I control how it appears in results and share cards.
- As the account owner, I want to mark one of a post's attached images as its
  featured image, so it gets its own share-card image instead of my generic
  homepage OG image.
- As the account owner, I want my posts to carry proper Article structured
  data, so they're eligible for blog-post rich results in search.

## Acceptance criteria
1. AC1 — `buildBlogMarkdown` writes `seoTitle`, `ogTitle`, `ogDescription` to
   frontmatter when the corresponding post fields are set; omits them
   (schema-optional) when unset.
2. AC2 — The Astro `content.config.ts` blog schema accepts optional
   `seoTitle`, `ogTitle`, `ogDescription` fields.
3. AC3 — `[slug].astro` passes `seoTitle ?? title` as `Base`'s `title` prop
   and `ogTitle ?? title` / `ogDescription ?? description` as the OG-specific
   values (`Base.astro` needs a distinct `ogTitle`/`ogDescription` prop pair,
   separate from its existing single `title`/`description` props, to avoid
   collapsing this distinction).
4. AC4 — The blog editor lets the user mark one of the post's already-
   attached media items as the featured image; this persists as
   `featured_image_id` via the existing create/update endpoints (already
   accept it — no new endpoint needed).
5. AC5 — `buildBlogMarkdown` resolves `FeaturedImageID` (when set) to
   `{PublicURLBase}/public/media/file/{key}` and writes it as `ogImage` in
   frontmatter (schema field already exists, currently always empty).
6. AC6 — `[slug].astro` passes the post's `ogImage` through to `Base`'s
   `image` prop (already wired — this AC is satisfied automatically once
   AC5 ships and posts start carrying a real value).
7. AC7 — Each blog post page emits `Article`/`BlogPosting` JSON-LD with
   `headline` (seoTitle ?? title), `description`, `datePublished` (pubDate),
   `dateModified` (falls back to pubDate if no separate modified date is
   tracked), `author` (the existing site `Person` `@id` reference), `image`
   (ogImage, when set), and `url` (canonical post URL).
8. AC8 — Each blog post page emits `<meta property="article:published_time">`
   and `<meta property="article:modified_time">` with the post's date(s).

## Data & API surface (rough)
- No new growth-tools DB columns — `SEOTitle`, `OGTitle`, `OGDescription`,
  `FeaturedImageID` already exist on `blog_posts` and are already exposed on
  the create/update endpoints; this is a read/wire-through change in
  `buildBlogMarkdown`, not a new contract.
- `astro-site/src/content.config.ts`: add three optional string fields to the
  blog collection schema (`seoTitle`, `ogTitle`, `ogDescription`).
- `astro-site/src/layouts/Base.astro`: add optional `ogTitle`/`ogDescription`
  props (default to `title`/`description` when not passed) so callers can
  diverge OG copy from the page title/description without changing every
  other caller of `Base`.
- `astro-site/src/pages/writing/[slug].astro`: pass the new frontmatter
  fields through to `Base`, and add the `Article` JSON-LD block +
  `article:*` meta tags.

## UX notes
- Blog editor: in the existing "Media" section (where images are already
  attached to the post), each thumbnail gets a way to mark it as the featured
  image (e.g. a small "Set as featured" affordance / selected-state
  indicator) — reuses the existing attached-media list rather than adding a
  new picker component.
- No new page/route — this is entirely inside the existing blog editor and
  publish pipeline.

## Dependencies
- Existing public media route `/public/media/file/*key` +
  `STORAGE_PUBLIC_URL_BASE` config (already used for in-body images) —
  `internal/media`.
- Existing site-publish pipeline (`buildBlogMarkdown`, EP-002) — this PRD
  extends it, doesn't replace it.
- External (astro-site repo, outside this pipeline): schema, layout, and
  page changes described above, built directly rather than through
  plan-writer/supervisor, matching how the EP-002 Astro-side prerequisite was
  handled.

## Open questions & assumptions
- Assumption: "dateModified" in JSON-LD falls back to `datePublished` since
  growth-tools doesn't currently track a separate "last modified" publish
  timestamp distinct from `updated_at` (which changes on every draft edit,
  not just republish) — using `updated_at` would be misleading (it'd change
  every time a typo is fixed in an unrelated field). Revisit if this matters
  later.
- Assumption: featured-image selection is single-select (one image per post,
  not a gallery) — matches `FeaturedImageID` being a single `*uuid.UUID`, not
  an array.
