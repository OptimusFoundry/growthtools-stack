# Page Composition — Putting It All Together

How to build a real Growth Tools page. Every page follows the same skeleton and the same vertical rhythm.

## 1. HTML skeleton

```html
<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <title>Your Page — Growth Tools</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="kit.css?v=3">
  <!-- React + Babel pinned scripts (see 00-overview.md) -->
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react">
    function App() {
      return (
        <div className="app" data-screen-label="Growth Tools · Dashboard">
          <Sidebar/>
          <div className="content">
            <Topbar title="Dashboard"/>
            <Page />
          </div>
        </div>
      );
    }
    ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
  </script>
</body>
</html>
```

## 2. Shell: Sidebar + Topbar + Content

```jsx
function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">G</div>
        <span className="brand-name">Growth</span>
      </div>
      <nav className="nav">
        <div className="nav-eyebrow">MAIN</div>
        <a className="nav-item active"><Icon/>Dashboard</a>
        <a className="nav-item"><Icon/>Posts <span className="count">12</span></a>
        <a className="nav-item"><Icon/>AI Chat</a>
        <a className="nav-item"><Icon/>Calendar</a>

        <div className="nav-eyebrow">LIBRARY</div>
        <a className="nav-item"><Icon/>Media</a>
        <a className="nav-item"><Icon/>Blog</a>
      </nav>
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="av circle sm">AH</div>
          <div className="info">
            <div className="name">Amrita Hegde</div>
            <span className="tier creator">Creator</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ title }) {
  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-search">
        <div className="inp" style={{ borderRadius: 999 }}>
          <Icon/><input placeholder="Search"/><kbd>⌘K</kbd>
        </div>
      </div>
      <div className="topbar-actions">
        <button className="btn ghost icon-only"><Icon/></button>
        <div className="av circle sm">AH</div>
      </div>
    </header>
  );
}
```

## 3. Page structure — the canonical layout

```jsx
function Page() {
  return (
    <main className="page">
      <PageHeader />
      <StatsSection />
      <QuickAccessSection />
      <RecentActivitySection />
    </main>
  );
}
```

### Page header (ALWAYS this shape)
```jsx
<header className="page-header">
  <span className="ds-eyebrow">DASHBOARD · NOV 2025</span>
  <h1 className="page-title">
    Good morning, Amrita. Your queue looks healthy.
  </h1>
  <p className="page-sub">
    14 posts scheduled across 4 channels. Engagement is up 12% this week.
  </p>
  <div className="page-actions">
    <button className="btn primary lg">Create post</button>
    <button className="btn secondary lg">Import CSV</button>
  </div>
</header>
```

Parts:
- **Eyebrow** — `.ds-eyebrow` (mono uppercase, widest tracking)
- **Title** — Geist display, 700 weight (~48–64px), balanced
- **Sublede** — Geist body (18–22px, `--fg3`, max 62ch)
- **Actions** — right-aligned row (may sit on opposite end of header flex row)

### Section rhythm

Between every top-level section, leave `56px` gap (`.page` gap token already does this) or put a 1px top border with `padding-top: 56px` for catalog-style breaks.

Each section has:
```jsx
<section>
  <div className="section-head">
    <h2 className="ds-h2">Overview</h2>
    <a className="btn ghost sm">View all →</a>
  </div>
  {/* content */}
</section>
```

## 4. Common section templates

### A — Stat row (4-up KPIs)
```jsx
<section>
  <div className="section-head">
    <h2 className="ds-h2">Performance at a glance</h2>
    <div className="tabs-pill">
      <button className="tab">7d</button>
      <button className="tab active">30d</button>
      <button className="tab">90d</button>
    </div>
  </div>
  <div className="stat-grid">
    <StatCard label="IMPRESSIONS" value="248,291" trend="up" delta="12.4%" foot="vs last 30 days"/>
    <StatCard label="ENGAGEMENTS" value="14,210" trend="up" delta="8.1%"/>
    <StatCard label="NEW FOLLOWERS" value="1,842" trend="down" delta="2.0%" filled/>
    <StatCard label="POSTS LIVE" value="48" trend="neutral" delta="—"/>
  </div>
</section>
```

### B — Quick-access grid (entry points)
```jsx
<section>
  <div className="quick-grid">
    <button className="quick-card">
      <div className="quick-ic"><Icon/></div>
      <div className="quick-t">Write a post</div>
      <div className="quick-d">AI drafts, voice-matched</div>
    </button>
    {/* 3–6 tiles total */}
  </div>
</section>
```

### C — Feed (posts + filters)
```jsx
<section>
  <div className="section-head">
    <h2 className="ds-h2">Recent posts</h2>
    <div className="tabs-pill">
      <button className="tab active">All</button>
      <button className="tab">Scheduled</button>
      <button className="tab">Drafts</button>
    </div>
  </div>
  <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:20 }}>
    {posts.map(p => <PlatformPostCard key={p.id} {...p}/>)}
  </div>
</section>
```

### D — Callout (upgrade / announcement)
```jsx
<section>
  <div className="up-prompt">…</div>
</section>
```

## 5. Column proportions

On wide surfaces, mix single- and multi-column:
- Single-column: `max-width: 1320px; margin: 0 auto` inside `.page`
- Two-column: `grid-template-columns: 2fr 1fr` (main + aside), gap `32px`
- Three-up cards: `repeat(auto-fill, minmax(320px, 1fr))`, gap `20px`
- Four-up stats: `repeat(4, 1fr)` with 1px `background:var(--border)` gap

## 6. Imagery & icons

- **Icons**: Lucide-style 24×24 line icons, `stroke-width: 2`, `stroke-linecap: round`. Always inline SVG, use `currentColor`.
- **Images**: placeholders are fine — a solid `--base-200` rect at the right aspect ratio beats a bad stock photo.
- **Avatars**: initials in Geist 600 by default; use real images only if provided.

## 7. Checklist — does this page "look Growth Tools"?

Before delivering, verify:

- [ ] Uses `kit.css` or `catalog.css` — no hand-rolled CSS for primitives
- [ ] `<html data-theme="…">` set (even if `light` or default)
- [ ] Page title is Geist at 700 weight
- [ ] Every section heading has a **mono eyebrow** above it
- [ ] KPIs use `.sc` with Geist 700 numerals
- [ ] Post bodies use `.pp-body` (Geist, regular weight)
- [ ] Color: no raw hex on text/bg (platform chips excepted)
- [ ] Buttons: one primary per region; secondary/ghost fill the rest
- [ ] Spacing: page padding `56–64px`, sections gap `56–80px`, cards `20–28px`
- [ ] Radius: tokens only — no literal `border-radius: 8px`
- [ ] Icons are line-style, `currentColor`, 14–24px
- [ ] `data-screen-label` on the outermost shell div for comment context

## 8. Minimal end-to-end example

See `ui_kits/growth-tools/index.html` + `Dashboard.jsx` for the canonical composition. When in doubt, copy that shape and swap content.
