# Storybook Capture → Social Post — Tech Plan

**Epic:** EP-001   **PRD:** docs/prds/2026-08-02-storybook-social-autopost.md   **Scope:** cross-service (backend + capture-worker Node service + frontend design system)

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

| Ticket | Epic | Layer | Depends-on | AC refs | Status |
|--------|------|-------|-----------|---------|--------|
| B1 | EP-001 | backend | — | AC1 | Todo |
| B2 | EP-001 | backend | B1 | AC2 | Todo |
| B3 | EP-001 | backend | B1, B2 | AC2, AC6, AC7 | Todo |
| N1 | EP-001 | capture-worker-node | B3 | AC3, AC5, AC7, AC8 | Todo |
| B4 | EP-001 | backend | N1 | AC5, AC8 | Todo |
| F1 | EP-001 | frontend-design-system | — | AC4, AC5 | Todo |

**AC coverage check:** AC1→B1, AC2→B2+B3, AC3→N1, AC4→F1, AC5→N1+B4+F1(media branding), AC6→B3,
AC7→B3, AC8→B4+N1 (regression guard — no adapter code changes; covered by verifying the
media-attached draft that B4 produces is structurally identical to today's app-screenshot draft).

---

## B1 — Migration: `github_repos` Storybook columns + store column-list wiring

**Files:** `base-server/migrations/V0053__add_storybook_columns_to_github_repos.sql` (new),
`base-server/internal/infra/store/github_repo.go` (edit)

**Placement:** next migration version is **V0053** (latest on disk is `V0052__reseed_growth_tools_plan_feature_limits_gt_free.sql`). `GitHubRepo` struct is defined at the top of
`github_repo.go` (lines ~13–31); six SQL constants in the same file currently list explicit columns
(no `SELECT *`, per S-1) and all six need the two new columns appended: `sqlCreateGitHubRepo`,
`sqlListGitHubReposByConnection`, `sqlGetGitHubRepoByConnectionAndName`,
`sqlGetGitHubRepoByGitHubID`, `sqlGetGitHubRepoByOwnerName`, `sqlGetGitHubRepoByID`. The webhook
path (`HandleWebhookEvent`) reads the repo via `GetGitHubRepoByGitHubID` /
`GetGitHubRepoByOwnerName`, so both of those must return the new fields for B3 to see them.

**Migration contents (columns + one-time seed, not literal SQL bodies):**
- `ALTER TABLE github_repos ADD COLUMN storybook_url TEXT` (nullable, no default)
- `ALTER TABLE github_repos ADD COLUMN component_globs TEXT[]` (nullable, no default)
- One seed `UPDATE github_repos SET storybook_url = 'https://ui.protoapp.xyz', component_globs = ARRAY['webapp/src/proto-design-system/components/**/*.tsx'] WHERE deleted_at IS NULL` — satisfies AC1's "the in-scope repo has both seeded"; acceptable for the single-tenant/no-settings-UI v1 scope the PRD specifies (every live repo row gets the same seed; there is currently exactly one).

**Struct field additions (`GitHubRepo`):**
```
StorybookURL   *string             `db:"storybook_url" json:"storybook_url,omitempty"`
ComponentGlobs store.StringArray   `db:"component_globs" json:"component_globs,omitempty"`
```
(`store.StringArray` — reuse the existing `TEXT[]` wrapper, not a new type; see
`internal/infra/store/types.go:57` and its use in `platform_connection.go`/`post.go`.)

**Rules:** backend-store-rules:S-1, backend-store-rules:S-7

---

## B2 — Storybook index client

**Files:** `base-server/internal/infra/clients/storybook/client.go` (new package),
`base-server/internal/github/processor/processor.go` (edit)

**Placement:** new client package mirrors `internal/infra/clients/github/client.go`'s shape (plain
`net/http`, no auth — the Storybook deployment is a public URL). Processor-side: add a
consumer-defined `StorybookClient` interface next to the existing `GitHubClient`/`CommitClassifier`
interfaces in `processor.go` (~line 85), a `storybookClient StorybookClient` field on the
`GitHubProcessor` struct, and a `SetStorybookClient` setter mirroring the existing
`SetCommitClassifier`/`SetURLSigner` pattern (nil-safe — B3's resolver treats a nil client as a
no-op, exactly like the nil-classifier fallback). Bootstrap wiring:
`internal/infra/bootstrap/processors.go`, construct the client alongside the other infra clients
(same place `cl.ghClient` is built) and call `p.github.SetStorybookClient(cl.storybookClient)`
immediately after the existing `p.github.SetCommitClassifier(p.aiClassifier)` call (~line 159).

**Signatures:**
```
package storybook

type IndexEntry struct {
    ID         string `json:"id"`
    Title      string `json:"title"`
    Name       string `json:"name"`
    ImportPath string `json:"importPath"`
    Type       string `json:"type"`
}
type Index struct {
    Entries map[string]IndexEntry `json:"entries"`
}

func NewClient(logger *observability.Logger) *Client
func (c *Client) FetchIndex(ctx context.Context, baseURL string) (Index, error)
```
```
// processor.go
type StorybookClient interface {
    FetchIndex(ctx context.Context, baseURL string) (storybookclient.Index, error)
}
func (p *GitHubProcessor) SetStorybookClient(c StorybookClient)
```

**Behavior:**
- `FetchIndex`: `GET {baseURL}/index.json`; non-2xx or malformed JSON body SHALL return a non-nil
  error (wrapped with the URL for debuggability); a well-formed body SHALL decode directly into
  `Index`.
- `SetStorybookClient`: sets the field; passing `nil` is valid (disables Storybook resolution
  entirely — B3 must treat `p.storybookClient == nil` as a no-op, not a panic).

**Rules:** backend-architecture-rules:A-2, backend-architecture-rules:A-3, backend-architecture-rules:A-7

---

## B3 — Component→story-ID resolution + webhook wiring

**Files:** `base-server/internal/github/processor/storybook.go` (new),
`base-server/internal/github/processor/webhook.go` (edit)

**Placement:** new file in the same package as `webhook.go`/`processor.go`. Wiring point is inside
`enqueueCaptureRequests` (`webhook.go`, currently ~line 368) — call the resolver **after** the
existing `diffTouchesFrontend` gate passes (component paths are always under `webapp/`, so ordering
against that gate doesn't change which commits get resolved, it just avoids a wasted Storybook
fetch for commits already being skipped) and **before** the classifier gate, so classifier-driven
skips still apply uniformly to both capture strategies. **New dependency required:** this repo has
no glob library today (`grep -i doublestar\|gobwas go.mod` returns nothing) — add
`github.com/bmatcuk/doublestar/v4` via `go get` for `**`-aware glob matching (stdlib
`path.Match`/`filepath.Match` don't cross `/` on `*`, which the default `component_globs` value
relies on).

**Signatures:**
```
func (p *GitHubProcessor) resolveStoryIDs(ctx context.Context, repo store.GitHubRepo, diff string) (storyIDs []string, storyComponents map[string]string, err error)
func matchesComponentGlob(path string, globs []string) bool
func changedFilePaths(diff string) []string
```

**Behavior:**
- `resolveStoryIDs`: WHEN `repo.StorybookURL` is nil/empty, OR `repo.ComponentGlobs` is empty, OR
  `p.storybookClient` is nil, SHALL return `(nil, nil, nil)` immediately (AC7's "behaves exactly as
  before" for repos without Storybook configured). WHEN `changedFilePaths(diff)` filtered through
  `matchesComponentGlob` against `repo.ComponentGlobs` yields no paths, SHALL return `(nil, nil,
  nil)`. Otherwise SHALL call `p.storybookClient.FetchIndex` once, match per the Shared Contract's
  §Story-ID resolution algorithm steps 5–6, and return the sorted deduplicated ID list plus the
  id→componentName map. WHEN the index fetch errors, SHALL log and return `(nil, nil, err)` — the
  caller in `webhook.go` treats a non-nil error exactly like an empty result (falls through to the
  existing app-screenshot `CaptureRequest` fields; this is AC6's "does not error the pipeline").
- `matchesComponentGlob`: SHALL return true iff `path` doublestar-matches at least one entry in
  `globs` AND `path`'s basename does not end in `.stories.tsx`/`.stories.ts`/`.stories.jsx`.
- `changedFilePaths`: SHALL parse the same `diff --git a/<path> b/<path>` headers
  `diffTouchesFrontend` parses and return the deduplicated `b/` paths. Unlike
  `diffTouchesFrontend`'s "unknown diff → true" fallback, an empty/unparseable diff SHALL return an
  empty (non-nil) slice — resolution needs concrete paths, not a boolean.

**`webhook.go` wiring (behavior, not a diff):** `CaptureRequest` gains the three fields from the
Shared Contract table. In `enqueueCaptureRequests`, after the frontend gate and before the
classifier gate, call `resolveStoryIDs`; when it returns a non-empty `storyIDs`, set
`StoryIDs`/`StorybookURL`/`StoryComponents` on the `CaptureRequest` being built for that commit (in
addition to, not instead of, the existing `AppURL`/`TwoPass` fields — capture-worker is the one that
branches on `StoryIDs` non-empty, per N1).

**Rules:** backend-architecture-rules:A-4, backend-architecture-rules:A-5

---

## N1 — capture-worker: direct-navigate Storybook capture

**Layer:** capture-worker-node (dispatch via `node-service-code-editor`, not a backend/frontend
supervisor — see Routing note)

**Files:** `capture-worker/storybook.ts` (new), `capture-worker/kafka.ts` (edit)

**Placement:** `storybook.ts` sits next to `capture.ts` and imports its already-exported helpers —
`commitArtifactsDir`, `commitS3Prefix`, `uploadCommitArtifacts` — rather than duplicating the S3
walk/upload logic. Uses `chromium` from `"playwright"`, already a dependency (see `agent.ts`'s
import). `kafka.ts`'s `eachMessage` handler (currently ~line 111) is where the branch goes: it
already builds a `CaptureResultMessage` and calls either capture path then publishes the result —
same shape, different function call.

**Signatures:**
```ts
// storybook.ts
export interface StorybookCaptureInput {
  commit: string;
  storybookUrl: string;
  storyIds: string[];
  storyComponents?: Record<string, string>;
}
export async function runStorybookCapture(input: StorybookCaptureInput): Promise<CaptureOutput>
```
(`CaptureOutput` — import the existing type from `./capture.ts`, do not redefine it.)

```ts
// kafka.ts — CaptureRequestMessage gains:
story_ids?: string[];
storybook_url?: string;
story_components?: Record<string, string>;
```

**Behavior:**
- `runStorybookCapture`: WHEN `input.storyIds` is empty SHALL return immediately with
  `{commit, captureDir: commitArtifactsDir(commit), stepCount: 0, uploaded: []}` — no browser
  launched. Otherwise SHALL launch one headless Chromium page and, for each story ID in order,
  navigate to `${storybookUrl}/iframe.html?id={storyId}&viewMode=story`, wait for network-idle plus
  a short fixed settle delay (mirror the existing agent's settle-time convention), then screenshot
  to `<commitArtifactsDir(commit)>/storybook/<component>--<storyId>.png` where `<component>` is
  `storyComponents?.[storyId] ?? storyId` sanitized to a filesystem-safe slug (this filename
  encoding is what B4 later parses — do not change the `--` separator without updating B4's
  `storybookComponentNames`). A single story's navigation/screenshot failure SHALL be logged and
  skipped, not abort the batch (best-effort, matching `runDemo`'s per-step philosophy). SHALL close
  the browser, call `uploadCommitArtifacts(commit)` (same helper `runCapture` uses), and return
  `{commit, captureDir: commitArtifactsDir(commit), stepCount: <successful screenshot count>,
  uploaded}`.
- `kafka.ts` `eachMessage`: WHEN `request.story_ids` is non-empty SHALL call
  `runStorybookCapture({commit: request.sha, storybookUrl: request.storybook_url ?? "", storyIds:
  request.story_ids, storyComponents: request.story_components})` in place of the existing
  `runCapture(...)` call; every other line (heartbeat, error salvage via `uploadCommitArtifacts` on
  failure, `CaptureResultMessage` construction/publish) is unchanged and wraps whichever function
  ran. WHEN `request.story_ids` is empty/absent, behavior is byte-for-byte what it is today
  (AC7 — no regression for non-component commits, which never populate these fields per B3).

**Cross-service contract note (the failure mode this ticket must not hit):** match the Go
`CaptureRequest` JSON tags from B3 exactly — `story_ids`, `storybook_url`, `story_components`. A
casing or key mismatch here fails silently at `JSON.parse` (wrong-shaped object, no thrown error),
not as a type error on either side.

**Rules:** no qualified rule skill exists for `capture-worker/` in this repo (only
`render-service/`/`zapier-integration/` are documented under `node-service-code-editor`'s scope,
though its "standalone Node/TypeScript service" description fits `capture-worker/` identically).
Follow `node-service-code-editor`'s own agent-doc constraints instead: TypeScript strict (no `any`,
no non-null `!`), async errors caught and surfaced not swallowed, no secrets in code, no barrel
files. Verify with `cd capture-worker && npm run build` (or equivalent) after the edit — there is no
automated test-writer for this domain in this repo.

---

## B4 — Draft assembly: component-sourced prompt variant

**Files:** `base-server/internal/github/processor/draft_media.go` (edit),
`base-server/internal/github/processor/draft_assembly.go` (edit),
`base-server/internal/github/processor/draft.go` (edit)

**Placement:** `draft_media.go` already holds `bucketArtifacts`/`contentTypeFor` (extension-based
S3-key helpers) — add the new helper there. `draft_assembly.go` already holds `buildDraftPrompt` —
add the variant next to it. `draft.go`'s `GenerateDraftFromCommit`, Step 1 (currently `videoKey,
imageKeys := bucketArtifacts(payload.Uploaded)`, ~line 177) and Step 8 (currently `Prompt:
buildDraftPrompt(commit)`, ~line 322) are the two edit points. No change to `bucketArtifacts` itself
— Storybook screenshots are `.png` and already bucket into `imageKeys` today, so AC3/AC5/AC8's
media-attachment path needs zero changes.

**Signatures:**
```
func storybookComponentNames(uploaded []captureUpload) []string
func buildComponentDraftPrompt(commit store.GitHubCommitForDraft, componentNames []string) string
```

**Behavior:**
- `storybookComponentNames`: SHALL scan `uploaded` for keys containing `/storybook/`, take each
  basename up to its first `--` as the component name (matches N1's `<component>--<storyId>.png`
  encoding), dedupe, and return a sorted **non-nil** slice (empty when no match — S-3 list
  convention applies to internal helpers too, not just store methods).
- `buildComponentDraftPrompt`: SHALL produce a prompt framed around the given component name(s)
  (comma-joined) and `commit.Message` — same repo/commit framing `buildDraftPrompt` uses, but
  leading with "this is a UI/component update to <names>" rather than a generic shipped-change
  blurb, so Claude's copy references the component explicitly (AC5's "referencing the component
  name").
- `draft.go` wiring: immediately after Step 1's `bucketArtifacts` call, add `componentNames :=
  storybookComponentNames(payload.Uploaded)`. In Step 8, WHEN `len(componentNames) > 0` SHALL set
  `genReq.Prompt = buildComponentDraftPrompt(commit, componentNames)`; otherwise
  `genReq.Prompt = buildDraftPrompt(commit)` (unchanged). No other step in `GenerateDraftFromCommit`
  changes — media selection, `SaveDraft`, and the commit→post link-back are identical for both
  paths, which is what makes AC5/AC8 "same path as app-screenshot commits" true.

**Rules:** backend-architecture-rules:A-4

---

## F1 — `showcaseDecorator` + preview wiring

**Layer:** frontend-design-system

**Files:** `webapp/src/proto-design-system/storybook/showcaseDecorator.tsx` (new),
`webapp/src/proto-design-system/storybook/showcaseDecorator.module.scss` (new),
`webapp/.storybook/preview.js` (edit)

**Placement:** new `storybook/` subdirectory under `proto-design-system/`, sibling to the existing
`themes/`, `tokens/`, `base/` subdirectories — matches the path the PRD names verbatim. Current
`preview.js` exports only `{ parameters }` (no `decorators` key today — confirmed by reading the
file). **Note for the builder:** `UIKit.stories.tsx:131` and `themes/themeGlobalContext.ts:20`
contain stale comments referencing a "`preview.ts`'s `themeDecorator`" — no such file or decorator
exists in the current tree. Out of scope; don't be misled by them, don't fix them.

**Signature:**
```tsx
export const showcaseDecorator: Decorator = (Story) => JSX.Element
```
`Decorator` type imported from `"@storybook/react-vite"` — same import source every
`*.stories.tsx` file in this repo already uses for `Meta`/`StoryObj` (e.g.
`components/navigation/Pagination/Pagination.stories.tsx`).

**Behavior:**
- Renders `<Story />` inside a wrapper `<div className={styles.showcase}>` — background, padding,
  and centering come from `showcaseDecorator.module.scss` using design tokens only (no inline
  styles, no hex/px literals — **this corrects the old aspirational PRD snippet in
  `docs/GITHUB_AUTOPOST_PRD.md` §3b, which used inline styles and a hardcoded hex gradient; that
  snippet predates this repo's SCSS-modules-only / tokens-only rule and must not be copied
  verbatim**): brand-gradient background via existing `--color-*` tokens, `var(--space-12)`
  padding (SP-ladder), flex-centered content.
- Includes a small fixed-position brand/copyright mark (AC4's "copyright treatment"). No existing
  copy convention covers this non-user-facing surface (it never renders inside the live app), so
  any short static string the builder chooses is acceptable — it is not subject to the
  hardcoded-user-facing-string ban, which governs in-app copy.
- **Applied globally** (every story, not per-tag/opt-in) for v1 — `preview.js` gains `decorators:
  [showcaseDecorator]` alongside the existing `parameters` key, imported from
  `"../src/proto-design-system/storybook/showcaseDecorator"`. Matches AC4's "every captured
  screenshot" wording; per-tag opt-in is a future iteration consistent with the PRD's
  no-settings-UI non-goal.

**Rules:** frontend-design-rules:FC-3, frontend-design-rules:FC-4

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
