---
name: frontend-style-rules
description: Use when authoring, editing, or reviewing a webapp SCSS module or any styling decision — token-only values, SCSS-module scoping, the radius/border/shadow ladders, motion durations, and where the style prop is still allowed.
---

# Frontend Style Rules (webapp)

Ten rules, one line each. Follow a rule's pointer when you need the worked CSS, not before —
examples and token catalogues stay in the docs.

- **Tokens only** Every colour, space, radius, shadow and duration is a `var(--…)`; no hex, `rgb()`,
  `white`/`black`, no off-ladder px (`SP-1`). The one literal in the project is `transparent`; bare
  px is for geometry under 4px only (hairlines, `translateY(-2px)`).
  → `docs/design-docs/02-colors.md#never`
- **I-1** Three style layers — tokens (custom props only) → kit (token references, no literals) →
  page (layout glue only, never a new primitive). Page styles live in a `*.module.scss`; a page file
  never ships a global class; `!important` is never the answer.
  → `docs/design-docs/17-implementation.md#i-1-css-scoping`
- **J-9** Motion — hover 150ms, focus ring 0ms, menus and tabs 240ms, accordions 400ms and nothing
  slower. Spring easing is for toast entry and success moments only, and every transition honours
  `prefers-reduced-motion`.
  → `docs/design-docs/12-judgment.md#j-9-motion--what-moves-and-what-doesnt`
- **J-10.1** The radius ladder is monotonic per element type — buttons `r-md` or `r-full`, inputs
  `r-md`, cards `r-lg` or `r-xl`; never cross categories, never mix pill and rect in one group, and
  where radii meet the outer is the larger one.
  → `docs/design-docs/12-judgment.md#j-10-borders--radius--when-things-round-and-when-they-dont`
- **J-10.4** Borders are 1px `--border`, with exactly three exceptions — focus (2px `--fg1` + 3px
  ring), the `brutal` theme, and error. For emphasis reach for a shadow and keep the 1px line.
  → `docs/design-docs/12-judgment.md#j-10-borders--radius--when-things-round-and-when-they-dont`
- **J-10.5** Border at rest, shadow on lift — never both at once on the same surface.
  → `docs/design-docs/12-judgment.md#j-10-borders--radius--when-things-round-and-when-they-dont`
- **Shadows** are reserved — borders carry hierarchy; one surface never stacks two shadow levels.
  → `docs/design-docs/03-layout-spacing.md#shadows`
- **Style prop** is for runtime-dynamic values and custom-property handoff only — never layout,
  colour, spacing, or anything a theme must be able to restyle.
  → `webapp/docs/DESIGN-GUIDELINES.md#style-prop---only-when-absolutely-necessary`
- **Families** are bound by theme files to `--font-family-sans` / `--font-family-mono` (`T-1`); a
  component or module never names a font family.
  → `docs/design-docs/01-typography.md#do--dont`
- **Padding floors** Card padding comes from the density mode (`J-5`), never a hand-picked number;
  inline pixel spacing is a bug anywhere a `--space-*` token already exists.
  → `docs/design-docs/03-layout-spacing.md#do--dont`

Condensed ruleset per topic: `docs/design-docs/quickref/{01,02,03}-*.md`. The full token catalogue
is deliberately not preloaded — read `docs/design-docs/quickref/components-reference.md` for a specific token name
(index: `docs/design-docs/QUICKREF.md`).

Cite the rule ID when you flag a violation — `J-10.4: 2px border outside focus/brutal/error` is
reviewable; "the borders look heavy" is not.
