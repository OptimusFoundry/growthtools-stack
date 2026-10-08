---
name: quiet-app
description: Use when building, changing or reviewing UI in an app that uses the @optimusfoundry/quiet design system (screens, forms, tables, dashboards, settings, agent features, chat with Claude). Covers setup, the procedure for laying out a screen from quiet's layout system, and the measured check before finishing.
---

# Building with quiet

quiet (`@optimusfoundry/quiet`) is the design system. Every screen is composed from its components
and `--q-*` tokens. The full guidelines ship in the package. Read the relevant one before building:

- `node_modules/@optimusfoundry/quiet/docs/guidelines/README.md`: the ten rules; read them first
- `.../layouts.md`: the app shell and the ten page layouts (dimensions, rules, what collapses)
- `.../sections.md`: containers, nesting, headings, order
- `.../grid.md`: fixed panes vs 12 columns, allowed splits
- `.../spacing.md`: what goes between what, per density
- `.../typography.md`: the eight roles and the prop that renders each
- `.../components.md`: choosing between similar components; feedback, destructive, empty/error, agent decisions
- `.../foundations.md`: colour, status, shape, motion
- `.../content.md`: voice, banned words, labels, numbers
- `.../accessibility.md`: what the app still owns
- `.../checklist.md`: the review

Props live in `node_modules/@optimusfoundry/quiet/dist/components/<group>/<Name>.d.ts`.

## Setup

Install a tagged release from git (quiet is not on a registry) and pin the tag:

```bash
npm install "git+https://github.com/OptimusFoundry/quiet.git#vX.Y.Z"
```

```tsx
import "@optimusfoundry/quiet/style.css";   // tokens, themes, base, components. No fonts
import "@optimusfoundry/quiet/fonts.css";   // Inter Tight + JetBrains Mono; skip if your theme sets its own fonts
import { Link } from "@tanstack/react-router";
import { type LinkComponent, QuietRoot, ThemeProvider, Toaster } from "@optimusfoundry/quiet";

const RouterLink: LinkComponent = ({ href, ...p }) => <Link to={href} {...p} />;

<ThemeProvider defaultValue="foundry" linkComponent={RouterLink}>  {/* data-theme on <html> */}
  <QuietRoot density="app">                                        {/* products are density="app" */}
    <App />
    <Toaster position="bottom-right" max={3} />                    {/* one per app; raise with toast() */}
  </QuietRoot>
</ThemeProvider>;
```

- **Links:** every `href` quiet renders (Link, Button, Card, List, Breadcrumb, NavBar, Sidebar …) goes
  through `linkComponent`, so client routing works. External and `#hash` links stay plain `<a>`.
- **Product theme:** the product's identity is a quiet **theme**, defined in the product repo:
  `defineThemes({ acme: { label: "Acme", colorScheme: "light" } })` before the first render, plus
  `[data-theme="acme"] { … }` in `@layer q.themes` (palette, accent, `--q-status-*`). See
  `node_modules/@optimusfoundry/quiet/DESIGN.md#product-themes`. Never fork components for identity.
- **Toasts:** `toast({ title, description, status, action })` from anywhere; `toast.dismiss(id)`.

## Lay out a screen

Decide on paper before writing JSX. Slop comes from composing while coding.

1. **Job:** write one sentence saying what the user does on this screen. Anything that doesn't serve
   that sentence stays off the page.
2. **Layout:** choose it from `layouts.md` by that job, and apply that layout's dimensions and **Rules**.
   If the screen matches a Storybook `patterns-*` story, start from its structure.
3. **Outline:** headings only. One `h1` (PageHero), then an `h2` per section and an `h3` per panel, ordered as
   status, lead block, supporting blocks, destructive last (`sections.md`). Decide which block leads,
   because equal weight is a bug.
4. **Place:** panes and grid spans come from `grid.md`'s allowed splits. The lead block gets the widest span.
5. **Contain:** use the lightest container that works (`sections.md`). No card-in-card, no panel around a table.
6. **Choose components:** pick each one with `components.md`. Every element needs a job. Don't add a badge,
   alert, chart or icon because a slot exists.
7. **Gaps and text:** every gap is a job token (`spacing.md`), and every string has a role rendered by its
   component prop (`typography.md`). No raw px, font sizes or colours.
8. **States:** design loading, empty (nothing yet vs filtered), error and offline for every data block
   (`components.md`).

## Never

- Hand-roll anything quiet has, or add a third-party UI kit or chart library next to it.
- Use raw colours, px gaps or durations. Status colour comes only from `--q-status-*` and component props.
- Use molten as a fill, button or section background. In charts, molten is series 1.
- Fork a component for product identity. Identity is a theme.
- Use banned words (`content.md`), exclamation marks or emoji.

If quiet lacks something, build it in the product on quiet tokens and BEM and flag it for quiet.

## Before you finish

1. Run `npx quiet-audit <url…> --width 1280,390 --theme <your-theme>,<its dark pair>`. It measures spacing,
   type, radius and colour against the tokens, headings, nested cards and overflow. Fix every finding,
   or justify it in the PR.
2. Look at the screen in both themes at 1280 and 390, and go through `checklist.md` for what can't be
   measured: hierarchy, one lead, sectioning, slop, copy.
3. Accessibility: `document.title` per route, focus after navigation, named landmarks, axe clean.
