# Recipes — the cookbook

Every recipe here solves a real, recurring need. Copy the markup, keep the structure, swap the content. The rules in `12-judgment.md` explain *why*; this doc just gives you *how*.

Each recipe is labeled `R-N.M`. Cite in review ("use R-2.1 instead of that custom card").

---

## R-1. Page headers

### R-1.1 Standard page header (the 90% case)

```jsx
<header className="page-header">
  <span className="ds-eyebrow">LIBRARY · 07 ENTRIES</span>
  <h1 className="page-title">
    Everything you've written, in one room.
  </h1>
  <p className="page-sub">
    Drafts, scheduled, and published — sorted the way your week actually works.
    Click through to edit in the composer.
  </p>
  <div className="page-actions">
    <button className="btn primary lg">New post</button>
    <button className="btn secondary lg">Import CSV</button>
  </div>
</header>
```

Stack: 4 / 12 / 24 / 56 (J-1). Eyebrow carries a data point (J-11.3). Two buttons max: primary + secondary.

### R-1.2 Data-heavy header (dashboard, analytics)

Drop the sublede; inline date + persona tags:

```jsx
<header className="page-header">
  <span className="ds-eyebrow">DASHBOARD · NOV 12 · WEEK 46</span>
  <h1 className="page-title">
    Good morning, Alex — eight things to ship.
  </h1>
  <div className="page-actions" style={{marginTop: 24}}>
    <span className="tier creator">Creator · Pro</span>
    <button className="btn primary">Create post</button>
  </div>
</header>
```

When the title already states the state, no sublede. Save the reader a line.

### R-1.3 Section of a settings page

Smaller scale — use `.ds-h2` (36px), drop eyebrow to the mono label, no actions row:

```jsx
<div style={{marginBottom: 56}}>
  <span className="ds-eyebrow">BILLING</span>
  <h2 className="ds-h2" style={{marginTop: 4}}>Your plan</h2>
  <p className="ds-prose" style={{marginTop: 12, maxWidth: '62ch', color: 'var(--fg2)'}}>
    You're on <strong>Creator · Pro</strong>, billed annually. Next renewal Apr 24.
  </p>
</div>
```

Never use `.page-title` inside a settings panel — reserve it for the route's one true header.

---

## R-2. Cards

### R-2.1 Default card (outlined, no shadow at rest)

```jsx
<div className="card outlined">
  <div className="card-hd">
    <h4 className="ds-h3">Recent activity</h4>
    <button className="btn ghost sm">View all →</button>
  </div>
  <div className="post-list">
    {/* rows */}
  </div>
</div>
```

- 20–24px padding (J-5.1)
- No bottom border between head and body (J-4.4)
- One ghost action in the header, max

### R-2.2 Interactive card (tiles, plan pickers)

```jsx
<button className="card outlined interactive" onClick={onPick}>
  <div className="ds-eyebrow">STARTER</div>
  <h3 className="ds-h3" style={{marginTop: 4}}>Creator</h3>
  <div className="ds-numeric" style={{fontSize: 56, marginTop: 12}}>
    $18<small style={{fontSize: 18, color: 'var(--fg3)'}}>/mo</small>
  </div>
  <p style={{marginTop: 12, color: 'var(--fg2)'}}>For solo operators.</p>
</button>
```

Use a real `<button>` — never `<div onClick>` (A11y, see `16-accessibility.md`).

Hover: `translateY(-2px)` + shadow-lg, border fades out (J-10.5). Press: `scale(0.98)`.

### R-2.3 Filled card (hero slot, one per page)

```jsx
<div className="card filled" style={{padding: 32}}>
  <span className="ds-eyebrow">UPGRADE</span>
  <h3 className="ds-h3" style={{marginTop: 4}}>
    Unlock the team plan.
  </h3>
  <p style={{marginTop: 12, color: 'var(--fg2)', maxWidth: '52ch'}}>
    Shared brand voice, approval flows, and seat-based billing.
  </p>
  <button className="btn accent" style={{marginTop: 24}}>See plans</button>
</div>
```

Filled cards are `--base-100` bg. Use for upgrade moments. One per page (J-6.7).

### R-2.4 Stat card — the KPI

```jsx
<div className="sc">
  <div className="sc-hd">
    <span className="sc-lbl">ENGAGEMENT RATE</span>
    <div className="sc-ic"><Icon name="chart"/></div>
  </div>
  <div className="sc-val">4.8<small>%</small></div>
  <div className="sc-row">
    <span className="sc-tr up"><Arrow/> 0.4pt</span>
    <span className="sc-ft">vs prior mo</span>
  </div>
</div>
```

- `.sc-val` is Geist 700, `tnum` on, 56–64px (J-3.3)
- Trend arrow: green ↑ / red ↓ / neutral —, never a plus/minus sign
- Footer is `--fg3`, mono not required

### R-2.5 4-up stat grid (the signature divider pattern)

```jsx
<div className="stat-grid">
  <div className="sc">…</div>
  <div className="sc filled">…</div>   {/* exactly one filled */}
  <div className="sc">…</div>
  <div className="sc">…</div>
</div>
```

```css
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: var(--border);
  gap: 1px;
  border-radius: 20px;
  overflow: hidden;
}
.stat-grid > .sc { border: 0; border-radius: 0; background: var(--bg-surface); }
```

The 1px border-bg gap IS the divider (J-4.3). Don't add extra borders inside.

---

## R-3. Lists

### R-3.1 Post list (hairline-divided rows)

```jsx
<div className="card outlined">
  <div className="post-list">
    {posts.map((p, i) => (
      <div className="post-row" key={p.id}>
        <span className="idx">{String(i+1).padStart(2, "0")}</span>
        <div>
          <div className="post-title">{p.title}</div>
          <div className="post-meta">{p.when}</div>
        </div>
        <div className="chan" style={{background: p.color}}>{p.channel}</div>
        <StatusBadge status={p.status}/>
        <button className="icon-btn"><Chevron/></button>
      </div>
    ))}
  </div>
</div>
```

- Each row: grid `40px 1fr auto auto auto`, 20px gap, `16px 24px` padding
- Dividers between rows (J-4.1 — identical-shape list items)
- Monospaced index number in `--fg4`
- Title in `--fg1`, meta in `--fg3`
- Last action is always `.icon-btn` chevron — never a text link in a row

### R-3.2 File list (uploads)

```jsx
<div className="file-list">
  {files.map(f => (
    <div className="file-row" key={f.name}>
      <CheckIcon className="succ"/>
      <div className="info">
        <div className="name">{f.name}</div>
        <div className="size">{f.size}</div>
      </div>
      <button className="btn ghost icon-only sm"><Trash/></button>
    </div>
  ))}
</div>
```

Leading status icon (success / error / pending). Trailing action. No `+` counter — if the list grows long, paginate, don't truncate.

### R-3.3 Nav list (sidebar entries)

```jsx
<nav className="nav">
  <div className="nav-eyebrow">MAIN</div>
  <a className="nav-item active" href="/">
    <Icon name="home"/> Dashboard
  </a>
  <a className="nav-item" href="/posts">
    <Icon name="pen"/> Posts <span className="count">12</span>
  </a>
</nav>
```

- Eyebrow groups 2–5 nav items, then another eyebrow
- Active state: `--bg-surface` bg + 1px left border in `--primary` (not a full pill — too heavy at this size)
- Count lives right-aligned, mono, `--fg3`

---

## R-4. Forms

### R-4.1 Standard input field

```jsx
<div>
  <label className="lbl">Email address <span className="req">*</span></label>
  <div className="inp">
    <Icon name="mail"/>
    <input type="email" placeholder="you@company.com"/>
  </div>
  <div className="hint">We'll use this for billing receipts.</div>
</div>
```

Label → input gap: 8px. Input → hint gap: 6px. Between fields: 20px (J-1.2 paired, J-1.3 grouped sibling).

### R-4.2 Field group (2-column on wide)

```jsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 20,
}}>
  <Field label="First name">…</Field>
  <Field label="Last name">…</Field>
  <Field label="Company" style={{gridColumn: '1 / -1'}}>…</Field>
</div>
```

`auto-fit` so the grid collapses to 1-col on narrow. The full-width field uses `grid-column: 1 / -1`.

### R-4.3 Section of settings

```jsx
<section style={{marginBottom: 56}}>
  <div className="section-head">
    <h2 className="ds-h2">Notifications</h2>
    <span className="ds-eyebrow">04 PREFERENCES</span>
  </div>
  <div className="card outlined" style={{padding: 24}}>
    <label className="sw">
      <input type="checkbox" defaultChecked/>
      <span className="track"><span className="thumb"/></span>
      <span className="sw-text">
        <span className="label">Weekly digest</span>
        <span className="desc">A summary of your posts every Monday at 09:00</span>
      </span>
    </label>
    {/* more switches, separated by 16px, no dividers */}
  </div>
</section>
```

A column of switches is self-partitioning (J-4.2). No lines between them.

### R-4.4 Destructive confirm (delete modal)

```jsx
<div className="modal">
  <div className="modal-body">
    <h3 className="ds-h3">Delete this post?</h3>
    <p style={{marginTop: 12, color: 'var(--fg2)'}}>
      This action cannot be undone. The post will be removed from your library
      and any scheduled queue.
    </p>
  </div>
  <div className="modal-ft">
    <button className="btn ghost">Cancel</button>
    <button className="btn danger">Delete post</button>
  </div>
</div>
```

- Title is specific ("Delete this post?") not generic ("Are you sure?")
- Danger button says what happens, not "OK"
- Cancel is ghost, not secondary — the cancel path should look lighter than the destructive one

---

## R-5. Buttons & button groups

### R-5.1 Page-level action bar

```jsx
<div className="page-actions">
  <button className="btn primary lg">Save changes</button>
  <button className="btn secondary lg">Discard</button>
</div>
```

Primary first (reading order = action order). Both `.lg` — page-level actions are one step up from default.

### R-5.2 Card footer actions

```jsx
<div className="card-ft">
  <button className="btn ghost sm">Preview</button>
  <div style={{flex: 1}}/>
  <button className="btn secondary sm">Save draft</button>
  <button className="btn primary sm">Publish</button>
</div>
```

Small buttons. Primary far-right (the "commit" position). Tertiary action on the left, separated by flex spacer. Never center.

### R-5.3 Tab pill (segmented control)

```jsx
<div className="tabs-pill">
  <button className="tab">7d</button>
  <button className="tab active">30d</button>
  <button className="tab">90d</button>
</div>
```

- Track: `--base-100` bg, `r-full`, 4px padding
- Thumb: `--bg-surface` bg, `shadow-sm`, `r-full`
- 2–4 tabs only. If you need 5+, use a real tab bar, not a pill.

### R-5.4 Icon-only button row (toolbar)

```jsx
<div style={{display: 'flex', gap: 4}}>
  <button className="btn ghost icon-only sm" aria-label="Bold"><B/></button>
  <button className="btn ghost icon-only sm" aria-label="Italic"><I/></button>
  <div style={{width: 1, background: 'var(--border)', margin: '0 4px'}}/>
  <button className="btn ghost icon-only sm" aria-label="Link"><Link/></button>
</div>
```

A vertical 1px divider groups related actions. `aria-label` is non-optional.

---

## R-6. Empty states

### R-6.1 First-time empty (no data yet)

```jsx
<div className="card outlined" style={{padding: 64, textAlign: 'center'}}>
  <div style={{
    width: 64, height: 64, margin: '0 auto 24px',
    borderRadius: 999, background: 'var(--base-100)',
    display: 'grid', placeItems: 'center'
  }}>
    <Icon name="pen" size={28} style={{color: 'var(--fg3)'}}/>
  </div>
  <h3 className="ds-h3">No posts yet</h3>
  <p style={{marginTop: 8, color: 'var(--fg3)', maxWidth: '42ch', margin: '8px auto 0'}}>
    Create your first post to see it here. Drafts save as you type.
  </p>
  <button className="btn primary" style={{marginTop: 24}}>
    Create a post
  </button>
</div>
```

- Centered stack (J-7.1 exception)
- Icon in a `--base-100` pill, 48px ring at 64×64 outer
- One primary CTA, no secondary — the empty state doesn't need alternatives

### R-6.2 Filtered empty (user's search returned 0)

```jsx
<div className="card outlined" style={{padding: 48, textAlign: 'center'}}>
  <h3 className="ds-h3">No matching posts</h3>
  <p style={{marginTop: 8, color: 'var(--fg3)'}}>
    Try adjusting your filters to find what you're looking for.
  </p>
  <button className="btn ghost sm" style={{marginTop: 24}}>Clear filters</button>
</div>
```

Smaller than first-time empty. No illustration. The action is "undo the filter," not "create something."

---

## R-7. Headers that aren't page headers

### R-7.1 Section head

```jsx
<div className="section-head">
  <h2 className="ds-h2">Recent posts</h2>
  <a className="btn ghost sm">View all →</a>
</div>
```

Baseline-aligned (J-7.2). Right side is an action, a tab-pill, or a count — never a paragraph.

### R-7.2 Section head with tab pill

```jsx
<div className="section-head">
  <div>
    <span className="ds-eyebrow">PERFORMANCE</span>
    <h2 className="ds-h2" style={{marginTop: 4}}>
      Your numbers this week.
    </h2>
  </div>
  <div className="tabs-pill">
    <button className="tab">7d</button>
    <button className="tab active">30d</button>
    <button className="tab">90d</button>
  </div>
</div>
```

Keep section-head titles short — they compete with the page-title for attention, and the page-title should win.

### R-7.3 Card head

```jsx
<div className="card-hd">
  <h4 className="ds-h3">Filters</h4>
  <button className="btn ghost sm">Clear</button>
</div>
```

`.ds-h3` is Geist, 22px, `--fg1`. No eyebrow inside a card — eyebrows belong to sections, not cards.

---

## R-8. Media & imagery

### R-8.1 Placeholder gradient

```jsx
const placeholder = (hue) => ({
  background: `linear-gradient(135deg,
    oklch(22% 0.04 ${hue}deg),
    oklch(38% 0.12 ${hue}deg))`
});

<div className="thumb" style={{...placeholder(265), aspectRatio: '16/9'}}/>
```

Rotate hue (265, 280, 55, 140, 20) across a set. Never gray boxes. Never checkered (J-12.2).

### R-8.2 Avatar with fallback

```jsx
<div className="av circle md">
  {user.photo
    ? <img src={user.photo} alt=""/>
    : <span>{initials(user.name)}</span>}
</div>
```

Initials in Geist 600 (pre-styled on `.av`). `alt=""` on decorative avatars; real alt text on avatars that convey identity.

### R-8.3 Thumbnail grid (media library)

```jsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 16,
}}>
  {media.map(m => (
    <div key={m.id} className="media-tile" style={{aspectRatio: '1'}}>
      …
    </div>
  ))}
</div>
```

Media is a square grid (1:1), not a masonry. Masonry reads as Pinterest — not the house vibe.

---

## R-9. Patterns for AI-driven UIs

### R-9.1 Generated content block (with regenerate)

```jsx
<div className="pv-block">
  <button className="pv-block-head">
    <CheckIcon/>
    <span>Base content</span>
    <ChevronUp/>
  </button>
  <div className="pv-block-body">
    <p>{generatedText}</p>
  </div>
  <div className="pv-block-ft">
    <button className="btn ghost sm"><Refresh/> Regenerate</button>
    <button className="btn ghost sm"><Copy/> Copy</button>
  </div>
</div>
```

AI-generated content lives in a collapsible block with a clear "base / variation" mental model. The regenerate button is always there — never hide it behind a menu.

### R-9.2 Streaming response (chat)

```jsx
<div className="msg assistant">
  <div className="msg-body">
    {text}
    {streaming && <span className="caret"/>}
  </div>
  <div className="msg-actions">
    <button className="icon-btn"><Copy/></button>
    <button className="icon-btn"><Thumb/></button>
    <button className="icon-btn"><Refresh/></button>
  </div>
</div>
```

- Blinking caret only while streaming (CSS `@keyframes blink`)
- Actions appear on hover at row-level, not per message
- Never "thinking…" text — the caret is the thinking signal

---

## R-10. Assembling a full page

The canonical page is 4 sections:

```jsx
<main className="page">
  <PageHeader/>                {/* R-1.1 */}
  <StatsSection/>              {/* R-2.5 */}
  <QuickAccessSection/>        {/* quick-grid of tiles */}
  <RecentActivitySection/>     {/* R-3.1 */}
</main>
```

Section gaps are 56px (J-1.4, handled by `.page { gap: 56px }`). Bottom padding is 80px (J-1.5). Max width 1320px.

For narrower pages (forms, settings, single-article views), switch to `max-width: 720px; margin: 0 auto` — but keep the same vertical rhythm.

---

## R-11. When no recipe fits

If you're about to invent something new, stop and check:

1. **Can this be a `.card` with different content?** Usually yes.
2. **Is this a list of similar things?** Use R-3.1 — the post-list is surprisingly flexible.
3. **Is this a form field in disguise?** (picker, date range, tag input) → use R-4.1 with custom input type.
4. **Is this one-off marketing content?** You're allowed more freedom in hero/sign-in/empty surfaces than in product surfaces. See `14-composition.md`.

If none of those fit: write the component once, name it clearly, and add it as a new recipe. Don't invent inline in three pages.
