---
name: frontend-review-rules
description: Use when reviewing webapp UI or auditing it for drift — the 100-point design scorecard and its category weights, the self-audit and reviewer sweeps, and the four named anti-pattern registries a finding should cite.
---

# Frontend Review Rules (webapp)

The violation-facing view: what is wrong, and what it is called. Twelve rules, one line each.
Follow a pointer when you need the full criterion list — the rubric rows and anti-pattern
registries stay in the docs.

- **V-1** The scorecard goes in the PR description before review; every ⚠️ and ❌ carries a one-line
  reason, and ≥3 ❌ closes the PR without line-level review.
  → `docs/design-docs/18-review.md#v-1-how-to-use`
- **V-2…V-9** 100 points across eight categories — design fundamentals 20, spacing & rhythm 15,
  states 15, accessibility 15, colour & surfaces 10, composition 10, implementation 10, copy & voice
  5. Every row names the rule it enforces; score the row, not your taste.
  → `docs/design-docs/18-review.md#v-2-design-fundamentals-20-pts`
- **V-10** The five-minute self-audit runs before the rubric — keyboard-only pass, squint test,
  light/dark/brutal swap, 360px resize, render without JS. A failure is fixed, not noted.
  → `docs/design-docs/18-review.md#v-10-the-five-minute-self-audit`
- **V-11** 95–100 ship, 85–94 ship after warnings, 70–84 revise with a second review, under 70
  close. A false ✅ costs more than an honest ❌.
  → `docs/design-docs/18-review.md#v-11-scoring`
- **V-13** Reviewing someone else, in order — scorecard present, total ≥85, sample three deviations,
  squint at the page, Tab once, resize to 720 and 360, toggle theme, read the first screen aloud.
  Go deep only on what those surface.
  → `docs/design-docs/18-review.md#v-13-reviewers-half-page`
- **V-14** Promotion to the kit needs ≥3 feature uses, Storybook coverage of every `S-1` state, a
  standalone `V-2`–`V-9` pass, one named owner, and a README with anti-use-cases.
  → `docs/design-docs/18-review.md#v-14-promotion-criteria`
- **J-14** The 60-second sweep is the fast path when there is no scorecard — squint, eyebrow, one
  emphasis, count sizes, count primaries, check gaps, kill decorative dividers, check the numerals,
  read the copy aloud, Tab through.
  → `docs/design-docs/12-judgment.md#j-14-the-60-second-review`
- **AP-\*** Fifteen general anti-patterns, each already named. Cite the number; do not re-derive it.
  → `docs/design-docs/12-judgment.md#j-13-anti-patterns-copy-these-into-a-reviewers-eye`
- **TAP-\*** Typography anti-patterns.
  → `docs/design-docs/19-typography-decisions.md#t-15-typography-anti-patterns`
- **SPAP-\*** Spacing anti-patterns.
  → `docs/design-docs/20-spacing-decisions.md#sp-15-spacing-anti-patterns`
- **SAP-\*** States anti-patterns.
  → `docs/design-docs/15-states.md#s-14-states-anti-patterns`
- **Auto-blocks** The repo-specific ones — nested render ternaries, hardcoded inline strings,
  per-page `timeAgo`/`truncate` copies, ad-hoc delete-modal wiring — are already a table; cite it
  rather than restating it.
  → `.claude/skills/frontend-composition-rules/SKILL.md#red-flags-auto-block-in-review`

Condensed rubric: `docs/design-docs/quickref/18-review.md` (index: `docs/design-docs/QUICKREF.md`).

Every finding cites its rule ID. `AP-15: card has border and shadow at rest` is actionable and
arguable; "this card looks heavy" is neither.
