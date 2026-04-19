# Review rubric — score your PR before opening it

A single-page scorecard. Every category has explicit criteria. Points add up to 100. Below 85, don't open the PR.

Citations (J-*, C-*, R-*, S-*, A-*, I-*, AP-*) reference the other docs — go read them for detail.

Rules `V-N.M`. This doc is the checklist; the others are the law.

---

## V-1. How to use

**V-1.1** — Copy the scorecard at the bottom into your PR description.
**V-1.2** — Mark each row ✅ / ⚠️ / ❌.
**V-1.3** — ⚠️ and ❌ each need a one-line note. "Didn't test dark theme — not themed" is fine; silence is not.
**V-1.4** — Reviewers look at the scorecard first. If ≥ 3 ❌s, the PR gets closed without line-level review.
**V-1.5** — If you scored yourself ✅ on something the reviewer catches broken, that's on you.

---

## V-2. Design fundamentals (20 pts)

| Pts | Criterion | Ref |
|---|---|---|
| 4 | Page has exactly one `<h1>` / page-title | C-5.1, J-3.1 |
| 2 | One italic `<em>` moment in the page-title | J-6.1 |
| 2 | Eyebrow above title, 4px gap, mono uppercase tracked | J-11.3, J-1.1 |
| 2 | Sublede is specific (numbers, state), not generic | J-11.2 |
| 2 | ≤ 4 type sizes on the page | J-3.2 |
| 2 | ≤ 1 `.btn.primary` per visible region | J-6.3 |
| 2 | Stat values in Fraunces, tnum on, ≥ 56px | J-3.3, AP-4 |
| 2 | No emoji, no exclamation marks | J-11.8, J-11.9 |
| 2 | No raw hex/rgb/named colors — tokens only | J-2, AP-10, I-1.4 |

---

## V-3. Spacing & rhythm (15 pts)

| Pts | Criterion | Ref |
|---|---|---|
| 3 | Page-header stack: 4 / 12 / 24 / 56 | J-1, R-1.1 |
| 3 | Section gaps are 56 or 80, never between | J-1.4, J-1.5, CAP-10 |
| 3 | Card padding 20–28px (breathable) or 16px (compact), not mixed | J-5.1, J-5.2 |
| 2 | No dividers where space would do | J-4.2 |
| 2 | Dividers where identical-shape rows repeat | J-4.1 |
| 2 | No nested cards beyond 2 levels | J-5.5, CAP-3 |

---

## V-4. Color & surfaces (10 pts)

| Pts | Criterion | Ref |
|---|---|---|
| 2 | Text color roles honored (fg1 headings ≥22, fg2 body, fg3 meta) | J-2 |
| 2 | `--accent` used ≤ 2× per page (italic + one more) | J-2.10 |
| 2 | `--primary` used for structural roles only (CTA, focus, links) | J-2.11 |
| 2 | No nested surface stacking (card-in-card) | J-8.1 |
| 2 | Contrast passes 4.5:1 body / 3:1 large text | A-6.1 |

---

## V-5. Composition (10 pts)

| Pts | Criterion | Ref |
|---|---|---|
| 2 | Page matches one of 5 archetypes | C-1 |
| 2 | Max-width correct for archetype | C-3.1 |
| 2 | Heading levels nested cleanly (no h1→h3) | C-5.5, A-4.3 |
| 2 | Section container modes alternate | C-4.1 |
| 2 | Page-header CTA in top-right of header, not elsewhere | C-12.3, CAP-9 |

---

## V-6. States (15 pts)

| Pts | Criterion | Ref |
|---|---|---|
| 3 | Default, hover, focus, active, disabled all implemented | S-1 |
| 3 | Loading state is a skeleton matching real layout | S-2.1, S-2.2 |
| 2 | Empty state present (first-time AND filtered as applicable) | S-3 |
| 2 | Error state has specific copy + retry path | S-4.3, S-4.4 |
| 2 | Missing data renders `—`, zero renders `0` | S-7.1, S-7.2 |
| 2 | No layout shift between any state | S-13.5, SAP-10 |
| 1 | Disabled elements explain why (tooltip or hint) | S-8.2, AAP-14 |

---

## V-7. Accessibility (15 pts)

| Pts | Criterion | Ref |
|---|---|---|
| 3 | Every interactive element reaches via Tab, shows focus | A-1.1, A-1.3 |
| 3 | `<button>` / `<a>` used semantically — no `<div onClick>` | A-4.2, AAP-2 |
| 2 | Icon-only buttons have `aria-label` | A-5.2, AAP-5 |
| 2 | Every input has a visible `<label>` | A-8.1, AAP-3 |
| 2 | Error messages linked via `aria-describedby` | A-8.3 |
| 1 | Modal traps focus, Escape closes, restores on close | A-1.4, AAP-8 |
| 1 | Status communicated by more than color | A-6.2, AAP-11 |
| 1 | `prefers-reduced-motion` respected | A-7.1 |

---

## V-8. Copy & voice (5 pts)

| Pts | Criterion | Ref |
|---|---|---|
| 1 | Button labels are verbs (Create, Publish, Save) — not Submit / Continue | J-11.4 |
| 1 | Times are relative ("2h ago") before absolute | J-11.5 |
| 1 | Error copy is specific and actionable | S-4.6 |
| 1 | No filler ("We couldn't find any, sorry!") | S-3.5 |
| 1 | Italic moment in title is a word, not a phrase | J-6.1, J-11.7 |

---

## V-9. Implementation (10 pts)

| Pts | Criterion | Ref |
|---|---|---|
| 2 | No `!important`; no hex; tokens everywhere | I-1 |
| 2 | Props over class-names for variants | I-2.2 |
| 2 | URL state for sort/filter/pagination | I-9.2, IAP-14 |
| 1 | Images have width + height + `loading="lazy"` | I-7.1, I-7.2, IAP-12 |
| 1 | Stable keys on lists (not index) | I-2.7, IAP-13 |
| 1 | Tree-shaken icon imports | I-5.1, IAP-10 |
| 1 | No hard-coded strings (i18n) | I-12.1 |

---

## V-10. The five-minute self-audit

Before submitting the rubric:

1. **Keyboard-only test.** Unplug the mouse. Navigate the page end-to-end. Can you? (A-14)
2. **Squint test.** What dominates? Is it the right thing? (J-14 step 1)
3. **Theme swap.** Toggle light → dark → brutal. Does anything break?
4. **Mobile resize.** Drag the window to 360px. Does the page degrade gracefully? (C-9.3)
5. **Turn off JS.** Does the critical content still render? (SSR / progressive enhancement)

If any of these fails, fix before filling out the rubric.

---

## V-11. Scoring

| Total | Verdict |
|---|---|
| 95–100 | Ship with reviewer +1 |
| 85–94 | Ship after addressing warnings |
| 70–84 | Revise; second review required |
| < 70 | Close and reopen when rework is done |

Rubrics that score ≥ 95 are expected to be sampled for audit — the reviewer may check 3 random criteria. False ✅s cost more than honest ❌s.

---

## V-12. The PR template (copy this)

```md
## What changed
<!-- one-line user-facing summary -->

## Design-system scorecard

**Design fundamentals** (__/20)
- [ ] Page has exactly one h1
- [ ] One italic moment in title
- [ ] Eyebrow above title, 4px gap
- [ ] Sublede is specific
- [ ] ≤4 type sizes
- [ ] ≤1 primary per region
- [ ] Stat values in Fraunces ≥56px
- [ ] No emoji / no !
- [ ] No raw colors

**Spacing & rhythm** (__/15)
- [ ] Page-header stack 4/12/24/56
- [ ] Section gaps 56 or 80
- [ ] Card padding in one density mode
- [ ] No decorative dividers
- [ ] Dividers on identical-shape rows
- [ ] No nested cards >2 levels

**Color & surfaces** (__/10)
- [ ] fg1/fg2/fg3 roles honored
- [ ] accent ≤2 uses
- [ ] primary only structural
- [ ] No card-in-card
- [ ] Contrast ≥4.5:1 / 3:1

**Composition** (__/10)
- [ ] Matches one archetype
- [ ] Max-width correct
- [ ] Heading levels nested
- [ ] Sections alternate containers
- [ ] CTA in page-header top-right

**States** (__/15)
- [ ] Default/hover/focus/active/disabled
- [ ] Skeleton matches layout
- [ ] Empty state (first+filtered)
- [ ] Error with retry
- [ ] — for missing, 0 for zero
- [ ] No layout shift between states
- [ ] Disabled explains why

**Accessibility** (__/15)
- [ ] Tab reaches everything
- [ ] Semantic button/link
- [ ] aria-label on icon buttons
- [ ] Visible labels on inputs
- [ ] aria-describedby for errors
- [ ] Focus trap in modals
- [ ] Status beyond color
- [ ] prefers-reduced-motion

**Copy** (__/5)
- [ ] Verb button labels
- [ ] Relative times
- [ ] Specific errors
- [ ] No filler
- [ ] Italic is a word

**Implementation** (__/10)
- [ ] No !important / hex
- [ ] Props for variants
- [ ] URL state for sort/filter/page
- [ ] Images sized + lazy
- [ ] Stable list keys
- [ ] Tree-shaken icons
- [ ] No hard-coded strings

**Five-minute audit**
- [ ] Keyboard-only passes
- [ ] Squint test: right thing dominates
- [ ] Light / dark / brutal all work
- [ ] Mobile 360px degrades gracefully
- [ ] Critical content renders without JS

**Total: __/100**

## Deviations / notes
<!-- Anything marked ⚠️ or ❌, with a one-line reason -->
```

---

## V-13. Reviewer's half-page

When reviewing others' PRs, look for these in order (each ~10 seconds):

1. **Scorecard present?** If not, close with "fill out V-12."
2. **Total score?** < 85 → close.
3. **Sample 3 ❌/⚠️.** Is each deviation justified?
4. **Open the page.** Squint test (J-14 step 1).
5. **Tab once.** Focus ring visible?
6. **Resize to 720px and 360px.** Graceful?
7. **Toggle theme once.** Breaks?
8. **Read the first screen of copy aloud.** Any exclamation? "Click here"? Emoji?

If steps 4–8 all pass, approve the scored criteria and go deep only on the risky ones.

---

## V-14. Promotion criteria

For a component to be promoted from "feature-local" to "kit":

- Used in ≥ 3 features
- Ships with Storybook coverage of all S-1 states
- Passes V-2 through V-9 as a unit (not just inside a page)
- One owner named in the PR
- README describes use cases and anti-use cases

Don't promote speculatively. The kit stays lean.
