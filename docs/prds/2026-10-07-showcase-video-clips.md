# Showcase Video Clips — PRD

**Epic:** EP-006   **Status:** Spec'd   **Date:** 2026-10-07   **Size:** M

## Problem / why

EP-001 turns component commits into draft posts, but only as still screenshots (1200×675), and it
deliberately left video out of v1. The UI posts that actually perform on X — and the ones the
builder saves as inspiration — are short motion clips: a progressive blur building up, a border
beam circling an input, a tooltip morphing between columns. Stills can't show motion, so today
every motion-heavy component either goes unposted or needs a hand-made screen recording, which the
builder doesn't do.

A prototype recorder (copied to `docs/prds/reference/2026-10-07-showcase-record-prototype.mjs`) proved the approach on four
components (ProgressiveBlur, BorderBeam, ThinkingOrb, MorphingTooltip in saas-template PRs #32/#33):
frame-exact 2× rendering produces feed-ready MP4s the builder approved, and it renders in 21–26 s
per clip on 2 vCPU arm64 Linux with no GPU — so it fits the existing capture-worker host. This epic
moves that into the pipeline so a merged component becomes a reviewed video draft with no manual
steps.

## Users & personas

Account owner (the builder) with the saas-template repo connected via the GitHub integration and
`storybook_url` / `component_globs` already configured by EP-001.

## Goals

- A component commit whose story file declares a **Showcase** recording target produces an MP4
  clip, in addition to (not instead of) EP-001's stills.
- Clips meet the approved quality bar: 30 fps, rendered at 2× and downsampled, no dropped frames,
  sized and themed per story (never the default beige `paper` theme).
- Every clip passes an automated quality review before it reaches the draft; failures are visible
  on the draft with reasons, never silently dropped or silently posted.
- The draft's caption is written for a motion clip and credits the inspiration source when the
  story declares one.
- Runs on the existing capture-worker ECS service and host — no new infrastructure.

## Non-goals

- **No auto-building components.** Choosing what to build from saved X likes, and writing the
  component + stories, is a separate future epic (the "weekly picker"). This epic starts at a
  merged commit that already contains a Showcase story.
- **No auto-fix loop in growth-tools.** When review fails, growth-tools flags it; fixing the story
  and re-recording happens in the component repo (by a developer or Claude Code), and the next
  commit re-triggers capture.
- **No auto-publish.** Clips land on drafts in the existing review queue, like every other
  github-sourced draft.
- **No audio, voiceover, music, or in-app video editing/trimming.**
- **No app-page recordings.** The existing explore agent's app videos (`agent.ts`/`video.ts`) are
  untouched; this covers Storybook Showcase stories only.
- **No new deploy pipeline or GPU instances.** Rendering is CPU-only on the current host.
- **No new settings UI.** Recording behaviour is declared in the story file, not configured in
  growth-tools.

## User stories

- As the account owner, when I merge a component whose stories include a Showcase story, I want a
  draft post with a crisp, smooth MP4 of that Showcase, so I can publish a motion clip without
  recording anything myself.
- As the account owner, I want each Showcase to declare its own size, length and theme in the
  story file, so a data table records landscape on `monochrome` and a glow effect records 4:5 on
  `dark` without anyone passing flags.
- As the account owner, I want a clip that fails the quality review to show on its draft with the
  failed checks listed, so I fix the story instead of discovering a bad clip after posting.
- As the account owner, I want the caption to credit the post that inspired the component, so
  rebuilds read as homage, not copying.
- As the account owner, I want commits with no Showcase story to behave exactly as today (EP-001
  stills or text-only), so this adds capability without changing existing behaviour.

## Acceptance criteria

1. AC1 — A story is a recording target when its parameters include `recording` (convention:
   the story is named `Showcase`). `parameters.recording` supports `width`, `height` (default
   1080×1350), `seconds` (default 8, max 20), `theme` (Storybook theme global; required — a
   missing theme fails review rather than falling back to `paper`), and optional `credit`
   (`{ handle, url }` of the inspiring post).
2. AC2 — For each changed component with a recording target, capture-worker renders an MP4 by
   stepping a frozen page clock 1/30 s per frame (timers, rAF and `performance.now` via
   Playwright's clock; CSS animations/transitions pinned via the Web Animations API), taking a
   2× screenshot per frame, and encoding H.264 yuv420p downsampled with Lanczos to the declared
   size. Output frame count equals `seconds × 30` exactly.
3. AC3 — The recording uses the story's declared theme via Storybook globals and waits for fonts
   before the first frame.
4. AC4 — A 7-check quality review runs on every clip and its result (pass/fail + per-check
   reasons) is stored with the capture:
   (a) fills the frame — content bounding box covers ≥ 55% of the frame area;
   (b) motion present — consecutive-frame difference is non-zero across the clip (not a still);
   (c) smooth — exact frame count, no duplicate-frame runs longer than 0.5 s outside intentional
   holds declared by the story;
   (d) sharp — rendered at 2× (no CSS-scaled canvases; checked on a full-resolution crop);
   (e) contrast — components distinguishable from the background;
   (f) no layout shift — elements don't resize as labels change;
   (g) cause before effect — scripted cursor arrives before the UI reacts.
   (a)–(c) are deterministic checks; (d)–(g) are judged by a vision model on a contact sheet plus
   a full-resolution crop.
5. AC5 — Passing clips are uploaded to the commit's existing S3 artifact prefix and attached to the
   draft as media (alongside EP-001 stills); the draft prefers the clip as its primary media.
   Failing clips are still attached, and the draft shows a "clip needs attention" state listing
   the failed checks.
6. AC6 — Caption generation receives the component name, the commit summary, and `credit` when
   present; the caption is written for a motion clip and includes "inspired by @handle" when
   credit exists.
7. AC7 — Video renders run one at a time per worker (a queued render does not block EP-001
   still captures), and the capture-worker task's CPU reservation is raised to cover rendering
   (≈2 vCPU) so ECS schedules for it.
8. AC8 — A commit with no recording target produces exactly the EP-001 behaviour (regression
   check).
9. AC9 — Rendering a default 8 s 1080×1350 clip completes in under 90 s on the production host.

## Data & API surface (rough)

- Capture results gain a clip record: S3 key, width/height/seconds/fps, theme, render duration,
  review verdict + per-check reasons, optional credit. Whether this extends existing capture
  media rows or adds a sibling table is plan-writer's call.
- `posts` needs a way to mark a clip as primary media and to surface "needs attention" — likely
  extending the existing `capture_media_ids` handling from growthtools-stack#79.
- No new public endpoints required; the existing draft/regenerate endpoints carry the new media.
- Story parameters are read from the deployed Storybook (index.json plus the story's
  parameters at render time), not from the git diff.

## UX notes

- Draft editor: the clip plays inline as the primary media; stills remain selectable in the
  existing media picker.
- "Clip needs attention" uses the existing draft warning pattern, listing failed checks in plain
  words (e.g. "Components blend into the background").
- No new pages.

## Dependencies

- **EP-001** Storybook capture path: `capture-worker/storybook.ts` (`runStorybookCapture`),
  story-ID resolution, `storybook_url` / `component_globs`.
- **Kafka** capture request/result topics (`capture-worker/kafka.ts`).
- **S3** commit artifact helpers (`commitS3Prefix`, `uploadTree` in `capture-worker/capture.ts`).
- **Draft generation** (existing Claude flow) for the caption.
- **ffmpeg** in the capture-worker image (H.264 encode).
- **Prototype to port:** [`docs/prds/reference/2026-10-07-showcase-record-prototype.mjs`](reference/2026-10-07-showcase-record-prototype.mjs) — the recorder that produced the approved clips.
- Component repo convention: Showcase stories with `parameters.recording` in saas-template.

## Open questions & assumptions

- **Platform limits.** Assumed clips stay ≤ 20 s and well under X's and Bluesky's video limits;
  plan-writer should confirm current Bluesky video length/size limits before choosing defaults.
- **Vision model for review.** Assumed the existing AI client (Gemini or Claude) can take a contact
  sheet + crop and return structured per-check verdicts; model choice is plan-writer's.
- **Retina-only issues.** Assumed recording at deviceScaleFactor 2 on Linux matches local 2×
  rendering (verified on two clips in an arm64 container).
- **Burstable CPU.** The host is a t4g.2xlarge (burstable). Assumed a few clips per week stay
  within credits; if volume grows, revisit (e.g. a per-render Fargate task).
- **Determinism.** A theme switch on load can remount a story, shifting where a cycling demo starts
  (seen in testing). Assumed acceptable; stories needing an exact start can reset on mount.
- **Future epics (not this one):** weekly picker that builds components from saved X likes;
  ingesting X likes into growth-tools; AI-answer visibility monitor (prototype in
  `seo-agent/geo/`).
