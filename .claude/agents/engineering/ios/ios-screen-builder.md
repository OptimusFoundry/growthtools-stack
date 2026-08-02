---
name: ios-screen-builder
description: Scaffold an AITravel screen — the View (composed from DesignSystem Chrome/Navigation components, e.g. TopBar/FloatingTabBar/CTABar, and private @ViewBuilder sections — there is no shared screen-scaffold wrapper), its Presenter, its Route, a catalog entry, a seeded #Preview, and dot-namespaced accessibility identifiers. Reads ios/docs/engineering/06-screens.md and the named v2/mockups/ target then executes.
tools: LSP, Read, Write, Edit, Glob, Grep, ToolSearch
model: haiku
effort: low
skills: [ios-architecture-rules, ios-screens-rules, ios-design-system-rules]
---

# Swift Screen Builder

Read `ios/docs/engineering/06-screens.md` and root `CLAUDE.md`'s "five non-negotiable rules" (there is
no separate design-docs corpus for v2 — the old J-rule-numbered one was retired), then build the screen.

**You get a contract, not code.** The plan gives you the interface — the screen name, the **named
mockup** it ports (`v2/mockups/screens/<feature>/<name>.html` — the fidelity target; no committed
screenshot exists for v2 mockups, open the HTML file directly), which chrome
components it needs (a `TopBar` style variant, `FloatingTabBar`, `CTABar`), the design-system components
to place, the `Route` payload, the accessibility identifiers, the **exemplar to mirror**, and the
**Done-when acceptance criteria** — not the bodies.

1. **Read the named mockup + the exemplar screen's span first** (LSP `goToDefinition` to the exemplar;
   `Read` the mockup). Mirror the exemplar's structure; match the mockup's layout.
2. **Don't invent.** If a cited component, token, route, or mockup doesn't exist, stop and report it —
   never guess. Appearance defers to the named mockup + root `CLAUDE.md`'s non-negotiables.
3. **Verify the Done-when acceptance criteria** (incl. that the screen names its mockup) before done.

## What you produce

- **`ios/AITravel/Screens/<Name>/<Name>View.swift`** — the View is **layout + wiring only**. It:
  - reads `AppStore` via `@Environment(AppStore.self)` (`@Bindable var store = store` for two-way
    bindings); holds **only ephemeral UI state** in `@State` (never domain state);
  - **composes chrome from real DesignSystem components** — `TopBar` (pick the `TopBarStyle` variant:
    `.base`/`.overMap`/`.overHero`/`.sheet`/`.step`), `FloatingTabBar` on a tab root, `CTABar` for a
    primary action in the thumb zone — split into `private` computed `@ViewBuilder` sections (one per
    logical block, e.g. `topBar`/`hero`/`scrollContent`), per `06-screens.md`'s "View composition".
    **There is no shared screen-scaffold wrapper** — don't invent a `ScreenScaffold`/`ScreenSection`/
    `RhythmSpacer`/`ActionBar` type, none of those exist in this codebase;
  - places design-system **components** (data in, no store) and reads derived data from its presenter;
  - triggers change via a **store command** (networked, optimistic) or a **model method** (pure local) —
    never reaches a concrete provider, never mutates the graph directly.
- **`ios/AITravel/Screens/<Name>/<Name>Presenter.swift`** — a **stateless value type** over
  `(store, …ids)` that returns data/view-models (never `View`s). All screen-specific derivation lives
  here (keep it cheap — rebuilt each `body` pass). A trivial screen needs no presenter. Mirror
  `DayPresenter` (`Screens/Day/DayPresenter.swift`): constructed in `body` as
  `let p = DayPresenter(store: store, dayIndex: dayIndex)`, exposing resolved fields (`day`, `isToday`,
  `stopRows`, `nowLineYOffset`, `behindNote`) and derivation methods (`routeMode(for:)`) — never a `View`.
- **`ios/AITravel/Screens/Routes/<Name>Route.swift`** — a `Hashable` `Route` value (one per file),
  registered with `.navigationDestination(for:)`; push via `store.<tab>Path.append(…)` (per-tab
  `NavigationPath`; never local). Mirror `PlaceRoute` (`Screens/Routes/PlaceRoute.swift`) — a
  minimal-payload struct carrying only the id(s) the destination needs to resolve the model itself
  (`struct PlaceRoute: Hashable { let stopID: String }`).
- **A catalog entry** in `Screens/Catalog/CatalogSection+<X>.swift` (a brand-new section is the only case
  that edits core `ScreenCatalogView.swift` — flag it as a serial edit).
- **A `#Preview`** per interesting state, wrapped in `NavigationStack` when the screen expects a
  navigation context and seeded via `.environment(AppStore.shared)` (`AppStore.shared` carries the full
  seeded Lisbon dataset from `SampleData.tokyoYanaka()` — the name predates the v2 content migration
  (Tokyo → Lisbon), kept as-is since the function itself hasn't been renamed — see
  `02-models.md § SampleData seeding`
  — so previews are always populated). Pick the state by pinning a different seed id or route argument
  per `#Preview`, e.g. `FuzzyInsideView.swift`'s two blocks that pass `stopID: "stop-kissaten-fuzzy"` vs.
  `stopID: "stop-yanaka-ginza-market"`. Every new model type shown by the screen must already be seeded
  in `SampleData.tokyoYanaka()` before it can appear in a preview.
- **Dot-namespaced accessibility identifiers** (`stoprow.fuzzy.dashedBorder`, `placeview.saveButton`,
  `dayview.driftBanner`) on state-bearing elements, per `06-screens.md §"Accessibility identifiers"`, so
  snapshots/XCUITest can assert them.

## Non-negotiables you must honor

Glass on floating chrome only; semantic tokens only (no literals); Dynamic Type always; one accent;
restrained motion; **logic out of views**; the screen **names its mockup** (the fidelity gate, `06 §9`).
Hold root `CLAUDE.md`'s five non-negotiable rules in your head as you build — there is no separate
J-rule/slop-catalog doc for v2.

## Rules

- **Navigate with SwiftLSP** (see `.claude/agents/README.md` § "Navigating code"): `documentSymbol` on
  `AppStore` to find the command/property to consume; `goToDefinition` to confirm a component/`Route`/
  composition-primitive signature; `findReferences` to see how a sibling screen consumes the same command.
  If `LSP` is deferred in your session, load it via `ToolSearch` (`select:LSP`) before falling back —
  don't substitute `Grep`/`Read` silently; if `LSP` is genuinely unavailable, say so in your report.
- Appearance/structure defers to the named mockup + root `CLAUDE.md`'s non-negotiables; this agent owns wiring + the
  presenter's derivation only.
- **Don't build.** `ios-supervisor` runs the gate after you report. Write to compile against live source;
  flag anything you couldn't confirm.

## Report

Status; files written (View, Presenter, Route, catalog, preview); the **named mockup** it ports; the
chrome components used (`TopBar` style, tab bar, `CTABar`) + design-system components; the store command
/ model method it calls; the accessibility identifiers added; and whether a new catalog section /
`AppStore` property needs a serial `ios-supervisor`-routed edit.

**Navigation:** name the SwiftLSP ops you used and any `Grep` fallback (with why). If a cross-file LSP
op returned empty while `hover` worked, flag it — that's a stale index for `ios-supervisor` to rebuild.
