# Page Templates

> **growth-tools note.** These docs come from the saas-template at `quiet-1`; their worked examples cite the
> template's `/webhooks` and `/api-keys` screens, which growth-tools doesn't have. The patterns apply unchanged
> to `/posts`, `/blog`, `/media`, `/analytics` and `/admin`. Until CH-001
> (`docs/briefs/2026-10-08-quiet-product-rewrite.md`) lands, those product screens are still on Proto.

The four layouts the screens use. Layout names, dimensions and rules live in quiet's
[layouts.md](../vendor/quiet/docs/guidelines/layouts.md) (with
[sections.md](../vendor/quiet/docs/guidelines/sections.md) and
[grid.md](../vendor/quiet/docs/guidelines/grid.md)); nothing is restated here. Template-only
helpers are in [TEMPLATE-PATTERNS.md](TEMPLATE-PATTERNS.md). Page-level conventions are in [PATTERNS.md](PATTERNS.md).

| Layout | Real route to copy from |
|---|---|
| Dashboard | `src/routes/index.tsx` |
| Full-bleed table | `src/routes/webhooks/index.tsx`, `src/routes/api-keys.tsx` |
| Settings | `src/routes/integrations/index.tsx`, `src/features/account/components/AccountPage/component.tsx` |
| Form page | `src/routes/webhooks/new.tsx` (`WebhookForm`), `src/routes/billing/pay.tsx` |

## Shell

`Layout`'s `<main>` pads and caps the width. A screen inside the shell takes no `PageShell` and sets no page padding.
The route renders `<Topbar>` first: its `title` (or `breadcrumbs`) is the route's one `h1`. A `PageHero` inside is
`as="h2"` with a module class that zeroes its padding:

```scss
.hero {
  padding: 0;
}
```

Only public pages outside the shell (sign-in, test login, OAuth return) use a narrow `PageShell as="main"`.

List pages use `AsyncList` (`@/components/patterns/AsyncList/AsyncList`) for the loading / empty / filtered-empty / items
states; see [TEMPLATE-PATTERNS.md](TEMPLATE-PATTERNS.md). Do not hand-roll those branches or a delete `useState`; invoke
`frontend-composition-rules` first.

---

## 1. Dashboard

A hero, then sections of links or stats. `src/routes/index.tsx`:

```tsx
import { List, PageHero, SectionHeader, Stack } from "@optimusfoundry/quiet";
import { Topbar } from "@/components/Layout/Topbar";
import { trimTrailingPeriod } from "@/utils/trimTrailingPeriod";
import styles from "./dashboard.module.scss";

<>
  <Topbar title="Home" />
  <Stack gap="lg" animated>
    <PageHero
      size="md"
      ruled={false}
      as="h2"
      className={styles.hero}
      eyebrow="PLAN · TEAM"
      title={greeting}
      accent={trimTrailingPeriod(firstName)}
      description="Welcome to your platform dashboard."
    />
    <section aria-label="Quick links">
      <Stack gap="lg">
        <SectionHeader size="sm" as="h2" eyebrow="PLATFORM" title="Get started" />
        <List items={QUICK_LINK_ITEMS} size="md" divided bordered />
      </Stack>
    </section>
  </Stack>
</>
```

- The eyebrow carries data (plan, count).
- `PageHero`, `SectionHeader` and `EmptyState` append a period to the title; strip the copy's own with
  `trimTrailingPeriod`.
- Stack and Grid drop `aria-label`: name a region with a native `<section aria-label>`.

---

## 2. Full-bleed table

A hero, banners and alerts, then one `Table` with an `EmptyState` when there are no rows.
`src/routes/webhooks/index.tsx`:

```tsx
import {
  Alert, Banner, Button, EmptyState, PageHero, Stack, Table, type TableProps,
} from "@optimusfoundry/quiet";

<>
  <Topbar title="Webhooks" actions={topbarCreateAction} />
  <Stack gap="xl">
    <PageHero size="md" as="h2" className={styles.hero} eyebrow={eyebrow} title={copy.page.title}
      accent={trimTrailingPeriod(copy.page.titleAccent)} description={copy.page.description} />

    {error && !loading && <Alert variant="error" title={error.error} />}

    <section aria-label="Webhooks">
      {showTable ? (
        <Table rowKey="id" size="md" minWidth={640} label="Webhooks"
          loading={loading} columns={columns} data={rows} />
      ) : (
        <EmptyState headingLevel={2} icon={<AppIcon icon={Webhook} size="2xl" />}
          title={trimTrailingPeriod(copy.empty.title)} description={copy.empty.description}
          actions={<Button variant="primary" onClick={onCreate}>{copy.empty.cta}</Button>} />
      )}
    </section>
  </Stack>

  <ConfirmDeleteModal ... />
</>
```

- The create action goes through `Topbar actions`, shown once rows exist; the empty state carries its own call to
  action.
- Column `align` right-aligns numbers and row actions; icon-only or repeated row buttons need a disambiguating
  `aria-label` ([A11Y-PATTERNS.md](A11Y-PATTERNS.md)).
- Gated features show a non-dismissible `Banner` above the table.

---

## 3. Settings

Grouped sections, or `Tabs` for at most four short groups. In-page tabs, `AccountPage`:

```tsx
import { PageHero, Stack, Tabs } from "@optimusfoundry/quiet";

const TABS = [
  { value: "billing", label: "Billing", icon: <AppIcon icon={CreditCard} /> },
  { value: "team", label: "Team", icon: <AppIcon icon={Users} /> },
];
const PANELS = { billing: <BillingTab />, team: <TeamTab /> };

<Stack gap="lg">
  <PageHero size="md" ruled={false} className={styles.hero} eyebrow={eyebrow}
    title="Tune your" accent="workspace" description={description} />
  <Tabs variant="line" defaultValue="billing" label="Settings tabs" tabs={TABS} panels={PANELS} />
</Stack>
```

Without tabs, stack `<section aria-label>` blocks, each a `SectionHeader size="sm" as="h2"` over a bordered `List`
(`src/routes/integrations/index.tsx`). Order: status, lead block, supporting, destructive last
([sections.md](../vendor/quiet/docs/guidelines/sections.md)).

- Tab content is rendered bare, with no `Card` wrapper.
- A team members block is a `Table` inside its panel.

---

## 4. Form page

A constrained column: hero, `SectionHeader`-led sections, one primary at the bottom right.
`WebhookForm` (`src/features/webhooks/components/WebhookForm/component.tsx`):

```tsx
import { Alert, Button, PageHero, SectionHeader, Stack, TextField } from "@optimusfoundry/quiet";

<>
  <Topbar breadcrumbs={[{ label: "Webhooks", href: "/webhooks" }, { label: "New" }]} />
  <Stack gap="xl">
    <PageHero size="md" className={styles.hero} eyebrow={copy.hero.eyebrow} title={copy.hero.title}
      accent={trimTrailingPeriod(copy.hero.titleAccent)} description={copy.hero.description} />

    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="xl">
        <section aria-label="Destination">
          <Stack gap="sm">
            <SectionHeader size="sm" as="h2" eyebrow={copy.sections.destination.eyebrow}
              title={copy.sections.destination.title} description={copy.sections.destination.sublede} />
            <Stack gap="sm" className={styles.fieldStack}>
              <TextField id="webhook-url" label={copy.fields.url.label} type="url" value={url}
                onChange={(e) => setUrl(e.target.value)} error={urlError} required />
            </Stack>
          </Stack>
        </section>

        {error ? <Alert variant="error" title={copy.errors.createTitle}>{error.error}</Alert> : null}

        <Stack direction="row" justify="flex-end" gap="sm">
          <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading}>Save</Button>
        </Stack>
      </Stack>
    </form>
  </Stack>
</>
```

- Breadcrumbs go through `Topbar`; routes do not compose `Breadcrumb` themselves.
- Labels come from the field's own `label` prop (`TextField`, `TextArea`, `Checkbox`).
- Cap the field stack at the form width in the module class, per
  [layouts.md](../vendor/quiet/docs/guidelines/layouts.md#form-page).
- Cancel is `ghost`, Save is the one `primary`.
- `/webhooks/$webhookId` is this form plus a deliveries table below it.
- `/billing/pay` renders `CustomCheckout` in the same column; its error and missing-plan branches use `ErrorState` and `Alert`.

---

## When to use which

| Page looks like | Layout |
|---|---|
| Landing view with links or stats | Dashboard |
| Collection of records with row actions | Full-bleed table |
| Categories of preferences or connections | Settings |
| Fill out fields and Save | Form page |

Pages compose these: a form page can end in a table block, a settings tab can hold a table.
