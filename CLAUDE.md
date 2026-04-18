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
- **Design system & component patterns:** [webapp/docs/DESIGN-GUIDELINES.md](webapp/docs/DESIGN-GUIDELINES.md)
- **Commit message convention:** [COMMITS.md](COMMITS.md) — Conventional Commits, enforced by the `.githooks/commit-msg` hook. Run `./.githooks/install.sh` once per clone to activate.

## Agent Dispatch

- **Dispatch guide:** [.claude/agents/README.md](.claude/agents/README.md) — read this before spinning up agents. Lists every agent, its model tier (haiku/sonnet/opus), which docs it reads, and parallelisation rules.

> **IMPORTANT:** For any backend implementation task (new feature, endpoint, migration, etc.), ALWAYS use the `backend-supervisor` agent. Never implement backend code directly — dispatch `backend-supervisor` with the plan and let it orchestrate code, tests, quality checks, and commit.

> **IMPORTANT:** For any frontend implementation task (new page, component, feature, etc.), ALWAYS use the `frontend-supervisor` agent. Never implement frontend code directly — dispatch `frontend-supervisor` with the plan and let it orchestrate code, tests, build/lint checks, and commit.

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
