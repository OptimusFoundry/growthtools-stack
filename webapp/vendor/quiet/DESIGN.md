# quiet — DESIGN.md

quiet is a **1:1 copy of the Optimus Foundry "Soft" design system** from Claude Design
(project `daa56afb-593e-422a-ab8a-5ecfa9309fb9`, "Rounder softer design system"). The spec is the
reference itself, mirrored byte-for-byte in [`docs/reference/optimus-design/`](docs/reference/optimus-design/):

- [`readme.md`](docs/reference/optimus-design/readme.md) — the rules: colour, type, density,
  spacing by job, radii, motion, voice, banned words.
- `components/<group>/<Name>.prompt.md` — how to use each component, with examples.
- `components/<group>/<Name>.d.ts` — each component's props (quiet's are in `src/components/<group>/<Name>.tsx`).
- `guidelines/*.card.html` — foundation specimens; `ui_kits/` — app and website templates.

## What quiet adds (and nothing else)

- **Dark mode** — `<QuietRoot mode="dark">`, derived from the same grey ladder inverted
  (`src/styles/themes/_foundry-dark.scss`). The brand itself is light-only; the Optimus Foundry site stays light.
- **Swappable accent** — `<QuietRoot accent="…">` replaces molten for another product. The rule
  doesn't change: the accent is punctuation only, never a fill.
- **Density** — `<QuietRoot density="app">` sets the reference's own `data-density` modes.

- **Accessibility + motion layer** — keyboard operation and focus management per WAI-ARIA patterns,
  visible keyboard focus, accessible names and states, and eased open/close/state motion in the
  reference's own motion language. It never changes the at-rest look (pixel parity is tested).

Everything else — tokens, styling, the catalog page — is the reference, unchanged. Colour contrast
is a deliberate exception: `--muted-2` (2.98:1) and small molten text are kept exactly as designed.

## Status colour

Status is a tier-2 role, like `--q-fg` or `--q-border`: three tokens per status, declared in
`src/styles/tokens/_color.scss` on `:root, [data-theme]`.

| Token | Job | foundry / foundry-dark |
|---|---|---|
| `--q-status-info-fg` / `-bg` / `-border` | neutral notices | `--q-fg-muted` / `--q-bg` / `--q-border` |
| `--q-status-success-fg` / `-bg` / `-border` | done, healthy | `--q-fg` / `--q-bg` / `--q-fg` |
| `--q-status-warning-fg` / `-bg` / `-border` | needs attention | `--q-accent` / `--q-bg` / `--q-border` |
| `--q-status-error-fg` / `-bg` / `-border` | failed, blocking | `--q-accent` / `--q-bg` / `--q-accent` |

`fg` colours glyphs, icons, fills and status text; `bg` is a status surface; `border` is its edge.
The brand has no status hues, so the defaults are greys and molten: info and success stay
neutral, warning and error are hot. A product theme sets real hues here.

Components read status through their own tier-3 tokens, which default to these:

| Component | Tier-3 tokens (default → `--q-status-<status>-*`) |
|---|---|
| Alert | `--q-alert-<status>-bg` → bg, `-border` → border, `-ring` and `-glyph` → fg |
| Banner | `--q-banner-<status>-ring`, `-glyph` → fg. On `variant="ink"`, info and success keep the strip's on-inverse colours |
| Toast | `--q-toast-success-glyph`, `--q-toast-error-glyph`, `--q-toast-warning-ring` → fg; `--q-toast-error-border` → border |
| Badge | `--q-badge-<status>-bg` → bg, `-border` → border, `-dot` → fg. Badge text stays `--q-fg` |
| Tag | `status` prop (quiet addition): `--q-tag-<status>-fg`, `-bg`, `-border` |
| Progress | `--q-progress-<status>-fill`, `--q-progress-error-value-fg` → fg. `heat` stays the accent |
| Icon | `color="success\|warning\|error"`: `--q-icon-<status>-fg` → fg |

A few foundry parts don't follow the shared mapping: the info Alert's ring, the info Banner's
glyph and ring, and the grey fill of success and warning Badges.
`src/styles/themes/_foundry-status.scss` pins those for `foundry`, `foundry-dark` and an unthemed
root only. A product theme on `<html>` therefore doesn't inherit them, and every part follows its
`--q-status-*` hues.

## Product themes

A product defines its theme in its own repo. quiet ships `foundry` and `foundry-dark`; anything
else is registered at startup and styled by the product's CSS.

**1. Register it** before the first render:

```ts
import { defineThemes } from "@optimusfoundry/quiet";

defineThemes({
	acme: { label: "Acme", colorScheme: "light" },
	"acme-dark": { label: "Acme dark", colorScheme: "dark" },
});
```

`ThemeName` accepts any string, and the built-in names still autocomplete. `QuietRoot theme`,
`ThemeProvider`, `useTheme().setTheme` and `applyTheme` accept any registered name. An
unregistered name renders `defaultTheme` (`foundry`) instead of crashing, and warns once per name
in development. `resolveTheme(name)` and `getTheme(name)` expose the same lookup.

**2. Style it** in `@layer q.themes`, so it beats quiet's token defaults and loses to base,
component and utility rules, the same as the built-in themes:

```scss
// Repeat quiet's layer order first: it holds whichever stylesheet loads first.
@layer q.tokens, q.themes, q.base, q.components, q.utilities;

@layer q.themes {
  [data-theme="acme"] {
    --q-gray-0: #fff;          // …through --q-gray-900: all eight stops
    --q-molten-500: #4f46e5;   // the accent
    --q-shadow-rgb: 17 24 39;
    --q-status-success-fg: #15803d;
    --q-status-success-bg: #f0fdf4;
    --q-status-success-border: #bbf7d0;
    // …info, warning, error
    color-scheme: light;
  }
}
```

Unlayered, a theme would outrank all of quiet's layers instead of sitting where the built-in
themes do. Loaded before `@optimusfoundry/quiet/style.css` without the order statement, it would
create `q.themes` first and end up below `q.tokens`, so the defaults would win.
`src/stories/external-theme/` holds a working example, which `tests/theming.spec.ts` checks.

**What a theme sets:**

| | Tokens |
|---|---|
| **Must** | The palette: `--q-gray-0`, `-50`, `-100`, `-200`, `-400`, `-500`, `-800`, `-900`, `--q-molten-500`, `--q-shadow-rgb`, plus `color-scheme`. foundry's palette sits on `:root`, so any stop a theme on `<html>` leaves out is foundry's |
| **Should** | `--q-status-{info,success,warning,error}-{fg,bg,border}`. Without them the theme gets the brand's grey-and-accent status mapping |
| **May** | Identity (tier 2): `--q-font-sans`/`--q-font-mono`, the `--q-text-*` scale, `--q-radius-*`, `--q-shadow-1..3`, `--q-scrim`, `--q-ring-soft`, `--q-dur-*`/`--q-ease-*`, the density job tokens. Component (tier 3): `--q-button-radius`, `--q-badge-success-bg` and the like, only where the identity needs it |

A dark theme should also restate the shadows, scrim and soft ring, as `_foundry-dark.scss` does:
the light defaults vanish on a dark ground.

**Caveats:**

- **Reduced motion.** quiet zeroes `--q-dur-*` under `prefers-reduced-motion: reduce` on `:root`
  only. A theme that sets durations must repeat the zeroing for its own selector, inside
  `@layer q.themes`.
- **Density.** The density job tokens (`--q-space-card-pad`, `--q-space-section`…) switch on
  `data-density`. A theme that sets them wins over `data-density` on the same element, and
  `QuietRoot` puts both attributes on one element. Prefer setting density per surface.
- **Fonts.** `quiet.css` loads Inter Tight and JetBrains Mono from Google Fonts. A theme that
  sets `--q-font-*` loads its own font files.
- **Contrast.** Check every theme for contrast: APCA for body text, with WCAG AA as the floor.
