# Typography

An app screen uses **eight roles** and nothing else. Every role is reached through a component
prop, never a hand-set `font-size`. Specimen: Storybook `guidelines-typography--default`.

## Roles (app)

| Role | Size · weight | Render it with | One per… |
|---|---|---|---|
| page-title | 40 · 700, molten period | `PageHero size="md"` (`as="h1"`) | screen, exactly one |
| section-title | 24 · 600 | `SectionHeader size="sm" as="h2"`; unruled: `Text as="h2" heading={4}` | block |
| card-title | 17 · 600 | `Text as="h3" size="lg" weight="semibold" color="heading"` | panel or list group |
| metric | 40 · 700 tabular | `StatCard` value | stat |
| body-lg | 17 · 400 | `PageHero description`; `Text size="lg"` | page intro only |
| body | 15 · 400 | `Text` (or `size="md"`), inputs, lists, menus | default |
| small | 13 · 400 | `Text size="sm"`; table cells; help | secondary line |
| label | 11 mono caps +0.08em | `Eyebrow`, `Text mono`, table headers | metadata |

Marketing adds `Headline size="display"` (clamp 56–128) and `h2` (68), and `PageHero size="lg"` and
`SectionHeader size="md"` (both 40 with marketing padding). **None of these appear in a product.**

Sources disagree on two points, and the code wins:

- `Card`'s built-in `title` renders **24/600** (section-title size), not the card-title role. Use
  `Card` for clickable objects in a grid, where 24 is right. For a module's heading inside a panel,
  use the card-title recipe above.
- Line heights are ratios, not the reference's fixed values. Measured: section 24/28 (`--q-leading-snug`),
  card and body-lg 17/26, body 15/23, small 13/20 (`--q-leading-body`), label 11/17. The reference
  says 24/32, 17/24 and 15/24. Don't override them to match.

## The scale

`--q-text-*`: 3xs 10 · 2xs 11 · xs 12 · sm 13 · md 15 · lg 17 · xl 19 · 2xl 24 · 3xl 30 · 4xl 40 ·
5xl 52 · 6xl 68 · display clamp(56, 9vw, 128).
Weights: 400 / 500 / 600 / 700. Tracking: mono +0.08em, h4 −0.02, h3 −0.025, h2 −0.04, display −0.045.

App screens use **11, 13, 15, 17, 24 and 40**. 12 is for in-component chrome (badge, meta), 19 and 30
are marketing steps, and 52/68 are marketing heroes.

## Hierarchy

- Visual size and heading level are separate. **Level follows the outline; size follows the role.**
  The page title is `h1` at 40; blocks are `h2` at 24; a module inside a block is `h3` at 17. Pass
  `as` to keep the order unbroken: `SectionHeader as="h3"` for a nested section.
- One step down per level of nesting. Never two headings of the same size stacked with nothing between.
- Emphasis is the **italic of the same weight** (`accent` on PageHero, SectionHeader, Card,
  Headline). Never bold body text to make a heading, and never use molten text for emphasis.
- `Eyebrow` sits above a title as context ("WORKSPACE", "01 Billing"). It's a label, not a heading.
  Use at most one eyebrow per header.

## Measure, numbers, wrapping

| Rule | Value / how |
|---|---|
| Body measure | ≤ `--q-w-form` (640): PageHero and SectionHeader descriptions already cap at 640 / 520 |
| Reading pages | content column ≤ `--q-w-content` (1040) |
| Headings wrap | `text-wrap: balance` (built into Headline and `Text heading`) |
| Body wraps | `text-wrap: pretty` (built into Text) |
| Numbers compared in columns | tabular and right-aligned: Table `columns[].align="right"`; StatCard does it |
| One line that may overflow | `Text truncate`, with the full value in a `Tooltip` or the detail view |
| Multi-line preview | `Text lineClamp={2}`. Never clamp body copy a user must read |
| Mono | labels, IDs, serials, code, timestamps in metadata. Never sentences |

## Pairings

| Situation | Stack (top → bottom) | Gaps |
|---|---|---|
| Page head | Eyebrow → page-title → body-lg → actions | built into `PageHero` |
| Block head | section-title (+ description at 15 on the right) | built into `SectionHeader` |
| Panel | card-title → body/small | `--q-space-stack` |
| Stat | label → metric → small (delta/period) | built into `StatCard` |
| List row | body (primary) → small muted (secondary) | 0–4 inside the row |
| Key/value | label (mono) above body, or small muted left of body | `--q-space-stack` between pairs |

## Don't

| Slop | Fix |
|---|---|
| Second `h1`, or a 40px heading inside the page | one `PageHero`; blocks get 24 |
| 19, 20 or 30 px "subheadings" | the eight roles only |
| Bold body as a heading | `SectionHeader` or the card-title recipe |
| ALL CAPS sans text | mono label, or sentence case |
| Molten or coloured text for emphasis | the italic accent; molten is only the period |
| Centred paragraphs or headings in an app | left-aligned; centre only an `EmptyState` |
| Body text wider than 640 | cap the column (`--q-w-form`) |
| `font-size` in a screen's CSS | a `Text` prop or the component's role |
