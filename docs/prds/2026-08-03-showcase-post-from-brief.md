# Showcase Post from Brief — PRD

**Epic:** EP-005   **Status:** Spec'd   **Date:** 2026-08-03   **Size:** M

## Problem / why

EP-001 (Storybook Capture → Social Post, shipped) generates a showcase post automatically, but
only when a GitHub commit touches a component file matching `component_globs`. There's no way to
produce a showcase post on demand — e.g. to promote a component that shipped a while ago, to
re-angle an existing component for a different audience, or to post about visual polish that
didn't come from a single qualifying commit. The account owner needs a way to say, in their own
words, "capture this component and write a post about X," and get a draft without waiting for or
depending on a matching commit.

## Users & personas

Account owner, self-serve — same permission level as creating any other post today. No new
permission tier.

## Goals

- Let the account owner submit a free-text brief (which component + what angle for the post) from
  the webapp.
- Resolve that brief to exactly one Storybook component via Claude, reusing the live
  `ui.protoapp.xyz` story index (same source EP-001 already reads).
- Capture that component's story screenshots and generate a draft post from the brief — reusing
  EP-001's capture (Kafka `github.capture.requests`/`results`, capture-worker) and draft-assembly
  pipeline end to end, with zero `capture-worker` code changes.
- Land the result in the existing posts-review queue as a normal draft, same as any other
  showcase post.

## Non-goals

- **No job-status UI.** Submission is fire-and-forget: a toast confirms the job started, the modal
  closes, and the draft simply appears in Posts once ready. No polling, no progress indicator, no
  push updates.
- **No multi-component briefs.** A brief must resolve to exactly one component. If Claude can't
  confidently match a single component, the request fails synchronously (4xx) with nothing queued
  — the user edits the brief and resubmits.
- **No user-facing failure surface for async failures.** If capture or draft-generation fails
  *after* the job is queued, it's recorded on the job row for debugging but not surfaced to the
  user beyond the draft never appearing. A visible failure/retry UI is a future iteration.
- **No new platform adapters or platform picker.** Drafts target the same platforms EP-001's
  drafts already do (X, BlueSky) — no per-brief platform selection.
- **No settings UI for the Storybook URL.** Same non-goal as EP-001 — `ui.protoapp.xyz` (and the
  seeded `github_repos` row it reads `storybook_url`/`component_globs` from) stays hardcoded/seeded
  for the single in-scope repo.
- **No new auto-publish path.** Every generated post is a draft awaiting manual approve/edit/
  publish, identical to every other draft in this app.

## User stories

- As the account owner, I want to type "capture the new Pagination component and write a post
  about improved keyboard navigation" and get a ready-to-review draft with real Pagination
  screenshots attached, so I can promote a component without waiting for a matching commit.
- As the account owner, I want to be told immediately if my brief doesn't match any known
  component, so I can fix the wording and resubmit instead of waiting on a job that will never
  produce anything.
- As the account owner, I want the resulting draft to show up in the same Posts list I already
  use for every other draft, so this doesn't require learning a new review workflow.

## Acceptance criteria

1. AC1 — A new "Create Showcase Post" modal (reachable from the Posts page) accepts a single
   free-text `brief` field and a Generate action.
2. AC2 — Submitting the brief calls a new endpoint that resolves the brief against the live
   `ui.protoapp.xyz` story index (via Claude) to exactly one component's story IDs. On a confident
   match, the endpoint returns `202 Accepted` immediately; the modal shows a toast and closes with
   no further status shown.
3. AC3 — On a low-confidence/no match, the endpoint returns a `4xx` synchronously (no job queued),
   and the modal surfaces an inline error so the user can revise the brief.
4. AC4 — A queued job captures screenshots for every story variant of the matched component (reuse
   of EP-001's `github.capture.requests`/`results` topics and capture-worker — no capture-worker
   code changes) and, on success, produces a draft post (`status: draft`) with those screenshots
   attached and copy generated from the brief + component name.
5. AC5 — The generated draft appears in the existing posts-review queue exactly like any other
   draft (same list, same approve/edit/publish actions), targeting the same platforms (X, BlueSky)
   EP-001's drafts already do.
6. AC6 — A job that fails after being queued (capture failure or draft-generation failure) does
   not produce a draft and does not error visibly to the user; failure detail is recorded on the
   job's backing record for later debugging.
7. AC7 — Any account owner can use this feature at the same permission level as creating any other
   post — no new permission check beyond what already gates post creation.

## Data & API surface (rough)

- **New table `showcase_jobs`:** `id` (uuid), `brief` (text), `component_name` (text), `story_ids`
  (text array), `status` (pending/capturing/drafting/done/failed), `error` (text, nullable),
  `post_id` (uuid, nullable FK to the eventual draft post), timestamps. Plays the same "parent
  record" role `github_commits` plays for EP-001's capture pipeline, but for manually-triggered
  jobs.
- **New endpoint:** `POST /api/showcase-posts { brief: string }` → `202` with the job id, or a
  `4xx` with an error message when no component matches.
- **Reused, unchanged:** `github.capture.requests`/`github.capture.results` Kafka topics and
  payload shape (the job's UUID fills the existing `sha`/commit-id field, which capture-worker
  already treats as an opaque artifact/S3-prefix key); the `storybookClient.FetchIndex` client from
  EP-001; the existing draft-assembly save path and posts-review queue.
- **New:** a `buildShowcaseDraftPrompt(brief, componentName)` prompt variant (mirrors EP-001's
  `buildComponentDraftPrompt`, seeded by the user's brief instead of a commit message); backend
  routing so the existing capture-result worker recognizes a showcase-job id (vs. a github-commit
  id) and dispatches to the showcase path instead.

## UX notes

Single modal, opened from a "Create Showcase Post" action on the Posts page: one textarea (the
brief) and Cancel/Generate buttons — no new screens, no job-status view. On submit: toast +
close (per the fire-and-forget decision). On a synchronous no-match error: inline error text in
the modal, job never queued. The eventual draft looks and behaves exactly like any other post in
the review queue.

## Dependencies

- **EP-001 (Storybook Capture → Social Post)** — reuses its `storybookClient`, Kafka capture
  pipeline, capture-worker, and draft-assembly/media-attachment path in full.
- **Posts** (existing posts-review queue, draft/approve/publish flow).
- **Content generation** (`internal/ai/socialposts`) for the brief-seeded prompt, and Claude for
  brief→component resolution.
- **Platform adapters** (X, BlueSky) — unchanged, reused as-is.
- External: the already-live `ui.protoapp.xyz` Storybook deployment (same one EP-001 reads).

## Open questions & assumptions

- **Assumption:** the capture-result worker can distinguish a `showcase_jobs` id from a
  `github_commits` id by lookup (try one store, fall through to the other) without needing a
  discriminator field on the Kafka message itself — left for `plan-writer` to pin down the exact
  routing mechanism.
- **Assumption:** Claude's brief→component resolution uses the same `index.json` story list
  EP-001's resolver fetches, matched against component names/titles rather than fuzzy story-level
  text — if the confidence signal for "no match" needs a specific threshold or prompt shape,
  `plan-writer`/the build should pin that down against real briefs.
