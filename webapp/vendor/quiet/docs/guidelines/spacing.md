# Spacing

Every gap on a screen is one of eight **job tokens**. Pick by what the gap separates, never by
how it looks. Specimen: Storybook `guidelines-spacing--default`.

## The scale

`--q-space-*` (src/styles/tokens/_space.scss). Names are multiples of 8.

| Token | 0-25 | 0-5 | 0-75 | 1 | 1-25 | 1-5 | 1-75 | 2 | 2-5 | 3 | 4 | 5 | 6 | 7 | 8 | 10 | 12 | 16 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| px | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 20 | 24 | 32 | 40 | 48 | 56 | 64 | 80 | 96 | 128 | 160 |

The sub-8 steps (2–14) and 20 exist **only inside components** (control padding, icon nudges).
Screens and layouts never use them.

## Job tokens

Set density once on the root (`QuietRoot density`, or `data-density` on a container). The tokens
follow it; raw steps don't.

| Job: the gap between… | Token | marketing | **app** | compact |
|---|---|---|---|---|
| icon ↔ label, chip ↔ chip, button ↔ button | `--q-space-inline` | 8 | **8** | 8 |
| lines/blocks inside a card or panel; label ↔ value | `--q-space-stack` | 16 | **16** | 8 |
| form field ↔ field | `--q-space-field` | 24 | **24** | 16 |
| card/panel padding | `--q-space-card-pad` | 32 | **24** | 16 |
| card ↔ card | `--q-space-card-gap` | 32 | **24** | 16 |
| block ↔ block; section header ↔ its content | `--q-space-block` | 64 | **32** | 24 |
| page top/bottom padding; settings section ↔ section | `--q-space-section` | 128 | **48** | 32 |
| page side padding | `--q-space-page-x` | 32 | **32** | 24 |
| grid column gap | `--q-grid-gutter` | 32 | **24** | 16 |

## What goes between what

| Between | Use | Not |
|---|---|---|
| Label and its control | the field component's own gap (TextField, Select, FormField) | a hand-set margin |
| Two fields in a form | `--q-space-field` | `stack`, so the form looks cramped |
| Field groups (Profile vs Address) | `--q-space-block` + a `SectionHeader size="sm"` | a bigger raw gap with no header |
| Title and body inside a panel | `--q-space-stack` | `block`, so the panel looks hollow |
| Panel edge and its content | `--q-space-card-pad` | 16 in app density |
| Cards in a row or grid | `--q-grid-gutter` (grid) / `--q-space-card-gap` (stack) | 12, 20 or 28 |
| `SectionHeader` and its content | `--q-space-block` | `stack`, which glues the header to the first row |
| Section and section on a page | `--q-space-block` (same parent stack) | stacked margins that add up |
| Settings section and section | `--q-space-section` | `block`, so sections blur together |
| Page edge and content | `--q-space-section` top/bottom, `--q-space-page-x` sides | centring a narrow column in a wide page |
| Phone (≤ 390) page sides | `--q-space-2` (16) | 32, which wastes 16% of a phone |

**Inside vs outside.** A component owns its inner spacing; the parent owns the gap between
components. Never add margin to a quiet component. Wrap it in a stack with the right gap.

## Gaps, not margins

Lay out with `gap` on a flex or grid parent. The first and last child never carry space.

- `Stack` and `Grid` named gaps are **fixed px**, not density-aware: `xs 8 · sm 16 · md 24 · lg 32 · xl 48 · 2xl 64`.
  In **app** density they line up with the jobs: `xs`=inline, `sm`=stack, `md`=field/card-gap/gutter,
  `lg`=block, `xl`=section. In **compact**, lay out with a plain element and
  `gap: var(--q-space-*)` instead (the props are typed to names or numbers).
- `Grid` puts **no row gap** unless you pass `rowGap`. Always pass `rowGap` equal to `gap`, or
  columns that wrap on a narrow screen will touch.

## Rhythm

- 4px unit for **boxes**: control and field heights and every gap are multiples of 4. Text line
  heights come from ratios (`--q-leading-body` 1.55, `--q-leading-snug` 1.15), so they render
  as body 15/23, body-lg 17/26, small 13/20 and section 24/28. Quiet doesn't use a baseline grid, so
  never pad text to force it onto one.
- Control heights `--q-control-sm|md|lg` = 32 / 40 / 52; fields `--q-field-*` = 36 / 48 / 56;
  rows `--q-row-compact` 32 / `--q-row` 48. The reference readme says controls are "32 / 40 / 48";
  the token is 52, and the token wins.
- Optical exception: the only allowed offsets are inside components (e.g. a 3px icon nudge). On a
  screen, if something looks misaligned, the structure is wrong. Don't patch it with a pixel.

## Don't

| Slop | Why it's wrong | Fix |
|---|---|---|
| 12, 20 or 28 between blocks | off the job scale, so neighbours drift | `--q-space-block` |
| Every gap the same | flattens the hierarchy, so sections read as one list | inline < stack < field < block < section |
| Marketing gaps (64/128) in an app | half the screen is air | `density="app"` |
| Margins on components | they double up at edges and break when reordered | `gap` on the parent |
| Card padding 16 in app | cramped and off-token | `--q-space-card-pad` (24) |
| A taller gap to "separate" with no heading | the reader can't tell why | a `SectionHeader` or a hairline |
