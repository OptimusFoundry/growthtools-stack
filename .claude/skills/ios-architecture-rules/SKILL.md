---
name: ios-architecture-rules
description: Use when writing, editing, or reviewing any ios/AITravel/ Swift code — layer placement, AppStore usage, MainActor concurrency, or model/type-kind decisions. Covers the seven non-negotiable architecture rules — the layer map, reference-vs-leaf model split, AppStore single-source-of-truth, MainActor-by-default concurrency with DTOs at the API boundary, one-public-type-per-file naming, DesignSystem screen-agnosticism, and provider-swappability.
---

# Architecture Rules (ios/AITravel)

Seven rules, one line each. Each carries a depth pointer — follow it when you need the worked
example, not before. The code lives in the doc; this file is the checklist.

- **A-1** Five code layers (Models/Store/Networking/DesignSystem/Screens) plus Billing each own one
  responsibility — don't cross them (e.g. no navigation in DesignSystem, no parsing in Store).
  → `ios/docs/engineering/01-architecture.md#1-seven-layers`
- **A-2** Models split in two: reference models (`@MainActor @Observable final class`, own their
  mutations) vs leaf value types (`Codable, Equatable, Hashable, Sendable` struct/enum) — never
  blend the two.
  → `ios/docs/engineering/01-architecture.md#1-seven-layers`
- **A-3** `AppStore` is the single source of truth: `init` is `private`, `AppStore.shared` is the
  only call site, injected once at the App root via `.environment(store)` — no view creates its
  own instance.
  → `ios/docs/engineering/01-architecture.md#how-appstoreshared-reaches-views`
- **A-4** `AppStore` and the reference models are `@MainActor`; the API boundary carries `Sendable`
  DTOs/leaf value types only, never the `@MainActor` reference models.
  → `ios/docs/engineering/01-architecture.md#4-concurrency-stance`
- **A-5** One public type per file, named after the type (screens end in `View`, routes end in
  `Route`, token enums are caseless).
  → `ios/docs/engineering/01-architecture.md#3-naming-and-file-conventions`
- **A-6** `DesignSystem/` components and modifiers are screen-agnostic — no `AppStore` access, no
  navigation pushes; they take data as arguments.
  → `ios/docs/engineering/01-architecture.md#1-seven-layers`
- **A-7** Provider-swappable boundaries (`APIClientProtocol`, `PurchaseProvider`) keep Mock/Live
  implementations interchangeable; no StoreKit type may cross `PurchaseProvider`.
  → `ios/docs/engineering/01-architecture.md#1-seven-layers`

Cite the rule ID when you flag a violation — `A-3: view instantiates AppStore() directly` is
reviewable; "singleton issue" is not.
