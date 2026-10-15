---
name: ios-design-system-rules
description: Use when writing, editing, or reviewing any ios/AppTemplate/DesignSystem/ Swift code (Tokens/, Modifiers/, Components/, Composition/) or any screen/component consuming design tokens. Covers the 10 non-negotiable rules — the three-tier token boundary, semantic-tokens-only, composing from modifiers/components/composition primitives, glass on floating chrome only, Dynamic Type always, one accent used sparingly, restrained motion, a point of view plus the slop scan, token parity with foundations.css, and the foundation barrier.
---

# Design System Rules (iOS)

Ten rules, one line each. Each carries a depth pointer — follow it when you need the worked
example, not before. The code lives in the doc; this file is the checklist.

- **DS-1** Raw values live only in the primitive tier (`DesignSystem/Tokens/Primitive.swift`); the
  semantic tier (`ColorRole`, `Spacing`, `Radius`, `Shadow`, `Motion`, `Typography`) names intent by
  role, and component tokens are local and sparing.
  → `ios/docs/engineering/05-design-system.md#1-the-three-tier-token-architecture-the-core-fix`
- **DS-2** Screens, components, and modifiers reference semantic tokens only — never a raw primitive,
  never a literal color/size/spacing; either is a review failure.
  → `ios/design-docs/00-overview.md#the-visual-non-negotiables`
- **DS-3** Compose from `Modifiers/`, `Components/` (data in as arguments, no `AppStore`), and
  `Composition/` (`ScreenScaffold`/`ScreenSection`/`RhythmSpacer`/`ActionBar`) — never hand-wire
  chrome, glass, or spacing inline in a screen.
  → `ios/docs/engineering/05-design-system.md#9-composition-primitives-the-shell`
- **DS-4** Glass (system Liquid Glass via `.glassChrome()`) only on floating chrome — tab/top/action
  bars, sheet handle, overlay chips; never on cards, rows, sheets-at-rest, or primary input; never
  glass-on-glass.
  → `ios/design-docs/00-overview.md#the-visual-non-negotiables`
- **DS-9** Dynamic Type always — every type role maps to a scaling text style, one-off metrics use
  `@ScaledMetric`, no fixed-pt fonts and no fixed frames on text; holds to AX5.
  → `ios/docs/engineering/05-design-system.md#4-typography--dynamic-type-first`
- **DS-10** One accent, used sparingly — marks the one thing that matters (primary action,
  selected/now state), at most twice per screen; never a decorative card fill, never chrome.
  → `ios/design-docs/06-judgment.md#j-2-color-roles--pick-by-role-never-by-value`
- **DS-11** Restrained motion — `Motion.*` tokens with one critically-damped ease-out, tap response
  ≤100ms, at most one continuous motion on screen, no springs outside one scoped reward, Reduce Motion
  degrades.
  → `ios/design-docs/06-judgment.md#j-9-motion--considered-never-bouncy`
- **DS-12** Have a point of view — one deliberate signature (type pairing, color, or motion), not
  system defaults — then run the slop scan; every flagged choice must be earned.
  → `ios/design-docs/06-judgment.md#j-13-craft--soul--the-anti-slop-rules`
- **DS-13** Token parity — each primitive is hand-transcribed 1:1 from `mockups/foundations/foundations.css`
  citing its source line, checked by the token-parity test; a value change updates primitive and
  assertion in the same commit.
  → `ios/docs/engineering/05-design-system.md#2-token-parity--drift-free-primitives`
- **DS-14** Foundation barrier — new design-system surface is reviewed (`ios-code-reviewer`) and
  snapshot-green before any dependent screen is scaffolded against it.
  → `ios/docs/engineering/05-design-system.md#10-the-foundation-barrier--build-it-right-then-lock`

Cite the rule ID when you flag a violation — `DS-4: glass on a card at rest` is reviewable;
"glass looks off" is not.
