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
| `pre-commit` | — | Run CI checks, auto-fix build/lint issues |

### sonnet — orchestrators + judgment
These agents coordinate other agents or need broad codebase understanding. Run individually.

| Agent | Task |
|-------|------|
| `backend-supervisor` | Execute a backend plan end-to-end: code → tests → build/vet/test → pre-commit → commit |
| `code-reviewer` | General code quality review |
| `backend-code-reviewer` | Go backend pattern validation |
| `code-reviewer-frontend` | React/TypeScript pattern validation |
| `backend-debug-helper` | Trace execution paths, identify root causes |
| `backend-go-specialist` | Idiomatic Go guidance, architectural patterns |
| `pr-prep` | Full pre-PR checklist across backend + frontend |
| `page-builder` | Scaffold new frontend pages/routes |
| `component-builder` | Build React design system components |
| `playwright-e2e` | Write exhaustive E2E test scenarios |
| `test-fixer` | Debug and fix failing tests |
| `style-checker` | Validate SCSS against design tokens |

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

All haiku agents read from `base-server/docs/`:

| Doc | Contents |
|-----|----------|
| `ARCHITECTURE.md` | Directory structure, naming, imports, DI, context |
| `ERROR-HANDLING.md` | Two-tier pattern, apierrors functions, handleError |
| `STORE.md` | sqlx patterns, nil-slice rule, soft deletes, migrations |
| `TESTING.md` | Three test levels, table-driven rules, running tests |
| `CONFIGURATION.md` | Env vars, build commands, Docker, security |
| `HANDLERS.md` | Request/response structs, handler/processor templates, routing |
| `KAFKA.md` | Producer, consumer/worker, bootstrap integration |
