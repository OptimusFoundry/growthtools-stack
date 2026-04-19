# Go Base Server

## Commands

```bash
go build ./...               # Build
go test ./...                # All unit tests
make dev-up                  # Start Docker services (DB, Kafka)
make dev-test-unit           # Unit tests (mocked, no deps)
make dev-test-store          # Store tests (needs dev-up)
make dev-test-integration    # Integration tests (needs dev-up; server is in-process)
make docker-test-all         # Full isolated run (matches CI)
go run main.go               # Run server locally
```

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
