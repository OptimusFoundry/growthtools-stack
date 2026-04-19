# Fix: Regenerate Media Matching

**Goal:** Make the regenerate path (handleStreamGenerateWithMedia) assign images to thread segments based on topical fit rather than positional order, by having the AI emit [IMAGE:N] markers after reading image descriptions.
**Scope:** backend-only

---

## Problem Summary

`handleStreamGenerateWithMedia` builds a `MediaPlan` (positional order: video on segment 1, images on 2, 3, …) and passes it to `GenerateWithMediaPlan`. That function calls `SystemThreadWithMediaPlan`, which tells the AI "Segment 1: a video, Segment 2: a screenshot" without ever showing the AI what is IN each screenshot. The AI writes copy without knowing what the images show. After generation, `assignMediaIndexesToSegments` in the handler glues images to segments by array position. Result: a segment about "the new dashboard chart" may end up paired with a screenshot of the settings panel.

The fix threads image descriptions through the prompt so the AI can elect which segment each image belongs on, using the already-established `[IMAGE:N]` marker protocol from `parseThreadSegmentsWithImages`. Video remains pinned to segment 1 deterministically (not AI-assigned). Images without an AI marker are dropped — no fallback to positional assignment.

---

## Architecture Summary

### What changes

**`prompts.go` — `SystemThreadWithMediaPlan` and `SystemSingleWithMediaPlan`**
Both functions currently accept a `*MediaPlan` and build a positional layout description. They must be changed to accept an additional `[]ImageDescription` parameter. When descriptions are provided, thread mode switches to AI-marker mode (identical to `SystemThread` with image descriptions): the AI is asked to emit `[IMAGE:N]` at the end of the segment whose copy best fits each image. Single mode passes descriptions straight to `SystemAdapt` (which already handles `[]ImageDescription` correctly).

Video is handled separately: `SystemThreadWithMediaPlan` continues to mention "a video on segment 1" as a positional pin; the AI is NOT asked to emit a video marker.

**`processor/media_plan.go` — `GenerateWithMediaPlan`**
Before the per-platform goroutines run, call `p.DescribeImages(ctx, images)` to get `[]ImageDescription`. Pass the descriptions into `SystemThreadWithMediaPlan` and `SystemSingleWithMediaPlan`. In thread mode, replace `parseThreadSegments` (plain string split) with `parseThreadSegmentsWithImages` (marker-aware) so the returned segments carry AI-assigned `ImageIndex` values. Remove the pass-through of a nil `ImageIndex` — segments that the AI did not mark simply have `ImageIndex == nil`.

`GenerateWithMediaPlan` must accept the raw `[]aiclient.ImageData` so it can call `DescribeImages`. The existing signature passes a `*MediaPlan` and no image bytes. Change the signature to:

```go
func (p *ContentProcessor) GenerateWithMediaPlan(
    ctx context.Context,
    accountID uuid.UUID,
    prompt string,
    platforms []string,
    plan *prompts.MediaPlan,
    images []aiclient.ImageData,  // NEW — only still images, not the video
) (string, map[string]ThreadWithMediaPlanResult, error)
```

**`handler/handler.go` — `handleStreamGenerateWithMedia`**
Pass `images` (the slice returned by `FetchAndBucketMedia`) to `GenerateWithMediaPlan`. Remove the call to `assignMediaIndexesToSegments` — segments returned from the processor already carry AI-assigned indexes. Delete `assignMediaIndexesToSegments` entirely since it is no longer used.

### What does NOT change
- `parseThreadSegmentsWithImages` in `generate.go` — reused as-is.
- `DescribeImages` in `media_plan.go` — reused as-is.
- `FetchAndBucketMedia` — unchanged.
- The SSE streaming path (`StreamGenerateAndAdapt` / `streamPlatform`) — unrelated.
- Single-post branch of `GenerateWithMediaPlan` — descriptions are passed to `SystemSingleWithMediaPlan`, which forwards them to `SystemAdapt`. `SystemAdapt` already renders the image description block. No marker parsing needed for single mode.

---

## Phase 1 — Prompt changes

### P1: Update `SystemThreadWithMediaPlan` and `SystemSingleWithMediaPlan` signatures and bodies

**File:** `base-server/internal/content/prompts/prompts.go`

**`SystemSingleWithMediaPlan` change:**

Current signature:
```go
func SystemSingleWithMediaPlan(platformID string, voice *VoiceContext, plan *MediaPlan) string
```

New signature:
```go
func SystemSingleWithMediaPlan(platformID string, voice *VoiceContext, plan *MediaPlan, imageDescriptions []ImageDescription) string
```

Behavior change: replace the call `SystemAdapt(platformID, voice, nil)` with `SystemAdapt(platformID, voice, imageDescriptions)`. All other body logic unchanged. The video and image-count summary block at the bottom of the function stays — it tells the AI what media is attached and instructs it NOT to emit `[IMAGE:N]`, which remains correct for single mode (no markers needed; all media rides on the one post).

**`SystemThreadWithMediaPlan` change:**

Current signature:
```go
func SystemThreadWithMediaPlan(platformID string, maxThreadParts int, plan *MediaPlan) string
```

New signature:
```go
func SystemThreadWithMediaPlan(platformID string, maxThreadParts int, plan *MediaPlan, imageDescriptions []ImageDescription) string
```

Behavior change — replace the current body entirely. The new body must:

1. Call `SystemThread(platformID, maxThreadParts, nil)` to get the base thread prompt (without image instructions, since we'll add them manually below).
2. If `plan == nil || (plan.VideoIndex == 0 && len(imageDescriptions) == 0)`, return the base immediately.
3. Otherwise, append a `## Media Placement` section. The section must:
   a. If `plan.VideoIndex > 0`: state "Segment 1 has a short video clip demonstrating the change. Open segment 1 with a hook that references what the viewer is about to see. Do NOT emit an [IMAGE:N] marker for the video."
   b. If `len(imageDescriptions) > 0`: state the AI-marker rules — identical to the block in `SystemThread` for the multi-image case. Specifically:
      - "You have N still image(s) to assign across thread segments (not segment 1 if a video is present there)."
      - "To assign an image, add `[IMAGE:N]` on its own line at the end of the thread part, where N is the image number from the list below."
      - "Each image may be assigned to at most one segment. Do NOT assign an image to a segment whose copy is not topically related to it. If an image does not fit any segment, omit it — do not force it."
      - List each image: `- Image N: <description>`
   c. If there are no image descriptions (video-only plan), just emit the video pin instruction and return.

**Acceptance check:** `go build ./...` passes. No callers of these functions exist yet with the new signature — the only callers are in `media_plan.go`, which will be updated in P2.

---

## Phase 2 — Processor wiring

### P2: Update `GenerateWithMediaPlan` to describe images and use AI-marker parsing

**File:** `base-server/internal/content/processor/media_plan.go`

**Signature change:**

```go
func (p *ContentProcessor) GenerateWithMediaPlan(
    ctx context.Context,
    accountID uuid.UUID,
    prompt string,
    platforms []string,
    plan *prompts.MediaPlan,
    images []aiclient.ImageData,
) (string, map[string]ThreadWithMediaPlanResult, error)
```

**Body changes — before the goroutine fan-out:**

Add a describe step immediately after the `voice` lookup:

```go
var imageDescs []ImageDescription
if len(images) > 0 {
    imageDescs = p.DescribeImages(ctx, images)
}
```

**Inside each goroutine, thread mode branch:**

Replace:
```go
sysPrompt = prompts.SystemThreadWithMediaPlan(platform, parts, plan)
```
With:
```go
sysPrompt = prompts.SystemThreadWithMediaPlan(platform, parts, plan, imageDescriptionsForPrompts(imageDescs))
```

Replace the parsing block in thread mode:
```go
parts := parseThreadSegments(raw)
segments := make([]ThreadSegment, 0, len(parts))
joined := make([]string, 0, len(parts))
for _, s := range parts {
    trimmed := truncateToCharLimit(s, charLimit)
    segments = append(segments, ThreadSegment{Content: trimmed})
    joined = append(joined, trimmed)
}
```
With:
```go
segments := parseThreadSegmentsWithImages(raw)
joined := make([]string, 0, len(segments))
for i, seg := range segments {
    segments[i].Content = truncateToCharLimit(seg.Content, charLimit)
    joined = append(joined, segments[i].Content)
}
```

This means `ThreadSegment.ImageIndex` values are now AI-assigned (or nil if the AI did not mark the segment). The handler uses them directly.

**Inside each goroutine, single mode branch:**

Replace:
```go
sysPrompt = prompts.SystemSingleWithMediaPlan(platform, voice, plan)
```
With:
```go
sysPrompt = prompts.SystemSingleWithMediaPlan(platform, voice, plan, imageDescriptionsForPrompts(imageDescs))
```

Single-mode segment construction is unchanged (one segment, `ImageIndex` stays nil — single posts don't use `[IMAGE:N]`).

**Acceptance check:** `go build ./...` passes. The handler call site will fail to compile until P3 is done.

---

## Phase 3 — Handler cleanup

### P3: Update `handleStreamGenerateWithMedia` and delete `assignMediaIndexesToSegments`

**File:** `base-server/internal/content/handler/handler.go`

**Change 1 — pass `images` to `GenerateWithMediaPlan`:**

Current call:
```go
baseContent, perPlatform, err := h.processor.GenerateWithMediaPlan(ctx, accountID, req.Prompt, req.Platforms, plan)
```

New call:
```go
baseContent, perPlatform, err := h.processor.GenerateWithMediaPlan(ctx, accountID, req.Prompt, req.Platforms, plan, images)
```

`images` is the slice already in scope from the `FetchAndBucketMedia` call above.

**Change 2 — remove `assignMediaIndexesToSegments` call:**

Current:
```go
segs := assignMediaIndexesToSegments(result.Segments, plan)
threadResults[platform] = segs
writeSSE("thread_done", mustMarshal(map[string]any{"platform": platform, "segments": segs}))
```

New:
```go
threadResults[platform] = result.Segments
writeSSE("thread_done", mustMarshal(map[string]any{"platform": platform, "segments": result.Segments}))
```

**Change 3 — delete `assignMediaIndexesToSegments`:**

Delete the entire function `assignMediaIndexesToSegments` (lines 413–436). It is no longer called from anywhere.

**Change 4 — video pinning:**

The video is pinned to segment 1 by the prompt instruction added in P1 (the AI is told "Segment 1 has a video — do NOT emit an IMAGE marker for it"). The handler does NOT need to programmatically pin the video after the fact. If you want belt-and-suspenders safety: after calling `GenerateWithMediaPlan`, if `plan.VideoIndex > 0` and `len(result.Segments) > 0` and `result.Segments[0].ImageIndex == nil`, set `result.Segments[0].ImageIndex = &plan.VideoIndex`. This is optional — the prompt instruction should be sufficient, but the plan author recommends adding it as a one-liner defensive pin only for the video (not for still images).

**Acceptance check:** `go build ./...` passes with zero errors.

---

## Phase 4 — Tests

### T1: Update `TestContentProcessor_GenerateWithMediaPlan`

**File:** `base-server/internal/content/processor/processor_test.go`

The existing test cases pass `images` as an empty slice because the new parameter must be supplied. All existing test cases must be updated to pass `images []aiclient.ImageData` (empty `nil` or `[]aiclient.ImageData{}`) as the last argument to `proc.GenerateWithMediaPlan(...)`.

**Existing test case update — "happy path single platform produces base and thread segments":**

The assertion `assert.Nil(t, r.Segments[0].ImageIndex, "caller assigns image index")` was correct under the old design. Under the new design, the comment is wrong but the assertion remains correct: when no images are passed in, `parseThreadSegmentsWithImages` finds no `[IMAGE:N]` markers and `ImageIndex` is nil. Update the comment to `"no images provided — ImageIndex is nil"`.

**New test cases to add to `TestContentProcessor_GenerateWithMediaPlan`:**

**Case: "thread mode with images — AI assigns markers, segments carry ImageIndex"**
- `platforms`: `[]string{"x"}`
- `plan`: `&prompts.MediaPlan{Mode: "thread", ThreadParts: 3, ImageIndexes: []int{1, 2}}`
- `images`: `[]aiclient.ImageData{{MIMEType: "image/png", Data: []byte("img1")}, {MIMEType: "image/png", Data: []byte("img2")}}`
- Mocks (4 AI calls):
  1. `GetVoiceProfileByAccount` → `ErrNotFound` (AnyTimes)
  2. `CreateMessage` (first call, image description for img1) → `"A chart showing retention metrics"`
  3. `CreateMessage` (second call, image description for img2) → `"A modal dialog for onboarding"`
  4. `CreateMessage` (third call, base content) → `"base content"`
  5. `CreateMessage` (fourth call, platform thread) → `"hook copy\n[IMAGE:1]---THREAD_BREAK---detail copy\n[IMAGE:2]---THREAD_BREAK---cta copy"`
- Assert:
  - `r.Segments` has length 3
  - `r.Segments[0].ImageIndex` is not nil and equals `1`
  - `r.Segments[1].ImageIndex` is not nil and equals `2`
  - `r.Segments[2].ImageIndex` is nil

**Case: "thread mode with images — AI omits marker for image 2, segment 2 has nil ImageIndex"**
- Same setup as above but platform AI response: `"hook copy\n[IMAGE:1]---THREAD_BREAK---detail copy---THREAD_BREAK---cta copy"`
- Assert:
  - `r.Segments[0].ImageIndex` equals `1`
  - `r.Segments[1].ImageIndex` is nil (AI did not mark it — image 2 is dropped, no fallback)
  - `r.Segments[2].ImageIndex` is nil

**Case: "single mode with images — descriptions passed, no markers in output"**
- `platforms`: `[]string{"linkedin"}`
- `plan`: `&prompts.MediaPlan{Mode: "single", ImageIndexes: []int{1}}`
- `images`: `[]aiclient.ImageData{{MIMEType: "image/png", Data: []byte("img1")}}`
- Mocks (3 AI calls):
  1. `GetVoiceProfileByAccount` → `ErrNotFound`
  2. `CreateMessage` (image description) → `"A dashboard showing daily active users"`
  3. `CreateMessage` (base content) → `"base"`
  4. `CreateMessage` (platform single) → `"great post about the dashboard"`
- Assert:
  - `r.Segments` has length 1
  - `r.Segments[0].Content` equals `"great post about the dashboard"`
  - `r.Segments[0].ImageIndex` is nil (single mode never parses markers)

**Case: "no images provided — describe step is skipped"**
- `plan`: `&prompts.MediaPlan{Mode: "thread", VideoIndex: 1}` (video-only)
- `images`: `nil`
- Mocks: only 2 AI calls (base + platform thread). No `CreateMessage` calls for description.
- Assert segments parse correctly from AI response.

**Note on mock call ordering:** `DescribeImages` fires goroutines in parallel, each calling `CreateMessage`. Use `.Times(N)` rather than ordered `InOrder` expectations for description calls. The base content call is sequentially after all description calls complete (errgroup.Wait), so it is safe to set a separate expectation for it.

**T2: Update `TestParseThreadSegmentsWithImages` (no change needed)**

This function is already tested and its behavior is unchanged. No modifications required.

**T3: Verify build and tests pass**

After all changes:
```
cd base-server && go build ./...
cd base-server && go test ./internal/content/...
```

Both must exit 0 with no new failures.

---

## Implementation order

Execute phases in order — each phase must compile before the next starts:

| Phase | Parallelisable? | Files touched |
|-------|-----------------|---------------|
| P1 (prompt signatures + bodies) | No (sets the contract) | `prompts/prompts.go` |
| P2 (processor wiring) | After P1 | `processor/media_plan.go` |
| P3 (handler cleanup) | After P2 | `handler/handler.go` |
| T1 (test updates) | After P3 | `processor/processor_test.go` |

P1, P2, P3 are a linear chain. T1 can be done in the same pass as P3 since it only touches the test file.

---

## Acceptance criteria

1. `go build ./...` exits 0 from `base-server/`.
2. `go test ./internal/content/...` exits 0 with all existing tests passing plus the new cases added in T1.
3. `assignMediaIndexesToSegments` no longer exists in `handler/handler.go`.
4. `GenerateWithMediaPlan` calls `DescribeImages` when `len(images) > 0` and skips it when `images` is empty/nil.
5. Thread segments returned from `GenerateWithMediaPlan` carry `ImageIndex` values set by the AI (or nil when the AI emitted no marker for that segment).
6. No code path in the regenerate flow falls back to positional image assignment.
