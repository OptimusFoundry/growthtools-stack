# Webapp Layout Patterns

> **growth-tools note.** These docs come from the saas-template at `quiet-1`; their worked examples cite the
> template's `/webhooks` and `/api-keys` screens, which growth-tools doesn't have. The patterns apply unchanged
> to `/posts`, `/blog`, `/media`, `/analytics` and `/admin`. Until CH-001
> (`docs/briefs/2026-10-08-quiet-product-rewrite.md`) lands, those product screens are still on Proto.

How pages in this app compose quiet components. Components, layouts, spacing and type are specified in quiet's
[guidelines](../vendor/quiet/docs/guidelines/README.md); props are authoritative in the component source (`.tsx`)
files under `vendor/quiet/src/components/`. What the template adds on top (`AsyncList`, gating,
`useNotify`, `AppIcon`, dropped attributes) is in [TEMPLATE-PATTERNS.md](TEMPLATE-PATTERNS.md). Whole-page skeletons are in
[PAGE-TEMPLATES.md](PAGE-TEMPLATES.md).

---

## TL;DR

```
Page shell       Layout's <main> pads and caps width. Routes render <Topbar> first,
                 then a root <Stack>. No PageShell inside the shell.
Page title       Topbar title = the route's one h1.
                 <PageHero as="h2" className={styles.hero} eyebrow title accent description />
Section heading  <SectionHeader size="sm" as="h2" eyebrow title description? />
Breadcrumb       <Topbar breadcrumbs={[...]}>; routes never compose <Breadcrumb>
Tabs             <Tabs variant="line" tabs={[...]} panels={{...}} label="..." />
Form             <form> > <Stack gap="xl"> of <section aria-label> blocks, Save at bottom right
Empty state      <EmptyState icon title description actions />
Gated variant    <GatedEmptyState> or a non-dismissible <Banner>
Gaps             job tokens and Stack sizes per spacing.md; never a raw px
```

---

## 1. Page shell

Screens inside `Layout` render a fragment: `<Topbar>` and a root `Stack`. Public pages outside the shell use a narrow
`PageShell as="main"`. Exactly one `<main>` per route.

```tsx
// routes/webhooks/index.tsx
<>
  <Topbar title="Webhooks" actions={topbarCreateAction} />
  <Stack gap="xl">
    <PageHero size="md" as="h2" className={styles.hero} ... />
    {/* alerts, table, empty state */}
  </Stack>
</>
```

Layout choice, pane widths and the width cap are quiet's:
[layouts.md](../vendor/quiet/docs/guidelines/layouts.md). Mixed-width rows use
`Grid columns={12}` with `Col span`; see [grid.md](../vendor/quiet/docs/guidelines/grid.md). No
custom `grid-template-columns` (stylelint bans `display: grid`).

---

## 2. Page header

`PageHero` owns the eyebrow, display title, description and optional actions. Inside the shell it is `as="h2"` and takes
a module class that zeroes its padding; the Topbar title is the `h1`.

```tsx
import { PageHero } from "@optimusfoundry/quiet";

<PageHero
  size="md"
  as="h2"
  className={styles.hero}
  eyebrow={totalCount > 0 ? copy.page.eyebrow(activeCount) : copy.page.eyebrowEmpty}
  title={copy.page.title}
  accent={trimTrailingPeriod(copy.page.titleAccent)}
  description={copy.page.description}
/>
```

- The eyebrow carries data (`WEBHOOKS · 3 ACTIVE`); use an `eyebrowEmpty` for the zero state.
- `accent` is the italic emphasis and the title gets a period: strip the copy's own trailing "." with
  `trimTrailingPeriod`.
- Actions go through `Topbar actions` (or the `PageHeroActionsPortal`), not a hand-built row.

---

## 3. Section heading

Sub-section heads use `SectionHeader`; never hand-roll an eyebrow plus title.

```tsx
import { SectionHeader } from "@optimusfoundry/quiet";

<SectionHeader size="sm" as="h2" eyebrow="GENERAL" title="Webhook details" description="Where events are sent." />
```

Props: `eyebrow`, `title`, `description?`, `size?`, `as?` and more; check
`src/components/.../SectionHeader.tsx`. A section title is plain text; the component appends the period.

---

## 4. Breadcrumb

Routes pass `breadcrumbs` to `Topbar`, which renders quiet's `Breadcrumb` and a mobile back-link:

```tsx
// features/webhooks/components/WebhookForm/component.tsx
<Topbar breadcrumbs={[{ label: "Webhooks", href: "/webhooks" }, { label: "New" }]} />
```

Status badges and other header content go in the `Stack` below the Topbar, not in the breadcrumb.

---

## 5. Tabs

In-page tabs take a `tabs` array and a `panels` map:

```tsx
// features/account/components/AccountPage/component.tsx
<Tabs variant="line" defaultValue="billing" label="Settings tabs" tabs={TABS} panels={PANELS} />
```

Tab content is rendered bare, no `Card` wrapper. Use tabs for at most four short groups
([layouts.md](../vendor/quiet/docs/guidelines/layouts.md)).

---

## 6. Forms

- **Grouping.** `<form noValidate>` around a `Stack gap="xl"` of `<section aria-label>` blocks, each a `Stack gap="sm"`
  with a `SectionHeader` and its fields. No `Divider` between sections and no outer `Card`.
- **Labels.** Fields carry their own `label`, `helperText` and `error` props (`TextField`, `TextArea`, `Checkbox`).
- **Measure.** Cap the field stack at the form width in the module class; the value comes from
  [grid.md](../vendor/quiet/docs/guidelines/grid.md) and
  [layouts.md](../vendor/quiet/docs/guidelines/layouts.md), not a literal.
- **Save row.** Bottom, not sticky: `Stack direction="row" justify="flex-end" gap="sm"` with Cancel (`ghost`) then Save
  (`primary`).

```tsx
// features/webhooks/components/WebhookForm/component.tsx
<Stack direction="row" justify="flex-end" gap="sm" className={styles.actions}>
  <Button type="button" variant="ghost" onClick={handleCancel} disabled={loading}>Cancel</Button>
  <Button type="submit" variant="primary" loading={loading} leftIcon={<AppIcon icon={Save} />}>Save</Button>
</Stack>
```

Dialog forms put the same buttons in the `Dialog`'s `actions`, with a truthy `title`
([TEMPLATE-PATTERNS.md](TEMPLATE-PATTERNS.md)).

---

## 7. Empty states

Always quiet's `EmptyState`:

```tsx
// routes/webhooks/index.tsx
<EmptyState
  headingLevel={2}
  icon={<AppIcon icon={Webhook} size="2xl" />}
  title={trimTrailingPeriod(copy.empty.title)}
  description={copy.empty.description}
  actions={<Button variant="primary" leftIcon={<AppIcon icon={Plus} />} onClick={onCreate}>Create webhook</Button>}
/>
```

- `icon` is a node, through `AppIcon`.
- `title` is short, in the "No {X} yet" / "No {X} found" form.
- `description` accompanies an action; omit it for a filtered list with no matches.
- `actions` is the call to action that leaves the empty state; omit it when none makes sense.

### Gated variant

For a feature behind a paywall, use `GatedEmptyState` (`@/components/gating/GatedEmptyState/component`), which renders
the empty state with an upgrade banner. Routes that stay usable show a non-dismissible `Banner status="info"` above the
content instead. Details in [TEMPLATE-PATTERNS.md](TEMPLATE-PATTERNS.md).

---

## Spacing and width

Every gap is a job token or a `Stack` size per
[spacing.md](../vendor/quiet/docs/guidelines/spacing.md). Stack and Grid `gap` names are quiet's;
do not translate from memory, check the component source. Widths and fixed panes: see
[grid.md](../vendor/quiet/docs/guidelines/grid.md) and
[layouts.md](../vendor/quiet/docs/guidelines/layouts.md). Breakpoint mixins for SCSS are in
[TEMPLATE-PATTERNS.md](TEMPLATE-PATTERNS.md).

---

## Prefer

| Prefer | Avoid |
|---|---|
| `Topbar` `breadcrumbs` | composing `Breadcrumb` in a route |
| `PageHero as="h2"` with a zero-padding class inside the shell | `PageShell` inside the shell |
| `SectionHeader` | hand-rolled eyebrow and title CSS |
| `EmptyState icon={<AppIcon ... />}` | a string icon name |
| Native `<section aria-label>` for named regions | `aria-label` on `Stack` or `Grid` (dropped) |
| A field's own `label` prop | a bare `<label>` beside a control |
