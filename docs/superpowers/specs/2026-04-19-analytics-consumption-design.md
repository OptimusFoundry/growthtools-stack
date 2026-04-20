# Analytics Consumption — Frontend Design

Surface the three backend analytics endpoints (`/analytics/overview`, `/analytics/timeseries`, `/analytics/platforms`) across three coordinated UI surfaces, and add one new backend endpoint for per-post analytics that surfaces the `analytics_unavailable_at` flag introduced in PR #50.

## Goals

1. Render time-series data currently fetched and discarded on `/analytics`.
2. Give users a date-range control so the hourly-collection pipeline added in PR #50 is actually visible in different windows.
3. Let users inspect per-post performance and see when a platform post has become permanently un-pollable (deleted on the remote platform).
4. Pull analytics into the home dashboard at a glance.

## Non-goals

- Custom date-range picker — v1 ships preset ranges only.
- Exporting CSV / PDF.
- Per-platform post comparison across posts.
- Backend prior-period comparison — computed client-side via a second hook call.

## Surfaces

### Surface A — `/analytics` page (enhancement)

Follows the canonical page composition (`docs/design-docs/11-page-composition.md`).

**Layout, top to bottom:**

1. **Hero** — existing. Eyebrow `PERFORMANCE · {n} platforms`, Fraunces title `The numbers, without the noise.` (italic moment on "without the noise"), serif sublede. Unchanged.
2. **Date-range tabs** — pill variant, synced to `?range=` search param. Values: `7d` / `30d` / `90d`. Default `30d` (matches backend default). Computed `from`/`to` passed into `useAnalytics`.
3. **Stat grid (4-up)** — `StatCard` components with Fraunces numerals. Add a trend chip (`.sc-tr up|down|neutral`) computed from a second `useAnalytics` call over the prior equivalent window.
4. **Time-series chart section** — `Card outlined` wrapping:
   - `section-head`: mono eyebrow `ENGAGEMENT OVER TIME`, right-aligned segmented selector (4 choices: Impressions / Likes / Comments / Shares).
   - Recharts `LineChart`, single active series determined by selector. Height 280px.
   - Theme: stroke `var(--primary)` deep indigo for the metric line with an 8% primary area fill underneath (`<Area>` layered below `<Line>`); horizontal gridlines in `var(--border)` only; mono 11px uppercase tick labels; serif tooltip value; mono tooltip date.
   - No legend (single series).
5. **Platform breakdown table** — refactor to `.tbl`-style markup: mono uppercase 11px headers, hairline borders, `tnum` numerals. Columns unchanged.

**States:**

- **Loading** — skeleton stat grid (4× `.sc` with three `.sk-line` rows each, matching S-2.9) plus a 280px chart skeleton rect. No spinner-in-page.
- **Empty — no connected platforms** — aspirational copy, primary CTA to `/account?tab=platforms`. Detected via `platformBreakdown.length === 0` _and_ overview totals all zero.
- **Empty — connected but no data in range** — factual copy "No data for this range," ghost action "Switch to 30 days."
- **Error** — page-level `Card outlined` with "Something went wrong" + retry button per S-4.3.

**URL shape:** `/analytics` or `/analytics?range=7d|30d|90d`. `range=30d` omits the query param.

### Surface B — `/posts/$id/analytics` page (new)

Follows the Detail page template (`webapp/docs/PAGE-TEMPLATES.md` §2).

**Route file:** `webapp/src/routes/posts.$id.analytics.tsx`. Coexists with `posts_.$id.tsx` (the edit wizard — underscore-prefix groups it outside normal nesting). The new route uses normal nesting to assert itself as a real detail view.

**Layout, top to bottom:**

1. **Breadcrumb** — `size="lg"`: `Posts → {post excerpt, 40-char truncated, title attr=full} → Analytics`.
2. `<Divider />`.
3. **Post summary card** (`Card outlined`):
   - Two-line clamp of post body.
   - Status `Badge` (success if `published`).
   - Published timestamp in mono.
4. **Per-platform-post section** — one `Card outlined` per `platform_post`, stacked with `gap="md"`:
   - **Header row:** platform `Badge default`, published timestamp (mono), external-link icon button opening `post_url` in a new tab (`rel="noopener noreferrer"`). Icon button gets `aria-label="Open on {platform}"` for A11Y uniqueness (see `webapp/docs/A11Y-PATTERNS.md`).
   - **Analytics-unavailable branch** — when `analytics_unavailable_at` is non-null: render `Badge variant="warning"` with text `Analytics unavailable`. Tooltip (`Tooltip` primitive): `This post is no longer reachable on {platform}. Metrics stopped updating on {localized date}.` Show the last-known snapshot underneath with values at 0.5 opacity (read-only-ish styling); no mini chart.
   - **Live branch** — 4 inline KPIs as `StatCard` in `size="sm"` variant (add this variant if it doesn't exist; otherwise render as compact `.sc` override): Impressions / Likes / Comments / Shares. Below: 80px-tall Recharts sparkline of `impressions` history. Mono "Updated {relative time}" caption.
5. **Entry point:** posts list (`webapp/src/routes/posts.tsx` / post row component) gains a ghost icon-only button linking to `/posts/{id}/analytics` on every post whose status is `published`. `aria-label="View analytics for {post excerpt}"` — unique per row.

**States:**

- **Loading** — breadcrumb renders immediately (post title comes from in-memory store if available, else placeholder). Body: skeleton card + one skeleton per-platform card.
- **Empty — post has no published platform posts** — factual: "This post isn't published yet. Analytics will appear here once it goes live."
- **Empty — all platform_posts are unavailable** — page still renders each card with its warning branch; no special page-level empty state (the information _is_ useful).
- **Error** — page-level card with retry.
- **404 — post not found / not owned** — factual card "Post not found." with secondary `<Link>` back to `/posts`.

### Surface C — Dashboard `Last 7 days` section (new)

Inserted into `webapp/src/routes/index.tsx` between the hero and Quick Access.

**Layout:**

- Mono eyebrow `LAST 7 DAYS · PERFORMANCE`.
- Fraunces h2 `Momentum at a glance.` (italic on "at a glance").
- 2-up grid on desktop, 1-up on mobile. Each cell is an editorial `.sc`-styled stat card:
  - Left: `IMPRESSIONS`, big Fraunces number, 60px-tall sparkline (stroke `var(--primary)`), `sc-tr` trend chip vs prior 7 days.
  - Right: `ENGAGEMENTS` (likes + comments + shares from the overview response — computed client-side), same shape, stroke `var(--accent)`.
- Right-aligned ghost link `View analytics →` pointing to `/analytics?range=7d`.

**States:**

- **Loading** — two skeleton stat cards with sparkline placeholders.
- **Empty — zero data across the window** — hide the entire section (S-3.3 permanently-empty pattern; dashboard hero already sets the tone).
- **Error** — hide the section; log to console. The dashboard should never fail because of this optional widget.

## Data layer

### Backend

**New endpoint:** `GET /api/protected/posts/:id/analytics`

Registered in `base-server/internal/infra/api/api.go` alongside existing `/posts/:id` routes.

**Response:**

```json
{
  "platform_posts": [
    {
      "platform_post_id": "uuid",
      "platform": "x",
      "status": "published",
      "published_at": "2026-04-18T10:22:00Z",
      "post_url": "https://x.com/user/status/123",
      "analytics_unavailable_at": null,
      "latest": {
        "impressions": 1240,
        "likes": 48,
        "comments": 3,
        "shares": 7,
        "clicks": 12,
        "collected_at": "2026-04-19T14:00:00Z"
      },
      "history": [
        { "collected_at": "2026-04-18T11:00:00Z", "impressions": 0, "likes": 0, "comments": 0, "shares": 0, "clicks": 0 }
      ]
    }
  ]
}
```

Empty `history` and `latest = null` when no analytics rows exist yet. Empty `platform_posts: []` when the post has none.

**Handler (`base-server/internal/posts/handler/handler.go`):** `HandleGetPostAnalytics`. Owns HTTP concerns, account-scope check via existing `getAccountID`. 404 when post is not owned by the caller's account (reuse `ErrNotFound` mapping).

**Processor (`base-server/internal/posts/processor/processor.go`):** `GetPostAnalytics(ctx, accountID, postID)`. Verifies ownership by fetching the post (existing store method), then asks the store for platform posts + their latest/historical metrics. Returns a typed result that matches the JSON response.

**Store additions (`base-server/internal/infra/store/post_analytics.go`):**

- `GetLatestAnalyticsByPost(ctx, postID) → []PlatformPostLatest` — one row per `platform_post` for the given post, joining `platform_posts` with a `DISTINCT ON (platform_post_id) … ORDER BY platform_post_id, collected_at DESC` subquery against `post_analytics`. Each row carries `platform_post_id`, `platform`, `status`, `published_at`, `post_url`, `analytics_unavailable_at`, and nullable latest metrics.
- Reuse existing `GetAnalyticsByPlatformPost(ctx, platformPostID)` for history.

Processor iterates platform posts, fetches history per post (concurrent calls via `errgroup` are acceptable but not required — a single post has ≤ 8 platform posts max).

**Errors:**

- 401 when no Account-ID (existing middleware).
- 404 when post doesn't exist or isn't owned.
- 500 on DB failures (existing `apierrors.InternalError`).
- 400 on invalid UUID.

**Tests:**

- Store test: happy path (multi-platform post with history), empty history, `analytics_unavailable_at` set, post with zero platform posts.
- Processor test: ownership mismatch → `ErrNotFound`; store error propagation.
- Handler test: route wiring + response shape.
- Integration test: real HTTP across 200 / 401 / 404 / 500.

### Frontend

**Hooks:**

- `useAnalytics({ from, to })` — existing, already accepts filters. Extend the date computation helpers with `rangeToDates('7d' | '30d' | '90d')` and `priorWindow({ from, to })`.
- `useAnalyticsComparison(range)` — thin wrapper that calls `useAnalytics` twice (current + prior) and returns `{ current, prior, deltas: { impressions, likes, comments, shares } }`. Used by both `/analytics` stat cards and dashboard sparkline cards.
- `usePostAnalytics(postId)` — new. Fetches `/api/protected/posts/:id/analytics`, transforms via new `toPostAnalytics(api)` transform.

**Transforms (`webapp/src/api/transforms/`):**

- Extend `analytics.ts` with `toPostAnalytics` + `toPlatformPostAnalytics`.
- Add API types in `webapp/src/api/types/analytics.ts`.

**Components (new):**

- `webapp/src/features/analytics/components/TimeSeriesChart/` — wraps Recharts, accepts `data`, `metric`, handles theme tokens. Memoized.
- `webapp/src/features/analytics/components/Sparkline/` — 60–80px-tall variant. Accepts `data`, `stroke`, `ariaLabel`.
- `webapp/src/features/analytics/components/DateRangeTabs/` — controlled pill tabs, reads/writes `?range=`.
- `webapp/src/features/analytics/components/MetricSelector/` — segmented control for the 4 metrics.
- `webapp/src/features/analytics/components/LastSevenDaysSection/` — the dashboard widget.
- `webapp/src/features/posts/components/PostAnalyticsPage/` — the route component for `posts.$id.analytics.tsx`.
- `webapp/src/features/posts/components/PlatformPostAnalyticsCard/` — one per platform post; branches on `analyticsUnavailableAt`.

**Route files (new):**

- `webapp/src/routes/posts.$id.analytics.tsx` — thin wrapper mounting `PostAnalyticsPage`.

**Route files (modified):**

- `webapp/src/routes/analytics.tsx` — no change (still a thin wrapper).
- `webapp/src/routes/index.tsx` — inserts `LastSevenDaysSection` between hero and Quick Access.
- `webapp/src/routes/posts.tsx` — adds per-row analytics ghost icon button on published posts.

**Component modifications:**

- `webapp/src/features/analytics/components/AnalyticsPage/component.tsx` — adds `DateRangeTabs`, trend chips on `StatCard`s, new chart section. Refactors platform breakdown table to `.tbl` class convention.

### Recharts theming

A small shared theme module `webapp/src/features/analytics/components/chart-theme.ts` exporting:

- `getChartColors()` — reads CSS custom properties via `getComputedStyle(document.documentElement)` at call time so theme switches work.
- Axis props, grid props, tooltip content component (Geist Mono date, Fraunces value), responsive container wrapper.

No hardcoded hex — every color sourced from `var(--primary) / --accent / --border / --fg2 / --fg3 / --bg-surface`.

## Testing

### Backend (per `base-server/CLAUDE.md`)

- Table-driven unit tests for handler + processor with gomock.
- Store test with real Postgres (`make dev-test-store`).
- Integration test hitting real HTTP against the in-process server.

### Frontend (per `webapp/CLAUDE.md`)

Playwright spec `webapp/e2e/analytics.spec.ts` table-driven via the `network` fixture. Covers:

- `/analytics`
  - 200 all endpoints, 30d range — renders stat cards, chart, table.
  - 200 empty overview — renders "no data in range" empty state.
  - 200 overview with zero platform breakdown — renders "no connected platforms" empty state with CTA.
  - `?range=7d` — chart data reflects 7-day request window.
  - 401 on any endpoint — redirects to signin.
  - 500 on any endpoint — renders page-level error with retry.
- `/posts/:id/analytics`
  - 200 with 2 platform posts, both live — two cards with sparklines.
  - 200 with one platform post marked `analytics_unavailable_at` — warning badge + greyed snapshot.
  - 200 with empty `platform_posts` — empty-state card.
  - 404 — "Post not found" card.
  - 401 — redirect.
  - 500 — page-level error.
- Dashboard `/`
  - 200 with data — LastSevenDays section renders.
  - 200 all zero — section hidden.
  - 500 — section hidden, rest of dashboard renders.

MSW handlers + scenario factories in `webapp/e2e/handlers/analytics.handlers.ts` (extend existing) and `posts.handlers.ts`.

No unit tests beyond the Playwright coverage unless a utility (e.g. `priorWindow`) has enough branching to warrant Vitest coverage.

## Open risks / known caveats

- **Prior-period delta via a second hook call** doubles request volume on `/analytics`. Acceptable for v1 since responses are small and cached; upgrade to a backend `?compare=prev` query in a follow-up if it becomes expensive.
- **Recharts bundle size** — already a dependency, no new cost.
- **Theme switches repainting charts** — handled by reading tokens at render time and keying `TimeSeriesChart` on `data-theme` to force remount on theme change.
- **Post URL** may be absent on older `platform_posts`. Render the external-link icon only when `post_url` is non-null.

## Rollout

Single PR preferred given the three surfaces share the hook + chart components. Size estimate: 1 handler + 1 processor method + 1 store method + ~6 new frontend components + 1 new route + Playwright spec. No migrations (all data already captured).
