# Sections

How to break a page into parts. A page is **a stack of sections**, each section is **a heading plus
content**, and each part of that content is one of four containers. Specimen: Storybook
`guidelines-sections--default`.

## The containers

Pick the lightest container that does the job. Each step up adds an edge, and edges are what make a
screen look busy.

| Container | Looks like | Use when | Recipe |
|---|---|---|---|
| **Bare** (default) | heading + content, no box | the section is part of the page's flow | `SectionHeader size="sm"` + content in a stack |
| **Divided** | rows on 1px hairlines | a run of similar rows: settings switches, key/values, a feed | `List divided`; or rows with `border-top: var(--q-hairline) solid var(--q-border)`, padding `--q-space-stack` 0 |
| **Panel** | 1px `--q-border`, radius `--q-radius-lg`, padding `--q-space-card-pad` | the group is a **self-contained module** sitting next to others (a chart in a grid cell, a plan summary, an agent run) | see recipe below |
| **Well** | `--q-bg-subtle` fill, no border | secondary, read-only grouped info inside a section (an example, a receipt slip, a code sample) | `background: var(--q-bg-subtle)`, radius `--q-radius-lg`, padding `--q-space-card-pad` |

Two more surfaces are components, not containers:

- **`Card`** is an **object you can open**: it has `href`/`onClick`, an eyebrow, a title and meta. It belongs
  in a grid of peers (projects, templates). Its padding (32) and title (24) are fixed, so it is
  never a generic box.
- **`StatCard`** is for a metric.

`Table`, `DataGrid` and `List bordered` bring their own frame. Never put them in a panel.

**Decision rule:** use a panel only if the group would still make sense moved to another page, or it
sits beside other panels in a grid. Otherwise use bare. Use divided only for repeated rows of the same kind.

### Panel recipe

There's no Panel component yet. This is the canonical one:

```tsx
<section aria-labelledby="usage-h" style={{
  display: "grid", gap: "var(--q-space-stack)",
  padding: "var(--q-space-card-pad)",
  border: "var(--q-hairline) solid var(--q-border)",
  borderRadius: "var(--q-radius-lg)",
}}>
  <Text as="h3" size="lg" weight="semibold" color="heading"><span id="usage-h">Usage this month</span></Text>
  …
</section>
```

## Nesting

Use at most **3 levels: page → section → container**. Inside a container, subdivide with `gap` or
hairline rows, never another box.

| Allowed | Not allowed |
|---|---|
| section → panel → divided rows | panel → panel (card-in-card) |
| section → grid of panels | `Card` → anything with its own border |
| section → well | a panel around a `Table` (double frame) |
| panel → text, chart, list, actions | a `SectionHeader` inside a panel (its ink rule plus the box edge = two lines) |

## Section headings

| Where | Heading | Gap below |
|---|---|---|
| Top-level section on an app page | `SectionHeader size="sm" as="h2"`. Its **ink top rule is the divider**, so add no other line | `--q-space-block` |
| Nested section (a section inside a section) | `SectionHeader size="sm" as="h3"` | `--q-space-block` |
| A panel or well | card-title: `Text as="h3" size="lg" weight="semibold" color="heading"` | `--q-space-stack` |
| A group with no visible title (a toolbar, a status line) | none; name it with `aria-label` if it's a landmark | — |

- `SectionHeader` is always ruled; there's no unruled variant. When the rule would double up with an edge, use the card-title recipe.
- `size="md"` (40) is marketing only.

**Actions:**
- **Placement:**
  - Page-wide actions go in `PageHero actions`, with one primary.
  - Section actions go in `SectionHeader actions` (right side, top-aligned with the title) and act on that section only.
  - Panel actions go in the panel's top-right row or its last row, never both.
- **Order:** a row of buttons ends with the primary, at most one per section. Bulk actions replace the toolbar while rows are selected.

## Section types

| Type | Build | Spacing |
|---|---|---|
| Page header | `PageHero size="md"` (title, one-line intro, actions; no eyebrow) | built in (`--q-space-hero-top/bottom`: 16/16 at app density); then `--q-space-block` |
| Page status | one `Alert` or `Banner` directly under the header | `--q-space-block` |
| Toolbar / filter bar | a row: `FilterTabs`, search `TextField size="sm"`, then actions on the right | `--q-space-inline` within, `--q-space-stack` to the table |
| Content block | bare section | `--q-space-block` between blocks |
| Card group | bare section → `Grid columns={12}` of `Card`/panels, equal spans | gutter |
| Split section | heading left 5 / content right from col 7: `Grid` + `Col span={5}` + `Col start={7} span={6}` | gutter; use for explanatory settings groups and marketing |
| Settings section | bare section in the 640 column; switches as divided rows | `--q-space-field` within, `--q-space-section` between |
| Key / value | divided rows, or a 2-col grid of label (`Text mono` or small muted) + value (body) | `--q-space-stack` |
| Danger zone | the last section; a panel with a **molten hairline** (`border-color: var(--q-accent)`), with text left and a `HoldButton`/destructive button right | as settings section |
| Footer actions | the last row of a form column: secondary, then primary | `--q-space-block` above |

## Long pages: scroll, tabs or nav

| Content | Use |
|---|---|
| ≤ 3 sections | one page, scroll |
| 2–4 peer views of **one object** the user switches between (Overview / Activity / Settings) | `Tabs panels={…}` (or `TabPanel`s) under the PageHero |
| > 4 groups, or reference content the user scans | sticky section nav (200) + one scrolling column: the Settings layout |
| Steps with an order | Wizard ([layouts.md](layouts.md#wizard)) |

Never put tabs inside tabs, and never put tabs and a section nav on one page.

## Order

1. **Status first:** the one `Alert`/`Banner` sits under the title, never below the fold.
2. **The most-used block next, and it gets the most width** (span 8, or first in the stack).
3. Supporting blocks after, narrower (span 4) or lower.
4. **Destructive last:** the danger zone ends the page, alone.

Sections aren't equal. If every block has the same size, weight and box, the page has no entry
point, so give one block the lead.

## Don't

| Slop | Fix |
|---|---|
| Every section in a bordered card | bare sections; panels only for modules |
| Card in a card, panel around a table | one container level; tables bring their frame |
| A hairline under a `SectionHeader` | its ink top rule is already the divider |
| Two `Alert`s stacked | one status, the highest severity |
| Section actions in the page header (or the reverse) | actions sit with what they act on |
| Equal-weight blocks in a 4 + 4 + 4 with no lead | 8 + 4, or put the lead first |
| A "danger" button in the middle of a page | the danger zone, last |
