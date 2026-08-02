---
name: ios-screens-rules
description: Use when writing, editing, or reviewing any ios/AITravel/Screens/ Swift code — the View/Presenter/Route split, composition-primitive usage, accessibility identifiers, or mockup port fidelity. Covers the 8 non-negotiable screen-construction rules — View/Presenter/Route separation, logic-out-of-views, DesignSystem-only composition (no hand-wired chrome), route payloads as ID-only, centralized navigationDestination registration, the seeded #Preview convention, dot-namespaced accessibility identifiers, and named-mockup + catalog registration.
---

# Screen Rules (AITravel iOS)

Eight rules, one line each. Each carries a depth pointer — follow it when you need the worked
example, not before. The code lives in the doc; this file is the checklist.

- **SC-1** Every screen is a `struct …View: View`; large `body`s decompose into private
  `@ViewBuilder` section properties, not one giant body.
  → `ios/docs/engineering/06-screens.md#view-composition`
- **SC-2** Screens consume tokens, modifiers, and components only from the DesignSystem layer —
  never redeclare spacing/color literals inline, never hand-wire chrome.
  → `ios/docs/engineering/06-screens.md#view-composition`
- **SC-3** Domain logic never lives inline in a view body: stateless derivation beyond a few lines
  extracts into a co-located Presenter that returns data/view-models and never builds a `View`;
  domain mutation goes through model methods or store commands.
  → `ios/docs/engineering/06-screens.md#screen-logic--presenters`
- **SC-4** Presenters are stateless and constructed fresh in `body` from `(store, …)` — never
  cached as `@State` — so SwiftUI's dependency tracking through `store` stays intact.
  → `ios/docs/engineering/06-screens.md#screen-logic--presenters`
- **SC-5** Routes are thin, `Hashable` structs carrying only lookup IDs (never full objects); the
  destination screen resolves the model itself via `AppStore`.
  → `ios/docs/engineering/06-screens.md#route-types`
- **SC-6** `.navigationDestination(for:)` registrations live at the bottom of the root screen's
  `body`, not scattered across child views.
  → `ios/docs/engineering/06-screens.md#destination-registration`
- **SC-7** Every screen ships at least one `#Preview`, wrapped in `NavigationStack` when it expects
  navigation context, seeded via `AppStore.shared`; multiple interesting states get multiple
  labeled previews.
  → `ios/docs/engineering/06-screens.md#previews`
- **SC-8** Accessibility identifiers use dot-separated `scope.component.element` lowercase keys
  applied to the outermost or state-bearing view, parameterised by ID when a specific row/element
  must be addressed.
  → `ios/docs/engineering/06-screens.md#accessibility-identifiers-for-testing`
- **SC-9** Floating chrome (`FloatingTabBar`, `GlassCircleButton`, a bottom-pinned `CTABar`) hides —
  never dims — while a `BottomSheet` is presented, driven by `AppStore.isSheetPresented` through
  `\.floatingChromeSuppressed`; and a screen picks exactly one of TopBar-action / floating-circle /
  bottom-bar per the selection table.
  → `ios/docs/engineering/06-screens.md#chrome-selection-and-sheet-coordination`

Cite the rule ID when you flag a violation — `SC-5: PlaceRoute carrying a full Stop instead of
stopID` is reviewable; "route issue" is not.
