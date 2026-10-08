---
name: frontend-style-rules
description: Use when authoring, editing, or reviewing a webapp SCSS module or any styling decision — quiet-token-only values, SCSS-module scoping, no grid in SCSS, the radius/border/shadow ladders, motion tokens, themes, and where the style prop is still allowed.
---

# Frontend Style Rules (webapp)

Ten rules, one line each. Open a pointer for the worked CSS, not before. `quiet:` paths are files
in `@optimusfoundry/quiet` (see `frontend-design-rules`).

- **Tokens only** A `*.module.scss` value is a `var(--q-…)`; `npm run lint:scss`
  (`webapp/.stylelintrc.json`) fails hex, `rgb()`, named colours and raw px. Literals allowed:
  `transparent`, `currentColor`, and bare px for geometry under 4px.
  → `quiet:docs/guidelines/foundations.md`
- **I-1** Style layers — quiet tokens and components, then the page's `*.module.scss` for layout
  glue only. App CSS is unlayered and beats every `q.*` layer, so never restyle a quiet
  component's inside, ship a global class, or reach for `!important`.
  → `quiet:README.md#coexisting-with-another-design-system`
- **I-2** No `display: grid` in SCSS — page structure is `Grid` and `Col`, fixed panes sit beside
  it; `display: flex` is fine for micro-alignment.
  → `quiet:docs/guidelines/grid.md#pane-or-grid`
- **I-3** Breakpoints come from `@use "@/styles/breakpoints" as *;` (`breakpoint`,
  `breakpoint-down`), never a raw `@media` px; quiet components adapt themselves.
  → `quiet:docs/guidelines/grid.md#responsive`
- **I-4** Identity is a theme — palette, accent, `--q-status-*`, fonts, radius in a `[data-theme]`
  block in `@layer q.themes`, registered with `defineThemes`; a screen never overrides it.
  → `quiet:DESIGN.md#product-themes`
- **J-9** Motion uses `--q-dur-hover`, `-enter`, `-exit`, `-expand` with `--q-ease-soft`; slow,
  ease-out, no bounce or spring, no press shrink, one moving thing per surface; never your own
  `transition: 0.3s`.
  → `quiet:docs/guidelines/foundations.md#motion`
- **J-10.1** Radius by surface — `--q-radius-xs` checkbox · `sm` tooltip, menu item · `md` input,
  alert · `lg` card, table, popover, toast · `xl` dialog, drawer · `pill` button, tag, switch;
  never 0 on a container.
  → `quiet:docs/guidelines/foundations.md#shape-and-depth`
- **J-10.4** Borders are the 1px `--q-border` hairline; `--q-border-strong` for hover and emphasis;
  an ink rule (`--q-fg`) only on a section top. Hairlines before shadows.
  → `quiet:docs/guidelines/foundations.md#shape-and-depth`
- **J-10.5** Shadows only float — `--q-shadow-1` selected segment, `-2` popover, menu, toast, card
  hover, `-3` dialog, drawer; never on an at-rest surface or on text.
  → `quiet:docs/guidelines/foundations.md#shape-and-depth`
- **Style prop** is for runtime-dynamic values and custom-property handoff only — never layout,
  colour, spacing, or anything a theme must restyle.

Cite the rule ID when you flag a violation — `J-10.5: a shadow on a card at rest`.
