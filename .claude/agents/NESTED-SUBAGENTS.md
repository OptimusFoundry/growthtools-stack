# Nested Subagents — Depth Budget & Usage

Companion to [README.md](./README.md) (the dispatch guide). Read that first for the agent
roster and model tiers; this doc covers **how subagents spawn their own subagents** and how we
use that in this repo.

## What the feature is

As of Claude Code **v2.1.172** (June 2026), a subagent dispatched via the `Agent` tool can
itself dispatch further subagents, **up to 5 levels deep**:

```
main → L1 → L2 → L3 → L4 → L5
```

- **Hard floor at depth 5** — an agent at L5 has its `Agent` tool revoked and cannot spawn.
- **The gate is the `Agent` tool in frontmatter.** Only agents whose `tools:` list includes
  `Agent` can spawn children. You can restrict *which* types with
  `tools: Agent(backend-supervisor, frontend-supervisor)`.
- **Context is isolated per level; only the top result bubbles up.** A spawned agent starts
  with a fresh context (its task message only) — it does *not* inherit the parent's history
  (a `fork` is the exception). Only the agent's final summary returns to its parent, and only
  the parent sees it. **main never sees the leaves.**
- **No documented concurrency or total-agent cap** — token cost is the real constraint.
- Background subagents have their **depth frozen when first spawned**; resuming one later does
  not grant new nesting levels.

Relevant history: v2.1.181 fixed foreground agents spawning unbounded chains (now respect the
5-level limit); v2.1.187 fixed depth tracking on resumed/forked agents.

## Which agents can spawn (this repo)

The coordinators, reviewers, and auditors carry the `Agent` tool — each **restricted via `Agent(...)`** to exactly the children listed, so a spawner can't be redirected into an unexpected spawn-capable agent:

| Agent | Level it runs at | Spawns |
|-------|------------------|--------|
| `feature-manager` | L1 | `plan-writer`, `plan-critic`, `backend-supervisor`, `frontend-supervisor`, `code-explorer` |
| `backend-supervisor` | L2 (or L1, dispatched directly) | `backend-*` workers |
| `frontend-supervisor` | L2 (or L1, dispatched directly) | `frontend-*` workers |
| `ios-supervisor` | L1 (dispatched directly — no `feature-manager` integration) | `ios-*` scaffolders, `ios-code-reviewer`, `ios-mockups-screen-builder`, `audit-checker`, `ios-code-explorer` |
| `ios-plan-writer` | L1 (dispatched directly) | `ios-code-explorer` |
| `ios-plan-critic` | L1 (dispatched directly) | `ios-code-explorer` |
| `ios-code-reviewer` | L2 (dispatched by `ios-supervisor` or `code-reviewer`) | `ios-code-explorer` |
| `prod-debug` | L1 | `prod-db-query`, `prod-logs`, `code-explorer` |
| `plan-writer` | L1/L2 | `plan-researcher` ×3, `code-explorer` |
| `code-reviewer` | L1 | `backend-code-reviewer`, `frontend-code-reviewer`, `ios-code-reviewer` |
| `backend-code-reviewer` / `frontend-code-reviewer` | L2 | `review-checker` ×N (one per changed file) |
| `plan-critic` | L1 | `audit-checker` ×dimensions |
| `test-auditor` | L1 | `audit-checker` ×test files |
| `consistency-auditor` | L1 | `audit-checker` ×rules |
| `frontend-a11y-auditor` | L1 | `frontend-a11y-checker` ×pages |
| `codemod-supervisor` | L1 | `codemod-worker` ×modules, `code-explorer` |
| `pr-supervisor` | L1 | `code-reviewer`, `test-auditor`, `consistency-auditor`, `frontend-a11y-auditor` |
| `epic-supervisor` | L1 | `feature-manager` ×N (each in a worktree) |

Every other agent — the leaf workers and checkers (`audit-checker`, `frontend-a11y-checker`,
`review-checker`, `codemod-worker`, `plan-researcher`, `code-explorer`, `ios-code-explorer`, the
`backend-*`/`frontend-*` workers, `prod-db-query`/`prod-logs`) — has **no `Agent` tool**, deliberately,
so the tree cannot deepen unpredictably.

**iOS now follows the same shape as backend/frontend.** `ios-supervisor` carries the `Agent` tool and
dispatches the `ios-*` scaffolders itself — `main → ios-supervisor (L1) → scaffolders (L2)`, the same
depth as a directly-dispatched `backend-supervisor`/`frontend-supervisor` tree. The one difference:
nothing dispatches `ios-supervisor` the way `feature-manager` dispatches the other two supervisors —
there's no `feature-manager` integration for iOS yet (see README.md's "Known limitations for this
repo's shape"), so `ios-supervisor` is always an L1, direct dispatch. See the dispatch guide's
[iOS Roster](./README.md#ios-roster-native-track) for the iOS model tiers and parallelization rules.

## The depth budget

The deepest build tree (the epic path) reaches **L4**, leaving 1 spare:

```
L0  main (you)                 architect + reviewer
L1  epic-supervisor            (or feature-manager directly, for a single feature → shift up one)
L2  feature-manager            PRD → spec (plan-writer/plan-critic) → build; one per feature (worktree)
L3  backend-supervisor  /  frontend-supervisor      fan out by phase
L4  workers (sonnet)           scaffold, store-crud, unit-test, page-builder, e2e-writer …
L5  ── hard floor ──
```

A **single** feature dispatched directly runs `feature-manager` at L1 → supervisors L2 → workers L3 (shallower). `prod-debug` (L1) → `prod-db-query`/`prod-logs`/`code-explorer` (L2) is a separate, shallow tree.

## How we use it

### Pattern A — Let the tree run (default for a single feature)
Dispatch **one** `feature-manager` with a PRD path and let it cascade PRD → spec → build instead
of micromanaging `plan-writer` + supervisors from L0. Because only summaries bubble up, main's
context stays clean and main stays the architect/reviewer. This is what the CLAUDE.md "never write
code directly, supervise" workflow always wanted — nesting is what makes it real.

### Pattern B — Top-level fan-out across independent features (biggest win)
For an epic of N independent features, dispatch **`epic-supervisor`** — it runs **N
`feature-manager`s in parallel**, each in its **own git worktree** (`isolation: worktree`), each
owning PRD → spec → build for its feature. Genuine feature-level parallelism — previously
impossible, because a subagent could not spawn its own workers.

### Pattern C — Spend the spare levels on self-verification, not deeper fan-out
The valuable use of L4 is **review that itself fans out** — now wired. `code-reviewer` (full-stack)
dispatches `backend-code-reviewer` + `frontend-code-reviewer` in parallel; each layer reviewer, for a
changeset over ~3 files, fans out one `review-checker` per file (handler, processor, store, migration
reviewed concurrently), then synthesises + dedupes + ranks. The `Agent` tool is granted **only to the
reviewers**, never to leaf workers, so the tree can't deepen unpredictably. For small diffs the
reviewers review inline — no fan-out overhead.

## Guardrails

- **Fan out only at leaves (workers); verify only above them.** 5 levels × wide fan-out is
  exponential cost. Keep width at L3, not at L1–L2.
- **Do not grant `Agent` to worker agents.** Only coordinators (and, opt-in, reviewers) should
  have it.
- **Deep failures do not surface** — only top summaries return. Require supervisors to
  *explicitly* surface failures in their summary, or main will claim a success it cannot see.
- **Use worktrees for parallel L1 supervisors**, or they will fight over the same files.
- **Background agent depth is frozen on spawn** — plan the tree shape up front; you cannot
  deepen it by resuming later.
- **A backgrounded child loses `LSP` tool access entirely, in this Claude Code version** — even when
  `LSP` is in its granted `tools:` list. `ios-code-explorer`, `code-explorer`, `audit-checker`,
  `review-checker`, `plan-researcher`, `codemod-worker`, and most of the `backend-*`/`frontend-*`/
  `ios-*` build-cell workers and reviewers in the table above hold `LSP` — every spawn edge into one
  of them must set `run_in_background: false`. This is orthogonal to the depth budget: a foreground
  dispatch still counts one level deeper same as a backgrounded one, and several foreground `Agent`
  calls sent in one message still run concurrently — foreground only changes whether the parent turn
  blocks for the result instead of getting a later completion notification. See README.md's
  "Parallelisation Rules" #5 and each agent's own "Dispatch discipline" section.

## Loops & scheduling — driving the tree over time

A nested tree runs once per dispatch. To run it **repeatedly, unattended, or until a condition
holds**, pair it with one of Claude Code's four loop mechanisms (all verified against
`code.claude.com/docs`). They are distinct — do not conflate them.

| Mechanism | Runs on | Needs open session | Advances when | Min interval |
|-----------|---------|--------------------|---------------|--------------|
| `/loop` | your machine | yes | timer fires | 1 min |
| dynamic `/loop` (self-paced) | your machine | yes | Claude picks (1 min–1 hr) | — |
| Routine (`/schedule`) | Anthropic cloud | **no** | cron / API / GitHub event | 1 hour (cron) |
| `/goal` | your machine | yes | prev turn finishes; stops when a fast evaluator confirms the condition | — |

- **`/loop 5m <prompt>`** — re-runs a prompt while your session is open and idle. Session-scoped
  (restores on `--resume` within a 7-day TTL), max 50 tasks/session, deterministic jitter on
  fixed intervals. You can loop a skill: `/loop 20m /review-pr 1234`. Omit the interval and
  Claude self-paces — often via the `Monitor` tool (streams a background script back) instead of
  re-prompting, which avoids polling and is more token-efficient.
- **Routine (`/schedule`)** — a saved config (prompt + repos + connectors) that runs on
  Anthropic-managed cloud, machine off, no session. Triggers: 5-field cron (**min 1 hour**), HTTP
  POST + bearer token, or GitHub PR/release events. Runs autonomously. Research preview.
- **`/goal <condition>`** — keeps working turn-by-turn until a separate fast evaluator model
  confirms the condition, then clears itself. Not time-based.

### How this pairs with the nested tree

- **Routine as the top of a Pattern-B tree (biggest fit).** A nightly/weekly cron routine, or a
  GitHub-triggered one, dispatches `pr-supervisor` or a `feature-manager` per queued feature —
  each fanning out its own 3-level tree, fully unattended. This is the only way to run the tree
  without your machine on.
- **`/goal` to drive a supervisor to green.** `/goal "build, vet, tests, and lint all pass"`
  paired with a supervisor run keeps it iterating until the quality gates hold, with the
  evaluator in a separate context.
- **`/loop` (or `Monitor`) to babysit while the tree runs** — e.g. watch CI on the branch a
  supervisor just pushed. Don't poll for work the harness will notify you about; prefer `Monitor`
  or a GitHub/channel trigger.

**Gotchas:** `/loop` is forced to a fixed 10-min schedule on Bedrock/Vertex/Foundry; `Esc`
during a wait cancels the next wake-up; fixed intervals keep the prompt cache warm while dynamic
+ `Monitor` is the efficient path.

## Related

- [README.md](./README.md) — agent roster, model tiers, parallelisation rules
- Managers (`feature-manager`, `epic-supervisor`, `backend-supervisor`, `frontend-supervisor`, `ios-supervisor`) — the single source of truth for how the tree batches workers and runs quality gates
- `frontend-composition-rules`, `frontend-e2e-rules` — quality gates the frontend tree
  enforces at L2/L3
