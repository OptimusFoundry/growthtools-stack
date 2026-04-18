# Blog Post Generation from GitHub Commits — Design

## Overview

Auto-generate long-form engineering blog posts from GitHub commits using Gemini 2.5 Flash. Each successful capture triggers a parallel Kafka pipeline that fetches the full commit diff + screenshots, calls Gemini, and saves a draft `blog_posts` row. Users review and publish manually.

---

## 1. Data Model

**One schema change only:** add `blog_post_id UUID NULL REFERENCES blog_posts(id)` to `github_commits`.

This mirrors how `post_id` tracks the social media draft linked to a commit. The worker guard checks this column before generating — if set, skip. The UI can show "blog generated" status on the commit detail page.

Migration: `V{next}__add_blog_post_id_to_github_commits.sql`

The existing `blog_posts.content TEXT` column stores the full markdown. No S3 needed.

---

## 2. Backend Pipeline

### Trigger

`CaptureResultWorker` (`workers/github_capture.go`) already publishes `github.draft.generate` on a successful capture. It will also publish `github.blog.generate` with the same `CommitID` payload. Fail-independent: a Kafka publish error is logged but does not prevent the social draft from generating.

New Kafka topic constant: `TopicBlogGenerate = "github.blog.generate"`.

### Worker

New file: `workers/github_blog.go`

`BlogGeneratorWorker` — consumes `github.blog.generate`. Identical structure to `DraftGeneratorWorker`: unmarshal event, call `BlogGenerator.GenerateBlogFromCommit(ctx, commitID)`, return nil on both success and expected no-ops (`ErrBlogGuardTripped`).

### Blog Draft Generator

New file: `github/processor/blog.go`

`BlogDraftGenerator` struct with dependencies:
- `BlogDraftStore` interface — `GetGitHubCommitForBlog`, `UpdateGitHubCommitBlogPostID`, `CreateBlogPost`
- `aiclient.Client` — Gemini client (already wired in infra)
- `S3Fetcher` — fetch screenshot bytes for multimodal input
- `GitHubDiffFetcher` interface — `GetCommitDiff(ctx, token, owner, repo, sha) (string, error)` — re-uses the existing GitHub client method

`GenerateBlogFromCommit(ctx, commitID) error` flow:
1. Load commit via `GetGitHubCommitForBlog` — includes `blog_post_id`, `capture_output`, account ID, SHA, message, branch, repo owner/name
2. Guard: if `blog_post_id` already set → return `ErrBlogGuardTripped`
3. Guard: if `capture_output` is nil or has an error → return `ErrBlogGuardTripped`
4. Fetch full commit diff from GitHub API using `ConnectionAccessToken` from the commit row — no truncation (Gemini 2.5 Flash has 1M token context)
6. Extract screenshot S3 keys from `capture_output.uploaded`, fetch up to 5 as base64 images
7. Call Gemini with system prompt + diff + screenshots (see Section 3)
8. Parse response: extract title from first `# Heading`, generate slug, extract excerpt
9. Create draft `blog_posts` row via `CreateBlogPost` (status = `"draft"`)
10. Link commit via `UpdateGitHubCommitBlogPostID`

Errors: hard failures log at ERROR and return `ErrBlogGenerationFailed`. Worker returns nil in all cases (same pattern as draft generator — AI failures don't benefit from Kafka redelivery).

### New Store Methods

All in `store/github_commit.go`:

- `GetGitHubCommitForBlog(ctx, commitID)` — returns a `GitHubCommitForBlog` struct with: ID, SHA, Message, Branch, BlogPostID, CaptureOutput, AccountID, RepoOwner, RepoName, ConnectionAccessToken. JOINs `github_repos` and `github_connections` in one query — same pattern as `GetGitHubCommitForDraft`.
- `UpdateGitHubCommitBlogPostID(ctx, commitID, blogPostID)` — mirrors `UpdateGitHubCommitPostID`

`CreateBlogPost` already exists on the store.

---

## 3. AI Generation

**Model:** `gemini-2.5-flash` via the existing `gemini.Client` (implements `aiclient.Client`).

**System prompt:**
> You are a technical engineering blog author. Write detailed, first-person blog posts about software changes. Cover what was built, why architectural decisions were made, what tradeoffs existed, and what the implementation looks like. Be specific — reference actual code, file names, and design patterns from the diff. Output raw markdown only, starting with a `# Title` heading. Use H2 sections. No preamble, no meta-commentary.

**User message:**
- Text block: commit message, repo (`owner/name`), branch, SHA, full diff (no truncation)
- Image blocks: up to 5 capture screenshots as base64-encoded inline data (MIME type from S3 content-type header)

**Post-processing the response:**
- Title: first line matching `^# ` — strip the `# ` prefix
- Slug: lowercase title, replace spaces/special chars with hyphens; on collision with existing slug for same account, append `-2`, `-3`, etc.
- Excerpt: first non-heading, non-empty paragraph, truncated to 200 chars
- Keywords: empty `StringArray{}` — user fills in
- Status: `"draft"`

---

## 4. Frontend

### Blog List Page (`routes/blog.tsx`)

Upgrade to match the posts page pattern:

- **Stats bar**: Total / Published / Drafts counts
- **Filters**: Replace `Select` with `Dropdown` component (matching posts page style — `variant="outline"`, `size="sm"`)
- **Post cards**: Replace `Card` with custom card layout — title + `Badge` (status variant), excerpt as body text, date in footer, inline delete icon button and publish icon button for drafts
- **Motion animations**: `motion.div` with stagger delay per item (`delay: index * 0.03`)
- **Delete confirmation**: `Modal` with destructive confirm button (same as posts)
- **Empty states**: two variants — no posts at all (with "New Post" CTA), and no posts matching filter (with "Clear filters" CTA)

Status badge variants: `draft → "default"`, `published → "success"`, `archived → "secondary"`

### Blog Detail Page (`routes/blog_.$id.tsx`)

- Render `content` field as markdown using `react-markdown` (add as dependency)
- Header actions: Edit (link to edit form) / Publish button / Delete button
- Show metadata: slug, excerpt, keywords, published date if published

### Dependencies

- `react-markdown` — add to `webapp/package.json`

No new routes needed — `/blog`, `/blog/:id`, `/blog/new` all exist.

---

## 5. API Endpoints

No new endpoints required. The blog CRUD API (`GET/POST/PUT/DELETE /blog`, `POST /blog/:id/publish`) is already fully implemented. The generation pipeline is entirely async via Kafka.

---

## 6. Testing

### Backend
- **Unit tests** (`github/processor/blog_test.go`): table-driven tests for `GenerateBlogFromCommit` — happy path, guard-tripped (already has blog post), guard-tripped (capture failed), AI call failure, slug collision handling. Mocked store + Gemini client + S3 + GitHub diff fetcher.
- **Worker unit tests** (`workers/github_blog_test.go`): consumer event routing, guard-tripped no-op.
- **Store tests**: `GetGitHubCommitForBlog`, `UpdateGitHubCommitBlogPostID`.

### Frontend
- **Component tests**: blog list page — empty state, filtered empty state, card render, delete flow, publish flow.
- **E2E**: generate → appear as draft → publish → status updates.
