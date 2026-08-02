---
name: backend-error-rules
description: Use when adding, editing, or reviewing any error path in base-server — a new domain `ErrXxx` variable, a processor's error logging, a handler's `handleError` switch, or request-binding validation. Covers the six error-handling rules — the two-tier log strategy, package-level domain errors, one `handleError` switch per handler, `ValidationError` for binding failures, the three-part change every new mapping needs, and the `apierrors` status-code reference.
---

# Error Handling Rules (base-server)

Six rules, one line each. Each carries a depth pointer — follow it when you need the worked
example, not before. The code lives in the doc; this file is the checklist.

- **E-1** Two-tier: processor logs full context at Error level (root cause); handler maps via
  `apierrors` at Info level — never log the same failure twice.
  → `base-server/docs/ERROR-HANDLING.md#two-tier-strategy`
- **E-2** Domain errors are package-level `ErrXxx` vars in the processor package; map
  `store.ErrNotFound` → a domain `ErrXxx`.
  → `base-server/docs/ERROR-HANDLING.md#error-definition`
- **E-3** Every handler has one `handleError(c, err)` switch, processor `ErrXxx` → `apierrors.*`;
  never raw `c.JSON` with an error.
  → `base-server/docs/ERROR-HANDLING.md#handler-layer`
- **E-4** Binding failures → `apierrors.ValidationError(c, err)`.
  → `base-server/docs/ERROR-HANDLING.md#validation-errors`
- **E-5** New error mapping = `ErrXxx` + a `handleError` case + a test hitting that case — always
  all three.
  → `base-server/docs/ERROR-HANDLING.md#adding-new-error-mappings`
- **E-6** `apierrors` reference: `BadRequest`/`ValidationError`→400, `Unauthorized`→401,
  `Forbidden`→403, `NotFound`→404, `Conflict`→409, `InternalError`→500,
  `ServiceUnavailable`→503.
  → `base-server/docs/ERROR-HANDLING.md#available-apierrors-functions`

Cite the rule ID when you flag a violation — `E-3: raw c.JSON on an error path` is reviewable;
"error handling issue" is not.
