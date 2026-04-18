# Blog Wizard: Media, SEO Extraction, and Source Instruction

**Date:** 2026-04-18  
**Status:** Approved

## Problem

The blog wizard is missing three things that exist in the post wizard or are expected from the generation pipeline:

1. **Media** — `blog_posts.featured_image_id` exists but is never set; the wizard has no media section. Capture screenshots that inspired the blog are invisible to the user.
2. **SEO fields** — `seo_title`, `meta_description`, `keywords`, `og_title`, `og_description` are all NULL in production because the AI prompt never asks for them.
3. **Source instruction** — the user's original prompt (or the commit message for auto-generated posts) is discarded. When editing, the instruction textarea shows the post title instead.

## Approach

Mirror the posts feature for all three gaps:

- `media_ids uuid[]` array on `blog_posts` (same as `posts.media_ids`) — no join table
- JSON AI response instead of raw markdown — single call returns content + all SEO fields
- `source_instruction text NULL` on `blog_posts` (same as `posts.base_content`)

---

## Section 1 — Database Migration

```sql
ALTER TABLE blog_posts
  ADD COLUMN source_instruction text NULL,
  ADD COLUMN media_ids uuid[] NOT NULL DEFAULT '{}';
```

`source_instruction` — the original prompt from the user (manual wizard) or the commit message (auto-generator). Nullable because existing rows have no instruction.

`media_ids` — array of FK references to `media.id`. The generator populates this with Media records created from capture screenshots. The wizard lets users add/remove images. No join table; matches the `posts` pattern.

---

## Section 2 — Backend Store & API

### Store structs

`BlogPost`, `CreateBlogPostParams`, and `UpdateBlogPostParams` all gain:

```go
SourceInstruction *string
MediaIDs          store.UUIDArray
```

All SQL for create, update, get, and list is updated to read/write these columns. List query already has a LEFT JOIN structure; `media_ids` is a simple column select, no join needed.

### HTTP API

- `POST /blog` and `PATCH /blog/:id` accept `source_instruction` and `media_ids` in the request body.
- `GET /blog/:id` and the list endpoint return `source_instruction` and `media_ids`.
- `POST /blog/generate` (wizard generate endpoint) expands its response from `{ title, content, slug }` to `{ title, content, slug, excerpt, keywords, seo_title, meta_description, og_title, og_description }`.

### Commit-triggered generator (`blog.go`)

After creating the blog post the generator:

1. Sets `source_instruction` = commit message text.
2. Iterates the capture screenshot S3 keys (already fetched for AI context).
3. Creates a `Media` record for each key via `store.CreateMedia`.
4. Collects the returned IDs and writes them to `blog_posts.media_ids` via an update call.

If media creation fails for any individual screenshot the generator logs the error and continues — a missing featured image is not fatal.

---

## Section 3 — AI Prompt & SEO Extraction

Both the commit generator and the wizard's generate endpoint use the same new system prompt:

```
You are a technical engineering blog author. Output a single JSON object with these exact keys:
- "title": string — blog post title
- "content": string — full post in Markdown (H2 sections, no preamble)
- "excerpt": string — 1–2 sentence summary, max 200 chars
- "seo_title": string — optimised title for search (under 60 chars)
- "meta_description": string — search snippet (under 160 chars)
- "og_title": string — Open Graph title
- "og_description": string — Open Graph description (under 200 chars)
- "keywords": array of strings — 5–8 SEO keywords

Write detailed, first-person posts covering what was built, why, tradeoffs, and implementation details. Reference actual code, file names, and design patterns from the diff.
```

`parseBlogResponse` is replaced by `json.Unmarshal` into a struct. If the AI returns malformed JSON, or `title` or `content` are empty, the generator returns `ErrBlogGenerationFailed`. All other fields are optional — an empty string is acceptable for SEO fields.

---

## Section 4 — Frontend BlogWizard

### Instruction initialisation

```ts
const [instruction, setInstruction] = useState(
  initialBlogPost?.sourceInstruction ?? ""
);
```

No longer falls back to `initialBlogPost?.title`.

### After Generate

`handleRegenerate` sets all SEO fields returned by the generate endpoint:

```ts
setExcerpt(result.excerpt ?? "");
setKeywords(result.keywords?.join(", ") ?? "");
setSeoTitle(result.seoTitle ?? "");
setMetaDescription(result.metaDescription ?? "");
setOgTitle(result.ogTitle ?? "");
setOgDescription(result.ogDescription ?? "");
```

### Media section

`MediaUploadSection` is added between the instruction block and the Details block — same position as in the post wizard.

- `existingMedia` initialised from `initialBlogPost?.mediaIds` (fetched with presigned URLs via the media API).
- `pendingFiles` managed locally; uploaded to S3 on save before the create/update call.
- Users can remove existing media or add new files (image/video, max 10, max 50 MB each).

### buildRequest

```ts
buildRequest = () => ({
  ...existingFields,
  source_instruction: instruction || undefined,
  media_ids: [...existingMediaIds, ...newlyUploadedIds],
});
```

### useGenerateBlog return type

Expanded from `{ title, content, slug }` to:

```ts
{
  title: string;
  content: string;
  slug: string;
  excerpt?: string;
  keywords?: string[];
  seoTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
}
```

---

## Files Touched

| Layer | File |
|-------|------|
| Migration | `base-server/migrations/V005X__blog_posts_media_instruction.sql` |
| Store | `base-server/internal/infra/store/blog_post.go` |
| Generator | `base-server/internal/github/processor/blog.go` |
| Blog handler | `base-server/internal/blog/handler/` |
| Blog processor | `base-server/internal/blog/processor/` |
| Frontend types | `webapp/src/types/blog.ts` |
| Frontend hook | `webapp/src/hooks/useGenerateBlog.ts` |
| Frontend wizard | `webapp/src/components/blog/BlogWizard.tsx` |
| Frontend SCSS | `webapp/src/components/blog/blog-wizard.module.scss` |

---

## Out of Scope

- Inline image embedding in markdown content (images are attached as metadata, not auto-inserted into the content body)
- Featured image selection UI (first media item is implicitly the featured image; no explicit "set as featured" control)
- SEO fields for the post (social post) feature — posts have no SEO requirements
