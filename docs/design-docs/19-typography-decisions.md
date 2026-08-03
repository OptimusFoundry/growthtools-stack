# Typography decisions — which font, which size, which color, which weight

The existing `01-typography.md` lists the scale. This doc tells you *which one to reach for in a specific situation*. Decision-level prescriptions for devs who don't want to eyeball it.

Rules `T-N.M`. Anti-patterns `TAP-N`.

---

## T-1. The two-family rule

The kit has two families. Each owns specific roles. Mixing roles is the most common typography bug.

| Family | Variable | Owns |
|---|---|---|
| **Geist** (sans, 600–700 weight) | `--font-display`, `--font-sans` | Display, titles ≥22px, stat numerals, avatar initials |
| **Geist** (sans, 400 weight) | `--font-sans` | UI: buttons, inputs, labels, body 14–18px, table cells, nav items, long-form prose |
| **Geist Mono** | `--font-mono` | Eyebrows, counts, timestamps, code, filenames, keyboard hints, tabular data |

There is no serif in the kit — display and body are the same Geist Sans family; only weight and size separate the roles.

**T-1.1 — The default page font is Geist at 400.** Heavier Geist (600–700) and Mono are deliberate overrides. If you don't explicitly choose, you're in Geist 400.

**T-1.2 — Each character on the page is one of these two families.** If you're reaching for a third (Inter, Arial, system-ui, a serif), stop.

**T-1.3 — One weight per role, not per mood.** Don't bold a button label for emphasis — bold is wrong on buttons. Change the variant instead.

---

## T-2. The decision flowchart

Ask these questions in order. Stop at the first yes.

```
Is it a number that represents a KPI / stat / big metric?
 → Geist 700, 56–64px, tnum on                (T-5)

Is it a page-title or hero heading?
 → Geist 700, 36–64px, fg1                    (T-3)

Is it a card title, section head, modal title?
 → Geist 600–700, h2 (36px) or h3 (22px)      (T-3)

Is it long-form prose (long-form reading)?
 → Geist 400, 18px, comfortable line-height   (T-6)

Is it an eyebrow / timestamp / count / code / filename / kbd hint?
 → Geist Mono, 11–12px, uppercase (if eyebrow) (T-7)

Everything else (body, buttons, inputs, labels, nav, table cells)
 → Geist 400, 13–15px, fg2                     (T-8)
```

**T-2.1 — If you can't answer the first question definitively, the thing might not belong on the page.** Stat values in the kit are rare and loud; if yours is neither, it's probably a meta line, not a stat.

---

## T-3. Geist display & titles

Use a heavier Geist weight (600–700) for any heading ≥ 22px. Never for body.

| Role | Size | Weight | Color | Letter-spacing | Line-height |
|---|---|---|---|---|---|
| **T-3.1** Cinematic cover | 128px | 700 | `--fg1` | `--ls-tightest` (-0.055em) | 0.95 |
| **T-3.2** Large display | 88px | 700 | `--fg1` | `--ls-tighter` (-0.04em) | 1.0 |
| **T-3.3** Hero (sign-in, marketing) | 64px | 700 | `--fg1` | `--ls-tighter` | 1.05 |
| **T-3.4** Page title (product) | 36–48px | 700 | `--fg1` | `--ls-tight` (-0.025em) | 1.1 |
| **T-3.5** Section head (`.ds-h2`) | 28–36px | 600 | `--fg1` | `--ls-tight` | 1.15 |
| **T-3.6** Card title (`.ds-h3`) | 22px | 600 | `--fg1` | `-0.015em` | 1.2 |

**T-3.7 — Product pages top out at 48px** (`.ds-h1` / `.page-title`). 64px+ is for marketing / sign-in only (C-1.5).

**T-3.8 — The `text-wrap: balance` property is on every title by default.** Never override.

**T-3.9 — Titles never wrap to more than 2 lines.** If yours does, shorten it. Three-line titles read as paragraphs.

---

## T-5. Stat numerals — the signature

The single loudest typographic move in the kit.

**T-5.1 — Always Geist at 700.** Never a lighter weight. Never Mono.

**T-5.2 — Size is 56px minimum, 64px default, 88px on hero stat:**

```css
.sc-val {
  font-family: var(--font-display);
  font-size: 56px;
  font-weight: 700;
  font-feature-settings: "tnum" 1, "ss01" 1;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--fg1);
}
```

**T-5.3 — `tnum` and `ss01` on, always.** Tabular numbers align across a 4-up stat grid. `ss01` is Geist's alt '1' that disambiguates from lowercase l.

**T-5.4 — Units are regular-weight Geist, `--fg3`, inline:**

```html
<div class="sc-val">4.8<small>%</small></div>
<div class="sc-val">$18<small>/mo</small></div>
```

```css
.sc-val small {
  font-family: var(--font-sans);
  font-size: 0.35em;           /* ~20px at 56 */
  font-weight: 500;
  color: var(--fg3);
  margin-left: 4px;
}
```

The weight-and-color contrast (700 `--fg1` value against 500 `--fg3` unit) is the signature — same family, different jobs.

**T-5.5 — Shorthand for large numbers** (`24.1k`, `1.2M`) — the `k` and `M` are part of the numeral, still Geist 700.

**T-5.6 — Stats smaller than 56px aren't stats — they're meta.** Demote them (T-7).

---

## T-6. Long-form prose (Geist, regular weight)

For long-form reading: blog posts, documentation body, AI-generated content, upgrade prompts. Same family as everything else — just larger and looser than UI body.

```css
.ds-prose {
  font-family: var(--font-sans);
  font-size: 18px;
  font-weight: 400;
  line-height: 1.7;
  color: var(--fg2);
  max-width: 72ch;
}
```

**T-6.1 — 18px is the prose default.** 16px prose is UI body territory, not long-form. 20px prose is for wider landing-page essays.

**T-6.2 — Line-height 1.7.** At 18px, that's 30.6px rhythm. Tighter reads as UI, not prose.

**T-6.3 — Weight stays 400.** Prose never goes semibold — that's what `<strong>` is for.

**T-6.4 — Max-width 72ch.** 62ch for subledes. Never wider.

**T-6.5 — Prose color is `--fg2`, not `--fg1`.** `--fg1` in prose reads as loud; `--fg2` reads as comfortable.

**T-6.6 — Inline `<strong>` in prose:** `color: --fg1; font-weight: 600`. One or two per paragraph, max.

**T-6.7 — Inline `<em>` in prose:** plain italic (`font-style: italic`), same color, same weight. Geist has no dedicated italic axis — it's a style toggle, not a mood shift.

**T-6.8 — Paragraph spacing is one blank line** (`margin-bottom: 1em` at prose line-height ≈ 30px). Not indented. Never both.

---

## T-7. Mono — eyebrows, meta, data

Mono is a *role*, not just a font choice. Use when the content is structural context, not content itself.

### T-7.1 Eyebrows

```css
.ds-eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--fg3);
}
```

**T-7.1.1 — Always uppercase.** Mixed case in an eyebrow is a bug.
**T-7.1.2 — Letter-spacing is 0.18em, always.** No "a little less" or "a little more."
**T-7.1.3 — Color is `--fg3`.** Never `--fg2` (too loud), never `--fg4` (too dim).
**T-7.1.4 — Above the title it introduces, 4px gap.** Never below.
**T-7.1.5 — Eyebrow content carries a data point:** `DASHBOARD · NOV 2025`, `LIBRARY · 07 ENTRIES`, `COMPOSER · THREAD OF 5`. Standalone words ("DASHBOARD") feel incomplete (J-11.3).

### T-7.2 Tier / persona badges

Small uppercase pills in mono:

```css
.tier {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: var(--r-full);
}
```

### T-7.3 Counts & ticker values

```html
<span class="count">12</span>
<span className="pe-ticker"><span className="num">05</span> / 25</span>
```

Mono, 10–12px, `--fg3` or `--fg4`. Zero-padded (`05`, not `5`).

### T-7.4 Timestamps & meta rows

```html
<div class="post-meta">
  Updated 2h ago · Queued for tomorrow
</div>
```

Mono, 11–12px, `--fg3`. The `·` separator is `--fg4` (dimmer than the content around it, J-2.8).

### T-7.5 Code & filenames

```css
code, .ds-code {
  font-family: var(--font-mono);
  font-size: 0.92em;            /* slightly smaller than body */
  padding: 2px 6px;
  background: var(--base-50);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--fg1);
}
```

Block code uses the `.code-block` recipe in `15-states.md` S-6.3.

### T-7.6 Keyboard hints

```html
<kbd>⌘K</kbd>
```

```css
kbd {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 6px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--fg3);
  background: var(--bg-surface);
}
```

### T-7.7 When NOT to use mono

- Button labels → Geist (T-8.2)
- Input field values → Geist (T-8.4)
- Body paragraphs → Geist, regular weight (T-6)
- Headings → Geist, 600–700 (T-3)
- Numbers in running text ("14 drafts") → Geist tnum, not Mono

Mono is structural. If the content reads as content, it's not mono.

---

## T-8. Geist — the workhorse

Everything the other three don't own.

### T-8.1 Body text

```css
body, .ds-p {
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: -0.005em;
  color: var(--fg2);
}
```

**T-8.1.1 — 15px is the kit default** (J-3.6). Not 16px (too SaaS-generic), not 14px (too cramped).
**T-8.1.2 — `--fg2`, never `--fg1`** (J-2.6). `--fg1` body reads as shouting.
**T-8.1.3 — Line-height 1.5 for 15px body.** 1.7 reads as prose (wrong family), 1.3 reads as dense UI (use for lists, not paragraphs).
**T-8.1.4 — Letter-spacing -0.005em.** Geist at this size reads slightly loose by default; a hair tighter feels intentional.

### T-8.2 Buttons

```css
.btn {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.005em;
  line-height: 1;
}
.btn.lg { font-size: 15px; }
.btn.xl { font-size: 16px; font-weight: 500; }
.btn.sm { font-size: 13px; }
```

**T-8.2.1 — Button labels are 500 weight, never 400, never 600.** 500 is the single confident UI weight.
**T-8.2.2 — Never a heavy display weight in buttons.** Never Mono in buttons (TAP-2).
**T-8.2.3 — Sentence case** ("Save changes"), not Title Case ("Save Changes").

### T-8.3 Labels

```css
.lbl {
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  color: var(--fg2);
  letter-spacing: -0.005em;
  margin-bottom: 8px;
}
```

**T-8.3.1 — Labels are 13px, not 14px.** A hair smaller than body — they're metadata about the input.
**T-8.3.2 — `--fg2` for the label,** `--error` only when the field is in error.

### T-8.4 Inputs

```css
.inp input, .ta, .sel select {
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 400;
  color: var(--fg1);
  letter-spacing: -0.005em;
}
.inp input::placeholder {
  color: var(--fg4);
  font-weight: 400;
}
```

**T-8.4.1 — Input values are `--fg1`** (the exception to "body is fg2"). Users need to *read what they typed*.
**T-8.4.2 — Placeholders are `--fg4`.** Not `--fg3` (too prominent, reads as a value).
**T-8.4.3 — Same size as body (15px).** Consistency with reading flow.

### T-8.5 Tables

```css
.tbl td {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 400;
  color: var(--fg2);
}
.tbl th {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--fg3);
  font-weight: 500;
}
.tbl td.num {
  font-variant-numeric: tabular-nums;
  text-align: right;
}
```

**T-8.5.1 — Headers are mono eyebrows** (T-7.1). Cells are Geist body.
**T-8.5.2 — Numeric columns get `tabular-nums` and right-align** (J-7.4).

### T-8.6 Navigation

```css
.nav-item {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  color: var(--fg2);
}
.nav-item.active { color: var(--fg1); }
```

500 weight — nav items are "labels," same as buttons.

---

## T-9. Size × color × weight decision table

The full decision grid for the common roles:

| Role | Family | Size | Weight | Color | Casing |
|---|---|---|---|---|---|
| Cover / cinematic | Geist | 128 | 700 | fg1 | Sentence |
| Large display | Geist | 88 | 700 | fg1 | Sentence |
| Hero heading | Geist | 64 | 700 | fg1 | Sentence |
| Page title | Geist | 36–48 | 700 | fg1 | Sentence |
| Section head h2 | Geist | 28–36 | 600 | fg1 | Sentence |
| Card title h3 | Geist | 22 | 600 | fg1 | Sentence |
| Modal title | Geist | 22 | 600 | fg1 | Sentence |
| Sublede / lede | Geist | 18–22 | 400 | fg2 | Sentence |
| Prose body | Geist | 18 | 400 | fg2 | Sentence |
| Stat value | Geist | 56–64 | 700 | fg1 | — |
| Avatar initials | Geist | varies | 600 | fg1 | Uppercase |
| UI body | Geist | 15 | 400 | fg2 | Sentence |
| Button label | Geist | 14 (sm 13, lg 15, xl 16) | 500 | — | Sentence |
| Input value | Geist | 15 | 400 | fg1 | — |
| Input placeholder | Geist | 15 | 400 | fg4 | — |
| Label | Geist | 13 | 500 | fg2 | Sentence |
| Hint (helper) | Geist | 12 | 400 | fg3 | Sentence |
| Hint (error) | Geist | 12 | 500 | error | Sentence |
| Table cell | Geist | 14 | 400 | fg2 | — |
| Nav item | Geist | 14 | 500 | fg2 / fg1 active | Sentence |
| Caption | Geist | 12 | 400 | fg3 | Sentence |
| Eyebrow | Geist Mono | 11 | 500 | fg3 | UPPER |
| Tier / persona | Geist Mono | 10 | 600 | (badge bg contrasts) | UPPER |
| Count / ticker | Geist Mono | 10–12 | 500 | fg3 / fg4 | — |
| Timestamp / meta | Geist Mono | 11–12 | 400 | fg3 | Sentence |
| Keyboard hint | Geist Mono | 10 | 400 | fg3 | — |
| Inline code | Geist Mono | ~14 (0.92em) | 400 | fg1 | — |
| Table header | Geist Mono | 11 | 500 | fg3 | UPPER |

---

## T-10. The one-size-smaller rule

When in doubt, go one size smaller.

**T-10.1 — The kit errs on the small side.** 15px body, 14px buttons, 13px labels, 11px eyebrows. A page that feels "a bit small" is correct. A page that feels "comfortable" is usually too big.

**T-10.2 — Mobile adds 1–2px, not 4.** Body becomes 16px on mobile (browsers expect this for tap targets). Buttons stay 14px. Eyebrows stay 11px.

**T-10.3 — Never bump a size up "for emphasis."** Emphasis comes from weight (400→500→700), or color (fg2→fg1) — not size.

---

## T-11. Weight ladder

The kit uses 4 weights, no more.

| Weight | Used on |
|---|---|
| **400** regular | Body, prose, input values, table cells |
| **500** medium | Buttons, labels, nav items, eyebrows, table headers |
| **600** semibold | Card titles (T-3.6), section heads, modal titles, inline `<strong>`, tier badges, avatar initials |
| **700** bold | Page titles, hero/display headings, stat values. The kit's loudest weight. |

**T-11.1 — Pick the weight for the role, not the moment.** Display roles are always 700; card/section roles are always 600; everything else is 400 or 500. Don't reach for a weight outside a role's assigned tier "for emphasis."

**T-11.2 — Never italicize a weight other than 400.** Italic is a light-touch inline signal, not an emphasis stack.

**T-11.3 — Bold (700) is not a button style.** A "louder" button is `.primary`, not `.btn { font-weight: 700 }` — 700 is reserved for display/stat roles.

---

## T-12. Color × size interactions

The kit's `--fg*` tokens behave differently at different sizes. Memorize these:

| Color × Size | Looks like | Use for |
|---|---|---|
| `--fg1` ≥ 22px | strong ink | titles, card headers |
| `--fg1` at 15px | heavy, "shouting" | avoid in body; OK in input values |
| `--fg2` at 15–18px | readable body | default body color |
| `--fg2` at 11–12px | dim meta | avoid; use fg3 instead |
| `--fg3` at 11–12px | quiet meta | eyebrows, timestamps, captions |
| `--fg3` at 15–18px | washed out | avoid in body |
| `--fg4` at 11–12px | barely-there | separators, placeholders |
| `--fg4` at 15px+ | hard to read | avoid |

**T-12.1 — The rule:** small text gets dimmer colors, large text gets stronger colors. Inverting this ruins hierarchy.

**T-12.2 — Error color (`--error`) is used at 12–14px only** (in hints). Never on body, never on headings. Errors are small signals, not loud claims.

**T-12.3 — Accent color (`--accent`) on text is reserved for the one headline highlight per page** (J-2.10). Not for links, not for bold emphasis, not for prices.

**T-12.4 — Primary color on text means "link."** If it's not a link, it shouldn't be primary-colored.

---

## T-13. Line-height cheat sheet

| Content | Line-height |
|---|---|
| Titles ≥ 36px | 1.05 |
| Titles 22–28px | 1.15–1.2 |
| Subledes (18–22px) | 1.3 |
| UI body (13–15px) | 1.5 |
| Prose (18px) | 1.7 |
| Buttons | 1.0 (use padding for height) |
| Inputs | 1.0 |
| Eyebrows / captions | 1.4 |
| Stat values | 1.0 |

**T-13.1 — Line-height on headings shrinks with size.** 36px title at 1.5 leaks into 54px rows — ridiculous. 36px at 1.05 = 38px, right.

**T-13.2 — Line-height on body grows with size.** 15px at 1.5 vs 18px at 1.7 is the difference between UI density and prose comfort.

---

## T-14. Three worked examples

### T-14.1 A post card

```html
<article class="card outlined">
  <span class="ds-eyebrow">INSTAGRAM · 2H AGO</span>  <!-- Mono 11 fg3 UPPER -->
  <h3 class="ds-h3">                                  <!-- Geist 22 600 fg1 -->
    Five quiet habits that compound into a feed worth reading
  </h3>
  <p class="post-body">                               <!-- Geist 15 400 fg2 -->
    A short paragraph in Geist body, maxing out at 62ch for comfortable
    scanning in a list of similar cards.
  </p>
  <div class="post-meta">                             <!-- Mono 11 fg3 -->
    1.2k views · 48 likes · 3 shares
  </div>
</article>
```

Three type treatments, one family. Mono eyebrow, Geist 600 title, Geist 400 body/meta. The rhythm is the kit.

### T-14.2 A stat card

```html
<div class="sc">
  <div class="sc-hd">
    <span class="sc-lbl">ENGAGEMENT RATE</span>       <!-- Mono 11 fg3 UPPER -->
  </div>
  <div class="sc-val">                                <!-- Geist 56 700 fg1 tnum -->
    4.8<small>%</small>                               <!-- Geist 20 500 fg3 -->
  </div>
  <div class="sc-row">
    <span class="sc-tr up">↑ 0.4pt</span>             <!-- Geist 13 500 success -->
    <span class="sc-ft">vs prior mo</span>            <!-- Geist 12 400 fg3 -->
  </div>
</div>
```

Note the mixed-weight contrast inside `.sc-val`: Geist 700 digit, Geist 500 unit — same family, different jobs.

### T-14.3 A page header

```html
<header class="page-header">
  <span class="ds-eyebrow">LIBRARY · 07 ENTRIES</span>   <!-- Mono 11 fg3 UPPER -->
  <h1 class="page-title">                                <!-- Geist 48 700 fg1 -->
    Everything you've written, in one room.
  </h1>
  <p class="page-sub">                                   <!-- Geist 18 400 fg2 -->
    Drafts, scheduled, and published — sorted the way your week actually works.
  </p>
  <div class="page-actions">
    <button class="btn primary lg">New post</button>     <!-- Geist 15 500 -->
  </div>
</header>
```

One family, three weights across one header: Mono eyebrow (500), Geist 700 title, Geist 400 sublede, Geist 500 button. The cadence — not the font count — is what makes a Growth Tools page *feel* like one.

---

## T-15. Typography anti-patterns

- **TAP-1** A heavy display weight (600–700) on a button or input label. (TAP-2 for Mono.)
- **TAP-2** Mono on a button label. Never.
- **TAP-3** Body text in `--fg1`. Body is `--fg2` (J-2.6).
- **TAP-5** Stat value not in Geist 700 (AP-4).
- **TAP-6** Eyebrow in mixed case or sentence case. Always UPPERCASE.
- **TAP-7** Eyebrow tracking < 0.18em or > 0.18em. Exactly 0.18em.
- **TAP-8** Eyebrow below a title. Always above, 4px gap.
- **TAP-10** A light weight (400) on a page title or stat value. Those roles are always 700 (T-11).
- **TAP-11** Title Case in button labels. Sentence case only.
- **TAP-12** Body at 16px. 15px default (J-3.6).
- **TAP-13** Label at 14px. 13px (T-8.3).
- **TAP-14** Eyebrow at 10px or 14px. 11px default.
- **TAP-15** Weight jump 400 → 600 without a role-appropriate reason (custom hand-tuned bolding instead of the fixed role ladder).
- **TAP-16** `--fg4` on readable content. fg4 is placeholder / separator only.
- **TAP-17** Letter-spacing tweaks on body for "breathing room." Use line-height or size.
- **TAP-18** Placeholder text used as label (AAP-3).
- **TAP-19** Long number without `tnum` in a column. All digits must align.
- **TAP-20** Five or more type sizes on one page (J-3.2, AP-9).

---

## T-16. The one-minute typography review

Scan the page in this order:

1. **How many families do you see?** Should be 2 (Geist, Geist Mono). If you see 3, find the intruder.
2. **How many type sizes?** Count them. ≤ 4 on a product page.
3. **The big number on the page** — is it Geist 700?
4. **The eyebrow above the title** — is it above (not below), mono, uppercase, `--fg3`?
5. **Pick any paragraph. Check its color.** fg2, not fg1.
6. **Pick any button. Check its font.** Geist, 500, sentence case.
7. **Pick any label. Check its size.** 13px.
8. **Pick any number in a row/column.** Tabular nums on?
9. **Read the page aloud.** Does the rhythm feel direct and pragmatic — or textbook SaaS?

If all 9 pass, ship it.
