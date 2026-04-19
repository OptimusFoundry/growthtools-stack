# Create-Post Wizard — Refactor & Cleanup Plan

**Goal:** Raise code quality and robustness across the create-post folder through deduplication, dead-code removal, and convention alignment. No new features.
**Scope:** frontend-only
**Executor:** `frontend-supervisor`

---

## Summary of Findings

### F-01 — Duplicate shim files: `ComposeStep.tsx` and `PlatformPostCard.tsx` at the top level

`webapp/src/components/create-post/ComposeStep.tsx` (3 lines) is a shim that re-exports from `./compose/ComposeStep`. `webapp/src/components/create-post/PlatformPostCard.tsx` (4 lines) is a shim that re-exports from `./platform-cards/PlatformPostCard`.

The real files live in the subfolders. Grep confirms no caller imports from the top-level paths directly — every import of `ComposeStep` is through `WizardInner.tsx` which imports `"./ComposeStep"` (which is the shim), and every import of `PlatformPostCard` is within the create-post folder itself (within `PlatformPreviewCard.tsx` and `ThreadView.tsx`).

**Decision:** Delete the two shim files. Update the two internal callers (`WizardInner.tsx` imports `ComposeStep` via `"./ComposeStep"`, and `PlatformPreviewCard.tsx` + `ThreadView.tsx` import `PlatformPostCard` via `"./PlatformPostCard"`) to import directly from the subfolder paths. No external callers exist (the only external references to this folder are `CreatePostWizard`, which is the entry point, not the shims).

### F-02 — Dead code: `PublishModeSection.tsx` is never imported

`webapp/src/components/create-post/compose/PublishModeSection.tsx` (134 lines) exists but is imported nowhere in the codebase. The publish/schedule/save-draft actions migrated into the `Topbar` (in `WizardInner.tsx`). The component still references `CreatePostWizard.module.scss` classes (`publishOptions`, `publishOption`, `publishOptionActive`, `publishOptionContent`) which are also unused now that the component is dead.

**Decision:** Delete `PublishModeSection.tsx`. Also remove the now-orphaned SCSS classes in `CreatePostWizard.module.scss`: `.publishOptions`, `.publishOption`, `.publishOptionActive`, `.publishOptionContent`. Verify no other file references those class names first.

### F-03 — Duplicate reducer action: `SET_PLATFORM_CONTENT` vs `UPDATE_PLATFORM_CONTENT`

In `useCreatePostWizard.ts` lines 47 and 59, both actions exist:
- `SET_PLATFORM_CONTENT` (line 47) — dispatched by `setPlatformContent`, used by `useWizardSSESync` to write SSE-streamed content.
- `UPDATE_PLATFORM_CONTENT` (line 59) — dispatched by `updatePlatformContent`, used by `WizardInner` when the user manually edits a platform card.

The reducer cases (lines 143–149 and 171–177) are identical: both spread `state.platformContent` and overwrite the keyed entry with the new content. The semantic intent differs (SSE write vs. user edit), but the state mutation is identical. Having two action types for the same mutation is noise that makes the reducer harder to read and future devs may wonder if there is a real difference.

**Decision:** Collapse to one action. Keep `SET_PLATFORM_CONTENT` (the more explicit name). Remove `UPDATE_PLATFORM_CONTENT` action type and case from the reducer. Rename the exported `updatePlatformContent` method to remain but dispatch `SET_PLATFORM_CONTENT` internally. This is safe because the reducer output is identical and the method name in the public API of the hook stays the same.

### F-04 — `WizardInner.tsx` is 566 lines — over the 200-line guideline

`WizardInner.tsx` contains: hook wiring, `handleRemoveUploadedMedia`, `handleGenerate` (async, 50+ lines), `persistDraft` (async, 50 lines), `handlePublish`, `handleSchedule`, `handleSaveDraft`, `handleRetry`, eyebrow/title/subLine string derivations, schedule drawer state (`scheduleOpen`, `scheduleDate`, `scheduleTime`), and the full JSX tree including the `Drawer`.

The ARCHITECTURE.md guideline is ~200 lines for files and ~5 `useState` calls. `WizardInner.tsx` has 5 `useState` calls directly and several `useCallback` hooks. All `useCallback` calls should be dropped per React Compiler guidance (REACT19-PATTERNS.md: "Do not add manual `useMemo` or `useCallback` for performance reasons — it's redundant and adds noise.").

**Decision (two sub-steps):**
1. Extract the schedule drawer state + logic into `useScheduleDrawer` (within the same file or the hook folder — local is fine since it's used by one component). This removes 3 `useState` calls and `handleConfirmSchedule`.
2. Extract `persistDraft`, `handlePublish`, `handleSchedule`, `handleSaveDraft`, `handleRetry` into a `useWizardActions` hook co-located in the same file (above the component, following ARCHITECTURE.md's "one component" pattern). This makes the component body readable.
3. Remove all `useCallback` wrappers from both the extracted hooks and the remaining component body — the React Compiler handles memoization.

### F-05 — `useCreatePostWizard.ts` has redundant `useCallback` wrappers

Every action dispatcher (`setBlurb`, `setContentType`, ... 17 total) wraps a one-liner dispatch call in `useCallback(fn, [])`. Since the dispatch reference from `useReducer` is already stable and the React Compiler auto-memoizes, these wrappers add zero value and 17 lines of boilerplate noise.

**Decision:** Remove all `useCallback` wrappers in `useCreatePostWizard.ts`. Each dispatcher becomes an arrow function or inline `() => dispatch(...)` expression. The returned object members remain the same so callers are unaffected.

### F-06 — Deprecated API in `EditableContent.tsx`: `document.execCommand`

`webapp/src/components/create-post/platform-cards/EditableContent.tsx` line 39:
```
document.execCommand("insertText", false, text);
```
`execCommand` is deprecated and flagged by browsers. The recommended replacement for plain-text paste handling in a `contenteditable` is to use the `DataTransfer` API directly and `document.createRange` + `selection.insertNode` or the newer `insertAdjacentText` approach.

**Decision:** Replace `execCommand` with the modern clipboard insertion pattern using `Selection` / `Range`. The replacement must preserve the existing undo-stack behaviour (insert at cursor position, not replace entire content). The functional surface area (contenteditable div, `onInput`, `onPaste`) stays the same — this is an internal implementation swap.

The correct modern replacement:
```ts
const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
  e.preventDefault();
  const text = e.clipboardData.getData("text/plain");
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;
  selection.deleteFromDocument();
  const range = selection.getRangeAt(0);
  range.insertNode(document.createTextNode(text));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  onChange(ref.current?.textContent ?? "");
}, [onChange]);
```

### F-07 — Inline `style` prop for a non-dynamic value in `PostConfigSection.tsx`

`webapp/src/components/create-post/compose/PostConfigSection.tsx` line 61:
```tsx
style={{
  pointerEvents: contentType === "thread" ? "auto" : "none",
}}
```
This is not a truly dynamic runtime value (it's a binary toggle). DESIGN-GUIDELINES.md says: "Avoid the `style` prop — Use SCSS modules". The CSS token `pointer-events` can be toggled via a CSS class.

**Decision:** Add a `.lengthEnabled` / `.lengthDisabled` pair to `PostConfigSection.module.scss`. A `.lengthDisabled` class already exists in the SCSS file (line 21), but the component drives it via `style` instead of using the class. Flip the component to apply `styles.lengthDisabled` when `contentType !== "thread"` instead of using the inline style prop.

### F-08 — Inline `style` prop for CSS custom property in `ThreadView.tsx` (acceptable but document)

`webapp/src/components/create-post/ThreadView.tsx` lines 83–85:
```tsx
style={
  { "--platform-accent": platformAccent(platform) } as React.CSSProperties
}
```
This passes a CSS custom property dynamically, which is one of the two explicitly acceptable uses of `style` (DESIGN-GUIDELINES.md: "CSS custom properties passed from JavaScript"). However, `platformAccent()` returns values like `var(--color-platform-x)` — these are token references that could instead be applied purely in CSS via `data-platform` attribute, the same way `PlatformPostCard.module.scss` already does it (`&[data-platform="x"] { --platform-accent: ... }`).

**Decision:** Remove the `platformAccent()` function and inline style in `ThreadView.tsx`. Add `data-platform={platform}` attribute to the `.segment` div in the JSX. In `ThreadView.module.scss`, add data-attribute selectors identical to those in `PlatformPostCard.module.scss` (already using this pattern):
```scss
.segment[data-platform="x"]    { --platform-accent: var(--color-platform-x); }
.segment[data-platform="bluesky"] { --platform-accent: var(--color-platform-bluesky); }
// ... all 8 platforms
```
This also removes the `as React.CSSProperties` cast.

### F-09 — Hardcoded pixel values in SCSS

The following pixel values bypass the design token system (where stylelint does not suppress them):

| File | Line | Value | Recommended token |
|------|------|-------|-------------------|
| `PlatformPostCard.module.scss` | 75 | `min-height: 60px` | `var(--space-15)` or keep with suppression comment since it's pixel-design-accurate |
| `PlatformPostCard.module.scss` | 105–106 | `width: 40px; height: 40px` | No token equivalent — suppress with comment |
| `PlatformPostCard.module.scss` | 231–232 | `width: 8px; height: 8px` | `var(--space-2)` (8px on 8px grid) |
| `CreatePostWizard.module.scss` | 145–146 | `width: 18px; height: 18px` | No token — suppress with comment |
| `CreatePostWizard.module.scss` | 199 | `width: 2px` | No token — suppress with comment (cursor blink pixel-accurate) |
| `CreatePostWizard.module.scss` | 200 | `height: 1em` | `1em` is a relative unit, not hardcoded — acceptable |
| `ThreadView.module.scss` | 79 | `width: 2px` | No token — suppress with comment |

Note: `CreatePostWizard.module.scss` lines 44, 55, 71 already have proper `stylelint-disable-next-line` comments for intentional literal values (`height: 1px`, `line-height: 0.98`, `line-height: 1.55`).

**Decision:** Replace `8px` dot dimensions in `PlatformPostCard.module.scss` with `var(--space-2)`. For pixel-accurate UI elements with no token equivalent (avatar 40px, pending dot 18px, cursor width 2px, thread line 2px), add `/* stylelint-disable-next-line scale-unlimited/declaration-strict-value */` suppression comments so linting stays green and the intent is documented.

### F-10 — `useWizardSSESync` causes `wizard` object to be a dependency of every `useEffect`

In `useWizardSSESync.ts`, each `useEffect` lists `wizard` as a dependency (lines 44, 58, 67, 79, 87). The `wizard` parameter is the object returned from `useCreatePostWizard`, which is recreated on every render of `WizardInner`. Even though the individual methods are stable (they wrap stable `dispatch` references), the container object reference is new each render. This means every effect fires every render when the wizard re-renders.

After fixing F-05 (removing `useCallback` from `useCreatePostWizard`), the method references will be stable only through React Compiler optimisation. The safer fix is to destructure the `wizard` parameter at the call site and pass individual stable references into the hook.

**Decision:** Change `useWizardSSESync`'s third parameter from `wizard: { setPlatformContent, ... }` to individual named parameters: `setPlatformContent`, `setPlatformProgress`, `setThreadContent`, `generationComplete`, `generationFailed`, `setError`. Update the call site in `WizardInner.tsx` to pass the individual methods. Each `useEffect` dependency array then contains specific function references rather than the object wrapper.

### F-11 — `handleRetry` in `WizardInner.tsx` uses raw `fetch` instead of `fetcher`

Line 332–333:
```ts
const url = `${import.meta.env.VITE_API_URL}/api/protected/posts/${editPostId}/retry`;
await fetch(url, { method: "POST", credentials: "include" });
```

The project's API layer convention (ARCHITECTURE.md) requires using `fetcher` from `@/api/client` for all authenticated requests. Raw `fetch` with manually-set `credentials` bypasses the centralized client, lacks the error normalisation that `fetcher` provides, and could silently swallow non-2xx responses without throwing.

**Decision:** Replace the raw `fetch` call with `fetcher<void>(\`...\`)` from `@/api/client`. The method default is GET so pass `{ method: "POST" }` as the second argument. Remove the manually constructed URL variable.

### F-12 — `PreviewStep.tsx` renders `BaseAccordion` in two distinct branches without guard

In `PreviewStep.tsx`, `BaseAccordion` is rendered in two JSX locations:
1. Lines 201–208: during `generating` phase (streaming view)
2. Lines 232–237: during `generated` phase (review view)

The component has its own `useState` for `expanded`, meaning it holds state that resets between the two render contexts because React treats them as different component instances (different JSX positions). This causes the accordion to snap to collapsed when generation completes and the component position changes.

**Decision:** Extract the auto-expand logic into a single `BaseAccordion` usage by lifting it one level. In the `generated` case (the review view, lines 229–276), the `BaseAccordion` can simply omit the streaming-specific auto-expand logic since `isStreaming` will always be false there. The streaming instance (lines 201–208) correctly auto-expands. No visible bug exists today because the streaming accordion disappears when `generating` becomes false, but the dual instance is confusing. Add a JSDoc comment to `BaseAccordion` clarifying the lifecycle to prevent future regressions. This is a comment-and-clarity fix, not a behavior change.

### F-13 — `useCreatePostWizard` exports unused `setPublishMode` / `publishMode` state

`publishMode` (`"now" | "schedule" | null`) is declared in `WizardState` and managed by `SET_PUBLISH_MODE` in the reducer and `setPublishMode` in the hook's return value. The functionality was moved to the Topbar when `PublishModeSection` was abandoned (see F-02). No caller in the codebase reads `state.publishMode` or calls `setPublishMode` now.

**Decision:** Remove `publishMode` from `WizardState`, remove the `SET_PUBLISH_MODE` action type and reducer case, remove `setPublishMode` from the hook's return. Remove `PublishMode` type export if it is no longer used after removing `PublishModeSection.tsx` (confirm with grep).

---

## Risk Assessment

| Finding | Risk of Behavioral Drift | Mitigation |
|---------|--------------------------|------------|
| F-01 shims deleted | Low — shims are pure re-exports, callers update to direct import paths | `npm run build` confirms no broken imports |
| F-02 dead component deleted | None — nothing imports it | Verify with grep before delete |
| F-03 reducer action collapse | Low — reducer output is identical | Read both cases side-by-side before collapse; run existing tests |
| F-04 WizardInner extraction | Medium — moving async logic across scope boundaries; closures must be verified | Extract without any logic change; verify all captures are identical |
| F-05 remove `useCallback` | Low — React Compiler handles it | `npm run build` and manual smoke-test generate flow |
| F-06 `execCommand` replacement | Medium — paste behavior in contenteditable is tricky; cursor position and undo stack vary by browser | Test paste in Chrome and Firefox after change; ensure undo (Ctrl+Z) still works |
| F-07 style → SCSS class | Low — CSS class `.lengthDisabled` already exists | Visual inspection of thread mode toggle |
| F-08 inline CSS var → data-attribute | Low — purely presentational, same visual result | Visual inspection of thread connector line colors for each platform |
| F-09 hardcoded px | None for suppressions; low for token replacements | Run `npm run lint:scss` after changes |
| F-10 SSESync deps | Low — function references were already stable via React Compiler | Compare before/after with React DevTools profiler if concerned |
| F-11 raw fetch → fetcher | Low — same HTTP call, better error propagation | Retry flow requires a published post; smoke-test in dev |
| F-12 BaseAccordion comment | None — documentation only | N/A |
| F-13 remove publishMode | Low — grep confirms no live caller | Confirm grep, then remove |

---

## Phased Plan

Each phase keeps `npm run build` green and produces an independently mergeable commit.

---

### Phase 1: Delete dead code (F-01, F-02, F-13)

**Goal:** Remove the shims, the orphaned `PublishModeSection`, and the unused `publishMode` state. No functional change anywhere.

**Step 1.1 — Delete shim files and update their callers**

Files to delete:
- `/Users/shubh/Workspaces/growth-tools/webapp/src/components/create-post/ComposeStep.tsx`
- `/Users/shubh/Workspaces/growth-tools/webapp/src/components/create-post/PlatformPostCard.tsx`

Files to update:
- `/Users/shubh/Workspaces/growth-tools/webapp/src/components/create-post/WizardInner.tsx` line 26: change `import { ComposeStep } from "./ComposeStep"` to `import { ComposeStep } from "./compose/ComposeStep"`
- `/Users/shubh/Workspaces/growth-tools/webapp/src/components/create-post/PlatformPreviewCard.tsx` line 4: change `import { PlatformPostCard } from "./PlatformPostCard"` to `import { PlatformPostCard } from "./platform-cards/PlatformPostCard"`
- `/Users/shubh/Workspaces/growth-tools/webapp/src/components/create-post/ThreadView.tsx` line 6: change `import { PlatformPostCard } from "./PlatformPostCard"` to `import { PlatformPostCard } from "./platform-cards/PlatformPostCard"`

**Step 1.2 — Delete PublishModeSection and its orphaned SCSS**

Before deleting, confirm no import references exist:
```
grep -r "PublishModeSection" webapp/src/
```
Expected: zero results beyond the file itself.

File to delete:
- `/Users/shubh/Workspaces/growth-tools/webapp/src/components/create-post/compose/PublishModeSection.tsx`

In `/Users/shubh/Workspaces/growth-tools/webapp/src/components/create-post/CreatePostWizard.module.scss`, remove these CSS blocks (which are only used by `PublishModeSection`):
- `.publishOptions { ... }` (lines 166–170)
- `.publishOption { ... }` (lines 172–190)
- `.publishOptionActive` class within `.publishOption`
- `.publishOptionContent { ... }` (lines 192–196)

Acceptance: `npm run lint:scss` passes, `npm run build` passes.

**Step 1.3 — Remove `publishMode` from wizard state (F-13)**

In `/Users/shubh/Workspaces/growth-tools/webapp/src/components/create-post/useCreatePostWizard.ts`:

Remove from `WizardState` interface:
```ts
publishMode: PublishMode;
```

Remove the `WizardAction` union member:
```ts
| { type: "SET_PUBLISH_MODE"; mode: PublishMode }
```

Remove from `initialState`:
```ts
publishMode: null,
```

Remove the reducer case:
```ts
case "SET_PUBLISH_MODE":
  return { ...state, publishMode: action.mode };
```

Remove the dispatcher:
```ts
const setPublishMode = useCallback(...)
```

Remove from the return object:
```ts
setPublishMode,
```

Check whether the `PublishMode` type (`"now" | "schedule" | null`) is still used anywhere after `PublishModeSection.tsx` is deleted:
```
grep -r "PublishMode" webapp/src/
```
If the only remaining reference is the type definition itself, delete the type export too.

Acceptance: TypeScript strict mode (`npm run build`) passes.

---

### Phase 2: Reducer cleanup — collapse duplicate action (F-03, F-05)

**Goal:** One action for platform content writes; no redundant `useCallback` wrapping.

**Step 2.1 — Collapse SET_PLATFORM_CONTENT / UPDATE_PLATFORM_CONTENT**

In `useCreatePostWizard.ts`:

Remove the `UPDATE_PLATFORM_CONTENT` union member from `WizardAction`.

Remove the `case "UPDATE_PLATFORM_CONTENT"` block from the reducer (lines 171–177).

The `updatePlatformContent` dispatcher at line 280 currently dispatches `UPDATE_PLATFORM_CONTENT`. Change it to dispatch `SET_PLATFORM_CONTENT`:
```ts
const updatePlatformContent = (platform: PlatformType, content: string) =>
  dispatch({ type: "SET_PLATFORM_CONTENT", platform, content });
```

The public API of the hook (the `updatePlatformContent` method name) stays the same — callers in `WizardInner.tsx` are unaffected.

**Step 2.2 — Remove useCallback wrappers in useCreatePostWizard (F-05)**

In `useCreatePostWizard.ts`, all 17 `useCallback` wrappers (lines 207–290) wrap `dispatch` invocations with `[]` dependency arrays. Remove them. Each becomes a plain function expression. For example:

Before:
```ts
const setBlurb = useCallback(
  (blurb: string) => dispatch({ type: "SET_BLURB", blurb }),
  [],
);
```

After:
```ts
const setBlurb = (blurb: string) => dispatch({ type: "SET_BLURB", blurb });
```

Apply this to all 17 dispatchers. Remove `useCallback` from the import line since it will no longer be used in this file (only `useReducer` is needed).

Acceptance: `npm run build` passes. Run the generate flow manually to confirm content streams in correctly.

---

### Phase 3: Hook and state extraction from WizardInner (F-04, F-10, F-11)

**Goal:** Break `WizardInner.tsx` below 300 lines by extracting coherent units. Fix raw `fetch` and SSE sync dependency array.

**Step 3.1 — Fix raw fetch → fetcher (F-11)**

In `WizardInner.tsx`, add `fetcher` to the imports from `"@/api/client"`:
```ts
import { fetcher } from "@/api/client";
```

Replace lines 332–333:
```ts
// Before
const url = `${import.meta.env.VITE_API_URL}/api/protected/posts/${editPostId}/retry`;
await fetch(url, { method: "POST", credentials: "include" });

// After
await fetcher<void>(
  `${import.meta.env.VITE_API_URL}/api/protected/posts/${editPostId}/retry`,
  { method: "POST" },
);
```

**Step 3.2 — Fix useWizardSSESync dependency object (F-10)**

In `useWizardSSESync.ts`, change the third parameter from an object to individual named parameters:

```ts
export function useWizardSSESync(
  sse: { ... },
  state: WizardState,
  setPlatformContent: (platform: PlatformType, content: string) => void,
  setPlatformProgress: (platform: PlatformType, status: GenerationStatus) => void,
  setThreadContent: (platform: PlatformType, segments: { content: string; imageIndex?: number }[]) => void,
  generationComplete: () => void,
  generationFailed: () => void,
  setError: (error: string | null) => void,
) {
```

Update each `useEffect` body to call these directly (e.g., `setPlatformContent(...)` instead of `wizard.setPlatformContent(...)`), and each `useEffect` dependency array to list the individual function names instead of `wizard`.

Update the call site in `WizardInner.tsx` at the current `useWizardSSESync(sse, state, { ... })` invocation to pass the individual destructured methods:
```ts
useWizardSSESync(
  sse,
  state,
  wizard.setPlatformContent,
  wizard.setPlatformProgress,
  wizard.setThreadContent,
  wizard.generationComplete,
  wizard.generationFailed,
  wizard.setError,
);
```

**Step 3.3 — Extract useScheduleDrawer from WizardInner (F-04 part a)**

Above the `WizardInner` function (but within `WizardInner.tsx`), define a new local hook:

```ts
/**
 * Manages the schedule drawer's open state, date, time, and confirm logic.
 */
function useScheduleDrawer(
  initialScheduledAt: string,
  setScheduledAt: (iso: string) => void,
  handleSchedule: (whenOverride?: string) => Promise<void>,
  addBanner: ReturnType<typeof useBannerCenter>["addBanner"],
) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | null>(() =>
    initialScheduledAt ? new Date(initialScheduledAt) : null,
  );
  const [scheduleTime, setScheduleTime] = useState<string>(() => {
    if (initialScheduledAt) {
      const d = new Date(initialScheduledAt);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    return "09:00";
  });

  const scheduledLabel = scheduleDate
    ? `Scheduled for ${scheduleDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })} at ${scheduleTime}`
    : "Pick a date and time below.";

  const handleConfirmSchedule = async () => {
    if (!scheduleDate) {
      addBanner({ type: "error", title: "Please pick a date", dismissible: true });
      return;
    }
    const [h, m] = scheduleTime.split(":").map(Number);
    const combined = new Date(scheduleDate);
    combined.setHours(h ?? 9, m ?? 0, 0, 0);
    const iso = combined.toISOString();
    setScheduledAt(iso);
    setScheduleOpen(false);
    await handleSchedule(iso);
  };

  return {
    scheduleOpen,
    setScheduleOpen,
    scheduleDate,
    setScheduleDate,
    scheduleTime,
    setScheduleTime,
    scheduledLabel,
    handleConfirmSchedule,
  };
}
```

In `WizardInner`, remove the 3 `useState` calls for schedule state and `handleConfirmSchedule`. Call instead:
```ts
const scheduleDrawer = useScheduleDrawer(
  state.scheduledAt,
  wizard.setScheduledAt,
  handleSchedule,
  addBanner,
);
```
Update JSX references from `scheduleOpen`, `setScheduleOpen`, etc. to `scheduleDrawer.scheduleOpen`, etc.

**Step 3.4 — Extract useWizardActions from WizardInner (F-04 part b)**

Above the `WizardInner` function (below `useScheduleDrawer`), define:

```ts
/**
 * Encapsulates all async post actions: generate, persist draft, publish,
 * schedule, save draft, and retry. Keeps WizardInner's body readable.
 */
function useWizardActions({
  state,
  wizard,
  sse,
  initialBaseContent,
  editPostId,
  isEditMode,
  saveDraft,
  savingDraft,
  updateDraft,
  updatingDraft,
  publishPost,
  schedulePost,
  uploadMedia,
  unlinkMedia,
  addBanner,
  navigate,
}: UseWizardActionsParams) {
  // handleRemoveUploadedMedia
  // handleGenerate (including uploadAndGenerate)
  // persistDraft
  // handlePublish
  // handleSchedule
  // handleSaveDraft
  // handleRetry (with local retrying state)
  // return all handlers + retrying
}
```

Define `UseWizardActionsParams` as a TypeScript interface just above this hook. Move all of these functions verbatim from `WizardInner` into `useWizardActions`. The only rule: do not change any logic. Lift `const [retrying, setRetrying] = useState(false)` into this hook as well since it belongs to `handleRetry`.

Return from `useWizardActions`:
```ts
return {
  handleRemoveUploadedMedia,
  handleGenerate,
  handlePublish,
  handleSchedule,
  handleSaveDraft,
  handleRetry,
  retrying,
};
```

In `WizardInner`, replace all the individual handler definitions with:
```ts
const actions = useWizardActions({ state, wizard, sse, ... });
```
And replace all references (`handlePublish` → `actions.handlePublish`, etc.).

After extraction, `WizardInner.tsx` should be approximately 200–250 lines.

**Step 3.5 — Remove useCallback from WizardInner (F-05 follow-through)**

After extraction, any remaining `useCallback` calls in `WizardInner.tsx` and the new local hooks (`useScheduleDrawer`, `useWizardActions`) are unnecessary per the React Compiler guidance. Remove them. The extracted hooks' internal functions are plain `async` functions — no wrapping needed.

Acceptance: `npm run build` passes. Manually test: create new post, generate content, save draft, publish, schedule, retry failed post (requires a failed post in dev).

---

### Phase 4: Presentational fixes (F-06, F-07, F-08, F-09, F-12)

**Goal:** Fix deprecated `execCommand`, inline styles, hardcoded pixel values, and add the clarifying comment on `BaseAccordion`.

**Step 4.1 — Replace execCommand in EditableContent.tsx (F-06)**

In `/Users/shubh/Workspaces/growth-tools/webapp/src/components/create-post/platform-cards/EditableContent.tsx`, replace the `handlePaste` implementation:

```ts
const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
  e.preventDefault();
  const text = e.clipboardData.getData("text/plain");
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;
  selection.deleteFromDocument();
  const range = selection.getRangeAt(0);
  range.insertNode(document.createTextNode(text));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  // Sync the new text value back into controlled state
  if (ref.current) {
    onChange(ref.current.textContent ?? "");
  }
};
```

Remove `useCallback` from around `handlePaste` (React Compiler handles it). Also remove `useCallback` from `handleInput` for the same reason. Remove both from the `useCallback` import if no longer used in this file (check — `useEffect` and `useRef` still needed).

Acceptance: Manual paste test in the editable card content area in Chrome and Firefox (or at minimum Chrome). Paste preserves cursor position and triggers `onChange`.

**Step 4.2 — Inline style → SCSS class in PostConfigSection.tsx (F-07)**

In `/Users/shubh/Workspaces/growth-tools/webapp/src/components/create-post/compose/PostConfigSection.tsx`, the `motion.div` wrapper at line 55 has:
```tsx
style={{
  pointerEvents: contentType === "thread" ? "auto" : "none",
}}
```

The SCSS file already has `.lengthDisabled { opacity: 0; pointer-events: none; }` at line 21. Add `pointer-events: auto` to a `.lengthEnabled` class (or simply ensure the default is `auto` and only apply `.lengthDisabled`).

In `PostConfigSection.module.scss`, verify `.lengthDisabled` already sets `pointer-events: none`. That's sufficient — the default is `auto`.

In `PostConfigSection.tsx`, replace the `style` prop with a className:
```tsx
<motion.div
  className={`${styles.lengthField} ${contentType !== "thread" ? styles.lengthDisabled : ""}`}
  aria-hidden={contentType !== "thread"}
  animate={{ opacity: contentType === "thread" ? 1 : 0 }}
  initial={false}
  transition={{ duration: 0.18, ease: "easeOut" }}
>
```

Remove the `style` prop entirely.

Acceptance: Toggle thread mode on/off and verify the stepper becomes interactive/non-interactive as before.

**Step 4.3 — Remove platformAccent() and inline style in ThreadView.tsx (F-08)**

In `ThreadView.tsx`:

1. Delete the `platformAccent` function (lines 106–118).
2. On the `.segment` div, remove `style={{ "--platform-accent": platformAccent(platform) } as React.CSSProperties}`.
3. Add `data-platform={platform}` to the `.segment` div.

In `ThreadView.module.scss`, inside the `.segment` block, add data-attribute selectors:
```scss
.segment {
  // ... existing styles ...

  &[data-platform="x"]         { --platform-accent: var(--color-platform-x); }
  &[data-platform="bluesky"]   { --platform-accent: var(--color-platform-bluesky); }
  &[data-platform="threads"]   { --platform-accent: var(--color-platform-threads); }
  &[data-platform="linkedin"]  { --platform-accent: var(--color-platform-linkedin); }
  &[data-platform="facebook"]  { --platform-accent: var(--color-platform-facebook); }
  &[data-platform="instagram"] { --platform-accent: var(--color-platform-instagram); }
  &[data-platform="tiktok"]    { --platform-accent: var(--color-platform-tiktok); }
  &[data-platform="pinterest"] { --platform-accent: var(--color-platform-pinterest); }
}
```

Remove the `as React.CSSProperties` import if it becomes unused (check if `React` is imported for other purposes in `ThreadView.tsx` — it is not; the file imports nothing from `react` directly so the cast import must have come from the type annotation; after removal confirm no remaining import of `React` is needed).

Acceptance: Render a thread post for X — connector line should be platform blue. Render for LinkedIn — connector should match LinkedIn color.

**Step 4.4 — SCSS hardcoded pixel fixes (F-09)**

In `PlatformPostCard.module.scss`:

1. `.dot` — change `width: 8px; height: 8px` to `width: var(--space-2); height: var(--space-2)` (the design system 8px grid maps `--space-2` to 8px — verify by checking `src/proto-design-system/tokens/_spacing.scss`).
2. `.avatar` — add `/* stylelint-disable-next-line scale-unlimited/declaration-strict-value */` before `width: 40px` and `height: 40px` (avatar size is pixel-accurate UI design, no token equivalent).
3. `.editableContent` — add suppression comment before `min-height: 60px`.

In `CreatePostWizard.module.scss`:
4. `.statusPending` — add suppression comments before `width: 18px; height: 18px`.
5. `.streamingCursor` — add suppression comment before `width: 2px` (cursor blink is pixel-accurate design).

In `ThreadView.module.scss`:
6. Thread connector line — add suppression comment before `width: 2px`.

Acceptance: `npm run lint:scss` exits with 0 errors.

**Step 4.5 — Add JSDoc to BaseAccordion in PreviewStep.tsx (F-12)**

In `PreviewStep.tsx`, above the `BaseAccordion` component definition, add:

```ts
/**
 * Renders the base content in an accordion panel.
 *
 * Lifecycle note: This component is rendered in two distinct JSX positions
 * (streaming phase and review phase). Because React reconciles by position,
 * each position gets an independent instance with its own expanded state.
 * The streaming instance auto-expands; the review instance defaults collapsed.
 * This is intentional — do not unify into a single conditional render without
 * verifying the accordion state reset behavior.
 */
```

Acceptance: TypeScript build passes (doc comment only, no logic change).

---

## File Change Summary

| File | Action |
|------|--------|
| `create-post/ComposeStep.tsx` | **Delete** (shim) |
| `create-post/PlatformPostCard.tsx` | **Delete** (shim) |
| `create-post/compose/PublishModeSection.tsx` | **Delete** (dead code) |
| `create-post/WizardInner.tsx` | Refactor: update import paths, extract 2 hooks, remove useCallback, fix fetch→fetcher, update SSESync call |
| `create-post/useCreatePostWizard.ts` | Remove `publishMode` state + action, collapse duplicate action, remove all useCallback |
| `create-post/useWizardSSESync.ts` | Change param signature from object to individual functions |
| `create-post/PlatformPreviewCard.tsx` | Update import path for PlatformPostCard |
| `create-post/ThreadView.tsx` | Remove platformAccent fn, remove style prop, add data-platform attr |
| `create-post/compose/PostConfigSection.tsx` | Replace style prop with className |
| `create-post/platform-cards/EditableContent.tsx` | Replace execCommand with modern Selection API, remove useCallback |
| `create-post/CreatePostWizard.module.scss` | Remove 4 dead CSS blocks (.publishOptions etc.), add stylelint suppressions |
| `create-post/PlatformPostCard.module.scss` | `.dot` uses token, add stylelint suppressions for pixel values |
| `create-post/ThreadView.module.scss` | Add 8 data-platform selectors inside .segment, add suppression for 2px |
| `create-post/compose/PostConfigSection.module.scss` | Confirm `.lengthDisabled` has pointer-events: none (already present) |

---

## Acceptance Criteria (Overall)

1. `npm run build` exits 0.
2. `npm run lint` exits 0 (Biome).
3. `npm run lint:scss` exits 0 (Stylelint).
4. No TypeScript strict-mode errors.
5. Manually smoke-tested flows in dev:
   - Create new post: write blurb → select platforms → generate → preview streams → save draft → publish works.
   - Edit draft: load existing draft → content pre-filled → regenerate → update draft.
   - Edit published post: read-only mode renders correctly, retry button appears for failed posts.
   - Thread mode: toggle on → stepper appears; connector line renders per-platform color.
   - Paste into editable card content: plain text inserted at cursor position.
   - Schedule flow: schedule drawer opens, date + time picked, "Schedule" submits.
