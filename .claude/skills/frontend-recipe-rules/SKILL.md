---
name: frontend-recipe-rules
description: Use when writing the markup inside a webapp page — cards, list rows, form fields, button rows, segmented tabs, empty states and destructive confirms. Which quiet component to compose for each, and what it commits to.
---

# Frontend Recipe Rules (webapp)

Ten recipes, one line each: compose the named quiet component, swap the content. Sizes, colour
roles and gaps are owned by `J-*`, `T-*`, `SP-*` — cite those, never restate them. `quiet:` paths
are files in `@optimusfoundry/quiet`.

- **R-2.2** An openable object in a grid is a `Card` with `href` or `onClick`, equal-span peers;
  never `<div onClick>`, and never a `Card` as a generic box.
  → `quiet:docs/guidelines/sections.md#the-containers`
- **R-2.5** KPIs are `StatCard` × 4 at `Col span={3}`, delta and period in the card; a trend is a
  `Sparkline` directly below, never nested.
  → `quiet:docs/guidelines/layouts.md#dashboard`
- **R-3.1** A run of similar records is `List divided` (or `Table`/`DataGrid`), not a stack of
  cards; status goes in a `Badge`, never a row tint; no panel around a table.
  → `quiet:docs/guidelines/layouts.md#full-bleed-table`
- **R-4.1** One field is one `TextField`/`TextArea`/`Select` with `label`, `helperText` (format or
  consequence, not the name again) and `error`; fields sit `--q-space-field` apart.
  → `quiet:docs/guidelines/layouts.md#form-page`
- **R-4.2** A form is one left-aligned column capped at `--q-w-form` (640); groups are
  `--q-space-block` apart under a `SectionHeader size="sm"`; actions end the column, primary last.
  → `quiet:docs/guidelines/layouts.md#form-page`
- **R-4.4** Destructive confirm: irreversible and small is `Button variant="destructive"` opening a
  `Dialog size="sm"` whose title names the object ("Delete this webhook?") and whose button names
  the consequence (never "OK"), Cancel first; reversible is act now + a toast with Undo. A toast
  raised while a Dialog is open is inert, so feedback inside it is an inline `Alert`.
  → `quiet:docs/guidelines/components.md#destructive-actions`
- **R-5.2** An action row ends with the primary, secondary before it; one primary per section,
  every control `size="sm"`; never centred.
  → `quiet:docs/guidelines/sections.md#section-headings`
- **R-5.3** 2–5 exclusive options are `Tabs variant="enclosed"` or `Radio`; more is a `Select`;
  views of one object are real `Tabs` (`PL-6`).
  → `quiet:docs/guidelines/components.md#easily-confused`
- **R-6.1** Nothing yet: `EmptyState` with a title, one factual line and one Create action; no
  secondary action.
  → `quiet:docs/guidelines/content.md#empty-states-help-and-errors`
- **R-6.2** Filtered empty: `EmptyState` + one ghost "Clear filters" — the action undoes the
  filter, it never creates something.
  → `quiet:docs/guidelines/components.md#waiting-empty-error`

No recipe fits? It is almost always a `Card`, a `List divided` or a `TextField` in disguise; chat
and agent UI have components (`components.md`).

Cite the rule ID when you flag a violation — `R-5.2: primary button centred in an action row`.
