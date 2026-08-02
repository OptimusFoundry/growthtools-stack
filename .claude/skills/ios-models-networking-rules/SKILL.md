---
name: ios-models-networking-rules
description: Use when writing, editing, or reviewing any ios/AITravel/Models/ or ios/AITravel/Networking/ Swift code — model kind decisions, DTO mapping, SampleData seeds, or APIRequest shape. Covers the nine non-negotiable rules — reference-type vs leaf-value-type model kind, the DTO toDomain()/toDTO() split, SampleData seeding conventions, provider-swappability, the one-file APIRequest rule, and the dayIndex wire conversion.
---

# Models & Networking Rules (AITravel iOS)

Nine rules, one line each. Each carries a depth pointer — follow it when you need the worked
example, not before. The code lives in the doc; this file is the checklist.

- **M-1** Only `Trip`/`Day`/`Stop` are `@MainActor @Observable final class`; every other model
  type is a `Codable, Equatable, Hashable, Sendable` `struct`/`enum` leaf value type.
  → `ios/docs/engineering/02-models.md#reference-models-vs-value-types`
- **M-2** Reference models are not `Codable`; the wire boundary is DTOs (`TripDTO`/`DayDTO`/`StopDTO`)
  with explicit, total `toDomain()`/`toDTO()` mapping and a unit-tested round-trip invariant.
  → `ios/docs/engineering/02-models.md#the-wiredomain-dto-split`
- **M-3** Pure, synchronous, in-place state transitions live on the reference model as methods;
  anything needing the network or cross-entity state is a thin `AppStore` wrapper instead.
  → `ios/docs/engineering/02-models.md#logic-on-the-models`
- **M-4** Every new model type the UI shows must be seeded in `SampleData.tokyoYanaka()` before
  it appears in a preview/test; new `make*` seed helpers go in `Models/SampleData+<Domain>.swift`.
  → `ios/docs/engineering/02-models.md#sampledata-seeding`
- **M-5** The rest of the codebase decides fuzzy-vs-definitive rendering only via `isFuzzy` /
  `displayName` / `displayTimeRange` — never by switching on `Stop.kind` directly elsewhere.
  → `ios/docs/engineering/02-models.md#the-fuzzydefinitive-register`
- **N-1** Screens depend only on `APIClient`/`APIClientProtocol`; never import or reference
  `MockProvider`, `LiveProvider`, or any other concrete provider type.
  → `ios/docs/engineering/04-networking.md#1-provider-swappable-boundary`
- **N-2** A new endpoint is one new `Networking/Requests/<Name>Request.swift` conforming to
  `APIRequest` (path/method/queryItems/body/mockLatency/`mock(in:)`); never edit `APIClient`,
  `MockProvider`, or `LiveProvider`.
  → `ios/docs/engineering/04-networking.md#adding-a-new-api-call--the-one-file-rule`
- **N-3** Domain reference models never cross the wire — `Request`/`Response` types carry DTOs;
  `dto.toDomain()`/`trip.toDTO()` mapping happens in the caller (`AppStore`) on the main actor,
  never inside a provider.
  → `ios/docs/engineering/04-networking.md#2a-domain-models-never-cross-the-wire--the-dto-boundary`
- **N-4** `dayIndex` is zero-based everywhere in the domain and in `MockStore`; convert to the
  wire's 1-based index only in `path`/`queryItems`/`body()` via `wireDayIndex` — never inside
  `mock(in:)`.
  → `ios/docs/engineering/04-networking.md#3-path-and-method-conventions`

Cite the rule ID when you flag a violation — `N-3: LiveProvider mapping DTO to domain` is
reviewable; "networking layer issue" is not.
