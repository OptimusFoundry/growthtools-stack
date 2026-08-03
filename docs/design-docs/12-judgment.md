# Judgment — the decisions the tokens don't make

The other docs answer *what exists*. This one answers *what to do*. These are the rules that separate a page that "uses Growth Tools tokens" from a page that actually *looks* Growth Tools.

Every rule here has a number. When reviewing, cite the number ("violates J-3.2") to be precise. These are prescriptions, not suggestions — break them only with a written reason.

---

## J-1. Vertical rhythm — the exact gaps between specific pairs

There are only five vertical gaps in a page. Memorize them. Never improvise a sixth.

| # | Gap | Px | Token | Where it appears |
|---|---|---|---|---|
| **J-1.1** | **Micro** | 4 | `--space-1` | eyebrow ↔ title, icon ↔ label inside a button, kbd hint ↔ input text |
| **J-1.2** | **Paired** | 12 | `--space-3` | title ↔ sublede; label ↔ input; stat value ↔ trend row |
| **J-1.3** | **Grouped** | 24 | `--space-5` | sublede ↔ actions row; card-hd ↔ card-body; section-head ↔ section-body |
| **J-1.4** | **Sectional** | 56 | `--space-10` | page-header ↔ first section; between sibling sections on the same page |
| **J-1.5** | **Page** | 80 | `--space-12` | top of `.page`; bottom of `.page`; between a page and a trailing wide hero |

**Exact page-header stack (committed — do not deviate):**

```
.ds-eyebrow                    <- anchor
  margin-bottom: 4px            (J-1.1)
.page-title                    <- Geist, 700
  margin-bottom: 12px           (J-1.2)
.page-sub                      <- Geist body, max 62ch
  margin-bottom: 24px           (J-1.3)
.page-actions (btn row)
  margin-bottom: 56px           (J-1.4 — bottom of header)
```

If the page has **no sublede**, the eyebrow→title→actions stack collapses to `4px / 24px / 56px` — the "paired" gap is never used to compensate for a missing element.

**Horizontal gaps follow their own ladder:**
- 8px between an icon and its text label inside any pill, chip, or button
- 12px between sibling inputs in the same row
- 16px between sibling cards in a 3-up grid (only when dividers are absent — see J-4)
- 20px between sibling cards in a 2-up grid
- 32px between the two columns of a 2-col page (editor + preview, content + aside)

---

## J-2. Color roles — which `--fg` goes where

The four text tones are not interchangeable. Pick by **role**, not by preference.

| Role | Token | Used on | Never used on |
|---|---|---|---|
| **J-2.1** Display / strong ink | `--fg1` | page-title, card-title ≥ 22px, stat value, active nav item, modal title | body prose, meta, timestamps |
| **J-2.2** Default body | `--fg2` | all body text 14–18px, input values, table cell content, card body paragraphs | headings, eyebrows |
| **J-2.3** Muted / meta | `--fg3` | eyebrow labels, `.page-sub` *optional* (see below), timestamps, counts, "of / in / by" connectives, helper hints, section-head kickers | primary headings, CTA button labels |
| **J-2.4** Subtle / de-emphasized | `--fg4` | disabled-feel placeholders, ghost icon buttons at rest, "Updated 5m ago" when next to other meta, empty-state illustration strokes | anything a user needs to read to act |

**Hard rules:**

- **J-2.5** Headings ≥ 22px always `--fg1`. Headings < 22px (i.e. `.ds-h3`, `.ds-h4`) use `--fg2`, never `--fg1`. The size is doing the hierarchy work; the color would double it.
- **J-2.6** `.page-sub` is `--fg2` by default. Only drop to `--fg3` when the sublede is purely decorative (e.g. date stamps under a title). Never `--fg4`.
- **J-2.7** A single paragraph has at most **two** colors — the body color and one inline `<em>` or `<strong>`. Never three.
- **J-2.8** Meta rows (timestamp · channel · author) separate items with a `·` in `--fg4`, content in `--fg3`. The dot is dimmer than the content around it, always.
- **J-2.9** `--fg1` on a `--bg-surface` card: fine. `--fg1` on a `--base-100` tinted bg: fine. `--fg1` on `--primary`: **no** — use `--primary-fg`. Raw fg tokens are only for neutral surfaces.

**Accent budget:**

- **J-2.10** `--accent` (amber) appears **at most twice per page**: one accent-colored word or phrase in the page-title, plus optionally one tier badge or one stat-card flourish. Never three. Never on a CTA button (use `.btn.primary`).
- **J-2.11** `--primary` appears on: the single primary CTA, focus rings, active tabs, selected rows, link text. It is **structural**. Accent is a **highlight**, not structural. Don't swap them.

---

## J-3. Type sizing — which size goes where, and what can share a page

The size scale is generous. The discipline is in **not using all of it**.

**J-3.1 — The page has one title and only one.** `.ds-display` (88px) and `.ds-hero` (64px) are reserved for marketing / sign-in. Product pages top out at `.ds-h1` / `.page-title` (36–48px).

**J-3.2 — A single page uses at most 4 type sizes.** Count them: page title, section head, card title, body. That's four. An eyebrow is a treatment, not a size. A button label is body. A caption is body size in mono. If you find yourself reaching for a fifth, you're over-designing.

**J-3.3 — Stat values are always 56–64px Geist 700, `tnum` on, `ss01` on.** There is no "small stat." A KPI that only deserves 22px is not a KPI; it's a meta line. Demote it.

**J-3.4 — Card titles are 22px Geist 600, `--fg1`.** Not 18, not 28. The card is a container; 22px is the line at which the display weight stops feeling like a hero and starts being furniture.

**J-3.5 — Eyebrows are 11px (sm) or 12px (default), mono, uppercase, tracking `--ls-widest` (0.18em).** No other tracking. No mixed case. If the eyebrow wraps, rewrite it — eyebrows never wrap.

**J-3.6 — Body is 15px (`--fs-base`) for UI and 18px (`--fs-lg`) for long-form prose (`.ds-prose`).** Don't split the difference with 16px — that's the SaaS default we're deliberately off of.

**J-3.7 — Line-height: headings 1.05 (`--lh-tight`), subledes 1.3, body 1.5, prose 1.7.** A 15px body at 1.7 feels over-airy; a 18px prose at 1.5 feels cramped. These are paired.

---

## J-4. Dividers — when to show lines, when to rely on space

Dividers are a hierarchy tool. Every line on the page is a claim about structure. If the claim isn't true, the line is noise.

**J-4.1 — Use a divider when:**
- Items in a vertical list share identical layout and you want the user to scan, not read. (post-list rows, file-list rows, table rows)
- A card has a `card-hd` and a `card-ft` — the 1px top border on the footer sells the "footer" role. No divider between head and body.
- Two sibling sections share the same bg and no gap between them (rare — usually a section gap beats a divider).

**J-4.2 — Never use a divider when:**
- Two elements are already separated by `--space-10` (56px) or more. The space is the divider.
- Between a page-title and its sublede. Ever.
- Inside a card, between header and body — the 24px gap handles it.
- Between a label and its input. The 12px gap handles it.
- Around a single-column form. A column of labeled inputs is self-partitioning; lines between rows make it feel like a table.
- Inside a quiet prose block. Use paragraph spacing (1.7 line-height) instead.

**J-4.3 — The 1px-gap grid technique (quick-grid, stat-grid, cal-grid) counts as a divider system.** When you use it:
- The outer container gets `border-radius: 20px; overflow: hidden; background: var(--border)`.
- Children get `border: 0; border-radius: 0; background: var(--bg-surface)`.
- **Do not** add additional borders inside. The 1px gap IS the line.
- All children must share identical internal padding, or the grid looks broken.

**J-4.4 — Section-head → section-body never gets a bottom border on the section-head.** The `--space-5` (24px) gap does the work. A line there doubles the hierarchy and flattens the rhythm.

**J-4.5 — Color of dividers is always `--border`.** Never `--fg4`, never `--base-200`. There is one divider color on the page.

**J-4.6 — Divider weight is always 1px.** Even on retina. The hairline is the point.

---

## J-5. Density — cards, rows, and breathable vs. compact

The kit supports two densities. Pick one per surface and don't mix.

**J-5.1 — Breathable (the default).**
- Card padding: `24px` (`--space-5`)
- Card title → card body gap: `24px`
- Row padding (post-list, nav): `20px 24px`
- Input height: `40px` (default `.inp`)
- Button height: `38–40px` (default `.btn`)
- Use for: dashboards, marketing, editor surfaces, anything meant to be read slowly.

**J-5.2 — Compact (for data-dense surfaces).**
- Card padding: `16px` (`--space-4`)
- Row padding: `12px 16px`
- Input height: `32px` (`.inp.sm`)
- Button height: `32px` (`.btn.sm`)
- Use for: tables, sidebars, command palettes, settings lists, calendar cells.

**J-5.3 — Never mix.** A compact table inside a breathable card is fine. A breathable button in a compact toolbar is not — the button will look oversized and the user reads it as the primary action when it isn't.

**J-5.4 — Dense does not mean cramped.** Compact still honors the micro gaps (4 / 8 / 12). If a row feels tight at compact density, the row has too much content — cut a column, don't cut the padding.

**J-5.5 — Cards never nest more than two levels.** A card inside a section is one level. A stat card inside a card's body is two. Three levels means one of them isn't actually a card; it's a subsection and should lose its border.

---

## J-6. The one-of rules

Scarcity is the moat. These are the things you get exactly one of per surface.

**J-6.2 — One `--accent` use per page** (see J-2.10).

**J-6.3 — One `.btn.primary` per visible region.** Not per page — per region (header, modal, card footer, toolbar). Competing primaries = no primary.

**J-6.4 — One `.btn.xl` per page, total.** Reserved for sign-in, empty-state, or a single hero CTA. An xl button in a section head is a bug.

**J-6.5 — One `.sc.filled` per 4-up stat grid.** Creates rhythm. Two filled stat cards read as a toggle, not a rhythm.

**J-6.6 — One eyebrow per section.** Not two. If you need two labels, the second is a tag or badge, not an eyebrow.

**J-6.7 — One hero image / illustration per page.** The kit is editorial — the rest of the visual weight is type and space.

---

## J-7. Alignment — the invisible grid

**J-7.1 — Left-align everything by default.** Center alignment is reserved for: empty states, modal titles, sign-in cards, hero marketing. Never center body prose. Never center a section-head.

**J-7.2 — Section-head is a two-up row:** title on the left, action (tabs / "View all →" / filters) on the right, vertically centered on the title's baseline.
```html
<div class="section-head" style="display:flex; align-items:baseline; justify-content:space-between">
  <h2 class="ds-h2">Recent posts</h2>
  <a class="btn ghost sm">View all →</a>
</div>
```
Align on `baseline`, not `center`. The "View all" sits on the title's baseline; this is part of the house look.

**J-7.3 — Page-header actions are right-aligned on wide, left-aligned on narrow (≤ 640px).** At no width do they center. Center-aligned page actions look like a landing page, not a product.

**J-7.4 — Numeric columns right-align, text columns left-align.** Mixed-alignment in a table is mandatory when there are numbers. `tnum` on every number.

**J-7.5 — Avatars, icons, and dots in a row align on the vertical center of the text they sit next to — not the baseline.** Text aligns on baseline; symbols align on center.

---

## J-8. Background layers — when surfaces stack

The kit has three surface tones. Use them additively — never more than two stacked.

- `--bg` — page background (warm near-white)
- `--bg-surface` — card, sidebar, topbar, modal body
- `--base-100` — input filled state, row hover, skeleton, tabs-pill track

**J-8.1 — Cards live on `--bg`, not on another card.** If you need grouped cards, use the 1px-gap grid (J-4.3). Two nested `--bg-surface` layers with a border between them looks like a bug.

**J-8.2 — Modals are `--bg-elevated` on top of `oklch(0% 0 0 / 0.5)` scrim.** No backdrop-blur by default — kept out for performance and because the warm paper tone reads better crisp.

**J-8.3 — Input filled (`.inp.filled`) is `--base-100`.** On hover, bump to `--base-200`. On focus, drop back to `--bg-surface` and show the focus ring. This is the one exception to "don't mix surface tones."

**J-8.4 — Never use `--base-200` or darker as a surface.** Those are dividers and hover states, not backgrounds.

---

## J-9. Motion — what moves and what doesn't

**J-9.1 — Hovers are always 150ms.** Focus rings appear instantly (0ms — they must feel like a direct response to keyboard). Accordions and tabs are 240ms. Nothing is slower than 400ms except the scrubber in a video player.

**J-9.2 — Only three things transform on hover:** buttons (scale 0.98 on press, not hover), interactive cards (`translateY(-2px)` + shadow bump), and ghost icon buttons (bg color only). Everything else stays put.

**J-9.3 — Never animate page-title entry.** The editorial title is a commitment; fading it in looks uncertain. Body text and cards may fade+rise by 8px on initial mount.

**J-9.4 — Spring easings (`--ease-bounce`) are reserved for:** toast entry, success checkmark, single-use delight moments. Not for nav, not for tabs, not for hovers.

**J-9.5 — Every transition respects `prefers-reduced-motion: reduce`.** Non-negotiable.

---

## J-10. Borders & radius — when things round and when they don't

**J-10.1 — The radius ladder is monotonic per element type.** A button is always `r-md` or `r-full`, never `r-lg`. An input is always `r-md` (10px in kit.css) or `r-full` (pill search). A card is always `r-lg` or `r-xl`. Don't cross categories.

**J-10.2 — When radii meet, the outer one is larger.** A card is `r-lg` (20px); an input inside is `r-md` (10px); a button inside that input row is `r-md`. The inner corner looks tighter on purpose.

**J-10.3 — Pill CTAs (`r-full`) are the house style for hero/top CTAs, topbar search, and tier badges. Rect buttons (`r-md`) are for toolbars, card footers, modal footers, and anywhere the button is inline with other rect elements.** Don't mix pill and rect buttons in the same button group.

**J-10.4 — Borders are always 1px `--border`, except:**
- Focus: 2px `--fg1` + 3px `--focus-ring` shadow
- `brutal` theme: 2–3px bold black
- Error state: 1px `--error`
- Nothing else gets a thicker border. If you need emphasis, use shadow-md and keep the 1px border.

**J-10.5 — Cards prefer `border` over `shadow` at rest; `shadow` over `border` on lift.** An outlined card (default) has 1px border, no shadow. On `.interactive:hover`, the border fades to transparent and `shadow-lg` takes over with `translateY(-2px)`. Don't show both at once at rest.

---

## J-11. Content & copy — the voice that matches the look

Type choices enforce voice. The voice is direct and pragmatic, never bubbly.

**J-11.1 — Page-title is a sentence, not a label.** Not "Dashboard." — instead, "Good morning, Alex. Your queue looks healthy." The specific detail is the punchline; the rest is the setup.

**J-11.2 — Sublede is 1–2 sentences, max 62ch wide.** It explains the page's state in specific numbers ("14 posts scheduled across 4 channels"), not its purpose ("Manage your posts here").

**J-11.3 — Eyebrows anchor context:** `DASHBOARD · NOV 2025`, `LIBRARY · 07 ENTRIES`, `COMPOSER · THREAD OF 5`. Not `DASHBOARD` alone — always paired with a specific data point.

**J-11.4 — Buttons are single-verb-first:** `Create post`, `Publish now`, `Save changes`. Never `Submit`, `Proceed`, `Continue` (too vague), never `Click here`.

**J-11.5 — Timestamps are relative, then absolute below:** "Queued · Tomorrow at 09:00" not "April 24, 2026 at 9:00 AM UTC."

**J-11.6 — Numbers use digits, not words, once they're ≥ 2.** "2 drafts", "5 scheduled", "twelve" only in headline copy.

**J-11.7 — Numerals in headlines may spell out:** "eight things to ship" is fine in a title. "8 things to ship" is fine in a sublede. Pick per line, not per document.

**J-11.8 — No exclamation marks.** Anywhere. Not in toasts, not in empty states, not in errors.

**J-11.9 — No emoji. No unicode arrows in text (→ is fine as a typographic character in a button label, never as an icon).**

---

## J-12. Imagery — when the kit does pictures at all

The product favors type and space over imagery; imagery is scarce. When it appears, these rules hold.

**J-12.1 — Media is contained, never full-bleed in product pages.** Full-bleed is for marketing/sign-in only.

**J-12.2 — Placeholder gradient for missing images:** `linear-gradient(135deg, oklch(22% 0.04 <hue>deg), oklch(38% 0.12 <hue>deg))`. Rotate the hue (265, 280, 55, 140, 20) across a set to create variety without art. This is the house placeholder — never gray boxes, never checkerboards.

**J-12.3 — Avatars are initials in Geist 600 by default.** Only use real photos when provided. A set of mixed-initial avatars in Geist looks more coherent than a mix of photos and defaults.

**J-12.4 — Platform brand colors are exempt from the color rules.** `#E1306C` for IG, `#0A66C2` for LI, `#000` for X are allowed on platform chips only. Nowhere else on the page can use raw hex.

**J-12.5 — Icons are lucide-style, `currentColor`, `stroke-width: 2`, `stroke-linecap: round`.** 14px inline with text, 16–18px in buttons, 20–24px as section glyphs, 48px in empty states. No other sizes.

---

## J-13. Anti-patterns (copy these into a reviewer's eye)

- **AP-2** A section head with a bottom border. The space does that.
- **AP-3** A `.btn.primary` and a `.btn.accent` side by side. Accent isn't a button slot — it's a highlight color.
- **AP-4** Stat values in a light-weight or non-tabular font. Stat values are Geist 700 with `tnum`, always.
- **AP-5** Eyebrow below the title ("DASHBOARD · NOV 2025" under `<h1>`). Eyebrow is always above, 4px gap.
- **AP-6** Centered body prose. Left-align.
- **AP-7** Nested cards: card inside card inside card. Collapse one level to a section.
- **AP-8** A gradient on a button or card. Gradients only appear in marketing heroes and in themed decorative surfaces (cosmos, cyberpunk).
- **AP-9** Six type sizes on one page. You get four.
- **AP-10** `color: #fff` or `color: #000` anywhere. Use tokens.
- **AP-12** `--fg1` on a sentence of body text. `--fg1` is for headings and hero numerals; body is `--fg2`.
- **AP-13** Two primaries, even if one is smaller. If you need two buttons, the second is `.secondary` or `.ghost`.
- **AP-14** An eyebrow that wraps. Rewrite the eyebrow.
- **AP-15** A card with a shadow *and* a border at rest. Pick one per state.

---

## J-14. The 60-second review

Before shipping any page, run this in order. Each step takes ~5 seconds.

1. **Squint.** Does one thing dominate? If two things compete, one is the page-title; the other is wrong.
2. **Scroll to top.** Is there an eyebrow? Is it above the title? 4px gap? Mono tracking?
3. **Count type sizes.** ≤ 4.
4. **Count primaries.** ≤ 1 per visible region.
5. **Check the stack.** Are section gaps 56px or 80px — never 40, never 48?
6. **Scan for dividers.** Each one doing a real job? Kill the decorative ones.
7. **Check the numbers.** Stats in Geist 700, `tnum` on, ≥ 56px?
8. **Read the copy aloud.** Any exclamation marks? Any "submit" or "click here"? Any emoji?
9. **Tab through.** Focus rings visible on every interactive element?

If all nine pass, ship it. If any fails, fix before showing.
