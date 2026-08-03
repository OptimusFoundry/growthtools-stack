# Typography

Two families, used with discipline:

| Family           | Token             | Use                                               |
|------------------|-------------------|---------------------------------------------------|
| Geist (600–700)  | `--font-display`  | Hero, page titles, card titles, big numerals      |
| Geist (400)      | `--font-sans`     | UI body, buttons, inputs, labels, prose, long-form text |
| Geist Mono       | `--font-mono`     | Eyebrows, metadata, counts, filenames, data       |

There is no serif fallback and no separate "prose" font — long-form body copy is the same Geist Sans as UI body, just set at a slightly larger size/line-height for comfortable reading (see `.ds-prose` below).

## Weight scale

Geist doesn't carry variable-font axes (no `opsz`, no `SOFT`) — weight and size are the only display levers. Use plain `font-weight`:

| Role              | `font-weight` | Mood                  |
|-------------------|---------------|-----------------------|
| Display (hero)    | 700           | Big, confident        |
| Section header    | 600–700       | Tight, confident      |
| Card / page title | 600           | Clear hierarchy       |
| Body / prose      | 400           | Workhorse reading     |
| Tabular numeral    | 600 + `font-feature-settings: "tnum" 1, "ss01" 1` | Crisp data |
| Tight small        | 600           | Sharp micro-titles    |

## Size scale

```
--fs-xs    12px   eyebrows, meta
--fs-sm    13px   secondary labels
--fs-base  15px   body (UI default — bumped from 14)
--fs-md    16px   emphasized body
--fs-lg    18px   lede / subheads
--fs-xl    22px   card titles
--fs-2xl   28px   section headers
--fs-3xl   36px   page titles
--fs-4xl   48px   large headings
--fs-5xl   64px   hero / stat value
--fs-6xl   88px   large display
--fs-7xl   128px  cover / cinematic
```

## Letter-spacing

Negative for display, positive for mono.

```
--ls-tightest  -0.055em   cinematic hero
--ls-tighter   -0.04em    hero / large display
--ls-tight     -0.025em   section headers
--ls-normal    -0.005em   body
--ls-wide       0.02em    small caps, mono data
--ls-wider      0.08em    eyebrow-ish
--ls-widest     0.18em    eyebrows, tier badges
```

## Line-height
```
--lh-tight    1.05
--lh-snug     1.2
--lh-normal   1.5   ← body default
--lh-relaxed  1.7
```

## Ready-made classes (attach to `data-ds` root OR use standalone)

```html
<h1 class="ds-display">Post once, everywhere.</h1>       <!-- 88px Geist 700 -->
<h1 class="ds-hero">A quieter kind of growth.</h1>       <!-- 64px Geist 700 -->
<h1 class="ds-h1">Heading one · 48px</h1>
<h2 class="ds-h2">Heading two · 36px</h2>
<h3 class="ds-h3">Heading three · 22px (Geist 600)</h3>
<h4 class="ds-h4">Heading four · 18px (Geist 600)</h4>

<p class="ds-prose">Long-form body in Geist — 18px, comfortable line-height for reading.</p>
<p class="ds-p">Workhorse UI body in Geist — 15px.</p>
<small class="ds-caption">SMALL · 12PX · WIDE TRACKING</small>

<span class="ds-eyebrow">EYEBROW LABEL · MONO · 12PX · UPPERCASE · WIDEST</span>
<div class="ds-numeric">48,291</div>              <!-- 64px Geist 700, tnum -->
<code class="ds-code">const posts = await fetch()</code>
```

All headings, prose, and body copy share the same Geist Sans family — only weight and size shift between roles. `.ds-h3`/`.ds-h4` sit at 600, everything display-scale sits at 700.

## Do / Don't

✅ Pair a heavier Geist weight (600–700) for display/headings with regular Geist (400) for body
✅ Use mono for ALL eyebrows (`.ds-eyebrow`)
✅ Oversized Geist numerals for stats (`.ds-numeric` or `.sc-val`)
✅ `text-wrap: balance` on headings, `text-wrap: pretty` on body

❌ Inter, Arial, Roboto, Helvetica, system fonts
❌ Light-weight (300 or under) Geist for headings — display roles need 600+
❌ More than 3 font sizes in a single card
❌ `color: #fff` / `#000` on text — always `var(--fg1..4)`

## Color hierarchy for text
```
--fg1   near-ink       primary headings, strong body
--fg2   32% L           default body
--fg3   50% L           muted / meta
--fg4   66% L           subtle / disabled-feel
```
