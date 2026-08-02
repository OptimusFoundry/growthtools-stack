---
name: frontend-design-rules
description: Use when building, styling, theming, or reviewing any webapp UI — page, component, SCSS module, or design review. The universal design core — vertical rhythm, spacing ladder, type and weight ladders, colour roles, density, scarcity budget.
---

# Frontend Design Rules (webapp)

Seventeen rules, one line each. Follow a rule's pointer when you need the worked example, not
before — the tables and CSS stay in the docs.

- **J-1** Five vertical gaps — 4/12/24/56/80px (`--space-1/3/5/10/12`); never a sixth.
  → `docs/design-docs/12-judgment.md#j-1-vertical-rhythm--the-exact-gaps-between-specific-pairs`
- **J-2** `fg1` display, `fg2` body, `fg3` muted, `fg4` subtle; headings ≥22px `fg1`, smaller `fg2`
  never `fg1`; ≤2 colours per paragraph.
  → `docs/design-docs/12-judgment.md#j-2-color-roles--which---fg-goes-where`
- **J-3** ≤4 type sizes per page (title, section head, card title, body); product page titles cap at
  22–24px.
  → `docs/design-docs/12-judgment.md#j-3-type-sizing--which-size-goes-where-and-what-can-share-a-page`
- **J-5** Breathable (24px card padding) or compact (16px) — never mixed on one surface; a tight row
  loses a column, not padding.
  → `docs/design-docs/12-judgment.md#j-5-density--cards-rows-and-breathable-vs-compact`
- **J-6** One `--accent` and one `.btn.xl` per page, one `.btn.primary` per visible region, one
  eyebrow per section.
  → `docs/design-docs/12-judgment.md#j-6-the-one-of-rules`
- **T-1** Two type roles — `--font-family-sans` / `--font-family-mono`; mono is a structural override
  (eyebrows, counts, timestamps, code, kbd), never buttons, body, headings, or in-text numbers.
  Never hardcode a family name.
  → `docs/design-docs/19-typography-decisions.md#t-1-the-two-family-rule`
- **T-4** Italic emphasis is retired — shift colour or weight; `<em>` italic for real semantics only.
  → `docs/design-docs/19-typography-decisions.md#t-4-the-italic-moment--retired`
- **T-5** Stats are sans, never mono — 28px default, 32px hero, `tnum` always on.
  → `docs/design-docs/19-typography-decisions.md#t-5-stat-numerals`
- **T-6** Body 15px in UI, 16px in prose; prose max-width 68ch.
  → `docs/design-docs/19-typography-decisions.md#t-6-long-form-prose-geist-serif-flavored`
- **T-11** 400 body, 500 buttons/labels/nav/page titles, 600 card/modal titles, 700 almost never.
  → `docs/design-docs/19-typography-decisions.md#t-11-weight-ladder`
- **SP-1** Off-ladder values (18/20/36/72px) are always wrong; prefer one rung over two; never
  `calc()`-divide a token.
  → `docs/design-docs/20-spacing-decisions.md#sp-1-the-scale-you-actually-use`
- **SP-5** Page canonicals via `<PageShell>` — 24px sides, 56px top, 80px bottom, 56px section gap,
  1280px max-width.
  → `docs/design-docs/20-spacing-decisions.md#sp-5-page-level-spacing--the-canonical-numbers`
- **SP-7** Gaps shrink as you nest (56/24/20/12–16/8/4); never reverse it — needing 20 inside 16
  means the outer gap is wrong.
  → `docs/design-docs/20-spacing-decisions.md#sp-7-stack-gap-ladder-vertical-rhythm-inside-a-single-column`
- **FC-1** No barrel exports — no `index.ts`; import from source.
  → `docs/design-docs/17-implementation.md#i-3-file-organization`
- **FC-2** No `any`; TS strict.
  → `docs/design-docs/17-implementation.md#i-17-implementation-checklist`
- **FC-3** SCSS Modules; no inline styles.
  → `webapp/docs/DESIGN-GUIDELINES.md#use-scss-modules-not-style-props`
- **FC-4** Tokens only; no hex or px.
  → `webapp/docs/DESIGN-GUIDELINES.md#use-design-tokens-never-hardcode`

Full condensed ruleset per topic: `docs/design-docs/quickref/{12,19,20}-*.md` (index:
`docs/design-docs/QUICKREF.md`).

Cite the rule ID when you flag a violation — `J-1: six distinct gaps on one page` is reviewable;
"spacing feels off" is not.
