# Spacing decisions — which token goes where, and why

`03-layout-spacing.md` lists the scale. This doc tells you *which value to reach for in a specific situation*. Decision-level prescriptions for devs who don't want to eyeball spacing.

Rules `SP-N.M`. Anti-patterns `SPAP-N`.

---

## SP-1. The scale you actually use

The spacing scale has 13 steps. **You use 6 of them every day.** The rest are niche.

| Token | Px | How often | Mental model |
|---|---|---|---|
| `--space-1` | 4 | Rare | "Touching, not fused" — inline icon flourish |
| `--space-2` | 8 | Common | "Icon is part of the thing" — icon↔label, chip padding |
| `--space-3` | 12 | Common | "Sibling, same thought" — tight vertical list |
| `--space-4` | 16 | Everyday | **The default.** Gap between elements, card inner padding floor |
| `--space-5` | 24 | Everyday | "Gap within a section" — card inner gap, form field gap |
| `--space-6` | 32 | Everyday | "Sections inside a card" — card header↔body |
| `--space-7` | 40 | Sometimes | "Tight page gutter" or "dense section break" |
| `--space-8` | 48 | Everyday | **Page gutter.** Aliased as `--space-page` |
| `--space-10` | 64 | Everyday | "Major section break" — page title↔first section, card↔card on hero |
| `--space-12` | 80 | Common | "Page-level rhythm" — catalog sections, composed sections |
| `--space-16` | 112 | Rare | "Hero breathing" — only on marketing / sign-in |
| `--space-20` | 144 | Rare | Editorial hero |
| `--space-24` | 192 | Never in product | Cover pages only |

**SP-1.1 — If your value isn't on this ladder, it's wrong.** No 18px, no 20px, no 36px, no 72px. The ladder exists so pages from different devs compose.

**SP-1.2 — Prefer one rung over two.** 16 → 24 is one rung (common). 16 → 40 is skipping rungs and usually means your hierarchy is wrong, not that you need a rare value.

**SP-1.3 — Never divide the scale.** `calc(var(--space-4) / 2)` = 8px = `--space-2`. Use the token.

---

## SP-2. The decision flowchart

Stop at the first yes.

```
Are the two things the SAME thing visually fused? (icon + label, prefix + input)
  → 8px   --space-2

Are they sibling rows in a tight list (nav items, settings rows)?
  → 12px  --space-3

Are they siblings in a normal list or stacked form fields?
  → 16–24px --space-4 / --space-5

Are they two RELATED sections inside one card?
  → 24–32px --space-5 / --space-6

Are they card ↔ card inside a section?
  → 16–24px --space-4 / --space-5   (grids default to 16)

Are they section ↔ section on a page?
  → 56–64px --space-10  (canonical page rhythm)

Are they page edge ↔ content?
  → 48–56px (sides) / 56px (top) / 80px (bottom)  — see SP-5

Is this a marketing hero / sign-in / cover page?
  → 80–144px  --space-12 / --space-16 / --space-20
```

**SP-2.1 — Product pages stop at 64px between sections.** 80px+ between sections is for marketing pages, catalog/docs shells, and editorial layouts — not a dashboard.

---

## SP-3. Rhythm pairs — the patterns you'll use 80% of the time

These are the spacing *signatures*. Memorize the pair, and you'll never eyeball again.

### SP-3.1 Icon + label → **8**
```css
gap: var(--space-2);  /* icon↔text inside a button, chip, menu item */
```

### SP-3.2 Label + input → **8**
```css
.lbl { margin-bottom: 8px; }  /* T-8.3 */
```

### SP-3.3 Input + hint → **6** (half-step, use margin)
```css
.hint { margin-top: 6px; }
```
The only sub-scale spacing in the kit. 4 is too tight; 8 reads like another field.

### SP-3.4 Eyebrow + title → **4**
```css
.ds-eyebrow + h1, .ds-eyebrow + h2 { margin-top: 4px; }  /* T-7.1.4 */
```
Eyebrow is *part of* the title block. 4px says "these belong together."

### SP-3.5 Title + sublede → **12–16**
Sublede is *about* the title. 16 is default; 12 if sublede is one line.

### SP-3.6 Page header + first section → **40–56**
```css
.page > header + * { margin-top: 56px; }
```
The breathing room after the hero. Too tight and it looks cramped; too loose and the page looks empty.

### SP-3.7 Section ↔ section → **56–64**
Default: 56 (`.page { gap: 56px }`). 64 when sections are large (hero cards, full-bleed strips).

### SP-3.8 Card inner padding → **20 / 24 / 28**
- **20** dense cards (stats, small tiles)
- **24** default cards
- **28** hero cards, sign-in cards, feature cards

Never 16 (cramped). Never 32 (floaty — use 28).

### SP-3.9 Card header ↔ body → **16 or 20**
If card padding is 20: header-body gap = 16.
If card padding is 24–28: header-body gap = 20.

### SP-3.10 Card body ↔ footer → **20 or 24**
Same logic as 3.9 but one step larger. Footer wants a visible break.

### SP-3.11 Button group (inline) → **8 or 12**
- 8 when buttons are secondary peers (Cancel / Save, icon-only row).
- 12 when one is primary and the other secondary — the extra air respects the hierarchy.

### SP-3.12 Form field stack → **20**
```css
.form-stack { display: grid; gap: 20px; }
```
Not 16 (labels touch the field above), not 24 (feels sparse).

### SP-3.13 Section title ↔ section body → **20–24**
`h2` followed by its content. Same as card header/body.

### SP-3.14 List row ↔ row (tight, e.g., settings) → **12**
### SP-3.15 List row ↔ row (normal, e.g., card list) → **16**
### SP-3.16 List row ↔ row (loose, e.g., content feed) → **24**

---

## SP-4. Padding inside surfaces

### SP-4.1 Cards — two-number rule

A card has two spacings: **outer padding** and **inner gap.** Always the same pair:

| Card type | Padding | Inner gap |
|---|---|---|
| Dense card (stat, small tile) | 20 | 12–16 |
| Default card | 24 | 16–20 |
| Hero / feature card | 28 | 20–24 |
| Sign-in card | 32–40 | 24 |

**SP-4.1.1 — The ratio is roughly 1.2–1.5× (padding : gap).** 24 padding / 16 gap = 1.5×. 28 / 20 = 1.4×. Stays in a tight band.

**SP-4.1.2 — When in doubt, pick 24 / 16.** The default card is the right default.

### SP-4.2 Buttons

Padding is baked into button sizes — don't customize it.

| Size | Padding | Height |
|---|---|---|
| `.sm` | `6px 12px` | 28 |
| default | `8px 14px` | 36 |
| `.lg` | `10px 18px` | 42 |
| `.xl` | `14px 28px` | 52 |

**SP-4.2.1 — Icon-only buttons are square.** 36×36 default, 28×28 sm, 42×42 lg.

**SP-4.2.2 — Never hand-tune button padding** to make two buttons "line up." Use the same size class.

### SP-4.3 Inputs

| Size | Padding | Height |
|---|---|---|
| `.sm` | `6px 10px` | 32 |
| default | `9px 12px` | 40 |
| `.lg` | `12px 14px` | 48 |

**SP-4.3.1 — Input height 40, button height 36.** This is intentional: inputs want internal room for the caret; buttons don't. Don't "match" them — they're not supposed to match.

**SP-4.3.2 — Aligning an input and button in a row** → wrap the button in the form, it'll sit ~2px lower-center. That's correct. Don't force same-height.

### SP-4.4 Modals

- Padding: **32px** (all sides) default. **40px** for hero modals.
- Title ↔ body: 12.
- Body ↔ action row: 24.
- Action row buttons: 8 gap.

### SP-4.5 Popovers / menus

- Padding: **8px** outer, **8px 12px** per item.
- Item gap: 2px (vertical, visual only).
- Section dividers: 8px top & bottom around a 1px line.

### SP-4.6 Toasts

- Padding: **12px 16px**.
- Icon ↔ text gap: **12**.
- Dismiss ↔ content: **16**.

### SP-4.7 Chips / badges

- Padding: **2px 8px** (sm), **4px 10px** (default).
- Inline icon gap: **4**.

---

## SP-5. Page-level spacing — the canonical numbers

The kit's app shell has *fixed* page spacing. Memorize:

```
Sidebar width              248–260
Topbar height              72
Page padding-top           56
Page padding-sides         56
Page padding-bottom        80
Page gap (section rhythm)  56
Page max-width             1320
Page-header margin-bottom  56–64
```

**SP-5.1 — Top 56 / bottom 80 is asymmetric on purpose.** Pages read from top; the bottom needs more air to feel "landed," not "cut off."

**SP-5.2 — Never center-shrink a page.** If the layout feels empty, content belongs in it or the card widths are wrong. Don't `max-width: 900px` a dashboard.

**SP-5.3 — The sidebar doesn't touch content.** 1px border-right + 56px page padding = the visible gutter.

**SP-5.4 — Modal / overlay spacing does not follow page rules.** Modals are their own world (SP-4.4).

**SP-5.5 — Catalog / docs pages use 80 / 64 / 120** (taller top, wider bottom, 80px per-section padding with a 1px top border). Different because they're reference material, not workflows.

---

## SP-6. Grid & gap rules

The kit's grids use one of four gap values. Pick by the grid's role:

| Grid role | Gap |
|---|---|
| Divider-line grid (quick-grid, stat-grid, cal-grid) | **1px** + `background: --border` |
| Dense tile grid (cards) | **16** |
| Spaced card grid | **24** |
| Editorial / hero grid | **32** |
| Spec grid (docs showcase) | **24** |

**SP-6.1 — The 1px divider-line trick is the kit's signature** (J-8). Use `overflow: hidden` + outer `--r-xl` + `gap: 1px` + `background: var(--border)`. Don't `border: 1px solid` on children — it doubles up.

**SP-6.2 — Grid children have no outer margin.** Gap handles it. A card with `margin: 16px` inside a grid with `gap: 16` = 32px runs. Pick one.

**SP-6.3 — Column gap and row gap are the same** on product grids. Editorial layouts can differ (32 col / 40 row), but the default is symmetric.

**SP-6.4 — Responsive grids: don't shrink the gap below 12.** 12px between cards on mobile is the floor; 8px makes cards blur together.

---

## SP-7. Stack gap ladder (vertical rhythm inside a single column)

The ladder by hierarchy depth. **Gap shrinks as you nest.**

| Depth | Example | Gap |
|---|---|---|
| 1 — between sections | `.page > *` | **56** |
| 2 — between cards in a section | `.section > .card` | **24** |
| 3 — inside a card, groups | form groups, panels | **20** |
| 4 — inside a group, rows | list rows | **12–16** |
| 5 — inside a row, elements | icon + label | **8** |
| 6 — inline micro | `<em>` padding | **4** |

**SP-7.1 — A single nested block should not reverse the trend.** If depth-3 is 20, depth-4 cannot be 24. Inner rhythm is always equal-or-tighter than outer.

**SP-7.2 — If you find yourself needing 20 inside 16, the outer gap is wrong,** not the inner.

---

## SP-8. When to use margin vs. gap vs. padding

- **Gap** — between siblings you own (flex/grid parent is yours). *Always the default.*
- **Margin** — when you *can't* use gap: single child (e.g. `margin-top` on the next section from an eyebrow inside a header), or when the parent isn't yours.
- **Padding** — inside a surface (card, button, input).

**SP-8.1 — Collapsing margins are a bug magnet.** If you use `margin-bottom` on stacked children, adjacent `margin-top` collapses. Flex + gap doesn't collapse. Prefer gap.

**SP-8.2 — Never `margin-top` the first child of a container.** Use the container's padding-top.

**SP-8.3 — Never `margin-bottom` the last child.** Use the container's padding-bottom.

**SP-8.4 — `margin: auto` is for layout (centering a constrained container), not for spacing.**

---

## SP-9. Radius — which to use when

Radius is a *spacing cousin* — it controls visual weight. Rule: **larger surfaces → larger radii**, but cap at `--r-xl` (20) for product UI.

| Surface | Radius |
|---|---|
| Keycap, inline pill divider | `--r-xs` (2) |
| Inline code, tiny badge | `--r-sm` (4) |
| Small button, chip, tab inner, small input | `--r-md` (8) |
| Input default, tab enclosed, small card | `--r-lg` (12) |
| **Card default, stat grid, quick-grid** | **`--r-xl` (20)** |
| Hero card, sign-in card | `--r-2xl` (28) |
| Full-bleed surface, marketing hero | `--r-3xl` (40) |
| Pill button, avatar, topbar search | `--r-full` (9999) |

**SP-9.1 — The signature radius is 20** (`--r-xl`). Cards, divider-line grids, and most surfaces. If you're unsure, 20.

**SP-9.2 — Pill vs rect buttons.** `kit.css` ships `.btn` as pill (`--r-full`); `catalog.css` uses rect (10–14). Prefer pill for CTAs; rect for dense utility rows. Don't mix on one page.

**SP-9.3 — Never smaller-than-outer children.** A 20-radius card with a 28-radius image inside looks broken. Inner radii go *down*, never up.

**SP-9.4 — Nested radius formula.** `inner = outer − padding`. 20 card with 16 padding → 4 inner. In practice, go to next token: 2 or 4. This is why the scale has 2 and 4.

**SP-9.5 — `porcelain` theme collapses radii to ~0.** Never hardcode `border-radius: 20px` — always `var(--r-xl)`.

---

## SP-10. Visual weight — when spacing substitutes for a divider

Spacing hierarchy > divider lines. The kit prefers breathing room over rules.

**SP-10.1 — If two sections are separated by ≥ 40px of vertical space, they don't need a divider.** The space *is* the divider.

**SP-10.2 — If they're < 32px apart, a 1px line may help** — but prefer fixing the spacing first.

**SP-10.3 — Never double up: divider + large gap.** Choose one. The kit's 1px-gap grids use no other separators for a reason.

**SP-10.4 — Dividers inside cards:** 1px line + 16px padding on each side. Never just the line.

---

## SP-11. Touch targets (minimum clickable size)

Spacing and hit-target are coupled.

**SP-11.1 — Desktop minimum hit target: 32×32.** Smaller than this is "visual only."

**SP-11.2 — Mobile minimum: 44×44** (WCAG AA 2.5.5). Use padding or invisible hit-box.

**SP-11.3 — Stacked tap targets need 8px gap minimum** so thumbs don't mis-hit.

**SP-11.4 — Icon-only buttons at `.sm` (28×28) fail mobile AA.** Bump to default (36×36) on mobile, or wrap in a 44×44 hit box.

---

## SP-12. Content width — the horizontal dimension of spacing

| Content | Max width |
|---|---|
| Body prose (Fraunces serif) | **72ch** (~ 780) |
| Sublede / lede | **62ch** |
| UI body paragraph inside a card | **60–68ch** |
| Form input row | **420–480** |
| Dashboard page | **1320** |
| Catalog / docs | **1240** |
| Modal default | **480** |
| Modal large | **640** |
| Modal hero / confirm | **520** |
| Toast | **360** |
| Popover | **240–320** |

**SP-12.1 — Pages narrower than 1240 feel "landing-page-y" on a 1440 screen.** 1320 is the sweet spot.

**SP-12.2 — Don't max-width a card.** Let the grid column size it. Cards inherit width; they don't opine on it.

**SP-12.3 — 72ch prose is ~72 characters per line**, which Knuth calls readable. Wider = eye-saccade fatigue. Don't go wider for "using the space."

---

## SP-13. Density modes — the dense/comfy/spacious toggle

If your app has a density preference (Growth Tools' does, via Tweaks), it's a *multiplier on three values*, not a full re-scale:

| Value | Dense | Default | Spacious |
|---|---|---|---|
| Card padding | 16 | 24 | 28 |
| Card inner gap | 12 | 16 | 20 |
| List row padding | 8 | 12 | 16 |
| Page section gap | 48 | 56 | 72 |

**SP-13.1 — Only these four values change.** Don't touch button, input, icon, or type-related spacing.

**SP-13.2 — Default is default.** Most users won't touch density; build for it. Don't optimize for "comfy" or "dense" at default's expense.

---

## SP-14. Three worked examples

### SP-14.1 A form

```
Card (padding 24)
├── h3 "Account settings"       [card header]
│   (margin-bottom 20)           [SP-3.9]
├── Form stack (gap 20)          [SP-3.12]
│    ├── .field
│    │    ├── label              (margin-bottom 8)   [SP-3.2]
│    │    ├── input              (padding 9 12)      [SP-4.3]
│    │    └── hint               (margin-top 6)      [SP-3.3]
│    ├── .field …
│    └── .field …
│   (margin-top 24)               [SP-3.10]
└── Action row (gap 12)           [SP-3.11]
     ├── btn secondary
     └── btn primary
```

Five spacing decisions. Every one has a rule number.

### SP-14.2 A dashboard section

```
Page (padding 56 56 80, gap 56)
├── Page header                   [SP-3.6 → next is 56]
│    ├── eyebrow   (mb 4)         [SP-3.4]
│    ├── h1        (mb 12)        [SP-3.5]
│    └── sublede
├── Stat grid (gap 1px, bg border, radius 20)  [SP-6.1]
│    └── 4× stat cards (padding 20, inner gap 12)   [SP-4.1]
├── "Recent activity" section
│    ├── h2         (mb 20)       [SP-3.13]
│    └── Card grid (gap 16)        [SP-6]
│         └── cards (padding 24, inner 16)          [SP-4.1]
└── "Insights" section  …
```

The rhythm: 56 between sections, 20 title→body, 16 between cards.

### SP-14.3 A sign-in card

```
Page (centered, padding 80)
└── Card (padding 40, radius 28)   [SP-4.1 sign-in row]
     ├── logo         (mb 32)
     ├── h1 64px      (mb 16)      [SP-3.5]
     ├── sublede      (mb 40)      [SP-3.6 hero bump]
     ├── Form (gap 20)              [SP-3.12]
     │    ├── field
     │    └── field
     ├── btn xl      (mt 24)        [SP-3.10]
     └── Footer row  (mt 24, fg3)
```

40 padding + 28 radius is the "hero card" signature (SP-3.8, SP-9).

---

## SP-15. Spacing anti-patterns

- **SPAP-1** Off-scale pixel values (18, 20, 36, 72). Use tokens.
- **SPAP-2** Skipping rungs for no reason (16 → 40 instead of 16 → 24 → 32).
- **SPAP-3** `margin-top` on the first child of a container. Use container padding.
- **SPAP-4** `margin-bottom` on the last child. Same.
- **SPAP-5** Inner radius ≥ outer radius (SP-9.3).
- **SPAP-6** Card padding below 16. Minimum is 20 for a card to feel like a surface.
- **SPAP-7** Card padding 32. Bumps to 28 (hero) or stays 24 (default). 32 is a tell.
- **SPAP-8** Divider-line *and* a >40px gap between the same two elements (SP-10.3).
- **SPAP-9** Form field gap 16 (feels like labels touch). Use 20 (SP-3.12).
- **SPAP-10** Product page sections > 64px apart. That's catalog/marketing rhythm (SP-2.1).
- **SPAP-11** Hand-tuned button padding to match an input height (SP-4.2.2).
- **SPAP-12** Content wider than 72ch in prose (SP-12.3).
- **SPAP-13** Dashboard max-width < 1240 on a wide screen (SP-12.1).
- **SPAP-14** Gap < 12 on mobile grids (SP-6.4).
- **SPAP-15** Hit target < 32 desktop / 44 mobile (SP-11).
- **SPAP-16** `calc(var(--space-4) / 2)`. Use `--space-2`.
- **SPAP-17** Stacked `margin-bottom` on siblings (collapsing-margin hazard). Use gap.
- **SPAP-18** Margin *and* gap on the same relationship (doubles up).
- **SPAP-19** Mixing pill and rect buttons on one page (SP-9.2).
- **SPAP-20** Centering-shrinking a dashboard page to feel "designed" (SP-5.2).

---

## SP-16. The one-minute spacing review

Scan the page in this order:

1. **Count sibling gaps in one column.** Should be 1–3 distinct values, max.
2. **Pick a card. Measure padding ÷ inner-gap.** Ratio should be 1.2–1.5× (SP-4.1.1).
3. **Are any two elements 18, 20, 36, or 72px apart?** Off-scale; snap to tokens.
4. **Eyebrow → title gap.** Should be 4 (SP-3.4).
5. **Input → hint gap.** Should be 6 (SP-3.3). Not 8, not 4.
6. **Section → section gap.** 56 on product pages (SP-3.7).
7. **Card radius — outer 20, inner ≤ outer.** SP-9.
8. **Hit targets on interactive elements.** 32+ desktop, 44+ mobile.
9. **Page max-width.** 1320 for product, 1240 for docs. No narrower on wide screens.
10. **Is there a divider AND > 40px of space between two sections?** Delete the divider.

If all 10 pass, ship it.
