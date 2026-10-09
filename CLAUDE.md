# Growth Tools — Monorepo

AI-powered social media management platform.

## Repository Structure

```
growth-tools/
├── base-server/    # Go backend (API, auth, billing, store)
├── webapp/         # React frontend (Vite, TanStack Router, quiet design system)
├── docs/           # Product docs (PRD, tracker, platform API specs)
└── .claude/        # Agent configs, settings, and dispatch guide
```

## Codebase-Specific Docs

- **Go backend conventions:** [base-server/CLAUDE.md](base-server/CLAUDE.md)
- **React frontend conventions:** [webapp/CLAUDE.md](webapp/CLAUDE.md)
- **UI design language & component reference (authoritative for any frontend change):** quiet (`@optimusfoundry/quiet`) ships its own docs at `webapp/vendor/quiet/DESIGN.md` and `docs/guidelines/` (present after `npm install` in `webapp/`); the `quiet-app` skill is the procedure for laying out a screen. The app ships quiet's built-in `foundry` / `foundry-dark` themes with a light/dark toggle — no theme picker, no product theme. Template-only patterns (app shell, `AsyncList`, gating, `useNotify`, `AppIcon`, `RouterLink`) are in [webapp/docs/TEMPLATE-PATTERNS.md](webapp/docs/TEMPLATE-PATTERNS.md).
- **Commit message convention:** [COMMITS.md](COMMITS.md) — Conventional Commits, enforced by the `.githooks/commit-msg` hook. Run `./.githooks/install.sh` once per clone to activate.

## Plugins & Skills

> **IMPORTANT:** At the start of every session, check what skills and MCP tools are available and use them throughout.

- **Superpowers skills** — invoke with the `Skill` tool. Check available skills before starting any task; there is likely a skill that applies. Key skills: `superpowers:writing-plans`, `superpowers:using-git-worktrees`, `superpowers:finishing-a-development-branch`.
- **Backend subagent coordination** — for Go backend work, dispatch the `backend-supervisor` agent. It orchestrates backend-* workers in parallel batches by phase (code agents first, then test agents — safe because they write to isolated files), runs the build/vet/test gate + pre-commit, and commits.
- **Frontend composition patterns** — for any webapp page/feature work (CRUD lists, forms, detail views, routes), invoke `frontend-composition-rules` **before coding**. Enforces slot-based shells, custom-hook extraction (`useConfirmableDelete`), config-driven status maps, and bans nested render ternaries + hardcoded inline strings. Pair with `frontend-e2e-rules`.
- **quiet UI** — for laying out or reshaping any screen, load the `quiet-app` skill first (quiet's setup, layout procedure, and the `npx quiet-audit` check before finishing); `.claude/rules/webapp-skills.md` maps each kind of webapp change to its rule skill.
- **Language Server (LSP)** — use the `LSP` tool for precise Go and TypeScript navigation: go-to-definition, find-references, type information. Prefer this over grep when exploring types or tracing call chains. **LSP is a deferred tool** — load it once per session with `ToolSearch(query: "select:LSP", max_results: 1)` before first use. Pass the same instruction to any subagent you dispatch that will navigate code.
- **Browser automation** — `mcp__claude-in-chrome__*` tools available for testing frontend features in a real browser. Use for verifying UI changes end-to-end.
- **Playwright MCP** — `mcp__plugin_playwright_*` tools for browser automation and E2E verification.

When in doubt, run `ToolSearch` to discover available tools for a task before doing it manually.

> **Agent routing is hook-enforced.** `.claude/hooks/agent-routing-guard.py` runs on every `Agent`/`Task` dispatch and checks it against `.claude/agents/routing.yml`; `.claude/hooks/lsp-hint.py` nudges `Bash`/`Grep`/`Read` calls toward `LSP` when the query is symbol-shaped. Both are wired up in `.claude/settings.json`.

## Agent Dispatch

- **Dispatch guide:** [.claude/agents/README.md](.claude/agents/README.md) — read this before spinning up agents. Lists every agent, its model tier (sonnet/opus), which docs it reads, and parallelisation rules. Spawn tree: [.claude/agents/NESTED-SUBAGENTS.md](.claude/agents/NESTED-SUBAGENTS.md).
- Agents are grouped into department subfolders (`engineering/` — with `backend/` + `frontend/` build cells, the plan/spec cell, and shared tools; `qa/` — all review + audit; `ops/` — prod debugging) but are dispatched by `name`, so the folders don't affect invocation. `engineering/ios/` ships in this harness for template parity but has no applicable target in this repo (no `ios/` track) — ignore it.

> **IMPORTANT — implementation workflow (always three steps):**
>
> **Step 0 — Isolate:** Use the `superpowers:using-git-worktrees` skill to create an isolated git worktree before ANY work begins — features, bugfixes, refactors, migrations, or config changes. Never work directly on `main`.
>
> **Step 1 — Architect:** Capture the feature as a PRD with the `shared-writing-prds` skill (interactive; writes `docs/prds/<feature>.md` + an epic row in `docs/TRACKER.md`). Then dispatch `plan-writer` on that PRD path — it orchestrates parallel `plan-researcher` subagents (db/api/fe) to resolve each layer's contract and synthesizes a **code-free** tech plan (contracts + signatures, no code bodies) with a ticket table.
>
> **Step 2 — Execute:** Choose the right executor for the plan:
> - Full-stack feature (both layers), from a PRD → dispatch `feature-manager` agent (PRD → tech spec → build); for many features at once → `epic-supervisor`
> - Backend-only → dispatch `backend-supervisor` agent
> - Frontend-only → dispatch `frontend-supervisor` agent
>
> Never write code directly. Always isolate in a worktree first, then architect, then supervise.

### Backend agents (`engineering/backend/`)
Haiku/sonnet — batch freely (pattern-backed, read docs then execute):

| Agent | Task |
|-------|------|
| `backend-feature-scaffold` | Scaffold new handler/processor/store module |
| `backend-api-endpoint` | Add endpoint to existing feature |
| `backend-code-editor` | Targeted edits to existing backend code |
| `backend-error-handler` | Add error types + handleError mapping |
| `backend-store-crud` | Add store CRUD methods |
| `backend-migration-gen` | Generate Flyway SQL migration |
| `backend-unit-test-writer` | Write processor + handler unit tests |
| `backend-store-test-writer` | Write store-layer tests |
| `backend-integration-test-writer` | Write real-HTTP integration tests |
| `backend-test-scaffold` | Generate tests at all levels |
| `backend-kafka-integration` | Add Kafka producer + consumer/worker |

Sonnet — run individually (judgment required):

| Agent | Task |
|-------|------|
| `backend-supervisor` | Execute a full plan end-to-end: code → tests → build/vet/test → pre-commit → commit |
| `backend-debug-helper` | Trace execution paths, root cause analysis |
| `backend-go-specialist` | Idiomatic Go + architectural guidance |

### Frontend agents (`engineering/frontend/`)
Sonnet — run individually (judgment required):

| Agent | Task |
|-------|------|
| `frontend-supervisor` | Execute a full plan end-to-end: code → tests → build/lint → pre-commit → commit |
| `frontend-page-builder` | Scaffold routes, pages, tabs, and forms |
| `frontend-component-builder` | Build React 19 design system components |
| `frontend-code-editor` | Targeted edits to existing frontend code |
| `frontend-theme-designer` | Create or refine a quiet product theme (none today — the app ships `foundry` / `foundry-dark`) |
| `frontend-e2e-test-writer` | Write exhaustive Playwright E2E tests |

Haiku — batch freely:

| Agent | Task |
|-------|------|
| `frontend-style-checker` | Validate SCSS against design tokens |
| `frontend-test-fixer` | Fix failing frontend tests |

### Plan/spec cell (`engineering/`)
- `plan-writer`, `plan-critic`, `plan-researcher` — PRD → code-free tech plan, with an adversarial critique pass
- `feature-manager`, `epic-supervisor` — end-to-end PRD → spec → build orchestration
- `codemod-supervisor`, `codemod-worker`, `code-explorer` — repo-wide mechanical refactors
- `node-service-code-editor` — edits outside base-server/webapp (e.g. capture-worker)

### QA agents (`qa/`)
- `code-reviewer`, `backend-code-reviewer`, `frontend-code-reviewer` — pattern validation
- `security-auditor` — OWASP-focused review
- `consistency-auditor`, `audit-checker`, `review-checker` — cross-cutting consistency + review-quality gates
- `frontend-a11y-auditor`, `frontend-a11y-checker` — accessibility
- `test-auditor` — test-coverage gaps
- `pr-prep`, `pr-supervisor` — pre-PR checklist and PR orchestration

### Ops agents (`ops/`)
- `prod-debug` (coordinator), `prod-db-query`, `prod-logs` — production investigation, dispatched via `prod-debug` only

### Other
- `pre-commit` (`engineering/pre-commit.md`) — CI checks for both backend + frontend

## Quick Reference

### Backend (`base-server/`)

- **Language:** Go with Gin, sqlx, PostgreSQL
- **Architecture:** Handler → Processor → Store (three-layer DI)
- **Auth:** JWT + Google OAuth, cookie-based sessions
- **Billing:** Stripe (products, subscriptions, checkout, webhooks)
- **Error handling:** Two-tier — processors log details, handlers map to `apierrors` responses
- **Build:** `cd base-server && go build ./...`
- **Test:** `cd base-server && go test ./...`

### Frontend (`webapp/`)

- **Stack:** React 19, Vite 7, TypeScript 5.9 (strict), TanStack Router
- **Design System:** quiet (`@optimusfoundry/quiet`, repo `OptimusFoundry/quiet`), imported from `@optimusfoundry/quiet` with no deep imports
- **Styling:** SCSS Modules on quiet `--q-*` tokens (never hardcode values)
- **Linting:** Biome (code) + Stylelint (SCSS)
- **Build:** `cd webapp && npm run build`
- **Lint:** `cd webapp && npm run lint && npm run lint:scss`

### Key Conventions

- **Frontend:** Use quiet components and `--q-*` tokens, SCSS modules, no barrel exports, no `any`, no inline styles
- **Backend:** Use `apierrors` for all HTTP errors, context propagation everywhere, soft deletes with `deleted_at`, UUID primary keys, parameterized SQL
- **Both:** Constructor-based DI, structured logging, no secrets in code
