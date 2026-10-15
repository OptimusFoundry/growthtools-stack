# Showcase Post from Brief — Tech Plan

**Epic:** MEER-26   **PRD:** docs/prds/2026-08-03-showcase-post-from-brief.md   **Scope:** full-stack (backend + webapp), reuses EP-001's capture pipeline end to end — **zero `capture-worker` changes**

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

## Tickets

1. MEER-36 — Migration + store: `showcase_jobs` CRUD
2. MEER-37 — AI package: brief→component resolver
3. MEER-38 — Showcase feature module: handler + processor + endpoint
4. MEER-39 — Draft assembly: showcase prompt + `GenerateDraftFromShowcaseJob`
5. MEER-40 — Workers: capture-result routing + showcase draft-generator worker
6. MEER-41 — Types + `useCreateShowcasePost` hook
7. MEER-42 — `CreateShowcasePostModal` + Posts page wiring
8. MEER-43 — E2E coverage: MSW handlers + Playwright spec
