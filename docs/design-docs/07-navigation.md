# Navigation: Tabs, Breadcrumbs, Pagination, Steps

## Tabs — three styles

### Line (default in-content tabs)
```html
<div class="tabs-line">
  <button class="tab active">Overview</button>
  <button class="tab">Posts</button>
  <button class="tab">Analytics</button>
  <button class="tab">Settings</button>
</div>
```
A 2px underline slides under the active tab. Use for **primary section tabs** within a page.

### Pill (compact, secondary filtering)
```html
<div class="tabs-pill">
  <button class="tab active">All</button>
  <button class="tab">Drafts</button>
  <button class="tab">Scheduled</button>
  <button class="tab">Published</button>
</div>
```
`base-100` bg, active tab lifts to `bg-surface` with `shadow-xs`. Use for **filter groups** and toolbar segmented controls.

### Enclosed (segmented control)
```html
<div class="tabs-enc">
  <button class="tab active">Day</button>
  <button class="tab">Week</button>
  <button class="tab">Month</button>
</div>
```
Shared border, inverted ink on active. Use for **view switches** (calendar day/week/month, chart timeframes).

## Breadcrumb — `.crumb`
```html
<nav class="crumb">
  <a href="#">Home</a>
  <svg class="sep" …/>
  <a href="#">Campaigns</a>
  <svg class="sep" …/>
  <span class="current">Summer launch</span>
</nav>
```
Use only when nav is ≥3 levels deep. On 2 levels, a back button is clearer.

## Pagination — `.pag`
```html
<div class="pag">
  <button><svg …/></button>               <!-- prev -->
  <button class="active">1</button>
  <button>2</button>
  <button>3</button>
  <span class="dots">…</span>
  <button>24</button>
  <button><svg …/></button>               <!-- next -->
</div>

<!-- Variants: .outline (transparent) / .ghost (no border) on each button -->
```

## Step indicator — `.steps`
```html
<div class="steps">
  <div class="step completed">
    <div class="indicator"><svg …/></div>   <!-- check icon -->
    <div class="label">Connect</div>
  </div>
  <div class="connector done"></div>

  <div class="step active">
    <div class="indicator">2</div>
    <div class="label">Configure</div>
  </div>
  <div class="connector"></div>

  <div class="step">
    <div class="indicator">3</div>
    <div class="label">Publish</div>
  </div>
</div>
```
- `.completed` — green ✓
- `.active` — ink fill
- neutral — outlined circle
- `.connector.done` turns green; default is `--border`

Use for onboarding, multi-step forms, publish flows.

## Sidebar navigation (kit.css app shell)

The canonical app sidebar uses `.nav-item` and `.nav-eyebrow`:
```html
<aside class="sidebar">
  <div class="brand">
    <div class="brand-mark">G</div>
    <span class="brand-name">Growth</span>
  </div>

  <nav class="nav">
    <div class="nav-eyebrow">MAIN</div>
    <a class="nav-item active" href="#"><svg …/> Dashboard</a>
    <a class="nav-item" href="#"><svg …/> Posts <span class="count">12</span></a>
    <a class="nav-item" href="#"><svg …/> AI Chat</a>
    <a class="nav-item" href="#"><svg …/> Calendar</a>

    <div class="nav-eyebrow">LIBRARY</div>
    <a class="nav-item" href="#"><svg …/> Media</a>
    <a class="nav-item" href="#"><svg …/> Blog</a>
  </nav>

  <div class="sidebar-footer">
    <!-- user card + tier badge -->
  </div>
</aside>
```
- `nav-eyebrow` — mono uppercase 10px, `--fg4`, top-margin 14px
- `nav-item` — 7px 10px padding, 8px radius, `--fg2` text
- `nav-item.active` — `background: var(--fg1); color: var(--bg)` (inverted ink)
- `nav-item .count` — mono 10px, dimmed

## Topbar
```html
<header class="topbar">
  <h1 class="topbar-title">Dashboard</h1>
  <div class="topbar-search">
    <div class="inp" style="border-radius:999px;">
      <svg …/><input placeholder="Search"/><kbd>⌘K</kbd>
    </div>
  </div>
  <div class="topbar-actions">
    <button class="btn ghost icon-only"><svg …/></button>  <!-- notifications -->
    <div class="av circle sm">AH</div>
  </div>
</header>
```
Sticky top, `72px` tall, `backdrop-filter: blur(10px)`, bottom border.

## Do / Don't
✅ Match tab style to purpose: line (sections), pill (filters), enclosed (view-switch)
✅ Breadcrumb only at ≥3 levels
✅ Step connector uses `.done` to signal progress visually

❌ More than one line-tab row stacked — use pill for the secondary
❌ Tabs used as primary nav (use sidebar)
❌ Pagination without prev/next arrows
