# Layout, Spacing, Radius & Shape

## Spacing scale

```
--space-1    4px     inline micro-gap
--space-2    8px     icon ↔ label
--space-3    12px    tight element gap
--space-4    16px    default element gap
--space-5    24px    card inner gap
--space-6    32px    card section gap
--space-7    40px    page gutter (tight)
--space-8    48px    page gutter (default)  ← --space-page
--space-10   64px    major section gap
--space-12   80px    page-level rhythm
--space-16   112px   hero breathing room
--space-20   144px
--space-24   192px
```

**Rules:**
- Card inner padding: `20–28px` (use 20 for dense, 24 for default, 28 for hero cards)
- Page padding (main content): `56px 56px 80px` (top/sides/bottom)
- Between major page sections: `56px` (gap or margin-top)
- Catalog-style section rhythm: `80px` padding-top + 1px top border
- Page header bottom margin: `56–64px`
- Topbar height: `72px`
- Sidebar width: `248–260px`

## Radius

```
--r-xs    2px     pill divider, sub-element
--r-sm    4px     small badge, code
--r-md    8px     small buttons, chips, tab pill inner, input small
--r-lg    12px    inputs, tabs enclosed, cards (default small)
--r-xl    20px    main cards, stat grid, shell borders
--r-2xl   28px    sign-in card, large hero cards
--r-3xl   40px    full-bleed rounded surface
--r-full  9999px  pills, avatars, badges, topbar search
```

**Per-component defaults in kit.css:**
- `.card`: 20px
- `.btn` (pill, in kit.css): 999px ← **pill CTAs** are the house style
- `.btn` (in catalog.css): 10px (rounded rect); sm=8px, lg=12px, xl=14px
- `.quick-grid`, `.stat-grid`, `.cal-grid`: 20px (all sharing a single outer radius via `overflow:hidden`)
- Inputs: 10px (sm=8, lg=12)
- Modals: 16px
- Sign-in card: 28px

**Theme-sensitive:** `porcelain` collapses radii to near-zero; `brutal` keeps them small. Always use tokens.

## Shadows

Reserve shadows; prefer borders for hierarchy.
- `--shadow-xs` — never quite needed; buttons and inputs
- `--shadow-sm` — input focus ring (paired with border color)
- `--shadow-md` — card `.elevated`, popovers
- `--shadow-lg` — toasts, dropdowns, menus, `.card.interactive:hover`
- `--shadow-xl` — modals, sign-in card, command palette
- `--shadow-primary` — hover on primary buttons (`.btn.primary:hover`)
- `--shadow-accent` — hover on accent buttons / glow effects

## Motion

```
--dur-fast    150ms    hover, button, input border
--dur-normal  240ms    menu open, tab switch
--dur-slow    400ms    accordion expand, step connector

--ease-out      cubic-bezier(0.22, 1, 0.36, 1)   default; hover affordances
--ease-in-out   cubic-bezier(0.4, 0, 0.2, 1)     bi-directional
--ease-bounce   cubic-bezier(0.34, 1.56, 0.64, 1) playful
--ease-smooth   cubic-bezier(0.25, 0.1, 0.25, 1)  interp
```

## Page shell (the canonical app layout)

```html
<div class="app">
  <aside class="sidebar">…</aside>
  <div class="content">
    <header class="topbar">…</header>
    <main class="page">…</main>
  </div>
</div>
```

- `.app` — `display:flex; height:100vh; overflow:hidden`
- `.sidebar` — fixed 248px, border-right, 20px padding
- `.content` — `flex:1; overflow:auto`
- `.topbar` — sticky top, 72px tall, bottom-bordered, `backdrop-filter:blur(10px)`
- `.page` — `padding: 56px 56px 80px; max-width: 1320px; display:flex; flex-direction:column; gap: 56px`

Full React skeleton in `11-page-composition.md`.

## Catalog shell (for spec/reference pages)

```html
<div class="cat-shell">  <!-- grid-template-columns: 260px 1fr -->
  <aside class="cat-nav">…</aside>
  <main class="cat-main">…</main>
</div>
```
- `.cat-nav` — sticky 100vh, `padding: 32px 20px 40px`
- `.cat-main` — `padding: 60px 64px 120px; max-width: 1240px`
- `.cat-section` — `padding: 80px 0 40px; border-top: 1px solid var(--border)`

## Common grids

**Quick-access grid (dashboard entry points):**
```html
<div class="quick-grid">
  <button class="quick-card">…</button>
  <!-- 1px gap creates internal divider lines — a signature pattern -->
</div>
```
`grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1px; background: var(--border)` — the 1px gap + border bg = divider lines for free.

**Stat grid (4-up KPIs):**
```html
<div class="stat-grid">  <!-- 4 cols, 1px divider bg -->
  <div class="stat">…</div>
  …
</div>
```

**Calendar grid (7 cols):**
```html
<div class="cal-grid">
  <div class="cal-head">SUN</div> … <div class="cal-head">SAT</div>
  <div class="cal-day"><span class="n">1</span><span class="cal-event">Post · LinkedIn</span></div>
  …
</div>
```

**Spec grid (showcase):**
```html
<div class="spec-grid cols-2">…</div>   <!-- or cols-3 -->
```
Auto-fit by default (260px min), `cols-2`/`cols-3` lock columns.

## Do / Don't

✅ Use 1px gap + border bg trick for "divider line" grids (quick-grid, stat-grid, cal-grid)
✅ `max-width: 1320px` on `.page`, centered via margin or left-aligned with sidebar
✅ Sticky topbar with `backdrop-filter: blur(10px)`

❌ Inline pixel spacing when a `--space-*` token exists
❌ Card padding below 16px — feels cramped
❌ Multiple shadow levels on one surface
