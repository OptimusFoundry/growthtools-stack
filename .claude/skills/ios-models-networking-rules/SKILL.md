---
name: ios-models-networking-rules
description: Use when writing, editing, or reviewing any ios/AppTemplate/Models/ or ios/AppTemplate/Networking/ Swift code — model kind decisions, state enums, DTO mapping, SampleData seeds, APIRequest shape, MockProvider scenarios, or APIError handling. Covers the 14 non-negotiable rules — reference-model-iff-mutable-list-row, the DTO toDomain()/toDTO() split, model methods vs AppStore wrappers, enums not boolean soup, typed id references, no live clock, SampleData named seed factories, provider-swappability, the one-file APIRequest rule, the DTO wire boundary, the stateless MockProvider, the closed APIError surface, and path/method conventions.
---

# Models & Networking Rules (iOS)

Fourteen rules, one line each. Each carries a depth pointer — follow it when you need the worked
example, not before. The code lives in the doc; this file is the checklist.

- **M-1** A type is a `@MainActor @Observable final class` reference model iff it is a mutable row in
  a list (`Library`, `Book`); everything else is a `Codable, Equatable, Hashable, Sendable`
  `struct`/`enum` leaf value type. Reference models are not `Codable` and use identity equality.
  → `ios/docs/engineering/02-models.md#1-reference-models-vs-value-types`
- **M-2** The wire boundary is DTOs in `Networking/Responses/DTO/` (`LibraryDTO`/`BookDTO`) that reuse
  leaf value types, with explicit, total `@MainActor toDomain()` / `toDTO()` mapping and a unit-tested
  `dto.toDomain().toDTO() == dto` round-trip.
  → `ios/docs/engineering/02-models.md#4-the-wiredomain-dto-split`
- **M-3** Pure, synchronous, in-place state transitions are methods on the reference model; anything
  needing the network or cross-entity state is a thin `AppStore` wrapper. Model display helpers return
  data, never `View`s — a model never imports SwiftUI.
  → `ios/docs/engineering/02-models.md#2-logic-on-the-models`
- **M-4** Every new model the UI shows is seeded in `SampleData.library()` before it appears in a
  preview/test; per-domain `make*` builders go in a new `Models/SampleData+<Domain>.swift`. No
  inline-constructed data anywhere else.
  → `ios/docs/engineering/02-models.md#5-sampledata--the-single-source-of-all-mock-data`
- **M-6** Mutually-exclusive state is an enum, never a cluster of `Bool`s (independent flags stay
  `Bool`); associated-value enums hand-write `Codable` via a tag-keyed container.
  → `ios/docs/engineering/02-models.md#3-modeling-state--enums-not-boolean-soup`
- **M-7** Cross-references use the synthesized id type (`Book.ID`, `[Author.ID]`), never bare
  `String`; seed ids are stable literals (`"book-dune"`), never `UUID()`.
  → `ios/docs/engineering/02-models.md#13-identifiable-and-id-references`
- **M-8** Seeds come from named `SampleData` factories — one canonical (`library()`) plus edge-state
  variants (`emptyLibrary()`, `allBorrowed()`) whose names are the `MockScenario` cases; `simulatedNow`
  is pinned.
  → `ios/docs/engineering/02-models.md#named-seed-factories-one-canonical--edge-state-variants`
- **M-9** Never call the live clock in the model layer — time-conditional logic takes a `now: Date`
  (from the store's `simulatedNow`); date display goes through `AppDate` formatters only.
  → `ios/docs/engineering/02-models.md#6-dates--formatting`
- **N-1** Screens and the store depend only on `APIClient`; nothing outside `Networking/` references
  `MockProvider`/`LiveProvider`. Mock/live swaps only at the `AppStore` init boundary.
  → `ios/docs/engineering/04-networking.md#1-provider-swappable-boundary`
- **N-2** A new endpoint is one new `Networking/Requests/<Verb><Name>Request.swift` conforming to
  `APIRequest` (`path`/`method`/`queryItems`/`body`/`mockLatency`/`mockResponse(from:)`); the verb
  prefix matches `method`; never edit `APIClient`, `MockProvider`, or `LiveProvider`.
  → `ios/docs/engineering/04-networking.md#adding-an-endpoint--the-one-file-rule`
- **N-3** Domain reference models never cross the wire — `Response`/body types are DTOs; `toDomain()`
  mapping happens in the caller (`AppStore`) on the main actor after the `await`, never in a provider.
  → `ios/docs/engineering/04-networking.md#3-domain-models-never-cross-the-wire--the-dto-boundary`
- **N-5** `MockProvider` is a stateless value type holding an immutable `MockSeed` of DTOs (snapshotted
  from `SampleData` via `.toDTO()`); `mockResponse(from:)` is pure and persists nothing. A new scenario
  is a `MockScenario` case plus its `SampleData` variant.
  → `ios/docs/engineering/04-networking.md#7-mockprovider--scenarios`
- **N-6** `send` throws only the closed `APIError`; `LiveProvider` maps every `URLError`/decoding/HTTP
  failure, `MockProvider` throws `.http(404, …)` for a missing entity, and the store surfaces it via
  `writeError` (banner, no toasts).
  → `ios/docs/engineering/04-networking.md#6-error-surface`
- **N-7** Paths use pluralized resources, actions as verbs hung off the resource
  (`/books/{id}/borrow`), and filters/search as `queryItems`, never path segments.
  → `ios/docs/engineering/04-networking.md#4-path--method-conventions`

Cite the rule ID when you flag a violation — `N-3: LiveProvider mapping BookDTO to Book` is
reviewable; "networking layer issue" is not.
