# Composition — the macro-rhythm of a page

The judgment doc governs decisions inside a component. Recipes govern the shape of a component. This doc governs *how components relate to each other* across a whole page.

Every rule here is labeled `C-N.M`.

---

## C-1. The five page archetypes

Every Growth Tools page is one of five shapes. Learn them; don't invent a sixth.

| # | Archetype | Example route | Shape |
|---|---|---|---|
| **C-1.1** | **Dashboard** | `/` | PageHeader → Stats (4-up) → Quick-grid → Recent list |
| **C-1.2** | **Library** | `/posts`, `/media`, `/blog` | PageHeader → Filter bar → Grid or list of items |
| **C-1.3** | **Editor** | `/posts/new`, `/posts/:id` | PageHeader → 2-column (editor ↔ preview) |
| **C-1.4** | **Settings** | `/account`, `/billing` | PageHeader → Stacked sections, each with sub-head + card |
| **C-1.5** | **Hero / Marketing** | `/signin`, `/pricing`, empty states at scale | Centered stack, full-height, no sidebar |

**Rule:** if a new page doesn't fit one of these, the page is probably two pages. Split it.

---

## C-2. Vertical rhythm across the whole page

The page has **three octaves** of vertical space. Mixing octaves is the most common error in product pages.

| Octave | Gap | Token | Between |
|---|---|---|---|
| **C-2.1** Page | 80px | `--space-12` | `.page` top; `.page` bottom; hero marketing between title and illustration |
| **C-2.2** Section | 56px | `--space-10` | sibling sections; page-header to first section |
| **C-2.3** Element | 24px | `--space-5` | card-head to card-body; section-head to its content |

Anything in between (40, 48, 64, 72) is a bug. The judgment doc defines the full 5-step ladder (4/12/24/56/80); of those, only **56 and 80** live at the page-composition level.

**C-2.4 — The first section after the page-header is 56px away.** Not 80. 80 would make the header feel like its own screen.

**C-2.5 — The last section before the `.page` bottom boundary is ≥ 80px from the viewport floor.** If the page is short, let the page fill the viewport — don't shrink the bottom padding to "balance."

---

## C-3. Horizontal composition

### C-3.1 Max-width by archetype

| Archetype | Max width | Why |
|---|---|---|
| Dashboard | 1320px | Room for 4-up stat grid at comfortable column width |
| Library | 1320px | Same — supports 3-up card grids |
| Editor | 1400px | Needs the extra width for 2-col (editor 640 + gap 32 + preview 640) |
| Settings | 720px | Reading width; settings are prose-like |
| Hero | none | Full-bleed |

**C-3.2 — Never center a dashboard or library page.** They left-align under the sidebar at `1320px` max, then overflow at the right. Centered dashboards feel like a landing page.

**C-3.3 — Settings centers at 720px.** One thing at a time; a narrow column; easy to scan. Scroll-friendly.

### C-3.4 The two-column editor pattern

The only `2fr 1fr` split the kit knows:

```
┌─────────────────────┬──────────────┐
│ Editor (64%)        │ Preview (36%)│
│ stacked fields      │ sticky       │
│                     │ scroll w/    │
│                     │ page         │
└─────────────────────┴──────────────┘
```

- Gap: 32px (never 24, never 48)
- Preview column is `position: sticky; top: 88px` (below topbar + gap)
- Preview never scrolls independently — it scrolls with the page, just pinned

If you need a preview that *does* scroll independently, you're building a different archetype. Don't shoehorn.

---

## C-4. Rhythm across sections — the alternation rule

A page of identical sections is monotonous. A page with no repetition is chaotic. The kit lands in between with **alternation**.

**C-4.1 — Alternate container modes across sections:**

```
Section 1: bare (no card, content directly on --bg)
Section 2: card outlined
Section 3: 1px-gap grid (stats, quick-grid)
Section 4: bare
Section 5: card outlined
```

Never two carded sections in a row with identical padding — they read as one fat card.

**C-4.2 — Alternate content types:**

A dashboard is text → numbers → tiles → list. An editor is form → form → form → preview. Each switch gives the eye a reset.

**C-4.3 — If the page has only one section,** it's usually a settings form or a chat. Both archetypes tolerate mono-sectional layouts because their content *is* the rhythm (stacked fields, alternating message roles).

**C-4.4 — A "filled" card is a section break.** When you drop a `.card.filled` or an upgrade prompt, the section above and below it inherit its gap — treat it as a section, not as decoration.

---

## C-5. Headings across a page

Heading hierarchy must nest cleanly. A dev lint rule's worth of rules:

**C-5.1 — One `<h1>` per page.** Always the page-title. No exceptions.

**C-5.2 — `<h2>` is the section-head.** 2–5 per page typical.

**C-5.3 — `<h3>` is the card title.** 22px Geist 600. 0–many per page.

**C-5.4 — `<h4>` and deeper are rare.** Used inside complex cards (accordion heads, modal titles). `<h5>`/`<h6>` effectively don't exist in this kit.

**C-5.5 — Never skip a level for style.** Don't use `<h3>` where `<h2>` belongs because "it looks too big." Change the class (`ds-h3`), keep the semantic level right.

**C-5.6 — The first `<h2>` on the page comes ≥ 56px after the `<h1>`.** If it comes sooner, the page-header isn't done doing its work.

---

## C-6. The rule of thirds for grids

Multi-column grids feel right at three widths:

| Grid | `minmax()` | Use for |
|---|---|---|
| **C-6.1 Wide** | `minmax(320px, 1fr)` | post cards, blog entries, plan picker |
| **C-6.2 Medium** | `minmax(240px, 1fr)` | media thumbnails, form field pairs, tile grid |
| **C-6.3 Narrow** | `minmax(180px, 1fr)` | tag clouds, platform icons, square media |

Use `repeat(auto-fill, ...)` not `auto-fit` by default — `auto-fit` stretches cards to fill row-end space and makes the last row look orphaned.

**C-6.4 — Grid gap follows cell width:**
- Wide grids: 20–24px gap
- Medium grids: 16px gap
- Narrow grids: 12px gap

**C-6.5 — A 4-up grid with a natural 5th item should be 5-up or drop the 5th, never 4 + 1 orphan.** Same with 3-up and 2-up.

---

## C-7. The sidebar relationship

The sidebar is 248px and fixed. The content area is the rest. This creates an implicit rule:

**C-7.1 — The sidebar's vertical rhythm is independent from the page.** Sidebar eyebrows → nav items: 8px. Between nav groups: 20px. The sidebar has its own compact density (J-5.2); the page has its own breathable one (J-5.1).

**C-7.2 — The sidebar has no dividers between items.** Eyebrow labels group them. Hairlines in a sidebar feel like a file manager, not a product nav.

**C-7.3 — The topbar is a continuation of the sidebar, not the page.** It inherits compact density. No eyebrow inside the topbar. The topbar belongs to the shell, not to the current route.

**C-7.4 — Never put page-level info in the topbar.** (Wrong: "Posts · 14 drafts" in the topbar title.) The page-header says that. The topbar says the product name or the route name, at most.

---

## C-8. Scroll & viewport rules

**C-8.1 — The page scrolls.** The sidebar scrolls independently (rarely needed — it should fit 100vh). The topbar is sticky.

**C-8.2 — Sticky elements stack with explicit z-index:**
```
z-index: 30  topbar
z-index: 20  page-level sticky (filter bar, editor preview column)
z-index: 10  section-level sticky (rarely used)
```

**C-8.3 — Avoid more than one sticky element inside a single scroll container.** If the page has a sticky topbar *and* a sticky filter bar, the filter bar offsets by the topbar's height (`top: 72px`). If the editor also has a sticky preview column, that column offsets further (`top: 88px`).

**C-8.4 — Empty states fill available height.** If a page has an empty section, give that section a `min-height: 480px` and center the empty-state card. Don't let an empty list look like a missing section.

---

## C-9. Breakpoints

Three breakpoints. Memorize them.

| Breakpoint | Trigger | Changes |
|---|---|---|
| **C-9.1 ≥ 1200px** | full desktop | Default layout; sidebar 248px fixed; content centered at max-width |
| **C-9.2 720–1199px** | narrow desktop / tablet | Sidebar collapses to icon-only (56px). 2-col editor becomes stacked editor-then-preview |
| **C-9.3 < 720px** | mobile | Sidebar becomes drawer (hidden by default, topbar hamburger toggles). Page padding drops to 24px. Stat grid goes 2×2. |

**C-9.4 — There is no "tablet" breakpoint between 720 and 1199.** The layout gracefully compresses in that range, it doesn't switch to a distinct design.

**C-9.5 — Design mobile last, but design it.** Every page must have an explicit mobile layout, not a squeezed desktop. See `15-states.md` for what each archetype looks like on mobile.

---

## C-10. Adding or removing sections

**C-10.1 — Adding a section = adding a section-head.** Never drop content into a page as an un-headed slab. The head gives context and a scroll anchor.

**C-10.2 — Removing a section is better than shrinking one.** A section that doesn't earn 56px of gap probably doesn't earn its place on the page. Move it to a sub-route or delete it.

**C-10.3 — If a section's content is dynamic (could be empty),** it gets an empty state (R-6.1 or R-6.2). Never just hide the section — the shape of the page shouldn't change based on data.

**C-10.4 — Never nest a section inside a card.** Cards contain elements; sections contain cards. If you're tempted to section-divide a card, the card is too big — split it.

---

## C-11. Density across a page

The page has a density ceiling. Above it, the page feels cramped even if every individual component is spaced correctly.

**C-11.1 — A dashboard shows ≤ 20 "atoms of content" above the fold at 1440×900.** (An atom = a stat, a list row, a tile, a paragraph.) More than that and the eye can't breathe.

**C-11.2 — If you can see the page-title, the first section head, and the first data point without scrolling, you've nailed it.** If the title alone fills the fold, the title is too big for this page.

**C-11.3 — Below the fold, density can increase.** A library page's grid of 24 items is fine — the user has committed to scanning by scrolling.

---

## C-12. Cross-page consistency

A user moves between Dashboard → Posts → Editor → Dashboard. The kit must feel like one product.

**C-12.1 — The page-header shape is identical on every route.** Eyebrow, title, sublede, actions. Same spacing. Different content. This is the single most important consistency rule.

**C-12.2 — The first section of every route starts at the same y-position** (topbar 72 + page top 80 + page-header ~180 + section gap 56 = ~388px from the viewport top at 1440×900). Users unconsciously rely on this anchor.

**C-12.3 — Primary CTAs live in the same place on every page:** top-right of the page-header. Never bottom-right. Never inside a section.

**C-12.4 — Loading states do not change the layout.** Skeletons match the layout they replace (see `15-states.md`). A skeleton dashboard has the same 4-up stat grid as a loaded one.

---

## C-13. When to break the rules

The rules here describe the 95% case. The other 5%:

- **Landing pages / marketing** — full-bleed hero, centered content, gradients, full-width imagery. Different archetype (C-1.5), different rhythm.
- **Error pages (404, 500)** — centered empty-state style; no sidebar; no topbar.
- **Onboarding flows** — single-step wizards; progress indicator at top; one section per screen.
- **Fullscreen data views (calendar, analytics, chart-heavy)** — drop `max-width` constraint; use the full viewport; compact density throughout.

When you break a rule, write it down in the PR description with the reason. "This is an onboarding flow (C-13), so the page-header is centered and there's no sidebar." A reviewer should see the exception and understand it in one line.

---

## C-14. Composition anti-patterns

- **CAP-1** Two page-titles (e.g. `<h1>` then a hero section with another `<h1>`). One page, one title.
- **CAP-2** A section with no section-head. Every section is introduced.
- **CAP-3** A card that contains multiple sections. Cards are leaves, not branches.
- **CAP-4** A sticky element that competes with the topbar for attention. Only one sticky per scroll container.
- **CAP-5** Inconsistent grid minmax across siblings. If one section uses 320px min, the next shouldn't use 280px.
- **CAP-6** Sidebar info duplicated in topbar. Pick one.
- **CAP-7** A page whose layout shifts between loading and loaded. Skeletons match real layouts.
- **CAP-8** A page that scrolls horizontally. Ever. Cut columns or wrap.
- **CAP-9** Page-header CTA placed below the fold. CTAs live in the header.
- **CAP-10** A section gap that isn't 56 or 80px. Nothing in between.
