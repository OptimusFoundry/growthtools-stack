---
name: backend-architecture-rules
description: Use when adding, editing, or reviewing any Go feature module in base-server — a new handler or processor package, a new route or endpoint, DI wiring in bootstrap.go, or request/response structs. Covers the nine structural rules — three-layer separation, constructor DI, consumer-side minimal interfaces, naming, context propagation, route registration, bootstrap wiring, request/response struct shape, and mockgen directives.
---

# Backend Architecture Rules (base-server)

Nine rules, one line each. Each carries a depth pointer — follow it when you need the worked
example, not before. The code lives in the doc; this file is the checklist.

- **A-1** Three layers stay separate — Handler = HTTP in/out only; Processor = business logic;
  Store = DB ops only.
  → `base-server/docs/ARCHITECTURE.md#layered-architecture`
- **A-2** Constructor-based DI everywhere (`New(...)`) — no global state, no singletons.
  → `base-server/docs/ARCHITECTURE.md#dependency-injection`
- **A-3** Interfaces are minimal and declared in the **consumer** package — the processor defines
  its store interface, the handler defines its processor interface; never the producer.
  → `base-server/docs/HANDLERS.md#processor-template`
- **A-4** Naming: camelCase vars, PascalCase exported, `Err`-prefixed error vars,
  `UPPER_SNAKE_CASE` error codes, `snake_case.go` files.
  → `base-server/docs/ARCHITECTURE.md#naming-conventions`
- **A-5** Pass `ctx` down every call; enrich with `observability.WithFields` before logging.
  Log field keys are `snake_case` (`account_id`).
  → `base-server/docs/ARCHITECTURE.md#context-usage`
- **A-6** Register routes in `api.go`'s `RegisterRoutes()` under the right group — public
  `apiGroup`, JWT-protected `protectedGroup`/`v1Group`.
  → `base-server/docs/HANDLERS.md#route-registration`
- **A-7** A new feature = new `Dependencies` field + constructor calls in `bootstrap.go` + one
  parameter on `api.New`.
  → `base-server/docs/HANDLERS.md#bootstrap-wiring`
- **A-8** `XxxRequest`/`XxxResponse` structs, snake_case JSON tags; validation lives in `binding`
  tags, not in handler code.
  → `base-server/docs/HANDLERS.md#requestresponse-structs`
- **A-9** `go:generate mockgen` directive at the top of every processor/handler file that defines
  an interface others must mock.
  → `base-server/docs/HANDLERS.md#handler-template`

Cite the rule ID when you flag a violation — `A-3: store interface declared in the store package`
is reviewable; "interface placement issue" is not.
