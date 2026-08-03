# Data Display: Card, Stat Card, Table, Accordion

## Card — `.card`

Base container for grouped content.
```html
<div class="card">
  Plain card — 20px padding, --bg-surface bg, 12px radius, no border.
</div>

<!-- Variants (combine freely) -->
<div class="card outlined">Outlined (1px border)</div>
<div class="card elevated">Elevated (shadow-md)</div>
<div class="card filled">Filled bg (--base-100)</div>
<div class="card interactive">Hover lifts -2px + shadow-lg</div>
```

### With header / footer
```html
<div class="card outlined">
  <div class="card-hd">
    <h4>Recent activity</h4>
  </div>
  …body…
  <div class="card-ft">
    <button class="btn ghost sm">View all</button>
    <button class="btn secondary sm">Export</button>
  </div>
</div>
```

**Use `.card.interactive`** for clickable tiles (blog post entries, integration cards, plan picker cards).

## Stat card — `.sc`

The stat card — Growth Tools' signature for KPIs. Geist 700 numerals at 56px.
```html
<div class="sc">
  <div class="sc-hd">
    <span class="sc-lbl">ENGAGEMENT</span>
    <div class="sc-ic"><svg …/></div>
  </div>
  <div class="sc-val">48,291</div>
  <div class="sc-row">
    <span class="sc-tr up"><svg …/> 12.4%</span>
    <span class="sc-ft">vs last 30 days</span>
  </div>
</div>

<!-- Inverted variant -->
<div class="sc filled">…same structure, ink bg, light fg…</div>

<!-- Trend variants -->
<span class="sc-tr up">…</span>       <!-- green -->
<span class="sc-tr down">…</span>     <!-- red -->
<span class="sc-tr neutral">…</span>  <!-- gray -->
```

**Rules:**
- `.sc-val` MUST use the pre-styled Geist 700 numeral treatment. Never put regular digits there.
- Use `tnum` so numbers align.
- Pair with `--fw-medium` eyebrow label (mono, uppercase, 11px, wide tracking).
- In a 4-up grid, alternate one `.sc.filled` for visual rhythm.

## Stat grid (inline-style)

The signature 4-up with 1px ink dividers:
```html
<div class="stat-grid" style="
  display:grid; grid-template-columns: repeat(4, 1fr);
  background: var(--border); gap: 1px;
  border-radius: 20px; overflow: hidden;
">
  <div class="sc" style="border:0; border-radius:0;">…</div>
  <div class="sc" style="border:0; border-radius:0;">…</div>
  <div class="sc" style="border:0; border-radius:0;">…</div>
  <div class="sc" style="border:0; border-radius:0;">…</div>
</div>
```

## Table — `.tbl`

Standard data table with hairline borders and mono uppercase headers.
```html
<div class="tbl-wrap">
  <table class="tbl">
    <thead>
      <tr>
        <th><span class="sort">Post <svg …/></span></th>
        <th>Channel</th>
        <th>Status</th>
        <th>Engagement</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>How to scale newsletters</td>
        <td><span class="badge default">LinkedIn</span></td>
        <td><span class="badge success"><span class="dot"></span> Live</span></td>
        <td>2,140</td>
        <td><button class="btn ghost icon-only sm"><svg …/></button></td>
      </tr>
      <tr class="selected">…</tr>
    </tbody>
  </table>
</div>

<!-- Variant: .tbl.striped -->
```
- Header: mono 11px, uppercase, `--fg3`, tinted bg
- Row hover: subtle `color-mix`
- Selected row: `.selected` — 8% primary tint
- Compact padding: `12px 16px`

## Accordion — `.acc`
```html
<div class="acc">
  <div class="acc-item open">
    <button class="acc-hd">
      <span class="t">
        Can I connect multiple accounts per channel?
        <span class="d">Also covers the Team plan behaviour</span>
      </span>
      <span class="chev"><svg …/></span>
    </button>
    <div class="acc-body">
      Yes, up to 3 per channel on Creator, unlimited on Team.
    </div>
  </div>
  <div class="acc-item">
    <button class="acc-hd">
      <span class="t">What counts as a "post"?</span>
      <span class="chev"><svg …/></span>
    </button>
    <div class="acc-body">…</div>
  </div>
</div>
```
Toggle `.open` on `.acc-item` via JS; chevron rotates, body reveals.

## Avatar — `.av`
```html
<div class="av circle sm">AH</div>      <!-- initials -->
<div class="av rounded md"><img src="…"/></div>
<div class="av square xl">J</div>

<!-- Sizes: xs(24) sm(32) md(40) lg(48) xl(64) xxl(88) -->
<!-- Shapes: .circle / .rounded / .square -->

<!-- Group stack -->
<div class="av-group">
  <div class="av circle sm">AH</div>
  <div class="av circle sm">MN</div>
  <div class="av circle sm">JR</div>
  <div class="av circle sm" style="background:var(--fg1); color:var(--bg);">+4</div>
</div>
```
Initials are auto-styled Geist 600 — don't override the font.

## Do / Don't
✅ Use `.sc` for every KPI — never roll your own big number
✅ Alternate one filled stat card in a 4-up for rhythm
✅ Tables in `.tbl-wrap` so the border radius clips properly

❌ Stat values in a light-weight or non-Geist font
❌ More than 7 columns in a table at standard width — paginate or transpose
❌ Card within card within card — two levels of nesting max
