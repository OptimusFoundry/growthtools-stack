# Grid

Two tools, chosen by what the column holds. **Fixed-width panes** hold navigation and tool UI
(lists, inspectors, forms). **The 12-column grid** holds content blocks that should share space.
Specimen: Storybook `guidelines-grid--default`.

## Pane or grid?

| The column holds… | Use | Width |
|---|---|---|
| App nav | `Sidebar` in the shell | `--q-w-sidebar` 240 (rail 64) |
| Settings section nav | a sticky nav column | `--q-w-settings-nav` 200 |
| A selectable list beside its detail | list pane | `--q-w-list-pane` 360 |
| An inspector / properties / agent side panel | detail panel | `--q-w-detail-panel` 400 |
| A form, prose, or a chat column | single column, capped | `--q-w-form` 640 |
| Stats, charts, tables and feeds side by side | `Grid columns={12}` + `Col span` | fluid, ≤ `--q-w-max` 1280 |

Panes are `grid-template-columns: var(--q-w-…) minmax(0, 1fr)`. The pane is fixed and the content
flexes. Never size a pane in % or invent a width. If none of the six fits, the layout is wrong
(see [layouts.md](layouts.md)).

## The 12-column grid

```tsx
<Grid columns={12} gap="md" rowGap="md">
  <Col span={8}>…</Col>
  <Col span={4}>…</Col>
</Grid>
```

| | marketing | app | compact |
|---|---|---|---|
| Gutter `--q-grid-gutter` | 32 | 24 | 16 |
| `Grid gap` to use | `lg` | `md` | a plain grid with `gap: var(--q-grid-gutter)` |

- `Grid`'s named gaps are fixed px (`md` = 24), not density-aware. Match the table above.
- **Always pass `rowGap`.** `Grid` adds no row gap by default, so wrapped columns touch on narrow screens.
- Max width is `--q-w-max` 1280 for the page; reading content stops at `--q-w-content` 1040.

### Allowed splits

App pages use spans **3 · 4 · 6 · 8 · 9 · 12**. Everything else drifts off the 12 and stops lining
up between blocks.

| Split | For | Not for |
|---|---|---|
| 12 | a table, a wide chart, a full-width form section | — |
| 8 + 4 | main content + a supporting feed or summary (activity, agent run, donut) | two equal peers |
| 6 + 6 | two peer charts or panels of equal weight | main + aside |
| 4 + 4 + 4 | three peer objects (cards, small charts) | KPI tiles (use 3) |
| 3 × 4 | KPI row (`StatCard`) | anything with a paragraph |
| 9 + 3 | content + a narrow fact column (filters summary, key/values) | a feed (too narrow; use 8 + 4) |
| 5 + 6 from col 7 | split section head: heading left, intro/actions right (`Col span={5}` + `Col start={7} span={6}`) | body content |

Two blocks stacked on one page should share column edges: an 8 + 4 under a 3 × 4 row lines up at
column 9. A 7 + 5 doesn't, which is why it's not allowed.

## Responsive

`Grid` measures **its own width** (ResizeObserver), not the viewport. Breakpoints `[720, 960]`:

| Grid width | `Col` gets | Override |
|---|---|---|
| ≥ 960 | `span` | — |
| 720–960 | `span < 4` → 6, else `span` | `spanMd` |
| < 720 | 12 | `spanSm` |

So a 3 × 4 KPI row becomes 2 × 2, then 1 × 4. An 8 + 4 stays side by side until 720, then
stacks with the 8 first. `start` is ignored below 960. Put the most important column first in
source order, because that's the stacking order.

Panes don't respond on their own. Under 720, drop the pane: the sidebar becomes
`Sidebar mobile="drawer"`, the list pane becomes its own route, and the detail panel opens in a `Drawer`.

## Alignment

- Every block starts on a column edge. Nothing floats in a gutter or uses `margin-left` to line up.
- Nested grids: a `Col span={8}` may hold its own `Grid columns={12}`. Its columns won't match the page
  grid, so nest only for self-contained modules (a panel's internal layout), never to place page blocks.
- Check with `<GridOverlay offsetLeft={240} />` (Ctrl/⌘+G) in development: 12 columns plus 8px
  rhythm lines. Never ship it.

## PageShell and Container

`PageShell layout="single|half|third|sidebar|sidebar-right"` and `Container` use **fixed marketing
values**: 32 side padding (`--q-gutter`), 1280 / 880 max, 48 / 32 gaps, 96 bottom padding. Use them for
marketing and docs pages. In the app shell, `main` already sets `--q-space-section` /
`--q-space-page-x` padding and `--q-w-max`, so lay blocks out with `Grid` and panes directly.

## Don't

| Slop | Fix |
|---|---|
| 7 + 5, 5 + 5 + 2, or a % width | an allowed split, or a fixed pane |
| `minChildWidth` auto-fit for a dashboard | fixed spans, so rows line up |
| A grid with no `rowGap` | `rowGap` = `gap` |
| A sidebar or list as a `Col` | a fixed pane beside the grid |
| A centred 640 column on a wide app page with nothing beside it | that's a form page: left-align it under the page title |
| A nested grid to place page blocks | one page grid; nest only inside a module |
