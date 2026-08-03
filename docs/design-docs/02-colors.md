# Color

All color tokens are OKLCH. Use `var(--*)` — never hex literals.

## Surfaces & text

```
--bg           warm near-white (or themed page bg)
--bg-surface   pure white card/surface
--bg-elevated  modals / popovers (often same as surface)

--fg1   near-ink       primary text, strong emphasis
--fg2   32% L          default body
--fg3   50% L          muted / secondary
--fg4   66% L          subtle / disabled
--ink   = --fg1        ink pair
--paper = --bg         paper pair
```

## Neutral base scale (50 → 950)

```
--base-50   paper-white
--base-100  subtle hover bg, filled input
--base-200  divider-ish, selected bg
--base-300  stronger fills
--base-400  muted text on fills
--base-500  midpoint neutral
--base-600  stronger ink
--base-700  dark text
--base-800  near-ink
--base-900  ink
--base-950  deepest
```

Use `--base-100` for row hovers, `.tabs-pill` bg, skeleton base.
Use `--base-200` for skeleton highlight.

## Borders
```
--border        default hairline
--border-hover  slightly stronger (focus affordance)
```

## Brand

```
--primary        deep indigo-violet   oklch(48% 0.20 275deg)
--primary-hover  slightly deeper
--primary-active deeper still
--primary-fg     near-white text on primary

--secondary      warm rose            oklch(62% 0.18 350deg)
--secondary-hover
--secondary-fg

--accent         burnt amber          oklch(72% 0.17 55deg)  ← the warm accent
--accent-hover
--accent-fg      near-black on amber
```

**Rule of thumb:** `--primary` is the reserved "brand" color — use for focus rings, links, key CTAs. `--accent` is the *warm* highlight — use for tier=creator, persona badges, and exactly **one** per page.

## Semantic

```
--success   green    oklch(58% 0.18 150)   with --success-bg, --success-fg
--warning   amber    oklch(78% 0.16 75)    with --warning-bg, --warning-fg
--error     red      oklch(56% 0.22 25)    with --error-bg, --error-fg
--info      blue     oklch(55% 0.18 245)   with --info-bg, --info-fg
--focus-ring         primary @ 40% opacity
```

## Shadows (warm, atmospheric)

```
--shadow-xs    hairline
--shadow-sm    subtle lift
--shadow-md    cards / popovers
--shadow-lg    toasts / menus
--shadow-xl    modals / sign-in card
--shadow-primary  indigo glow (for hover on primary btn)
--shadow-accent   amber glow
```

Default shadows are tinted with the ink hue (not pure black) — that warmth is the kit's signature.

## Themes (via `<html data-theme="…">`)

| Theme       | Mood                                           | Primary               | Accent              |
|-------------|------------------------------------------------|-----------------------|---------------------|
| `paper` (default) | Warm white + indigo + amber               | deep indigo-violet    | burnt amber         |
| `light`     | Pure white, zero tint, black/gray UI           | near-black            | gray                |
| `dark`      | Cool ink bg + violet glow                      | vivid violet          | amber               |
| `cosmos`    | Deep space purple, luxe                        | bright violet         | gold                |
| `cyberpunk` | Near-black + neon pink + cyan                  | hot pink              | electric yellow     |
| `brutal`    | White bg + hard black borders + sharp shadows  | royal blue            | neon yellow         |
| `sunset`    | Warm dark (terracotta)                         | orange                | gold                |
| `claude`    | Warm terracotta light                          | terracotta            | blue                |
| `ocean`     | Calm pale blue                                 | deep blue             | warm accent         |
| `glow`      | Neon dusk, glowing shadows                     | electric violet       | hot magenta         |
| `fog`       | Overcast Nordic haze, muted slate              | muted slate-blue      | dusty rose          |
| `porcelain` | Museum catalog, bordeaux + sage, sharp corners | deep bordeaux         | pale sage           |

Some themes **override** radius tokens (`porcelain` → tiny radii, `brutal` → small radii + chunky offset shadows, `claude` → softer rounded). Don't hard-code radius; use `var(--r-*)`.

Some themes **swap fonts** (`glow` → Space Grotesk; `fog` → Inter Tight; `porcelain` → Instrument Serif). Always reference `var(--font-*)` so themes work.

## Color use patterns

- **Eyebrow**: `color: var(--fg3)` + mono
- **Body**: `color: var(--fg2)`
- **Headings**: `color: var(--fg1)`
- **Accent italic**: `color: var(--accent)` or `var(--primary)` (pick one per page and stick to it)
- **Link**: `color: var(--primary)` (no underline by default; underline on hover is optional)
- **Focus ring**: `box-shadow: 0 0 0 3px var(--focus-ring)`
- **Hover row/cell**: `background: var(--base-100)` or `color-mix(in oklch, var(--bg-surface) 97%, var(--fg1))`

## Never
- `#fff`, `#000`, `white`, `black` on text or bg
- Inline hex colors except in platform brand chips (see `.pp-ch` in feature kit — those are *platform brand* colors)
- `rgba(0,0,0,0.x)` for shadows — use the token scale
