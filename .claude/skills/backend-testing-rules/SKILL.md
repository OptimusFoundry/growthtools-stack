---
name: backend-testing-rules
description: Use when writing, editing, or reviewing any Go test in base-server — store tests under internal/infra/store/, processor/handler unit tests under internal/*/processor/ and internal/*/handler/, or integration tests under tests/. Covers the nine non-negotiable testing rules — table-driven always, t.Parallel() everywhere, require vs assert, scenario sub-test names, real-Postgres store coverage, gomock-only mocks, the in-process integration server, the third-party exclusion, and the before-done checklist.
---

# Testing Rules (base-server)

Nine rules, one line each. Each carries a depth pointer — follow it when you need the worked
example, not before. The code lives in the doc; this file is the checklist.

- **TS-1** Every test function is table-driven — even a single case uses a one-element table.
  → `base-server/docs/TESTING.md#universal-rules-apply-to-all-test-levels`
- **TS-2** `t.Parallel()` on the outer test function AND every sub-test.
  → `base-server/docs/TESTING.md#universal-rules-apply-to-all-test-levels`
- **TS-3** `require` for fatal preconditions, `assert` for field-level checks.
  → `base-server/docs/TESTING.md#universal-rules-apply-to-all-test-levels`
- **TS-4** Sub-test names describe the scenario — `"returns 404 when post does not exist"`, never
  `"case1"`.
  → `base-server/docs/TESTING.md#universal-rules-apply-to-all-test-levels`
- **TS-5** Store tests: real Postgres via `SetupTestStore(t)`, `if testing.Short() { t.Skip(...) }`,
  and every exported method gets happy + each error branch (Create: insert + constraint violation;
  Get: found + not-found + wrong-account; List: populated + empty + filtered; Update/Delete:
  success + not-found).
  → `base-server/docs/TESTING.md#level-1-store-tests`
- **TS-6** Unit tests: gomock-only via `mockgen` (`go:generate` directive per file, regenerate after
  every interface change); cover every `handleError` branch.
  → `base-server/docs/TESTING.md#level-2-processor--handler-unit-tests`
- **TS-7** Integration tests: `//go:build integration`; the app boots **in-process** — `testenv.Start`
  wraps the real Gin router in one `httptest.Server` against real Postgres from the test stack.
  Cover every status code the endpoint can return, and assert the DB row via the store handle on
  mutation.
  → `base-server/docs/TESTING.md#level-3-integration-tests-in-process-server`
- **TS-8** Before done: run every level you touched, `go generate ./...` on any interface change,
  `make test` before pushing.
  → `base-server/docs/TESTING.md#before-completing-any-task`
- **TS-9** Do not integration-test paths that call third-party services (Stripe, Resend, OAuth
  providers, social platforms) except via the mock `httptest.Server`s — those paths stay covered by
  processor/handler unit tests with gomock.
  → `base-server/docs/TESTING.md#level-3-integration-tests-in-process-server`

Cite the rule ID when you flag a violation — `TS-2: missing t.Parallel() in sub-test` is reviewable;
"parallelism issue" is not.
