# Showcase Post from Brief — Tech Plan

**Epic:** EP-005   **PRD:** docs/prds/2026-08-03-showcase-post-from-brief.md   **Scope:** full-stack (backend + webapp), reuses EP-001's capture pipeline end to end — **zero `capture-worker` changes**

## Routing note

Single-repo, two-domain plan — `backend-supervisor` then `frontend-supervisor` (dispatch via `feature-manager`). No capture-worker-node ticket exists here (confirmed: nothing in this plan touches `capture-worker/` — the job UUID rides through the existing, unmodified `sha`/`commit_id` fields).

## Corrections to the PRD's "rough" surface (resolved against real code, not re-litigating PRD decisions)

- **Route path:** `POST /api/protected/showcase-posts`, not `/api/showcase-posts` — every authenticated endpoint in this app lives under the `/api/protected` group (`internal/infra/api/api.go`); there is no unauthenticated group this could plausibly sit in, and AC7 requires the same auth gate as any other post-creation endpoint.
- **AI provider is Gemini, not literally "Claude"/Anthropic** — despite CLAUDE.md/PRD language, every AI package in this repo (`commitclassifier`, `posttitler`, `socialposts`) is wired to `internal/infra/clients/gemini` via the `aiclient.Client` interface (`CreateMessage`/`CreateJSONMessage`/...). The new brief→component resolver follows this exact convention. Functionally identical to the PRD's intent (an LLM call); only the vocabulary is corrected.
- **Response wire format is snake_case** (`job_id`, matching every other Go handler's JSON convention in this app, e.g. `account_id`, `content_type`) — not the camelCase `jobId` used loosely in early scoping. Frontend gets a normal `ApiXxx` → transform → domain-type pair, same as every other endpoint.
- **`account_id` is a required column on `showcase_jobs`**, not in the PRD's rough list — the eventual draft post needs an account scope (AC7's "same permission level as any other post" implies the same account-scoping everywhere else in this app), and every comparable table (`posts`, `blog_posts`, `github_repos`) has one.

## Routing mechanism (PRD's open question — resolved)

`CaptureResultMessage` (`internal/workers/github_capture.go`) and the `github.capture.requests`/`github.capture.results` topics stay **byte-identical** — this is the PRD's explicit "reused, unchanged" constraint, and capture-worker treats `commit_id`/`sha` as pure opaque strings regardless. Because that struct can't gain a discriminator field, the **one and only** place a blind lookup is required is `CaptureResultWorker.handle`:

1. Try `store.UpdateGitHubCommitCapture(ctx, msg.CommitID, raw)` (unchanged call, unchanged behavior).
2. If it returns `store.ErrNotFound` (0 rows affected — the existing `RowsAffected`-based sentinel every store mutator already uses), fall through to `store.UpdateShowcaseJobCapture(ctx, msg.CommitID, raw)` (new method, **identical signature** to `UpdateGitHubCommitCapture` by design, so the fallback call type-checks symmetrically).
3. If *that* also returns `store.ErrNotFound`, log a warning ("capture result matched neither github_commits nor showcase_jobs") and drop the message — no downstream publish.

Everything **downstream** of this one hop is base-server-internal (`TopicDraftGenerate`/`TopicBlogGenerate`/the new `TopicShowcaseDraftGenerate` never cross to capture-worker), so it is free to carry an explicit discriminator instead of repeating a blind lookup: `CaptureResultWorker.handle` already knows which branch succeeded, so it publishes the existing `DraftGenerateEvent`+`BlogGenerateEvent` pair for the github branch, or a new `ShowcaseDraftGenerateEvent{JobID}` onto a new topic for the showcase branch. No second try-then-fallback exists anywhere else in the chain.

## Confidence-threshold / prompt design (PRD's open question — resolved)

Rather than asking the model to self-report a numeric confidence score (unreliable in practice), resolution is a **closed-set exact-match gate**: the resolver is given the brief plus the sorted list of every distinct component name derivable from the live Storybook index, and is instructed to respond with **exactly one name verbatim from that list, or the literal token `NONE`** if it can't confidently pick a single one. The code then does an exact (falling back to case-insensitive) string comparison against the input list — anything that isn't a verbatim match (wrong string, `NONE`, multiple tokens, empty) is treated as no-match. The closed-set-or-`NONE` format **is** the confidence gate; there is no separate numeric threshold to tune, and it can't hallucinate a non-existent component name into a "match."

## Shared contract

### Entities

**New table `showcase_jobs`** (migration `V0056__create_showcase_jobs.sql` — confirmed next version, nothing landed past V0055):

| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | `PRIMARY KEY DEFAULT uuid_generate_v4()` |
| `account_id` | UUID | `NOT NULL REFERENCES accounts(id) ON DELETE CASCADE` |
| `brief` | TEXT | `NOT NULL` |
| `component_name` | TEXT | `NOT NULL` (resolved synchronously before the row ever exists — never null) |
| `story_ids` | TEXT[] | `NOT NULL DEFAULT '{}'` (Go: `store.StringArray`, same wrapper as `github_repos.component_globs`) |
| `status` | TEXT | `NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','capturing','drafting','done','failed'))` — precedented CHECK-column pattern, see `V0007__add_conversations.sql:14` (`role TEXT CHECK (role IN (...))`) |
| `error` | TEXT | `NULL` |
| `post_id` | UUID | `NULL REFERENCES posts(id)` (no `ON DELETE`, matches `github_commits.post_id`) |
| `capture_output` | JSONB | `NULL` (matches `github_commits.capture_output` exactly — Go: `*json.RawMessage`) |
| `created_at`/`updated_at` | TIMESTAMPTZ | `NOT NULL DEFAULT CURRENT_TIMESTAMP` (no DB trigger exists anywhere in this repo — store methods set `updated_at = CURRENT_TIMESTAMP` explicitly on every UPDATE, same as `blog_post.go`) |
| `deleted_at` | TIMESTAMPTZ | `NULL` |

Indexes: `idx_showcase_jobs_account ON showcase_jobs(account_id) WHERE deleted_at IS NULL`; `idx_showcase_jobs_post ON showcase_jobs(post_id) WHERE post_id IS NOT NULL`.

**Status lifecycle** (five PRD-mandated values, precisely assigned): `pending` (row inserted) → `capturing` (capture request published) → `drafting` (capture result received, draft generation in progress) → `done` (draft created + linked) — with `failed` reachable from any stage (`error` populated).

### Endpoint

`POST /api/protected/showcase-posts`
- Request: `{ "brief": string }` (required, non-empty — standard `ShouldBindJSON` + validator binding)
- Success: `202 { "job_id": string, "status": "capturing" }`
- Errors: `400` (`STORYBOOK_NOT_CONFIGURED` | `SHOWCASE_NO_COMPONENT_MATCH` | validation failure), `503` (`SHOWCASE_ENQUEUE_FAILED` — Kafka publish failure, a *synchronous* infra failure distinct from AC6's post-queue async failures), `500` default. All via `apierrors.BadRequest(c, code, message)` / `apierrors.ServiceUnavailable(c, code, message, err)` / `apierrors.ValidationError(c, err)` — the existing, unmodified error envelope every other frontend hook already parses. No `422` anywhere in this codebase; `400` is the established "semantically invalid input" convention.

### Kafka payload usage (reused, unchanged shapes)

`CaptureRequest` (`internal/github/processor/webhook.go`) — showcase publishes with `CommitID: jobID, SHA: jobID.String(), StoryIDs: <resolved story ids>, StorybookURL: repo.StorybookURL, StoryComponents: <storyID→componentName for the resolved ids>`; `Owner`/`Repo`/`Message`/`Diff`/`AppURL`/`TwoPass` left zero-value (unused by the direct-navigate Storybook path). **Critical fact:** capture-worker derives the artifact-directory/S3-prefix from `SHA` (sliced to 12 chars), not `CommitID` — both fields get the same `jobID` value, which is new (github commits use a real sha string in `SHA` and a uuid in `CommitID`; showcase uses the same uuid in both) but requires no capture-worker change since both are opaque strings there. Published to `TopicCaptureRequests = "github.capture.requests"` via the same `EventPublisher.Publish(ctx, topic, key string, payload any) error` shape github/processor already uses.

`CaptureResultMessage` — completely unchanged; `CommitID` stays the sole identifying field (see Routing mechanism above).

New base-server-internal-only event: `ShowcaseDraftGenerateEvent{JobID uuid.UUID `json:"job_id"`}` on new topic `TopicShowcaseDraftGenerate = "showcase.draft.generate"` (named consistently with existing `TopicDraftGenerate = "github.draft.generate"` / `TopicBlogGenerate = "github.blog.generate"`, both defined in `internal/workers/github_capture.go`).

### Errors table

| Condition | Error | HTTP |
|---|---|---|
| Missing/empty `brief` | validator binding failure | 400 |
| No repo with `storybook_url` configured for account | `ErrStorybookNotConfigured` | 400 `STORYBOOK_NOT_CONFIGURED` |
| Brief doesn't resolve to exactly one component | `ErrNoComponentMatch` | 400 `SHOWCASE_NO_COMPONENT_MATCH` |
| Kafka publish fails after job row created | `ErrPublishFailed` | 503 `SHOWCASE_ENQUEUE_FAILED` |
| AI call itself fails (not a "no match" — a transport/API error) | propagated, unwrapped | 500 |
| Capture failure (async, post-202) | recorded on `showcase_jobs.status='failed'`/`error` — **no HTTP surface, AC6** | n/a |
| Draft-generation failure (async, post-202) | recorded on `showcase_jobs.status='failed'`/`error` — **no HTTP surface, AC6** | n/a |

## AC coverage

AC1→F2 · AC2→B3(resolution+publish)+F2(toast+close) · AC3→B3(sync 4xx)+F2(inline error) · AC4→B3(publish)+B5(routing+trigger)+B4(draft assembly reuse) · AC5→B4(SaveDraft path identical to github drafts) · AC6→B5(capture-failure handling)+B4(draft-gen-failure handling) · AC7→B3(existing JWT/account-ID middleware, no new check)

## Tickets

| Ticket | Epic | Layer | Depends-on | AC refs | Status |
|--------|------|-------|-----------|---------|--------|
| B1 | EP-005 | db | — | AC4, AC5, AC6 | Todo |
| B2 | EP-005 | backend | — | AC2, AC3 | Todo |
| B3 | EP-005 | backend | B1, B2 | AC2, AC3, AC4, AC7 | Todo |
| B4 | EP-005 | backend | B1 | AC4, AC5, AC6 | Todo |
| B5 | EP-005 | backend | B1, B4 | AC4, AC6 | Todo |
| F1 | EP-005 | fe | B3 | AC2 | Todo |
| F2 | EP-005 | fe | F1 | AC1, AC2, AC3 | Todo |
| F3 | EP-005 | fe | F2 | AC1, AC2, AC3 | Todo |

---

## B1 — Migration + store: `showcase_jobs` CRUD

**Files:** `base-server/migrations/V0056__create_showcase_jobs.sql` (new), `base-server/internal/infra/store/showcase_job.go` (new)

**Placement:** brand-new `CREATE TABLE` (not an ALTER, unlike EP-001's B1) — closest structural precedent is `V0055__create_site_publish_targets.sql` for a fresh small table, combined with the account+soft-delete shape every user-facing table (`posts`, `blog_posts`) has. New store file mirrors `github_commit.go`'s shape (struct + SQL constants with explicit column lists, no `SELECT *`, pointer receivers, `RowsAffected`-based `ErrNotFound`, package var `store.ErrNotFound` reused verbatim — not a new sentinel — so the capture-worker's try-then-fallback routing compares against the identical error value on both branches).

**Migration contents:** table + columns + CHECK + indexes exactly as the Shared Contract's Entities table above.

**Struct:**
```go
type ShowcaseJob struct {
    ID uuid.UUID; AccountID uuid.UUID; Brief string; ComponentName string
    StoryIDs StringArray; Status string; Error *string; PostID *uuid.UUID
    CaptureOutput *json.RawMessage; CreatedAt, UpdatedAt time.Time; DeletedAt *time.Time
}
type ShowcaseJobForDraft struct {
    ID uuid.UUID; Brief string; ComponentName string; Status string
    PostID *uuid.UUID; CaptureOutput *json.RawMessage; AccountID uuid.UUID
}
type CreateShowcaseJobParams struct {
    AccountID uuid.UUID; Brief string; ComponentName string; StoryIDs []string
}
```

**Signatures:**
```go
func (s *Store) CreateShowcaseJob(ctx context.Context, params CreateShowcaseJobParams) (ShowcaseJob, error)
func (s *Store) GetShowcaseJobForDraft(ctx context.Context, jobID uuid.UUID) (ShowcaseJobForDraft, error)
func (s *Store) UpdateShowcaseJobStatus(ctx context.Context, jobID uuid.UUID, status string) error
func (s *Store) UpdateShowcaseJobCapture(ctx context.Context, jobID uuid.UUID, captureOutput json.RawMessage) error
func (s *Store) UpdateShowcaseJobPostID(ctx context.Context, jobID, postID uuid.UUID) error
func (s *Store) UpdateShowcaseJobFailed(ctx context.Context, jobID uuid.UUID, errMsg string) error
```

**Behavior:**
- `CreateShowcaseJob`: SHALL insert with `status='pending'` (column default, not passed) and return the full row (RETURNING, explicit column list, mirrors `CreateGitHubRepo`'s single-row-insert shape). **Conversion note:** `CreateShowcaseJobParams.StoryIDs` is a plain `[]string`; the insert SHALL wrap it as `store.StringArray(params.StoryIDs)` to match `ShowcaseJob.StoryIDs StringArray`.
- `GetShowcaseJobForDraft`: SHALL select by `id` alone (no join needed — `account_id` lives directly on this table, unlike `GetGitHubCommitForDraft`'s multi-table join); `sql.ErrNoRows`/soft-deleted → `ErrNotFound`.
- `UpdateShowcaseJobStatus`: SHALL set `status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`; 0 rows affected → `ErrNotFound`. Generic setter, used for the pending→capturing transition after a successful Kafka publish.
- `UpdateShowcaseJobCapture`: SHALL set `capture_output = $2, status = 'drafting', updated_at = CURRENT_TIMESTAMP WHERE id = $1`; 0 rows affected → `ErrNotFound`. **Signature must stay parameter-identical to `UpdateGitHubCommitCapture(ctx, id uuid.UUID, raw json.RawMessage) error`** — this is the fallback target in `CaptureResultWorker.handle`'s routing (B5) and is called unconditionally regardless of `msg.Success` (mirrors `UpdateGitHubCommitCapture`'s existing behavior exactly — failure detection happens later, at draft-gen or via B5's explicit follow-up call, not inside this method).
- `UpdateShowcaseJobPostID`: SHALL set `post_id = $2, status = 'done', updated_at = CURRENT_TIMESTAMP WHERE id = $1`; 0 rows affected → `ErrNotFound`.
- `UpdateShowcaseJobFailed`: SHALL set `status = 'failed', error = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`; 0 rows affected → `ErrNotFound`. Called from three distinct call sites (B3's synchronous publish-failure path; B5's capture-failure path; B4's draft-gen-failure path) — every one of AC6's "recorded on the job's backing record" cases funnels through this one method.

**Rules:** backend-store-rules:S-1, backend-store-rules:S-3, backend-store-rules:S-7

---

## B2 — AI package: brief→component resolver

**Files:** `base-server/internal/ai/componentmatcher/componentmatcher.go` (new package)

**Placement:** sibling to `internal/ai/commitclassifier/` and `internal/ai/posttitler/` — same "pure AI library, no store, no HTTP" tier (`internal/infra/bootstrap/processors.go`'s "AI packages" section, ~lines 52-58/104-110). Wired with `cl.gemini` (the concrete `*gemini.Client` implementing `aiclient.Client`) at bootstrap time, exactly like `commitclassifier.New(cl.gemini, logger)` (`processors.go:106`) — **not** an "Anthropic"/"Claude" client; that vocabulary doesn't match any concrete type in this repo (see Corrections above).

**Signatures:**
```go
type AIClient interface {
    CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
}
type Matcher struct { /* aiClient AIClient; logger *observability.Logger */ }
func New(aiClient AIClient, logger *observability.Logger) *Matcher
func (m *Matcher) Resolve(ctx context.Context, brief string, componentNames []string) (matched *string, err error)
```

**Behavior:**
- `Resolve`: SHALL call `aiClient.CreateMessage` once with a system prompt instructing the model to respond with **exactly one name verbatim from the given `componentNames` list, or the literal token `NONE`** if it can't confidently choose a single one (the brief + sorted `componentNames` are the only inputs; low `maxTokens` since output is a single short token). SHALL parse the response by trimming whitespace and comparing (case-sensitive, then case-insensitive) against `componentNames`; on an exact match SHALL return a pointer to the **canonical input-list-cased** name; on `NONE`, an empty response, multiple tokens, or any string not in the list, SHALL return `(nil, nil)` — this is a confident "no match," not an error. WHEN `aiClient.CreateMessage` itself returns an error (transport/API failure, not a content decision), SHALL return `(nil, err)` — the caller (B3) must treat this as a genuine 500, distinct from the confident-no-match `(nil, nil)` case that maps to 400.

**Rules:** backend-architecture-rules:A-2, backend-architecture-rules:A-7

---

## B3 — Showcase feature module: handler + processor + endpoint

**Files:** `base-server/internal/showcase/processor/processor.go` (new), `base-server/internal/showcase/processor/storybook_match.go` (new), `base-server/internal/showcase/handler/handler.go` (new), `base-server/internal/infra/api/api.go` (edit), `base-server/internal/infra/bootstrap/processors.go` (edit), `base-server/internal/infra/bootstrap/handlers.go` (edit), `base-server/internal/infra/bootstrap/bootstrap.go` (edit)

**Placement:** new top-level feature domain mirroring `internal/media/{handler,processor}`'s flat single-file-per-layer shape (smallest applicable template — `handler.go`+`handler_test.go`+`mocks_test.go`, `processor.go`+`processor_test.go`+`mocks_test.go`, `//go:generate mockgen` header in each). Route registered in `api.go`'s `protectedGroup` block (after the GitHub section, ~line 188): `protectedGroup.POST("/showcase-posts", a.showcaseHandler.HandleCreate)`, plus the matching `API` struct field + constructor wiring (same pattern as every other handler field there). Bootstrap: `processors.go` builds `p.showcase` alongside `p.github`/`p.blog` (constructor takes the store interface below + `StorybookClient` + `*componentmatcher.Matcher` + `EventPublisher` + logger); `handlers.go`/`bootstrap.go` wire `deps.ShowcaseHandler = showcaseHandler.New(&p.showcase, logger)` (pointer-to-processor, matching `mediaHandler.New(&p.media, logger)`).

**Signatures:**
```go
// processor.go
type ShowcaseStore interface {
    GetAccountByID(ctx context.Context, accountID uuid.UUID) (store.Account, error)
    GetGitHubConnectionByUserID(ctx context.Context, userID uuid.UUID) (store.GitHubConnection, error)
    ListGitHubReposByConnection(ctx context.Context, connectionID uuid.UUID) ([]store.GitHubRepo, error)
    CreateShowcaseJob(ctx context.Context, params store.CreateShowcaseJobParams) (store.ShowcaseJob, error)
    UpdateShowcaseJobStatus(ctx context.Context, jobID uuid.UUID, status string) error
    UpdateShowcaseJobFailed(ctx context.Context, jobID uuid.UUID, errMsg string) error
}
type StorybookClient interface {
    FetchIndex(ctx context.Context, baseURL string) (storybookclient.Index, error)
}
type EventPublisher interface {
    Publish(ctx context.Context, topic, key string, payload any) error
}
var (
    ErrStorybookNotConfigured = errors.New("account has no repo with storybook configured")
    ErrNoComponentMatch       = errors.New("brief did not confidently match a single component")
    ErrPublishFailed          = errors.New("failed to enqueue showcase capture request")
)
type ShowcaseProcessor struct { /* store ShowcaseStore; storybookClient StorybookClient; matcher *componentmatcher.Matcher; publisher EventPublisher; logger *observability.Logger */ }
func New(store ShowcaseStore, storybookClient StorybookClient, matcher *componentmatcher.Matcher, publisher EventPublisher, logger *observability.Logger) ShowcaseProcessor
func (p *ShowcaseProcessor) CreateShowcaseJob(ctx context.Context, accountID uuid.UUID, brief string) (jobID uuid.UUID, err error)

// storybook_match.go
func distinctComponentNames(index storybookclient.Index) []string
func storyIDsForComponent(index storybookclient.Index, componentName string) (storyIDs []string, storyComponents map[string]string)

// handler.go
type CreateShowcaseJobRequest struct { Brief string `json:"brief" binding:"required"` }
type CreateShowcaseJobResponse struct { JobID string `json:"job_id"`; Status string `json:"status"` }
func New(processor ShowcaseProcessorIface, logger *observability.Logger) Handler
func (h *Handler) HandleCreate(c *gin.Context)
```

**Behavior:**
- `distinctComponentNames`: SHALL scan `index.Entries` where `Type == "story"`, take `path.Base(strings.TrimPrefix(entry.ImportPath, "./"))`, trim a `.stories.{tsx,ts,jsx}` suffix, and return a deduped **sorted** non-nil slice (same suffix list `resolveStoryIDs` in `github/processor/storybook.go` already uses, reimplemented here since that helper is unexported and diff-driven, not name-driven).
- `storyIDsForComponent`: SHALL re-run the same per-entry derivation and return every `entry.ID` whose derived name equals `componentName`, plus the `id→componentName` map for exactly those ids (all mapping to the single given name).
- `CreateShowcaseJob`: WHEN no `github_repos` row reachable from `accountID` (via `GetAccountByID`→`OwnerUserID`→`GetGitHubConnectionByUserID`→`ListGitHubReposByConnection`, filtered to `StorybookURL != nil`) SHALL return `ErrStorybookNotConfigured`. Otherwise SHALL `FetchIndex`, derive `distinctComponentNames`, call `matcher.Resolve(ctx, brief, names)`. WHEN `Resolve` returns `(nil, nil)` SHALL return `ErrNoComponentMatch` — **no row created, nothing published** (AC3's "no job queued"). WHEN `Resolve` returns a non-nil error (AI transport failure, not a content decision) SHALL propagate it unwrapped (maps to 500, not 400 — this is not a confidence failure). On a confident match SHALL derive `storyIDsForComponent`, call `store.CreateShowcaseJob` (status `pending`), build and publish a `CaptureRequest` per the Shared Contract's Kafka section onto `github.capture.requests`. WHEN publish succeeds SHALL call `UpdateShowcaseJobStatus(ctx, jobID, "capturing")` and return `jobID`. WHEN publish fails SHALL call `UpdateShowcaseJobFailed(ctx, jobID, err.Error())` and return `ErrPublishFailed` — a **synchronous** infra failure (mapped to 503), distinct from AC6's post-202 async failures.
- `HandleCreate`: binds `CreateShowcaseJobRequest`, extracts `accountID` via the same `c.Get("Account-ID")`→`uuid.Parse` pattern every protected handler in this app uses (e.g. `internal/media/handler/handler.go` ~lines 220-232), calls the processor, maps errors per the Errors table above, and on success returns `202 CreateShowcaseJobResponse{JobID: jobID.String(), Status: "capturing"}`.

**Rules:** backend-architecture-rules:A-1, backend-architecture-rules:A-4, backend-error-rules:E-3, backend-error-rules:E-4

---

## B4 — Draft assembly: showcase prompt + `GenerateDraftFromShowcaseJob`

**Files:** `base-server/internal/github/processor/draft_assembly.go` (edit), `base-server/internal/github/processor/draft_showcase.go` (new), `base-server/internal/github/processor/draft.go` (edit — `DraftStore` interface extension only)

**Placement:** lives inside the **existing** `github/processor` package (not the new `showcase` package) — deliberate: `DraftGenerator`, `mediaplanner`, `mediadescriber`, `socialposts.Generator`, and every media-bucketing/assembly helper `GenerateDraftFromCommit` uses already live here, and per fact-finding, everything from media-bucketing onward in that function depends only on `AccountID`, `payload.Uploaded`, and a prompt string threaded through `mediaplanner.SelectRequest.CommitMessage` — showcase jobs substitute `job.Brief` into that exact field in place of `commit.Message` (see Behavior below), so no step is left commit-only. Duplicating that ~230-line middle section into a new package would be pure copy-paste; a sibling method on the same `*DraftGenerator` reuses it directly. This does mean `github/processor`'s `DraftStore` interface (`draft.go:45-50`) grows three showcase-shaped methods — a known, accepted layering tradeoff (github package referencing showcase-shaped store types) rather than a second parallel `DraftGenerator`-like struct.

**Signatures:**
```go
// draft_assembly.go — placed immediately after buildComponentDraftPrompt
func buildShowcaseDraftPrompt(brief string, componentName string) string

// draft_showcase.go
func (g *DraftGenerator) GenerateDraftFromShowcaseJob(ctx context.Context, jobID uuid.UUID) error

// draft.go — DraftStore interface gains:
GetShowcaseJobForDraft(ctx context.Context, jobID uuid.UUID) (store.ShowcaseJobForDraft, error)
UpdateShowcaseJobPostID(ctx context.Context, jobID, postID uuid.UUID) error
UpdateShowcaseJobFailed(ctx context.Context, jobID uuid.UUID, errMsg string) error
```

**Behavior:**
- `buildShowcaseDraftPrompt`: SHALL produce a prompt framed around the brief + component name (no repo/commit-message framing — showcase jobs have no repo context) — same "reference the component explicitly" intent as `buildComponentDraftPrompt`, seeded by `brief` instead of `commit.Message`.
- `GenerateDraftFromShowcaseJob`: SHALL fetch `store.ShowcaseJobForDraft` via `GetShowcaseJobForDraft`; WHEN `job.PostID` is already set SHALL no-op (already-drafted guard, mirrors `GenerateDraftFromCommit`'s `commit.PostID` guard). SHALL JSON-parse `job.CaptureOutput` into the same `capturePayload{Uploaded, Error}` shape `GenerateDraftFromCommit` uses; WHEN `payload.Error` is set SHALL call `UpdateShowcaseJobFailed(ctx, jobID, payload.Error)` and return without producing a draft (AC6). Otherwise SHALL reuse, unmodified, the existing media-bucketing → describe → plan (passing `job.Brief` as `mediaplanner.SelectRequest.CommitMessage` in place of `commit.Message` — the one substitution this reuse requires, since a showcase job has no commit message) → `buildShowcaseDraftPrompt(job.Brief, job.ComponentName)` → generate → assemble → `SaveDraft` pipeline exactly as `GenerateDraftFromCommit` does otherwise (same `AccountID`, same `payload.Uploaded`), then call `UpdateShowcaseJobPostID(ctx, jobID, post.ID)` to link back (mirrors `UpdateGitHubCommitPostID`). WHEN any step in that pipeline errors, SHALL call `UpdateShowcaseJobFailed(ctx, jobID, err.Error())` and return the error (worker logs it; no draft is left half-created) — this is AC6's "draft-generation fails after queued" case.

**Rules:** backend-architecture-rules:A-4, backend-architecture-rules:A-5

---

## B5 — Workers: capture-result routing + showcase draft-generator worker

**Files:** `base-server/internal/workers/github_capture.go` (edit — `CaptureResultWorker.handle` only), `base-server/internal/workers/github_showcase_draft.go` (new), `base-server/internal/infra/bootstrap/workers.go` (edit)

**Placement:** `CaptureResultWorker.handle` (`github_capture.go:91-158`) gains the routing branch described in the Shared Contract's Routing mechanism section, inserted at the point that currently calls `w.store.UpdateGitHubCommitCapture(ctx, msg.CommitID, raw)` unconditionally (line 138). New worker file mirrors `github_draft.go`'s shape exactly (`NewXWorker`, `handle(ctx, key, value []byte) error`, `Start`, `Name`). Bootstrap wiring in `workers.go` alongside `draftGeneratorWorker`/`blogGeneratorWorker` (~lines 39-45, 58-59) — the new worker is constructed with the **same** `&p.draftGen` instance (`GenerateDraftFromShowcaseJob` is a sibling method on the existing `DraftGenerator`, not a new processor).

**Signatures:**
```go
// github_capture.go — CaptureResultStore interface gains:
UpdateShowcaseJobCapture(ctx context.Context, jobID uuid.UUID, captureOutput json.RawMessage) error
UpdateShowcaseJobFailed(ctx context.Context, jobID uuid.UUID, errMsg string) error

// github_showcase_draft.go
const TopicShowcaseDraftGenerate = "showcase.draft.generate"
type ShowcaseDraftGenerateEvent struct { JobID uuid.UUID `json:"job_id"` }
type ShowcaseDraftGenerator interface {
    GenerateDraftFromShowcaseJob(ctx context.Context, jobID uuid.UUID) error
}
func NewShowcaseDraftGeneratorWorker(brokers, groupID string, generator ShowcaseDraftGenerator, logger *observability.Logger) *ShowcaseDraftGeneratorWorker
func (w *ShowcaseDraftGeneratorWorker) handle(ctx context.Context, key, value []byte) error
func (w *ShowcaseDraftGeneratorWorker) Start(ctx context.Context) error
func (w *ShowcaseDraftGeneratorWorker) Name() string
```

**Behavior:**
- `CaptureResultWorker.handle` (modified): SHALL attempt `UpdateGitHubCommitCapture(ctx, msg.CommitID, raw)` first, unchanged. WHEN it returns `store.ErrNotFound` SHALL attempt `UpdateShowcaseJobCapture(ctx, msg.CommitID, raw)` (always called regardless of `msg.Success`, mirroring the github branch's existing unconditional-persist behavior). WHEN *that* also returns `store.ErrNotFound` SHALL log a warning and drop the message (no publish, no error returned — matches the existing worker's "don't crash the consumer loop" convention). On a successful showcase-branch write: WHEN `msg.Success` SHALL publish `ShowcaseDraftGenerateEvent{JobID: msg.CommitID}` onto `TopicShowcaseDraftGenerate`; WHEN `!msg.Success` SHALL additionally call `UpdateShowcaseJobFailed(ctx, msg.CommitID, msg.Error)` (transitions `drafting`→`failed` with the capture error recorded — AC6) and SHALL NOT publish downstream. The existing github branch's behavior (`DraftGenerateEvent`+`BlogGenerateEvent` gated on `msg.Success`) is completely unchanged.
- `ShowcaseDraftGeneratorWorker.handle`: SHALL unmarshal `ShowcaseDraftGenerateEvent`, call `generator.GenerateDraftFromShowcaseJob(ctx, event.JobID)`, log (not panic) on error — same shape as `DraftGeneratorWorker.handle`.

**Rules:** backend-architecture-rules:A-3, backend-error-rules:E-1

---

## F1 — Types + `useCreateShowcasePost` hook

**Files:** `webapp/src/types/showcasePost.ts` (new), `webapp/src/api/types/showcasePost.ts` (new), `webapp/src/api/transforms/showcasePost.ts` (new), `webapp/src/hooks/useCreateShowcasePost.ts` (new)

**Placement:** mirrors `types/post.ts` (domain, camelCase) + `api/types/post.ts` (`ApiXxx`, snake_case — required now that the endpoint response is confirmed snake_case, per Corrections above) + `api/transforms/post.ts` (`toXxx`) + `hooks/useDeletePost.ts`'s mutation-hook shape (`fetcher`-based, `loading`/`error` state, throws on failure).

**Signatures:**
```ts
// types/showcasePost.ts
export interface ShowcaseJob { jobId: string; status: "capturing"; }

// api/types/showcasePost.ts
export interface ApiShowcaseJob { job_id: string; status: string; }

// api/transforms/showcasePost.ts
export function toShowcaseJob(api: ApiShowcaseJob): ShowcaseJob;

// hooks/useCreateShowcasePost.ts
export function useCreateShowcasePost(): {
  createShowcasePost: (brief: string) => Promise<ShowcaseJob>;
  loading: boolean;
  error: string | null;
};
```

**Behavior:**
- `createShowcasePost`: SHALL `POST /api/protected/showcase-posts` with `{ brief }`, parse a `202` body through `toShowcaseJob`, and throw (propagating the parsed message) on any non-2xx — same `fetcher`/`ApiRequestError` convention `useDeletePost` already uses; no per-status branching inside the hook (the modal, F2, decides UI behavior from the thrown error).
- **Cast note:** `ShowcaseJob.status` is the literal type `"capturing"` (the only status this endpoint ever returns) while `ApiShowcaseJob.status` is a wire `string`; `toShowcaseJob` SHALL narrow it with an explicit `as ShowcaseJob["status"]` cast (or equivalent), not a plain assignment.

**Rules:** frontend-page-rules:S-3

---

## F2 — `CreateShowcasePostModal` + Posts page wiring

**Files:** `webapp/src/components/showcase-post/CreateShowcasePostModal.tsx` (new), `webapp/src/components/showcase-post/useCreateShowcasePostFlow.ts` (new), `webapp/src/routes/posts.tsx` (edit)   **Depends-on:** F1

**Placement:** `components/showcase-post/` mirrors `components/create-post/`'s co-located component+hook shape (not `components/patterns/`, which is reserved for resource-agnostic primitives like `ConfirmDeleteModal`/`AsyncList`). `posts.tsx`'s existing single `<Link to="/posts/new"><Button>...</Button></Link>` trigger (~lines 66-72) gets wrapped in a `Stack direction="row"` alongside a new `onClick`-driven Button that opens this modal (no navigation).

**Component/hook import paths:** Modal (`@/proto-design-system/components/overlays/Modal`), Stack (`@/proto-design-system/components/layout/Stack`), Button (`@/proto-design-system/components/primitives/Button`), TextArea (`@/proto-design-system/components/forms/TextArea` — has a built-in `errorMessage` prop that already renders `role="alert"` + `aria-invalid`/`aria-describedby`, used directly for AC3's inline error instead of a separate error element), `useBannerCenter` (`@/proto-design-system/components/feedback/BannerCenter`).

**Signatures:**
```ts
export interface CreateShowcasePostFlow {
  isOpen: boolean; brief: string; setBrief: (v: string) => void;
  isLoading: boolean; errorMessage: string | null;
  open: () => void; cancel: () => void; submit: () => Promise<void>;
}
export function useCreateShowcasePostFlow(): CreateShowcasePostFlow;
export function CreateShowcasePostModal({ flow }: { flow: CreateShowcasePostFlow }): JSX.Element;
```

**Behavior:**
- `useCreateShowcasePostFlow`: this is a **new interaction pattern** for this codebase — every existing mutation flow (`useConfirmableDelete`) always banners on error and always closes. AC2/AC3 require the opposite split: on success SHALL call `addBanner({type:"success", ...})`, close (`isOpen=false`), and clear `brief`; on failure SHALL set `errorMessage` from the thrown error, leave `isOpen=true`, and SHALL NOT banner. Sized for one instance per the composition-patterns skill (no premature generic `useMutationWithFeedback` extraction).
- `CreateShowcasePostModal`: title `"Create Showcase Post"` (becomes the dialog's accessible name via `aria-labelledby`), `size="sm"`, a single `TextArea` labeled `"Brief"` bound to `flow.brief`/`flow.setBrief` with `errorMessage={flow.errorMessage ?? undefined}`, footer `Stack` with a ghost `"Cancel"` button (`flow.cancel`) and a primary `"Generate"` button (`flow.submit`, `isLoading={flow.isLoading}`, disabled when `brief` is empty).

**Accessible-name contract (this repo has zero `data-testid` usage — confirmed by grep; every existing Playwright spec locates elements by role + accessible name, e.g. `page.getByRole("button", { name: /create post/i })`). Specs (F3) are written against these names, not test ids:**
- Trigger button: `"Create Showcase Post"`
- Dialog: accessible name `"Create Showcase Post"` (from `Modal`'s `title`)
- Textarea: accessible name `"Brief"` (from `TextArea`'s `label`)
- Buttons: `"Cancel"`, `"Generate"`

**Rules:** frontend-composition-rules — Pattern 5 (custom hooks for mutation+confirmation+toast flows), Pattern 8 (no hardcoded user-facing strings)

---

## F3 — E2E coverage: MSW handlers + Playwright spec

**Files:** `webapp/e2e/handlers/showcase.handlers.ts` (new), `webapp/e2e/handlers/index.ts` (edit — register in `handlers`/`endpoints`/`scenarios` aggregates, same 3-edit pattern as `postsHandlers`/`postsEndpoints`/`postsScenarios`), `webapp/e2e/showcase-post.spec.ts` (new)   **Depends-on:** F2

**Placement:** one file per domain (`webapp/e2e/handlers/<domain>.handlers.ts`), built via the shared `setupEndpoint(method, path, goodBody, options?)` helper (`webapp/e2e/helpers/endpoint.ts`) — returns a `{200/202, 400, 401, 403, 404, 409, 500, 503, transport}` handler-factory dict. Spec imports `{ test, expect }` from `webapp/e2e/fixtures/test.ts` and overrides per-scenario via the `network` fixture (`network.use(http.post(...))`) — never `page.route`.

**Endpoint table:** `POST /api/protected/showcase-posts` → 202 `{job_id, status}` | 400 | 401 | 403 | 500 | 503 | transport-error.

**Interaction × state table:**
| Scenario | Assertion |
|---|---|
| Trigger renders on `/posts` | `getByRole("button", {name: /create showcase post/i})` visible |
| Click trigger → modal opens | `getByRole("dialog", {name: /create showcase post/i})` visible; `getByRole("textbox", {name: /brief/i})` visible |
| Click Cancel | dialog closes; no POST fired |
| Submit → 202 | dialog closes; success banner visible; textarea cleared on reopen |
| Submit → 400/401/403/500/503 | dialog **stays open**; inline error text visible inside the dialog; no banner rendered |
| Submit → transport failure (`HttpResponse.error()`) | same as above — dialog open, inline error shown |

**Rules:** frontend-e2e-rules — Requirement 3 (table-drive across every status code), Requirement 5 (use the `network` fixture, never `page.route`)

---

## Self-Review

- [x] Every AC (1-7) maps to ≥1 ticket — see AC coverage line above
- [x] Shared contract internally consistent — fe `ApiShowcaseJob{job_id}` matches be `CreateShowcaseJobResponse{json:"job_id"}` matches db's underlying `showcase_jobs` row; `UpdateShowcaseJobCapture`'s signature is pinned identical to `UpdateGitHubCommitCapture` specifically so B5's routing type-checks
- [x] Every ticket has files, placement facts, signatures, rules, depends-on, AC refs
- [x] Every backend function has 1-2 behavior lines + error cases; F2 has an explicit accessible-name selector contract (adapted from the usual data-testid table — this repo has none, confirmed by grep) and F3 has full endpoint × interaction × state coverage
- [x] No code bodies — signatures, tables, and behavior lines only
- [x] Migration version resolved: `V0056` (confirmed against `ls migrations/`, nothing landed past `V0055` during research)
- [x] Nothing here re-implements shipped work — EP-001 (Shipped) is reused verbatim (`storybookClient.FetchIndex`, `CaptureRequest`/`CaptureResultMessage` shapes, `buildComponentDraftPrompt`'s sibling pattern, `SaveDraft`/media pipeline); zero `capture-worker` changes, confirmed
- [x] TRACKER.md epic row updated to Planned with this plan linked

**Flag for human confirmation:** B4 extends `github/processor`'s `DraftStore` interface with showcase-shaped store types (a cross-domain reference from the `github` package into `showcase`-owned concepts). This was a deliberate reuse-over-duplication call — the alternative is ~230 lines of copy-pasted media/AI-orchestration logic in a new package. Flagging so a reviewer can confirm this tradeoff before backend-supervisor builds it.
