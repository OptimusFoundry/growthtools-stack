# Settings Tab Animations Implementation Plan

**Goal:** Animate tab content panels on the settings (account) page so that switching tabs produces a smooth fade + slide-up transition instead of an abrupt content swap.
**Scope:** frontend-only

---

## Architecture Summary

### What currently happens

`TabPanel` in `Tabs.tsx` (line 342) renders `if (!isActive) return null` — the active panel is mounted and inactive panels are unmounted with no transition. The swap is instantaneous.

### What needs to change

The design system already ships a `PageTransition` component (`src/proto-design-system/components/layout/PageTransition/PageTransition.tsx`) that wraps `AnimatePresence` + `motion.div` from `motion/react` (already a declared dependency at `^11.18.2`). It accepts a `pageKey` prop: changing the key triggers an exit animation on the old content and an enter animation on the new content.

The correct fix is to wrap the `<TabPanels>` block inside `AccountPage` with `<PageTransition pageKey={activeTab} type="slideUp">`. This requires zero changes to the design system, zero new dependencies, and respects the existing `prefers-reduced-motion` handling already baked into `PageTransition`.

### Why `PageTransition` rather than modifying `TabPanel`

- `TabPanel` is a shared design system component — changing it would affect every Tabs usage across the app.
- The settings page is the only page requesting this animation right now.
- `PageTransition` was built precisely for this use case (its own docstring example shows tab switching).
- The `slideUp` variant (`opacity: 0, y: 10` → `opacity: 1, y: 0`) is the most appropriate: it gives a sense of forward direction without the visual noise of a full horizontal slide.

### Animation spec

| Property | Value | Token |
|---|---|---|
| Duration | 0.2 s (200 ms) | `--duration-normal: 200ms` (matches `PageTransition` default) |
| Easing | `cubic-bezier(0, 0, 0.2, 1)` | `--ease-out` |
| Enter: opacity | 0 → 1 | — |
| Enter: translateY | 10px → 0 | — |
| Exit: opacity | 1 → 0 | — |
| Exit: translateY | 0 → −10px | — |
| Reduced motion | duration: 0 | handled internally by `PageTransition` via `useReducedMotion` |

`AnimatePresence mode="wait"` is used inside `PageTransition`, so the exit completes before the enter begins — no overlap between panels.

---

## Tasks

### F1: Wrap TabPanels with PageTransition in AccountPage

**File to modify:** `webapp/src/features/account/components/AccountPage/component.tsx`

**What to do:**

1. Add one import at the top of the file (after the existing design-system imports):

```tsx
import { PageTransition } from "@/proto-design-system/components/layout/PageTransition/PageTransition";
```

2. Wrap the `<TabPanels>` element with `<PageTransition>`, passing `activeTab` as the key and `"slideUp"` as the type. The `<TabPanels>` must become a **direct child** of `<PageTransition>`, not the other way around — `PageTransition` owns the animated wrapper `div`, and `TabPanels` sits inside it.

The `<Tabs>` block in the return (lines 67–90 of the current file) becomes:

```tsx
<Tabs activeTab={activeTab} onTabChange={handleTabChange} variant="line">
  <TabList aria-label="Settings tabs">
    <Tab id="billing" icon={<CreditCard size={16} />}>
      Billing
    </Tab>
    <Tab id="voice-profile" icon={<Mic size={16} />}>
      Voice Profile
    </Tab>
    <Tab id="platforms" icon={<Share2 size={16} />}>
      Platforms
    </Tab>
  </TabList>
  <PageTransition pageKey={activeTab} type="slideUp">
    <TabPanels>
      <TabPanel id="billing">
        <BillingTab />
      </TabPanel>
      <TabPanel id="voice-profile">
        <VoiceProfileTab />
      </TabPanel>
      <TabPanel id="platforms">
        <PlatformConnectionsTab />
      </TabPanel>
    </TabPanels>
  </PageTransition>
</Tabs>
```

**Why `PageTransition` wraps `TabPanels` (not each `TabPanel` individually):**

`TabPanel` unmounts when inactive (`if (!isActive) return null`). If `PageTransition` were placed inside each `TabPanel`, `AnimatePresence` would never see the exit because the component is already gone before `AnimatePresence` can capture it. Wrapping `TabPanels` as a whole and changing `pageKey` on each tab switch gives `AnimatePresence` a stable mount point to observe the keyed `motion.div` swap.

**No SCSS changes required.** The `PageTransition` component renders a plain `div` wrapper with no conflicting layout styles. The existing `.tabContent` class in `component.module.scss` is not applied anywhere currently (it exists but is unused), so there is no interaction to worry about.

**Full resulting import block** (complete, copy-ready):

```tsx
import { useNavigate, useSearch } from "@tanstack/react-router";
import { CreditCard, Mic, Share2 } from "lucide-react";
import { memo, useCallback } from "react";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { PageTransition } from "@/proto-design-system/components/layout/PageTransition/PageTransition";
import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@/proto-design-system/components/navigation/Tabs";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { BillingTab } from "./BillingTab";
import styles from "./component.module.scss";
import { PlatformConnectionsTab } from "./PlatformConnectionsTab";
import { VoiceProfileTab } from "./VoiceProfileTab";
```

**Verification:** After this change, switching between Billing / Voice Profile / Platforms tabs should produce a 200 ms fade + 10 px upward slide. Users with `prefers-reduced-motion: reduce` see an instant swap (duration 0, handled by `useReducedMotion` inside `PageTransition`).

---

## What does NOT need to change

- `Tabs.tsx` — no modifications to the design system component.
- `Tabs.module.scss` — no SCSS changes.
- `component.module.scss` — no SCSS changes.
- `account.tsx` route file — no changes.
- Any other tab panel or feature component — this is isolated to `AccountPage`.

---

## Executor

**Recommended executor:** `frontend-supervisor`

Pass it this plan. The only coding task is F1 (one file, two edits: add import, wrap element). No new files, no new hooks, no new SCSS. Build + lint verification (`npm run build && npm run lint && npm run lint:scss`) should pass without changes because `PageTransition` is already in the design system and `motion/react` is already in `package.json`.

**No human confirmation required before execution.** The approach is fully resolved — existing component, existing dependency, isolated change to one feature file.
