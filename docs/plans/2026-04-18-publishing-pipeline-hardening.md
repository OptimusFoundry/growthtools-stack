# Publishing Pipeline Hardening Plan

**Goal:** Eliminate silent error swallowing across all workers and platform adapters, then back every failure path with targeted unit tests that would have caught the three known production bugs.

**Scope:** backend-only

---

## Architecture Summary

### What went wrong (three production bugs)

The three bugs share a single failure pattern: an error was either swallowed silently or a zero value was used as a success sentinel, letting the pipeline continue as if nothing had gone wrong.

1. `ReadyReconciler.fail` — now fixed (the `next_retry_at` nil bug was already corrected in the current code). The current code at line 153 correctly computes `nextRetry`.
2. `x_async.go StartPublish` — a download failure appends `xMediaItem{}` (empty struct, `MediaID == ""`). `CheckReady` at line 104 correctly guards empty `MediaID` with an error return — but the `StartPublish` upload failure path at line 66–68 also appends `xMediaItem{State: "failed"}` with no `MediaID`, yet `readyNow` is set to `false` causing the item to enter the reconciler. `CheckReady` then catches this at line 104 and returns an error. So the upload failure path is now correctly surfaced. However, the download failure path at line 57 appends `xMediaItem{}` with no state set at all, which would cause `CheckReady` to see `item.State != "succeeded"` and `item.MediaID == ""` and return an error — so this is also caught. The comment in the original bug report describes an older version of the code.
3. `x.go PublishThread` — the sync path at lines 85–99 calls `downloadMedia` and on failure returns `firstResult, fmt.Errorf(...)`. This is correct — it does propagate the error. However the sync `Publish` method (lines 37–53) logs the error and continues (`continue`), publishing without the media. This is the live bug.

### Remaining silent-swallow issues found in the current code

After reading every worker and adapter file, the following issues remain:

**Issue A: `x.go Publish` — media upload failures are silently skipped**
Lines 38–52: Both `downloadMedia` failure and `UploadMedia` failure call `a.logger.Error` then `continue`. The tweet is then published without the media. The caller sees a success result. This is the root of bug #3 — the sync path (used by the legacy `PublishWorker` and by `RetryWorker`) silently drops media.

**Issue B: `bluesky.go Publish` — media upload failures silently continue**
Lines 47–66: Both `downloadMedia` and `UploadBlob` failures call `a.logger.Error` then `continue`. The post is published without the failed media attachment.

**Issue C: `bluesky.go PublishThread` — media upload failures per segment silently continue**
Lines 127–144: Same pattern — download failure and blob upload failure both log and continue, causing the segment to post without its media embed.

**Issue D: `linkedin.go Publish` — media upload failures silently continue**
Lines 37–55: `downloadMedia`, `InitializeImageUpload`, and `UploadImage` failures all call `a.logger.Error` and `continue`, publishing without any media assets.

**Issue E: `bluesky_async.go StartPublish` — media upload failures append empty item**
Lines 46–57: Both download and upload failures append `blueskyHandleItem{}` (Blob is nil). Finalize's `buildBlueskyEmbed` skips nil blobs (line 181), so Finalize publishes without that media slot — silently degraded.

**Issue F: `x_async.go StartPublish` download failure — empty item appended, no state set**
Line 57: Download failure appends `xMediaItem{}` with empty MediaID and empty State. `CheckReady` detects `MediaID == ""` and returns an error (correctly), but `readyNow` is not set to `false` in this code path — the item was appended but `readyNow` remains at its current value. Actually reading more carefully: `readyNow` starts `true` and is set to `false` only by upload failure or non-succeeded processing info. A download failure does NOT set `readyNow = false`. So if all other items are succeeded images (images don't have processing info so they stay succeeded), `readyNow` remains true, the empty item goes to Finalize (not CheckReady), and Finalize's `mediaIDForIndex` returns `nil` for that slot — silently publishing without that media. This is a live bug.

**Issue G: `MediaUploadWorker.markFailed` — does not call `reconcileParentStatus`**
Line 166–173: When `markFailed` is called, it updates the platform post to failed but does NOT call `reconcileParentStatus`. This means the parent post status is never updated when a media upload phase failure occurs — the post stays stuck in `publishing` status indefinitely (until the `RecoverStuckPublishing` timer fires).

**Issue H: `FinalizerWorker.markFailed` — uses hardcoded `time.Minute` retry, not exponential backoff**
Line 136: `retry := now.Add(time.Minute)` — ignores `attemptCount` and `maxAttempts`, always schedules 1 minute regardless of attempt number, and always schedules a retry even at max attempts.

**Issue I: `pinterest.go Publish` — panics if `ListBoards` returns empty slice**
Line 50: `boards[0].ID` with no bounds check. If the user has zero boards, this panics.

**Issue J: `analytics.go` — analytics failure returns hard error, causing Kafka redelivery forever**
Lines 98–127: Any error (token refresh, adapter, engagement fetch, DB write) returns a non-nil error from `handle()`. Kafka will redeliver indefinitely. Analytics collection failure should be logged and swallowed (unlike publishing failures which should retry with backoff). There is no retry limit, no DLQ, and no idempotency guard.

**Issue K: `DraftGeneratorWorker.handle` swallows all errors**
Line 63: Hard failures are explicitly swallowed with `return nil`. The comment says "an AI call that blew up once is unlikely to recover." This is intentional but means users can never see why draft generation failed — no error is persisted to the commit row.

### Test coverage gaps

The following worker behaviors have zero test coverage:
- `DispatchWorker.handle` — no tests
- `MediaUploadWorker.handle` — no tests (the most complex new worker)
- `ReadyReconciler.advance` / `tick` — no tests
- `FinalizerWorker.handle` — no tests
- `AnalyticsWorker.handle` — no tests
- `DraftGeneratorWorker.handle` — no tests
- All platform adapter `Publish` methods — no unit tests (3.12 is `todo`)
- All platform adapter `StartPublish` / `CheckReady` / `Finalize` methods — no unit tests

---

## Fix Tasks

### F1: Fix `x.go Publish` — stop silently swallowing media upload failures

**File:** `base-server/internal/platform/adapters/x.go`

**Lines affected:** 37–53 (the `Publish` method's media upload loop)

**Current behaviour:** Each `downloadMedia` or `UploadMedia` failure logs and `continue`s, publishing the tweet without that media.

**Fix:** Return an error immediately on any media failure. Media is intentional — if the post was created with media, publishing without it is a data integrity failure. The `PublishThread` path already does this correctly (lines 85–99 return errors); `Publish` must match.

```go
// Replace the continue-on-error loop with:
for _, mediaURL := range mediaURLs {
    mediaBytes, contentType, err := downloadMedia(ctx, mediaURL)
    if err != nil {
        return PlatformPostResult{}, fmt.Errorf("x adapter: download media: %w", err)
    }
    mediaID, err := a.client.UploadMedia(ctx, x.UploadMediaRequest{
        MediaBytes: mediaBytes,
        MediaType:  contentType,
    }, accessToken, tokenSecret)
    if err != nil {
        return PlatformPostResult{}, fmt.Errorf("x adapter: upload media: %w", err)
    }
    mediaIDs = append(mediaIDs, mediaID)
}
```

**Why:** Makes the sync publish path consistent with the thread path. Callers (PublishWorker, RetryWorker) already handle errors from `Publish` and mark the platform post failed with retry scheduling.

---

### F2: Fix `bluesky.go Publish` — stop silently swallowing media upload failures

**File:** `base-server/internal/platform/adapters/bluesky.go`

**Lines affected:** 47–66 (the `Publish` method's media loop)

**Fix:** Same pattern as F1 — return on first media failure.

```go
for _, mediaURL := range mediaURLs {
    mediaBytes, contentType, err := downloadMedia(ctx, mediaURL)
    if err != nil {
        return PlatformPostResult{}, fmt.Errorf("bluesky adapter: download media: %w", err)
    }
    blob, err := a.client.UploadBlob(ctx, session.AccessJwt, mediaBytes, contentType)
    if err != nil {
        return PlatformPostResult{}, fmt.Errorf("bluesky adapter: upload blob: %w", err)
    }
    if strings.HasPrefix(contentType, "video/") {
        if videoBlob == nil {
            videoBlob = blob
        }
        continue
    }
    images = append(images, map[string]any{"alt": "", "image": blob})
}
```

**Why:** Same reasoning as F1. The existing log-and-continue silently degrades published posts.

---

### F3: Fix `bluesky.go PublishThread` — propagate per-segment media failures

**File:** `base-server/internal/platform/adapters/bluesky.go`

**Lines affected:** 127–144 (the `PublishThread` method's per-segment media block)

**Fix:** Return an error from the segment loop on download or upload failure.

```go
if mediaURL := mediaURLForSegment(seg, mediaURLs); mediaURL != "" {
    mediaBytes, contentType, err := downloadMedia(ctx, mediaURL)
    if err != nil {
        return firstResult, fmt.Errorf("bluesky adapter: segment %d download media: %w", i+1, err)
    }
    blob, err := a.client.UploadBlob(ctx, session.AccessJwt, mediaBytes, contentType)
    if err != nil {
        return firstResult, fmt.Errorf("bluesky adapter: segment %d upload blob: %w", i+1, err)
    }
    if strings.HasPrefix(contentType, "video/") {
        videoBlob = blob
    } else {
        images = append(images, map[string]any{"alt": "", "image": blob})
    }
}
```

**Why:** Segments with intentional media references must fail hard, not silently post without media.

---

### F4: Fix `linkedin.go Publish` — stop silently swallowing media upload failures

**File:** `base-server/internal/platform/adapters/linkedin.go`

**Lines affected:** 37–55

**Fix:** Return an error on any media failure step. LinkedIn's image upload is a 3-step chain (download → initUpload → upload); failure at any step means no usable asset exists.

```go
for _, mediaURL := range mediaURLs {
    mediaBytes, _, err := downloadMedia(ctx, mediaURL)
    if err != nil {
        return PlatformPostResult{}, fmt.Errorf("linkedin adapter: download media: %w", err)
    }
    initResp, err := a.client.InitializeImageUpload(ctx, conn.AccessToken, authorURN)
    if err != nil {
        return PlatformPostResult{}, fmt.Errorf("linkedin adapter: initialize image upload: %w", err)
    }
    if err := a.client.UploadImage(ctx, conn.AccessToken, initResp.UploadURL, mediaBytes); err != nil {
        return PlatformPostResult{}, fmt.Errorf("linkedin adapter: upload image: %w", err)
    }
    mediaAssets = append(mediaAssets, map[string]any{"id": initResp.ImageURN})
}
```

**Why:** Same reasoning as F1/F2.

---

### F5: Fix `bluesky_async.go StartPublish` — propagate empty blob items to CheckReady correctly

**File:** `base-server/internal/platform/adapters/bluesky_async.go`

**Lines affected:** 46–57

**Fix:** When download or upload fails, do NOT append an empty item that silently becomes a no-op in `Finalize`. Instead, return an error from `StartPublish` immediately so the pipeline marks the platform post failed and schedules retry.

```go
for _, mediaURL := range spec.MediaURLs {
    mediaBytes, contentType, err := downloadMedia(ctx, mediaURL)
    if err != nil {
        return nil, false, fmt.Errorf("bluesky adapter: download media: %w", err)
    }
    blob, err := a.client.UploadBlob(ctx, session.AccessJwt, mediaBytes, contentType)
    if err != nil {
        return nil, false, fmt.Errorf("bluesky adapter: upload blob: %w", err)
    }
    handle.Items = append(handle.Items, blueskyHandleItem{
        Blob:    blob,
        IsVideo: strings.HasPrefix(contentType, "video/"),
    })
}
```

**Why:** An empty item in the handle causes Finalize to silently publish without that media. The pipeline's `markFailed` path already handles the error case with proper retry scheduling.

---

### F6: Fix `x_async.go StartPublish` — download failure must set `readyNow = false`

**File:** `base-server/internal/platform/adapters/x_async.go`

**Lines affected:** 50–59

**Fix:** When download fails, either return an error immediately (preferred, matches F1–F5 philosophy) or set `readyNow = false` and set the item state to `"failed"`. The clean fix is to return an error:

```go
for _, mediaURL := range spec.MediaURLs {
    mediaBytes, contentType, err := downloadMedia(ctx, mediaURL)
    if err != nil {
        return nil, false, fmt.Errorf("x adapter: download media: %w", err)
    }
    res, err := a.client.UploadMediaAsync(ctx, x.UploadMediaRequest{
        MediaBytes: mediaBytes,
        MediaType:  contentType,
    }, accessToken, tokenSecret)
    if err != nil {
        return nil, false, fmt.Errorf("x adapter: upload media: %w", err)
    }
    item := xMediaItem{MediaID: res.MediaID, Info: res.ProcessingInfo}
    if res.ProcessingInfo == nil || res.ProcessingInfo.State == "" || res.ProcessingInfo.State == "succeeded" {
        item.State = "succeeded"
    } else {
        item.State = res.ProcessingInfo.State
        readyNow = false
    }
    handle.Items = append(handle.Items, item)
}
```

**Why:** The original code's download failure path left `readyNow = true` (if all other items were images), causing Finalize to receive an empty `MediaID` slot and silently post without that media. This is the root of the bug described in the feature request.

---

### F7: Fix `MediaUploadWorker.markFailed` — call `reconcileParentStatus`

**File:** `base-server/internal/workers/media_uploader.go`

**Lines affected:** 166–173 (`markFailed` method)

**Fix:** After updating the platform post status, call `reconcileParentStatus` so the parent post does not get stuck in `publishing` status.

```go
func (w *MediaUploadWorker) markFailed(ctx context.Context, pp store.PlatformPost, cause error) {
    w.logger.Error(ctx, "upload phase failed", cause)
    errMsg := cause.Error()
    now := time.Now()
    attempt := pp.AttemptCount + 1
    retry := now.Add(time.Minute)
    _ = w.store.UpdatePlatformPostStatus(ctx, pp.ID, store.PlatformPostStatusFailed, nil, nil, &errMsg, &attempt, &retry, &now)
    reconcileParentStatus(ctx, w.store, pp.AccountID, pp.PostID, w.logger)
}
```

Note: `pp.AccountID` must be available on the `store.PlatformPost` struct. Verify with the store type — if `AccountID` is not on `PlatformPost`, pass it through from the caller's `event.AccountID` (already in scope in `handle`).

**Why:** Without this call, a platform post that fails in the upload phase leaves the parent post stuck in `publishing` status. The `RecoverStuckPublishing` timer in `RetryWorker` fires after 5 minutes and resets it, but this is late and confusing. The fix makes upload-phase failures immediately visible.

---

### F8: Fix `FinalizerWorker.markFailed` — use exponential backoff and respect max attempts

**File:** `base-server/internal/workers/finalizer.go`

**Lines affected:** 130–138 (`markFailed` method)

**Fix:** Replace the hardcoded `time.Minute` retry with `computeNextRetryAt` and respect `maxAttempts`:

```go
func (w *FinalizerWorker) markFailed(ctx context.Context, pp store.PlatformPost, accountID uuid.UUID, cause error) {
    w.logger.Error(ctx, "finalize phase failed", cause)
    errMsg := cause.Error()
    now := time.Now()
    attempt := pp.AttemptCount + 1
    var nextRetry *time.Time
    if attempt < pp.MaxAttempts {
        t := computeNextRetryAt(attempt)
        nextRetry = &t
    }
    _ = w.store.UpdatePlatformPostStatus(ctx, pp.ID, store.PlatformPostStatusFailed, nil, nil, &errMsg, &attempt, nextRetry, &now)
    reconcileParentStatus(ctx, w.store, accountID, pp.PostID, w.logger)
}
```

**Why:** The current code always schedules a 1-minute retry regardless of attempt count, and never respects `maxAttempts` — a post that has hit its limit will keep being retried by `RetryWorker`. The fix aligns Finalizer with the same backoff contract as `PublishWorker` and `RetryWorker`.

---

### F9: Fix `pinterest.go Publish` — guard against empty boards slice

**File:** `base-server/internal/platform/adapters/pinterest.go`

**Lines affected:** 32–52

**Fix:** Check that `boards` is non-empty before indexing:

```go
boards, err := a.client.ListBoards(ctx, conn.AccessToken)
if err != nil {
    return PlatformPostResult{}, fmt.Errorf("pinterest adapter: failed to get board: %w", err)
}
if len(boards) == 0 {
    return PlatformPostResult{}, fmt.Errorf("pinterest adapter: account has no boards")
}
```

**Why:** `boards[0].ID` on an empty slice panics the worker goroutine, crashing the entire publishing pipeline for all platforms, not just Pinterest.

---

### F10: Fix `analytics.go` — swallow errors that should not cause indefinite Kafka redelivery

**File:** `base-server/internal/workers/analytics.go`

**Lines affected:** 52–130 (`handle` method)

**Fix:** Distinguish fatal structural errors (bad JSON → return error, let Kafka commit fail and redeliver) from transient runtime errors (token refresh failed, no connection, API call failed, DB write failed → log and return nil). Analytics collection failure is never worth infinite redelivery.

```go
func (w *AnalyticsWorker) handle(ctx context.Context, key, value []byte) error {
    var event AnalyticsCollectEvent
    if err := json.Unmarshal(value, &event); err != nil {
        // Structural: bad message. Return error once so the consumer nacks
        // and Kafka moves to the DLQ (or logs). Redelivery won't help.
        return fmt.Errorf("failed to unmarshal analytics event: %w", err)
    }
    // ... rest of handler: all errors become logger.Error + return nil
    pp, err := w.store.GetPlatformPostByID(ctx, event.PlatformPostID)
    if err != nil {
        w.logger.Error(ctx, "failed to get platform post for analytics", err)
        return nil
    }
    // ... etc.
}
```

**Why:** Publishing failures are worth retrying with backoff because a transient API error may recover. Analytics errors are best-effort — if a token is expired we should log it and move on, not wedge the consumer group. The correct retry strategy for analytics is a separate scheduled collection pass, not Kafka redelivery.

---

## Test Tasks

The following test files must be created. All follow the pattern in `base-server/docs/TESTING.md` — table-driven, `t.Parallel()`, hand-rolled mocks (not gomock, matching existing worker test style).

The mock infrastructure already built in `base-server/internal/workers/mocks_test.go` can be extended. New mocks for async workers are needed.

---

### T1: Tests for `DispatchWorker`

**File:** `base-server/internal/workers/dispatch_test.go`

**Pattern:** `publish_test.go` — uses `mockPublishStore` extended with `SetPlatformPostQueued` + `mockEventPublisher`

New mock needed: `mockAsyncPublishStore` (implements `AsyncPublishStore`), `mockEventPublisher` (implements `EventPublisher`).

**Test cases (table-driven under `TestDispatchWorker_Handle`):**

| Test name | Setup | Assert |
|---|---|---|
| `happy path fans out to all pending platform posts` | 2 pending platform posts | `SetPlatformPostQueued` called twice; publisher called twice with `TopicPlatformPublishRequested` |
| `already queued or published posts are skipped` | 1 pending, 1 queued, 1 published | only the pending one gets queued + event emitted |
| `post not found returns error` | store returns error on `GetPostByID` | handler returns error |
| `platform posts load error returns error` | store returns error on `GetPlatformPostsByPostID` | handler returns error |
| `SetPlatformPostQueued failure logs and continues to next platform post` | store fails `SetPlatformPostQueued` for first pp, succeeds for second | second pp still gets an event; no error returned |
| `publisher failure logs and continues to next platform post` | publisher returns error for first pp | second pp event still attempted |
| `invalid event JSON returns error` | bad JSON bytes | error returned containing "unmarshal" |

---

### T2: Tests for `MediaUploadWorker`

**File:** `base-server/internal/workers/media_uploader_test.go`

**Pattern:** Same mock infrastructure. Needs `mockAsyncPlatformAdapter` implementing `AsyncPlatformAdapter`.

**Test cases (table-driven under `TestMediaUploadWorker_Handle`):**

| Test name | Setup | Assert |
|---|---|---|
| `async adapter readyNow=true emits platform.publish.ready and marks media_ready` | adapter returns readyNow=true | `SetPlatformPostMediaReady` called; publisher called with `TopicPlatformPublishReady` |
| `async adapter readyNow=false parks row in awaiting_media` | adapter returns readyNow=false | `SetPlatformPostAwaitingMedia` called; publisher NOT called |
| `StartPublish failure marks platform post failed` | adapter returns error from `StartPublish` | `UpdatePlatformPostStatus` called with failed status + error message + nextRetryAt set |
| `StartPublish failure calls reconcileParentStatus (parent post updated)` | same as above + 1 platform post in results | parent post status updated |
| `non-async adapter falls back to synchronous publish` | adapter does not implement `AsyncPlatformAdapter`; Publish succeeds | `UpdatePlatformPostStatus` called with published status |
| `synchronous publish failure marks failed with retry` | non-async adapter Publish returns error | failed status + nextRetryAt set |
| `platform post not in queued state is skipped` | platform post status is "publishing" | adapter not called; no status updates |
| `connection not found marks failed` | `ListPlatformConnectionsByAccount` returns empty | failed + error message contains "no connection" |
| `token refresh failure marks failed` | refresher returns error | failed + error message contains "refresh" |
| `media URL presigning failure marks failed` | signer returns error for s3:// URL | failed + error message contains "presign" |
| `invalid event JSON returns error` | bad bytes | error returned |

---

### T3: Tests for `ReadyReconciler`

**File:** `base-server/internal/workers/ready_reconciler_test.go`

**Pattern:** same mocks. Needs mock `AsyncPublishStore` with `ListPlatformPostsAwaitingMedia`, `SetPlatformPostAwaitingMedia`, `SetPlatformPostMediaReady`, `UpdatePlatformPostStatus`.

**Test cases (table-driven under `TestReadyReconciler_Advance`):**

| Test name | Setup | Assert |
|---|---|---|
| `CheckReady returns ready=true marks media_ready and emits publish.ready` | adapter returns ready=true | `SetPlatformPostMediaReady` called; event published on `TopicPlatformPublishReady` |
| `CheckReady returns ready=false updates handle in db and waits` | adapter returns ready=false with updated handle | `SetPlatformPostAwaitingMedia` called with updated handle; no event published |
| `CheckReady returns error marks platform post failed with retry` | adapter returns error | `UpdatePlatformPostStatus` called with failed + error message + nextRetryAt |
| `row past stuckAfter is failed` | `row.UpdatedAt` set 4 minutes ago (stuckAfter=3min) | `UpdatePlatformPostStatus` called with failed; error message contains "stuck-after" |
| `missing media_handle fails the row` | `row.MediaHandle == nil` | `UpdatePlatformPostStatus` called with failed; error contains "missing media_handle" |
| `adapter not found fails the row` | registry has no adapter for platform | failed + error message contains "no adapter" |
| `non-async adapter fails the row` | adapter does not implement `AsyncPlatformAdapter` | failed + error contains "not async-capable" |
| `connection not found fails the row` | `ListPlatformConnectionsByAccount` returns empty | failed + error contains connection |
| `tick with no awaiting_media rows is no-op` | store returns empty slice | no calls to any status update |
| `tick store error returns wrapped error` | `ListPlatformPostsAwaitingMedia` returns error | `tick` returns wrapped error |

---

### T4: Tests for `FinalizerWorker`

**File:** `base-server/internal/workers/finalizer_test.go`

**Pattern:** Same mocks.

**Test cases (table-driven under `TestFinalizerWorker_Handle`):**

| Test name | Setup | Assert |
|---|---|---|
| `happy path: Finalize succeeds, platform post marked published` | adapter Finalize returns result | `UpdatePlatformPostStatus` called with published + platformPostID + publishedAt |
| `platform post not in media_ready state is skipped` | platform post status is "published" | adapter Finalize NOT called |
| `Finalize failure marks platform post failed with exponential backoff` | adapter Finalize returns error; `pp.AttemptCount=1`, `pp.MaxAttempts=3` | failed + nextRetryAt set to ~5 minutes (attempt 2) |
| `Finalize failure at max attempts does NOT schedule next retry` | `pp.AttemptCount=2`, `pp.MaxAttempts=3` | failed + `nextRetryAt == nil` |
| `connection not found marks failed` | connection lookup returns empty | failed + error message |
| `token refresh failure marks failed` | refresher returns error | failed |
| `adapter not found marks failed` | registry returns error | failed |
| `non-async adapter marks failed` | adapter does not implement async | failed + error contains "not async-capable" |
| `markFailed calls reconcileParentStatus` | after Finalize failure, all platform posts for parent are failed | parent post status updated to failed |
| `invalid event JSON returns error` | bad bytes | error returned |

---

### T5: Tests for `AnalyticsWorker`

**File:** `base-server/internal/workers/analytics_test.go`

**Pattern:** Same mocks. New mock for `AnalyticsStore` (3 methods).

**Test cases (table-driven under `TestAnalyticsWorker_Handle`):**

| Test name | Setup | Assert |
|---|---|---|
| `happy path: engagement fetched and recorded` | adapter returns engagement; store records it | `RecordPostAnalytics` called with correct fields; no error returned |
| `platform post has no external ID, skipped` | `pp.PlatformPostID == nil` | adapter NOT called; no error |
| `get platform post error is logged and swallowed` | store returns error on `GetPlatformPostByID` | no error returned to Kafka (return nil) |
| `connection not found is logged and swallowed` | no matching connection in list | return nil |
| `token refresh error is logged and swallowed` | refresher returns error | return nil |
| `GetEngagement error is logged and swallowed` | adapter returns error | return nil |
| `RecordPostAnalytics error is logged and swallowed` | store returns error | return nil |
| `invalid JSON returns error (structural failure)` | bad bytes | error returned |

---

### T6: Tests for `x.go Publish` and `x.go PublishThread` (adapter unit tests)

**File:** `base-server/internal/platform/adapters/x_test.go`

**Pattern:** Adapter unit tests using a `mockXClient` (hand-rolled) that stubs the X API client methods. Use an httptest server per test case to avoid network calls.

**Test cases (table-driven under `TestXAdapter_Publish`):**

| Test name | Setup | Assert |
|---|---|---|
| `happy path text-only post succeeds` | client CreateTweet returns ID | result has PlatformPostID and URL |
| `happy path with image: download + upload + tweet` | download returns bytes, UploadMedia returns mediaID, CreateTweet returns ID | tweet contains mediaID |
| `download failure returns error` | download returns 404 | error returned; CreateTweet NOT called |
| `UploadMedia failure returns error` | UploadMedia returns error | error returned; CreateTweet NOT called |
| `CreateTweet failure returns wrapped error` | CreateTweet returns error | error returned; wraps "x adapter" |

**Test cases (table-driven under `TestXAdapter_PublishThread`):**

| Test name | Setup | Assert |
|---|---|---|
| `happy path single segment no media` | 1 segment, CreateTweet succeeds | first result returned |
| `happy path multi-segment thread chain` | 2 segments, CreateTweet called twice with reply_to_id on second | firstResult from segment 0 returned |
| `empty segments returns error` | segments=nil | error returned |
| `media download failure returns error` | download returns error | error returned; no tweets posted |
| `media upload failure returns error` | UploadMedia returns error | error returned |
| `CreateTweet failure on segment 2 returns partial result with error` | tweet 1 succeeds, tweet 2 fails | error returned (firstResult has segment 0 URL) |

---

### T7: Tests for `bluesky.go Publish` and `PublishThread`

**File:** `base-server/internal/platform/adapters/bluesky_test.go`

**Test cases (table-driven under `TestBlueskyAdapter_Publish`):**

| Test name | Setup | Assert |
|---|---|---|
| `happy path text only` | CreateSession+CreateRecord succeed | result with PlatformPostID and URL |
| `happy path with image: download + upload blob + record` | UploadBlob returns blob; record succeeds | embed present |
| `auth failure returns error` | CreateSession returns error | error; no record created |
| `download failure returns error` | download returns error | error; no record |
| `UploadBlob failure returns error` | UploadBlob returns error | error; no record |
| `CreateRecord failure returns error` | CreateRecord returns error | error |

**Test cases (table-driven under `TestBlueskyAdapter_PublishThread`):**

| Test name | Setup | Assert |
|---|---|---|
| `empty segments returns error` | segments=nil | error returned |
| `segment media download failure returns error` | segment 0 media download fails | error; no records created |
| `segment blob upload failure returns error` | segment 0 blob upload fails | error |
| `segment 2 record failure returns first result with error` | segment 0 OK, segment 1 CreateRecord fails | error returned; firstResult has segment 0 data |

---

### T8: Tests for `x_async.go StartPublish`, `CheckReady`, `Finalize`

**File:** `base-server/internal/platform/adapters/x_async_test.go`

**Test cases (table-driven under `TestXAdapter_StartPublish`):**

| Test name | Setup | Assert |
|---|---|---|
| `no media returns empty handle readyNow=true` | MediaURLs=nil | Items=[], readyNow=true |
| `image upload succeeds, readyNow=true (no processing info)` | UploadMediaAsync returns no ProcessingInfo | item.State="succeeded", readyNow=true |
| `video upload with pending processing, readyNow=false` | UploadMediaAsync returns ProcessingInfo{State:"pending"} | item.State="pending", readyNow=false |
| `download failure returns error` | download returns error | error returned; Items not populated |
| `upload failure returns error` | UploadMediaAsync returns error | error returned |

**Test cases (table-driven under `TestXAdapter_CheckReady`):**

| Test name | Setup | Assert |
|---|---|---|
| `all items succeeded, returns ready=true` | all items State="succeeded" | ready=true |
| `one item pending, polls and updates state` | one item State="pending", GetMediaStatus returns pending | ready=false; handle updated |
| `one item pending, polls and transitions to succeeded` | GetMediaStatus returns State="succeeded" | ready=true |
| `empty MediaID returns error immediately` | one item MediaID="" | error returned; contains "failed to upload" |
| `item processing failed returns error` | GetMediaStatus returns State="failed" | error returned; contains "processing failed" |
| `invalid handle JSON returns error` | raw=nil / bad JSON | error returned |

**Test cases (table-driven under `TestXAdapter_Finalize`):**

| Test name | Setup | Assert |
|---|---|---|
| `single post with media IDs` | handle with 2 succeeded items | CreateTweet called with both mediaIDs |
| `thread post: segments with image_index` | spec.Segments with imageIndex, handle has item | CreateTweet called per segment with correct mediaID |
| `empty MediaID items are skipped in single post` | one item has empty MediaID | that ID not included in CreateTweet |
| `CreateTweet failure returns error` | CreateTweet returns error | error returned |

---

### T9: Tests for `bluesky_async.go StartPublish`, `CheckReady`, `Finalize`

**File:** `base-server/internal/platform/adapters/bluesky_async_test.go`

**Test cases (table-driven under `TestBlueskyAdapter_StartPublish`):**

| Test name | Setup | Assert |
|---|---|---|
| `auth failure returns error` | CreateSession fails | error; readyNow irrelevant |
| `no media, readyNow=true, empty items` | MediaURLs=nil | Items=[], readyNow=true |
| `download failure returns error` | download fails | error returned |
| `upload failure returns error` | UploadBlob fails | error returned |
| `image upload succeeds, item in handle with non-nil blob` | UploadBlob returns blob | Items[0].Blob!=nil, IsVideo=false |
| `video upload sets IsVideo=true` | content-type is "video/mp4" | Items[0].IsVideo=true |

**Test cases (table-driven under `TestBlueskyAdapter_Finalize`):**

| Test name | Setup | Assert |
|---|---|---|
| `single post with image embed` | handle with image item | record has embed images |
| `single post with video embed (video wins over images)` | handle with video item | record has embed video |
| `single post with nil blob items skips embed` | handle with nil blob | record has no embed |
| `thread: each segment gets correct blob via image_index` | 2 segments, 2 items, each segment image_index points to one | CreateRecord called twice; each with correct embed |
| `auth failure returns error` | CreateSession returns error | error |
| `CreateRecord failure returns error` | CreateRecord returns error | error |

---

### T10: Tests for `threads_async.go` and `threads.go`

**File:** `base-server/internal/platform/adapters/threads_test.go` and `base-server/internal/platform/adapters/threads_async_test.go`

**Test cases for `threads.go Publish` (table-driven under `TestThreadsAdapter_Publish`):**

| Test name | Setup | Assert |
|---|---|---|
| `text-only post succeeds` | CreateThread+PublishThread succeed | result with PlatformPostID |
| `image post sets MediaType=IMAGE and ImageURL` | mediaURL is .jpg | CreateThread called with IMAGE type |
| `video post sets MediaType=VIDEO, skips WaitForContainerReady on success` | mediaURL is .mp4; WaitForContainerReady succeeds | CreateThread called with VIDEO type |
| `WaitForContainerReady failure returns error` | WaitForContainerReady returns error | error returned |
| `CreateThread failure returns error` | CreateThread returns error | error |
| `PublishThread (publish step) failure returns error` | PublishThread client returns error | error |

**Test cases for `threads_async.go StartPublish` (table-driven under `TestThreadsAdapter_StartPublish`):**

| Test name | Setup | Assert |
|---|---|---|
| `text-only single post, readyNow=true (no video)` | no media | handle.ContainerID set, readyNow=true |
| `image single post, readyNow=true` | image media URL | readyNow=true |
| `video single post, readyNow=false` | .mp4 media URL | readyNow=false |
| `CreateThread failure returns error` | CreateThread returns error | error |
| `thread spec: takes text from segments[0]` | spec.Segments has 2 segments | CreateThread called with segments[0].Content |

**Test cases for `threads_async.go CheckReady`:**

| Test name | Setup | Assert |
|---|---|---|
| `FINISHED status returns ready=true` | GetContainerStatus returns "FINISHED" | ready=true |
| `IN_PROGRESS status returns ready=false` | GetContainerStatus returns "IN_PROGRESS" | ready=false |
| `ERROR status returns error with status` | GetContainerStatus returns "ERROR","the error msg" | error contains "ERROR" and message |
| `EXPIRED status returns error` | GetContainerStatus returns "EXPIRED","" | error contains "EXPIRED" |
| `GetContainerStatus error returns error` | GetContainerStatus returns err | error returned |

**Test cases for `threads_async.go Finalize`:**

| Test name | Setup | Assert |
|---|---|---|
| `single post: publishes container, gets permalink` | PublishThread returns ID, GetPermalink returns URL | PlatformPostID=ID, URL=permalink |
| `multi-segment: publishes container 0 then walks remaining segments inline` | 2 segments; segment 1 container created+published | both segments published; firstResult has segment 0 |
| `video segment in chain uses WaitForContainerReady` | segment 1 has .mp4; WaitForContainerReady succeeds | wait called for segment 1 |
| `PublishThread (publish step) failure returns error` | PublishThread returns error | error |
| `invalid handle JSON returns error` | bad handle raw | error |

---

### T11: Tests for `linkedin.go` and `pinterest.go` adapters

**File:** `base-server/internal/platform/adapters/linkedin_test.go`

**Test cases (table-driven under `TestLinkedInAdapter_Publish`):**

| Test name | Setup | Assert |
|---|---|---|
| `text-only post succeeds` | CreatePost returns PostURN | result with PlatformPostID and URL |
| `image post: download + init + upload succeeds` | all three steps succeed; CreatePost returns URN | mediaAssets in CreatePost call |
| `download failure returns error` | download returns error | error; CreatePost NOT called |
| `InitializeImageUpload failure returns error` | InitializeImageUpload returns error | error |
| `UploadImage failure returns error` | UploadImage returns error | error |
| `CreatePost failure returns error` | CreatePost returns error | error |

**File:** `base-server/internal/platform/adapters/pinterest_test.go`

**Test cases (table-driven under `TestPinterestAdapter_Publish`):**

| Test name | Setup | Assert |
|---|---|---|
| `happy path creates pin on first board` | ListBoards returns 1 board; CreatePin succeeds | result with PlatformPostID |
| `no boards returns error` | ListBoards returns empty slice | error; CreatePin NOT called |
| `ListBoards error returns error` | ListBoards returns error | error |
| `CreatePin failure returns error` | CreatePin returns error | error |
| `content truncated to 100 chars for title` | content is 200 chars | CreatePin called with title of len 100 |

---

## Execution Notes for the Supervisor

### Order of operations

1. Apply all Fix tasks (F1–F10) first — they are independent of each other and do not break existing tests.
2. Verify `go build ./...` passes after fixes.
3. Verify existing `go test ./...` still passes (the fix changes only error-return behaviour that was previously success paths — no existing test exercises these paths).
4. Write all Test tasks (T1–T11). Each test file is independent.
5. Run `go test ./internal/workers/... ./internal/platform/adapters/...` to verify all new tests pass.

### Mock infrastructure needed

The existing `mocks_test.go` in `workers` package needs the following additions for async worker tests (T2, T3, T4):

```go
// mockAsyncPublishStore extends mockPublishStore with async-specific methods.
// Add to workers/mocks_test.go:

type mockAsyncPublishStore struct {
    mockPublishStore
    getPlatformPostByID             func(ctx context.Context, id uuid.UUID) (store.PlatformPost, error)
    setPlatformPostQueued           func(ctx context.Context, id uuid.UUID) error
    setPlatformPostAwaitingMedia    func(ctx context.Context, id uuid.UUID, handle json.RawMessage) error
    setPlatformPostMediaReady       func(ctx context.Context, id uuid.UUID, handle json.RawMessage) error
    listPlatformPostsAwaitingMedia  func(ctx context.Context, limit int) ([]store.RetryablePlatformPost, error)
    // track calls
    setPlatformPostQueuedCalls          []uuid.UUID
    setPlatformPostAwaitingMediaCalls   []uuid.UUID
    setPlatformPostMediaReadyCalls      []uuid.UUID
}
// ... implement AsyncPublishStore interface

// mockEventPublisher for dispatcher + reconciler tests
type mockEventPublisher struct {
    publishFn    func(ctx context.Context, topic, key string, payload any) error
    publishCalls []eventPublisherCall
}
type eventPublisherCall struct {
    Topic   string
    Key     string
    Payload any
}
func (m *mockEventPublisher) Publish(ctx context.Context, topic, key string, payload any) error {
    m.publishCalls = append(m.publishCalls, eventPublisherCall{topic, key, payload})
    if m.publishFn != nil {
        return m.publishFn(ctx, topic, key, payload)
    }
    return nil
}

// mockAsyncPlatformAdapter for MediaUploadWorker + ReadyReconciler + Finalizer tests
type mockAsyncPlatformAdapter struct {
    mockAdapter
    startPublishFn func(ctx context.Context, spec adapters.PostSpec, conn store.PlatformConnection) (json.RawMessage, bool, error)
    checkReadyFn   func(ctx context.Context, handle json.RawMessage, conn store.PlatformConnection) (bool, json.RawMessage, error)
    finalizeFn     func(ctx context.Context, spec adapters.PostSpec, handle json.RawMessage, conn store.PlatformConnection) (adapters.PlatformPostResult, error)
    startCalls     int
    checkCalls     int
    finalizeCalls  int
}
// ... implement AsyncPlatformAdapter
```

For adapter tests (T6–T11), the mock client for each platform should be a hand-rolled interface stub injected via the constructor. Each adapter's client should be an interface (if it is not already) so tests can inject a stub. Check whether the X client, Bluesky client, etc. are concrete types or interfaces — if concrete, the supervisor should extract minimal interfaces for the methods each adapter uses, placed in the same `adapters` package. These interfaces should only cover the methods called by the adapter.

### Files to create or modify

**Modify:**
- `base-server/internal/platform/adapters/x.go` (F1)
- `base-server/internal/platform/adapters/bluesky.go` (F2, F3)
- `base-server/internal/platform/adapters/linkedin.go` (F4)
- `base-server/internal/platform/adapters/bluesky_async.go` (F5)
- `base-server/internal/platform/adapters/x_async.go` (F6)
- `base-server/internal/workers/media_uploader.go` (F7)
- `base-server/internal/workers/finalizer.go` (F8)
- `base-server/internal/platform/adapters/pinterest.go` (F9)
- `base-server/internal/workers/analytics.go` (F10)
- `base-server/internal/workers/mocks_test.go` (extend with async mocks for T1–T5)

**Create:**
- `base-server/internal/workers/dispatch_test.go` (T1)
- `base-server/internal/workers/media_uploader_test.go` (T2)
- `base-server/internal/workers/ready_reconciler_test.go` (T3)
- `base-server/internal/workers/finalizer_test.go` (T4)
- `base-server/internal/workers/analytics_test.go` (T5)
- `base-server/internal/platform/adapters/x_test.go` (T6)
- `base-server/internal/platform/adapters/x_async_test.go` (T8)
- `base-server/internal/platform/adapters/bluesky_test.go` (T7)
- `base-server/internal/platform/adapters/bluesky_async_test.go` (T9)
- `base-server/internal/platform/adapters/threads_test.go` (T10)
- `base-server/internal/platform/adapters/threads_async_test.go` (T10)
- `base-server/internal/platform/adapters/linkedin_test.go` (T11)
- `base-server/internal/platform/adapters/pinterest_test.go` (T11)
