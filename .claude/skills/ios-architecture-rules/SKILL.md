---
name: ios-architecture-rules
description: Use when writing, editing, or reviewing any ios/AppTemplate/ Swift code — layer placement, AppStore ownership, MainActor concurrency, model kind decisions, or where logic and new files go. Covers the nine non-negotiable architecture rules — the layer map, reference-vs-value model split, App-root-owned AppStore (no .shared), MainActor-by-default with Sendable DTOs at the API boundary, one-public-type-per-file naming, DesignSystem screen-agnosticism, APIClient provider-swappability, logic out of views, and registry-as-files parallel scaffolding.
---

# Architecture Rules (ios/AppTemplate)

Nine rules, one line each. Each carries a depth pointer — follow it when you need the worked
example, not before. The code lives in the doc; this file is the checklist.

- **A-1** Six code layers (App/Models/Store/Networking/DesignSystem/Screens) each own one
  responsibility — don't cross them (no SwiftUI or wire codec in Models, no parsing in Store, no
  domain logic in App).
  → `ios/docs/engineering/01-architecture.md#3-layer-map`
- **A-2** Reference model (`@MainActor @Observable final class`, owns its mutations, not `Codable`)
  iff the entity is a mutable row in a list; everything else is a value type (`Codable, Equatable,
  Hashable, Sendable`).
  → `ios/docs/engineering/01-architecture.md#62-the-decision-rule`
- **A-3** `AppStore` is the single source of truth: the App root owns the one instance
  (`@State private var store = AppStore()`) and injects it via `.environment(store)`; `init` is
  public, previews/tests build their own — no `.shared` singleton, no parallel stores.
  → `ios/docs/engineering/03-store.md#1-single-source-of-truth`
- **A-4** Swift 6.2 MainActor-by-default: app code is main-actor-isolated without annotation; only
  the `Sendable` boundary (DTOs, leaf values, `APIRequest`) and `@concurrent` off-main work are
  marked; reference models never cross the API boundary. Zero concurrency diagnostics.
  → `ios/docs/engineering/01-architecture.md#9-concurrency-swift-62-mainactor-by-default`
- **A-5** One public type per file, named after the type — screens/sheets end in `View`, routes in
  `Route`, presenters in `Presenter`; modifiers are `private struct` exposed via `extension View`;
  token enums are caseless.
  → `ios/docs/engineering/01-architecture.md#11-conventions--parallel-scaffolding-rules`
- **A-6** `DesignSystem/` components and modifiers are screen-agnostic — no `AppStore`/domain
  references except as opaque args, no navigation; they take data as arguments.
  → `ios/docs/engineering/01-architecture.md#3-layer-map`
- **A-7** Screens and the store depend on `APIClient`, never `MockProvider`/`LiveProvider`; mock vs
  live is swapped at the `AppStore` init boundary.
  → `ios/docs/engineering/04-networking.md#1-provider-swappable-boundary`
- **A-8** Logic out of views: pure mutation = model method; networked write = `AppStore` command
  (optimistic + `restore(from:)` rollback); derivation = stateless `<Screen>Presenter`; only
  ephemeral UI state is `@State`. No per-screen view-model.
  → `ios/docs/engineering/01-architecture.md#8-screens--logic-out-of-views`
- **A-9** Registry-as-files: new code is a new file (endpoint, route, store command
  `AppStore+<Feature>.swift`, seed, catalog section); serialize edits to `AppStore.swift` stored
  properties, `ScreenCatalogView.swift`, and `.pbxproj`.
  → `ios/docs/engineering/01-architecture.md#11-conventions--parallel-scaffolding-rules`

Cite the rule ID when you flag a violation — `A-3: BookListView references AppStore.shared` is
reviewable; "singleton issue" is not.
