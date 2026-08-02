---
name: frontend-page-rules
description: Use when building or reviewing a webapp route, page, or tab — page shell and grid structure, allowed column splits, the page-header stack, heading ladder, and the loading/empty/error state contracts.
---

# Frontend Page Rules (webapp)

Fourteen rules, one line each. Follow a rule's pointer when you need the worked JSX, not before —
examples and tables stay in the docs.

- **PL-2** Every product route wraps its content in `<PageShell>` — `default` / `narrow` / `full`;
  never a bare `<div>`, a hand-rolled max-width, or a shell inside a shell. It owns the page
  canonicals (`SP-5`).
  → `docs/design-docs/21-page-layout-decisions.md#pl-2-pageshell`
- **PL-3** `<Grid.Item>` is the section container inside a shell; a meaningful section takes
  `as="section"` + `aria-label`.
  → `docs/design-docs/21-page-layout-decisions.md#pl-3-griditem-as-semantic-section-container`
- **PL-4** Sanctioned splits only — full 12, 6+6, 4+4+4, 8+4, sidebar 3+9; when in doubt
  `span={{ base: 12 }}`.
  → `docs/design-docs/21-page-layout-decisions.md#pl-4-allowed-splits`
- **PL-5** Grid for page structure, Stack for flow inside a `Grid.Item` — Stack never wraps the
  outer page.
  → `docs/design-docs/21-page-layout-decisions.md#pl-5-grid-vs-stack`
- **PL-6** A tab shell (`Topbar` + `TabNav` + bare `<Outlet />`) carries no `PageShell`; its child
  routes each render one.
  → `docs/design-docs/21-page-layout-decisions.md#pl-6-tab-shell-convention`
- **PL-8** Full-bleed is a closed exemption list (builder surfaces, public signup/embed, Stripe pay,
  signin); a product page contains media, never full-bleeds it.
  → `docs/design-docs/21-page-layout-decisions.md#pl-8-full-bleed-exemptions`
- **Page header** is always `<PageHero>`, never hand-rolled — eyebrow → title → sublede → actions,
  then the section gap; the gaps themselves are `J-1`.
  → `docs/design-docs/11-page-composition.md#page-header-always-this-shape`
- **C-1** Five archetypes — dashboard, library, editor, settings, hero; a page fitting none is two
  pages.
  → `docs/design-docs/14-composition.md#c-1-the-five-page-archetypes`
- **C-5** One `<h1>` (the page title), `<h2>` per section, `<h3>` per card title; never skip a level
  for size — change the class, not the level.
  → `docs/design-docs/14-composition.md#c-5-headings-across-a-page`
- **C-9** Three breakpoints — ≥1200px, 720–1199px, <720px; no tablet tier, and every page ships an
  explicit mobile layout.
  → `docs/design-docs/14-composition.md#c-9-breakpoints`
- **S-1** Every surface ships all ten states — default, hover, focus, active, disabled, loading,
  empty, error, selected, read-only; if you are asking whether it needs one, it does.
  → `docs/design-docs/15-states.md#s-1-the-state-inventory`
- **S-2** Skeletons match the real shape so layout never shifts, carry no "Loading…" copy, and are
  skipped under 300ms; past 2s show determinate progress.
  → `docs/design-docs/15-states.md#s-2-loading-states--the-skeleton-discipline`
- **S-3** Three empties — first-run (CTA), filtered (clear-filters), permanently-empty (inline
  `--fg3` line); each holds its space, copy factual, never apologetic.
  → `docs/design-docs/15-states.md#s-3-empty-states`
- **S-4** Errors at exactly one scope — field, form, page, or toast, never stacked — saying what happened
  and what to do next; never a status code, never a toast without a retry.
  → `docs/design-docs/15-states.md#s-4-error-states`

Full condensed ruleset per topic: `docs/design-docs/quickref/{11,14,15,21}-*.md` (index:
`docs/design-docs/QUICKREF.md`).

Cite the rule ID when you flag a violation — `PL-2: route renders a bare <div> wrapper` is
reviewable; "the page layout is off" is not.
