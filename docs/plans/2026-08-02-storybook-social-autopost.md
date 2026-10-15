# Storybook Capture → Social Post — Tech Plan

**Epic:** MEER-1   **PRD:** docs/prds/2026-08-02-storybook-social-autopost.md   **Scope:** cross-service (backend + capture-worker Node service + frontend design system)

## Routing note (read before dispatching)

This feature spans **three independently-executed domains** — no single supervisor covers all of
it. Dispatch each `Layer` group separately (a `feature-manager`/single-supervisor run will only
pick up the domain(s) it knows):

| Layer value | Tickets | Executor |
|---|---|---|
| `backend` | B1–B4 | `backend-supervisor` |
| `capture-worker-node` | N1 | `node-service-code-editor`, dispatched **individually** — `capture-worker/` is a standalone Node/TS service outside `base-server/`+`webapp/`, so neither `backend-supervisor` nor `frontend-supervisor` will touch it. No tests-first pipeline exists for this domain in this repo; dispatch the edit, then run `cd capture-worker && npm run build` (or the repo's equivalent typecheck) yourself before considering it done. |
| `frontend-design-system` | F1 | `frontend-supervisor` (or `frontend-component-builder` directly — F1 is a single design-system component file, not a page/route, so the page-oriented parts of the frontend pipeline don't apply) |

B1–B3 must land before N1 is meaningfully testable end-to-end (N1 depends on B3's `CaptureRequest`
field contract), and N1 must land before B4 is meaningfully testable (B4 depends on N1's S3 key
naming convention). F1 has no code dependency on the others and can be built in parallel with
everything.

## Shared contract

### Entities

`github_repos` (existing table) gains two nullable columns — no new tables, matching the PRD's
explicit scope ("no new DB tables ... one migration adding two columns to `github_repos`"):
- `storybook_url TEXT NULL`
- `component_globs TEXT[] NULL` (Go: `store.StringArray`, already used elsewhere for `TEXT[]` —
  see `platform_connection.go`, `post.go`)

No new `github_commits` columns. Storybook-sourced-ness and the captured component name(s) are
derived at draft-generation time from `capture_output.uploaded[].key` naming (see B4) rather than
persisted separately — keeps the migration scoped to exactly what the PRD specifies.

### Kafka payload additions (base-server ↔ capture-worker, topic `github.capture.requests`)

`CaptureRequest` (Go, `base-server/internal/github/processor/webhook.go`) gains three `omitempty`
fields, mirrored in capture-worker's `CaptureRequestMessage` (`capture-worker/kafka.ts`) with
**exact** JSON key names:

| Go field | JSON tag | TS field (kafka.ts) | Type | Meaning |
|---|---|---|---|---|
| `StoryIDs` | `story_ids` | `story_ids?` | `string[]` | Non-empty ⇒ capture-worker takes the direct-navigate Storybook path instead of login+explore |
| `StorybookURL` | `storybook_url` | `storybook_url?` | `string` | Base URL for `{storybook_url}/iframe.html?id=...` |
| `StoryComponents` | `story_components` | `story_components?` | `Record<string, string>` | storyID → component name (e.g. `"primitives-button--default": "Button"`), used only to name the uploaded screenshot files |

No changes to `github.capture.results` / `CaptureResultMessage` — Storybook screenshots reuse the
existing `uploaded: [{key, url}]` shape and existing S3 prefix (`commitS3Prefix(commit)`), so
everything downstream (`CaptureResultWorker`, `bucketArtifacts`, media ingestion, platform
adapters) is unchanged, per the PRD's "reuse the existing pipeline" goal.

### Story-ID resolution algorithm (AC2, pinned — not left to the executor)

1. Parse the push diff's `diff --git a/<path> b/<path>` headers (same header format
   `diffTouchesFrontend` already parses) into a deduplicated list of changed `b/` paths.
2. Keep only paths that (a) match at least one glob in `repo.ComponentGlobs` (doublestar `**`
   semantics — stdlib `path.Match`/`filepath.Match` do **not** cross `/` on `*`, so a new dependency
   is required, see B3) and (b) do **not** end in `.stories.tsx`/`.stories.ts`/`.stories.jsx`.
3. If step 2 yields nothing, or `repo.StorybookURL`/`repo.ComponentGlobs` is unset, or no
   Storybook client is wired — stop, return nothing. This is the AC6/AC7 fallback path; the caller
   proceeds with the existing app-screenshot `CaptureRequest` fields untouched.
4. Fetch `{storybook_url}/index.json` once per push (Storybook's standard story-index endpoint,
   confirmed against this repo's own `webapp/package.json` Storybook version `^10.5.4` — the
   `index.json` shape has been stable since Storybook 7; **residual risk:** the live
   `ui.protoapp.xyz` deployment currently serves from the separate `tickuptoks` repo per the PRD,
   whose Storybook version is unverified — if it predates v7 the fetch 404s, which is a no-op per
   step 3, not a crash. Worth a manual `curl {storybook_url}/index.json` check before B2/B3 land).
5. Response shape: `{ entries: { [id: string]: { id, title, name, importPath, type } } }`. For each
   changed component path from step 2, compute the candidate story import path by stripping a
   leading `webapp/` and swapping the file extension for `.stories.tsx` (also try `.stories.ts` /
   `.stories.jsx`). Collect every entry where `type == "story"` (excludes `"docs"` entries) and
   `importPath` (leading `./` stripped) equals a candidate. This is CSF-index-driven matching, not
   offline ID guessing — satisfies the PRD's explicit non-goal ("if a changed component has no
   matching story in the index, it's skipped ... rather than guessed at").
6. Return the deduplicated, sorted `id` list plus an `id → componentName` map (componentName = the
   changed file's basename without extension, e.g. `Button.tsx` → `"Button"`).

### `component_globs` default (seeded, AC1)

`{webapp/src/proto-design-system/components/**/*.tsx}` — verified against the real tree:
`webapp/src/proto-design-system/components/{primitives,composite,data,feedback,forms,layout,navigation,overlays}/<Component>/<Component>.tsx` with a sibling `<Component>.stories.tsx` in every
directory checked (e.g. `components/navigation/Pagination/`). The `.stories.tsx` exclusion is
enforced in Go code (step 2 above), not by the glob itself.

### Errors

All new logic is internal/background (no new HTTP endpoints — confirmed no route/handler changes
anywhere in this plan). No `apierrors` mapping needed. New failure modes are all
log-and-continue / fall-through by design (AC6), not propagated as request errors.

## Tickets

**AC coverage check:** AC1→B1, AC2→B2+B3, AC3→N1, AC4→F1, AC5→N1+B4+F1(media branding), AC6→B3,
AC7→B3, AC8→B4+N1 (regression guard — no adapter code changes; covered by verifying the
media-attached draft that B4 produces is structurally identical to today's app-screenshot draft).

---

## Self-Review

- [x] Every AC maps to ≥1 ticket (table above)
- [x] Shared contract internally consistent — Go JSON tags, TS field names, and the S3 key encoding
      (`<component>--<storyId>.png`) are pinned once and referenced by every consuming ticket
- [x] Every ticket has files, placement facts, signatures, rules, depends-on, AC refs
- [x] Migration version is resolved (`V0053`), not a placeholder
- [x] No code bodies — signatures and behavior lines only
- [x] Nothing here re-implements already-shipped work (checked `docs/GITHUB_AUTOPOST_TRACKER.md`
      Phase 6c — everything there is unchecked `[ ]`; nothing to avoid re-planning)
- [ ] **Flag for a human:** N1's Rules line has no qualified skill to cite (`capture-worker/` isn't
      covered by any `.claude/skills/*` skill in this repo, and `./scripts/tickets` doesn't exist in
      this repo to mechanically verify qualified IDs regardless — checked, it isn't present under
      `scripts/`, `webapp/scripts/`, or `.claude/scripts/`). This is a repo-tooling gap, not a plan
      defect; noted rather than silently worked around.
- [x] TRACKER.md epic row updated to Planned with this plan linked

## Tickets

1. MEER-19 — Migration: `github_repos` Storybook columns + store column-list wiring
2. MEER-20 — Storybook index client
3. MEER-21 — Component→story-ID resolution + webhook wiring
4. MEER-22 — capture-worker: direct-navigate Storybook capture
5. MEER-23 — Draft assembly: component-sourced prompt variant
6. MEER-24 — `showcaseDecorator` + preview wiring
