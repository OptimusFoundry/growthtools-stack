---
name: frontend-a11y-rules
description: Use when building, reviewing, or auditing any webapp UI for accessibility — what quiet guarantees versus what the app still owns (focus, hit targets, keyboard paths, semantic HTML, ARIA, contrast, motion, forms, page title and landmarks) plus this repo's accessible-name uniqueness rule.
---

# Frontend A11y Rules (webapp)

Eleven rules, one line each. quiet's components carry keyboard, focus, roles and live regions;
these are what the app still owns. Open a pointer for the detail, not before. `quiet:` paths are
files in `@optimusfoundry/quiet`.

- **A-1** Focus stays visible and ordered: the ring and the Dialog/Drawer trap come from quiet —
  never `outline: none`, never `tabindex > 0`; DOM order is tab order; after a route change move
  focus to the new `h1` or `main`.
  → `quiet:docs/guidelines/accessibility.md#what-the-app-must-do`
- **A-2** Controls are at least 32px high (`size="sm"` is the floor, never smaller); an icon-only
  control keeps its hit area.
  → `quiet:docs/guidelines/accessibility.md#what-the-app-must-do`
- **A-3** Every interaction has a keyboard path — Enter activates, Space toggles, Escape dismisses
  every overlay, arrows move within a radio or tab group; never override submit-on-Enter.
  → `quiet:docs/guidelines/accessibility.md#what-quiet-guarantees`
- **A-4** Semantic HTML before ARIA — `Button` for actions, `Link` or `Button href` for
  navigation, never `<div onClick>`; real `<ul>`/`<table>`/`<nav>`/`<main>`; headings never skip a
  level (`as`).
  → `quiet:docs/guidelines/accessibility.md#what-the-app-must-do`
- **A-5** Don't re-add or override roles quiet already sets; ARIA only where semantics run out —
  `aria-busy` on skeletons, `aria-hidden` on decorative icons. Toasts announce themselves (error
  `alert`, the rest `status`); anything that must be acknowledged is not a toast.
  → `quiet:docs/guidelines/accessibility.md#what-quiet-guarantees`
- **A-5.2** Every icon-only control carries an accessible name (`aria-label`) — no label, no
  announcement.
  → `quiet:docs/guidelines/accessibility.md#what-the-app-must-do`
- **A-6** Body text uses `--q-fg-muted` or darker; `--q-fg-subtle` and small molten text are for
  non-essential labels only, and an error's words are body ink; colour is never the only signal.
  → `quiet:docs/guidelines/accessibility.md#contrast-exceptions`
- **A-7** Motion comes from the `--q-dur-*` tokens, which drop to 0 under
  `prefers-reduced-motion`; never bypass them with your own transition.
  → `quiet:docs/guidelines/foundations.md#motion`
- **A-8** Every field has a visible `label` (`hideLabel`, never omission) and its message goes
  through the field's `error` prop; a failed submit moves focus to the first invalid field.
  → `quiet:docs/guidelines/accessibility.md#what-the-app-must-do`
- **A-10** Set `document.title` per route, one `<main>`, a distinct `label` on a second
  `Sidebar`/`Breadcrumb`/`Pagination`, `alt` on every image (`alt=""` when decorative).
  → `quiet:docs/guidelines/accessibility.md#what-the-app-must-do`
- **Unique names** An accessible name must be unique within its visible context — discriminate by
  the object acted on, then the region, then a semantic index. Never bake state into a label, never
  substitute `title`, never duplicate visible text into an `aria-label`. Ambiguous names break
  screen-reader navigation and Playwright strict-mode locators alike.
  → `webapp/docs/A11Y-PATTERNS.md#rule-aria-label-must-be-unique-within-its-visible-context`

Cite the rule ID when you flag a violation — `A-5.2: icon-only button has no aria-label`.
