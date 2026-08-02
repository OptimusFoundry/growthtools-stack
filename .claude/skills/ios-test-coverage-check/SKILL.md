---
name: ios-test-coverage-check
description: Use when adding, modifying, or reviewing any code in the native SwiftUI app (ios/AITravel/) — models, AppStore state, networking, design-system components, or screens. Enforces the four-layer testing pyramid so every logic change ships a functional test, every component/screen ships a render snapshot, every screen/flow ships an XCUITest across its MockProvider scenarios. Run as ios-supervisor's commit gate.
---

# iOS Test Coverage Check

Before any `ios/` change is committed, confirm it carries the test coverage its layers require. This is
the commit gate `ios-supervisor` runs; it is also a review checklist for any iOS change. The pyramid +
tools are defined in `ios/docs/engineering/07-testing.md` (all four layers).

> **"Green build ≠ done."** A compiling, "looks-right-in-the-preview" change is *necessary, not
> sufficient*. The layer that can catch the failure mode must be green.

## The coverage rules

Map each change to the coverage it must ship **in the same change**:

| Change touches… | Required test(s) | Layer / §07 |
|---|---|---|
| `Models/`, `Store/` commands, `Networking/` (codec, `APIRequest`, mapping) | **Functional** test (Swift Testing) asserting the behavior — and for a write command, **both** the happy path **and** the rollback path (`failureRate: 1.0`) | unit/integration · §4–5 |
| A model ↔ DTO pair | **DTO round-trip** test (`dto.toDomain().toDTO() == dto`) | unit · §4.2 |
| A new/changed `DesignSystem/Tokens/Primitive.swift` value | **Token-parity** test vs its `foundations.css` source | unit · §4.4 |
| New/changed `DesignSystem/Components/` entry or a `Screens/` view | **Render snapshot** covering its key states (the *lock*) | render · §6 |
| New/changed screen or navigable flow | **XCUITest** driving the real app across its `MockScenario`s (standard / empty / each error via `failureRate`) + a `performAccessibilityAudit()` | UI/E2E · §7 |

**Not on this list — by design:**
- **Visual fidelity** to the mockup is an **authoring-time gate** (`ios-code-reviewer`, §06 §9), not a test. The snapshot only *locks* the result.

## The checklist (run before committing)

1. **List the changed files** and bucket them by layer (Models / Store / Networking / DesignSystem / Screens).
2. **For each bucket, confirm the required test exists in the same change** per the table. A change with no matching test is a coverage gap.
3. **Surfaces ship a `#Preview`** — every new component/screen has one (also the snapshot seed), pinning a locally-constructed seeded `AppStore` (a test-only instance, not `AppStore.shared`).
4. **State-bearing elements carry a dot-namespaced `accessibilityIdentifier`** (§06 §10) so XCUITest can address them.
5. **Tests are deterministic** — fixtures via `SampleData.tokyoYanaka()` + pinned `simulatedNow` (`store.loadSeed`); no live clock or real network.
6. **Gate result:** any required test missing → **block the commit** and dispatch the matching writer (`ios-test-writer` / `ios-snapshot-test-writer` / `ios-uitest-writer`). Re-run the gate after.

## Do not

- Do not accept "the build passes" as coverage.
- Do not silently re-record render-snapshot baselines to make a diff pass — an intended visual change is re-recorded explicitly and reviewed (§6); never leave `record: .all` committed.
- Do not assert on displayed text in XCUITest where an identifier exists (text is locale/copy-sensitive).

## Exemplars to pattern-match

The reference-slice tests — a `StopRow` render snapshot, a `lockIn` command happy+rollback functional
test, and a `DayView` XCUITest across `MockScenario`s — are the shapes new tests follow.
