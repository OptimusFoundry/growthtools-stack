---
name: frontend-a11y-rules
description: Use when building, reviewing, or auditing any webapp UI for accessibility — the WCAG AA baseline (focus, hit targets, keyboard paths, semantic HTML, ARIA, contrast, motion, forms, landmarks) plus this repo's accessible-name uniqueness rule.
---

# Frontend A11y Rules (webapp)

Twelve rules, one line each. Follow a rule's pointer when you need the recipe, not before — the
CSS, the focus-trap hook and the ARIA tables stay in the docs.

- **A-1** `:focus-visible` on everything interactive, ring ≥3:1, never `outline: none` without an
  equal-contrast replacement. DOM order is tab order — reorder the DOM,
  never `tabindex > 0`. Modals trap focus and return it to the trigger.
  → `docs/design-docs/16-accessibility.md#a-1-focus--the-most-violated-rule`
- **A-2** Hit targets 44×44px on touch, 32×32px desktop minimum, ≥8px apart; pad to reach it — the
  visible icon stays 14–18px.
  → `docs/design-docs/16-accessibility.md#a-2-hit-targets`
- **A-3** Every interaction has a keyboard path — Enter activates, Space toggles, Escape dismisses
  every overlay, arrows move within a radio or tab group; never override submit-on-Enter.
  → `docs/design-docs/16-accessibility.md#a-3-keyboard-paths`
- **A-4** Semantic HTML before ARIA — `<button>` for actions and `<a>` for navigation, never
  `<div onClick>`; `<label for>` on inputs; real `<ul>` / `<table>` / `<nav>` / `<main>`; headings
  never skip a level.
  → `docs/design-docs/16-accessibility.md#a-4-semantic-html-first`
- **A-5** ARIA only where semantics run out — `aria-live` for async, `aria-busy` on skeletons,
  `role="alert"` on errors, `aria-hidden` on decorative icons; never on static text or on anything
  that already has visible text.
  → `docs/design-docs/16-accessibility.md#a-5-aria--only-when-semantic-html-isnt-enough`
- **A-5.2** Every icon-only control carries an `aria-label` — no label means no
  announcement.
  → `docs/design-docs/16-accessibility.md#a-5-aria--only-when-semantic-html-isnt-enough`
- **A-6** Contrast 4.5:1 body, 3:1 large text and UI; colour is never the only signal — pair status
  with an icon or a word, never red/green alone.
  → `docs/design-docs/16-accessibility.md#a-6-color--contrast`
- **A-7** `prefers-reduced-motion` is honoured globally and never overridden; nothing flashes more
  than 3×/s; no loop past 5s without an off switch.
  → `docs/design-docs/16-accessibility.md#a-7-motion--animation`
- **A-8** Every input has a visible `<label>` — a placeholder is not one; required fields carry `*`
  and `aria-required`; errors set `aria-invalid` and wire to the input via `aria-describedby`.
  → `docs/design-docs/16-accessibility.md#a-8-forms`
- **A-10** Page-specific `<title>` first, unique landmarks with an `aria-label` per `<nav>`, a skip
  link, `alt` on every image (`alt=""` when decorative), link text meaningful out of context.
  → `docs/design-docs/16-accessibility.md#a-10-content`
- **AAP-\*** The anti-pattern registry is already named — cite the number, do not re-derive it.
  → `docs/design-docs/16-accessibility.md#a-13-anti-patterns`
- **Unique names** An accessible name must be unique within its visible context — discriminate by
  the object acted on, then the region, then a semantic index. Never bake state into a label, never
  substitute `title`, never duplicate visible text into an `aria-label`. Ambiguous names break
  screen-reader navigation and Playwright strict-mode locators alike.
  → `webapp/docs/A11Y-PATTERNS.md#rule-aria-label-must-be-unique-within-its-visible-context`

Condensed ruleset: `docs/design-docs/quickref/16-accessibility.md` (index:
`docs/design-docs/QUICKREF.md`).

Cite the rule ID when you flag a violation — `A-5.2: icon-only button has no aria-label` is
actionable; "this isn't very accessible" is not.
