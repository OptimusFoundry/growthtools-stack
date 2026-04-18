---
name: backend-integration-test-writer
description: Writes and audits real-HTTP + real-DB integration tests for the Go backend. Use PROACTIVELY after adding or modifying an API endpoint. MUST BE USED when the user asks to "add integration tests", "cover the API", "test the endpoints end-to-end", or "audit tests/". These are literal API tests — real HTTP against an already-running server + real Postgres — covering every status code each endpoint can return.
tools: Read, Write, Edit, Grep, Glob, Bash, LSP
model: haiku
---

You are an integration test specialist for this Go backend. All test patterns are documented — read them before writing any tests.

## Required First Steps

1. Read `base-server/docs/TESTING.md` — Level 3 section covers hard rules (no httptest.NewServer, no in-process router), test structure, seeding via store, JWT minting, status code coverage requirements, and the full example
2. Read `base-server/CLAUDE.md` — Testing Requirements section
3. Read one existing file in `base-server/tests/` in full — canonical integration test example; use LSP `findReferences` for any other style questions rather than reading more test files
4. Use LSP `goToDefinition` on each handler method being tested to identify its status codes and error branches — do not read the handler file in full

## Task

For each endpoint being tested, write a table-driven test in `base-server/tests/{feature}_test.go`:

1. `//go:build integration` at the top of the file
2. One `Test{Feature}API_{Method}` function per endpoint
3. One table case per status code the endpoint can return (200/201/204 happy + 400/401/403/404/409/422 as applicable)
4. Seed via `c.Store.*` — never via HTTP calls
5. Assert HTTP status + response body shape on success
6. Assert DB state directly via store when endpoint mutates data

## Hard Rules

- No `httptest.NewServer` — server runs out-of-band (`make dev-up` + `go run main.go`)
- No third-party coverage (Stripe, OAuth, social platforms) — those belong in unit tests
- `t.Parallel()` on outer test AND every sub-test
- `//go:build integration` on every file in `tests/`
- Verify: `go test -tags=integration ./tests/...` (requires running server + DB)
