---
name: frontend-design-rules
description: Use when building, styling, theming, or reviewing any webapp UI — page, component, SCSS module, or design review. The universal quiet design core — density, job-token gaps, the eight type roles, ink/grey/molten colour roles, one lead per page, component-first.
---

# Frontend Design Rules (webapp)

The webapp is built on quiet (`@optimusfoundry/quiet`): its components and `--q-*` tokens are the
whole vocabulary. One line per rule; open a pointer for the table, not before. The procedure (read
order, laying out a screen, finish checks) is `quiet-app`; these are the citable rules and
template deltas. `quiet:<path>` is a file in `webapp/vendor/quiet/`. Props
come from the vendored `.tsx`.

- **J-1** Every gap is a job token — inline, stack, field, card-pad, card-gap, block, section,
  page-x (`--q-space-*`, `--q-grid-gutter`); never a raw step, a margin on a quiet component, or
  marketing gaps.
  → `quiet:docs/guidelines/spacing.md#job-tokens`
- **J-2** Text by role — `--q-fg` headings and values, `--q-fg-body` paragraphs, `--q-fg-muted`
  secondary, `--q-fg-subtle` decoration only (fails AA); never a colour for emphasis.
  → `quiet:docs/guidelines/foundations.md#the-ladder`
- **J-3** Eight type roles, each set by a component prop (`PageHero`, `SectionHeader`, `Text`,
  `StatCard`), never a hand-set `font-size`; level follows the outline, size follows the role;
  emphasis is the `accent` italic, never bold body.
  → `quiet:docs/guidelines/typography.md#roles-app`
- **J-5** Products render `density="app"` (`compact` for dense admin), one density per surface; no
  marketing gaps or sizes in the app.
  → `quiet:docs/guidelines/foundations.md#density`
- **J-6** One primary `Button` (ink) per view and one eyebrow per header; molten `--q-accent` stays
  punctuation — the title period, one status mark.
  → `quiet:docs/guidelines/foundations.md#the-molten-rule`
- **T-1** Two families, `--q-font-sans` / `--q-font-mono`; mono for labels, IDs, timestamps, code,
  never sentences. A screen never names a family.
  → `quiet:docs/guidelines/typography.md#measure-numbers-wrapping`
- **T-5** Metrics are `StatCard`; numbers compared in columns are tabular and right-aligned
  (`Table` `columns[].align`).
- **T-6** Body 15, small 13; measure ≤ `--q-w-form` (640), reading column ≤ `--q-w-content` (1040).
- **T-11** Weights 400 body, 500 buttons, 600 section and card titles, 700 page title and metric —
  set by the component, never bold body as a heading.
  → `quiet:docs/guidelines/typography.md#the-scale`
- **SP-1** Screens use job tokens only; sub-8 steps and 20 live inside components; never
  `calc()`-divide a token.
  → `quiet:docs/guidelines/spacing.md#the-scale`
- **SP-5** The shell owns page canonicals: Layout's `<main>` pads `--q-space-section` top and
  bottom and `--q-space-page-x` on the sides, max `--q-w-max` (1280). A route inside sets none
  and takes no `PageShell`; only public pages outside the shell use `PageShell narrow as="main"`.
  → `quiet:docs/guidelines/layouts.md#app-shell`
- **SP-7** Gaps step up with structure — inline < stack < field < block < section; never a bigger
  gap inside a smaller one.
  → `quiet:docs/guidelines/spacing.md#what-goes-between-what`
- **FC-1** No barrel exports — no `index.ts`; import from source.
- **FC-2** No `any`; TS strict.
- **FC-3** SCSS Modules; no inline styles.
- **FC-4** Tokens only; no hex or px (`--q-*`).
  → `quiet:docs/guidelines/foundations.md`
- **FC-5** Template helpers, not raw parts: icons through `AppIcon`, toasts through `useNotify`,
  in-app links through `linkComponent` (`RouterLink`). A missing primitive is built in
  `webapp/src/components` on `--q-*` tokens and flagged for quiet.
  → `quiet:docs/guidelines/components.md#never-reinvent`

Cite the rule ID when you flag a violation — `J-1: a raw 20px gap`.
