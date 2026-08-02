---
name: ios-design-system-rules
description: Use when writing, editing, or reviewing any ios/AITravel/DesignSystem/ Swift code or any screen/component consuming design tokens. Covers the 9 non-negotiable rules — token-tier authoring boundaries, no-hardcode/semantic-tokens-only, glass-on-floating-chrome-only, AI mark edges-only (never a fill), accent/persimmon-for-state-only, one time-conditional hint per screen, the five-signal fuzzy register, and Dynamic Type layout requirements.
---

# Design System Rules (AITravel iOS)

Nine rules, one line each. Each carries a depth pointer — follow it when you need the worked
example, not before. The code lives in the doc; this file is the checklist.

- **DS-1** Author raw values only in `DesignSystem/Tokens/` — the sole permitted deviation is
  `OKLCH.color` inside `Color+Tokens.swift` itself.
  → `ios/docs/engineering/05-design-system.md#6-no-hardcode-rule`
- **DS-2** No literal colors/spacing/radii/motion/sizes in screens or components — always the
  named `Color`/`Space`/`Radius`/`Motion`/`Sizing` token or a modifier, never a raw value.
  → `ios/docs/engineering/05-design-system.md#6-no-hardcode-rule`
- **DS-3** Compose from `Modifiers/` (semantic behaviors) and `Components/` (composed structs) —
  never hand-wire glass, dashed borders, AI marks, or state surfaces inline in a screen view.
  → `ios/docs/engineering/05-design-system.md#4-components-subtree`
- **DS-4** Glass only on chrome that floats — top bar, tab bar, sheet handle, map overlay chips;
  never on cards, list rows, modals at rest, or anything with primary input.
  → `CLAUDE.md#the-five-non-negotiable-rules`
- **DS-5** The AI mark is edges/marks only — a border stroke, a small dot, or the thinking strip;
  never a fill on a card or button body.
  → `CLAUDE.md#the-five-non-negotiable-rules`
- **DS-6** The state accent (persimmon) is for state, not chrome — saved fill, now-dot/halo, the
  time-conditional hint chip background; never a button or an error color.
  → `CLAUDE.md#the-five-non-negotiable-rules`
- **DS-7** One time-conditional hint per screen — the pulse fires once on appear and never
  repeats; capped at the screen level, not the component.
  → `CLAUDE.md#the-five-non-negotiable-rules`
- **DS-8** The fuzzy register is five signals together (dashed border, italic display name,
  monochrome glyph thumb, leading AI dot, tilde time range) — drop one and it reads as broken.
  → `CLAUDE.md#the-five-non-negotiable-rules`
- **DS-9** Every type size maps to a named iOS text style, and no layout assumes a fixed line
  count or fixed row height — both so a future Dynamic Type pass is mechanical, not a redesign.
  Dynamic Type itself isn't yet documented in `ios/docs/engineering/` — this rule is ahead of the doc,
  not behind it; update this pointer once it lands there.
  → `ios/docs/engineering/05-design-system.md#22-typography-tokens--fonttokensswift`

Cite the rule ID when you flag a violation — `DS-4: glass on a card at rest` is reviewable;
"glass looks off" is not.
