# Go Base Server

## Commands

```bash
go build ./...               # Build
go test -short ./...         # Unit tests (no deps)
make dev-up                  # Start local dev stack (DB, Kafka, migrations)
make dev-run                 # Run server + Stripe listener (hivemind)
make test-up                 # Start isolated test stack
make test                    # Run all tests against test stack (up → run → down)
make test-down               # Stop test stack (for cleanup after a failed run)
```

Makefile scope is local dev only — CI invokes `go test` and `docker compose` directly and does not depend on these targets.

## Architecture

Handler → Processor → Store (three-layer DI, all constructor-injected)

- **Handler** (`internal/{feature}/handler/`): HTTP in/out only. `ShouldBindJSON` for validation. `handleError` method maps processor errors to `apierrors` responses.
- **Processor** (`internal/{feature}/processor/`): Business logic. Defines a minimal store interface. Package-level `ErrXxx` variables. Enriches context before logging.
- **Store** (`internal/infra/store/`): sqlx DB ops. Pointer receivers. SQL constants. Soft deletes (`deleted_at IS NULL`). `make([]T, 0)` for list results.

## Key Rules

- **Errors:** Use `internal/infra/apierrors` for ALL HTTP errors — never `c.JSON` with raw errors.
- **Lists:** Initialize with `make([]T, 0)`, never `var`. A nil slice serializes as JSON `null`.
- **Update/Delete:** Always check `RowsAffected()` — return `ErrNotFound` if zero.
- **Tests:** Table-driven always. `t.Parallel()` everywhere. gomock only (no hand-rolled mocks).
- **Context:** Pass and enrich through every call. Use `observability.WithFields`.

## Docs

- [Architecture & patterns](docs/ARCHITECTURE.md) — directory structure, naming, DI, context
- [Error handling](docs/ERROR-HANDLING.md) — two-tier pattern, apierrors reference
- [Store & DB patterns](docs/STORE.md) — sqlx patterns, nil-slice gotcha, migrations
- [Testing (3 levels)](docs/TESTING.md) — store/unit/integration tests, running tests
- [Config & deployment](docs/CONFIGURATION.md) — env vars, build, Docker, security
