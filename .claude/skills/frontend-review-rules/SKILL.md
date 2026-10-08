---
name: frontend-review-rules
description: Use when reviewing webapp UI or auditing it for drift — the quiet screen checklist, the self-audit and reviewer sweeps, and the named anti-pattern list a finding should cite.
---

# Frontend Review Rules (webapp)

The violation-facing view: what is wrong, and what it is called. Follow a pointer for the full
list. `quiet:` paths are files in `@optimusfoundry/quiet`.

- **V-1** The checklist is the rubric. Run it on every new or changed screen in `foundry` and
  `foundry-dark`, at 1280 and at 390 wide; every item is yes, or carries a one-line reason. No
  score.
  → `quiet:docs/guidelines/checklist.md`
- **V-10** Self-audit before asking for review, as `quiet-app` "Before you finish":
  `npx quiet-audit <url> --width 1280,390 --theme foundry,foundry-dark` clean, then keyboard-only
  pass, squint (one lead block), theme swap, 390px resize. A failure is fixed, not noted.
  → `quiet:docs/guidelines/checklist.md`
- **V-13** Reviewing someone else, in order — checklist present, sample three deviations, squint,
  Tab once, resize to 390, toggle the theme, read the first screen aloud. Go deep only on what
  those surface.
  → `quiet:docs/guidelines/checklist.md`
- **AP-\*** Anti-patterns, cite the number: AP-1 a second `h1` or a 40px heading in the page ·
  AP-2 card-in-card, panel around a table · AP-3 a 12/20/28px gap or a margin on a quiet
  component · AP-4 molten as a fill, button or second accent · AP-5 a hairline under a
  `SectionHeader` · AP-6 stacked `Alert`s · AP-7 an off-grid split (7+5, %) or a `Grid` without
  `rowGap` · AP-8 a hand-rolled modal, menu, tabs, table or chart · AP-9 equal-weight blocks, no
  lead · AP-10 a raw colour (hex, `rgb()`, named) or `font-size` in a screen · AP-11 centred
  paragraphs, or ALL CAPS sans · AP-12 banned words, "OK"/"Submit", exclamation marks, emoji ·
  AP-13 a page spinner instead of a `Skeleton` · AP-14 a toast for something that must be
  acknowledged · AP-15 a shadow on an at-rest surface, or bounce and ambient motion.
  → `quiet:docs/guidelines/checklist.md`
- **Auto-blocks** The repo-specific ones — nested render ternaries, hardcoded inline strings,
  per-page `timeAgo`/`truncate` copies, ad-hoc delete-modal wiring — are already a table; cite it
  rather than restating it.
  → `.claude/skills/frontend-composition-rules/SKILL.md#red-flags-auto-block-in-review`

Cite the rule ID when you flag a violation — `AP-15: a card with a shadow at rest`.
