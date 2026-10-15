# Storybook Capture → Social Post — PRD

**Epic:** MEER-1   **Status:** Spec'd   **Date:** 2026-08-02   **Size:** M

## Problem / why

Many commits change individual UI components, not full pages. Today the GitHub → capture →
post pipeline only knows how to screenshot the live app (login via `/test-login`, navigate,
capture). That's the wrong tool for component-level changes: it requires auth, real data, and
page scaffolding just to show a button. Storybook already renders each component in isolation
with a branded background — it's a better, cheaper screenshot source for this class of commit,
and this exact idea is already speced (but unbuilt) as §3b "Storybook as a first-class posting
surface" / Phase 6c in `docs/GITHUB_AUTOPOST_PRD.md`. This PRD formalizes and scopes that section
so it can be planned and built.

The target Storybook deployment (`ui.protoapp.xyz`) already exists today (currently served from
the `tickuptoks` repo; will be repointed to `saas-template` later) — deploy infrastructure is
explicitly **not** part of this feature.

## Users & personas

Account owner (currently just the builder's own account) who has connected a GitHub repo via the
existing GitHub integration and wants component-level commits to generate ready-to-review social
post drafts automatically, without manually taking screenshots.

## Goals

- When a commit touches a component file matching a configured glob, automatically capture
  screenshots of every Storybook story variant for that component.
- Feed those screenshots + the commit summary into the existing Claude draft-generation flow to
  produce platform-adapted post copy for X and BlueSky.
- Land the result as a normal draft post in the existing posts-review queue for manual
  approve/edit/publish — no new UI surface needed beyond what already exists for github-sourced
  drafts.
- Reuse the existing GitHub webhook, Kafka capture pipeline, content generation, and platform
  adapters end to end; add only the pieces that don't exist yet (story capture path, story-ID
  mapping, showcase decorator, draft prompt variant).

## Non-goals

- **No new deploy pipeline.** `ui.protoapp.xyz` hosting/CI is out of scope; this feature only
  consumes an already-live Storybook URL.
- **No settings UI.** `storybook_url` and `component_globs` are hardcoded/seeded for the one
  repo in scope (not exposed as an editable per-account form). Multi-tenant self-serve config is
  a future iteration.
- **No video capture.** Screenshots only for v1.
- **No auto-publish.** Every generated post is a draft awaiting manual approval, identical to the
  existing github-sourced draft flow.
- **No fuzzy/AI-based component↔story matching.** Mapping relies on Storybook's standard CSF
  `category-component--variant` naming convention; if a changed component has no matching story
  in the index, it's skipped (logged, not an error) rather than guessed at.
- Does not change or replace the existing app-screenshot (`/test-login` + Playwright explore)
  path — the two capture strategies coexist; this PRD only adds the Storybook branch.

## User stories

- As the account owner, when I push a commit that changes `Button.tsx`, I want a draft social
  post generated with screenshots of every `Button` story variant, so I can review and publish it
  without manually capturing anything.
- As the account owner, I want commits that don't touch any component matching my configured
  globs to behave exactly as they do today (app screenshot or text-only), so this feature adds
  capability without changing existing behavior for other commits.
- As the account owner, I want a component with no matching Storybook story to be silently
  skipped (falling back to the existing app-screenshot/text-only path) rather than breaking the
  capture pipeline, so a naming mismatch never blocks a post from being generated.

## Acceptance criteria

1. AC1 — `github_repos` has `storybook_url` and `component_globs` (text array) columns via a new
   Flyway migration; the in-scope repo has both seeded.
2. AC2 — A push whose diff touches a path matching `component_globs` resolves each changed
   component file to zero or more Storybook story IDs using the CSF
   `category-component--variant` convention, enumerated from the deployed Storybook's story-index
   endpoint (not guessed offline).
3. AC3 — For a component with N story variants, the capture worker screenshots all N
   `{storybook_url}/iframe.html?id={storyId}&viewMode=story` pages and uploads them to the
   commit's existing S3 artifact prefix, using a new direct-navigate capture path (no login, no
   multi-step explore agent).
4. AC4 — `proto-design-system/storybook/showcaseDecorator.tsx` exists, is wired into
   `.storybook/preview.js`, and every captured screenshot shows the branded
   background/padding/copyright treatment rather than a bare component render.
5. AC5 — A commit that maps to at least one story produces a draft post (`status: draft`,
   `source: github_event`, linked `github_event_id`) with content generated by Claude referencing
   the component name and commit summary, and with the story screenshots attached as media —
   using the same `CaptureResultMessage` → draft-assembly path as app-screenshot commits, so it
   appears in the existing posts-review queue unchanged.
6. AC6 — A commit that touches `component_globs` but whose component has no resolvable story ID
   does not error the capture pipeline; it falls through to the existing app-screenshot/text-only
   behavior for that commit.
7. AC7 — A commit that does not touch `component_globs` at all behaves exactly as before this
   feature (no regression to the existing app-screenshot capture path).
8. AC8 — Draft posts from this path publish successfully to X and BlueSky through the existing,
   unmodified adapters (both already support multi-image attachment).

## Data & API surface (rough)

- **Migration:** `github_repos` gains `storybook_url TEXT NULL` and
  `component_globs TEXT[] NULL`.
- **`CaptureRequest`** (Kafka payload, `github.capture.requests`): add `StoryIDs []string`
  alongside the existing `AppURL` field — when non-empty, capture-worker takes the direct-navigate
  Storybook path instead of the login+explore agent path.
- **capture-worker:** new function (name TBD by plan-writer) — `storybookID → page.goto(iframe
  URL) → screenshot() → S3 upload`, returning the same `CaptureUpload[]` shape `runCapture`
  already produces, so `CaptureResultMessage` and everything downstream is unchanged.
- **`github/processor`:** new component-file → story-ID resolution step in `handlePush` (calls the
  deployed Storybook's story-index endpoint), and a new `buildDraftPrompt` variant in
  `draft_assembly.go` for component-sourced commits (vs. the existing commit-based prompt).
- **Design system:** `webapp/src/proto-design-system/storybook/showcaseDecorator.tsx` +
  `.storybook/preview.js` wiring.

No new HTTP endpoints, no new DB tables (one migration adding two columns to `github_repos`), no
changes to the posts/platform/publishing layers.

## UX notes

No new screens. Drafts generated by this path appear in the existing posts-review queue exactly
like any other github-sourced draft (same list, same approve/edit/publish actions). The only
visible difference to the user is the media attached (branded Storybook screenshots) and the copy
(component-focused rather than page-focused).

## Dependencies

- **GitHub integration** (Epic 5) — webhook receipt, event/commit storage, existing `push` /
  `workflow_run` handling in `github/processor/webhook.go`.
- **Kafka capture pipeline** (`github.capture.requests` / `github.capture.results`) and
  `capture-worker/` (Node/Playwright service).
- **Content generation** (`internal/ai/socialposts`, `github/processor/draft_assembly.go`) for
  Claude-drafted copy.
- **Posts + platform publishing** (Epic 3, `posts/`, `platform/adapters/`) — X and BlueSky
  adapters, both already support image attachments; no changes needed.
- **Proto Design System / Storybook** (`webapp/.storybook/`, `webapp/src/proto-design-system/`).
- External: the already-live `ui.protoapp.xyz` Storybook deployment (currently serving from the
  `tickuptoks` repo; will be repointed to `saas-template` later — out of scope here either way,
  this feature just reads whatever `storybook_url` is configured).

## Open questions & assumptions

- **Assumption:** `ui.protoapp.xyz`'s Storybook build exposes the standard Storybook story-index
  endpoint (`index.json`/`stories.json`) needed for AC2's enumeration — not yet verified against
  the live deployment; plan-writer/build should confirm against the real URL early.
- **Assumption:** the in-scope repo for this v1 (hardcoded config, no settings UI) is whichever
  repo is already connected via the existing GitHub integration and eventually serves
  `ui.protoapp.xyz` — the user will point `storybook_url` at the current `tickuptoks`-served URL
  for now and repoint later; no code change needed when that switch happens since it's just the
  seeded column value.
- **Open:** exact `component_globs` default pattern (e.g. `webapp/src/proto-design-system/**/*.tsx`
  excluding `*.stories.tsx`) — left for plan-writer to pin down against the real directory
  structure.
