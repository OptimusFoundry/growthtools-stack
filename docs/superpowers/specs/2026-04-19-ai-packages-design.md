# AI Packages — Design

**Status:** Approved for planning
**Date:** 2026-04-19
**Scope:** Backend (`base-server/`)

## Problem

AI content generation is scattered across `internal/content/processor/`, `internal/blog/processor/`, and `internal/github/processor/`. The `internal/content/processor/` file mixes four unrelated concerns (commit classification, image description, media + mode selection, post generation) behind a single `ContentProcessor` struct. Prompts live in a single `internal/content/prompts/` directory shared with platform config data. Two similar but distinct "pick a mode" calls (`SelectMediaAndMode`, `DecideMode`) compete for the same space. Multimodal calls re-send media bytes that a describer could have converted to text once and reused.

We want a clean split: a small set of reusable AI packages, each with a single responsibility, sharing a common `Description` type produced by a dedicated describer.

## Packages

```
base-server/internal/ai/
├── platforms/              # shared: char limits, supports_threads
├── mediadescriber/         # describes image or video → Description
├── mediaplanner/           # text-only: filter media + pick mode (draft worker path)
├── commitclassifier/       # worthwhile / not-worthwhile verdict on a commit
├── socialposts/            # generates single or threaded posts per platform
└── blog/                   # generates blog posts
```

Each package is a pure library: depends on `aiclient.AIClient`, `observability.Logger`, and on sibling AI packages (via shared types like `mediadescriber.Description`). No store, no HTTP, no DI tree.

### `internal/ai/platforms`

Pure data. Imported by `socialposts` and by platform handlers that need to know platform shape.

```go
type Config struct {
    Name            string
    CharLimit       int   // single post
    ThreadCharLimit int   // per segment (0 = same as CharLimit)
    SupportsThreads bool
}

func Get(platform string) Config
func All() []Config
```

### `internal/ai/mediadescriber`

```go
type Kind string // "image" | "video"

type Media struct {
    Index    int     // 1-based, preserved in output
    Kind     Kind
    MIMEType string
    Data     []byte
}

type Description struct {
    Index       int
    Kind        Kind
    MIMEType    string
    Description string  // 1–2 sentences
    Usable      bool    // false when broken/blank/stuck loading
    Issue       string  // populated when !Usable
}

type Describer struct { /* aiClient, logger */ }

func New(aiClient AIClient, logger *observability.Logger) *Describer
func (d *Describer) Describe(ctx context.Context, m Media) (Description, error)
func (d *Describer) DescribeBatch(ctx context.Context, m []Media) []Description  // parallel, per-item fail-soft
```

Two prompt templates internally (image vs video). The video prompt explicitly asks the model to flag broken/blank/stuck clips so downstream callers can drop them without a second multimodal pass.

`Description` is the shared currency of the AI packages — `mediaplanner`, `socialposts`, and `blog` all consume it.

### `internal/ai/mediaplanner`

Text-only. Consumes descriptions produced by `mediadescriber`.

```go
type SelectRequest struct {
    CommitMessage string
    Descriptions  []mediadescriber.Description
}

type SelectDecision struct {
    KeepIndexes []int   // 1-based into Descriptions; empty = no media
    Mode        string  // "single" | "thread"
    ThreadParts int     // 2–3 when thread; 0 when single
    Reason      string
}

type Planner struct { /* aiClient, logger */ }

func New(aiClient AIClient, logger *observability.Logger) *Planner
func (p *Planner) SelectAndDecide(ctx context.Context, req SelectRequest) (SelectDecision, error)
```

One function. `DecideMode` is gone — the interactive handler validates `content_type` and errors on missing/invalid instead of falling back to an AI decision.

### `internal/ai/commitclassifier`

```go
type Verdict struct {
    Worthwhile bool
    Reason     string
}

type Classifier struct { /* aiClient, logger */ }

func New(aiClient AIClient, logger *observability.Logger) *Classifier
func (c *Classifier) Classify(ctx context.Context, message, diff string) (Verdict, error)
```

Behaviour unchanged from today's `ClassifyCommit`: 40k-char diff truncation, empty-response fail-open to `Worthwhile=true` with a note.

### `internal/ai/socialposts`

```go
type Mode string // "single" | "thread"

type VoiceContext struct { /* same shape as today's prompts.VoiceContext */ }

type Request struct {
    Prompt       string
    BaseContent  string   // optional; when empty, generator produces base first
    Platforms    []string // e.g. ["x", "linkedin", "instagram"]
    Mode         Mode     // required; caller decides
    ThreadParts  int      // required when Mode=="thread" (2–3)
    Media        []mediadescriber.Description
    Voice        *VoiceContext
}

// Segment is a sum type — use a type switch.
type Segment interface{ isSegment() }

type TextSegment  struct{ Content string }
type MediaSegment struct{ Content string; ImageIndex int } // 1-based into Request.Media

func (TextSegment)  isSegment() {}
func (MediaSegment) isSegment() {}

// PlatformResult is a sum type — use a type switch.
type PlatformResult interface {
    Platform() string
    ModeKind() Mode
}

type SinglePost struct {
    PlatformName string
    Content      string
}

type Thread struct {
    PlatformName string
    Segments     []Segment // always ≥ 2
}

func (s SinglePost) Platform() string { return s.PlatformName }
func (s SinglePost) ModeKind() Mode   { return "single" }
func (t Thread)     Platform() string { return t.PlatformName }
func (t Thread)     ModeKind() Mode   { return "thread" }

type Result struct {
    BaseContent string
    Platforms   map[string]PlatformResult // value is SinglePost or Thread
}

type Generator struct { /* aiClient, logger */ }

func New(aiClient AIClient, logger *observability.Logger) *Generator
func (g *Generator) Generate(ctx context.Context, req Request) (Result, error)
func (g *Generator) GenerateStream(ctx context.Context, req Request) (<-chan Event, error)
```

Per-platform `SupportsThreads` still gates thread output — if `Mode="thread"` but the platform is Instagram (no threads), that platform returns `SinglePost`. Char limits are enforced inside the generator as a safety net via `truncateToCharLimit`.

Two prompt templates: `prompts/single.go` and `prompts/thread.go`. The generator chooses based on `(req.Mode, platforms.Get(platform).SupportsThreads)`.

### `internal/ai/blog`

```go
type MediaItem struct {
    Description mediadescriber.Description // provides alt text + usable flag
    URL         string                     // presigned, baked into markdown
}

type Request struct {
    Prompt string
    Media  []MediaItem
}

type Result struct {
    Title           string
    Content         string // markdown
    Excerpt         string
    SEOTitle        string
    MetaDescription string
}

type Generator struct { /* aiClient, logger */ }

func New(aiClient AIClient, logger *observability.Logger) *Generator
func (g *Generator) Generate(ctx context.Context, req Request) (Result, error)
func (g *Generator) GenerateStream(ctx context.Context, req Request) (<-chan BlogEvent, error)
```

Blog consumes descriptions just like `socialposts` — the AI writes alt text from the description rather than seeing the image bytes on every call. This means repeat regenerations skip the multimodal pass entirely.

## Streaming

Streaming uses Go channels with a tagged-event sum type, not callbacks. Rationale: the previous callback contract required "all callbacks must be safe for concurrent use — multiple platform goroutines call them simultaneously", pushing concurrency handling onto every caller. With channels, the caller has a single `for range` loop and no concurrency to reason about.

```go
type Event interface{ isEvent() }

type PhaseEvent        struct{ Phase, Platform string }
type ChunkEvent        struct{ Platform, Chunk string }            // Platform="" for base content
type BaseDoneEvent     struct{ Content string }
type PlatformDoneEvent struct{ Platform string; Result PlatformResult }
type ErrorEvent        struct{ Err error }

func (PhaseEvent)        isEvent() {}
func (ChunkEvent)        isEvent() {}
func (BaseDoneEvent)     isEvent() {}
func (PlatformDoneEvent) isEvent() {}
func (ErrorEvent)        isEvent() {}
```

Contract:
- `GenerateStream` returns the channel. The generator owns it and closes it when the full stream is done (success or after an `ErrorEvent`).
- Setup failures (invalid mode, empty platforms) return synchronously from `GenerateStream` with a non-nil error; the channel is not created.
- Runtime failures are surfaced as a terminal `ErrorEvent` followed by close. Caller handles both synchronously in the same loop.
- Internal fan-out: the generator uses `errgroup` for per-platform goroutines; each sends to a shared buffered channel. Buffer size ≈ `len(platforms) * 4` so chunk-heavy platforms don't block each other.
- Context cancellation: generator watches `ctx.Done()`; on cancel, sends a final `ErrorEvent{ctx.Err()}` and closes.

Caller pattern:

```go
ch, err := gen.GenerateStream(ctx, req)
if err != nil { return err }
for evt := range ch {
    switch e := evt.(type) {
    case socialposts.PhaseEvent:        // push SSE phase message
    case socialposts.ChunkEvent:        // push SSE chunk message
    case socialposts.BaseDoneEvent:     // push SSE base-done
    case socialposts.PlatformDoneEvent: // push SSE platform-done
    case socialposts.ErrorEvent:        return e.Err
    }
}
return nil
```

The SSE handler becomes a thin translator: event → SSE message. `blog.GenerateStream` follows the same pattern with its own `BlogEvent` sum type (no fan-out, just base chunks + done).

## Call paths

### Path A — draft worker (auto-captured media)

Runs inside `internal/github/processor`, triggered by a commit event.

```
commit arrives
  │
  ▼ commitclassifier.Classify(message, diff)
  │   └─ skip if !Worthwhile
  │
  ▼ mediadescriber.DescribeBatch([video, images...])      parallel, per-item fail-soft
  │   returns []Description
  │
  ▼ mediaplanner.SelectAndDecide(commitMessage, descriptions)
  │   returns { KeepIndexes, Mode, ThreadParts, Reason }
  │
  ▼ filter descriptions → KeepIndexes
  │
  ▼ socialposts.Generate(Request{...})                    non-streaming
  │   returns Result{ BaseContent, Platforms: {x: Thread, linkedin: Thread, ig: SinglePost} }
  │
  ▼ github/processor persists drafts (base + per-platform + segment media attachments)
```

### Path B — interactive streaming (user-typed prompt)

Covers both `POST /content/generate` and `POST /content/regenerate`. Both stream via SSE.

```
POST /content/{generate,regenerate}  (prompt, platforms, content_type, media_ids)
  │
  ▼ handler validates content_type ∈ {single, thread, text}          400 on missing/invalid
  ▼ handler fetches media bytes from S3
  │
  ▼ mediadescriber.DescribeBatch(media)                               PhaseEvent("describing","")
  │
  ▼ socialposts.GenerateStream(Request{..., Mode from content_type})
  │   — base generation: ChunkEvent(Platform="")
  │   — BaseDoneEvent
  │   — per-platform fan-out: ChunkEvent(Platform=X)
  │   — PlatformDoneEvent(Platform=X, Result)
  │
  ▼ handler relays each Event as an SSE message
```

## What is removed

- `internal/content/processor/` — deleted in full. The four files (`classify.go`, `media_plan.go`, `generate.go`, `voice.go`) are extracted into the new AI packages.
- `internal/content/prompts/` — deleted. Prompt builders move to per-package `prompts/` subdirectories. Platform configs move to `internal/ai/platforms/`.
- `DecideMode` — deleted. `internal/content/handler` validates `content_type` and returns 400 on missing or invalid values.
- `StreamCallbacks` struct and the "callbacks must be safe for concurrent use" contract — replaced by channel events.

## What is kept

- `internal/content/handler/` — stays. After the refactor it calls AI packages directly: `mediadescriber` → `socialposts.GenerateStream`, relaying events as SSE. No processor layer in between.
- `internal/blog/processor/` — stays, thinned. Keeps CRUD, URL presigning, media hydration. The AI call delegates to `internal/ai/blog`.
- `internal/media/processor/` — untouched (non-AI media CRUD).
- `internal/github/processor/` (draft worker) — stays. Calls the four AI packages directly for Path A.
- `internal/posts/processor/` — stays. Calls `socialposts` directly where it used to call `ContentProcessor`.
- `internal/infra/clients/aiclient` — untouched. Single shared client, injected into each AI package by bootstrap.

## Migration

Ordered steps. Each is independently shippable; the plan-writer decides whether to bundle.

1. **Create `internal/ai/platforms/`.** Copy platform configs from `internal/content/prompts/platforms.go`. Update downstream readers.
2. **Create `internal/ai/mediadescriber/`.** Extract `DescribeImages`; add a new video describer prompt. Wire through `bootstrap/processors.go`.
3. **Create `internal/ai/commitclassifier/`.** Move `classify.go`. Update `internal/github/processor` to call it directly.
4. **Create `internal/ai/mediaplanner/`.** Rewrite `SelectMediaAndMode` as text-only, consuming `[]Description`. Delete the multimodal version and `DecideMode` entirely.
5. **Create `internal/ai/socialposts/`.** Move `generate.go` logic; split prompts into `single.go` / `thread.go`; introduce the `PlatformResult` / `Segment` interface types and the `Event` channel surface. Update `internal/posts/processor` and `internal/content/handler` to call the new API.
6. **Create `internal/ai/blog/`.** Extract the AI call from `internal/blog/processor/processor.go`. Blog processor keeps CRUD / URL signing / hydration; AI call delegates.
7. **Delete `internal/content/processor/` and `internal/content/prompts/`.** Validate `content_type` in `internal/content/handler` (400 on missing/invalid). Rewrite the 1336 lines of `processor_test.go` as per-package tests on the new AI packages.
8. **Update draft worker (`internal/github/processor`)** to use the new package chain end-to-end.
9. **Bootstrap wiring.** `bootstrap/clients.go` stays. `bootstrap/processors.go` constructs each AI package (`mediadescriber.New(aiClient, logger)` etc.) and passes them into the feature processors that need them.

## Testing

- Each `internal/ai/*` package ships table-driven unit tests with gomock-generated mocks of its `AIClient` interface. Test behaviour (what the package does given a canned AI response), not prompt text.
- `socialposts.GenerateStream` gets a dedicated test that drains the event channel and asserts the event sequence + close semantics for both success and error paths.
- One end-to-end integration test exercises Path A (draft worker) with a mocked AI client returning canned responses at each stage, to verify wiring.
- `internal/content/processor/processor_test.go` (1336 lines) is split across the new packages — each new package inherits its share.

## Non-goals

- No change to the `aiclient` interface or the underlying AI provider client.
- No new AI capabilities — the refactor preserves today's behaviour. New prompts (video describer) only add what's needed to replace multimodal calls with text-only equivalents.
- No change to HTTP routes or the SSE event payloads the frontend consumes. The handler translation layer ensures wire-compat.
