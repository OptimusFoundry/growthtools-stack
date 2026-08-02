# Design System Reconciliation (saas-template → growth-tools) Implementation Plan

**Goal:** Pull genuine upstream design-system improvements from `saas-template/main` into `webapp/src/proto-design-system/` while preserving every Growth-Tools-specific customization (editorial/Fraunces branding, hand-tuned theme palettes, a11y fixes, GT-built components).
**Scope:** frontend-only, strictly limited to `webapp/src/proto-design-system/`. Do not touch `webapp/src/routes/`, `webapp/src/features/`, `docs/design-docs/`, or any of the ~131 generic SaaS-scaffolding files (teams, API keys, webhooks, integrations, tier-limits) that only exist upstream — those are explicitly excluded per project memory ("Frontend stripped — old features removed").

**Remotes available:** `saas-template` remote already added and fetched (shallow, depth=1) — `saas-template/main` resolves to commit `7782f0cf4c9d2f3e375a70ed123a5f5c99bdaef3` (2026-08-02). This is a single squashed commit on top of the template's prior history (shallow fetch), titled **"feat(design-system): sync themes, motion system, and component fixes from TickUpToks (#24)"**. Its own commit message states it is scoped to `webapp/src/proto-design-system`, `docs/design-docs`, `webapp/docs/DESIGN-GUIDELINES.md`, and `webapp/.storybook`, and claims "no product-specific code included" — **this claim is false for our purposes**: it silently carries TickUpToks' own typography rebrand (retiring Fraunces) into the shared component tree. That rebrand must not be pulled into Growth Tools. See Conflict C1 below.

---

## Verified file inventory (ground truth, re-derived and confirmed)

Counts confirmed by diffing `HEAD:webapp/src/proto-design-system/` against `saas-template/main:webapp/src/proto-design-system/`:

- **56 files exist only in our repo** — every one of them is a per-component `index.ts` barrel re-export file (e.g. `components/primitives/Button/index.ts`, plus the top-level `index.ts`). Template does not use per-folder barrels at all. **These must never be deleted or overwritten** — see Preserve list below.
- **60 files exist only in `saas-template/main`** — new components and infra, purely additive. See Additive list below.
- **198 files exist on both sides with differing content.** Verified — not a "we're behind" situation; changes run in both directions.

Total: 56 + 60 + 198 = 314 files that differ between the two trees (matches `git diff --stat` file count exactly).

---

## Architecture Summary

### What we pull in as-is (additive, ~60 files)
New components (`DataTable`, `PageHero`, `PageShell`, `SectionHeader`, `GridItem`, `ThemeSwitcherGrid`), a new `motion.ts` + `MotionProvider` system, 5 new theme files (`chalk`, `ember`, `mono`, `oat`, `whisper`), `utils/parseMotionTokens.ts`, `utils/responsive.ts`, and the `UIKit.stories.tsx`/`showcase/**` catalog. All net-new, no existing behavior to preserve.

### What we explicitly reject (real conflicts, keep our behavior)
1. **Typography system** — template/TickUpToks retired Fraunces entirely in favor of a single Geist sans family, rescaled every font-size token, and rewrote `--fvs-*` variable-font settings as no-ops. This directly contradicts `docs/design-docs/00-overview.md` ("editorial, serif-forward... Fraunces... Never render a big number in a sans font") and root `CLAUDE.md`'s explicit branding. **Reject `tokens/_typography.scss` wholesale.** This is the single biggest driver of the ~198-file diff count — most theme files and several component files carry cascading font-family/font-size hunks from this rebrand that must also be rejected.
2. **`ThemeProvider.tsx` default theme** — template defaults to `"light"` and migrates any stored `"editorial"` value away. We deliberately default to `"editorial"` (capture-worker rendering depends on it). Reject.
3. **`ThemeProvider.tsx` dark-toggle target** — template cycles `toggleTheme`/`useSystemTheme` to `"carbon"` instead of `"dark"`. No evidence this is a correctness fix (both are configured theme names); reject, keep `"dark"`.
4. **`--focus-ring-width`** — template reverts `3px` → `2px`. Git-blame shows our `3px` came from commit `328385b` ("port tokens... from SingaporeAtmosphere v7"), not a deliberate GT a11y hardening commit, and 3px still satisfies template's own cited floor ("WCAG 3.0/2.2 SC 2.4.13 floor" — a *minimum*, and 3 ≥ 2). No `chore/aria-label-hygiene` commit touches this line. Reject the revert, keep `3px`.
5. **Half-step spacing tokens removed** (`--space-0-5`, `--space-1-5`, `--space-2-5`, `--space-3-5`) — template's `_spacing.scss` deletes these. Confirmed via grep: **16 files outside `proto-design-system` and 28 files inside it still reference them.** Deleting would silently break spacing (invalid CSS var references, no build error). Reject the removal; keep all four tokens.
6. **Primitive size-class naming** (`styles[size]` → `` styles[`size-${size}`] ``) — appears in `Button.tsx`, `Avatar.tsx`, `Badge.tsx`, `Tag.tsx`, `Spinner.tsx` (each paired with a matching class rename in the `.module.scss`, e.g. `.sm` → `.size-sm`). Purely a naming-convention difference, no behavior change, and adopting it means touching 5+ component pairs for zero functional gain. Reject — keep our current class names on both sides of each pair (do not adopt either the `.tsx` or the `.module.scss` half of this change).
7. **`FilterTabs` default size** — template changed the default `size` prop from `"sm"` to `"md"`. Our two callers (`webapp/src/routes/blog.tsx:75`, `webapp/src/routes/posts.tsx:75`) both omit the `size` prop and rely on the default. Adopting the new default would silently resize both pages. Reject the default change; keep `size = "sm"`.

### What we selectively merge (append new capability, keep our values)
- `tokens/_colors.scss` — append 5 new CSS custom properties (listed below); do not touch `--focus-ring-width`.
- `tokens/_breakpoints.scss` — append new `2xl` container-query size + 5 new `--container-*` CSS vars; purely additive.
- `tokens/_motion.scss` — append `--duration-ambient: 1500ms`; purely additive.
- `tokens/_spacing.scss` — append the 8 new `--page-*` layout tokens (needed by the new `PageShell`/`PageHero`); do **not** take the half-step token removal (Conflict 5) or the comment-only prose changes.
- `themes/themes.ts` — add the 5 new theme registry entries (`oat`, `ember`, `mono`, `whisper`, `chalk`) and the 2 new `ThemeName` union members not already covered by those 5 (none — all 5 new names are exactly the 5 new theme files). **Do not** adopt the `googleFontsHref` field/`syncThemeFonts()` mechanism or add `googleFontsHref` to any existing theme (including `editorial`, which the template points at "Familjen Grotesk" — not Fraunces/Geist). This is the same typography rebrand as Conflict C1 wearing a different hat; treat as part of that rejection.
- Each of the 35 pre-existing `themes/_*.scss` files — **do not bulk-copy.** Each file bundles up to three orthogonal kinds of change (verified on `_fog.scss` as a representative sample): (a) the Fraunces→Geist font-family rebrand (reject), (b) targeted WCAG contrast repairs to specific color tokens done via `node scripts/theme-contrast-check.mjs` upstream (case-by-case — see per-theme procedure below), (c) new per-theme motion "spring" tokens (`--spring-gentle`, `--spring-stiff`, `--spring-slow`, `--spring-bouncy`, `--ease-bounce`) that only matter if we adopt the motion system for that theme (additive, safe to append). Procedure spelled out in Task F5.

### What we adopt wholesale (motion/layout capability upgrade, low risk)
`Stack.tsx` (adds `Responsive<T>` props + container queries + stagger motion via the new `motion.ts`/`MotionProvider`), `Card.tsx` (adds `onContextMenu` prop), `Sidebar.tsx` (renames `.sectionTitle`→`.navSectionLabel` class, adds `target`/`rel` props with safe `rel="noopener noreferrer"` default), `DataGrid.tsx` (switches to `@/` path-alias imports, no logic change), `Modal.tsx`, `DropdownMenu.tsx`, `Tabs.tsx`, `StepIndicator.tsx` — these consume the new motion infra and add genuine capability with no product-identity conflict. `FilterTabs` gets the new `"lg"` size variant and token polish (`--color-primary-hover` instead of computed `oklch(from ...)`, `--border-width-sm`) while keeping our `"sm"` default (Conflict 7).

All `*.stories.tsx` files get one mechanical, safe fix: `@storybook/react` → `@storybook/react-vite` import (see Task F2 — matches our own already-configured Storybook framework, which is `@storybook/react-vite` per `webapp/.storybook/main.js`; every one of our 57 stories currently imports the wrong package name for `Meta`/`StoryObj` types).

---

## Preserve list — 56 files that must NOT be deleted or overwritten

These exist only in our tree. Template does not have per-component barrel files at all. When copying any template component directory wholesale (Task F4/F5), you MUST re-add the local `index.ts` file afterward if the copy step deleted it.

```
components/composite/Accordion/index.ts
components/composite/DatePicker/index.ts
components/composite/FileUpload/index.ts
components/composite/MultiSelect/index.ts
components/data/DataGrid/index.ts
components/data/EmptyState/index.ts
components/data/FilterTabs/index.ts
components/data/List/index.ts
components/data/StatCard/index.ts
components/data/Table/index.ts
components/feedback/Alert/index.ts
components/feedback/Banner/index.ts
components/feedback/BannerCenter/index.ts
components/feedback/Progress/index.ts
components/feedback/Toast/index.ts
components/forms/Checkbox/index.ts
components/forms/FormField/index.ts
components/forms/FormHint/index.ts
components/forms/Input/index.ts
components/forms/Label/index.ts
components/forms/Radio/index.ts
components/forms/Select/index.ts
components/forms/Slider/index.ts
components/forms/Stepper/index.ts
components/forms/Switch/index.ts
components/forms/TextArea/index.ts
components/forms/TextField/index.ts
components/layout/AspectRatio/index.ts
components/layout/Card/index.ts
components/layout/Container/index.ts
components/layout/Divider/index.ts
components/layout/Grid/index.ts
components/layout/PageTransition/index.ts
components/layout/Stack/index.ts
components/navigation/Breadcrumb/index.ts
components/navigation/CommandPalette/index.ts
components/navigation/Navbar/index.ts
components/navigation/Pagination/index.ts
components/navigation/Sidebar/index.ts
components/navigation/StepIndicator/index.ts
components/navigation/Tabs/index.ts
components/overlays/Drawer/index.ts
components/overlays/Dropdown/index.ts
components/overlays/DropdownMenu/index.ts
components/overlays/Modal/index.ts
components/overlays/Popover/index.ts
components/overlays/Tooltip/index.ts
components/primitives/Avatar/index.ts
components/primitives/Badge/index.ts
components/primitives/Button/index.ts
components/primitives/Icon/index.ts
components/primitives/Skeleton/index.ts
components/primitives/Spinner/index.ts
components/primitives/Tag/index.ts
components/primitives/Text/index.ts
index.ts
```
(all paths relative to `webapp/src/proto-design-system/`)

---

## Additive list — 60 files, copy verbatim from `saas-template/main`

For each file below, run:
```bash
git show saas-template/main:webapp/src/proto-design-system/<path> > webapp/src/proto-design-system/<path>
```
Create parent directories with `mkdir -p` first where the directory doesn't exist yet (e.g. `components/composite/ThemeSwitcherGrid/`, `components/layout/PageHero/`, `components/layout/PageShell/`, `components/layout/GridItem/`, `showcase/foundations/`, `showcase/specimens/`).

```
UIKit.module.scss
UIKit.stories.tsx
components/composite/ThemeSwitcherGrid/ThemeSwitcherGrid.module.scss
components/composite/ThemeSwitcherGrid/ThemeSwitcherGrid.stories.tsx
components/composite/ThemeSwitcherGrid/ThemeSwitcherGrid.tsx
components/data/DataTable/DataTable.module.scss
components/data/DataTable/DataTable.stories.tsx
components/data/DataTable/DataTable.tsx
components/data/FilterTabs/FilterTabs.stories.tsx
components/forms/Stepper/Stepper.stories.tsx
components/layout/GridItem/GridItem.module.scss
components/layout/GridItem/GridItem.tsx
components/layout/PageHero/PageHero.module.scss
components/layout/PageHero/PageHero.stories.tsx
components/layout/PageHero/PageHero.tsx
components/layout/PageShell/PageShell.module.scss
components/layout/PageShell/PageShell.stories.tsx
components/layout/PageShell/PageShell.tsx
components/layout/SectionHeader/SectionHeader.module.scss
components/layout/SectionHeader/SectionHeader.stories.tsx
components/layout/SectionHeader/SectionHeader.tsx
components/overlays/Drawer/Drawer.stories.tsx
motion.ts
showcase/Compositions.module.scss
showcase/Compositions.tsx
showcase/FinancialDashboard.module.scss
showcase/FinancialDashboard.stories.tsx
showcase/foundations/contrast.ts
showcase/foundations/Foundations.module.scss
showcase/foundations/Foundations.tsx
showcase/foundations/TypeAudit.module.scss
showcase/foundations/TypeAudit.tsx
showcase/Hero.module.scss
showcase/Hero.tsx
showcase/SizeLab.module.scss
showcase/SizeLab.tsx
showcase/SizeToggle.module.scss
showcase/SizeToggle.tsx
showcase/Spec.module.scss
showcase/Spec.tsx
showcase/specimens/Composite.tsx
showcase/specimens/Data.tsx
showcase/specimens/Feedback.tsx
showcase/specimens/Forms.tsx
showcase/specimens/Layout.tsx
showcase/specimens/Navigation.tsx
showcase/specimens/Overlays.tsx
showcase/specimens/Primitives.tsx
showcase/ThemeSwitcher.module.scss
showcase/ThemeSwitcher.tsx
showcase/Watermark.module.scss
showcase/Watermark.tsx
themes/_chalk.scss
themes/_ember.scss
themes/_mono.scss
themes/_oat.scss
themes/_whisper.scss
themes/themeGlobalContext.ts
utils/parseMotionTokens.ts
utils/responsive.ts
```

**Caveat for `themes/_chalk.scss`, `_ember.scss`, `_mono.scss`, `_oat.scss`, `_whisper.scss`:** these are brand-new theme files (no GT customization exists to lose), but they were authored under the TickUpToks Geist-only typography system. After copying verbatim, grep each for `--font-family-serif`/`--font-family-display` — if either references anything other than a real font (i.e. is an alias to `--font-family-sans` per the rebrand), leave as-is; these 5 themes never had Fraunces to begin with so there's nothing to restore. Do not add `googleFontsHref` support for them (Task F1 explicitly excludes the font-loading mechanism), so any `googleFontsHref` field present in `themes.ts` for these 5 must be stripped when merging Task F1 below.

**Caveat for `components/composite/ThemeSwitcherGrid` and `components/layout/PageHero`/`PageShell`/`SectionHeader`/`GridItem`/`DataTable`:** after copying, run `npm run build` (Task F8) — these are new files with no existing local variant, but they may import sibling primitives via relative paths (`../../primitives/...`) or the `@/` alias; both resolve correctly in our repo since the alias (`"@/*": ["./src/*"]`) already exists in `webapp/tsconfig.json:26` and the relative directory structure is identical. No import-path fixes should be needed, but verify with the build step.

---

## Named Conflicts — full detail (for Task F3)

### Conflict C1 — Typography / Fraunces retirement (REJECT)
**File:** `webapp/src/proto-design-system/tokens/_typography.scss`
**Decision:** Do not copy this file. Keep 100% of our current `tokens/_typography.scss` unchanged.
**Reasoning:** Template retired Fraunces (`--font-family-serif`/`--font-family-display` become aliases of `--font-family-sans`), rescaled every `--font-size-*` token down (e.g. page titles 36px→22px per the diff's own comment, hero 64px→32px), and reduced `--fvs-display`/`--fvs-editorial`/`--fvs-tight` to no-op weight-only values. This is TickUpToks' own rebrand, carried into the shared template — it directly contradicts `docs/design-docs/00-overview.md` rule #1 ("Oversized Fraunces numerals are the signature... Never render a big number in a sans font") and the root `CLAUDE.md` description of our design system as "editorial serif-forward (Fraunces + Geist)".
**Verification step:** after all other merges land, run `grep -rn "font-family-display\|font-family-serif" webapp/src/proto-design-system/tokens/_typography.scss` and confirm both still resolve to `"Fraunces", ...` (not `var(--font-family-sans)`).

### Conflict C2 — ThemeProvider default theme + dark toggle target (REJECT)
**File:** `webapp/src/proto-design-system/context/ThemeProvider.tsx`
**Decision:** Keep our version unchanged. Do not adopt any of the 3 hunks below.
**Full diff for reference (do not apply):**
```diff
-	defaultTheme = "editorial",
+	defaultTheme = "light",
...
+			if (stored === "editorial") {
+				return "light";
+			}
...
-		setThemeState((current) => (current === "dark" ? "light" : "dark"));
+		setThemeState((current) =>
+			themes[current].colorScheme === "dark" ? "light" : "carbon",
+		);
...
-		setThemeState(systemTheme === "dark" ? "dark" : "light");
+		setThemeState(systemTheme === "dark" ? "carbon" : "light");
```
**Reasoning:** `defaultTheme = "editorial"` is deliberate — the capture-worker (per project memory `project_capture_pipeline.md`) renders pages using the editorial theme and depends on it being the default. The `"light"` migration would actively rewrite any persisted `"editorial"` localStorage value away. The `"carbon"` dark-toggle target has no stated rationale beyond a personal preference change in the same commit; no regression evidence exists for `"dark"`.
**Verification step:** `grep -n 'defaultTheme = "editorial"' webapp/src/proto-design-system/context/ThemeProvider.tsx` must still match after the reconciliation lands.

### Conflict C3 — `--focus-ring-width` (REJECT the revert)
**File:** `webapp/src/proto-design-system/tokens/_colors.scss`
**Decision:** Keep `--focus-ring-width: 3px;`. Do not change to `2px`.
**Reasoning:** `git log -L '/--focus-ring-width/,+1:webapp/src/proto-design-system/tokens/_colors.scss'` shows the `3px` value was introduced in commit `328385b` ("style(design-system): update tokens, themes, and component styles from SingaporeAtmosphere v7") — i.e. it came from a shared upstream sync, not a deliberate GT a11y hardening. The `chore/aria-label-hygiene` branch does not touch this line (verified: `git log --all --oneline --grep="focus-ring" -i` shows no hits on that branch). Template's own comment calls `2px` "WCAG 3.0/2.2 SC 2.4.13 floor" — a *minimum* requirement, and `3px` exceeds it, so nothing is broken by keeping `3px`.

### Conflict C4 — Half-step spacing tokens (REJECT the removal)
**File:** `webapp/src/proto-design-system/tokens/_spacing.scss`
**Decision:** Keep `--space-0-5: 2px;`, `--space-1-5: 6px;`, `--space-2-5: 10px;`, `--space-3-5: 14px;`. Do not delete them even though template's diff removes them.
**Reasoning:** `grep -rl "space-0-5\|space-1-5\|space-2-5\|space-3-5" webapp/src --include="*.scss"` returns 16 hits outside `proto-design-system/` and 28 inside it. Deleting the tokens produces invalid `var()` references with no build-time error — a silent visual regression across dozens of files.

### Conflict C5 — Primitive size-class naming (REJECT, cosmetic no-op)
**Files:** `components/primitives/Button/Button.tsx` + `Button.module.scss`, `components/primitives/Avatar/Avatar.tsx` + (module.scss), `components/primitives/Badge/Badge.tsx`, `components/primitives/Tag/Tag.tsx`, `components/primitives/Spinner/Spinner.tsx` (each has a matching `.module.scss` class rename).
**Decision:** Keep our current `styles[size]` (or `styles[size === "2xl" ? "size-2xl" : size]` for Avatar's one special case) and our current `.sm`/`.md`/`.lg` class names in every `.module.scss`. Do not adopt `` styles[`size-${size}`] `` or rename any CSS class.
**Reasoning:** No functional difference — purely a naming-convention preference on template's side. Adopting it means touching 5 component/style pairs for zero behavior change and increases merge blast radius for no benefit.
**Verification step:** confirm `grep -n "styles\[size\]" webapp/src/proto-design-system/components/primitives/Button/Button.tsx` still matches (i.e. unchanged) after reconciliation.

### Conflict C6 — FilterTabs default size (REJECT the default change, ADOPT the rest)
**File:** `webapp/src/proto-design-system/components/data/FilterTabs/FilterTabs.tsx` and `FilterTabs.module.scss`
**Decision:** Apply the merge below — take everything except the default-size change.

In `FilterTabs.tsx`:
```diff
-export type FilterTabsSize = "sm" | "md";
+export type FilterTabsSize = "sm" | "md" | "lg";
```
(adopt — adds capability, no behavior change for existing callers)
```diff
 	size = "sm",   // KEEP THIS — do NOT change to "md"
```
(reject the default-value change; template changes this line to `size = "md"`)

In `FilterTabs.module.scss`, adopt these hunks verbatim (all additive/polish, no default-size dependency):
```scss
.tab {
  /* ... existing rules ... */
  border: var(--border-width-sm) solid var(--color-border); /* was: 1px solid */
}

.tabActive:hover {
  background-color: var(--color-primary-hover);   /* was: oklch(from var(--color-primary) calc(l - 0.05) c h) */
  border-color: var(--color-primary-hover);        /* was: oklch(from var(--color-primary) calc(l - 0.05) c h) */
  color: var(--color-primary-content);
}

.count {
  color: inherit;
  opacity: 0.7;   /* was: 0.65 — reorder opacity above font-family/size per template, cosmetic */
  font-family: var(--font-family-mono, var(--font-family-sans));
  font-size: var(--font-size-xs);
  letter-spacing: var(--letter-spacing-wider);
}

/* NEW — add this block, does not exist locally */
.size-lg {
  .tab {
    font-size: var(--font-size-lg);
    height: var(--space-8);
    padding: 0 var(--space-5);
  }

  .count {
    font-size: var(--font-size-base);
  }
}
```
**Reasoning:** Our two current callers (`webapp/src/routes/blog.tsx:75`, `webapp/src/routes/posts.tsx:75`) both render `<FilterTabs value={...} onChange={...} items={...} aria-label="..." />` with no explicit `size` prop, relying on the default. Changing the default from `"sm"` to `"md"` would silently resize both pages. The `"lg"` variant and token polish are additive and carry no such risk.
**Verification step:** `grep -n "size = " webapp/src/proto-design-system/components/data/FilterTabs/FilterTabs.tsx` must show `"sm"`.

---

## Backend Tasks
None — this is a frontend-only reconciliation.

---

## Frontend Tasks

### F1: Merge `tokens/_colors.scss` — append 5 new CSS custom properties
**File:** `webapp/src/proto-design-system/tokens/_colors.scss`
**Action:** Manually edit. In the `// Focus ring` section, add one new line (do NOT change the existing `--focus-ring-width: 3px;` line — Conflict C3):
```scss
	--focus-ring-error:  oklch(from var(--color-error) l c h / 0.2);
```
Immediately after the existing overlay lines (`--color-active-overlay`, `--color-selected-overlay`), add:
```scss
	// Hover overlay for use ON filled/colored surfaces (where a dark-ink overlay
	// would be invisible) — e.g. a dismiss button on a filled banner.
	--color-hover-overlay-on-color: oklch(100% 0 0 / 0.15);

	// Primary-tinted overlays — the canonical "selected" row/option treatment.
	--color-overlay-primary:        oklch(from var(--color-primary) l c h / 0.10);
	--color-overlay-primary-strong: oklch(from var(--color-primary) l c h / 0.15);
	// Error-tinted overlay — destructive item hover.
	--color-overlay-error:          oklch(from var(--color-error) l c h / 0.10);
```
**Verification:** `grep -n "focus-ring-width" webapp/src/proto-design-system/tokens/_colors.scss` still shows `3px`.

### F2: Merge `tokens/_breakpoints.scss` — append container tokens
**File:** `webapp/src/proto-design-system/tokens/_breakpoints.scss`
**Action:** In the `$container-query-sizes` Sass map, add one entry after `"xl": 700px,`:
```scss
  "2xl": 800px,
```
In the `:root` block, after the existing `--max-width-*` tokens, add:
```scss
  // Container max-widths (CSS mirror of the $containers Sass map above).
  // Consumed by layout/Container and navigation/Navbar.
  --container-sm:  40rem;     // 640px
  --container-md:  48rem;     // 768px
  --container-lg:  64rem;     // 1024px
  --container-xl:  80rem;     // 1280px
  --container-2xl: 87.5rem;   // 1400px
```

### F3: Merge `tokens/_motion.scss` — append ambient duration
**File:** `webapp/src/proto-design-system/tokens/_motion.scss`
**Action:** After the existing `--duration-page: 350ms;` line, add:
```scss
	// Ambient/looping durations (infinite animations, not state transitions) --
	--duration-ambient: 1500ms;
```

### F4: Merge `tokens/_spacing.scss` — append page-layout tokens (no half-step removal)
**File:** `webapp/src/proto-design-system/tokens/_spacing.scss`
**Action:** Keep every existing line (including `--space-0-5`, `--space-1-5`, `--space-2-5`, `--space-3-5` — Conflict C4). At the end of the `:root` block (after the existing `--gap-xl` line), add:
```scss
	// Page-level layout tokens (Phase 0.6) ----------------------------------------
	// Stable canonical values for all PageShell instances. Gutter kept at 24px
	// (var(--space-5)) to avoid any visual regression on existing pages.
	--page-max-width:        var(--max-width-7xl);   // 1280px  (default variant)
	--page-max-width-narrow: var(--max-width-5xl);   // 1024px  (narrow variant)
	--page-gutter-x:         var(--space-5);          // 24px  — sides
	--page-gutter-y-top:     var(--space-5);          // 24px  — top (matches un-migrated pages)
	--page-gutter-y-bottom:  var(--space-6);          // 32px  — bottom (slight scroll affordance)
	--page-section-gap:      var(--space-8);          // 48px  — between PageShell Grid rows
	--page-grid-gap:         var(--space-5);          // 24px  — column gap in 12-col grid
```
**Verification:** `grep -n "space-0-5\|space-1-5\|space-2-5\|space-3-5" webapp/src/proto-design-system/tokens/_spacing.scss` still returns 4 matches.

### F5: Merge `themes/themes.ts` — add 5 new theme registry entries, no font-loading mechanism
**File:** `webapp/src/proto-design-system/themes/themes.ts`
**Action:**
1. In the `ThemeName` union type, add the 5 new names (insert `"oat"`, `"ember"`, `"mono"` after `"light"` and before `"dark"`; add `"whisper"` and `"chalk"` at the end before the closing `;`, matching where the additive theme files sit alphabetically is not required — order doesn't matter functionally, but keep them grouped with the rest of the union for readability):
```ts
export type ThemeName =
	| "editorial"
	| "light"
	| "oat"
	| "ember"
	| "mono"
	| "dark"
	// ... (all existing entries unchanged) ...
	| "zen"
	| "whisper"
	| "chalk";
```
2. In the `themes` registry object, add exactly these 5 entries (no `googleFontsHref` field — that mechanism is rejected, see below). Insert `oat`/`ember`/`mono` near `light`/`dark`, and `whisper`/`chalk` at the end:
```ts
	oat: { name: "oat", label: "Oat", colorScheme: "light" },
	ember: { name: "ember", label: "Ember", colorScheme: "light" },
	mono: { name: "mono", label: "Mono", colorScheme: "light" },
	// ... existing entries unchanged ...
	whisper: { name: "whisper", label: "Whisper", colorScheme: "light" },
	chalk: { name: "chalk", label: "Chalk", colorScheme: "light" },
```
3. **Do NOT** add the `googleFontsHref?: string` field to the `Theme` interface, the `syncThemeFonts()` function, or the `syncThemeFonts(theme)` call inside `applyTheme()`. **Do NOT** add `googleFontsHref` values to any theme entry, including the 5 new ones. This is part of Conflict C1 (TickUpToks' typography rebrand) — the template's own `editorial` theme entry would get `googleFontsHref` pointing at "Familjen Grotesk" (not Fraunces), which would silently override our house Fraunces/Geist stack via a dynamically-injected `<link>` tag if the mechanism were adopted even partially.
**Verification:** `grep -n "googleFontsHref" webapp/src/proto-design-system/themes/themes.ts` must return zero matches after this task.

### F6: Per-theme SCSS files (35 files) — token-by-token merge procedure
**Files:** every `webapp/src/proto-design-system/themes/_*.scss` file that exists on both sides (all except the 5 new ones added in the Additive list): `_aqua.scss`, `_archive.scss`, `_bioluminescent.scss`, `_blueprint.scss`, `_botanical.scss`, `_brutal.scss`, `_candy.scss`, `_carbon.scss`, `_citrus.scss`, `_claude.scss`, `_clinic.scss`, `_concrete.scss`, `_cosmos.scss`, `_cyberpunk.scss`, `_dark.scss`, `_editorial.scss`, `_flux.scss`, `_fog.scss`, `_forest-light.scss`, `_forest.scss`, `_glow.scss`, `_lavender.scss`, `_light.scss`, `_marble.scss`, `_matrix.scss`, `_mercury.scss`, `_midnight.scss`, `_monochrome.scss`, `_moss.scss`, `_neon.scss`, `_ocean.scss`, `_paper.scss`, `_pixel.scss`, `_plasma.scss`, `_porcelain.scss`, `_punk.scss`, `_radio.scss`, `_riso.scss`, `_sunset.scss`, `_terminal.scss`, `_vinyl.scss`, `_zen.scss`, `theme.scss`.

**Do not bulk-copy any of these files.** Each bundles up to 3 orthogonal kinds of change. For each file, run `git diff HEAD saas-template/main -- webapp/src/proto-design-system/themes/<file>` and apply this triage to every hunk:

1. **Reject any hunk that touches `--font-family-sans`, `--font-family-mono`, `--font-family-serif`, `--font-family-display`, or any `googleFontsHref`-adjacent line.** This is Conflict C1. Keep our existing font-family lines unchanged.
2. **Case-by-case: hunks that change an existing color token's value** (e.g. `_fog.scss`'s change of `--color-muted` from `72%` to `60%` L, `--color-border` from `85%` to `83%` L, `--color-accent-content`/`--color-warning-content` darkened) — these are targeted WCAG contrast repairs from an upstream script (`scripts/theme-contrast-check.mjs`, referenced in the `_fog.scss` comment header). Before accepting any such value change:
   - Run `git log --oneline -- webapp/src/proto-design-system/themes/<file>` and check whether GT has an independent commit already tuning that exact token in that theme (our history shows extensive manual tuning commits for `fog`, `porcelain`, `glow`, e.g. `2e41ec4 porcelain: pull error red away from primary citrus`, `c3f96cd porcelain: crank the button/accent chroma`, `8f05930`–`cc23268` for `glow`).
   - If GT has never touched that specific token in that specific theme, accept the template's new value (it's a real contrast fix).
   - If GT has an independent commit touching that token, **reject** the template value and keep GT's — flag it in the PR description as "contrast fix available upstream but superseded by GT's own tuning at commit `<hash>`" so a human can decide whether to re-run the a11y check against GT's current value later.
   - **New tokens with no existing equivalent** (e.g. `_fog.scss` gains `--color-text-disabled` — absent everywhere in our tree today) are always safe to accept — no existing value to lose. Add these as new lines in the corresponding theme file.
3. **Accept any hunk that only adds new motion "spring" tokens** (`--spring-gentle`, `--spring-stiff`, `--spring-slow`, `--spring-bouncy`, `--ease-bounce`, or similar) — these are additive per-theme motion personality values consumed only by the new `motion.ts`/`MotionProvider` system (Additive list) and have no existing GT value to conflict with. Accept verbatim including the explanatory comment block above them (useful documentation of the design intent).
4. **Accept any purely additive new selector or property with no existing equivalent** (radius/shadow/depth-ladder additions mentioned in the sync commit message) that isn't a font-family change.

This is inherently a per-file, per-token task — do not attempt a single mechanical script across all 35 files. Budget roughly 5–10 minutes per theme file. Prioritize `_fog.scss`, `_porcelain.scss`, `_glow.scss`, `_editorial.scss`, `_light.scss`, `_dark.scss`, `_carbon.scss` first (these have the largest diffs and the richest GT tuning history); the remaining ~28 themes have smaller diffs (mostly just the font-family rebrand, which is a flat reject with nothing else to merge) — for any theme file where `git diff HEAD saas-template/main -- webapp/src/proto-design-system/themes/<file>` shows **only** font-family hunks (no color-token or spring-token hunks), skip it entirely (reject wholesale, zero-effort).

### F7: Adopt motion/layout capability components wholesale
**Files (copy content, i.e. `git show saas-template/main:webapp/src/proto-design-system/<path> > webapp/src/proto-design-system/<path>`, then re-verify the paired `index.ts` from the Preserve list still exists):**
- `components/layout/Stack/Stack.tsx` + `Stack.module.scss` + `Stack.stories.tsx`
- `components/layout/Card/Card.tsx` (adds `onContextMenu` prop only — additive)
- `components/navigation/Sidebar/Sidebar.tsx` + `Sidebar.module.scss` + `Sidebar.stories.tsx` (class rename `.sectionTitle`→`.navSectionLabel`, adds `target`/`rel` props)
- `components/data/DataGrid/DataGrid.tsx` (import-path style only, no logic change) + `DataGrid.module.scss` + `DataGrid.stories.tsx`
- `components/overlays/Modal/Modal.tsx` + `Modal.module.scss` + `Modal.stories.tsx`
- `components/overlays/DropdownMenu/DropdownMenu.tsx` + `DropdownMenu.module.scss` + `DropdownMenu.stories.tsx`
- `components/navigation/Tabs/Tabs.tsx` + `Tabs.module.scss` + `Tabs.stories.tsx`
- `components/navigation/StepIndicator/StepIndicator.tsx` + `StepIndicator.module.scss` + `StepIndicator.stories.tsx`
- `context/MotionProvider.tsx` (new file — not in either Preserve or Additive list explicitly by name but confirmed to exist only as a differing/new dependency; copy verbatim)
- `hooks/useMotionConfig.ts` (copy verbatim)
- `mixins/_motion.scss` (copy verbatim — new mixin file consumed by the above)

**Before copying each, run** `git diff HEAD saas-template/main -- webapp/src/proto-design-system/<path>` **and grep the diff for `font-family\|font-size\|Fraunces`.** If any hunk touches those, do NOT do a blind file-level copy for that file — hand-apply only the non-typography hunks instead (same procedure as Task F6, item 1). Spot-checked above: `Stack.tsx`, `Card.tsx`, `Sidebar.tsx`, `DataGrid.tsx` have zero typography hunks — safe for direct copy. Re-verify `Modal.tsx`, `DropdownMenu.tsx`, `Tabs.tsx`, `StepIndicator.tsx` the same way before copying (not yet spot-checked in this plan — do so as the first step of this task).
**After copying `Sidebar.tsx`/`Sidebar.module.scss`:** grep the whole webapp for any external reference to `.sectionTitle` on Sidebar instances (unlikely since CSS Modules scope classes, but confirm no `data-testid` or Playwright selector keys off the old class name): `grep -rn "sectionTitle" webapp/e2e/ webapp/src/routes/`.

### F8: Fix Storybook type import across all `.stories.tsx` files
**Files:** all `*.stories.tsx` files under `webapp/src/proto-design-system/` (57 existing files import `@storybook/react`; this includes every component's story file, not just the ones already listed above).
**Action:** run this codemod:
```bash
grep -rl '"@storybook/react"' webapp/src/proto-design-system --include="*.stories.tsx" | \
  xargs sed -i '' 's|"@storybook/react"|"@storybook/react-vite"|g'
```
**Reasoning:** confirmed via `webapp/.storybook/main.js:5` that our actual configured framework is `@storybook/react-vite`. All 57 of our stories currently import the `Meta`/`StoryObj` types from the wrong package name (`@storybook/react`, which happens to still be installed as a devDependency and re-exports compatible types, but is not our framework). This is a genuine correctness fix carried by the template, safe and mechanical.
**Do NOT** change `webapp/.storybook/main.js`, `webapp/package.json`'s `"storybook"` script port (`-p 6006` — this is deliberate per-service port allocation from PR #75, do not revert to template's `-p 6010`), or remove `@storybook/react` from `package.json` devDependencies as part of this task (out of scope — a separate devDependency cleanup can happen later if desired).
**Verification:** `grep -rl '"@storybook/react"' webapp/src/proto-design-system --include="*.stories.tsx"` returns zero results; `grep -c '"@storybook/react-vite"' webapp/src/proto-design-system/components/primitives/Button/Button.stories.tsx` returns at least 1.

### F9: Copy remaining purely-additive small components/pairs
For every file in the "Additive list — 60 files" section above that hasn't been explicitly called out in F1–F8, copy verbatim using the `git show saas-template/main:<path> > <path>` pattern, creating parent directories as needed. This includes all of `showcase/**`, `UIKit.*`, `themes/_chalk.scss`/`_ember.scss`/`_mono.scss`/`_oat.scss`/`_whisper.scss`, `themes/themeGlobalContext.ts`, `utils/parseMotionTokens.ts`, `utils/responsive.ts`, `components/composite/ThemeSwitcherGrid/**`, `components/data/DataTable/**`, `components/layout/PageHero/**`, `components/layout/PageShell/**`, `components/layout/SectionHeader/**`, `components/layout/GridItem/**`, `components/data/FilterTabs/FilterTabs.stories.tsx`, `components/forms/Stepper/Stepper.stories.tsx`, `components/overlays/Drawer/Drawer.stories.tsx`.

### F10: Final verification pass
**Depends on:** F1–F9 all complete.

Run, in order, and fix any failures before proceeding to the next:
```bash
cd webapp
npm run build          # TypeScript + Vite build — must pass with zero errors
npm run lint            # Biome — must pass with zero errors
npm run lint:scss       # Stylelint — must pass with zero errors
npm run test             # Vitest unit tests — must pass
```

Then run these specific greps as a regression gate (all must produce the stated result — if any fails, a rejected conflict was accidentally re-introduced during merge and must be reverted):
```bash
# C1 — Fraunces must still be the display/serif family
grep -n "font-family-display\|font-family-serif" webapp/src/proto-design-system/tokens/_typography.scss | grep -q "Fraunces" && echo "PASS C1" || echo "FAIL C1"

# C2 — editorial must still be the default theme
grep -q 'defaultTheme = "editorial"' webapp/src/proto-design-system/context/ThemeProvider.tsx && echo "PASS C2" || echo "FAIL C2"

# C3 — focus ring must still be 3px
grep -q -- "--focus-ring-width:  3px;" webapp/src/proto-design-system/tokens/_colors.scss && echo "PASS C3" || echo "FAIL C3"

# C4 — half-step spacing tokens must still exist
[ "$(grep -c 'space-0-5\|space-1-5\|space-2-5\|space-3-5' webapp/src/proto-design-system/tokens/_spacing.scss)" -ge 4 ] && echo "PASS C4" || echo "FAIL C4"

# C5 — Button size class naming must be unchanged
grep -q "styles\[size\]" webapp/src/proto-design-system/components/primitives/Button/Button.tsx && echo "PASS C5" || echo "FAIL C5"

# C6 — FilterTabs default size must still be sm
grep -q 'size = "sm"' webapp/src/proto-design-system/components/data/FilterTabs/FilterTabs.tsx && echo "PASS C6" || echo "FAIL C6"

# Preserve list — all 56 index.ts barrel files must still exist
git status --porcelain webapp/src/proto-design-system | grep "^ D " && echo "FAIL — deleted files detected" || echo "PASS — no deletions"

# F1 — googleFontsHref mechanism must not have been introduced
grep -rq "googleFontsHref" webapp/src/proto-design-system/themes/themes.ts && echo "FAIL F1" || echo "PASS F1"
```

**Manual smoke check (Storybook):** run `npm run storybook` and visually confirm:
- The `editorial` theme still renders with Fraunces headings (oversized serif numerals visible in any story using `Text` with `size="3xl"` or larger).
- The new `DataTable`, `PageHero`, `PageShell`, `SectionHeader`, `GridItem` stories render without console errors.
- The 5 new themes (`Oat`, `Ember`, `Mono`, `Whisper`, `Chalk`) are selectable via `ThemeSwitcherGrid` and apply without a network request to Google Fonts (confirms F1's rejection of `googleFontsHref` took effect — check the Network tab for no `fonts.googleapis.com` requests beyond the two `@import` lines already in `tokens/_typography.scss`).
- `Posts` and `Blog` pages (`webapp/src/routes/posts.tsx`, `webapp/src/routes/blog.tsx`) still render their `FilterTabs` at the original compact size.

### F11: E2E regression check (no new page, so no new E2E spec — verify existing ones still pass)
**File:** run existing Playwright suite, no new spec needed since this task touches only the design-system layer, not routes/pages.
```bash
cd webapp && npx playwright test e2e/posts.spec.ts e2e/blog.spec.ts
```
These two specs exercise `FilterTabs` (Conflict C6) end-to-end and are the most likely to regress from this reconciliation. If either fails on a size/layout assertion, re-check Task F1/Conflict C6's default-size preservation and Task F6's per-theme token merges for that theme.

---

## Self-Review

- [x] Architecture Summary explains WHY each accept/reject decision was made, grounded in git blame, grep counts, and doc citations (not assumption)
- [x] All 56 GT-only files (index.ts barrels) enumerated with an explicit "never delete" instruction
- [x] All 60 template-only additive files enumerated with exact copy commands
- [x] All 198 differing files accounted for: named conflicts (7) fully spelled out with diffs/reasoning; token files (_colors, _breakpoints, _motion, _spacing, themes.ts) given exact merge content; 35 per-theme files given a concrete token-by-token triage procedure with a documented rationale (contrast-fix commit `scripts/theme-contrast-check.mjs`) and a fast-skip rule for the ~28 theme files with only font-family hunks; ~15 motion-dependent component files given a wholesale-copy list gated by a font-family grep check; 57 stories files given a one-line codemod
- [x] Every conflict states a recommendation defaulting to "keep our behavior" with concrete evidence (git blame commit hashes, grep usage counts, doc citations, actual caller code)
- [x] Verification step embedded per conflict, plus a consolidated F10 regression-gate script covering every conflict simultaneously
- [x] E2E check identifies the two existing specs most likely to catch a FilterTabs regression, no new page/spec needed since scope is design-system only
- [x] Nothing from the ~131 generic SaaS-scaffolding template-only files (teams, API keys, webhooks, tier-limits) is referenced or scaffolded
- [x] No task says "follow the pattern in the template" without the actual content embedded
