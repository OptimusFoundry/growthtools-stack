# Upload-on-drop media — design

**Date:** 2026-04-19
**Scope:** `webapp/` (frontend only)
**Surfaces:** Create-post wizard, Blog wizard

## Problem

Media dropped into the `FileUpload` composite is held as raw `File` objects (`pendingFiles`) in wizard state and only uploaded to the server at generation/submit time. This produces two parallel lists in every wizard — `pendingFiles` (local) and `uploadedMedia` (server) — which leak into the reducer, API payloads, and generation flow. Downstream handlers have to accept both "file blobs to upload" and "already-uploaded media ids" instead of just ids.

## Goal

Upload media immediately when dropped. Wizards hold only server-known media. Every API call downstream (generation, post create, blog publish) takes **media ids only**.

## Non-goals

- Changes to the `FileUpload` composite's public API.
- Server-side changes to `POST /api/protected/media` or its response shape.
- Sweeping orphaned media rows — tracked separately; exists today regardless.

## Approach

A new hook, `useManagedMediaUpload`, owns the drop→upload lifecycle. Wizards consume it and pass through existing `FileUpload` props. `pendingFiles` is removed from wizard state entirely.

### Why this approach

- Keeps `FileUpload` presentational — no blast radius into other design-system consumers, Storybook, or tests unrelated to this change.
- One place for upload semantics (progress, error, retry, cancellation).
- `MediaUploadSection` becomes a dumb view; both wizards consume the hook identically.

### Alternatives considered

- **Push upload into `FileUpload`:** broader surface (Storybook + every other consumer), not justified for two call sites.
- **Duplicate logic in each wizard:** two copies of the same state machine.

## New hook: `useManagedMediaUpload`

**Location:** `webapp/src/hooks/useManagedMediaUpload.ts`

**Signature (sketch):**

```ts
interface ManagedMediaUpload {
  uploadingFiles: UploadedFile[]; // tiles still in flight or errored
  media: MediaItem[];             // persisted, server-known media
  isUploading: boolean;           // uploadingFiles.some(f => !f.error)
  onFilesChange: (files: UploadedFile[]) => void;
  removeMedia: (id: string) => void;
  retry: (tileId: string) => void;
  initializeMedia: (items: MediaItem[]) => void;
}

function useManagedMediaUpload(): ManagedMediaUpload;
```

**Behavior:**

- `onFilesChange` is the handler passed to `FileUpload`. It diffs against current `uploadingFiles` to detect additions and removals. For each new file: push a tile with `progress: 0`, kick off `uploadMedia(file, signal)`. On success: remove the tile, append a `MediaItem` to `media`. On failure (non-abort): leave the tile in place with `error` set.
- `removeMedia(id)` removes the entry from `media`. Unlink semantics match today's `useUnlinkMedia` behavior (if the wizard currently calls it; otherwise local removal).
- `retry(tileId)` clears `error` on the tile and re-runs the upload.
- `initializeMedia(items)` seeds `media` when hydrating an existing draft (e.g., blog wizard editing a saved draft).
- `isUploading` drives button disabling in the wizard. Errored tiles do NOT count — user can retry or dismiss.

**Cancellation:**

- Each in-flight upload owns an `AbortController`. A cleanup effect on unmount aborts all pending controllers.
- `useUploadMedia` is extended to accept an optional `AbortSignal` argument (non-breaking addition). When aborted, the fetch rejects; the hook distinguishes `AbortError` from real failures and drops the tile silently (no error state — the consumer is gone).

**Concurrency:** uploads are parallel; each tile tracks its own Promise and controller.

## Wizard changes

### `useCreatePostWizard`

- Remove `pendingFiles` AND `uploadedMedia` from `WizardState`. Delete actions `SET_PENDING_FILES`, `ADD_UPLOADED_MEDIA`, `REMOVE_UPLOADED_MEDIA` and their helpers.
- `media` lives entirely in `useManagedMediaUpload`. `WizardInner` reads `managed.media` and passes ids to generation and submit calls.
- `mediaChangedSinceGeneration` stays, but is now derived in `WizardInner` (tracking `managed.media` length/ids across renders) rather than a reducer field — or keep the reducer field and dispatch from a `useEffect` that watches `managed.media`. Implementation decides; the user-facing semantics (nudge to regenerate when media changed post-generation) are unchanged.
- The pre-generation upload loop (`WizardInner.tsx` ~L189-193, iterating `state.pendingFiles` and calling `uploadMedia` then `addUploadedMedia`) is deleted — media is already uploaded.
- Generate and Regenerate buttons get `disabled: ... || managed.isUploading`.

### `BlogWizard`

- Drop local `useState<UploadedFile[]>` for `pendingFiles` (`BlogWizard.tsx` L85).
- Replace with `useManagedMediaUpload()`.
- Publish button adds `|| managed.isUploading` to its `disabled` expression.
- Draft hydration: call `managed.initializeMedia(draft.media)` in the effect that loads a saved draft.

### `MediaUploadSection`

No API changes. The component already accepts `pendingFiles` + `existingMedia` + `onFilesChange` + `onRemoveExisting`. Wizards pass `managed.uploadingFiles`, a `MediaItem → ExistingFile` projection of `managed.media`, `managed.onFilesChange`, and `managed.removeMedia`.

## `useUploadMedia` extension

Accept an optional second argument:

```ts
uploadMedia(file: File, signal?: AbortSignal): Promise<MediaItem>
```

Forward `signal` to the underlying `fetch`. No other changes.

## Error UX

- A failed upload keeps its tile rendered with `error` set. `FileUpload` already displays an error string on the tile (per `UploadedFile.error`); if a retry affordance is missing, add a small "Retry" link in the tile. This is the only change inside `FileUpload` and it is additive.
- If retry is cumbersome to add without touching the composite's API, render retry/dismiss controls alongside (outside) the composite in `MediaUploadSection`. Pick whichever keeps `FileUpload` untouched.

## Tests

**Unit — `useManagedMediaUpload`**

- Drop one file → tile appears with `progress: 0` → resolves to `media`, tile removed.
- Drop two files in parallel → both resolve independently; order in `media` matches resolution order.
- Upload rejects → tile stays with `error`; `isUploading` becomes `false`.
- `retry(id)` on errored tile → tile returns to in-flight; resolves to `media`.
- Unmount during upload → fetch aborted; no error surfaced to state (state already unmounted).
- `initializeMedia([a, b])` seeds `media` with both items.

**Playwright**

- Create-post: drop media with MSW delaying `POST /api/protected/media` → assert Generate button `disabled`; after response, assert it's enabled.
- Create-post: upload failure (MSW returns 500) → assert error tile visible, Generate enabled (errored tiles don't block), submit path still works with the successfully uploaded file.
- Blog wizard: same two scenarios for the Publish button.
- Both specs follow `playwright-coverage-check` — MSW handlers + scenario factories in `e2e/handlers/media.handlers.ts`.

## Migration / rollout

Single PR. Internal-only refactor with no API contract changes. Feature flag not required.

## Open questions

None blocking. If `FileUpload` doesn't already render `UploadedFile.error`, the retry affordance lives in `MediaUploadSection` to keep the composite untouched.
