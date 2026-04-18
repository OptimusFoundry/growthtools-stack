# Fix: Regenerate Drops Media From Existing Drafts

**Goal:** Fix two compounding bugs that together cause clicking "regenerate" on an existing draft (created from GitHub capture) to create platform posts without the media attached to the draft.
**Scope:** full-stack

---

## Architecture Summary

### What the investigation found

Three bugs exist across two layers. All three must be fixed for media to survive a regenerate-then-save cycle on an existing draft.

**Bug 1 — Frontend call site (primary):**
`handleGenerate` in `WizardInner.tsx` (lines 128–134) never passes `state.uploadedMedia` IDs to `sse.generate()`. The 6th argument `mediaIDs?: string[]` is accepted by `useSSEContentGenerate`'s `generate()` function but the call site omits it. As a result, the SSE request goes to the text-only/base64 path rather than the media-aware `handleStreamGenerateWithMedia` backend path.

**Bug 2 — Backend processor (secondary):**
`UpdateDraft` in `base-server/internal/posts/processor/processor.go` (lines 448–452) builds `store.UpdatePostParams` without setting `MediaIDs`. The field `UpdateDraftParams.MediaIDs` is parsed by the handler and declared in the struct, but the processor never copies it into `updateParams.MediaIDs` before calling `p.store.UpdatePost(...)`. This means every `PUT /api/protected/posts/:id/draft` call silently zeros out `posts.media_ids` because the SQL uses `COALESCE($8, media_ids)` — passing `nil` (which is what an unset `store.UUIDArray` serialises as) means the COALESCE resolves to the existing column value, but the Go `UUIDArray` type's zero value is an empty slice `[]`, not nil, so the column gets overwritten with an empty array on every update.

**Verification of Bug 2 severity:**
`store/post.go` line 159: `media_ids = COALESCE($8, media_ids)`. The Go `store.UUIDArray` zero value is `nil` (an unset `UUIDArray`), which postgres receives as NULL, which means COALESCE returns the existing value. However, looking at the actual path: `updateParams` is built as `store.UpdatePostParams{...}` without assigning `MediaIDs`. The zero value of `store.UUIDArray` is `nil`. So `COALESCE(nil, media_ids)` = existing value. **This means Bug 2 does NOT actively zero out media_ids in isolation.** But it means that when the frontend DOES send a non-empty `media_ids` array (which it correctly does via `persistDraft` — see `draftData.media_ids` built from `state.uploadedMedia` at WizardInner.tsx line 175–178), the `UpdateDraft` processor ignores it and passes nil, so the correct IDs from the frontend are thrown away on every update call.

**The complete failure chain:**
1. User opens existing draft with 6 media items → `state.uploadedMedia` contains 6 items.
2. User clicks Regenerate → `handleGenerate` sends SSE with no `mediaIDs` → AI generates text-only content (no media-aware layout).
3. After generation, user clicks Save Draft / Publish → `persistDraft()` calls `updateDraft(editPostId, { media_ids: [6 IDs], platforms: [...] })`.
4. Handler correctly passes `mediaIDs` to `UpdateDraftParams.MediaIDs`.
5. `UpdateDraft` processor builds `store.UpdatePostParams` WITHOUT `MediaIDs` field → passes nil to `COALESCE` → `posts.media_ids` stays unchanged (existing 6 IDs survive in DB from original draft).
6. Platform posts get platform-adapted text content but NO `image_index` assignments on thread segments because the media-aware path (Bug 1) was never invoked.
7. At publish time, `buildPostSpec` in `workers/async_publish.go` (line 85) reads `post.MediaIDs` from the parent post row — this IS the right source, so the 6 media URLs ARE fetched for the `PostSpec`. **Publishing media attachment works correctly at the worker level.**

**Revised conclusion:**
- Bug 1 is the genuine UX regression: regeneration ignores existing media, so thread segments lack `image_index` assignments and the AI doesn't know about the media while writing copy.
- Bug 2 is a latent data-loss bug: if `media_ids` were sent correctly from the frontend, the processor would silently discard them. Currently masked because Bug 1 means the media-IDs are still in the DB from the original GitHub-capture save.
- The workers DO correctly read media from `posts.media_ids` (not `platform_posts.media_handle`), so media attachment at publish time works once the post row has the right `media_ids`.
- No change is needed to `CreatePlatformPostParams` or the store insert — `media_handle` is correctly set at upload time by the workers, not at draft creation.

### Changes needed

**Backend:** One line fix in `processor.go` — wire `MediaIDs` into `updateParams`.  
**Frontend:** One-line fix in `WizardInner.tsx` — pass `state.uploadedMedia.map(m => m.id)` as 6th arg to `sse.generate()`.  
**Tests:** Add test coverage for the `UpdateDraft` MediaIDs bug and a frontend unit test for `handleGenerate`.

---

## Bug Fix Tasks

### B1: Backend — Wire MediaIDs in UpdateDraft processor

**File:** `base-server/internal/posts/processor/processor.go`

**Location:** Lines 448–452 inside the `UpdateDraft` function.

**Current code (lines 447–455):**
```go
contentType := params.ContentType
updateParams := store.UpdatePostParams{
    Content:     &params.Content,
    ContentType: &contentType,
    BaseContent: params.BaseContent,
}
if params.Tags != nil {
    updateParams.Tags = store.StringArray(params.Tags)
}
```

**Change:** Add `MediaIDs` assignment immediately after the struct literal, alongside the existing `Tags` nil-guard pattern. The guard pattern is different here: we must set `MediaIDs` whenever the caller sends a non-nil array (which includes an empty slice meaning "clear all media"), but NOT when it's nil (meaning "leave media_ids unchanged"). `store.UUIDArray` is `[]uuid.UUID`, so nil means "not provided" and empty slice means "provided but empty".

**Replace the block at lines 447–460 with:**
```go
contentType := params.ContentType
updateParams := store.UpdatePostParams{
    Content:     &params.Content,
    ContentType: &contentType,
    BaseContent: params.BaseContent,
}
if params.Tags != nil {
    updateParams.Tags = store.StringArray(params.Tags)
}
if params.MediaIDs != nil {
    updateParams.MediaIDs = params.MediaIDs
}
```

**Why nil-guard:** `store.UpdatePostParams.MediaIDs` feeds `COALESCE($8, media_ids)` in `sqlUpdatePost`. A nil `UUIDArray` is sent as SQL NULL → COALESCE returns existing value (no change). A non-nil empty slice is sent as `{}` → COALESCE returns `{}` (clears media). `UpdateDraftParams.MediaIDs` is a `store.UUIDArray` which is `nil` for zero-value. The handler always sets it: `mediaIDs := make(store.UUIDArray, 0, len(req.MediaIDs))` — so after handler parsing it is always non-nil (it's at least an empty slice `[]`). This means every `HandleUpdateDraft` call will pass a non-nil (possibly empty) `MediaIDs` to the processor, and the processor should respect it.

**Implication:** After this fix, the frontend's existing correct behaviour in `persistDraft` — which reads `state.uploadedMedia.map(m => m.id)` and sends them as `media_ids` — will now be correctly written to `posts.media_ids` on every update.

---

### B2: Backend unit test — UpdateDraft preserves MediaIDs

**File:** `base-server/internal/posts/processor/processor_test.go`

**Add a new test function** `TestPostProcessor_UpdateDraft_PreservesMediaIDs` following the existing table-driven, `t.Parallel()` pattern used throughout the file.

The test must:
1. Set up a mock store with `NewMockPostStore(ctrl)` and `NewMockEventPublisher(ctrl)`.
2. Expect `GetPostByID` NOT to be called (UpdateDraft doesn't call it).
3. Expect `UpdatePost` to be called with a `store.UpdatePostParams` whose `MediaIDs` equals the IDs passed in `UpdateDraftParams.MediaIDs`.
4. Expect `DeletePlatformPostsByPostID` called once.
5. Expect `CreatePlatformPost` called once per platform.
6. Assert `err == nil` and that the returned post is the one the mock returns.

```go
func TestPostProcessor_UpdateDraft_PreservesMediaIDs(t *testing.T) {
    t.Parallel()
    logger := observability.NewLogger()
    accountID := uuid.New()
    postID := uuid.New()
    mediaID1 := uuid.New()
    mediaID2 := uuid.New()

    t.Run("media_ids are written to UpdatePostParams", func(t *testing.T) {
        t.Parallel()
        ctrl := gomock.NewController(t)
        mockStore := NewMockPostStore(ctrl)
        mockPublisher := NewMockEventPublisher(ctrl)

        expectedMediaIDs := store.UUIDArray{mediaID1, mediaID2}
        contentType := "text"

        mockStore.EXPECT().UpdatePost(
            gomock.Any(),
            accountID,
            postID,
            gomock.AssignableToTypeOf(store.UpdatePostParams{}),
        ).DoAndReturn(func(_ context.Context, _, _ uuid.UUID, p store.UpdatePostParams) (store.Post, error) {
            require.Equal(t, expectedMediaIDs, p.MediaIDs)
            require.Equal(t, "hello", *p.Content)
            require.Equal(t, contentType, *p.ContentType)
            return store.Post{ID: postID, AccountID: accountID, Content: "hello"}, nil
        })
        mockStore.EXPECT().DeletePlatformPostsByPostID(gomock.Any(), postID).Return(nil)
        mockStore.EXPECT().CreatePlatformPost(gomock.Any(), gomock.Any()).Return(store.PlatformPost{}, nil)

        proc := New(mockStore, mockPublisher, logger)
        result, err := proc.UpdateDraft(context.Background(), UpdateDraftParams{
            AccountID:   accountID,
            PostID:      postID,
            Content:     "hello",
            ContentType: contentType,
            MediaIDs:    expectedMediaIDs,
            Platforms: []PlatformDraftContent{
                {Platform: "x", Content: strPtr("platform content")},
            },
        })

        require.NoError(t, err)
        assert.Equal(t, postID, result.ID)
    })

    t.Run("nil media_ids are not set on UpdatePostParams (COALESCE-preserve)", func(t *testing.T) {
        t.Parallel()
        ctrl := gomock.NewController(t)
        mockStore := NewMockPostStore(ctrl)
        mockPublisher := NewMockEventPublisher(ctrl)

        mockStore.EXPECT().UpdatePost(
            gomock.Any(),
            accountID,
            postID,
            gomock.AssignableToTypeOf(store.UpdatePostParams{}),
        ).DoAndReturn(func(_ context.Context, _, _ uuid.UUID, p store.UpdatePostParams) (store.Post, error) {
            require.Nil(t, p.MediaIDs, "nil MediaIDs must not be set so COALESCE preserves existing value")
            return store.Post{ID: postID, AccountID: accountID, Content: "hello"}, nil
        })
        mockStore.EXPECT().DeletePlatformPostsByPostID(gomock.Any(), postID).Return(nil)
        // no platforms → no CreatePlatformPost calls

        proc := New(mockStore, mockPublisher, logger)
        _, err := proc.UpdateDraft(context.Background(), UpdateDraftParams{
            AccountID:   accountID,
            PostID:      postID,
            Content:     "hello",
            ContentType: "text",
            MediaIDs:    nil, // explicitly nil — caller did not provide media_ids
        })

        require.NoError(t, err)
    })
}
```

---

### F1: Frontend — Pass uploadedMedia IDs to sse.generate()

**File:** `webapp/src/components/create-post/WizardInner.tsx`

**Location:** Lines 128–134, inside `handleGenerate`'s `uploadAndGenerate` async function.

**Current code (lines 128–134):**
```ts
sse.generate(
    state.blurb,
    state.selectedPlatforms,
    state.contentType,
    imagePayloads.length > 0 ? imagePayloads : undefined,
    state.contentType === "thread" ? state.maxThreadParts : undefined,
    // 6th arg `mediaIDs?: string[]` is NEVER passed
);
```

**Replacement:**
```ts
// Already-persisted media IDs from initialOverrides (e.g. GitHub-capture draft).
// Pass them as mediaIDs so the backend uses the media-aware generation path,
// which fetches media bytes from S3, decides single-vs-thread, and writes
// [IMAGE:N] markers into thread segments so copy stays aligned with attachments.
// When both uploadedMedia IDs AND fresh pendingFiles exist simultaneously
// (user dragged new files onto an existing draft), prefer mediaIDs — the
// backend prefers mediaIDs over images when both arrive, and the new files
// are being uploaded in parallel above anyway so their IDs will be present
// in state.uploadedMedia after addUploadedMedia() resolves.
const persistedMediaIDs = state.uploadedMedia.map((m) => m.id);

sse.generate(
    state.blurb,
    state.selectedPlatforms,
    state.contentType,
    imagePayloads.length > 0 ? imagePayloads : undefined,
    state.contentType === "thread" ? state.maxThreadParts : undefined,
    persistedMediaIDs.length > 0 ? persistedMediaIDs : undefined,
);
```

**Why this is safe for the new-post flow:**
On a brand-new post, `state.uploadedMedia` is empty (no `initialOverrides`) until after `addUploadedMedia()` is called inside the parallel S3 upload loop within `uploadAndGenerate`. The `Promise.all` runs base64 conversion AND S3 upload in parallel; `sse.generate()` is called only after the `await Promise.all(...)` resolves. At that point, the loop that calls `wizard.addUploadedMedia(media)` has completed, so any newly-uploaded files WILL be in `state.uploadedMedia` — but wait, there's a subtlety: `wizard.addUploadedMedia` dispatches a React reducer action, but `state` is a closure capture from the `useCallback` deps. The state inside `uploadAndGenerate` may not reflect the post-upload `uploadedMedia` because state is closed over at the time `handleGenerate` was called.

**Correct approach to avoid the closure staleness problem:**
Capture the persisted IDs **before** the parallel upload, then separately collect the newly-uploaded IDs from the upload loop, and merge at the end.

**Final replacement (full `uploadAndGenerate` async block, lines 106–135):**
```ts
const uploadAndGenerate = async () => {
    // IDs already persisted from initialOverrides (e.g. GitHub-capture draft).
    // Captured before the upload loop so closure staleness is not an issue.
    const alreadyPersistedIDs = state.uploadedMedia.map((m) => m.id);

    const validFiles = state.pendingFiles
        .filter((f) => !f.error)
        .map((f) => f.file);

    // Collect IDs from newly uploaded files (uploaded in parallel with base64).
    const newlyUploadedIDs: string[] = [];

    // S3 upload (for publishing) and base64 (for AI) run in parallel
    const [imagePayloads] = await Promise.all([
        validFiles.length > 0 ? filesToBase64(validFiles) : Promise.resolve([]),
        (async () => {
            for (const pendingFile of state.pendingFiles) {
                if (!pendingFile.error) {
                    try {
                        const media = await uploadMedia(pendingFile.file);
                        wizard.addUploadedMedia(media);
                        newlyUploadedIDs.push(media.id);
                    } catch {
                        // continue with remaining files
                    }
                }
            }
        })(),
    ]);

    // Combine persisted IDs with any newly-uploaded IDs.
    const allMediaIDs = [...alreadyPersistedIDs, ...newlyUploadedIDs];

    sse.generate(
        state.blurb,
        state.selectedPlatforms,
        state.contentType,
        imagePayloads.length > 0 ? imagePayloads : undefined,
        state.contentType === "thread" ? state.maxThreadParts : undefined,
        allMediaIDs.length > 0 ? allMediaIDs : undefined,
    );
};
```

**Update the `useCallback` dependency array** (lines 138–147) to remove `state.uploadedMedia` if present (it isn't currently) — no change needed to deps since `state.uploadedMedia` is already accessed via `state` which is in the closure but `state` itself is not listed as a dep. The `state` object is destructured: deps list `state.blurb`, `state.selectedPlatforms`, `state.pendingFiles`, `state.contentType`, `state.maxThreadParts`. Add `state.uploadedMedia` to the dependency array so the callback captures a fresh list when media changes:

```ts
}, [
    state.blurb,
    state.selectedPlatforms,
    state.pendingFiles,
    state.contentType,
    state.maxThreadParts,
    state.uploadedMedia,   // ← ADD THIS
    wizard,
    sse,
    uploadMedia,
]);
```

---

### F2: Frontend unit test — handleGenerate passes uploadedMedia IDs

**File:** `webapp/src/components/create-post/WizardInner.test.tsx` (create if not present)

This test is a focused unit test using Vitest + React Testing Library. It does not need to test the full wizard render — test the `handleGenerate` logic by rendering `WizardInner` with a minimal `initialOverrides` that includes pre-populated `uploadedMedia`, mocking `useSSEContentGenerate`, and asserting that `generate()` is called with the correct 6th argument.

The test file should:
1. Mock `@/hooks/useSSEContentGenerate` to expose a `jest.fn()` for `generate`.
2. Mount `WizardInner` with `initialOverrides={{ uploadedMedia: [{ id: "media-1", ... }], selectedPlatforms: ["x"], blurb: "test blurb", contentType: "text" }}`.
3. Mock `@/hooks/useUploadMedia` to return `{ uploadMedia: jest.fn() }`.
4. Mock `@/hooks/useSaveDraft`, `@/hooks/useUpdateDraft`, `@/hooks/usePublishPost`, `@/hooks/useSchedulePost`, `@/hooks/useUnlinkMedia` with no-ops.
5. Click the Generate button.
6. Assert `generate` was called with 6 arguments where the 6th equals `["media-1"]`.

**Key assertions:**
- When `uploadedMedia` is non-empty, 6th arg is `string[]` of IDs.
- When `uploadedMedia` is empty, 6th arg is `undefined`.

---

## Answers to Key Questions

### Q1: Does the media-aware backend path return different SSE events?

Yes. When `mediaIDs` is passed, the backend routes to `handleStreamGenerateWithMedia` which calls `GenerateWithMediaPlan`. This path emits:
- A single `phase` event with `{"phase":"generating","platform":""}`.
- One `platform_done` event per platform.
- One `thread_done` event per platform when mode is "thread" — crucially, `thread_done` segments have `image_index` fields set by `assignMediaIndexesToSegments`, aligning copy with media slots.
- A `done` event.

The frontend `useSSEContentGenerate` already handles all these events at lines 218–229. The `useWizardSSESync` hook syncs `sse.threadContent` (which includes `imageIndex` per segment) into `wizard.setThreadContent`. `persistDraft` then reads `state.threadContent[platform]` and sends it as `thread_segments` in the request body. So the `image_index` assignments flow correctly through to the database — once Bug 1 is fixed so the media-aware path is actually invoked.

### Q2: Does `persistDraft` preserve `media_ids` after regeneration?

Yes. `persistDraft` (lines 154–202 in WizardInner.tsx) reads `state.uploadedMedia` directly and builds `media_ids`:
```ts
media_ids: state.uploadedMedia.length > 0
    ? state.uploadedMedia.map((m) => m.id)
    : undefined,
```
`state.uploadedMedia` is NOT cleared by `START_GENERATION` (the reducer only clears `platformContent`, `threadContent`, `generationProgress`, `error`). So after regeneration, `uploadedMedia` still holds the original 6 items and `persistDraft` sends them correctly. The problem was only that the processor discarded them (Bug 2).

### Q3: Do workers read media from `posts.media_ids` or `platform_posts.media_handle`?

Workers read media from `posts.media_ids` (parent post). `buildPostSpec` in `workers/async_publish.go` line 85: `if len(post.MediaIDs) > 0 { items, err := s.GetMediaByIDs(ctx, []uuid.UUID(post.MediaIDs)) ... spec.MediaURLs = ... }`. The `platform_posts.media_handle` field is set by the uploader worker to store the platform's async upload receipt (e.g. X's `media_id` from the chunked upload API). It is read back by the finalizer/reconciler to track upload status. It is NOT used to source which media to attach — that comes from `posts.media_ids` exclusively.

**Conclusion on Bug 2 scope:** Bug 2 must be fixed because it causes the `media_ids` the frontend sends to be silently discarded. Even though the current symptom is masked (the original IDs survive in the DB from the GitHub-capture save), if a user removes a media item via `handleRemoveUploadedMedia` (which calls `unlinkMedia` server-side then `wizard.removeUploadedMedia`), then clicks Save Draft, the correct reduced media list from `state.uploadedMedia` would be sent in the request body — but the processor would ignore it and leave the old (pre-removal) `media_ids` in the database. This is a data-integrity bug.

---

## Implementation Order

These tasks are independent of each other and can be implemented in parallel:

1. **B1** (backend processor fix) — one `if` block addition.
2. **B2** (backend test) — new test function in existing file.
3. **F1** (frontend call site fix) — rewrite of the `uploadAndGenerate` closure.
4. **F2** (frontend test) — new test file.

All four can be written in a single commit once complete.

---

## Verification Steps

After applying all changes:

1. `cd base-server && go test ./internal/posts/processor/... -run TestPostProcessor_UpdateDraft` — must pass including new test cases.
2. `cd base-server && go build ./...` — must pass.
3. `cd webapp && npm run build` — must pass (TypeScript strict mode will catch type errors in the `uploadAndGenerate` rewrite).
4. `cd webapp && npm run lint` — must pass.
5. Manual smoke test: open an existing GitHub-capture draft with media, click Regenerate, verify SSE request body contains `media_ids`, verify resulting draft still has media attached, verify thread segments have `image_index` values.
