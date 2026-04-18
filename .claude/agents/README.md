# Agent Dispatch Guide

Quick reference for the orchestrator. Before dispatching parallel agents, read this to know which model to assign and which agents can be batched.

## Model Tiers

### haiku — batch freely
These agents read a doc then execute a mechanical task. Safe to fire in parallel — each touches isolated files.

| Agent | Reads | Task |
|-------|-------|------|
| `backend-api-endpoint` | `docs/HANDLERS.md`, `docs/ERROR-HANDLING.md` | Add endpoint to existing feature |
| `backend-error-handler` | `docs/ERROR-HANDLING.md` | Add error type + handleError mapping |
| `backend-feature-scaffold` | `docs/ARCHITECTURE.md`, `docs/HANDLERS.md`, `docs/ERROR-HANDLING.md`, `docs/STORE.md` | Scaffold complete handler/processor/store for new feature |
| `backend-store-crud` | `docs/STORE.md` | Add CRUD methods to store layer |
| `backend-migration-gen` | `docs/STORE.md` | Generate Flyway SQL migration |
| `backend-unit-test-writer` | `docs/TESTING.md` | Write processor + handler unit tests (gomock) |
| `backend-store-test-writer` | `docs/TESTING.md` | Write store-layer tests against real Postgres |
| `backend-integration-test-writer` | `docs/TESTING.md` | Write real-HTTP integration tests |
| `backend-kafka-integration` | `docs/KAFKA.md`, `docs/ARCHITECTURE.md` | Add Kafka producer + consumer/worker |
| `backend-test-scaffold` | `docs/TESTING.md` | Determine and generate tests at all levels |
| `frontend-style-checker` | `webapp/docs/DESIGN-GUIDELINES.md` | Validate SCSS against design tokens |
| `frontend-test-fixer` | `webapp/docs/REACT19-PATTERNS.md`, `webapp/docs/TESTING-PATTERNS.md` | Fix failing frontend tests |
| `pre-commit` | — | Run CI checks, auto-fix build/lint issues |

### sonnet — orchestrators + judgment
These agents coordinate other agents or need broad codebase understanding. Run individually.

| Agent | Task |
|-------|------|
| `backend-supervisor` | Execute a backend plan end-to-end: code → tests → build/vet/test → pre-commit → commit |
| `frontend-supervisor` | Execute a frontend plan end-to-end: code → tests → build/lint → pre-commit → commit |
| `code-reviewer` | General code quality review |
| `backend-code-reviewer` | Go backend pattern validation |
| `frontend-code-reviewer` | React/TypeScript/design-system pattern validation |
| `backend-debug-helper` | Trace execution paths, identify root causes |
| `backend-go-specialist` | Idiomatic Go guidance, architectural patterns |
| `pr-prep` | Full pre-PR checklist across backend + frontend |
| `frontend-page-builder` | Scaffold new routes, pages, tabs, and forms |
| `frontend-component-builder` | Build React 19 design system components |
| `frontend-e2e-test-writer` | Write exhaustive Playwright E2E tests |

### opus — use sparingly
Deep expertise tasks. Run one at a time.

| Agent | Task |
|-------|------|
| `security-auditor` | OWASP security audit |

---

## Parallelisation Rules

1. **haiku agents are always safe to batch** — they read docs then write isolated files. Fire as many as needed in one `Agent` tool call batch.
2. **sonnet agents run individually** — they explore the codebase broadly; parallel runs waste context and may conflict.
3. **opus runs alone** — expensive; only one at a time.
4. **Mixed-tier work**: dispatch all haiku tasks first in one batch, then sonnet tasks sequentially.

## Docs Reference

Backend haiku agents read from `base-server/docs/`:

| Doc | Contents |
|-----|----------|
| `ARCHITECTURE.md` | Directory structure, naming, imports, DI, context |
| `ERROR-HANDLING.md` | Two-tier pattern, apierrors functions, handleError |
| `STORE.md` | sqlx patterns, nil-slice rule, soft deletes, migrations |
| `TESTING.md` | Three test levels, table-driven rules, running tests |
| `CONFIGURATION.md` | Env vars, build commands, Docker, security |
| `HANDLERS.md` | Request/response structs, handler/processor templates, routing |
| `KAFKA.md` | Producer, consumer/worker, bootstrap integration |

Frontend agents read from `webapp/docs/`:

| Doc | Contents |
|-----|----------|
| `ARCHITECTURE.md` | Feature module structure, routes, hooks, API layer, contexts |
| `COMPONENT-PATTERNS.md` | React 19 patterns, SCSS template, Storybook template |
| `REACT19-PATTERNS.md` | New APIs, deprecated patterns, testing patterns |
| `DESIGN-GUIDELINES.md` | Component reference (50+ components), design token tables |
| `PATTERNS.md` | Page composition: shell, heading, section, empty state rhythm |
| `PAGE-TEMPLATES.md` | Copy-paste scaffolds for 4 page shapes |
| `TESTING-PATTERNS.md` | Vitest, RTL, Playwright, MSW patterns |
