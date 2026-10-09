---
name: frontend-e2e-rules
description: Use when adding, modifying, or reviewing any webapp UI surface in this repo (routes in webapp/src/routes/, pages, forms, tabs, or new API calls from webapp/). Ensures every UI change ships a Playwright spec with MSW handlers that table-drive across all response status codes each endpoint can return.
---

# Playwright Coverage Check

Every webapp PR that touches a user-visible path MUST ship Playwright coverage. No exceptions for "tiny" changes — the whole point is that the spec + diff becomes the navigation map for the next agent.

## Scope — when this skill applies

Trigger this skill whenever a change touches any of:

- `webapp/src/routes/**` — new or modified route
- `webapp/src/features/**/pages/**` or `**/forms/**` — new page or form
- `webapp/src/components/**` when the component is exposed on a user-visible path
- Any new `fetch`/API call from webapp code (new endpoint surface)
- Any change to response handling (new status-code branch in a component/hook)

If the change is purely internal (types, utilities with no UI surface, pure refactor with zero behavior delta), you may skip — but state that you checked and why.

## Requirements for the Playwright spec

Every covered UI path needs a spec in `webapp/e2e/<feature>.spec.ts`. The spec MUST:

1. **Exercise the golden path** — load the page, assert the primary content renders.
2. **Exercise every user interaction the change introduces** — clicks, form submits, navigation.
3. **Table-drive across every status code each API call can return** — see "Status code coverage" below. This is the core discipline — do not skip it.
4. **Use stable selectors** — `getByRole`, `getByLabel`, `getByTestId`. No coordinate-based or brittle text matches that will rot. quiet drops `id` and `data-*` on most components (only Button, ButtonGroup, Link, ArrowLink, Spinner, Input, Select, TextArea and TextField spread rest props; `Text` accepts no HTML attributes at v0.3.0), so a `data-testid` goes on a wrapping native element; prefer role and label.
5. **Use the `network` fixture** from `webapp/e2e/fixtures/test.ts` — never Playwright's `page.route` for API mocking. MSW handlers must be the single source of truth.

## MSW handler requirements

For every new backend endpoint the webapp calls, add/extend a handler in `webapp/e2e/handlers/<domain>.handlers.ts`:

- The **default export handler** returns the 2xx happy path with realistic mock data from `webapp/e2e/mocks/data/`.
- The **`<domain>Scenarios` factory object** exposes a named factory for every non-2xx status the endpoint can return (`unauthorized`, `forbidden`, `notFound`, `conflict`, `rateLimited`, `serverError`, `networkError`, etc.) plus any meaningful 2xx variants (`empty`, `paginated`, `partial`).
- Register the handler in `webapp/e2e/handlers/index.ts`.

Scenario factories return a single `http.*` handler ready to pass to `network.use(...)`. Keep them small and composable.

## Status code coverage — table-driven pattern

Every API call the component makes must be covered with a table-driven test that iterates over every status code that call can realistically return. The source of truth for "realistically" is the backend handler's `handleError` mapping plus its success codes.

Use this pattern inside the spec's `Error Handling` (and, where relevant, `Status Code Coverage`) block:

```ts
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";

const postsListStatusCases = [
  { status: 200, body: [], expect: /no posts yet/i, label: "empty list" },
  { status: 401, body: { error: "unauthorized" }, expect: /sign in/i, label: "unauthorized" },
  { status: 403, body: { error: "forbidden" }, expect: /not allowed/i, label: "forbidden" },
  { status: 429, body: { error: "rate limited" }, expect: /too many/i, label: "rate limited" },
  { status: 500, body: { error: "server" }, expect: /something went wrong/i, label: "server error" },
] as const;

for (const tc of postsListStatusCases) {
  test(`GET /posts handles ${tc.status} — ${tc.label}`, async ({ network, page }) => {
    network.use(
      http.get("*/api/protected/posts", () =>
        HttpResponse.json(tc.body, { status: tc.status }),
      ),
    );
    await page.goto("/posts");
    await page.waitForLoadState("networkidle");
    const body = await page.textContent("body");
    expect(body).toMatch(tc.expect);
  });
}

test("GET /posts network failure", async ({ network, page }) => {
  network.use(
    http.get("*/api/protected/posts", () => HttpResponse.error()),
  );
  await page.goto("/posts");
  await page.waitForLoadState("networkidle");
  expect(await page.textContent("body")).toMatch(/offline|unavailable|try again/i);
});
```

Rules:

- **One case per status code** the endpoint can return. If the backend `handleError` maps to 401/403/404/409/429/500, the table has 5 rows plus the 2xx variants.
- **Every case asserts observable UI** — a message, a toast or an `Alert`, a redirect, an empty state. Never just `expect(body).toBeTruthy()`; that's the anti-pattern currently in the repo and should be replaced when you touch a spec.
- **Always include a `HttpResponse.error()` case** for transport-level failure, as a separate test (not in the table — it doesn't have a status code).
- **For mutations (POST/PUT/DELETE)** the table lives inside the interaction test — trigger the click/submit, then assert on each status.

## Locators on quiet

- **Toast** — `getByRole("status")` for info, success and warning, `getByRole("alert")` for error, filtered by text (`.filter({ hasText: /webhook deleted/i })`). `locator("output")` no longer matches. The dismiss button is named "Dismiss notification".
- **Dialog** — `getByRole("dialog", { name })`, where the name is the `title` plus quiet's visible trailing period, so match with a regex (`/delete this webhook/i`). There is no description slot and no footer; the buttons are inside, and the close button is named "Close dialog". While it is open everything outside is `inert`, so assert inside the dialog. A toast raised meanwhile is inert too: the flow shows an inline `Alert`, asserted with `getByText`.
- **Sidebar** — `SidebarTrigger` (default name "Open navigation") renders only below the `SidebarProvider breakpoint`, which is 720 in the template. Set a viewport under 720 (390 wide) before looking for it, and 720 or more for the desktop sidebar. The open drawer is a `role="dialog"` named like the nav, with a "Close navigation" button.
- **Theme** — `localStorage["quiet-theme"]` is `foundry` or `foundry-dark` and `html[data-theme]` mirrors it (a stored `proto-theme` is migrated once).
- **Links** route client-side; assert the URL, not a reload.

## Audit checklist before claiming coverage

Before saying "Playwright coverage added":

1. `cd webapp && npx playwright test e2e/<feature>.spec.ts --list` enumerates every intended test. Agents do not run the suite — the user runs Playwright manually when they choose (it is slow).
2. Every new endpoint has a handler in `e2e/handlers/<domain>.handlers.ts` AND a scenario factory for each non-2xx code.
3. The status-code table in the spec matches the backend `handleError` mapping — open the backend handler and confirm. If the mapping grows later, the table must grow with it.
4. No `page.route` used for API mocking; all mocking goes through `network.use(...)`.
5. No `expect(body).toBeTruthy()` in error-handling assertions — every case asserts specific user-visible output.

## Keeping spec files bounded — split before they become monoliths

Spec files accumulate tests over a feature's lifetime and silently become expensive to work with: every agent that later extends or fixes one has to re-read the whole thing first. `canvas.spec.ts` reached 2,821 lines and `avatars.spec.ts` reached 1,442 before anyone split them — don't let a spec get there.

- **Trigger**: a spec file exceeding ~600 lines, or about to be pushed past that by the tests you're adding.
- **Convention**: split by top-level `describe` block into `<feature>-<concern>.spec.ts` files — one file per page/domain-concern (e.g. `avatars-list.spec.ts` / `avatars-create.spec.ts` / `avatars-detail.spec.ts`, or `canvas-render.spec.ts` / `canvas-layout.spec.ts` / etc. for a single page with many concerns). Extract any shared top-level consts/helper functions (URLs, fixture builders, custom locators) into `<feature>.helpers.ts`, exported for each split file to import.
- **Each split file is independent** — Playwright spec files don't share scope, so each one keeps its own copy of the relevant `test.describe(...)` wrapper and `test.beforeEach(...)` setup (e.g. `network.use(...)`). This is expected duplication, not a mistake.
- **Verify the split preserves every test**: diff the exact test names (`npx playwright test <old+new> --list`, normalized to strip `file:line:col`) before deleting the original — a matching count alone isn't enough, confirm the same names.
- See `webapp/e2e/canvas-*.spec.ts` + `canvas.helpers.ts` and `webapp/e2e/avatars-*.spec.ts` + `avatars.helpers.ts` for worked examples of this split.

## Integration with existing flow

- **Specs come FIRST (tests-first pipeline):** `frontend-supervisor` dispatches `frontend-e2e-test-writer` with this skill BEFORE any builder runs — handlers + specs are written from the plan's endpoint/selector/state contracts, and builders implement against them. A spec written against a not-yet-built page asserts the ticket's selector contract verbatim.
- Playwright is **not** part of any agent gate or CI. The frontend gate is `npm run build` + `npm run lint` + `npm run lint:scss`; the user runs the specs manually.
- When reviewing a webapp PR via `frontend-code-reviewer`, verify the status-code table exists and matches the backend mapping.

## Anti-patterns to reject

- "I'll add the Playwright spec in a follow-up PR." No — the spec ships with the change.
- Tests that only check `body).toBeTruthy()` — they assert nothing.
- Using `page.route` to stub APIs — bypasses MSW and makes handlers non-reusable.
- Skipping 401/403 because "the router handles it" — the spec proves the router handles it.
- Testing only the happy path because "errors are rare" — the table is the whole point.
