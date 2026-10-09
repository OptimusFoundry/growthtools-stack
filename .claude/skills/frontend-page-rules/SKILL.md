---
name: frontend-page-rules
description: Use when building or reviewing a webapp route, page, or tab — the layout chosen for the user's job, the page header, sections and containers, grid splits, heading ladder, and the loading/empty/error state contracts.
---

# Frontend Page Rules (webapp)

Thirteen rules, one line each. Open a pointer for the table or recipe, not before; the order of
thinking is `quiet-app` "Lay out a screen". `quiet:` paths are files in `@optimusfoundry/quiet`
(see `frontend-design-rules`).

- **PL-2** A product route renders inside Layout's one `<main>` (it owns padding and max-width,
  `SP-5`) and opens with `PageHero size="md" ruled={false}` plus the template's padding-zeroing
  class (`as="h2"` under the Topbar's `h1`). No `PageShell` or `Container` on it;
  `PageShell narrow as="main"` is for public pages.
  → `quiet:docs/guidelines/layouts.md#app-shell`
- **PL-3** A section is a heading plus content: `SectionHeader size="sm" as="h2"` (its ink top
  rule is the divider; add no other), blocks `--q-space-block` apart, destructive last.
  → `quiet:docs/guidelines/sections.md#section-headings`
- **PL-4** Blocks sit on `Grid columns={12}` + `Col span`, spans 3·4·6·8·9·12 only (12, 8+4, 6+6,
  4+4+4, 3×4 KPIs, 9+3), always `rowGap` = `gap`; never 7+5 or a % width.
  → `quiet:docs/guidelines/grid.md#allowed-splits`
- **PL-5** Grid for page blocks, `Stack` for flow inside one; nav, list and inspector columns are
  fixed panes (240·200·360·400·640), never a `Col`.
  → `quiet:docs/guidelines/grid.md#pane-or-grid`
- **PL-6** 2–4 peer views of one object are `Tabs` under the PageHero; never tabs in tabs, nor
  tabs plus a section nav (over 4 groups is the Settings layout).
  → `quiet:docs/guidelines/sections.md#long-pages-scroll-tabs-or-nav`
- **Page header** `PageHero size="md"` is the only header — eyebrow, title (the component adds the
  molten period; apply `trimTrailingPeriod`), one-line intro, actions with one primary; one
  page-wide status `Alert`/`Banner` right under it.
  → `quiet:docs/guidelines/sections.md#section-types`
- **C-1** Layout follows the user's job (`quiet-app` step 2), at its dimensions; a page
  fitting none is two pages. Signed-out pages sit outside the shell.
  → `quiet:docs/guidelines/layouts.md#choosing`
- **C-5** One `<h1>` per route (the Topbar title, or the `PageHero` on a route without a Topbar),
  `<h2>` per section, `<h3>` per panel; level follows the outline (`as`), size the role; never skip
  a level for size.
  → `quiet:docs/guidelines/typography.md#hierarchy`
- **C-9** One collapse point: `SidebarProvider breakpoint={720}` swaps the `Sidebar` for its
  drawer; a `Grid` stacks by its own width (`spanMd`, `spanSm`); panes become routes or `Drawer`s.
  → `quiet:docs/guidelines/grid.md#responsive`
- **S-1** Each data block has its loading, empty and error designed (`quiet-app` step 8); hover,
  focus, disabled and selected come from the component.
  → `quiet:docs/guidelines/components.md#waiting-empty-error`
- **S-2** First load is a `Skeleton` shaped like the content, never a page spinner; under ~1s show
  nothing; a busy control is `Button loading`; a long job gets `Progress`.
  → `quiet:docs/guidelines/components.md#waiting-empty-error`
- **S-3** Two empties — nothing yet: `EmptyState` + one Create action; filtered: `EmptyState` +
  Clear filters. Only an `EmptyState` is centred.
  → `quiet:docs/guidelines/components.md#waiting-empty-error`
- **S-4** Errors at exactly one scope — field `error`, block `Alert` + retry, page `Banner`, or a
  toast for the user's own action — saying what happened and what to do next; never a status code.
  → `quiet:docs/guidelines/components.md#feedback-channel`

Template page patterns (`AsyncList`, gating, `useNotify`): `webapp/docs/TEMPLATE-PATTERNS.md`.

Cite the rule ID when you flag a violation — `PL-2: route wrapped in PageShell`.
