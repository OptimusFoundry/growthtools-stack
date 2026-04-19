# Typography

Three families, used with discipline:

| Family      | Token             | Use                                               |
|-------------|-------------------|---------------------------------------------------|
| Fraunces    | `--font-display`  | Hero, page titles, card titles, big numerals, italic accents |
| Fraunces    | `--font-serif`    | Editorial body (`.ds-prose`), long-form prose, post bodies |
| Geist       | `--font-sans`     | UI body, buttons, inputs, labels                 |
| Geist Mono  | `--font-mono`     | Eyebrows, metadata, counts, filenames, data      |

## Variable-font settings (Fraunces)

Fraunces has `opsz` (9–144) and `SOFT` (0–100). Use the right combo per role:

| Role              | `font-variation-settings`                       | Mood                  |
|-------------------|--------------------------------------------------|-----------------------|
| Display (hero)    | `"opsz" 144, "SOFT" 30, "wght" 500`              | Big, slightly warm    |
| Italic moment     | `"opsz" 144, "SOFT" 70, "wght" 400` + `font-style:italic` | The signature flourish |
| Section header    | `"opsz" 100, "SOFT" 20, "wght" 500`              | Tight, confident      |
| Editorial body    | `"opsz" 60, "SOFT" 40, "wght" 400`               | Warm prose            |
| Tabular numeral   | `"opsz" 144, "SOFT" 0, "wght" 400` + `font-feature-settings: "tnum" 1, "ss01" 1` | Crisp data |
| Tight small       | `"opsz" 144, "SOFT" 0, "wght" 600`               | Sharp micro-titles    |

Pre-named CSS variables cover the common cases:
```
--fvs-display:   "opsz" 144, "SOFT" 30, "wght" 500
--fvs-editorial: "opsz" 60,  "SOFT" 40, "wght" 400
--fvs-tight:     "opsz" 144, "SOFT" 0,  "wght" 600
```

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
--fs-6xl   88px   editorial display
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
<h1 class="ds-display">Post once, everywhere.</h1>       <!-- 88px Fraunces -->
<h1 class="ds-hero">A quieter kind of growth.</h1>       <!-- 64px Fraunces -->
<h1 class="ds-h1">Heading one · 48px</h1>
<h2 class="ds-h2">Heading two · 36px</h2>
<h3 class="ds-h3">Heading three · 22px (Geist, sans)</h3>
<h4 class="ds-h4">Heading four · 18px (Geist, sans)</h4>

<p class="ds-prose">Long-form editorial body in Fraunces — 18px, opsz 60, SOFT 40.</p>
<p class="ds-p">Workhorse UI body in Geist — 15px.</p>
<small class="ds-caption">SMALL · 12PX · WIDE TRACKING</small>

<span class="ds-eyebrow">EYEBROW LABEL · MONO · 12PX · UPPERCASE · WIDEST</span>
<div class="ds-numeric">48,291</div>              <!-- 64px Fraunces tnum -->
<code class="ds-code">const posts = await fetch()</code>
```

Note: `.ds-h3` and `.ds-h4` are **Geist (sans)**, not Fraunces. Fraunces only climbs down to `h2`/22px for *card titles* (see next).

## The "italic moment"

The signature device. One phrase per hero, wrapped in `<em>` with SOFT 70:

```html
<h1 class="page-title">
  An <em>editorial</em> catalog of every component in the kit.
</h1>
```

`.page-title em` is pre-styled to italic + SOFT 70 + `color: var(--accent)`. If writing raw, do:
```html
<em style="font-style:italic; font-variation-settings:'opsz' 144,'SOFT' 70,'wght' 400; color:var(--accent);">moment</em>
```

**Budget: 1 italic moment per hero. 0–1 per section head. Never in body.**

## Do / Don't

✅ Pair Fraunces display with Geist body
✅ Use mono for ALL eyebrows (`.ds-eyebrow`)
✅ Oversized Fraunces numerals for stats (`.ds-numeric` or `.sc-val`)
✅ One italic `<em>` moment per hero
✅ `text-wrap: balance` on headings, `text-wrap: pretty` on body

❌ Inter, Arial, Roboto, Helvetica, system fonts
❌ Fraunces for UI buttons or inputs
❌ Italic on multiple phrases in the same heading
❌ More than 3 font sizes in a single card
❌ `color: #fff` / `#000` on text — always `var(--fg1..4)`

## Color hierarchy for text
```
--fg1   near-ink       primary headings, strong body
--fg2   32% L           default body
--fg3   50% L           muted / meta
--fg4   66% L           subtle / disabled-feel
```
