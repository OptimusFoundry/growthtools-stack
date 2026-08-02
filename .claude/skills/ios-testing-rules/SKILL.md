---
name: ios-testing-rules
description: Use when writing, editing, testing, or reviewing any test code in ios/AITravelTests/ or ios/AITravelUITests/ — functional tests (Swift Testing), render snapshots (swift-snapshot-testing), or XCUITest. Covers the 12 non-negotiable testing rules across the four-layer pyramid — pyramid coverage per change, Swift Testing conventions, real-value assertions, happy+rollback coverage per command, DTO round-trips, deterministic SampleData/simulatedNow fixtures, snapshot determinism, the record:.all ban, the fuzzy-register five-signal snapshot lock, accessibilityIdentifier-only XCUITest queries, table-driven MockScenario coverage, and per-type accessibility-audit suppression.
---

# Testing Rules (AITravel iOS)

Twelve rules, one line each, spanning all four pyramid layers (unit/integration in
`07-testing.md`, render snapshots in `08-render-snapshots.md`, UI/E2E in
`09-ui-e2e-testing.md`). Each carries a depth pointer — follow it when you need the
worked example, not before. The code lives in the docs; this file is the checklist.

- **T-1** Every logic change ships a layer-1/2 functional test (Swift Testing); every
  screen/component ships a layer-3 render snapshot; every screen/flow ships a layer-4
  XCUITest. Green build is not done.
  → `ios/docs/engineering/07-testing.md#1-testing-pyramid-overview`
- **T-2** New logic tests use Swift Testing (`@Test` / `#expect` / `#require`), not
  `XCTestCase`; never convert an existing XCTest file to Swift Testing.
  → `ios/docs/engineering/07-testing.md#2-framework`
- **T-3** Assert real values, not just non-nil/truthy checks; reference models
  (`Trip`/`Day`/`Stop`) use identity — assert on fields, never `==` between two
  constructed instances — while DTOs and leaf value types assert value equality.
  → `ios/docs/engineering/07-testing.md#31-model-logic--modeltestsswift`
- **T-4** Every mutating `AppStore` command gets two cases: the happy path (mock
  succeeds, transition sticks) and the rollback path
  (`MockProvider.writeFailureRate = 1.0`, optimistic change reverts via
  `restore(from:)`, `writeError` is set).
  → `ios/docs/engineering/07-testing.md#5-integration-tests`
- **T-5** DTO round-trips (`dto.toDomain().toDTO() == dto`) use a plain symmetric
  `JSONEncoder`/`JSONDecoder` (`.iso8601`) — never `APIJSON`, whose
  `.convertToSnakeCase`/`.convertFromSnakeCase` is asymmetric on acronym/ID keys and
  would falsely fail the round-trip.
  → `ios/docs/engineering/07-testing.md#31-model-logic--modeltestsswift`
- **T-6** Fixtures come from `SampleData.tokyoYanaka()`, indexed by stable ID; time-
  dependent assertions use the seed's fixed `simulatedNow` or
  `TripDate.tokyo(year:month:day:hour:minute:)` — never `Date()`,
  `Date(timeIntervalSinceNow:)`, or `Calendar.current`.
  → `ios/docs/engineering/07-testing.md#6-determinism--fixtures-and-the-simulated-clock`
- **T-7** Snapshot determinism checklist: pinned simulator + `canonicalConfig` viewport,
  light-mode trait, `Asia/Tokyo` formatting, never a live clock, and
  `.environment(\.disablesOneShotMotion, true)` so a one-shot pulse never gets captured
  mid-animation.
  → `ios/docs/engineering/08-render-snapshots.md#determinism-checklist`
- **T-8** Never commit `record: .all` (or any `record:` override) in a test file;
  baseline PNGs under `__Snapshots__/` are committed to the repo and are the contract.
  → `ios/docs/engineering/08-render-snapshots.md#5-baseline-management`
- **T-9** A `StopRow.fuzzy` snapshot must lock all five fuzzy-register signals
  (dashed border, italic Fraunces name, monochrome glyph, 8px AI dot, tilde time range)
  co-occurring in one frame — dropping any one is a silent regression unit tests can't
  catch.
  → `ios/docs/engineering/08-render-snapshots.md#7-relation-to-the-fuzzy-register`
- **T-10** XCUITest queries assert on `accessibilityIdentifier` (`component.slot[.id]`),
  never on displayed text — text is locale- and copy-sensitive, identifiers are the
  stable contract.
  → `ios/docs/engineering/09-ui-e2e-testing.md#5-accessibility-identifier-assertions`
- **T-11** Table-drive one `XCTestCase` across every `MockScenario` variation (scenario,
  expected identifiers present/absent) instead of duplicating a test method per
  scenario.
  → `ios/docs/engineering/09-ui-e2e-testing.md#4-table-driven-tests-across-states`
- **T-12** `performAccessibilityAudit()` suppressions are per-type and per-identifier
  (e.g. the documented AI-gradient contrast exemption) — never suppress a whole audit
  type or return `true` unconditionally.
  → `ios/docs/engineering/09-ui-e2e-testing.md#suppressing-known-accepted-deviations`

Cite the rule ID when you flag a violation — `T-4: missing rollback-path test for
lockIn` is reviewable; "needs more test coverage" is not.
