# Retry Button on Post Details Page — Implementation Plan

**Goal:** Fix the retry button on the post details page so it appears whenever any platform post is in a `failed` state, not only when all retry attempts are exhausted.
**Scope:** frontend-only

---

## Architecture Summary

### What exists and works (do not change)
- Backend: `POST /api/protected/posts/:id/retry` is registered, handler is implemented, processor (`RetryFailedPlatformPosts`) is implemented, store method (`ResetPlatformPostsForRetry`) is implemented. The whole backend retry path is fully functional.
- Frontend: `WizardInner.tsx` has `handleRetry`, `hasFailed`, `retrying` state, passes `onRetry` to `PostPublishStatus`. `PostPublishStatus.tsx` renders the "Retry failed" button and accepts `onRetry` / `retrying` props.

### Root cause of the missing button
`PostPublishStatus` has its own internal guard:
```ts
const hasFailed = platformPosts.some(
  (pp) => pp.status === "failed" && pp.attemptCount >= pp.maxAttempts,
);
```
This hides the retry button until a platform post has exhausted ALL automatic retry attempts (`attemptCount >= maxAttempts`, default 3). When a post fails for the first time (`attemptCount = 1`), this condition is false and the button never appears — even though the backend endpoint would happily accept the retry request.

The fix is to remove the `attemptCount >= maxAttempts` guard from `PostPublishStatus.hasFailed`. The button should appear whenever any platform_post has `status === "failed"`.

The `WizardInner.handleRetry` also uses raw `fetch` instead of the shared `fetcher` utility, which bypasses auth/error handling. This should be corrected to use `fetcher` from `@/api/client` and a dedicated `useRetryPost` hook, consistent with how `usePublishPost` is written.

### No database changes
The store method `ResetPlatformPostsForRetry` already handles both exhausted and non-exhausted failed posts correctly (`attempt_count >= max_attempts OR next_retry_at IS NULL`). No migration needed.

### No API changes
The endpoint `POST /api/protected/posts/:id/retry` already exists and works.

### Frontend changes
1. New hook `useRetryPost` — wraps the retry API call using `fetcher`, consistent with `usePublishPost`.
2. Fix `PostPublishStatus.hasFailed` — remove the `attemptCount >= maxAttempts` guard; show the retry button whenever any platform_post is `failed`.
3. Update `WizardInner` — use `useRetryPost` instead of the inline raw `fetch` call.

---

## Frontend Tasks

### F1: New hook — useRetryPost
**File:** `webapp/src/hooks/useRetryPost.ts`
**Pattern:** `webapp/src/hooks/usePublishPost.ts` — identical structure (useState loading/error, useCallback, fetcher, getErrorMessage)
**What it does:** POSTs to `${import.meta.env.VITE_API_URL}/api/protected/posts/${id}/retry` with `credentials: "include"` via `fetcher`. Returns `{ retryPost, loading, error }`.

```ts
// Shape (mirroring usePublishPost exactly):
export const useRetryPost = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const retryPost = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await fetcher<void>(
        `${import.meta.env.VITE_API_URL}/api/protected/posts/${id}/retry`,
        { method: "POST" },
      );
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { retryPost, loading, error };
};
```

**Imports needed:** `useCallback`, `useState` from `react`; `fetcher` from `@/api/client`; `getErrorMessage` from `@/utils/errorHandler`.

---

### F2: Fix PostPublishStatus — relax the hasFailed guard
**File:** `webapp/src/components/create-post/PostPublishStatus.tsx`
**Change:** Replace the `hasFailed` computation on line 66–68.

Current (broken):
```ts
const hasFailed = platformPosts.some(
  (pp) => pp.status === "failed" && pp.attemptCount >= pp.maxAttempts,
);
```

Replace with:
```ts
const hasFailed = platformPosts.some((pp) => pp.status === "failed");
```

This is the only change to this file. The `attemptCount` and `maxAttempts` fields on `PlatformPost` are still displayed per-row (they are not used in the condition above currently anyway — confirm no other references to `attemptCount` in the file before removing).

---

### F3: Update WizardInner — use useRetryPost hook
**File:** `webapp/src/components/create-post/WizardInner.tsx`
**Depends on:** F1

**Changes:**

1. Add import of `useRetryPost` at the top of the file alongside the other hook imports.

2. Replace the inline `retrying` useState and raw `fetch` `handleRetry` callback:

Current (lines 299–325, raw fetch):
```ts
const [retrying, setRetrying] = useState(false);
const hasFailed =
  postStatus === "failed" || postStatus === "partially_published";

const handleRetry = useCallback(async () => {
  if (!editPostId) return;
  setRetrying(true);
  try {
    const url = `${import.meta.env.VITE_API_URL}/api/protected/posts/${editPostId}/retry`;
    await fetch(url, { method: "POST", credentials: "include" });
    addBanner({ type: "success", title: "Retrying failed platforms", dismissible: true });
    navigate({ to: "/posts" });
  } catch {
    addBanner({ type: "error", title: "Couldn't retry post", description: "Please try again.", dismissible: true });
  } finally {
    setRetrying(false);
  }
}, [editPostId, navigate, addBanner]);
```

Replace with:
```ts
const { retryPost, loading: retrying } = useRetryPost();
const hasFailed =
  postStatus === "failed" || postStatus === "partially_published";

const handleRetry = useCallback(async () => {
  if (!editPostId) return;
  try {
    await retryPost(editPostId);
    addBanner({ type: "success", title: "Retrying failed platforms", dismissible: true });
    navigate({ to: "/posts" });
  } catch {
    addBanner({ type: "error", title: "Couldn't retry post", description: "Please try again.", dismissible: true });
  }
}, [editPostId, retryPost, navigate, addBanner]);
```

3. The `PostPublishStatus` usage at line 399–404 remains unchanged — `onRetry={hasFailed ? handleRetry : undefined}` and `retrying={retrying}` are both still correct.

4. Remove the now-unused `useState` import if `retrying` was the only local state using it from this block (check other usages in the file first — `state.submitting`, `state.error`, etc. all come from `wizard`, so `useState` itself may still be used for nothing else if no other local state exists; confirm before removing).

---

## Verification Checklist

After implementation, verify manually:

1. Open a post with `status = "failed"` and at least one `platform_post` with `status = "failed"`.
2. The "Publish Status" section renders on the left pane.
3. The "Retry failed" button with a refresh icon appears in the header of that section.
4. Clicking "Retry failed" shows the button in a loading state.
5. On success: a success banner appears and the user is redirected to `/posts`.
6. On error: an error banner appears.
7. A post with `status = "partially_published"` also shows the retry button.
8. A post with `status = "published"` (all succeeded) does NOT show the retry button.
9. A post with `status = "draft"` does NOT show the `PostPublishStatus` section at all.

---

## Notes for Executor

- The worktree is already at `/Users/shubh/Workspaces/growth-tools/.worktrees/feature/retry-button`.
- No backend changes are needed — the retry endpoint is fully implemented and registered.
- No new types are needed — `PlatformPost` type already has `attemptCount`, `maxAttempts`, `status`.
- The `fetcher` utility in `@/api/client` handles credentials automatically; no need to pass `credentials: "include"` explicitly in the hook body.
- Run `cd webapp && npm run build && npm run lint && npm run lint:scss` to verify before committing.
