# Blog Wizard SSE Parity Implementation Plan

**Goal:** Replace the blocking `POST /api/protected/blog/generate` + spinner with a streaming SSE endpoint and hook that delivers live markdown chunks, phase-aware loader UI, and a streaming markdown preview — exactly mirroring PostWizard's generation/regeneration UX.

**Scope:** full-stack

---

## Architecture Summary

### What is currently missing
Blog generation calls `p.ai.CreateMessage` (blocking), returns a full `store.BlogPost` on HTTP 201, and the frontend blocks on that response behind a spinner. PostWizard uses `StreamMessage` over a `text/event-stream` response with phase/chunk/done events and a live-streaming accordion preview.

### Database changes
None. No new tables or columns required. The persisted `store.BlogPost` shape is identical; only the HTTP transport changes.

### API changes
- New `POST /api/protected/blog/generate/stream` — SSE endpoint; emits `phase`, `chunk`, `done`, `error` events; persists the blog post atomically on `done` using the existing `GenerateBlogPost` logic.
- Existing `POST /api/protected/blog/generate` — **keep it**; the worker path (`githubProcessor.BlogDraftGenerator`) calls no HTTP endpoint so it is unaffected. Removing it would break any CLI caller with the old path — leave it in place; it remains the non-streaming fallback.

### Frontend changes
- New `webapp/src/hooks/useSSEBlogGenerate.ts` — mirrors `useSSEContentGenerate`, consumes the new SSE endpoint, exposes `phase`, `streamingContent`, `blogPost`, `loading`, `error`, `generate`, `reset`.
- `webapp/src/components/blog/BlogWizard.tsx` — swap `useGenerateBlog` for `useSSEBlogGenerate`; render streaming markdown as chunks arrive; show phase-aware loader (spinner + copy for `generating` phase, skeleton for pre-first-chunk); populate fields from `done` payload; regenerate uses same hook.
- `webapp/src/components/blog/blog-wizard.module.scss` — add `streamingCursor` and `streamingMarkdown` classes (mirrors CreatePostWizard.module.scss).

---

## Backend Tasks

### B1: Add `StreamGenerateBlogPost` method to `BlogProcessor`

**File:** `base-server/internal/blog/processor/processor.go`

Add the following method to `BlogProcessor`. It reuses every helper already in the processor (`fetchImagesForPrompt`, `buildGenerateBlogUserMessage`, `blogResolveUniqueSlug`, `blogSlugify`, the JSON parsing / validation block from `GenerateBlogPost`) but streams the AI response chunk-by-chunk and only calls `store.CreateBlogPost` at the very end once the full response is assembled.

**Callback type to add at the top of `processor.go`** (alongside the existing vars block):
```go
// BlogStreamCallbacks holds callbacks for streaming blog generation.
type BlogStreamCallbacks struct {
    OnPhase func(phase string)          // phases: "generating", "done"
    OnChunk func(chunk string)          // raw markdown delta from AI
    OnDone  func(post store.BlogPost)   // final persisted post
    OnError func(err error)             // terminal error — no further callbacks fire
}
```

**Method signature:**
```go
func (p *BlogProcessor) StreamGenerateBlogPost(
    ctx context.Context,
    accountID uuid.UUID,
    instruction string,
    keywords []string,
    mediaIDs []uuid.UUID,
    cb BlogStreamCallbacks,
) error
```

**Full method body:**
```go
func (p *BlogProcessor) StreamGenerateBlogPost(
    ctx context.Context,
    accountID uuid.UUID,
    instruction string,
    keywords []string,
    mediaIDs []uuid.UUID,
    cb BlogStreamCallbacks,
) error {
    ctx = observability.WithFields(ctx,
        observability.Field{Key: "account_id", Value: accountID.String()},
        observability.Field{Key: "operation", Value: "stream_generate_blog_post"},
    )

    // Phase 1: fetch images for prompt (same as GenerateBlogPost).
    images := p.fetchImagesForPrompt(ctx, mediaIDs)
    userMsg := buildGenerateBlogUserMessage(instruction, keywords, images)

    cb.OnPhase("generating")

    // Phase 2: stream the AI response, accumulating raw chunks.
    var rawBuilder strings.Builder
    err := p.ai.StreamMessage(ctx, generateBlogSystemPrompt, []aiclient.Message{
        {Role: "user", Content: userMsg},
    }, generateBlogMaxTokens, func(chunk string) {
        rawBuilder.WriteString(chunk)
        cb.OnChunk(chunk)
    })
    if err != nil {
        p.logger.Error(ctx, "AI blog stream failed", err)
        cb.OnError(ErrBlogGenerationFailed)
        return ErrBlogGenerationFailed
    }

    rawOutput := strings.TrimSpace(rawBuilder.String())

    // Phase 3: parse and validate JSON (identical to GenerateBlogPost).
    var resp blogGenJSONResponse
    if parseErr := json.Unmarshal([]byte(rawOutput), &resp); parseErr != nil {
        p.logger.Error(ctx, "failed to parse blog generation JSON", fmt.Errorf("parse: %w, raw length=%d", parseErr, len(rawOutput)))
        cb.OnError(ErrBlogGenerationFailed)
        return ErrBlogGenerationFailed
    }
    if resp.Title == "" || resp.Content == "" {
        p.logger.Error(ctx, "blog generation JSON missing title or content", fmt.Errorf("raw length=%d", len(rawOutput)))
        cb.OnError(ErrBlogGenerationFailed)
        return ErrBlogGenerationFailed
    }

    slug, err := p.blogResolveUniqueSlug(ctx, accountID, blogSlugify(resp.Title))
    if err != nil {
        p.logger.Error(ctx, "failed to resolve unique slug", err)
        cb.OnError(ErrBlogGenerationFailed)
        return ErrBlogGenerationFailed
    }

    kws := store.StringArray(resp.Keywords)
    if kws == nil {
        kws = store.StringArray{}
    }
    mids := store.UUIDArray(mediaIDs)
    if mids == nil {
        mids = store.UUIDArray{}
    }

    params := store.CreateBlogPostParams{
        AccountID:         accountID,
        Title:             resp.Title,
        Slug:              slug,
        Content:           resp.Content,
        Status:            store.BlogStatusDraft,
        Keywords:          kws,
        MediaIDs:          mids,
        SourceInstruction: &instruction,
    }
    if resp.Excerpt != ""         { params.Excerpt = &resp.Excerpt }
    if resp.SEOTitle != ""        { params.SEOTitle = &resp.SEOTitle }
    if resp.MetaDescription != "" { params.MetaDescription = &resp.MetaDescription }
    if resp.OGTitle != ""         { params.OGTitle = &resp.OGTitle }
    if resp.OGDescription != ""   { params.OGDescription = &resp.OGDescription }

    post, err := p.store.CreateBlogPost(ctx, params)
    if err != nil {
        p.logger.Error(ctx, "failed to persist generated blog post", err)
        cb.OnError(ErrBlogGenerationFailed)
        return ErrBlogGenerationFailed
    }

    cb.OnPhase("done")
    cb.OnDone(post)
    return nil
}
```

**Note on the AI field name:** `BlogProcessor` stores the AI client as `p.ai`. Confirm this is the field name — in `processor.go` line 122, `New` assigns `ai: ai`. Yes, it is `p.ai`.

---

### B2: Add `HandleStreamGenerateBlog` to the blog handler

**File:** `base-server/internal/blog/handler/handler.go`

**Step 1 — Extend the `BlogProcessor` interface** (the interface declared in `handler.go`, not the concrete struct). Add `StreamGenerateBlogPost` to the existing interface:

```go
type BlogProcessor interface {
    CreateBlogPost(ctx context.Context, params store.CreateBlogPostParams) (store.BlogPost, error)
    GetBlogPost(ctx context.Context, accountID, postID uuid.UUID) (store.BlogPost, error)
    ListBlogPosts(ctx context.Context, accountID uuid.UUID, status *string, limit, offset int) ([]store.BlogPost, error)
    UpdateBlogPost(ctx context.Context, accountID, postID uuid.UUID, params store.UpdateBlogPostParams) (store.BlogPost, error)
    DeleteBlogPost(ctx context.Context, accountID, postID uuid.UUID) error
    PublishBlogPost(ctx context.Context, accountID, postID uuid.UUID) (store.BlogPost, error)
    GenerateBlogPost(ctx context.Context, accountID uuid.UUID, instruction string, keywords []string, mediaIDs []uuid.UUID) (store.BlogPost, error)
    StreamGenerateBlogPost(ctx context.Context, accountID uuid.UUID, instruction string, keywords []string, mediaIDs []uuid.UUID, cb processor.BlogStreamCallbacks) error
}
```

**Step 2 — Add required imports to `handler.go`:**

Add to the existing import block:
```go
"encoding/json"
"fmt"
"net/http"
"sync"
```
(check which are already present — `net/http` and `errors` are already there; add `encoding/json`, `fmt`, `sync` if missing)

**Step 3 — Add the handler method:**

```go
// HandleStreamGenerateBlog streams blog post generation via SSE.
// Events emitted:
//   - event: phase  data: {"phase":"generating"}
//   - event: chunk  data: {"text":"...markdown delta..."}
//   - event: done   data: {<full ApiBlogPost JSON>}
//   - event: error  data: "human-readable error message"
//
// The blog post is persisted atomically when the full AI response is validated.
// The non-streaming /blog/generate endpoint is kept for backwards compatibility.
func (h *Handler) HandleStreamGenerateBlog(c *gin.Context) {
    ctx := c.Request.Context()

    accountID, ok := h.getAccountID(c)
    if !ok {
        return
    }
    ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

    var req GenerateBlogRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        apierrors.ValidationError(c, err)
        return
    }

    mediaIDs := make([]uuid.UUID, 0, len(req.MediaIDs))
    for _, idStr := range req.MediaIDs {
        id, err := uuid.Parse(idStr)
        if err != nil {
            apierrors.BadRequest(c, "INVALID_INPUT", "Invalid media_id format: "+idStr)
            return
        }
        mediaIDs = append(mediaIDs, id)
    }

    // Set SSE headers.
    c.Header("Content-Type", "text/event-stream")
    c.Header("Cache-Control", "no-cache")
    c.Header("Connection", "keep-alive")
    c.Header("X-Accel-Buffering", "no")

    flusher, canFlush := c.Writer.(http.Flusher)

    var mu sync.Mutex
    writeSSE := func(event, data string) {
        mu.Lock()
        defer mu.Unlock()
        fmt.Fprintf(c.Writer, "event: %s\n", event)
        fmt.Fprintf(c.Writer, "data: %s\n\n", data)
        if canFlush {
            flusher.Flush()
        }
    }

    mustMarshalBlog := func(v any) string {
        b, err := json.Marshal(v)
        if err != nil {
            return "{}"
        }
        return string(b)
    }

    cb := processor.BlogStreamCallbacks{
        OnPhase: func(phase string) {
            writeSSE("phase", mustMarshalBlog(map[string]string{"phase": phase}))
        },
        OnChunk: func(chunk string) {
            writeSSE("chunk", mustMarshalBlog(map[string]string{"text": chunk}))
        },
        OnDone: func(post store.BlogPost) {
            writeSSE("done", mustMarshalBlog(post))
        },
        OnError: func(err error) {
            h.logger.Error(ctx, "blog stream generation error", err)
            writeSSE("error", "blog generation failed")
        },
    }

    if err := h.processor.StreamGenerateBlogPost(ctx, accountID, req.Instruction, parseKeywords(req.Keywords), mediaIDs, cb); err != nil {
        // OnError already wrote the SSE error event; nothing else to do.
        return
    }
}
```

Add a private helper `parseKeywords` at the bottom of `handler.go` (it extracts the keyword-splitting logic to avoid duplication between `HandleGenerateBlog` and `HandleStreamGenerateBlog`):

```go
// parseKeywords normalises a raw keyword slice: trims whitespace and drops empties.
func parseKeywords(raw []string) []string {
    out := make([]string, 0, len(raw))
    for _, k := range raw {
        k = strings.TrimSpace(k)
        if k != "" {
            out = append(out, k)
        }
    }
    return out
}
```

Add `"strings"` to the handler's import block if not already present.

**Imports required in handler.go** (full updated list):
```go
import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "net/http"
    "strconv"
    "strings"
    "sync"

    "base-server/internal/blog/processor"
    "base-server/internal/infra/apierrors"
    "base-server/internal/infra/observability"
    "base-server/internal/infra/store"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
)
```

---

### B3: Register the new route

**File:** `base-server/internal/infra/api/api.go`

In the `RegisterRoutes` method, add one line immediately before the existing `protectedGroup.POST("/blog/generate", ...)` line so the more-specific path `/blog/generate/stream` is registered first (Gin matches in registration order for prefix collisions):

```go
protectedGroup.POST("/blog/generate/stream", a.blogHandler.HandleStreamGenerateBlog)
protectedGroup.POST("/blog/generate", a.blogHandler.HandleGenerateBlog)   // existing — keep
```

No changes to `bootstrap.go` or `handlers.go` — the `blogHandler` field already exists; `HandleStreamGenerateBlog` is just a new method on the same handler value.

---

### B4: Update the mock in handler tests

**File:** `base-server/internal/blog/handler/mocks_test.go`

The file comment says mocks are hand-rolled (function-field style). Add `StreamGenerateBlogPost` to the mock struct:

```go
StreamGenerateBlogPostFunc func(
    ctx context.Context,
    accountID uuid.UUID,
    instruction string,
    keywords []string,
    mediaIDs []uuid.UUID,
    cb processor.BlogStreamCallbacks,
) error
```

And the dispatch method:
```go
func (m *mockBlogProcessor) StreamGenerateBlogPost(
    ctx context.Context,
    accountID uuid.UUID,
    instruction string,
    keywords []string,
    mediaIDs []uuid.UUID,
    cb processor.BlogStreamCallbacks,
) error {
    return m.StreamGenerateBlogPostFunc(ctx, accountID, instruction, keywords, mediaIDs, cb)
}
```

---

## Frontend Tasks

### F1: New hook — `useSSEBlogGenerate`

**File:** `webapp/src/hooks/useSSEBlogGenerate.ts`

This hook mirrors `useSSEContentGenerate.ts` exactly, adapted for the blog SSE contract. There are no platform adaptations — only base content streams. The `done` event carries the full persisted `ApiBlogPost`.

**Full TypeScript interface for the SSE event payloads:**
```ts
// What the server sends on event: phase
interface PhasePayload { phase: "generating" | "done"; }

// What the server sends on event: chunk
interface ChunkPayload { text: string; }

// What the server sends on event: done
// This is the full ApiBlogPost JSON (same shape as the blocking endpoint)
import type { ApiBlogPost } from "@/api/types/blog";
```

**Hook state type:**
```ts
type BlogSSEPhase = "idle" | "generating";

interface SSEBlogGenerateState {
    phase: BlogSSEPhase;
    streamingContent: string;   // accumulates raw markdown chunks during generation
    blogPost: ApiBlogPost | null; // set on "done" event
    loading: boolean;
    error: string | null;
}
```

**Hook signature:**
```ts
export function useSSEBlogGenerate(): {
    phase: BlogSSEPhase;
    streamingContent: string;
    blogPost: ApiBlogPost | null;
    loading: boolean;
    error: string | null;
    generate: (instruction: string, keywords: string[], mediaIDs?: string[]) => Promise<void>;
    reset: () => void;
}
```

**Full implementation:**
```ts
import { useCallback, useRef, useState } from "react";
import type { ApiBlogPost } from "@/api/types/blog";

type BlogSSEPhase = "idle" | "generating";

interface SSEBlogGenerateState {
    phase: BlogSSEPhase;
    streamingContent: string;
    blogPost: ApiBlogPost | null;
    loading: boolean;
    error: string | null;
}

const initialState: SSEBlogGenerateState = {
    phase: "idle",
    streamingContent: "",
    blogPost: null,
    loading: false,
    error: null,
};

export function useSSEBlogGenerate() {
    const [state, setState] = useState<SSEBlogGenerateState>(initialState);
    const abortRef = useRef<AbortController | null>(null);

    const generate = useCallback(
        async (instruction: string, keywords: string[], mediaIDs?: string[]) => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            setState({ ...initialState, loading: true, phase: "generating" });

            try {
                const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/protected/blog/generate/stream`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "text/event-stream",
                        },
                        credentials: "include",
                        body: JSON.stringify({
                            instruction,
                            keywords,
                            media_ids: mediaIDs ?? [],
                        }),
                        signal: controller.signal,
                    },
                );

                if (!res.ok) {
                    setState((prev) => ({
                        ...prev,
                        loading: false,
                        phase: "idle",
                        error: "Failed to start blog generation",
                    }));
                    return;
                }

                const reader = res.body?.getReader();
                if (!reader) {
                    throw new Error("Failed to get reader from response body");
                }

                const decoder = new TextDecoder("utf-8");
                let buffer = "";

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() ?? "";

                    let currentEvent = "";

                    for (const line of lines) {
                        if (line.startsWith("event: ")) {
                            currentEvent = line.slice(7).trim();
                            continue;
                        }

                        if (line.startsWith("data: ")) {
                            const data = line.slice(6);

                            if (currentEvent === "phase") {
                                const payload = JSON.parse(data) as { phase: string };
                                if (payload.phase === "generating") {
                                    setState((prev) => ({ ...prev, phase: "generating" }));
                                }
                            } else if (currentEvent === "chunk") {
                                const payload = JSON.parse(data) as { text: string };
                                setState((prev) => ({
                                    ...prev,
                                    streamingContent: prev.streamingContent + payload.text,
                                }));
                            } else if (currentEvent === "done") {
                                const post = JSON.parse(data) as ApiBlogPost;
                                setState((prev) => ({
                                    ...prev,
                                    loading: false,
                                    phase: "idle",
                                    blogPost: post,
                                }));
                            } else if (currentEvent === "error") {
                                setState((prev) => ({
                                    ...prev,
                                    loading: false,
                                    phase: "idle",
                                    error: data,
                                }));
                            }

                            currentEvent = "";
                        }
                    }
                }
            } catch (err: unknown) {
                if (err instanceof DOMException && err.name === "AbortError") {
                    return;
                }
                setState((prev) => ({
                    ...prev,
                    loading: false,
                    phase: "idle",
                    error: "Blog generation failed",
                }));
            }
        },
        [],
    );

    const reset = useCallback(() => {
        abortRef.current?.abort();
        setState(initialState);
    }, []);

    return { generate, reset, ...state };
}
```

---

### F2: Update `BlogWizard.tsx` to consume streaming

**File:** `webapp/src/components/blog/BlogWizard.tsx`

**Depends on:** F1, B2, B3

**Changes summary:**
1. Remove `useGenerateBlog` import and usage.
2. Import `useSSEBlogGenerate` and `toBlogPost` from `@/api/transforms/blog`.
3. Replace `handleRegenerate` to call `generate()` from the hook.
4. Wire `streamingContent` from the hook into the preview panel as it streams.
5. On `blogPost` being set (the `done` payload), populate all form fields via `toBlogPost`.
6. Show a phase-aware loader in the right-side preview panel during generation.
7. Add a streaming cursor to the live preview.

**Full updated imports block** (replace existing imports):
```tsx
import { BookOpen, RefreshCw, Sparkles } from "lucide-react";
import "highlight.js/styles/github.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { toBlogPost } from "@/api/transforms/blog";
import { MediaUploadSection } from "@/components/create-post/compose/MediaUploadSection";
import { useCreateBlogPost } from "@/hooks/useCreateBlogPost";
import { useSSEBlogGenerate } from "@/hooks/useSSEBlogGenerate";
import { useMedia } from "@/hooks/useMedia";
import { usePublishBlog } from "@/hooks/usePublishBlog";
import { useUpdateBlogPost } from "@/hooks/useUpdateBlogPost";
import type {
    ExistingFile,
    UploadedFile,
} from "@/proto-design-system/components/composite/FileUpload";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { useBannerCenter } from "@/proto-design-system/components/feedback/BannerCenter";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Breadcrumb } from "@/proto-design-system/components/navigation/Breadcrumb";
import {
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
} from "@/proto-design-system/components/navigation/Tabs/Tabs";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { BlogPost } from "@/types/blog";
import styles from "./blog-wizard.module.scss";
```

**Replace the hook wiring block** (remove `useGenerateBlog`, add `useSSEBlogGenerate`):
```tsx
const {
    generate,
    reset: resetSSE,
    phase,
    streamingContent,
    blogPost: generatedPost,
    loading: generating,
    error: generateError,
} = useSSEBlogGenerate();
const { createBlogPost, loading: creating } = useCreateBlogPost();
const { updateBlogPost, loading: updating } = useUpdateBlogPost();
const { publishBlog, loading: publishing } = usePublishBlog();
```

**Add a `useEffect` to populate form fields when the SSE `done` payload arrives:**
```tsx
useEffect(() => {
    if (!generatedPost) return;
    const post = toBlogPost(generatedPost);
    setTitle(post.title);
    setContent(post.content);
    setSlug(post.slug);
    if (post.excerpt)          setExcerpt(post.excerpt);
    if (post.seoTitle)         setSeoTitle(post.seoTitle);
    if (post.metaDescription)  setMetaDescription(post.metaDescription);
    if (post.ogTitle)          setOgTitle(post.ogTitle);
    if (post.ogDescription)    setOgDescription(post.ogDescription);
}, [generatedPost]);
```

**Replace `handleRegenerate`:**
```tsx
const handleRegenerate = useCallback(async () => {
    if (!instruction.trim()) {
        setError("Please provide a topic or instructions.");
        return;
    }
    setError(null);
    const parsedKeywords = keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
    await generate(instruction, parsedKeywords, existingMediaIds);
}, [instruction, keywords, existingMediaIds, generate]);
```

**Determine the preview content** (add a derived value in the component body):
```tsx
// During streaming, show accumulated chunks. After done, show persisted content.
const previewContent = streamingContent || content;
const isStreaming = phase === "generating";
```

**Replace the right-side preview panel JSX** (the `<div className={styles.previewPanel}>` block):
```tsx
{/* ── Right: preview ──────────────────────────────────────────── */}
<div className={styles.previewPanel}>
    {/* Phase-aware loader: shown before first chunk arrives */}
    {generating && !streamingContent && (
        <Stack gap="sm" align="center" className={styles.generatingLoader}>
            <Spinner size="lg" />
            <Text size="sm" color="secondary" weight="medium">
                Generating your blog post...
            </Text>
        </Stack>
    )}

    {/* Live streaming preview — renders as chunks arrive */}
    {(streamingContent || content) && (
        <Tabs defaultTab="preview">
            <TabList>
                <Tab id="preview">Preview</Tab>
                <Tab id="markdown">Markdown</Tab>
            </TabList>
            <TabPanels>
                <TabPanel id="preview">
                    <div className={styles.markdown}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                        >
                            {previewContent}
                        </ReactMarkdown>
                        {isStreaming && (
                            <span className={styles.streamingCursor} />
                        )}
                    </div>
                </TabPanel>
                <TabPanel id="markdown">
                    <TextArea
                        placeholder="Blog post content will appear here after generation, or type directly..."
                        rows={30}
                        value={isStreaming ? streamingContent : content}
                        onChange={(e) => !isStreaming && setContent(e.target.value)}
                        fullWidth
                    />
                </TabPanel>
            </TabPanels>
        </Tabs>
    )}

    {/* Empty state: nothing generated yet and not currently generating */}
    {!generating && !streamingContent && !content && (
        <div className={styles.emptyPreview}>
            <BookOpen size={40} className={styles.emptyPreviewIcon} />
            <Text size="sm" color="muted">
                Enter a topic and click Generate to create your blog post.
            </Text>
        </div>
    )}
</div>
```

**Show generation error** (add below the existing `{error && <Alert>}` line):
```tsx
{generateError && <Alert variant="error">{generateError}</Alert>}
```

---

### F3: Add streaming CSS classes to `blog-wizard.module.scss`

**File:** `webapp/src/components/blog/blog-wizard.module.scss`

Add the following classes at the end of the file. They are direct copies of the equivalent rules in `CreatePostWizard.module.scss`:

```scss
.streamingCursor {
    display: inline-block;
    width: 2px;
    height: 1em;
    background: var(--color-primary);
    vertical-align: text-bottom;
    animation: blink 0.8s ease-in-out infinite;
}

@keyframes blink {
    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0;
    }
}

.generatingLoader {
    padding: var(--space-16) var(--space-6);
    text-align: center;
}
```

---

## Task Execution Order

Execute in this order. Backend must be complete before frontend work starts because the frontend depends on the SSE event contract.

| Order | Task | Agent type |
|-------|------|------------|
| 1 | B1 — `StreamGenerateBlogPost` method in processor | backend-api-endpoint (haiku) |
| 2 | B2 — `HandleStreamGenerateBlog` in handler + interface extension | backend-api-endpoint (haiku) |
| 3 | B3 — Route registration in `api.go` | backend-api-endpoint (haiku) |
| 4 | B4 — Update hand-rolled mock in handler tests | backend-unit-test-writer (haiku) |
| 5 | F1 — `useSSEBlogGenerate` hook | frontend-supervisor |
| 6 | F2 — `BlogWizard.tsx` updates | frontend-supervisor |
| 7 | F3 — SCSS additions | frontend-supervisor |

B1–B4 can be dispatched in a single backend batch (they write to isolated files). F1–F3 should be done by a single frontend-supervisor run since they are interdependent.

---

## SSE Event Contract (authoritative)

Endpoint: `POST /api/protected/blog/generate/stream`

Request body (identical shape to the existing `/blog/generate` endpoint):
```json
{
  "instruction": "string (required)",
  "keywords":    ["optional", "array"],
  "media_ids":   ["optional", "uuid", "strings"]
}
```

Events emitted in order:

| Event name | Data JSON | When |
|------------|-----------|------|
| `phase`    | `{"phase":"generating"}` | Immediately before AI streaming starts |
| `chunk`    | `{"text":"...markdown delta..."}` | Each AI token/chunk as it arrives |
| `phase`    | `{"phase":"done"}` | After DB persist succeeds (from `OnPhase("done")`) |
| `done`     | Full `store.BlogPost` JSON (same as blocking endpoint 201 body) | After DB persist succeeds |
| `error`    | `"blog generation failed"` (plain string, not JSON) | On any terminal error; no further events |

Note: the `done` payload is the raw `store.BlogPost` Go struct serialized — this matches `ApiBlogPost` in the frontend since `store.BlogPost` uses the same snake_case JSON tags that `ApiBlogPost` declares. The existing `toBlogPost` transform applies without changes.

---

## What Does NOT Change

- `POST /api/protected/blog/generate` — kept intact, no modification.
- `store.BlogPost` shape, migrations, `store.BlogStore` interface — no changes.
- `BlogProcessor.GenerateBlogPost` — kept intact for the worker path (`githubProcessor.BlogDraftGenerator`).
- `bootstrap.go`, `handlers.go`, `processors.go` — no changes; `HandleStreamGenerateBlog` is a new method on the existing `blogHandler.Handler` value already wired.
- Media attach/upload flow in `BlogWizard.tsx` — no changes to `MediaUploadSection`, `existingMediaIds` state, or the `pendingFiles` upload path.
- Save draft / publish actions in `BlogWizard.tsx` — no changes; they still call the existing `createBlogPost` / `updateBlogPost` / `publishBlog` hooks.
