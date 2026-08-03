# Growth Tools — UI Kit Docs (for AI authors)

This folder contains the instruction set for generating **new pages and prototypes** in the Growth Tools design language. The catalog lives in `ui_kits/growth-tools/catalog.html` (rendered via `catalog.css`). These markdowns distill it into prompt-ready guides.

## What is this kit?

A clean, **Geist-only** design system:
- **Geist** — UI body, headings, inputs, buttons
- **Geist Mono** — eyebrows, data, tabular numbers, filenames

Defaults to the "paper" theme (near-white background, neutral primary). High contrast, airy spacing.

## How to read these docs

Order matters. When generating a new page, read in this order:

1. `00-overview.md` — you are here
2. `01-typography.md` — lock type choices first
3. `02-colors.md` — pick theme + semantic roles
4. `03-layout-spacing.md` — scaffolding, shell, page padding
5. `04-buttons-badges.md` — action vocabulary
6. `05-forms-inputs.md` — if the page has forms
7. `06-feedback.md` — alerts, toasts, progress
8. `07-navigation.md` — tabs, breadcrumbs, pagination, steps
9. `08-overlays.md` — modals, popovers, menus, command palette
10. `09-data-display.md` — cards, stat cards, tables, accordion
11. `10-feature-kit.md` — post cards, tier badges, AI chat, upgrade prompts
12. `11-page-composition.md` — how to assemble it all into a real page
13. `12-judgment.md` — **the prescriptive decisions: exact pair-spacing, color roles, when to show/hide dividers, one-of rules, anti-patterns, 60-second review checklist**
14. `13-recipes.md` — the cookbook: "when you need X, here's the exact markup and reason"
15. `14-composition.md` — macro-rhythm across sections/pages; the 5 archetypes; breakpoints
16. `15-states.md` — loading, empty, error, overflow, read-only; the state inventory for every component
17. `16-accessibility.md` — focus, keyboard, ARIA, contrast, hit targets; WCAG AA baseline
18. `17-implementation.md` — CSS scoping, React patterns, theming, icons, fonts, perf, i18n
19. `18-review.md` — scored 100-pt PR rubric; the template you copy into PR descriptions
20. `19-typography-decisions.md` — **which font/size/color/weight goes where; decision flowchart, full role table, worked examples**
21. `20-spacing-decisions.md` — **which spacing token goes where; flowchart, rhythm pairs, stack ladder, worked examples**

## Setup (every file)

Every HTML file starts with this skeleton. You have two stylesheets to choose from:

### A — Full app stylesheet (for product pages, dashboards, flows)
```html
<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="kit.css?v=3">
</head>
<body>
  <div id="root"></div>
  <!-- your content / React mount -->
</body>
</html>
```

`kit.css` already `@import`s `../../colors_and_type.css`, so you get all tokens, themes, and `.ds-*` utilities automatically.

### B — Catalog stylesheet (for spec sheets, component showcases)
```html
<link rel="stylesheet" href="catalog.css?v=1">
```

`catalog.css` includes every component class (`.btn`, `.badge`, `.tag`, `.alert`, `.modal`, `.pp-card`, etc.) plus all tokens. Use this whenever you want rich primitives without writing CSS.

### Switching themes
```html
<html data-theme="porcelain">   <!-- or: dark, cosmos, cyberpunk, brutal, sunset, claude, ocean, glow, fog, light -->
```
Omit `data-theme` entirely for the default "paper" theme.

## React scaffold (pinned)

If you need React for interactivity, use the exact pinned script tags:
```html
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
```

Then mount:
```html
<script type="text/babel" data-presets="react">
  function App() { return <div className="app">...</div>; }
  ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
</script>
```

## The 5 non-negotiable rules

1. **Oversized numerals** for stats, big percentages, hero KPIs — bold Geist, not a serif display face.
2. **Mono eyebrows.** Every section heading is preceded by a UPPERCASE tracked mono label (`.ds-eyebrow` or `font-family:var(--font-mono); font-size:11px; letter-spacing:0.18em; text-transform:uppercase`).
4. **Warm whites.** Never use `#fff` or `#000` directly — always `var(--bg)`, `var(--bg-surface)`, `var(--fg1)`. The page should feel *toned*.
5. **Airy padding.** Page gutters are `56–64px`. Section rhythm is `56–80px`. Cards are `20–28px`. If it feels cramped, it is.

## What to produce

When asked for "a new page," output a single HTML file that:
- Uses the shell from `11-page-composition.md` (sidebar + topbar + page)
- Has a `.page-header` with eyebrow, Geist title, sublede
- Composes 2–5 sections using components from the catalog
- Never invents new CSS beyond trivial layout tweaks
- Never uses emoji unless the content is explicitly about reactions/emoji
