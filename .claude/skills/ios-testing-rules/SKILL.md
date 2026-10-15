---
name: ios-testing-rules
description: Use when writing, editing, running, or reviewing any test code in ios/AppTemplateTests/ or ios/AppTemplateUITests/ — functional tests (Swift Testing), render snapshots (swift-snapshot-testing), or XCUITest. Covers the 17 non-negotiable testing rules across the four-layer pyramid — the coverage gate, Swift Testing conventions, real-value assertions, happy+rollback coverage per command, DTO round-trips, token-parity and request wire-shape tests, deterministic SampleData/simulatedNow fixtures, the pinned snapshot helper and determinism checklist, the record:.all ban, launch-environment scenario injection, accessibilityIdentifier-only XCUITest queries, table-driven MockScenario coverage, per-type accessibility-audit suppression, triage-only screenshots, and the parallel-run retry script.
---

# Testing Rules (iOS)

Seventeen rules, one line each, spanning all four pyramid layers (unit/integration in
`07-testing.md`, render snapshots in `08-render-snapshots.md`, UI/E2E in
`09-ui-e2e-testing.md`). Each carries a depth pointer — follow it when you need the
worked example, not before. The code lives in the docs; this file is the checklist.

- **T-1** Green build ≠ done: every logic change ships an L1/L2 functional test (Swift
  Testing); every new/changed component or screen ships an L3 render snapshot; every new
  screen/flow ships an L4 XCUITest across its `MockProvider` scenarios plus an
  accessibility audit. Enforced by `ios-test-coverage-check`.
  → `ios/docs/engineering/07-testing.md#9-the-coverage-gate`
- **T-2** New logic tests use Swift Testing (`@Test` / `#expect` / `#require`); don't
  rewrite existing XCTest. `SnapshotTesting` is added to `AppTemplateTests` only — the app
  target has no SPM deps and never imports a test framework.
  → `ios/docs/engineering/07-testing.md#2-frameworks--target-layout`
- **T-3** Assert real values; reference models (`Library`/`Book`) use identity — assert on
  fields, never `==` between two constructed instances — while DTOs and leaf value types
  assert value equality.
  → `ios/docs/engineering/07-testing.md#3-determinism--fixtures-and-the-clock`
- **T-4** Every mutating `AppStore` command gets two `@MainActor` tests on a fresh seeded
  store: the happy path (optimistic transition sticks, `writeError == nil`) and the
  rollback path (`failureRate: 1.0` — `restore(from:)` reverts the reference and sets
  `writeError`).
  → `ios/docs/engineering/07-testing.md#51-appstore--mockprovider--the-command-suite`
- **T-5** DTO round-trips (`dto.toDomain().toDTO() == dto`) use a plain symmetric
  `JSONEncoder`/`JSONDecoder` (`.iso8601`) — never `APIJSON`, whose snake-case conversion
  is asymmetric on acronym/ID keys (`bookID` → `book_id` → `bookId`).
  → `ios/docs/engineering/07-testing.md#42-dto-round-trip`
- **T-6** Fixtures come from `SampleData.library()`, indexed by stable id (`"book-dune"`),
  never array position; time-dependent assertions use the seed's fixed `simulatedNow` or
  `TestDate.make(y:m:d:)` — never `Date()`, `Date(timeIntervalSinceNow:)`,
  `Calendar.current`, or `Locale.current`.
  → `ios/docs/engineering/07-testing.md#3-determinism--fixtures-and-the-clock`
- **T-7** Snapshot determinism: one pinned simulator (iPhone 17 Pro, iOS 26.4.1), light
  mode pinned in `canonicalConfig`, no live clock, snapshot at rest (never
  `withAnimation`), one-shot motion settled via environment override, fonts registered,
  explicit `Locale` for formatting.
  → `ios/docs/engineering/08-render-snapshots.md#determinism-checklist`
- **T-8** Never commit `record: .all` (or an uncommented `invokeTest` record override);
  `__Snapshots__/` PNGs are committed and are the contract — never `.gitignore` them.
  Re-record only for an intentional change, reviewing every diff.
  → `ios/docs/engineering/08-render-snapshots.md#5-baseline-management`
- **T-10** XCUITest queries use `accessibilityIdentifier` (`component.slot[.id]`, e.g.
  `bookrow.<id>`), never displayed text; wait with `waitForExistence(timeout:)`, never
  `sleep()`.
  → `ios/docs/engineering/09-ui-e2e-testing.md#5-accessibility-identifier-assertions`
- **T-11** Table-drive one `XCTestCase` across every `MockScenario` (`standard` ·
  `emptyLibrary` · `allBorrowed`) with expected identifiers present/absent, instead of a
  test method per scenario.
  → `ios/docs/engineering/09-ui-e2e-testing.md#4-table-driven-tests-across-states`
- **T-12** One `performAccessibilityAudit()` per screen under `standard`; suppress only a
  documented (`ios/decisions.md`) exemption, per audit type, matched by a dedicated
  identifier — never blanket-return `true`.
  → `ios/docs/engineering/09-ui-e2e-testing.md#suppressing-known-accepted-deviations`
- **T-13** Every snapshot goes through `assertDesignSnapshot` (`canonicalConfig` +
  `designSystemEnvironment()`, `UIHostingController` for screens); keep it thin — one per
  component key state, one per product screen; catalog/playground scaffolding excluded.
  → `ios/docs/engineering/08-render-snapshots.md#4-what-to-snapshot`
- **T-14** Every hand-authored primitive (color, spacing, radius, shadow, motion) ships a
  token-parity test asserting it against its `foundations.css` source, citing the CSS line,
  in the same change.
  → `ios/docs/engineering/07-testing.md#44-token-parity`
- **T-15** Pin each `APIRequest` body's wire shape: encode with `.convertToSnakeCase` and
  assert the exact keys (`book_id`, `due_date`), including nested types.
  → `ios/docs/engineering/07-testing.md#53-request-wire-shape`
- **T-16** UI tests select state only via `launchEnvironment` (`UITEST_SCENARIO`,
  `UITEST_FAILURE_RATE`, `UITEST_NOW`) through `makeLaunchedApp(…)` — no globals, no JSON
  fixtures; always pass `UITEST_NOW` for time-conditional state.
  → `ios/docs/engineering/09-ui-e2e-testing.md#3-launch-arg-mockprovider-scenario-injection`
- **T-17** XCUITest screenshots (`XCTAttachment`) are triage-only — never diffed, no
  baselines; pixel regression belongs to L3 render snapshots.
  → `ios/docs/engineering/09-ui-e2e-testing.md#7-screenshots`
- **T-18** Run the parallel UI suite with `.claude/scripts/fast-uitest.sh`
  (parallel, then serial retry of stragglers) — never wait indefinitely on a parallel
  `xcodebuild test`; rerun an unexplained parallel failure before filing a regression.
  → `ios/docs/engineering/09-ui-e2e-testing.md#parallel-test-execution`

Cite the rule ID when you flag a violation — `T-4: missing rollback-path test for
borrow(bookID:)` is reviewable; "needs more test coverage" is not.
