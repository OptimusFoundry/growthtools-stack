---
name: quiet-app
description: Use when building, changing or reviewing UI in an app that uses the @optimusfoundry/quiet design system (screens, forms, tables, dashboards, settings, agent features, chat). Covers setup, how to lay out a screen with quiet's layout system, and the measured check before finishing.
---

# Building with quiet

Guidelines ship in `node_modules/@optimusfoundry/quiet/docs/guidelines/`. Read `README.md` (the ten
rules) first, then the guide for the decision at hand: `layouts.md`, `sections.md`, `grid.md`,
`spacing.md`, `typography.md`, `components.md`, `foundations.md`, `content.md`, `accessibility.md`,
`checklist.md`. Props and styles: `src/components/<group>/<Name>.tsx` and `.scss` (vendored), or
`dist/components/<group>/<Name>.d.ts` (installed).

## Setup

```tsx
import "@optimusfoundry/quiet/style.css";
import "@optimusfoundry/quiet/fonts.css"; // skip if your theme sets its own fonts
import { QuietRoot, ThemeProvider, Toaster } from "@optimusfoundry/quiet";

<ThemeProvider defaultValue="foundry" linkComponent={RouterLink}>
  <QuietRoot density="app">  {/* no theme prop: follows ThemeProvider, dark included */}
    <App />
    <Toaster position="bottom-right" max={3} />
  </QuietRoot>
</ThemeProvider>;
```

- quiet is vendored in `vendor/quiet` (`"@optimusfoundry/quiet": "file:./vendor/quiet"`). **Never edit
  it.** `npx quiet check` fails on any change. A quiet bug is fixed in the quiet repo, then re-synced
  with `node ../quiet/scripts/quiet.mjs sync --ref <tag>`. If you're blocked, say so; don't patch the copy.
- `RouterLink` adapts your router's link to `LinkComponent`; every in-app `href` quiet renders goes
  through it.
- Product identity is a theme (`defineThemes` plus `[data-theme="acme"]` in `@layer q.themes`), see
  `DESIGN.md#product-themes`. Never fork a component for identity.
- Pass `theme` to QuietRoot only to pin a subtree to one theme.

## Lay out a screen

Decide on paper before writing JSX.

1. Job: one sentence for what the user does here. Anything that doesn't serve it stays off the page.
2. Layout: pick it from `layouts.md` by that job and apply its dimensions and rules.
3. Outline: headings only. One `h1`, an `h2` per section, an `h3` per panel, ordered status, lead
   block, supporting blocks, destructive last (`sections.md`). One block leads.
4. Place: panes and spans from `grid.md`'s allowed splits; the lead gets the widest.
5. Contain: the lightest container that works. No card-in-card, no panel around a table.
6. Components: choose each with `components.md`. No badge, alert, chart or icon just because a slot
   exists.
7. Gaps and text: job tokens from `spacing.md`, roles from `typography.md`. No raw px, sizes or colours.
8. States: loading, empty (nothing yet vs filtered), error and offline for every data block.

## Never

- Hand-roll what quiet has, or add another UI kit or chart library.
- Raw colours, px or durations. Status colour only from `--q-status-*` and component props.
- Guessed or invented `--q-*` names. Look them up in `dist/tokens.json`; `TokenName` + `cssVar()` in TS;
  the `quiet/known-tokens` Stylelint rule (README). Your own custom properties are `--app-*`.
- Molten as a fill, button or background (charts: series 1).
- Banned words (`content.md`), exclamation marks or emoji.

If quiet lacks something, build it in the product on quiet tokens and BEM, and flag it for quiet.

## Before you finish

1. `npx quiet-audit <url…> --width 1280,390 --theme <theme>,<dark pair>`. Fix every finding or
   justify it in the PR.
2. Look at both themes at 1280 and 390 against `checklist.md`: hierarchy, one lead, sectioning, slop,
   copy. For a whole screen, hand this to the `quiet:quiet-screen-reviewer` agent.
3. `document.title` per route, focus after navigation, named landmarks, axe clean: the app's duties
   in `accessibility.md`, "What the app must do".
