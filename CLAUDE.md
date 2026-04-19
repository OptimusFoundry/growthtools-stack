# Growth Tools — Monorepo

AI-powered social media management platform.

## Repository Structure

```
growth-tools/
├── base-server/    # Go backend (API, auth, billing, store)
├── webapp/         # React frontend (Vite, TanStack Router, Proto Design System)
├── docs/           # Product docs (PRD, tracker, platform API specs)
└── .claude/        # Agent configs, settings, and dispatch guide
```

## Codebase-Specific Docs

- **Go backend conventions:** [base-server/CLAUDE.md](base-server/CLAUDE.md)
- **React frontend conventions:** [webapp/CLAUDE.md](webapp/CLAUDE.md)
- **UI kit design language (authoritative for any frontend change):** [docs/design-docs/](docs/design-docs/) — editorial serif-forward design system (Fraunces + Geist). Read `00-overview.md` first, then the numbered docs in order. `12-judgment.md`, `19-typography-decisions.md`, and `20-spacing-decisions.md` are the prescriptive decision guides.
- **Component reference & design tokens:** [webapp/docs/DESIGN-GUIDELINES.md](webapp/docs/DESIGN-GUIDELINES.md)
- **Commit message convention:** [COMMITS.md](COMMITS.md) — Conventional Commits, enforced by the `.githooks/commit-msg` hook. Run `./.githooks/install.sh` once per clone to activate.

## Plugins & Skills

> **IMPORTANT:** At the start of every session, check what skills and MCP tools are available and use them throughout.

- **Superpowers skills** — invoke with the `Skill` tool. Check available skills before starting any task; there is likely a skill that applies. Key skills: `superpowers:writing-plans`, `superpowers:using-git-worktrees`, `superpowers:finishing-a-development-branch`.
- **Backend subagent coordination** — for Go backend work, use `backend-subagent-development` instead of `superpowers:subagent-driven-development`. It dispatches backend-* agents in parallel batches by phase (code agents first, then test agents), which is safe because agents write to isolated files.
- **Language Server (LSP)** — use the `LSP` tool for precise Go and TypeScript navigation: go-to-definition, find-references, type information. Prefer this over grep when exploring types or tracing call chains. **LSP is a deferred tool** — load it once per session with `ToolSearch(query: "select:LSP", max_results: 1)` before first use. Pass the same instruction to any subagent you dispatch that will navigate code.
- **Browser automation** — `mcp__claude-in-chrome__*` tools available for testing frontend features in a real browser. Use for verifying UI changes end-to-end.
- **Playwright MCP** — `mcp__plugin_playwright_*` tools for browser automation and E2E verification.

When in doubt, run `ToolSearch` to discover available tools for a task before doing it manually.

## Agent Dispatch

- **Dispatch guide:** [.claude/agents/README.md](.claude/agents/README.md) — read this before spinning up agents. Lists every agent, its model tier (haiku/sonnet/opus), which docs it reads, and parallelisation rules.

> **IMPORTANT — implementation workflow (always three steps):**
>
> **Step 0 — Isolate:** Use the `superpowers:using-git-worktrees` skill to create an isolated git worktree before ANY work begins — features, bugfixes, refactors, migrations, or config changes. Never work directly on `main`.
>
> **Step 1 — Architect:** Use `plan-writer` to investigate the PRD, tracker, and docs, then produce a detailed implementation plan (DB changes, API contracts, UI changes). Only reads code to fill specific gaps the docs don't cover.
>
> **Step 2 — Execute:** Choose the right executor for the plan:
> - Full-stack feature (both layers) → dispatch `fullstack-supervisor` agent
> - Backend-only → invoke `backend-subagent-development` skill (stays in main session, batches haiku agents directly)
> - Frontend-only → dispatch `frontend-supervisor` agent
>
> Never write code directly. Always isolate in a worktree first, then architect, then supervise.

### Backend agents (`backend-*` prefix)
Haiku — batch freely (pattern-backed, read docs then execute):

| Agent | Task |
|-------|------|
| `backend-feature-scaffold` | Scaffold new handler/processor/store module |
| `backend-api-endpoint` | Add endpoint to existing feature |
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
| `backend-code-reviewer` | Go backend pattern validation |
| `backend-debug-helper` | Trace execution paths, root cause analysis |
| `backend-go-specialist` | Idiomatic Go + architectural guidance |

### Frontend agents (`frontend-*` prefix)
Sonnet — run individually (judgment required):

| Agent | Task |
|-------|------|
| `frontend-supervisor` | Execute a full plan end-to-end: code → tests → build/lint → pre-commit → commit |
| `frontend-page-builder` | Scaffold routes, pages, tabs, and forms |
| `frontend-component-builder` | Build React 19 design system components |
| `frontend-e2e-test-writer` | Write exhaustive Playwright E2E tests |
| `frontend-code-reviewer` | React/TypeScript/design-system pattern validation |

Haiku — batch freely:

| Agent | Task |
|-------|------|
| `frontend-style-checker` | Validate SCSS against design tokens |
| `frontend-test-fixer` | Fix failing frontend tests |

### Other agents
- `pre-commit` (haiku) — CI checks for both backend + frontend
- `pr-prep`, `code-reviewer`, `security-auditor` (sonnet/opus) — cross-cutting

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
- **Design System:** 50+ components in `webapp/src/proto-design-system/`
- **Styling:** SCSS Modules with design tokens (never hardcode values)
- **Linting:** Biome (code) + Stylelint (SCSS)
- **Build:** `cd webapp && npm run build`
- **Lint:** `cd webapp && npm run lint && npm run lint:scss`

### Key Conventions

- **Frontend:** Use existing design system components, design tokens, SCSS modules, no barrel exports, no `any`, no inline styles
- **Backend:** Use `apierrors` for all HTTP errors, context propagation everywhere, soft deletes with `deleted_at`, UUID primary keys, parameterized SQL
- **Both:** Constructor-based DI, structured logging, no secrets in code
