# Foundations

This page covers the tokens and the rules for using them. Component styles use tier-2 (semantic) and tier-3 (component)
tokens only (see [AGENTS.md](../../AGENTS.md)). App code follows the same rule: if you're writing a raw
colour, size or duration, there is a token for it.

## Colour

### The ladder

| Job | Token | Reference name | Use |
|---|---|---|---|
| Ground | `--q-bg` | paper | page, cards, fields |
| Alternate ground | `--q-bg-subtle` | paper-2 | alternate sections, selected rows, user chat bubbles, wells |
| Inverse | `--q-bg-inverse` | ink | primary button only |
| Heading text | `--q-fg` | ink | titles, values, emphasis, section rules |
| Body text | `--q-fg-body` | ink-2 | default paragraph text |
| Secondary text | `--q-fg-muted` | muted | metadata, help, table secondary lines |
| Quiet text | `--q-fg-subtle` | muted-2 | non-essential only (fails AA, by design) |
| Divider | `--q-border` | rule-soft | card edges, list and table dividers |
| Hover edge | `--q-border-strong` | rule-strong | card hover, emphasis edges |
| Accent | `--q-accent` | molten | punctuation (below) |

Ratio on any screen: **Paper 70 · Paper-2 20 · Ink 9 · Molten 1.** If a screenshot looks orange,
too much molten is in use.

### The molten rule

Molten (`--q-accent`) marks **one thing that matters**. Allowed:

- the full stop after a page title (`PageHero`/`Headline` add it);
- one italic accent phrase in a headline (`accent` prop);
- a status dot or mark: warning, error, the human step in `AgentRun`, a stale step in `LineageChip`,
  the doubt underline in `DoubtMarker`, a cap warning in `CostMeter`;
- a focus or "past the line" hairline (`ElasticSlider`, `ThresholdHandles`).

Never use it for a fill, a button, a section background, a banner, a large text block, or a second accent colour.
Primary actions are **ink**, not molten.

**Charts are the exception.** In `Sparkline`, `LineChart`, `BarChart`, `DonutChart` and
`NarratedChart`, molten is series 1, the data the user cares about. Comparison series step through ink then greys
(`--q-chart-series-1…5`). Labels, values and axes never take a series colour.

### Status: tokens, not hues

Status colour comes from the theme through `--q-status-{info,success,warning,error}-{fg,bg,border}`
(`fg` = glyphs, dots, fills and status text · `bg` = a status surface · `border` = its edge).
Components read them through their own tier-3 tokens (`--q-alert-<status>-*`, `--q-badge-<status>-*`,
`--q-toast-*`, `--q-progress-<status>-fill`, Tag `status`, Icon `color`); see
[DESIGN.md](../../DESIGN.md#product-themes).

In `foundry` and `foundry-dark` the brand has no green or red, so the tokens resolve to ink and
molten:

| Status | Look | Components |
|---|---|---|
| Info | soft hairline + `i` | `Alert variant="info"`, `Banner status="info"` |
| Success / done | ink + ✓, solid ink dot | `Alert variant="success"`, `Badge variant="success"`, `toast({ status: "success" })` |
| Warning | molten hollow dot / molten `!` | `Alert variant="warning"`, `Badge variant="warning"` |
| Error | molten hairline + molten `!` | `Alert variant="error"`, `Badge variant="error"`, `toast({ status: "error" })` (announced assertively), field `error` props |

| Token set | foundry resolves to |
|---|---|
| `--q-status-info-*` | fg `--q-fg-muted`, border `--q-border` |
| `--q-status-success-*` | fg and border `--q-fg` (ink) |
| `--q-status-warning-*` | fg `--q-accent`, border `--q-border` |
| `--q-status-error-*` | fg and border `--q-accent` |

A **product theme may give them real hues** (a green success, a red error) in its own
`@layer q.themes` block; that is the only place a status hue is ever set. Style any custom status
surface with `--q-status-*`, use the components' `variant`/`status` props, and never write a raw
`#16a34a`-style colour in a component or screen, even "just for this badge".

### Dark mode and product themes

- Themes are `[data-theme]` blocks: `foundry` (default) and `foundry-dark`, plus one per product.
  Set the theme app-wide with `<ThemeProvider>` (it writes `data-theme` on `<html>`), or for a subtree with
  `<QuietRoot theme>`. A QuietRoot without `theme` follows the enclosing ThemeProvider.
- A product theme lives in the **product's repo**: register it before the first render with
  `defineThemes({ acme: { label: "Acme", colorScheme: "light" } })`, and style it in `@layer q.themes`
  (`[data-theme="acme"] { --q-gray-0…900, --q-molten-500, --q-shadow-rgb, --q-status-*, color-scheme }`,
  repeating quiet's layer order first). An unregistered name falls back to `foundry` and warns once in
  development. The full contract (must-set and may-set tokens, fonts, density, reduced motion) is
  [DESIGN.md → Product themes](../../DESIGN.md#product-themes).
- A product gets its identity from a **theme** (palette, accent, type, shape, density, per-component
  tokens), never from forking components. The rules on this page stay the same in every theme.
- `QuietRoot accent="…"` swaps the accent for a product. The molten rule still applies to whatever colour
  it becomes.
- Check every screen in both `foundry` and `foundry-dark`. Never hard-code a light-only value.

### Contrast exceptions (kept on purpose)

`--q-fg-subtle` (≈2.98:1) and small molten text (≈3.87:1) are below AA and are kept exactly as
designed. Use `--q-fg-subtle` only for text that isn't needed (decorative serials, dimmed future
items). Anything a user must read uses `--q-fg-muted` or darker.

## Type and spacing

Moved to their own pages: [typography.md](typography.md) (the eight roles, the component for each,
hierarchy, measure) and [spacing.md](spacing.md) (the scale, job tokens per density, what goes
between what). Grid and page layouts: [grid.md](grid.md), [layouts.md](layouts.md), [sections.md](sections.md).

## Shape and depth

- **Radius by surface:** `--q-radius-xs` 6 checkboxes · `sm` 10 tooltips, menu/nav items · `md` 14
  inputs, alerts · `lg` 20 cards, tables, popovers, toasts · `xl` 28 dialogs, drawers · `pill`
  buttons, tags, switches, dots, progress. Never 0 on a container.
- **Hairlines first:** 1px `--q-border` for dividers and card edges; an ink rule (`--q-fg`) only for
  section tops and emphasis. Alternate areas use `--q-bg-subtle` between hairlines.
- **Shadows only float:** `--q-shadow-1` selected segment, `--q-shadow-2` popovers, menus, toasts,
  card hover, `--q-shadow-3` dialogs, drawers, palette. Never on text. No glassmorphism. The only
  transparency is the dialog scrim (`--q-scrim`).

## Motion

- Hover and state changes take `--q-dur-hover` (0.22s) with `--q-ease-soft`. Enter takes `--q-dur-enter`, exit
  `--q-dur-exit`, expand `--q-dur-expand`. Loops use `--q-ease-forge`.
- Slow, ease-out, **never a bounce or spring overshoot, no press shrink.** One moving thing per
  surface. Nothing scroll-triggered. No constant ambient motion in product UI.
- Reduced motion is handled by the tokens (durations drop to 0). Don't add your own `transition: 0.3s`
  that bypasses them.
- Use the shared motion utilities (`q-anim-*` with `data-state`, `q-collapse`) for open/close.

## Density

| Mode | Where |
|---|---|
| `marketing` | the website only (QuietRoot's default) |
| `app` | dashboards, lists, detail pages, settings, chat. **The product default.** |
| `compact` | dense tables, inspectors, admin consoles |

Pick one per surface. A compact table inside an app page gets its own `data-density="compact"`
container; never mix inside one card.
