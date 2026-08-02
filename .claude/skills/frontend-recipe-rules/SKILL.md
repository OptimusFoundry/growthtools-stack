---
name: frontend-recipe-rules
description: Use when writing the markup inside a webapp page — cards, list rows, form fields, button rows, tab pills, empty states, and AI/streaming blocks. The copy-this-structure recipes and the geometry each commits to.
---

# Frontend Recipe Rules (webapp)

Twelve recipes, one line each. Copy the structure, swap the content; open a pointer for the worked
markup, not before. Sizes, colour roles, and page gaps are owned by `J-*`, `T-*`, `SP-*` — cite
those, never restate them here.

- **R-2.2** An interactive card is a real `<button class="card outlined interactive">`, never a
  `<div onClick>`; hover lifts `translateY(-2px)` to `shadow-lg` as the border fades out, press is
  `scale(0.98)` — both at the 150ms hover duration (`J-9.1`).
  → `docs/design-docs/13-recipes.md#r-22-interactive-card-tiles-plan-pickers`
- **R-2.5** The 4-up stat grid *is* the divider — outer `background: var(--border)`, `gap: 1px`,
  `border-radius: 20px`, `overflow: hidden`; cells `border: 0` on `--bg-surface`, all uniform, no
  filled cell and no borders inside.
  → `docs/design-docs/13-recipes.md#r-25-4-up-stat-grid-the-signature-divider-pattern`
- **R-3.1** A post row is grid `40px 1fr auto auto auto`, 20px gap, `16px 24px` padding — mono index
  `--fg4`, title `--fg1`, meta `--fg3`, last cell always an `.icon-btn` chevron, never a text link.
  → `docs/design-docs/13-recipes.md#r-31-post-list-hairline-divided-rows`
- **R-4.1** Field stack is `.lbl`+`.req` → `.inp` → `.hint`, gaps 8px label→input, 6px input→hint,
  20px field→field.
  → `docs/design-docs/13-recipes.md#r-41-standard-input-field`
- **R-4.2** A field group is `repeat(auto-fit, minmax(240px, 1fr))` at gap 20px so it collapses to
  one column; a full-width field takes `grid-column: 1 / -1`.
  → `docs/design-docs/13-recipes.md#r-42-field-group-2-column-on-wide`
- **R-4.4** Destructive confirm names the object in its title ("Delete this post?", never "Are you
  sure?") and the consequence on its button (never "OK"); footer is ghost Cancel, then the danger
  button last.
  → `docs/design-docs/13-recipes.md#r-44-destructive-confirm-delete-modal`
- **R-5.2** A card footer runs ghost tertiary left → flex spacer → secondary → primary far right
  (the commit position), all `.sm`. Never centered.
  → `docs/design-docs/13-recipes.md#r-52-card-footer-actions`
- **R-5.3** A tab pill holds 2–4 tabs only (5+ is a real tab bar) — track `--base-100`, `r-full`, 4px
  padding; thumb `--bg-surface` + `shadow-sm`.
  → `docs/design-docs/13-recipes.md#r-53-tab-pill-segmented-control`
- **R-6.1** First-run empty — geometry for `S-3`: `.card.outlined`, 64px padding, centered — a 64×64 `--base-100` circle
  holding a 28px `--fg3` icon, 24px above the `.ds-h3`, an 8px-below `--fg3` line capped at 42ch,
  then one primary CTA 24px under it. No secondary action.
  → `docs/design-docs/13-recipes.md#r-61-first-time-empty-no-data-yet`
- **R-6.2** Filtered empty is smaller: 48px padding, no illustration, one ghost `.sm` "Clear filters"
  24px below the copy — the action undoes the filter, it never creates something.
  → `docs/design-docs/13-recipes.md#r-62-filtered-empty-users-search-returned-0`
- **R-9.1** Generated content sits in a collapsible block whose footer keeps Regenerate and Copy
  always visible — never behind a menu.
  → `docs/design-docs/13-recipes.md#r-91-generated-content-block-with-regenerate`
- **R-9.2** While streaming, a blinking caret is the only progress signal — never "thinking…" text;
  message actions appear on row hover, not per message.
  → `docs/design-docs/13-recipes.md#r-92-streaming-response-chat`

No recipe fits? It is almost always a `.card` with other content, an `R-3.1` list, or an `R-4.1`
field in disguise (`R-11`). Full condensed ruleset: `docs/design-docs/quickref/13-recipes.md`.

Cite the recipe ID when you flag a violation — `R-5.2: primary button centered in a card footer` is
reviewable; "the buttons look wrong" is not.
