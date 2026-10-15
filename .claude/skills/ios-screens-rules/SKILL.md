---
name: ios-screens-rules
description: Use when writing, editing, or reviewing any ios/ Screens/ Swift code — a screen View, its Presenter, its Route, its catalog entry, its previews, or its accessibility identifiers — or when checking a screen against its named mockup. Covers the 12 non-negotiable screen-construction rules — View composition, ScreenScaffold-only layout (no hand-wired chrome), logic-out-of-views, stateless presenters, ID-only routes pushed through AppStore, tab-root destination registration, AppStore.preview(_:) seeded previews, dot-namespaced accessibility identifiers, chrome intent + thumb-zone ActionBar, the sheet/push/cover decision rule, catalog registration, and fidelity to the named mockup.
---

# Screen Rules (iOS)

Twelve rules, one line each. Each carries a depth pointer — follow it when you need the worked
example, not before. The code lives in the doc; this file is the checklist.

- **SC-1** Every screen is a `struct …View: View` whose `body` is layout + wiring only; large bodies
  split into private `@ViewBuilder` properties or `private struct` subviews in the same file,
  promoted to `DesignSystem/Components/` only once a second screen needs them.
  → `ios/docs/engineering/06-screens.md#1-view-composition`
- **SC-2** Every screen composes `ScreenScaffold` + `ScreenSection` / `RhythmSpacer` — never raw
  `.toolbar` / `.navigationTitle` / `.navigationBarHidden`, or `.padding` / `VStack(spacing:)` /
  `ScrollView` for structure; inner spacing uses semantic tokens, never primitives or literals.
  → `ios/docs/engineering/06-screens.md#26-the-rule-that-prevents-drift`
- **SC-3** No logic in views: domain mutation is a model method, a networked write is an `await`ed
  `AppStore` command, derivation is a presenter; `@State` holds ephemeral UI state only; a view never
  constructs an `AppStore` or references a concrete provider.
  → `ios/docs/engineering/01-architecture.md#8-screens--logic-out-of-views`
- **SC-4** A `<Screen>Presenter` is a stateless value type in `Screens/`, built fresh in `body` from
  `(store, …ids)` (never cached), returns data/view-models never `View`s, and stays cheap; add one
  the moment derivation appears in `body`.
  → `ios/docs/engineering/06-screens.md#3-screen-logic--presenters`
- **SC-5** Routes are `Hashable` structs, one per file in `Screens/Routes/<Name>Route.swift`,
  carrying only lookup IDs; views push via `store.push(…)` onto the `AppStore`-owned per-tab path,
  never a view-local `@State` path.
  → `ios/docs/engineering/06-screens.md#5-navigation`
- **SC-6** `.navigationDestination(for:)` is registered once at the tab root, not in child screens.
  → `ios/docs/engineering/06-screens.md#5-navigation`
- **SC-7** Every screen ships one labeled `#Preview` per interesting state, each seeded through
  `AppStore.preview(_:)` with a `SampleData` factory (never `.shared`, never the network), wrapped
  in `NavigationStack` when it expects nav context.
  → `ios/docs/engineering/06-screens.md#8-previews--how-a-screen-gets-its-mock-data`
- **SC-8** State-bearing and test-addressed elements carry a lowercase dot-namespaced
  `component.slot[.id]` identifier on the element's outermost view, parameterised by id for repeated
  rows; the view owns placement.
  → `ios/docs/engineering/06-screens.md#10-accessibility-identifiers-for-testing`
- **SC-10** A screen declares its chrome intent (`.root` / `.detail` / `.immersive` / `.custom`);
  the top bar carries title + back only (at most one secondary control), primary CTAs go in the
  `ScreenScaffold(actions:)` `ActionBar`, and the tab bar hides only on `.immersive` / `.custom`.
  → `ios/docs/engineering/06-screens.md#21-screenscaffold--the-one-chrome--layout-primitive`
- **SC-11** Child of the current view → push; self-contained detour → `.sheet` on ephemeral
  `@State`; focused takeover → `.fullScreenCover` (usually `.immersive`). Errors surface as the
  store's `writeError` banner, never a toast or alert.
  → `ios/docs/engineering/06-screens.md#25-sheet-vs-push-vs-cover--the-decision-rule`
- **SC-12** Every new screen registers a seeded entry in `Screens/Catalog/CatalogSection+<X>.swift`;
  only a brand-new section edits `ScreenCatalogView.swift`.
  → `ios/docs/engineering/06-screens.md#7-the-catalog-screencatalogview`
- **SC-13** Every screen names the `mockups/screens/<name>.html` it ports in its acceptance criteria,
  is fidelity-reviewed against it before acceptance, then locked by a render snapshot.
  → `ios/docs/engineering/06-screens.md#9-fidelity-to-the-mockup--the-authoring-time-gate`

Cite the rule ID when you flag a violation — `SC-5: BookDetailRoute carrying a full Book instead of
its id` is reviewable; "route issue" is not.
