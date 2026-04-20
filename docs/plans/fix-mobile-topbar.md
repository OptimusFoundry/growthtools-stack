# Mobile Topbar Fix — Implementation Plan

**Goal:** Eliminate the stacked hamburger-bar-over-topbar on mobile by merging the hamburger into the page Topbar, collapsing 2-level breadcrumbs to a back link on mobile, and routing WizardInner's four action buttons into a fixed bottom action bar on narrow viewports.

**Scope:** frontend-only

---

## Context and Problem Summary

### Stacked bars (the root cause)

`webapp/src/components/Layout/Layout.tsx` lines 120–122 render a standalone `<header className={styles.header}>` whose only child is `<SidebarMobileTrigger />`. On mobile this appears as a separate bar above whichever page also renders a `<Topbar>`. Every page in the app that uses `<Topbar>` is affected.

`webapp/src/components/Layout/Layout.module.scss` lines 16–25 define `.header` with `display: flex`, `flex-shrink: 0`, and `padding: var(--space-2) var(--space-4)`. The `:empty { display: none }` rule only fires when there is *no* child at all — `<SidebarMobileTrigger>` returns `null` on desktop via its internal `if (!isMobile) return null` guard (Sidebar.tsx line 517), but on mobile it does render, so the bar is always visible on mobile.

### WizardInner worst-case (post edit/create flow)

`webapp/src/components/create-post/WizardInner.tsx` lines 534–583: `topbarActions` includes up to four buttons (Delete, Save draft, Reschedule/Schedule, Publish). On a 375 px viewport these overflow the topbar horizontally.

### `SidebarMobileTrigger` behaviour

`SidebarMobileTrigger` (Sidebar.tsx lines 513–528) reads `isMobile` from `SidebarContext`. It returns `null` when `isMobile === false` and renders a `<Menu>` icon button when `isMobile === true`. It requires no props other than an optional `className`. The mobile detection is JS-driven via `window.innerWidth` inside `SidebarProvider`, not CSS — so on the server/initial render it starts as `false` and flips once the resize handler fires. Because the Topbar is client-rendered inside a CSR app (Vite, no SSR), this is fine; the trigger will appear after first render on mobile.

### Breakpoint token

The SCSS breakpoint mixin `@include breakpoint-down("md")` compiles to `@media (width <= 767px)` — matching the `DEFAULT_MOBILE_BREAKPOINT = 768` value in Sidebar.tsx. Use this mixin (via `@use "../../proto-design-system/mixins" as *;`) in all new SCSS files. Do not write `@media (max-width: 768px)` or any raw pixel value.

### z-index token

`--z-sticky: 20` — used by `.topbar`. The new `MobileActionBar` sits at the bottom of the viewport; use `--z-sticky` there too so it floats over page content but below modals (`--z-modal: 50`) and drawers (`--z-overlay: 40`).

### Design system imports for this plan

All components below come from `@/proto-design-system/...`. The `@/` alias resolves to `webapp/src/`.

| Component | Import path |
|-----------|-------------|
| `SidebarMobileTrigger` | `@/proto-design-system/components/navigation/Sidebar` |
| `Button` | `@/proto-design-system/components/primitives/Button` |
| `DropdownMenu`, `MenuItemData` | `@/proto-design-system/components/overlays/DropdownMenu` |

`Link` from TanStack Router: `import { Link } from "@tanstack/react-router"`.
`ChevronLeft` from lucide-react: `import { ChevronLeft } from "lucide-react"`.

---

## Architecture Summary

### What changes

1. **`Topbar`** gains a `leading?: ReactNode` prop. In `topbar.module.scss` a new `.leading` class renders the slot as a flex child before `.titleBlock`. On mobile (`<768px`) a default `<SidebarMobileTrigger />` is shown inside the topbar via the `leading` slot; on desktop it returns `null` from its own guard, so no extra space is consumed.
2. **`Topbar`** gains CSS-driven breadcrumb-vs-back-link swap. When `breadcrumbs` has at least one item with an `href` (a parent crumb), both the `<Breadcrumb>` and a `<Link>` back affordance are rendered in the DOM; a media query hides one of them depending on viewport.
3. **`Layout.tsx`** removes the `<header className={styles.header}>` block entirely. `<SidebarMobileTrigger>` no longer lives at the Layout level.
4. **`Layout.module.scss`** removes the `.header` rule (confirmed unused after step 3).
5. **`MobileActionBar`** — new component that appears only on `<768px`. Props: `primary: ReactNode`, `secondary?: ReactNode`, `overflow?: ReactNode`. Uses `position: sticky; bottom: 0` with safe-area inset padding.
6. **`WizardInner.tsx`** — renders `<MobileActionBar>` with `primary={Publish}`, `secondary={Reschedule}`, `overflow={DropdownMenu with Delete + Save draft}`. The existing `topbarActions` node is retained and rendered into `<Topbar actions={topbarActions}>` unchanged; CSS in `topbar.module.scss` hides everything except Publish in the `.actions` slot on mobile, collapsing the desktop four-button row to a single icon-only Publish button in the topbar.
7. **`e2e/posts.spec.ts`** — extended with a `describe("Mobile topbar — 375px viewport")` block and a `describe("Desktop topbar — 1280px viewport")` block.

### What does NOT change

- `Breadcrumb.tsx` and `Breadcrumb.module.scss` — unmodified.
- `DropdownMenu.tsx` — unmodified.
- `Sidebar.tsx` / `Sidebar.module.scss` — unmodified.
- No page outside `WizardInner` is touched (the Topbar change is automatic for all pages by virtue of the `leading` default slot).

---

## Tasks

Tasks T1–T4 are independent and may run in parallel. T5 (WizardInner) depends only on T3 (MobileActionBar) completing. T6 (E2E) depends on T5.

---

### T1 — Topbar: add `leading` slot + mobile back-link swap

**Files:**
- `webapp/src/components/Layout/Topbar.tsx`
- `webapp/src/components/Layout/topbar.module.scss`

#### Topbar.tsx — full replacement

Replace the entire file with the following:

```tsx
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import {
  Breadcrumb,
  type BreadcrumbItem,
} from "@/proto-design-system/components/navigation/Breadcrumb";
import { SidebarMobileTrigger } from "@/proto-design-system/components/navigation/Sidebar";
import styles from "./topbar.module.scss";

interface TopbarProps {
  /** Title shown when no breadcrumbs are provided. */
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  children?: ReactNode;
  /**
   * Content rendered as the first flex child, before the title block.
   * Defaults to <SidebarMobileTrigger /> — shown only on mobile via its
   * own internal guard. Pass null to suppress the default.
   */
  leading?: ReactNode;
}

export function Topbar({
  title,
  breadcrumbs,
  actions,
  children,
  leading,
}: TopbarProps) {
  const hasBreadcrumbs = !!breadcrumbs && breadcrumbs.length > 0;
  // The first breadcrumb item that has an href is the parent to navigate back to.
  const parentCrumb = hasBreadcrumbs
    ? breadcrumbs.find((item) => item.href != null)
    : undefined;

  // Default leading: the hamburger trigger. Callers can pass `leading={null}` to suppress.
  const leadingNode = leading === undefined ? <SidebarMobileTrigger /> : leading;

  return (
    <header className={styles.topbar}>
      {leadingNode != null && (
        <div className={styles.leading}>{leadingNode}</div>
      )}
      <div className={styles.titleBlock}>
        {hasBreadcrumbs ? (
          <>
            {/* Desktop: full breadcrumb trail */}
            <span className={styles.breadcrumbDesktop}>
              <Breadcrumb items={breadcrumbs} size="md" />
            </span>
            {/* Mobile: compact back link (only when a parent href exists) */}
            {parentCrumb?.href != null && (
              <Link
                to={parentCrumb.href}
                className={styles.backLink}
                aria-label={`Back to ${String(parentCrumb.label)}`}
              >
                <ChevronLeft size={16} aria-hidden="true" />
                <span>{parentCrumb.label}</span>
              </Link>
            )}
          </>
        ) : (
          title && <h1 className={styles.title}>{title}</h1>
        )}
      </div>
      {children}
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
```

Key decisions:
- `leading === undefined` (prop omitted) → show `<SidebarMobileTrigger />`. `leading === null` (caller explicitly suppresses) → render nothing. Any other value → render that value. This lets existing callers pick up the hamburger for free with zero changes.
- Both `.breadcrumbDesktop` and `.backLink` are always in the DOM; CSS toggles which is visible. This avoids any `useMediaQuery` / JS breakpoint detection.
- `Link` from TanStack Router is used (not `<a>`) so the back navigation participates in client-side routing and doesn't force a full page reload.

#### topbar.module.scss — full replacement

Replace the entire file with the following:

```scss
@use "../../proto-design-system/mixins" as *;

// =============================================================================
// TOPBAR — per-page contextual header
// =============================================================================

.topbar {
  align-items: center;
  backdrop-filter: blur(10px);
  background-color: oklch(from var(--color-background) l c h / 0.85);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  flex-shrink: 0;
  gap: var(--space-3);
  height: var(--space-11);
  justify-content: space-between;
  padding: 0 var(--space-7);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

// Leading slot — contains SidebarMobileTrigger by default.
// On desktop the trigger returns null from its own guard so this container
// collapses to zero width; no layout cost.
.leading {
  align-items: center;
  display: flex;
  flex-shrink: 0;
}

.titleBlock {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-0-5);
  min-width: 0;
}

.title {
  color: var(--color-base-content);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-tight);
  line-height: var(--line-height-tight);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// Desktop breadcrumb — visible on ≥768px, hidden on mobile
.breadcrumbDesktop {
  display: flex;

  @include breakpoint-down("md") {
    display: none;
  }
}

// Mobile back link — hidden on ≥768px, visible on mobile (only when parentCrumb exists)
.backLink {
  align-items: center;
  color: var(--color-muted-content);
  display: none;
  font-size: var(--font-size-sm);
  gap: var(--space-1);
  text-decoration: none;

  @include breakpoint-down("md") {
    display: flex;
  }

  &:hover {
    color: var(--color-base-content);
  }
}

.actions {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: var(--space-3);
}
```

Note: `gap` on `.topbar` changed from `var(--space-5)` (24px) to `var(--space-3)` (12px) because on mobile the leading slot + titleBlock + actions all need to fit within ~375px. On desktop the topbar has ample width so 12px between slots is still comfortable. This is a minor tightening that affects all viewports but stays on-token.

---

### T2 — Layout: remove standalone header row

**Files:**
- `webapp/src/components/Layout/Layout.tsx`
- `webapp/src/components/Layout/Layout.module.scss`

#### Layout.tsx — targeted edit

Remove lines 120–122:

```tsx
// DELETE these three lines:
<header className={styles.header}>
  <SidebarMobileTrigger />
</header>
```

After the edit, the `content` div renders only `<ImpersonationBanner />` and `<main className={styles.main}>{children}</main>`.

Also remove `SidebarMobileTrigger` from the import on line 26 — it is no longer used in this file.

The updated import block (lines 20–28) becomes:

```tsx
import {
  Sidebar,
  SidebarDivider,
  SidebarHeader,
  SidebarItem,
  SidebarLogo,
  SidebarSection,
  SidebarToggle,
} from "@/proto-design-system/components/navigation/Sidebar";
```

#### Layout.module.scss — remove `.header` rule

Remove lines 16–25 (the entire `.header { … }` block):

```scss
// DELETE this block:
.header {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  padding: var(--space-2) var(--space-4);

  &:empty {
    display: none;
  }
}
```

Verify with a grep across the whole webapp `src/` directory that no other file references `styles.header` from this module before deleting. Based on the current codebase, only `Layout.tsx` uses `layout.module.scss`, so it is safe to remove.

---

### T3 — New component: MobileActionBar

**Files:**
- `webapp/src/components/Layout/MobileActionBar.tsx` (new)
- `webapp/src/components/Layout/MobileActionBar.module.scss` (new)

#### MobileActionBar.tsx

```tsx
import type { ReactNode } from "react";
import styles from "./MobileActionBar.module.scss";

export interface MobileActionBarProps {
  /** The primary CTA — always visible, rendered right-most. */
  primary: ReactNode;
  /** Secondary action — rendered left of primary. */
  secondary?: ReactNode;
  /**
   * Overflow trigger — rendered left of secondary.
   * Intended for a DropdownMenu trigger button that opens a menu with
   * less-frequent actions (e.g. Delete, Save draft).
   */
  overflow?: ReactNode;
}

/**
 * Sticky bottom action bar for mobile viewports (<768px).
 * Hidden on desktop via CSS — render it unconditionally alongside the
 * desktop Topbar actions; CSS controls visibility. No JS media query needed.
 */
export function MobileActionBar({
  primary,
  secondary,
  overflow,
}: MobileActionBarProps) {
  return (
    <div className={styles.bar} role="toolbar" aria-label="Post actions">
      <div className={styles.start}>
        {overflow}
        {secondary}
      </div>
      <div className={styles.end}>{primary}</div>
    </div>
  );
}
```

#### MobileActionBar.module.scss

```scss
@use "../../proto-design-system/mixins" as *;

// MobileActionBar — sticky bottom action bar, mobile only.
// Hidden on desktop. Rendered in the DOM always to avoid JS media query.

.bar {
  // Hidden on desktop — shown only below 768px
  display: none;

  @include breakpoint-down("md") {
    align-items: center;
    backdrop-filter: blur(10px);
    background-color: oklch(from var(--color-background) l c h / 0.9);
    border-top: 1px solid var(--color-border);
    bottom: 0;
    display: flex;
    justify-content: space-between;
    left: 0;
    padding: var(--space-3) var(--space-4);
    // Safe-area inset for notched phones (iPhone X+)
    padding-bottom: max(var(--space-3), env(safe-area-inset-bottom));
    position: sticky;
    right: 0;
    width: 100%;
    z-index: var(--z-sticky);
  }
}

.start {
  align-items: center;
  display: flex;
  gap: var(--space-2);
}

.end {
  align-items: center;
  display: flex;
}
```

---

### T4 — Topbar mobile action collapse (CSS helper in topbar.module.scss)

This task adds a CSS utility class `.mobileHidden` to `topbar.module.scss` that hides elements inside `.actions` on mobile. `WizardInner` will apply it to the Delete, Save draft, and Reschedule buttons in the topbar so only Publish remains visible on narrow viewports.

**File:** `webapp/src/components/Layout/topbar.module.scss`

Add after the `.actions` rule:

```scss
// Applied to topbar action buttons that should be hidden on mobile.
// The MobileActionBar provides these actions on <768px instead.
.actionHiddenMobile {
  @include breakpoint-down("md") {
    display: none;
  }
}

// Applied to a topbar action button that should be icon-only on mobile.
// The label text is visually hidden; the aria-label remains for screen readers.
.actionIconOnlyMobile {
  @include breakpoint-down("md") {
    // Hide child text nodes via the button's own label-hiding class if available,
    // or the caller uses aria-label and renders only an icon child on mobile.
    // See WizardInner implementation notes.
    gap: 0;

    span:not([aria-hidden]) {
      display: none;
    }
  }
}
```

Note: T4's SCSS additions are in the same file as T1. These two tasks MUST be done by the same agent or sequentially — do not run T1 and T4 in parallel against `topbar.module.scss`.

**Resolution for plan executor:** Merge T4's additions into T1. The agent executing T1 should include the `.actionHiddenMobile` and `.actionIconOnlyMobile` rules at the end of the file.

---

### T5 — WizardInner: wire MobileActionBar

**File:** `webapp/src/components/create-post/WizardInner.tsx`

**Depends on:** T3 (MobileActionBar component must exist).

This task modifies `WizardInner.tsx` only. No SCSS file in `create-post/` needs to change.

#### Imports to add

Add these two imports near the top of the file (after existing imports):

```tsx
import { MoreHorizontal, Trash2 as Trash2Icon } from "lucide-react";
import { MobileActionBar } from "@/components/Layout/MobileActionBar";
import {
  DropdownMenu,
  type MenuItemData,
} from "@/proto-design-system/components/overlays/DropdownMenu";
```

Note: `Trash2` is already imported on line 2 as `Trash2`. To avoid a name collision with the icon used in a `MenuItemData` `leftIcon`, import it under a second alias `Trash2Icon` only if you need the JSX element in a `MenuItemData.leftIcon`. Alternatively, reuse `<Trash2 size={14} />` inline. Either approach is acceptable — the agent should choose whichever avoids a duplicate identifier error.

`MoreHorizontal` is the overflow trigger icon (three horizontal dots). It is not currently imported in WizardInner; add it to the lucide-react import line.

#### State to add

Add a state variable for the overflow dropdown:

```tsx
const [overflowOpen, setOverflowOpen] = useState(false);
```

#### Refactor `topbarActions`

The existing `topbarActions` block (lines 539–579) already has the four buttons. Apply the `actionHiddenMobile` class from `topbar.module.scss` to Delete, Save draft, and Reschedule — and `actionIconOnlyMobile` to Publish — so that on mobile the topbar shows only the Publish icon.

WizardInner currently imports `styles` from `"./CreatePostWizard.module.scss"`. The topbar style classes live in `topbar.module.scss`. Import that stylesheet under a separate alias:

```tsx
import topbarStyles from "@/components/Layout/topbar.module.scss";
```

Then update `topbarActions`:

```tsx
const topbarActions = readOnly ? undefined : (
  <>
    {canDelete && (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDeleteOpen(true)}
        disabled={busy || deleting}
        aria-label="Delete post"
        className={topbarStyles.actionHiddenMobile}
      >
        <Trash2 size={14} /> Delete
      </Button>
    )}
    <Button
      variant="ghost"
      size="sm"
      onClick={actions.handleSaveDraft}
      isLoading={savingDraft || updatingDraft}
      disabled={busy}
      className={topbarStyles.actionHiddenMobile}
    >
      Save draft
    </Button>
    <Button
      variant="secondary"
      size="sm"
      onClick={() => scheduleDrawer.setScheduleOpen(true)}
      disabled={busy || !canAct}
      className={topbarStyles.actionHiddenMobile}
    >
      <CalendarClock size={14} /> {isScheduled ? "Reschedule" : "Schedule"}
    </Button>
    <Button
      variant="primary"
      size="sm"
      onClick={actions.handlePublish}
      isLoading={state.submitting}
      disabled={busy || !canAct}
      aria-label="Publish"
    >
      <Send size={14} /> Publish
    </Button>
  </>
);
```

The Publish button keeps its text label (the `.actionIconOnlyMobile` class hides the text span in CSS). However, `Button` renders its children directly rather than in a `<span>` wrapper, so the CSS selector `span:not([aria-hidden])` in `.actionIconOnlyMobile` may not target the text node correctly. The simpler, more reliable approach: apply `className={topbarStyles.actionHiddenMobile}` to Delete, Save draft, and Reschedule (hide them entirely on mobile), and leave Publish visible as-is with both icon and text. On a 375px screen with only one button, the label fits. This is the recommended approach — skip the `actionIconOnlyMobile` class on Publish; the plan executor should omit it.

#### Build the overflow menu items

```tsx
const overflowItems: MenuItemData[] = [
  ...(canDelete
    ? [
        {
          id: "delete",
          label: "Delete",
          leftIcon: <Trash2 size={14} />,
          state: (busy || deleting ? "disabled" : "default") as MenuItemData["state"],
          onClick: () => {
            setOverflowOpen(false);
            setDeleteOpen(true);
          },
        } satisfies MenuItemData,
      ]
    : []),
  {
    id: "save-draft",
    label: "Save draft",
    state: (busy || savingDraft || updatingDraft ? "disabled" : "default") as MenuItemData["state"],
    onClick: () => {
      setOverflowOpen(false);
      actions.handleSaveDraft();
    },
  } satisfies MenuItemData,
];
```

#### Build the overflow trigger

```tsx
const overflowTrigger = (
  <div style={{ position: "relative" }}>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setOverflowOpen((prev) => !prev)}
      aria-label="More post actions"
      aria-expanded={overflowOpen}
      aria-haspopup="menu"
    >
      <MoreHorizontal size={16} />
    </Button>
    {overflowOpen && (
      <div
        style={{
          bottom: "100%",
          left: 0,
          marginBottom: "var(--space-1)",
          position: "absolute",
          zIndex: "var(--z-dropdown)",
        }}
      >
        <DropdownMenu
          items={overflowItems}
          onItemClick={(item) => {
            item.onClick?.();
          }}
        />
      </div>
    )}
  </div>
);
```

Note: The inline styles here are positional layout on a container that is not a design surface — this is acceptable per the convention (inline styles are prohibited for "design" values like colour or spacing tokens, but positioning a portal-less absolutely-positioned dropdown does not replace a token). The agent may prefer to extract these into a local SCSS module if it considers this a violation; the only hard constraint is no hardcoded colour or spacing pixel values. The `var(--z-dropdown)` and `var(--space-1)` values are tokens; use them even in inline styles.

#### Render MobileActionBar

In the JSX returned by `WizardInner`, immediately after `<Topbar breadcrumbs={breadcrumbs} actions={topbarActions} />` and before `<div className={styles.page}>`, add:

```tsx
{!readOnly && (
  <MobileActionBar
    primary={
      <Button
        variant="primary"
        size="sm"
        onClick={actions.handlePublish}
        isLoading={state.submitting}
        disabled={busy || !canAct}
        aria-label="Publish post"
      >
        <Send size={14} /> Publish
      </Button>
    }
    secondary={
      <Button
        variant="secondary"
        size="sm"
        onClick={() => scheduleDrawer.setScheduleOpen(true)}
        disabled={busy || !canAct}
        aria-label={isScheduled ? "Reschedule post" : "Schedule post"}
      >
        <CalendarClock size={14} /> {isScheduled ? "Reschedule" : "Schedule"}
      </Button>
    }
    overflow={overflowItems.length > 0 ? overflowTrigger : undefined}
  />
)}
```

This duplicates the onClick handlers but NOT the logic — the same `actions.handlePublish`, `scheduleDrawer.setScheduleOpen`, `setDeleteOpen`, and `actions.handleSaveDraft` functions are referenced by both the topbar buttons and the mobile bar. No business logic is duplicated.

#### Aria-label uniqueness

The Publish button appears in both `topbarActions` and `MobileActionBar`. On mobile, the topbar Publish button's text is visible but the `.actionHiddenMobile` class hides the other three buttons. The MobileActionBar Publish button carries `aria-label="Publish post"` while the topbar Publish button has no explicit `aria-label` (its text "Publish" is the accessible name). On mobile the MobileActionBar Publish button is visible and in the DOM; the topbar Publish button is also in the DOM and focusable. Two focusable "Publish" buttons exist simultaneously in the focus order on mobile. To avoid ambiguity (per `docs/A11Y-PATTERNS.md`):

- Topbar Publish button: add `aria-label="Publish (topbar)"` on mobile — achieved by adding `className={topbarStyles.actionHiddenMobile}` which hides it from view. A visually-hidden button is not removed from the DOM, but it is removed from visual context. Alternatively, wrap the topbar Publish button in a `<span className={topbarStyles.actionHiddenMobile}>` so the button itself is `display:none` and removed from the accessibility tree entirely.

**Recommended approach:** Wrap the entire `topbarActions` fragment in a `<div className={topbarStyles.actionsHiddenOnMobile}>` on mobile — i.e., hide the whole `.actions` slot from the topbar on mobile, and rely entirely on the MobileActionBar. This is the cleanest: no duplication in the accessibility tree.

Add to `topbar.module.scss`:

```scss
// Hide the entire actions slot on mobile when MobileActionBar is present.
// Applied via a class on the wrapper div in WizardInner.
.actionsHiddenOnMobile {
  @include breakpoint-down("md") {
    display: none;
  }
}
```

Then in WizardInner wrap `topbarActions` before passing to `<Topbar>`:

```tsx
<Topbar
  breadcrumbs={breadcrumbs}
  actions={
    readOnly ? undefined : (
      <div className={topbarStyles.actionsHiddenOnMobile}>
        {/* four buttons here, same as before */}
      </div>
    )
  }
/>
```

Wait — `Topbar` renders `{actions && <div className={styles.actions}>{actions}</div>}`. Wrapping in a div inside the `actions` prop is fine; the outer `.actions` flex container holds one child (the wrapper div), which on mobile is `display:none`. This avoids all duplicate-accessible-name concerns entirely.

**Final recommended structure for T5:**

- `topbarActions` contains all four buttons, all without any `actionHiddenMobile` class.
- The caller passes `topbarActions` wrapped in a `<div className={topbarStyles.actionsHiddenOnMobile}>` as the `actions` prop.
- `MobileActionBar` is rendered unconditionally (when `!readOnly`) with its own set of Button instances referencing the same handlers.
- No button is duplicated in the accessibility tree on mobile because the topbar actions wrapper is `display:none`.

Remove the `.actionHiddenMobile` and `.actionIconOnlyMobile` rules from T4/T1 since they are no longer needed. Only `.actionsHiddenOnMobile` is required.

---

### T6 — Playwright E2E: extend posts.spec.ts

**File:** `webapp/e2e/posts.spec.ts`

**Depends on:** T5 (all UI changes must exist for the assertions to pass).

Add a new `test.describe` block at the end of the file (before the closing `});` of the outer `describe("Posts")`). The block uses the `network` fixture from `e2e/fixtures/test.ts` (already imported via `{ expect, test }` at the top of the file).

```ts
// =========================================================================
// Mobile topbar — viewport-specific layout assertions
//
// Verifies:
//   375px: single topbar (no stacked bars), back link visible, Publish
//          reachable, overflow menu contains Delete + Save draft.
//   1280px: all four buttons in topbar, breadcrumb visible, no bottom bar.
// =========================================================================

test.describe("Mobile topbar — 375px viewport", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("edit page renders a single topbar with no stacked header bar", async ({
    page,
  }) => {
    await page.goto("/posts/post_1");
    await page.waitForLoadState("networkidle");

    // Only one <header> element should be visible.
    // Before the fix there were two: Layout's .header and Topbar's <header>.
    const visibleHeaders = page.locator("header:visible");
    await expect(visibleHeaders).toHaveCount(1);
  });

  test("breadcrumb is replaced by a back link on mobile", async ({ page }) => {
    await page.goto("/posts/post_1");
    await page.waitForLoadState("networkidle");

    // Back link must be visible; breadcrumb nav must not be visible.
    const backLink = page.getByRole("link", { name: /back to posts/i });
    await expect(backLink).toBeVisible();

    const breadcrumbNav = page.getByRole("navigation", {
      name: "Breadcrumb",
    });
    await expect(breadcrumbNav).not.toBeVisible();
  });

  test("Publish button is visible in MobileActionBar", async ({ page }) => {
    await page.goto("/posts/post_1");
    await page.waitForLoadState("networkidle");

    // The MobileActionBar Publish button has aria-label "Publish post"
    const publishBtn = page.getByRole("button", { name: /publish post/i });
    await expect(publishBtn).toBeVisible();
  });

  test("Reschedule button is visible in MobileActionBar", async ({ page }) => {
    await page.goto("/posts/post_1");
    await page.waitForLoadState("networkidle");

    const rescheduleBtn = page.getByRole("button", {
      name: /reschedule post|schedule post/i,
    });
    await expect(rescheduleBtn).toBeVisible();
  });

  test("overflow menu opens and shows Delete and Save draft", async ({
    page,
  }) => {
    await page.goto("/posts/post_1");
    await page.waitForLoadState("networkidle");

    const overflowBtn = page.getByRole("button", {
      name: /more post actions/i,
    });
    await expect(overflowBtn).toBeVisible();
    await overflowBtn.click();

    // DropdownMenu renders items in the DOM after click
    await expect(page.getByText("Delete")).toBeVisible();
    await expect(page.getByText("Save draft")).toBeVisible();
  });

  test("topbar action buttons are hidden on mobile", async ({ page }) => {
    await page.goto("/posts/post_1");
    await page.waitForLoadState("networkidle");

    // The topbar actions wrapper has display:none on mobile.
    // The individual buttons inside it should not be visible.
    const saveDraftBtn = page.getByRole("button", { name: /^save draft$/i });
    // There may be more than one match (topbar + bottom bar share label),
    // but the topbar one is inside the hidden wrapper — check none are visible
    // with this specific label at topbar location.
    // Approach: assert the topbar actions container is not visible.
    // The topbar is the first <header> element.
    const topbarActions = page.locator("header").first().locator("[role=toolbar]");
    // WizardInner doesn't put a role=toolbar on the topbar actions — use a
    // more direct locator: the actionsHiddenOnMobile wrapper is a div inside
    // the header's .actions div. Just assert Save draft is not visible.
    await expect(saveDraftBtn).not.toBeVisible();
  });
});

test.describe("Desktop topbar — 1280px viewport", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("all four action buttons are visible in topbar", async ({ page }) => {
    await page.goto("/posts/post_1");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("button", { name: /delete post/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save draft/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /reschedule|schedule/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /publish/i })).toBeVisible();
  });

  test("breadcrumb is visible and back link is hidden on desktop", async ({
    page,
  }) => {
    await page.goto("/posts/post_1");
    await page.waitForLoadState("networkidle");

    const breadcrumbNav = page.getByRole("navigation", {
      name: "Breadcrumb",
    });
    await expect(breadcrumbNav).toBeVisible();

    const backLink = page.getByRole("link", { name: /back to posts/i });
    await expect(backLink).not.toBeVisible();
  });

  test("MobileActionBar is not visible on desktop", async ({ page }) => {
    await page.goto("/posts/post_1");
    await page.waitForLoadState("networkidle");

    // MobileActionBar has role="toolbar" aria-label="Post actions"
    const mobileBar = page.getByRole("toolbar", { name: /post actions/i });
    await expect(mobileBar).not.toBeVisible();
  });

  test("hamburger trigger is not rendered on desktop", async ({ page }) => {
    await page.goto("/posts/post_1");
    await page.waitForLoadState("networkidle");

    // SidebarMobileTrigger returns null when !isMobile, so no button
    // with aria-label "Open menu" should exist in the DOM.
    const hamburger = page.getByRole("button", { name: /open menu/i });
    await expect(hamburger).toHaveCount(0);
  });
});
```

#### Note on the "Save draft" button aria-label

`WizardInner` currently renders the Save draft button without an `aria-label` (its accessible name is its text content "Save draft"). The `overflowItems` array in T5 also creates a menu item with `label: "Save draft"`. On mobile the topbar wrapper is `display:none` so no duplicate accessible button with the name "Save draft" exists — but the `DropdownMenu` renders menu items as `<li>` elements (not buttons), so there is no collision. The E2E test asserting `not.toBeVisible()` for `saveDraftBtn` should pass on mobile because the wrapping div is `display:none`.

---

## Verification Checklist

The executor (frontend-supervisor) must run all of these in sequence after writing the code:

1. `cd /Users/shubh/Workspaces/growth-tools/.worktrees/mobile-topbar/webapp && npm run build` — must exit 0 (no TypeScript errors, no Vite errors).
2. `cd /Users/shubh/Workspaces/growth-tools/.worktrees/mobile-topbar/webapp && npm run lint` — Biome must report 0 errors.
3. `cd /Users/shubh/Workspaces/growth-tools/.worktrees/mobile-topbar/webapp && npm run lint:scss` — Stylelint must report 0 errors.
4. Playwright: `cd /Users/shubh/Workspaces/growth-tools/.worktrees/mobile-topbar/webapp && npx playwright test e2e/posts.spec.ts` — all tests (including the new mobile/desktop viewport blocks) must pass.

---

## Ambiguities Requiring Human Confirmation

**None are blocking** — the plan is complete enough to execute. One item of judgment has been made explicit:

1. **Publish button in topbar on mobile**: The plan chooses to hide the entire topbar `actions` slot on mobile (via `actionsHiddenOnMobile`) and rely solely on `MobileActionBar`. This means the topbar will show only the hamburger + back-link on mobile — no Publish button in the topbar. All four actions move to the bottom bar. If the user prefers to keep Publish visible in the topbar on mobile as well (an additional tap target), a `breakpoint-down("md")` rule could be added to show it — but this reintroduces the duplicate-accessible-name problem. The plan's choice is the accessible-safe option.

2. **`DropdownMenu` positioning without a portal**: The overflow dropdown is positioned absolutely inside a `position: relative` container in the MobileActionBar's `.start` div. If the MobileActionBar is near the top of the viewport on very short screens (unlikely — it is at the bottom), the dropdown may clip. The plan uses `bottom: 100%` (opens upward) which is correct for a bottom bar. No portal (`createPortal`) is used — this is consistent with how `DropdownMenu` is used elsewhere in the codebase.
