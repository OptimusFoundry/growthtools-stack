# Webapp Layout Patterns

How pages in this app are built today. The repo has a strong design system
(`@/proto-design-system`) that provides primitives like `Stack`, `Card`,
`Breadcrumb`, `Tabs`, `EmptyState`, etc. This doc catalogues the conventions
feature code uses when composing them — the spacing, heading treatments,
width constraints, and other repeatable structure that gives pages a
cohesive feel.

**Not a style guide for new components.** For component-level rules see
`DESIGN-GUIDELINES.md` and `proto-components.md`. This file is about
*composing* those components at the page level.

---

## TL;DR

```
Page shell       <Stack gap=lg> + .page { padding: --space-5 } + scroll in <main>
Page title       <Text as=h1 size=2xl weight=bold>  +  <Text color=muted>
Section heading  <Text as=h3 size=lg weight=semibold> + <Text color=muted size=sm>
Breadcrumb       <Breadcrumb size=lg> + <Divider/> on detail pages
Tabs             <Tabs variant=line> — two flavours: route-driven or in-page
Form             <Stack gap=md> per section, <Divider/> between, Save at bottom
Empty state      <EmptyState icon title description action/>

Field gap        gap=md inside a section, gap=xs inside a sub-group
Section gap      Divider + Stack gap=lg on the page shell
Max width        none on shells; 800px or var(--max-width-2xl) on forms only
```

---

## 1. Page shell

Every standard list / index page uses the same outer frame: a root `Stack`
with `gap="lg"` plus a local `.page` SCSS class that adds padding.

```tsx
// routes/blasts/index.tsx
<Stack gap="lg" className={styles.page}>
  {/* page header */}
  {/* filters / content */}
</Stack>
```

```scss
// .module.scss paired with the route
.page {
  padding: var(--space-5);
  gap: var(--space-5);
}
.pageContent {
  gap: var(--space-4);
}
```

Seen in: `CampaignsListPage/component.module.scss:9`, `routes/blasts/index.module.scss:9`,
`routes/webhooks/webhooks.module.scss:9`, `routes/page.module.scss:9`. All identical.

**No page-level max-width.** The shell always spans the content column.
Width constraints live on the *inner* form, not the outer page.

**Outer frame (repo-wide).** `Layout.tsx` renders `<Sidebar>` alongside
`<main>` which handles scroll and tints the bg with
`--color-bg-tertiary-default`. Feature pages don't need to know about this —
just render as above.

**Known exception.** The `account` settings page uses a bare `<div>` with
`.page { padding: var(--space-6) }` instead of `Stack` (line:5 of its SCSS).
A few older routes (`api-keys`, `contacts`, `campaigns/$campaignId/edit`)
use `motion.div` for entry animation but still apply the same `.page` class.
Use `Stack gap="lg" className={styles.page}` for new pages.

---

## 2. Page header (title + subtitle)

The top of every list page. Two `Text` components in a tight `Stack`, often
inside a row `Stack` that parks the primary action (e.g. "Create Campaign"
button) at the right.

```tsx
// routes/webhooks/index.tsx:165
<Stack direction="row" justify="between" align="start" wrap>
  <Stack gap="xs">
    <Text as="h1" size="2xl" weight="bold">
      Webhooks
    </Text>
    <Text color="muted">
      Send real-time notifications when events happen
    </Text>
  </Stack>
  <Button leftIcon={<Plus size={16} />}>New Webhook</Button>
</Stack>
```

**Canonical title:** `<Text as="h1" size="2xl" weight="bold">` — matches in
`CampaignsListPage/component.tsx:135`, `routes/blasts/index.tsx:92`,
`routes/segments/index.tsx:77`, `routes/webhooks/index.tsx:168`.

**Subtitle:** `<Text color="muted">` — inherits the default body size.

**Gap between them:** `gap="xs"` inside the inner `Stack`.

**Known exceptions.** `AccountPage/component.tsx:33` and the API Keys page
use `weight="semibold"` instead of `"bold"`, and `color="secondary"`
instead of `"muted"` for the subtitle. Either works — `bold` + `muted` is
more common, prefer it.

---

## 3. Section heading within a page

Sub-sections of a form or detail page use the same two-line pattern as the
page header, only smaller. Always wrapped in a `Stack gap="xs"` with the
class `.sectionHeader`. Always has a description under the title.

```tsx
// features/campaigns/components/CampaignForm/component.tsx:628
<Stack gap="xs" className={styles.sectionHeader}>
  <Text as="h3" size="lg" weight="semibold">
    General
  </Text>
  <Text color="muted" size="sm">
    Basic information about your campaign
  </Text>
</Stack>
```

Repeated at lines 666–672 ("Signup Options"), 749–755 ("Growth Features"),
893–899 ("Conversion Tracking"). Same pattern in
`EmailSettingsSection/component.tsx:156-162`.

**Separator between sections:** `<Divider />`. CampaignForm uses one between
every section (lines 662, 731, 744, 890, 1023).

**Danger-zone variant:** same shape, adds a local class for color —
`CampaignSettings/component.tsx:237`:

```tsx
<Text as="h3" size="lg" weight="semibold" className={styles.dangerTitle}>
  Danger Zone
</Text>
```

```scss
.dangerTitle { color: var(--color-error); }
```

**Known exception.** `routes/integrations/index.tsx:116` uses a raw
`<h2 className={styles.sectionTitle}>`. Prefer the `<Text as="h3">`
pattern above for consistency.

---

## 4. Breadcrumb

Used on detail / nested routes. Always the `Breadcrumb` component from
`@/proto-design-system/components/navigation/Breadcrumb`.

```tsx
// routes/campaigns/$campaignId.tsx:63
<Stack direction="row" gap="2xl" className={styles.header}>
  <Stack direction="row" gap="sm" align="center">
    <Breadcrumb
      items={[
        { label: "Campaigns", href: "/campaigns" },
        { label: campaign.name },
      ]}
      size="lg"
    />
    <Badge variant={getStatusVariant(campaign.status)}>{/* … */}</Badge>
  </Stack>
  <Divider />
  <CampaignTabNav campaignId={campaignId} />
</Stack>
```

- **Size:** `size="lg"` on detail pages with tabs, default (`md`) on form
  pages like `routes/campaigns/$campaignId/edit.tsx:147`.
- **Divider after breadcrumb:** yes, when tabs or a sub-nav follow. No
  divider on simple edit pages.
- **Defaults.** Component defaults to `separator=<ChevronRight>`,
  `showHomeIcon=true`, `size="md"` — set in
  `proto-design-system/components/navigation/Breadcrumb/Breadcrumb.tsx:46`.

---

## 5. Tabs

Two flavours, both use `Tabs` from `@/proto-design-system/components/navigation/Tabs`.

### A. Route-driven tabs (campaign detail)

Each tab navigates to a sub-route. `Tabs` renders only the `TabList`;
content is rendered by `<Outlet />` in the route layout. `activeTab` and
`onTabChange` are controlled externally via `useNavigate`.

```tsx
// features/campaigns/components/CampaignTabNav/component.tsx:149
<Tabs activeTab={activeTab} onTabChange={handleTabChange} size="lg" variant="line">
  <TabList>
    <Tab id="overview" icon={<LayoutDashboard size={16} />}>Overview</Tab>
    <Tab id="users" icon={<Users size={16} />}>Users</Tab>
    {/* … */}
  </TabList>
</Tabs>
```

Tab content renders in `<main className={styles.content}>` via `<Outlet />`
— no Card wrapper, no new Container. Content padding is
`var(--space-4) var(--space-5)` (`campaignLayout.module.scss:44`).

Mobile fallback: a `<Select>` dropdown under the same breakpoint —
`CampaignTabNav/component.tsx:134-145`.

### B. In-page tabs (account settings)

All content lives in the same component. Uses the full
`Tabs + TabList + TabPanels + TabPanel` combo, uncontrolled via `defaultTab`.

```tsx
// features/account/components/AccountPage/component.tsx:40
<Tabs defaultTab="billing" variant="line">
  <TabList aria-label="Settings tabs">
    <Tab id="billing" icon={<CreditCard size={16} />}>Billing</Tab>
  </TabList>
  <TabPanels>
    <TabPanel id="billing"><BillingTab /></TabPanel>
  </TabPanels>
</Tabs>
```

Tab content is a bare component — no Card wrapper. `.tabContent` adds
`padding-top: var(--space-6)`.

---

## 6. Forms

### Grouping

Bare `Stack`s with dividers between sections. **No outer Card wrapper
around the whole form.** Sub-groups (e.g. the referral config block
inside a broader settings page) use `Card variant="filled" padding="md"`
— `CampaignForm/component.tsx:772`.

### Width constraints

Forms are the only place width is capped. Two values in use:

- `max-width: var(--max-width-2xl)` — `CampaignForm/component.module.scss:9`
- `max-width: 800px` — `CampaignSettings/component.module.scss:4`

Both resolve to ~800px. Prefer a token (`var(--max-width-2xl)`) over the
hard-coded value for new forms.

### Field gaps

| context | gap |
|---|---|
| between sections (separated by `<Divider />`) | `gap="lg"` on the outer form `Stack` |
| between fields within a section | `gap="md"` |
| between tightly-related sub-fields (e.g. checkboxes in a group) | `gap="xs"` |

### Full-width

Form fields render at their natural width inside the max-width wrapper.
`Input` / `TextField` do **not** get `isFullWidth` in form usage — the
form's own max-width does the sizing. (Different from standalone pages
like Voice Profile where `isFullWidth` is explicit.)

### Labels

Mixed, depending on component:

- `TextField` — uses its own `label` prop.
  ```tsx
  <TextField id="points" label="Points per Referral" {...} />
  ```
- `Dropdown` — preceded by an explicit `<Label>` element above.
  ```tsx
  <Stack gap="xs">
    <Label>Duplicate Email Handling</Label>
    <Dropdown items={...} />
  </Stack>
  ```
- `Checkbox` — uses built-in `label` + `description` props.

For new forms, wrap any `Dropdown` / `Select` in a `<FormField label="…">`
so it matches the `TextField` / `TextArea` label treatment. Several tabs
elsewhere in the repo do this already.

### Save button

Bottom of the form, not sticky. `Stack direction="row" justify="end" gap="sm"`
with Cancel (outline) first, then Submit (primary).

```tsx
// CampaignForm/component.tsx:1027
<Stack direction="row" justify="end" gap="sm">
  {onCancel && (
    <Button type="button" variant="outline" onClick={onCancel}>
      Cancel
    </Button>
  )}
  <Button type="submit" variant="primary" leftIcon={<Check size={16} />}>
    {submitText}
  </Button>
</Stack>
```

Modal forms use the same pattern inside the Modal's `footer` prop —
`routes/api-keys.tsx:308`.

---

## 7. Empty states

Always the `EmptyState` component from
`@/proto-design-system/components/data/EmptyState`. Defaults to `size="md"`
which gives `padding: var(--space-10)` and a
`var(--font-size-lg)` title.

```tsx
// routes/segments/index.tsx:139
<EmptyState
  icon={<Users size={48} />}
  title="No segments yet"
  description="Create your first segment to group users by custom criteria"
  action={
    <Button leftIcon={<Plus size={16} />} onClick={handleCreate}>
      Create Segment
    </Button>
  }
/>
```

### Prop usage conventions

- **`icon`** — always a Lucide icon at `size={48}` (or equivalent JSX).
  One outlier passes a string (`"megaphone-line"`) on
  `routes/campaigns/$campaignId.tsx:58` — that's a bug; the component
  expects a node.
- **`title`** — required, short; in the "No {X} yet" / "No {X} found" form.
- **`description`** — present when there's an `action`, omitted for pure
  "not-found" results (e.g. filtered list with zero matches).
- **`action`** — primary CTA button that takes the user out of the empty
  state (create, connect, invite, etc.). Omit when no action makes sense.
- **`secondaryAction`** — rarely used; for a secondary "Learn more" link.

### Gated variant

When the feature is behind a paywall, use `GatedEmptyState` from
`@/components/gating` instead — it renders the same empty state but wraps
it with the upgrade banner. Props are a superset: `feature`, `icon`,
`title`, `description`, `bannerDescription`.

```tsx
// routes/segments/index.tsx:84
<GatedEmptyState
  feature="segments"
  icon={<Users size={48} />}
  title="Segments require a Pro plan"
  description="Group users by custom criteria."
  bannerDescription="Upgrade to Pro to create segments."
/>
```

---

## Spacing reference

All values are tokens from `--space-*`. The ones that actually show up in
layout code:

| token | px | where |
|---|---|---|
| `--space-1` (`gap="xs"`) | 4 | tight checkbox groups, inline chips |
| `--space-2` (`gap="sm"`) | 8 | button rows, inline text+icon |
| `--space-3` (`gap="md"`) | 12 | most field-to-field gaps |
| `--space-4` (`gap="lg"`) | 16 | `.pageContent` inner gap, button groups |
| `--space-5` | 20 | `.page` outer padding + gap |
| `--space-6` | 24 | account page padding, tab content top padding |
| `--space-8` | 32 | — |
| `--space-10` | 40 | EmptyState padding |

`var(--max-width-2xl)` (≈672px in the token set, but in practice this app
treats it as ~800px) is the go-to form width.

---

## Composition cheat sheet

A typical form-behind-tab page looks like:

```tsx
<Stack gap="lg" className={styles.page}>
  {/* 1 — breadcrumb + tabs, if any */}
  <Stack direction="row" gap="sm" align="center">
    <Breadcrumb size="lg" items={...} />
  </Stack>
  <Divider />
  <TabNav />

  {/* 2 — page header */}
  <Stack direction="row" justify="between" align="start" wrap>
    <Stack gap="xs">
      <Text as="h1" size="2xl" weight="bold">Campaign Settings</Text>
      <Text color="muted">Configure email, growth, and tracking</Text>
    </Stack>
    <Button>Primary action</Button>
  </Stack>

  {/* 3 — form */}
  <Stack gap="lg" className={styles.form /* max-width: var(--max-width-2xl) */}>
    <Stack gap="xs">
      <Text as="h3" size="lg" weight="semibold">General</Text>
      <Text color="muted" size="sm">Basic information about your campaign</Text>
    </Stack>
    <Stack gap="md">
      <TextField label="Name" />
      <TextArea label="Description" />
    </Stack>

    <Divider />

    {/* next section */}

    {/* save row */}
    <Stack direction="row" justify="end" gap="sm">
      <Button variant="outline">Cancel</Button>
      <Button variant="primary" leftIcon={<Check size={16} />}>Save</Button>
    </Stack>
  </Stack>
</Stack>
```

---

## Known inconsistencies worth knowing

These aren't bugs, just points where the repo has two patterns that do the
same thing. If you're adding new code, prefer the left column.

| Prefer | Avoid |
|---|---|
| `<Stack gap="lg" className={styles.page}>` | bare `<div className={styles.page}>` |
| title `weight="bold"`, subtitle `color="muted"` | `weight="semibold"` + `color="secondary"` |
| `<Text as="h3" …>` for sections | raw `<h2 className={styles.sectionTitle}>` |
| `<EmptyState icon={<Megaphone size={48} />}>` | `<EmptyState icon="megaphone-line">` (string) |
| `<FormField label="…">` wrapping a Dropdown | hand-rolled `<Stack><Label/><Dropdown/></Stack>` |
| `max-width: var(--max-width-2xl)` | `max-width: 800px` |
