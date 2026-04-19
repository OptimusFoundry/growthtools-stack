# AI Packages Refactor — Implementation Plan

**Date:** 2026-04-19
**Spec:** `docs/superpowers/specs/2026-04-19-ai-packages-design.md`
**Goal:** Extract four scattered AI concerns out of `internal/content/processor/` and `internal/content/prompts/` into six focused packages under `internal/ai/`, replace callback-based streaming with a channel event sum type, and eliminate `DecideMode`.
**Scope:** backend-only
**Executor:** `backend-subagent-development` skill (batches haiku agents by phase)

---

## Architecture Summary

### What is changing

The `internal/content/processor/` package (five files, 1336-line test suite) mixes commit classification, image description, media/mode planning, and post generation behind one `ContentProcessor` struct. `internal/content/prompts/` mixes platform config data with prompt-builder functions. Both are deleted at the end of this refactor.

Six replacement packages are created under `internal/ai/`:

- `platforms/` — pure platform config data (replaces `prompts/platforms.go`).
- `mediadescriber/` — multimodal image/video → `Description` (replaces `DescribeImages`, adds a new video path).
- `commitclassifier/` — commit worthiness verdict (replaces `ClassifyCommit`).
- `mediaplanner/` — text-only media + mode selection (replaces `SelectMediaAndMode`; `DecideMode` is deleted).
- `socialposts/` — single/thread post generation with channel-based streaming (replaces `GeneratePost`, `AdaptContent`, `GenerateThread`, `StreamGenerateAndAdapt`, `GenerateWithMediaPlan`).
- `blog/` — blog post generation (extracts AI logic from `internal/blog/processor/processor.go`).

### Downstream callers being updated

- `internal/content/handler/handler.go` — calls `mediadescriber` + `socialposts.GenerateStream` directly. `DecideMode` branch and `processor.ContentProcessor` interface reference are removed. `content_type` validated in-handler (400 on missing/invalid).
- `internal/github/processor/draft.go` — `ContentGenerator` interface and `assessMediaAndMode` helper replaced with direct calls to `commitclassifier`, `mediadescriber`, `mediaplanner`, and `socialposts.Generate`.
- `internal/blog/processor/processor.go` — `GenerateBlogPost` and `StreamGenerateBlogPost` delegate AI work to `internal/ai/blog.Generator`.
- `internal/infra/bootstrap/processors.go` — constructs each AI package and passes instances into feature processors.

### What is NOT changing

- `aiclient.Client` interface — untouched.
- HTTP routes and SSE event payload shapes — wire-compatible.
- `internal/media/processor/` — untouched.
- All store and migration files — no schema changes.

---

## Execution Order and Parallelisation

```
Phase 1 (parallel — no inter-package deps):
  B1  platforms
  B2  mediadescriber
  B3  commitclassifier
  B4  mediaplanner

Phase 2 (after Phase 1):
  B5  socialposts         (depends on platforms, mediadescriber.Description)
  B6  blog                (depends on mediadescriber.Description)

Phase 3 (after Phase 2):
  B7  github/processor    (uses commitclassifier + mediadescriber + mediaplanner + socialposts)
  B8  content/handler     (uses mediadescriber + socialposts)
  B9  blog/processor      (uses blog)

Phase 4 (after Phase 3):
  B10 bootstrap wiring
  B11 delete old packages + tests
```

---

## Backend Tasks

### B1: New package — `internal/ai/platforms`

**Files to create:**
- `base-server/internal/ai/platforms/platforms.go`
- `base-server/internal/ai/platforms/platforms_test.go`

**`platforms.go` — complete implementation:**

```go
// Package platforms holds platform configuration data for the eight supported
// social media platforms. This is the authoritative source of platform
// constraints for all AI packages.
package platforms

import "strings"

// Config holds content constraints for a single social platform.
type Config struct {
    // Name is the display name shown in prompts and logs.
    Name string
    // ID is the lowercase identifier used as a map key and in requests.
    ID string
    // CharLimit is the maximum character count for a single post.
    CharLimit int
    // ThreadCharLimit is the per-segment character limit when posting a thread.
    // Zero means same as CharLimit.
    ThreadCharLimit int
    // MaxThreadParts is the maximum number of thread segments supported.
    MaxThreadParts int
    // SupportsThreads is true when the platform natively supports threaded posts.
    SupportsThreads bool
    // MediaRequired is true when the platform requires at least one media attachment.
    MediaRequired bool
    // HashtagStyle describes the platform's hashtag convention ("none", "trailing", etc.)
    HashtagStyle string
    // ToneHint is a short editorial hint for the AI on how to write for this platform.
    ToneHint string
}

var all = map[string]Config{
    "x": {
        Name:            "X (Twitter)",
        ID:              "x",
        CharLimit:       280,
        ThreadCharLimit: 280,
        MaxThreadParts:  25,
        SupportsThreads: true,
        MediaRequired:   false,
        HashtagStyle:    "none",
        ToneHint:        "concise, punchy, conversational",
    },
    "linkedin": {
        Name:            "LinkedIn",
        ID:              "linkedin",
        CharLimit:       3000,
        SupportsThreads: false,
        MediaRequired:   false,
        HashtagStyle:    "none",
        ToneHint:        "professional, insightful, value-driven",
    },
    "bluesky": {
        Name:            "BlueSky",
        ID:              "bluesky",
        CharLimit:       300,
        ThreadCharLimit: 300,
        MaxThreadParts:  20,
        SupportsThreads: true,
        MediaRequired:   false,
        HashtagStyle:    "none",
        ToneHint:        "casual, authentic, community-oriented",
    },
    "facebook": {
        Name:            "Facebook",
        ID:              "facebook",
        CharLimit:       63206,
        SupportsThreads: false,
        MediaRequired:   false,
        HashtagStyle:    "none",
        ToneHint:        "friendly, relatable, storytelling",
    },
    "instagram": {
        Name:            "Instagram",
        ID:              "instagram",
        CharLimit:       2200,
        SupportsThreads: false,
        MediaRequired:   true,
        HashtagStyle:    "none",
        ToneHint:        "visual-first caption, lifestyle-oriented, emoji-friendly",
    },
    "threads": {
        Name:            "Threads",
        ID:              "threads",
        CharLimit:       500,
        ThreadCharLimit: 500,
        MaxThreadParts:  15,
        SupportsThreads: true,
        MediaRequired:   false,
        HashtagStyle:    "none",
        ToneHint:        "conversational, casual, opinion-driven",
    },
    "tiktok": {
        Name:            "TikTok",
        ID:              "tiktok",
        CharLimit:       2200,
        SupportsThreads: false,
        MediaRequired:   true,
        HashtagStyle:    "none",
        ToneHint:        "trendy, Gen-Z friendly, hook-first",
    },
    "pinterest": {
        Name:            "Pinterest",
        ID:              "pinterest",
        CharLimit:       500,
        SupportsThreads: false,
        MediaRequired:   true,
        HashtagStyle:    "none",
        ToneHint:        "inspirational, keyword-rich, actionable",
    },
}

// Get returns the Config for the given platform ID (case-insensitive).
// If the platform is unknown, a sensible default is returned so callers
// can always proceed — the unknown platform falls back to X-style limits.
func Get(platform string) Config {
    if c, ok := all[strings.ToLower(platform)]; ok {
        return c
    }
    return Config{
        Name:      platform,
        ID:        strings.ToLower(platform),
        CharLimit: 280,
        ToneHint:  "engaging and professional",
    }
}

// All returns a slice of all known platform configs in deterministic order.
func All() []Config {
    order := []string{"x", "linkedin", "bluesky", "facebook", "instagram", "threads", "tiktok", "pinterest"}
    out := make([]Config, 0, len(order))
    for _, id := range order {
        out = append(out, all[id])
    }
    return out
}
```

**`platforms_test.go` — complete tests:**

```go
package platforms_test

import (
    "testing"

    "base-server/internal/ai/platforms"
)

func TestGet_KnownPlatform(t *testing.T) {
    t.Parallel()
    c := platforms.Get("x")
    if c.CharLimit != 280 {
        t.Fatalf("expected 280, got %d", c.CharLimit)
    }
    if !c.SupportsThreads {
        t.Fatal("expected x to support threads")
    }
}

func TestGet_CaseInsensitive(t *testing.T) {
    t.Parallel()
    c := platforms.Get("LinkedIn")
    if c.ID != "linkedin" {
        t.Fatalf("expected id 'linkedin', got %q", c.ID)
    }
}

func TestGet_UnknownPlatform_DefaultsToSensibleValues(t *testing.T) {
    t.Parallel()
    c := platforms.Get("newplatform")
    if c.CharLimit == 0 {
        t.Fatal("expected non-zero default char limit")
    }
    if c.ID != "newplatform" {
        t.Fatalf("expected id 'newplatform', got %q", c.ID)
    }
}

func TestAll_ReturnAllEightPlatforms(t *testing.T) {
    t.Parallel()
    all := platforms.All()
    if len(all) != 8 {
        t.Fatalf("expected 8 platforms, got %d", len(all))
    }
}

func TestAll_DeterministicOrder(t *testing.T) {
    t.Parallel()
    first := platforms.All()
    second := platforms.All()
    for i := range first {
        if first[i].ID != second[i].ID {
            t.Fatalf("order not deterministic at index %d: %q vs %q", i, first[i].ID, second[i].ID)
        }
    }
}
```

**Commit message:** `feat(ai/platforms): add platforms package with Config, Get, and All`

---

### B2: New package — `internal/ai/mediadescriber`

**Files to create:**
- `base-server/internal/ai/mediadescriber/mediadescriber.go`
- `base-server/internal/ai/mediadescriber/mediadescriber_test.go`

**`mediadescriber.go` — complete implementation:**

```go
// Package mediadescriber converts raw image or video bytes into a concise text
// Description using a multimodal AI call. The Description is the shared
// currency consumed by mediaplanner, socialposts, and blog.
package mediadescriber

//go:generate go run go.uber.org/mock/mockgen@latest -source=mediadescriber.go -destination=mocks_test.go -package=mediadescriber

import (
    "context"
    "strings"

    "base-server/internal/infra/clients/aiclient"
    "base-server/internal/infra/observability"

    "golang.org/x/sync/errgroup"
)

// AIClient is the subset of aiclient.Client used by this package.
type AIClient interface {
    CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
}

// Kind identifies the media type.
type Kind string

const (
    KindImage Kind = "image"
    KindVideo Kind = "video"
)

// Media is a single piece of media to describe.
type Media struct {
    // Index is 1-based; it is preserved in the returned Description so
    // callers can correlate descriptions back to the original media slice.
    Index    int
    Kind     Kind
    MIMEType string
    Data     []byte
}

// Description is the AI-produced summary for one piece of media.
// It is the shared currency of the ai/* packages — all downstream callers
// consume []Description rather than raw bytes.
type Description struct {
    Index       int
    Kind        Kind
    MIMEType    string
    // Description is 1–2 sentences describing the media.
    Description string
    // Usable is false when the media is broken, blank, or a stuck loading
    // screen. Downstream callers should drop unusable descriptions.
    Usable bool
    // Issue is populated when Usable is false; it explains why the media
    // was flagged so operators can see it in logs.
    Issue string
}

const (
    imageSystemPrompt = `Describe this image concisely for social media context. Focus on key visual elements, mood, and subject matter. Respond with 1–2 sentences only. No preamble.`

    videoSystemPrompt = `Describe this video clip concisely for social media context. Focus on what action or change is shown, the mood, and the key moment.

If the video is broken, stuck on a loading state, mostly blank/dark, fails to play, or shows only a spinner — respond with exactly: UNUSABLE: <one sentence reason>

Otherwise respond with 1–2 sentences describing the content. No preamble.`
)

// Describer calls the AI to produce descriptions for media items.
type Describer struct {
    aiClient AIClient
    logger   *observability.Logger
}

// New creates a Describer.
func New(aiClient AIClient, logger *observability.Logger) *Describer {
    return &Describer{aiClient: aiClient, logger: logger}
}

// Describe produces an AI description for a single media item.
// If the AI call fails, a fail-soft Description with Usable=false is returned
// so the caller can proceed without one item.
func (d *Describer) Describe(ctx context.Context, m Media) (Description, error) {
    ctx = observability.WithFields(ctx,
        observability.Field{Key: "operation", Value: "describe_media"},
        observability.Field{Key: "media_index", Value: m.Index},
        observability.Field{Key: "media_kind", Value: string(m.Kind)},
    )

    var sysPrompt string
    if m.Kind == KindVideo {
        sysPrompt = videoSystemPrompt
    } else {
        sysPrompt = imageSystemPrompt
    }

    messages := []aiclient.Message{
        {
            Role:    "user",
            Content: "Describe this media.",
            Images:  []aiclient.ImageData{{MIMEType: m.MIMEType, Data: m.Data}},
        },
    }

    raw, err := d.aiClient.CreateMessage(ctx, sysPrompt, messages, 256)
    if err != nil {
        d.logger.Error(ctx, "failed to describe media via ai", err)
        return Description{
            Index:    m.Index,
            Kind:     m.Kind,
            MIMEType: m.MIMEType,
            Usable:   false,
            Issue:    "ai call failed",
        }, nil // fail-soft: caller proceeds without this description
    }

    text := strings.TrimSpace(raw)
    if text == "" {
        return Description{
            Index:    m.Index,
            Kind:     m.Kind,
            MIMEType: m.MIMEType,
            Usable:   false,
            Issue:    "ai returned empty description",
        }, nil
    }

    // Video-only: the model signals unusable clips with the UNUSABLE: prefix.
    if m.Kind == KindVideo && strings.HasPrefix(text, "UNUSABLE:") {
        issue := strings.TrimSpace(strings.TrimPrefix(text, "UNUSABLE:"))
        return Description{
            Index:    m.Index,
            Kind:     m.Kind,
            MIMEType: m.MIMEType,
            Usable:   false,
            Issue:    issue,
        }, nil
    }

    return Description{
        Index:       m.Index,
        Kind:        m.Kind,
        MIMEType:    m.MIMEType,
        Description: text,
        Usable:      true,
    }, nil
}

// DescribeBatch describes a slice of media items in parallel.
// Each item is described independently — a failure for one item does not
// affect others. All items produce a Description entry (Usable=false on
// error). The returned slice is in the same order as the input.
func (d *Describer) DescribeBatch(ctx context.Context, items []Media) []Description {
    results := make([]Description, len(items))
    g, gCtx := errgroup.WithContext(ctx)

    for i, item := range items {
        g.Go(func() error {
            desc, _ := d.Describe(gCtx, item) // errors are already fail-soft inside Describe
            results[i] = desc
            return nil
        })
    }

    _ = g.Wait()
    return results
}
```

**`mediadescriber_test.go` — complete tests:**

```go
package mediadescriber_test

import (
    "context"
    "errors"
    "testing"

    "base-server/internal/ai/mediadescriber"
    "base-server/internal/infra/observability"

    "go.uber.org/mock/gomock"
)

func newLogger() *observability.Logger { return observability.NewLogger("test", "test") }

func TestDescriber_Describe_ImageHappyPath(t *testing.T) {
    t.Parallel()
    ctrl := gomock.NewController(t)
    mockAI := NewMockAIClient(ctrl)
    mockAI.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return("A screenshot showing the new editor UI.", nil)

    d := mediadescriber.New(mockAI, newLogger())
    desc, err := d.Describe(context.Background(), mediadescriber.Media{
        Index: 1, Kind: mediadescriber.KindImage, MIMEType: "image/png", Data: []byte("fake"),
    })
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if !desc.Usable {
        t.Fatalf("expected Usable=true, got issue=%q", desc.Issue)
    }
    if desc.Description != "A screenshot showing the new editor UI." {
        t.Fatalf("unexpected description: %q", desc.Description)
    }
}

func TestDescriber_Describe_VideoUnusable(t *testing.T) {
    t.Parallel()
    ctrl := gomock.NewController(t)
    mockAI := NewMockAIClient(ctrl)
    mockAI.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return("UNUSABLE: blank loading screen", nil)

    d := mediadescriber.New(mockAI, newLogger())
    desc, err := d.Describe(context.Background(), mediadescriber.Media{
        Index: 1, Kind: mediadescriber.KindVideo, MIMEType: "video/mp4", Data: []byte("fake"),
    })
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if desc.Usable {
        t.Fatal("expected Usable=false for blank video")
    }
    if desc.Issue == "" {
        t.Fatal("expected Issue to be populated")
    }
}

func TestDescriber_Describe_AIError_FailSoft(t *testing.T) {
    t.Parallel()
    ctrl := gomock.NewController(t)
    mockAI := NewMockAIClient(ctrl)
    mockAI.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return("", errors.New("provider timeout"))

    d := mediadescriber.New(mockAI, newLogger())
    desc, err := d.Describe(context.Background(), mediadescriber.Media{
        Index: 2, Kind: mediadescriber.KindImage, MIMEType: "image/jpeg", Data: []byte("x"),
    })
    // Describe is fail-soft: no error returned to caller
    if err != nil {
        t.Fatalf("expected nil error, got %v", err)
    }
    if desc.Usable {
        t.Fatal("expected Usable=false on AI error")
    }
    if desc.Index != 2 {
        t.Fatalf("expected index preserved, got %d", desc.Index)
    }
}

func TestDescriber_DescribeBatch_PreservesOrder(t *testing.T) {
    t.Parallel()
    ctrl := gomock.NewController(t)
    mockAI := NewMockAIClient(ctrl)
    mockAI.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return("desc A", nil).Times(1)
    mockAI.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return("desc B", nil).Times(1)

    d := mediadescriber.New(mockAI, newLogger())
    items := []mediadescriber.Media{
        {Index: 1, Kind: mediadescriber.KindImage, MIMEType: "image/png", Data: []byte("a")},
        {Index: 2, Kind: mediadescriber.KindImage, MIMEType: "image/jpeg", Data: []byte("b")},
    }
    results := d.DescribeBatch(context.Background(), items)
    if len(results) != 2 {
        t.Fatalf("expected 2 results, got %d", len(results))
    }
    if results[0].Index != 1 || results[1].Index != 2 {
        t.Fatalf("order not preserved: [%d, %d]", results[0].Index, results[1].Index)
    }
}

func TestDescriber_DescribeBatch_EmptyInput(t *testing.T) {
    t.Parallel()
    ctrl := gomock.NewController(t)
    mockAI := NewMockAIClient(ctrl)
    d := mediadescriber.New(mockAI, newLogger())
    results := d.DescribeBatch(context.Background(), nil)
    if len(results) != 0 {
        t.Fatalf("expected empty slice, got %d", len(results))
    }
}
```

**Commit message:** `feat(ai/mediadescriber): add image/video describer with fail-soft batch`

---

### B3: New package — `internal/ai/commitclassifier`

**Files to create:**
- `base-server/internal/ai/commitclassifier/commitclassifier.go`
- `base-server/internal/ai/commitclassifier/commitclassifier_test.go`

**`commitclassifier.go` — complete implementation:**

Behaviour is identical to today's `ContentProcessor.ClassifyCommit`:
- 40 000-char diff truncation.
- Empty AI response → fail-open `Verdict{Worthwhile: true}`.
- Parse error → return `ErrClassify`.

```go
// Package commitclassifier decides whether a pushed commit is worth
// running the capture + draft pipeline on.
package commitclassifier

//go:generate go run go.uber.org/mock/mockgen@latest -source=commitclassifier.go -destination=mocks_test.go -package=commitclassifier

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "strings"

    "base-server/internal/infra/clients/aiclient"
    "base-server/internal/infra/observability"
)

// AIClient is the subset of aiclient.Client used by this package.
type AIClient interface {
    CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
}

// ErrClassify is returned when the AI call or response parse fails.
// Callers should treat this as fail-open — proceed with the commit.
var ErrClassify = errors.New("commit classification failed")

// Verdict is the classifier's call on a single commit.
type Verdict struct {
    // Worthwhile is true when the change would be visible to end users or is
    // something the founder would plausibly announce.
    Worthwhile bool
    // Reason is a short sentence the classifier writes regardless of verdict,
    // so skip decisions are auditable in logs.
    Reason string
}

const systemPrompt = `You are a release-notes editor for a solo founder's product. You decide whether a single git commit is worth turning into a short social media post — videos captured from the app, a thread announcing the change.

You receive:
1. The commit message.
2. A unified diff (possibly truncated).

Return raw JSON only (no markdown, no commentary):
{"worthwhile": true|false, "reason": "one short sentence"}

"Worthwhile" means: a reasonable end user would notice this change, OR the change ships something a founder would plausibly announce (new feature, UX improvement, visible bug fix, copy change on a user-facing screen, new page, new integration, public API addition).

"Not worthwhile" means any of:
- Pure test additions or test-only changes
- Dependency bumps / lockfile churn with no source edits
- CI / infra / Dockerfile / Terraform / deploy config changes
- Internal refactors, renames, code moves with no behavioural change
- Dev tooling, scripts, migrations with no user-visible effect
- Dead code removal
- Comment, typo, formatting, or lint fixes
- Documentation-only changes (README, internal docs)
- Commented-out / disabled code
- Revert commits where the reverted change itself wouldn't be announced

Rules:
- Lean toward NOT worthwhile when the diff is ambiguous — false positives waste a video render and clutter the user's feed with noise.
- If the commit message clearly describes a user-facing change AND the diff touches UI code (components, routes, templates, styles, copy strings, user-facing endpoints), say yes.
- Weight the diff over the message. A "feat: x" message with a diff that's just tests is NOT worthwhile.
- Keep the reason concrete ("adds new /pricing page", "lockfile-only bump", "tests for existing behaviour") — not "this is a feature".
- Never include anything other than the JSON object.`

const maxDiffChars = 40_000

// Classifier classifies commits via AI.
type Classifier struct {
    aiClient AIClient
    logger   *observability.Logger
}

// New creates a Classifier.
func New(aiClient AIClient, logger *observability.Logger) *Classifier {
    return &Classifier{aiClient: aiClient, logger: logger}
}

// Classify decides whether a commit is worth running the capture + draft
// pipeline on. Callers must treat non-nil error as fail-open.
func (c *Classifier) Classify(ctx context.Context, message, diff string) (Verdict, error) {
    ctx = observability.WithFields(ctx,
        observability.Field{Key: "operation", Value: "classify_commit"},
    )

    if len(diff) > maxDiffChars {
        diff = diff[:maxDiffChars] + "\n… [truncated]"
    }
    userMessage := fmt.Sprintf("Commit message:\n%s\n\nDiff:\n```\n%s\n```", strings.TrimSpace(message), diff)

    raw, err := c.aiClient.CreateMessage(ctx, systemPrompt, []aiclient.Message{
        {Role: "user", Content: userMessage},
    }, 1024)
    if err != nil {
        c.logger.Error(ctx, "failed to classify commit via ai", err)
        return Verdict{}, ErrClassify
    }

    trimmed := strings.TrimSpace(raw)
    if trimmed == "" {
        c.logger.Info(ctx, "commit classifier returned empty response; defaulting to include")
        return Verdict{Worthwhile: true, Reason: "classifier returned empty response; defaulting to include"}, nil
    }

    var parsed struct {
        Worthwhile bool   `json:"worthwhile"`
        Reason     string `json:"reason"`
    }
    if err := json.Unmarshal([]byte(trimmed), &parsed); err != nil {
        c.logger.Error(ctx, "failed to parse commit classifier response", err)
        return Verdict{}, ErrClassify
    }
    if parsed.Reason == "" {
        parsed.Reason = "classifier returned no reason"
    }
    return Verdict{Worthwhile: parsed.Worthwhile, Reason: parsed.Reason}, nil
}
```

**`commitclassifier_test.go` — complete tests:**

```go
package commitclassifier_test

import (
    "context"
    "errors"
    "strings"
    "testing"

    "base-server/internal/ai/commitclassifier"
    "base-server/internal/infra/observability"

    "go.uber.org/mock/gomock"
)

func newLogger() *observability.Logger { return observability.NewLogger("test", "test") }

func TestClassifier_Classify_Worthwhile(t *testing.T) {
    t.Parallel()
    ctrl := gomock.NewController(t)
    mock := NewMockAIClient(ctrl)
    mock.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return(`{"worthwhile":true,"reason":"adds new /pricing page"}`, nil)

    c := commitclassifier.New(mock, newLogger())
    v, err := c.Classify(context.Background(), "feat: add pricing page", "--- diff ---")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if !v.Worthwhile {
        t.Fatal("expected Worthwhile=true")
    }
    if v.Reason != "adds new /pricing page" {
        t.Fatalf("unexpected reason: %q", v.Reason)
    }
}

func TestClassifier_Classify_NotWorthwhile(t *testing.T) {
    t.Parallel()
    ctrl := gomock.NewController(t)
    mock := NewMockAIClient(ctrl)
    mock.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return(`{"worthwhile":false,"reason":"test-only change"}`, nil)

    c := commitclassifier.New(mock, newLogger())
    v, err := c.Classify(context.Background(), "test: add unit tests", "--- diff ---")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if v.Worthwhile {
        t.Fatal("expected Worthwhile=false")
    }
}

func TestClassifier_Classify_EmptyResponse_FailOpen(t *testing.T) {
    t.Parallel()
    ctrl := gomock.NewController(t)
    mock := NewMockAIClient(ctrl)
    mock.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return("", nil)

    c := commitclassifier.New(mock, newLogger())
    v, err := c.Classify(context.Background(), "feat: something", "diff")
    if err != nil {
        t.Fatalf("expected nil error on empty response fail-open, got %v", err)
    }
    if !v.Worthwhile {
        t.Fatal("expected fail-open Worthwhile=true on empty response")
    }
}

func TestClassifier_Classify_AIError_ReturnsErrClassify(t *testing.T) {
    t.Parallel()
    ctrl := gomock.NewController(t)
    mock := NewMockAIClient(ctrl)
    mock.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return("", errors.New("provider error"))

    c := commitclassifier.New(mock, newLogger())
    _, err := c.Classify(context.Background(), "feat: something", "diff")
    if !errors.Is(err, commitclassifier.ErrClassify) {
        t.Fatalf("expected ErrClassify, got %v", err)
    }
}

func TestClassifier_Classify_DiffTruncatedAt40k(t *testing.T) {
    t.Parallel()
    ctrl := gomock.NewController(t)
    mock := NewMockAIClient(ctrl)

    var captured string
    mock.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        DoAndReturn(func(_ context.Context, _ string, msgs []aiclient.Message, _ int) (string, error) {
            captured = msgs[0].Content
            return `{"worthwhile":true,"reason":"ok"}`, nil
        })

    longDiff := strings.Repeat("x", 50_000)
    c := commitclassifier.New(mock, newLogger())
    _, _ = c.Classify(context.Background(), "feat: x", longDiff)

    if !strings.Contains(captured, "… [truncated]") {
        t.Fatal("expected truncation marker in AI message")
    }
}
```

**Commit message:** `feat(ai/commitclassifier): add commit classifier package`

---

### B4: New package — `internal/ai/mediaplanner`

**Files to create:**
- `base-server/internal/ai/mediaplanner/mediaplanner.go`
- `base-server/internal/ai/mediaplanner/mediaplanner_test.go`

**`mediaplanner.go` — complete implementation:**

This is the **text-only** replacement for `SelectMediaAndMode`. It consumes `[]mediadescriber.Description` instead of raw bytes. `DecideMode` is not ported — that path no longer exists.

```go
// Package mediaplanner decides which media to keep and whether the post should
// be a single post or a thread. It is text-only: it reads descriptions produced
// by mediadescriber rather than the original bytes, so the multimodal pass
// happens once and the planner runs cheaply on text.
package mediaplanner

//go:generate go run go.uber.org/mock/mockgen@latest -source=mediaplanner.go -destination=mocks_test.go -package=mediaplanner

import (
    "context"
    "encoding/json"
    "errors"
    "strings"

    "base-server/internal/ai/mediadescriber"
    "base-server/internal/infra/clients/aiclient"
    "base-server/internal/infra/observability"
)

// AIClient is the subset of aiclient.Client used by this package.
type AIClient interface {
    CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
}

// ErrSelectAndDecide is returned when the AI call or response parse fails.
// Callers should treat this as fail-open.
var ErrSelectAndDecide = errors.New("media/mode selection failed")

// SelectRequest is the input to SelectAndDecide.
type SelectRequest struct {
    // CommitMessage is the raw commit message, used by the planner as context
    // for deciding which media is topically relevant.
    CommitMessage string
    // Descriptions is the set of candidate descriptions produced by mediadescriber.
    // Items with Usable=false are presented to the model but flagged so it can
    // drop them.
    Descriptions []mediadescriber.Description
}

// SelectDecision is the planner's verdict.
type SelectDecision struct {
    // KeepIndexes are the 1-based indexes into SelectRequest.Descriptions to keep.
    // Empty means no media should be attached.
    KeepIndexes []int
    // Mode is "single" or "thread".
    Mode string
    // ThreadParts is 2–3 when Mode=="thread"; 0 when Mode=="single".
    ThreadParts int
    // Reason is a short explanation for audit logging.
    Reason string
}

const systemPrompt = `You are the visual + editorial director for a solo founder's social posts. You have received text descriptions of captured media (images and/or video) and must decide:

1. Which media items are worth keeping for the post.
2. Whether the post should be a single post or a thread.

You will receive:
- A commit message describing the code change.
- A list of described media items, each with an index, kind (image/video), and a text description. Items marked "UNUSABLE" should be dropped.

Return raw JSON only (no markdown fences, no commentary):
{
  "keep_indexes": [1, 2],
  "mode": "single"|"thread",
  "thread_parts": 0,
  "reason": "one short sentence"
}

Media rules (keep at most one video + at most one image):
- The final post carries at most one video and at most one image. keep_indexes MUST contain at most one video index and at most one image index (total ≤ 2).
- For the video: if it exists and is described as actually showing the change in action, keep it. If the description says it is broken/blank/stuck, drop it.
- For the image: pick the single screenshot most clearly showing the change from the commit message. If the video already demonstrates the change end-to-end and no screenshot adds new information, drop images entirely. Never keep more than one image.
- If neither video nor any image adds real value, keep_indexes=[] is valid. Better no media than bad media.

Mode rules:
- "single" when the change is small, or the commit doesn't carry enough narrative for multiple beats.
- "thread" when there is enough to say across multiple posts AND enough media or narrative to pace it.
- When mode="thread", thread_parts is 2–3. Do not exceed 3. When mode="single", thread_parts MUST be 0.

General:
- keep_indexes are 1-based from the list provided. Ascending, no duplicates.
- Keep reason concrete.`

// Planner selects media and decides post mode based on text descriptions.
type Planner struct {
    aiClient AIClient
    logger   *observability.Logger
}

// New creates a Planner.
func New(aiClient AIClient, logger *observability.Logger) *Planner {
    return &Planner{aiClient: aiClient, logger: logger}
}

// SelectAndDecide sends text descriptions to the AI and returns a verdict on
// which media to keep and whether to write a single post or a thread.
func (p *Planner) SelectAndDecide(ctx context.Context, req SelectRequest) (SelectDecision, error) {
    ctx = observability.WithFields(ctx,
        observability.Field{Key: "operation", Value: "select_and_decide"},
        observability.Field{Key: "description_count", Value: len(req.Descriptions)},
    )

    userMsg := buildUserMessage(req)

    raw, err := p.aiClient.CreateMessage(ctx, systemPrompt, []aiclient.Message{
        {Role: "user", Content: userMsg},
    }, 1024)
    if err != nil {
        p.logger.Error(ctx, "failed to select media and mode via ai", err)
        return SelectDecision{}, ErrSelectAndDecide
    }

    var parsed struct {
        KeepIndexes []int  `json:"keep_indexes"`
        Mode        string `json:"mode"`
        ThreadParts int    `json:"thread_parts"`
        Reason      string `json:"reason"`
    }
    if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &parsed); err != nil {
        p.logger.Error(ctx, "failed to parse media/mode selection response", err)
        return SelectDecision{}, ErrSelectAndDecide
    }

    decision := SelectDecision{
        Mode:   strings.ToLower(strings.TrimSpace(parsed.Mode)),
        Reason: strings.TrimSpace(parsed.Reason),
    }
    if decision.Mode != "thread" {
        decision.Mode = "single"
        decision.ThreadParts = 0
    } else {
        tp := parsed.ThreadParts
        if tp < 2 {
            tp = 2
        }
        if tp > 3 {
            tp = 3
        }
        decision.ThreadParts = tp
    }

    // Validate and deduplicate keep_indexes.
    seen := make(map[int]struct{})
    cleaned := make([]int, 0, len(parsed.KeepIndexes))
    for _, idx := range parsed.KeepIndexes {
        if idx < 1 || idx > len(req.Descriptions) {
            continue
        }
        if _, ok := seen[idx]; ok {
            continue
        }
        seen[idx] = struct{}{}
        cleaned = append(cleaned, idx)
    }
    // Sort ascending (insertion sort — len is always small).
    for i := 1; i < len(cleaned); i++ {
        for j := i; j > 0 && cleaned[j-1] > cleaned[j]; j-- {
            cleaned[j-1], cleaned[j] = cleaned[j], cleaned[j-1]
        }
    }
    decision.KeepIndexes = cleaned

    return decision, nil
}

func buildUserMessage(req SelectRequest) string {
    var sb strings.Builder
    sb.WriteString("Commit message:\n")
    sb.WriteString(strings.TrimSpace(req.CommitMessage))
    sb.WriteString("\n\nMedia descriptions:\n")
    for _, d := range req.Descriptions {
        if !d.Usable {
            sb.WriteString("- Index ")
            writeInt(&sb, d.Index)
            sb.WriteString(" (")
            sb.WriteString(string(d.Kind))
            sb.WriteString("): UNUSABLE — ")
            sb.WriteString(d.Issue)
            sb.WriteString("\n")
        } else {
            sb.WriteString("- Index ")
            writeInt(&sb, d.Index)
            sb.WriteString(" (")
            sb.WriteString(string(d.Kind))
            sb.WriteString("): ")
            sb.WriteString(d.Description)
            sb.WriteString("\n")
        }
    }
    return sb.String()
}

func writeInt(sb *strings.Builder, n int) {
    sb.WriteString(strings.TrimSpace(string(rune('0' + n)))) // works for 1–9; real impl uses fmt or strconv
}
```

Note for the implementing agent: replace the `writeInt` helper with `fmt.Fprintf(&sb, "%d", d.Index)` — the helper above is illustrative. Use `fmt` or `strconv` directly.

**`mediaplanner_test.go` — complete tests:**

```go
package mediaplanner_test

import (
    "context"
    "errors"
    "testing"

    "base-server/internal/ai/mediadescriber"
    "base-server/internal/ai/mediaplanner"
    "base-server/internal/infra/observability"

    "go.uber.org/mock/gomock"
)

func newLogger() *observability.Logger { return observability.NewLogger("test", "test") }

func TestPlanner_SelectAndDecide_SingleWithMedia(t *testing.T) {
    t.Parallel()
    ctrl := gomock.NewController(t)
    mock := NewMockAIClient(ctrl)
    mock.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return(`{"keep_indexes":[1],"mode":"single","thread_parts":0,"reason":"video shows the change"}`, nil)

    p := mediaplanner.New(mock, newLogger())
    req := mediaplanner.SelectRequest{
        CommitMessage: "feat: add new editor",
        Descriptions: []mediadescriber.Description{
            {Index: 1, Kind: mediadescriber.KindVideo, Usable: true, Description: "A video of the new editor"},
            {Index: 2, Kind: mediadescriber.KindImage, Usable: true, Description: "A screenshot"},
        },
    }
    d, err := p.SelectAndDecide(context.Background(), req)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if d.Mode != "single" {
        t.Fatalf("expected single, got %q", d.Mode)
    }
    if len(d.KeepIndexes) != 1 || d.KeepIndexes[0] != 1 {
        t.Fatalf("expected [1], got %v", d.KeepIndexes)
    }
}

func TestPlanner_SelectAndDecide_ThreadWithTwoParts(t *testing.T) {
    t.Parallel()
    ctrl := gomock.NewController(t)
    mock := NewMockAIClient(ctrl)
    mock.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return(`{"keep_indexes":[1,2],"mode":"thread","thread_parts":2,"reason":"enough for two parts"}`, nil)

    p := mediaplanner.New(mock, newLogger())
    req := mediaplanner.SelectRequest{
        CommitMessage: "feat: big feature",
        Descriptions: []mediadescriber.Description{
            {Index: 1, Kind: mediadescriber.KindVideo, Usable: true, Description: "video"},
            {Index: 2, Kind: mediadescriber.KindImage, Usable: true, Description: "image"},
        },
    }
    d, err := p.SelectAndDecide(context.Background(), req)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if d.Mode != "thread" {
        t.Fatalf("expected thread, got %q", d.Mode)
    }
    if d.ThreadParts != 2 {
        t.Fatalf("expected 2 parts, got %d", d.ThreadParts)
    }
}

func TestPlanner_SelectAndDecide_ThreadPartsClampedTo3(t *testing.T) {
    t.Parallel()
    ctrl := gomock.NewController(t)
    mock := NewMockAIClient(ctrl)
    mock.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return(`{"keep_indexes":[],"mode":"thread","thread_parts":10,"reason":"too many"}`, nil)

    p := mediaplanner.New(mock, newLogger())
    d, err := p.SelectAndDecide(context.Background(), mediaplanner.SelectRequest{CommitMessage: "x"})
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if d.ThreadParts != 3 {
        t.Fatalf("expected clamped to 3, got %d", d.ThreadParts)
    }
}

func TestPlanner_SelectAndDecide_InvalidIndexesDropped(t *testing.T) {
    t.Parallel()
    ctrl := gomock.NewController(t)
    mock := NewMockAIClient(ctrl)
    mock.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return(`{"keep_indexes":[0,5,999],"mode":"single","thread_parts":0,"reason":"x"}`, nil)

    p := mediaplanner.New(mock, newLogger())
    req := mediaplanner.SelectRequest{
        CommitMessage: "x",
        Descriptions:  []mediadescriber.Description{{Index: 1, Usable: true}},
    }
    d, err := p.SelectAndDecide(context.Background(), req)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if len(d.KeepIndexes) != 0 {
        t.Fatalf("expected no valid indexes, got %v", d.KeepIndexes)
    }
}

func TestPlanner_SelectAndDecide_AIError(t *testing.T) {
    t.Parallel()
    ctrl := gomock.NewController(t)
    mock := NewMockAIClient(ctrl)
    mock.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
        Return("", errors.New("timeout"))

    p := mediaplanner.New(mock, newLogger())
    _, err := p.SelectAndDecide(context.Background(), mediaplanner.SelectRequest{CommitMessage: "x"})
    if !errors.Is(err, mediaplanner.ErrSelectAndDecide) {
        t.Fatalf("expected ErrSelectAndDecide, got %v", err)
    }
}
```

**Commit message:** `feat(ai/mediaplanner): add text-only media/mode planner`

---

### B5: New package — `internal/ai/socialposts`

**Files to create:**
- `base-server/internal/ai/socialposts/socialposts.go`
- `base-server/internal/ai/socialposts/events.go`
- `base-server/internal/ai/socialposts/prompts/single.go`
- `base-server/internal/ai/socialposts/prompts/thread.go`
- `base-server/internal/ai/socialposts/socialposts_test.go`
- `base-server/internal/ai/socialposts/stream_test.go`

**Depends on:** B1 (platforms), B2 (mediadescriber.Description)

#### `events.go`

```go
package socialposts

// Event is the streaming event sum type. Use a type switch.
type Event interface{ isEvent() }

// PhaseEvent signals entry into a named generation phase.
// Platform is empty for global phases (describing, generating base).
type PhaseEvent struct{ Phase, Platform string }

// ChunkEvent carries a streamed AI token.
// Platform is empty for base-content tokens.
type ChunkEvent struct{ Platform, Chunk string }

// BaseDoneEvent signals completion of base content generation.
type BaseDoneEvent struct{ Content string }

// PlatformDoneEvent signals completion of one platform's output.
type PlatformDoneEvent struct {
    Platform string
    Result   PlatformResult
}

// ErrorEvent is the terminal error event. After this event the channel is closed.
type ErrorEvent struct{ Err error }

func (PhaseEvent)        isEvent() {}
func (ChunkEvent)        isEvent() {}
func (BaseDoneEvent)     isEvent() {}
func (PlatformDoneEvent) isEvent() {}
func (ErrorEvent)        isEvent() {}
```

#### `socialposts.go`

```go
// Package socialposts generates single posts and thread sequences for
// multiple social platforms, with optional streaming via a channel event sum type.
package socialposts

//go:generate go run go.uber.org/mock/mockgen@latest -source=socialposts.go -destination=mocks_test.go -package=socialposts

import (
    "context"
    "errors"
    "fmt"
    "regexp"
    "strconv"
    "strings"

    "base-server/internal/ai/mediadescriber"
    "base-server/internal/ai/platforms"
    "base-server/internal/ai/socialposts/prompts"
    "base-server/internal/infra/clients/aiclient"
    "base-server/internal/infra/observability"

    "golang.org/x/sync/errgroup"
)

// AIClient is the subset of aiclient.Client used by this package.
type AIClient interface {
    CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
    StreamMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error
}

var (
    ErrGenerate      = errors.New("socialposts: generation failed")
    ErrInvalidMode   = errors.New("socialposts: mode must be 'single', 'thread', or 'text'")
    ErrNoPlatforms   = errors.New("socialposts: at least one platform is required")
)

// Mode describes the post layout.
type Mode string

const (
    ModeSingle Mode = "single"
    ModeThread Mode = "thread"
    ModeText   Mode = "text" // alias for single; treated identically
)

// VoiceContext holds optional voice profile fields for prompt injection.
// Mirrors prompts.VoiceContext; declared here so callers don't import
// the internal prompts package directly.
type VoiceContext struct {
    Tone               string   `json:"tone,omitempty"`
    Style              string   `json:"style,omitempty"`
    Industry           string   `json:"industry,omitempty"`
    TargetAudience     string   `json:"target_audience,omitempty"`
    CustomInstructions string   `json:"custom_instructions,omitempty"`
    ExamplePosts       []string `json:"example_posts,omitempty"`
}

// Request is the input to Generate and GenerateStream.
type Request struct {
    Prompt      string
    BaseContent string   // optional; when empty, generator produces base content first
    Platforms   []string // e.g. ["x", "linkedin"]
    Mode        Mode     // required; caller decides — handler validates this
    ThreadParts int      // required when Mode=="thread" (2–3); 0 = use platform default
    Media       []mediadescriber.Description
    Voice       *VoiceContext
}

// Segment is a thread-segment sum type.
type Segment interface{ isSegment() }

// TextSegment is a thread part with no media attachment.
type TextSegment struct{ Content string }

// MediaSegment is a thread part with a media attachment.
// ImageIndex is 1-based into Request.Media.
type MediaSegment struct {
    Content    string
    ImageIndex int
}

func (TextSegment)  isSegment() {}
func (MediaSegment) isSegment() {}

// PlatformResult is the per-platform generation sum type.
type PlatformResult interface {
    Platform() string
    ModeKind() Mode
}

// SinglePost is the result for a platform in single/text mode.
type SinglePost struct {
    PlatformName string
    Content      string
}

// Thread is the result for a platform in thread mode.
type Thread struct {
    PlatformName string
    Segments     []Segment // always ≥ 2
}

func (s SinglePost) Platform() string { return s.PlatformName }
func (s SinglePost) ModeKind() Mode   { return ModeSingle }
func (t Thread)     Platform() string { return t.PlatformName }
func (t Thread)     ModeKind() Mode   { return ModeThread }

// Result is the non-streaming output of Generate.
type Result struct {
    BaseContent string
    Platforms   map[string]PlatformResult
}

var imageMarkerRegex = regexp.MustCompile(`\[IMAGE:(\d+)\]`)

// Generator creates social posts for multiple platforms.
type Generator struct {
    aiClient AIClient
    logger   *observability.Logger
}

// New creates a Generator.
func New(aiClient AIClient, logger *observability.Logger) *Generator {
    return &Generator{aiClient: aiClient, logger: logger}
}

// Generate produces posts for all platforms synchronously.
func (g *Generator) Generate(ctx context.Context, req Request) (Result, error) {
    if err := validateRequest(req); err != nil {
        return Result{}, err
    }
    ctx = observability.WithFields(ctx,
        observability.Field{Key: "operation", Value: "socialposts_generate"},
        observability.Field{Key: "platform_count", Value: len(req.Platforms)},
        observability.Field{Key: "mode", Value: string(req.Mode)},
    )

    baseContent := strings.TrimSpace(req.BaseContent)
    if baseContent == "" {
        sysPrompt := prompts.SystemGenerate(req.Platforms, toPromptsVoice(req.Voice))
        userMsg := buildUserPrompt(req.Prompt, req.Media)
        raw, err := g.aiClient.CreateMessage(ctx, sysPrompt, []aiclient.Message{{Role: "user", Content: userMsg}}, 0)
        if err != nil {
            g.logger.Error(ctx, "failed to generate base content", err)
            return Result{}, ErrGenerate
        }
        baseContent = strings.TrimSpace(raw)
    }

    platformResults := make(map[string]PlatformResult, len(req.Platforms))
    var mu errgroup.Group

    resultCh := make(chan struct {
        platform string
        result   PlatformResult
    }, len(req.Platforms))

    for _, platform := range req.Platforms {
        eg, egCtx := errgroup.WithContext(ctx)
        eg.Go(func() error {
            r, err := g.generatePlatform(egCtx, platform, baseContent, req)
            if err != nil {
                return err
            }
            resultCh <- struct {
                platform string
                result   PlatformResult
            }{platform, r}
            return nil
        })
        mu.Go(func() error { return eg.Wait() })
    }

    if err := mu.Wait(); err != nil {
        close(resultCh)
        return Result{}, ErrGenerate
    }
    close(resultCh)

    for entry := range resultCh {
        platformResults[entry.platform] = entry.result
    }
    return Result{BaseContent: baseContent, Platforms: platformResults}, nil
}

// GenerateStream produces posts via a channel of typed events.
// Setup failures (invalid mode, no platforms) are returned synchronously.
// Runtime failures are sent as a terminal ErrorEvent before channel close.
func (g *Generator) GenerateStream(ctx context.Context, req Request) (<-chan Event, error) {
    if err := validateRequest(req); err != nil {
        return nil, err
    }

    bufSize := len(req.Platforms) * 4
    if bufSize < 8 {
        bufSize = 8
    }
    ch := make(chan Event, bufSize)

    go func() {
        defer close(ch)
        g.runStream(ctx, req, ch)
    }()

    return ch, nil
}

func (g *Generator) runStream(ctx context.Context, req Request, ch chan<- Event) {
    ctx = observability.WithFields(ctx,
        observability.Field{Key: "operation", Value: "socialposts_generate_stream"},
        observability.Field{Key: "platform_count", Value: len(req.Platforms)},
        observability.Field{Key: "mode", Value: string(req.Mode)},
    )

    sendEvent := func(e Event) bool {
        select {
        case ch <- e:
            return true
        case <-ctx.Done():
            ch <- ErrorEvent{Err: ctx.Err()}
            return false
        }
    }

    // Step 1: base content.
    baseContent := strings.TrimSpace(req.BaseContent)
    if baseContent == "" {
        if !sendEvent(PhaseEvent{Phase: "generating", Platform: ""}) {
            return
        }
        sysPrompt := prompts.SystemGenerate(req.Platforms, toPromptsVoice(req.Voice))
        userMsg := buildUserPrompt(req.Prompt, req.Media)

        var baseBuilder strings.Builder
        err := g.aiClient.StreamMessage(ctx, sysPrompt, []aiclient.Message{{Role: "user", Content: userMsg}}, 0, func(chunk string) {
            baseBuilder.WriteString(chunk)
            ch <- ChunkEvent{Platform: "", Chunk: chunk}
        })
        if err != nil {
            g.logger.Error(ctx, "failed to stream base content", err)
            ch <- ErrorEvent{Err: ErrGenerate}
            return
        }
        baseContent = strings.TrimSpace(baseBuilder.String())
    }

    if !sendEvent(BaseDoneEvent{Content: baseContent}) {
        return
    }

    // Step 2: fan out per-platform.
    eg, egCtx := errgroup.WithContext(ctx)
    for _, platform := range req.Platforms {
        eg.Go(func() error {
            result, err := g.generatePlatform(egCtx, platform, baseContent, req)
            if err != nil {
                return err
            }
            select {
            case ch <- PlatformDoneEvent{Platform: platform, Result: result}:
            case <-egCtx.Done():
                return egCtx.Err()
            }
            return nil
        })
    }

    if err := eg.Wait(); err != nil {
        ch <- ErrorEvent{Err: ErrGenerate}
    }
}

// generatePlatform generates content for one platform (non-streaming).
func (g *Generator) generatePlatform(ctx context.Context, platform, baseContent string, req Request) (PlatformResult, error) {
    cfg := platforms.Get(platform)
    isThread := (req.Mode == ModeThread) && cfg.SupportsThreads

    ctx = observability.WithFields(ctx, observability.Field{Key: "platform", Value: platform})

    var sysPrompt string
    if isThread {
        parts := req.ThreadParts
        if parts == 0 {
            parts = 3
        }
        sysPrompt = prompts.SystemThread(platform, parts, req.Media, toPromptsVoice(req.Voice))
    } else {
        sysPrompt = prompts.SystemAdapt(platform, req.Media, toPromptsVoice(req.Voice))
    }

    raw, err := g.aiClient.CreateMessage(ctx, sysPrompt, []aiclient.Message{{Role: "user", Content: baseContent}}, 0)
    if err != nil {
        g.logger.Error(ctx, "failed to generate content for platform", err)
        return nil, err
    }

    charLimit := cfg.CharLimit
    if isThread && cfg.ThreadCharLimit > 0 {
        charLimit = cfg.ThreadCharLimit
    }

    if isThread {
        rawSegs := parseThreadSegments(raw)
        segs := make([]Segment, 0, len(rawSegs))
        for _, s := range rawSegs {
            content := truncate(s.content, charLimit)
            if s.imageIndex > 0 {
                segs = append(segs, MediaSegment{Content: content, ImageIndex: s.imageIndex})
            } else {
                segs = append(segs, TextSegment{Content: content})
            }
        }
        return Thread{PlatformName: platform, Segments: segs}, nil
    }

    return SinglePost{PlatformName: platform, Content: truncate(strings.TrimSpace(raw), charLimit)}, nil
}

type rawSegment struct {
    content    string
    imageIndex int
}

func parseThreadSegments(raw string) []rawSegment {
    parts := strings.Split(raw, "---THREAD_BREAK---")
    segs := make([]rawSegment, 0, len(parts))
    for _, part := range parts {
        trimmed := strings.TrimSpace(part)
        if trimmed == "" {
            continue
        }
        seg := rawSegment{}
        if m := imageMarkerRegex.FindStringSubmatch(trimmed); len(m) == 2 {
            if idx, err := strconv.Atoi(m[1]); err == nil {
                seg.imageIndex = idx
            }
            trimmed = strings.TrimSpace(imageMarkerRegex.ReplaceAllString(trimmed, ""))
        }
        seg.content = trimmed
        segs = append(segs, seg)
    }
    return segs
}

func truncate(s string, limit int) string {
    runes := []rune(s)
    if len(runes) <= limit {
        return s
    }
    cut := string(runes[:limit])
    if last := strings.LastIndex(cut, " "); last > limit*3/4 {
        cut = cut[:last]
    }
    return strings.TrimSpace(cut)
}

func buildUserPrompt(prompt string, media []mediadescriber.Description) string {
    if len(media) == 0 {
        return prompt
    }
    var sb strings.Builder
    sb.WriteString(prompt)
    sb.WriteString("\n\n## Attached Media\n")
    for _, d := range media {
        if d.Usable {
            fmt.Fprintf(&sb, "- Media %d (%s): %s\n", d.Index, d.Kind, d.Description)
        }
    }
    return sb.String()
}

func validateRequest(req Request) error {
    if len(req.Platforms) == 0 {
        return ErrNoPlatforms
    }
    switch req.Mode {
    case ModeSingle, ModeThread, ModeText:
        // valid
    default:
        return ErrInvalidMode
    }
    return nil
}

func toPromptsVoice(v *VoiceContext) *prompts.VoiceContext {
    if v == nil {
        return nil
    }
    return &prompts.VoiceContext{
        Tone:               v.Tone,
        Style:              v.Style,
        Industry:           v.Industry,
        TargetAudience:     v.TargetAudience,
        CustomInstructions: v.CustomInstructions,
        ExamplePosts:       v.ExamplePosts,
    }
}
```

#### `prompts/single.go`

```go
// Package prompts contains prompt builders for the socialposts package.
package prompts

import (
    "encoding/json"
    "fmt"
    "strings"

    "base-server/internal/ai/mediadescriber"
    "base-server/internal/ai/platforms"
)

// VoiceContext holds optional voice profile fields for prompt injection.
type VoiceContext struct {
    Tone               string   `json:"tone,omitempty"`
    Style              string   `json:"style,omitempty"`
    Industry           string   `json:"industry,omitempty"`
    TargetAudience     string   `json:"target_audience,omitempty"`
    CustomInstructions string   `json:"custom_instructions,omitempty"`
    ExamplePosts       []string `json:"example_posts,omitempty"`
}

// SystemGenerate builds the system prompt for initial base content generation.
func SystemGenerate(platformIDs []string, voice *VoiceContext) string {
    var sb strings.Builder
    sb.WriteString("You are a social media content expert for a solo founder / indie hacker.\n\n")
    sb.WriteString("## Task\n")
    sb.WriteString("The user will give you a blurb — a rough idea, achievement, or topic. ")
    sb.WriteString("Generate ONE piece of base content that captures the core message. ")
    sb.WriteString("This base content will be adapted per-platform in a later step, so write it in a ")
    sb.WriteString("platform-agnostic way but keep it under 3000 characters.\n\n")

    if voice != nil {
        sb.WriteString("## Voice Profile\n")
        b, _ := json.MarshalIndent(voice, "", "  ")
        sb.WriteString(string(b))
        sb.WriteString("\n\n")
    }

    sb.WriteString("## Target Platforms\n")
    configs := make([]platforms.Config, 0, len(platformIDs))
    for _, id := range platformIDs {
        configs = append(configs, platforms.Get(id))
    }
    b, _ := json.MarshalIndent(configs, "", "  ")
    sb.WriteString(string(b))
    sb.WriteString("\n\n")

    sb.WriteString("## Rules\n")
    sb.WriteString("- Open with a very short mention of which product the post is for — one short phrase or clause, not a full sentence. If the product name is not clear from the voice profile, skip this.\n")
    sb.WriteString("- Return ONLY the generated content, no commentary or labels.\n")
    sb.WriteString("- Do not include platform-specific formatting (no hashtags, no @mentions).\n")
    sb.WriteString("- Preserve the user's voice and intent.\n")

    return sb.String()
}

// SystemAdapt builds the system prompt for adapting base content to one platform.
func SystemAdapt(platformID string, media []mediadescriber.Description, voice *VoiceContext) string {
    p := platforms.Get(platformID)
    var sb strings.Builder

    sb.WriteString("You are a social media content specialist.\n\n")
    sb.WriteString("## Task\n")
    fmt.Fprintf(&sb, "Adapt the provided content for **%s**.\n\n", p.Name)

    sb.WriteString("## Platform Constraints\n")
    b, _ := json.MarshalIndent(p, "", "  ")
    sb.WriteString(string(b))
    sb.WriteString("\n\n")

    if voice != nil && voice.Tone != "" {
        sb.WriteString("## Voice\n")
        fmt.Fprintf(&sb, "Tone: %s. Style: %s.\n\n", voice.Tone, voice.Style)
    }

    sb.WriteString("## Rules\n")
    fmt.Fprintf(&sb, "- HARD LIMIT: Maximum %d characters. Aim for %d characters to leave a safety margin.\n", p.CharLimit, int(float64(p.CharLimit)*0.9))
    sb.WriteString("- SINGLE POST mode. All content MUST fit in one post.\n")
    sb.WriteString("- Preserve the product mention at the very start.\n")
    fmt.Fprintf(&sb, "- Tone hint: %s.\n", p.ToneHint)
    sb.WriteString("- Do NOT use hashtags anywhere in the content.\n")
    sb.WriteString("- Do NOT use @mentions.\n")
    sb.WriteString("- Return ONLY the adapted content, no commentary.\n")

    appendMediaSection(&sb, media)
    return sb.String()
}

func appendMediaSection(sb *strings.Builder, media []mediadescriber.Description) {
    usable := make([]mediadescriber.Description, 0, len(media))
    for _, d := range media {
        if d.Usable {
            usable = append(usable, d)
        }
    }
    if len(usable) == 0 {
        return
    }
    sb.WriteString("\n## Attached Media\n")
    sb.WriteString("The user's post includes the following media. Reference every item naturally in the text:\n")
    for _, d := range usable {
        fmt.Fprintf(sb, "- Media %d (%s): %s\n", d.Index, d.Kind, d.Description)
    }
}
```

#### `prompts/thread.go`

```go
package prompts

import (
    "fmt"
    "strings"

    "base-server/internal/ai/mediadescriber"
    "base-server/internal/ai/platforms"
)

// SystemThread builds the system prompt for generating a thread from base content.
func SystemThread(platformID string, maxParts int, media []mediadescriber.Description, voice *VoiceContext) string {
    p := platforms.Get(platformID)
    if maxParts == 0 {
        maxParts = p.MaxThreadParts
    }
    if maxParts == 0 {
        maxParts = 3
    }

    charLimit := p.ThreadCharLimit
    if charLimit == 0 {
        charLimit = p.CharLimit
    }

    var sb strings.Builder
    sb.WriteString("You are a social media thread specialist.\n\n")
    sb.WriteString("## Task\n")
    fmt.Fprintf(&sb, "Break the provided content into a thread for **%s**.\n\n", p.Name)

    sb.WriteString("## Rules\n")
    sb.WriteString("- This is THREAD mode. Each post should cover ONE idea, fact, or point.\n")
    fmt.Fprintf(&sb, "- HARD LIMIT: Each individual post maximum %d characters. Aim for %d.\n", charLimit, int(float64(charLimit)*0.9))
    fmt.Fprintf(&sb, "- EXACT COUNT: Produce EXACTLY %d thread parts.\n", maxParts)
    sb.WriteString("- First post must open with a very short product mention, then the hook.\n")
    sb.WriteString("- Last post should have a clear conclusion or CTA.\n")
    sb.WriteString("- Do NOT number the parts (no 1/, 2/, 3/ prefixes).\n")
    sb.WriteString("- Do NOT use hashtags anywhere in the thread.\n")
    sb.WriteString("- Separate each post with the delimiter: ---THREAD_BREAK---\n")
    sb.WriteString("- Return ONLY the thread posts separated by the delimiter.\n")

    appendThreadMediaSection(&sb, media)
    return sb.String()
}

func appendThreadMediaSection(sb *strings.Builder, media []mediadescriber.Description) {
    usable := make([]mediadescriber.Description, 0, len(media))
    for _, d := range media {
        if d.Usable {
            usable = append(usable, d)
        }
    }
    if len(usable) == 0 {
        return
    }
    sb.WriteString("\n## Media Placement\n")
    if len(usable) == 1 {
        sb.WriteString("The user has attached ONE media item. Place it on the FIRST thread part.\n")
        fmt.Fprintf(sb, "Add `[IMAGE:%d]` on its own line at the end of the first part.\n", usable[0].Index)
    } else {
        sb.WriteString("The user has attached media. You MUST use ALL media items.\n")
        sb.WriteString("To assign media, add `[IMAGE:N]` on its own line at the end of the thread part (where N is the media index).\n")
        sb.WriteString("Each item may be used at most once. Prefer placing the first item on the first part.\n")
    }
    sb.WriteString("Available media:\n")
    for _, d := range usable {
        fmt.Fprintf(sb, "- Media %d (%s): %s\n", d.Index, d.Kind, d.Description)
    }
}
```

**`socialposts_test.go`** — cover `Generate` non-streaming (happy path, platform fan-out, error on AI failure, `ErrNoPlatforms`, `ErrInvalidMode`).

**`stream_test.go`** — cover `GenerateStream`:
- Happy path: drains channel, verifies event sequence (PhaseEvent → ChunkEvents → BaseDoneEvent → PlatformDoneEvents → channel closed).
- Error path: AI streaming error produces terminal `ErrorEvent` followed by channel close.
- Setup failure (invalid mode) returns synchronous error, no channel.
- Context cancel produces `ErrorEvent{ctx.Err()}` and close.

**Commit message:** `feat(ai/socialposts): add post generator with channel streaming`

---

### B6: New package — `internal/ai/blog`

**Files to create:**
- `base-server/internal/ai/blog/blog.go`
- `base-server/internal/ai/blog/blog_test.go`

**Depends on:** B2 (mediadescriber.Description)

**`blog.go` — complete implementation:**

The AI logic is extracted verbatim from `internal/blog/processor/processor.go`. The `blog.Generator` knows nothing about store, presigning, or slug resolution — that all stays in `blog/processor`.

```go
// Package blog generates blog posts using the AI. It is a pure AI library:
// it has no store, no HTTP, and no presigning. The blog/processor wraps it
// and handles persistence.
package blog

//go:generate go run go.uber.org/mock/mockgen@latest -source=blog.go -destination=mocks_test.go -package=blog

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "strings"

    "base-server/internal/ai/mediadescriber"
    "base-server/internal/infra/clients/aiclient"
    "base-server/internal/infra/observability"
)

// AIClient is the subset of aiclient.Client used by this package.
type AIClient interface {
    CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
    StreamJSONMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error
}

var ErrGenerate = errors.New("blog: generation failed")

// MediaItem pairs a Description (for alt text) with a presigned URL to bake
// into the generated markdown. The caller is responsible for presigning.
type MediaItem struct {
    Description mediadescriber.Description
    URL         string // presigned HTTPS URL
}

// Request is the input to Generate and GenerateStream.
type Request struct {
    Prompt   string
    Keywords []string
    Media    []MediaItem
}

// Result is the parsed AI output.
type Result struct {
    Title           string
    Content         string // markdown
    Excerpt         string
    SEOTitle        string
    MetaDescription string
    Keywords        []string
    OGTitle         string
    OGDescription   string
}

// BlogEvent is the streaming event sum type for blog generation.
type BlogEvent interface{ isBlogEvent() }

// BlogChunkEvent carries one streamed AI token.
type BlogChunkEvent struct{ Chunk string }

// BlogDoneEvent signals successful completion with the parsed result.
type BlogDoneEvent struct{ Result Result }

// BlogErrorEvent is the terminal error event.
type BlogErrorEvent struct{ Err error }

func (BlogChunkEvent) isBlogEvent() {}
func (BlogDoneEvent)  isBlogEvent() {}
func (BlogErrorEvent) isBlogEvent() {}

const (
    generateMaxTokens = 8192
    systemPrompt      = `You are a technical blog author. Write engaging, first-person blog posts on the given topic. Cover the subject thoroughly with clear explanations, examples, and insights.

If the user provides attached images, embed EVERY image inline in the "content" markdown using the exact syntax ` + "`![alt](url)`" + ` on its own line, placed at a natural spot in the narrative where it reinforces the surrounding prose. Write descriptive alt text. Do not skip images and do not invent URLs — use only the URLs the user provided.

Respond with a single JSON object and nothing else. The object must have these fields:
- "title": string — blog post title
- "content": string — full blog post in Markdown, starting with a # heading, using H2 sections
- "excerpt": string — one-sentence summary (max 200 chars)
- "seo_title": string — SEO-optimised title (max 60 chars)
- "meta_description": string — meta description (max 160 chars)
- "keywords": array of strings — 3–8 relevant keywords
- "og_title": string — Open Graph title (max 60 chars)
- "og_description": string — Open Graph description (max 200 chars)

No markdown fences, no preamble — raw JSON only.`
)

type jsonResponse struct {
    Title           string   `json:"title"`
    Content         string   `json:"content"`
    Excerpt         string   `json:"excerpt"`
    SEOTitle        string   `json:"seo_title"`
    MetaDescription string   `json:"meta_description"`
    Keywords        []string `json:"keywords"`
    OGTitle         string   `json:"og_title"`
    OGDescription   string   `json:"og_description"`
}

// Generator creates blog posts using the AI.
type Generator struct {
    aiClient AIClient
    logger   *observability.Logger
}

// New creates a Generator.
func New(aiClient AIClient, logger *observability.Logger) *Generator {
    return &Generator{aiClient: aiClient, logger: logger}
}

// Generate creates a blog post synchronously.
func (g *Generator) Generate(ctx context.Context, req Request) (Result, error) {
    ctx = observability.WithFields(ctx, observability.Field{Key: "operation", Value: "blog_generate"})
    userMsg := buildUserMessage(req)
    raw, err := g.aiClient.CreateMessage(ctx, systemPrompt, []aiclient.Message{{Role: "user", Content: userMsg}}, generateMaxTokens)
    if err != nil {
        g.logger.Error(ctx, "AI blog generation failed", err)
        return Result{}, ErrGenerate
    }
    return parseResult(ctx, g.logger, raw)
}

// GenerateStream streams blog generation events. Setup failures return a
// synchronous error. Runtime failures are sent as BlogErrorEvent and the
// channel is closed.
func (g *Generator) GenerateStream(ctx context.Context, req Request) (<-chan BlogEvent, error) {
    ch := make(chan BlogEvent, 32)
    go func() {
        defer close(ch)
        g.runStream(ctx, req, ch)
    }()
    return ch, nil
}

func (g *Generator) runStream(ctx context.Context, req Request, ch chan<- BlogEvent) {
    ctx = observability.WithFields(ctx, observability.Field{Key: "operation", Value: "blog_generate_stream"})
    userMsg := buildUserMessage(req)

    var rawBuilder strings.Builder
    err := g.aiClient.StreamJSONMessage(ctx, systemPrompt, []aiclient.Message{{Role: "user", Content: userMsg}}, generateMaxTokens, func(chunk string) {
        rawBuilder.WriteString(chunk)
        ch <- BlogChunkEvent{Chunk: chunk}
    })
    if err != nil {
        g.logger.Error(ctx, "AI blog stream failed", err)
        ch <- BlogErrorEvent{Err: ErrGenerate}
        return
    }

    result, err := parseResult(ctx, g.logger, rawBuilder.String())
    if err != nil {
        ch <- BlogErrorEvent{Err: err}
        return
    }
    ch <- BlogDoneEvent{Result: result}
}

func parseResult(ctx context.Context, logger *observability.Logger, raw string) (Result, error) {
    var resp jsonResponse
    if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &resp); err != nil {
        logger.Error(ctx, "failed to parse blog generation JSON", err)
        return Result{}, ErrGenerate
    }
    if resp.Title == "" || resp.Content == "" {
        logger.Error(ctx, "blog generation JSON missing title or content", nil)
        return Result{}, ErrGenerate
    }
    return Result{
        Title:           resp.Title,
        Content:         resp.Content,
        Excerpt:         resp.Excerpt,
        SEOTitle:        resp.SEOTitle,
        MetaDescription: resp.MetaDescription,
        Keywords:        resp.Keywords,
        OGTitle:         resp.OGTitle,
        OGDescription:   resp.OGDescription,
    }, nil
}

func buildUserMessage(req Request) string {
    var b strings.Builder
    b.WriteString("Topic / Instructions:\n")
    b.WriteString(req.Prompt)
    if len(req.Keywords) > 0 {
        b.WriteString("\n\nKeywords: ")
        b.WriteString(strings.Join(req.Keywords, ", "))
    }
    if len(req.Media) > 0 {
        b.WriteString("\n\nAttached images (embed EVERY one inline in the content markdown using `![alt](url)`):\n")
        for i, item := range req.Media {
            alt := item.Description.Description
            fmt.Fprintf(&b, "%d. url=%s", i+1, item.URL)
            if alt != "" {
                fmt.Fprintf(&b, " alt=%q", alt)
            }
            b.WriteString("\n")
        }
    }
    return b.String()
}
```

**`blog_test.go`** — cover `Generate` (happy path, AI error → `ErrGenerate`, parse error → `ErrGenerate`, missing title/content → `ErrGenerate`) and `GenerateStream` (happy path event sequence, AI stream error → `BlogErrorEvent` then close).

**Commit message:** `feat(ai/blog): add blog generator package`

---

### B7: Update `internal/github/processor` — use new AI packages

**Files to modify:**
- `base-server/internal/github/processor/draft.go`
- `base-server/internal/github/processor/draft_media.go`
- `base-server/internal/github/processor/draft_assembly.go`
- `base-server/internal/github/processor/processor.go`

**Depends on:** B1, B2, B3, B4, B5

#### Changes to `draft.go`

Replace the `ContentGenerator` interface and `assessMediaAndMode` helper with direct calls to the four AI packages.

The new `DraftGenerator` struct gains four fields in place of the old `content ContentGenerator`:

```go
type DraftGenerator struct {
    store      DraftStore
    classifier *commitclassifier.Classifier  // replaces CommitClassifier interface
    describer  *mediadescriber.Describer
    planner    *mediaplanner.Planner
    generator  *socialposts.Generator
    posts      PostsDrafter
    s3Head     S3HeadClient
    s3Fetch    S3Fetcher
    s3Bucket   string
    logger     *observability.Logger
}
```

The new constructor signature:

```go
func NewDraftGenerator(
    store DraftStore,
    classifier *commitclassifier.Classifier,
    describer *mediadescriber.Describer,
    planner *mediaplanner.Planner,
    generator *socialposts.Generator,
    posts PostsDrafter,
    s3Head S3HeadClient,
    s3Fetch S3Fetcher,
    s3Bucket string,
    logger *observability.Logger,
) DraftGenerator
```

The `GenerateDraftFromCommit` body becomes:

```
1. Load commit, guard checks (unchanged).
2. bucketArtifacts → videoKey, imageKeys (unchanged).
3. Fetch video + image bytes from S3 using existing fetchMedia helper.
4. Build []mediadescriber.Media (video as KindVideo, images as KindImage, 1-based indexes).
5. describer.DescribeBatch(ctx, mediaItems) → []Description.
6. planner.SelectAndDecide(ctx, SelectRequest{CommitMessage, Descriptions}) → SelectDecision.
7. Filter Descriptions → decision.KeepIndexes → selectedDescriptions.
8. generator.Generate(ctx, socialposts.Request{
       Prompt:      buildDraftPrompt(commit),
       Platforms:   targets,
       Mode:        socialposts.Mode(decision.Mode),
       ThreadParts: decision.ThreadParts,
       Media:       selectedDescriptions,
   }) → Result.
9. Persist: assemblePlatformDrafts now takes map[string]socialposts.PlatformResult.
```

The `assessMediaAndMode` helper in `draft_media.go` is removed entirely. The S3 fetch logic is reworked: instead of fetching bytes only for assessment, the bytes are fetched for `mediadescriber.DescribeBatch`, then descriptions are passed to the planner.

The `processor.go` `CommitClassifier` interface is updated to reference the new `commitclassifier.Verdict` type instead of `contentProc.CommitVerdict`:

```go
type CommitClassifier interface {
    Classify(ctx context.Context, message, diff string) (commitclassifier.Verdict, error)
}
```

`SetCommitClassifier` and `GetCommitDiff`-based classification in `webhook.go`/`commits.go` — those callers already use the interface; they only need the import updated from `contentProc.CommitVerdict` to `commitclassifier.Verdict`.

#### Changes to `draft_assembly.go`

`assemblePlatformDrafts` currently takes `map[string]contentProc.ThreadWithMediaPlanResult`. It is rewritten to take `map[string]socialposts.PlatformResult` and use a type switch:

```go
func assemblePlatformDrafts(
    perPlatform map[string]socialposts.PlatformResult,
    targets []string,
    mediaIDs store.UUIDArray,
    // plan is no longer passed — media index assignment comes from socialposts.MediaSegment
) []postsProc.PlatformDraftContent
```

For each platform result:
- `socialposts.SinglePost` → one `ThreadSegment{Content: content}`.
- `socialposts.Thread` → iterate `Segments`; for `MediaSegment`, use `ImageIndex` directly as the media attachment index; for `TextSegment`, `ImageIndex` is nil.

**Commit message:** `refactor(github/processor): use ai/* packages in draft generator`

---

### B8: Update `internal/content/handler` — use new AI packages directly

**File to modify:** `base-server/internal/content/handler/handler.go`

**Depends on:** B2, B5

The handler no longer calls a `ContentProcessor`. It calls `mediadescriber.Describer` and `socialposts.Generator` directly. The existing handler struct becomes:

```go
type Handler struct {
    describer *mediadescriber.Describer
    generator *socialposts.Generator
    store     HandlerStore  // minimal interface for GetVoiceProfileByAccount
    logger    *observability.Logger
}

type HandlerStore interface {
    GetVoiceProfileByAccount(ctx context.Context, accountID uuid.UUID) (store.VoiceProfile, error)
}

func New(
    describer *mediadescriber.Describer,
    generator *socialposts.Generator,
    store HandlerStore,
    logger *observability.Logger,
) Handler
```

#### What is removed from the handler

- `HandleGeneratePost`, `HandleAdaptContent`, `HandleGenerateThread` — these were non-streaming convenience endpoints wrapping methods that no longer exist. They are deleted. (Confirm with the spec: the spec says only `HandleStreamGenerate` and `HandleRegenerateStream` are kept; the handler currently exposes those three extra endpoints. Remove them.)
- `handleStreamGenerateWithMedia` sub-function — the two paths (base64 images vs. media_ids) unify into one via `mediadescriber`.
- `buildMediaPlanFromBucketed`, `FetchAndBucketMedia`, `DecideMode` references.
- The old `ContentProcessor` interface definition.

#### What `HandleStreamGenerate` becomes

```go
func (h *Handler) HandleStreamGenerate(c *gin.Context) {
    // 1. Bind StreamGenerateRequest (same fields minus the old MediaIDs path ambiguity).
    // 2. Validate content_type ∈ {"single","thread","text"} — return 400 if missing or invalid.
    // 3. Fetch media bytes (either base64 from req.Images or S3 via media_ids).
    // 4. SSE headers.
    // 5. Build []mediadescriber.Media and call describer.DescribeBatch — emit PhaseEvent("describing","").
    // 6. Build socialposts.Request, call generator.GenerateStream.
    // 7. for evt := range ch — translate each Event to an SSE message:
    //    PhaseEvent        → event: phase  data: {phase, platform}
    //    ChunkEvent        → event: chunk  data: {platform, text}
    //    BaseDoneEvent     → event: base_done  data: {content}
    //    PlatformDoneEvent → event: platform_done  data: {platform, content, segments?}
    //    ErrorEvent        → event: error  data: "failed to generate content"
}
```

The `content_type` validation block:

```go
switch strings.ToLower(strings.TrimSpace(req.ContentType)) {
case "single", "text", "thread":
    // valid
default:
    apierrors.BadRequest(c, "INVALID_CONTENT_TYPE", "content_type must be one of: single, thread, text")
    return
}
```

The handler translates `socialposts.PlatformDoneEvent.Result` to the wire SSE payload. For a `SinglePost`, emit `platform_done` with `{platform, content}`. For a `Thread`, emit both `platform_done` (joined content) and `thread_done` ({platform, segments}).

`handleError` is simplified — the old processor error vars are gone; the handler only needs to handle `apierrors`-level errors.

**Commit message:** `refactor(content/handler): call mediadescriber and socialposts directly`

---

### B9: Update `internal/blog/processor` — delegate AI to `internal/ai/blog`

**File to modify:** `base-server/internal/blog/processor/processor.go`

**Depends on:** B6

The `BlogProcessor` struct acquires a `blogGen *blog.Generator` field (using the alias `aiblog "base-server/internal/ai/blog"`):

```go
type BlogProcessor struct {
    store     BlogStore
    blogGen   *aiblog.Generator  // new: AI-only dependency
    urlSigner URLSigner
    logger    *observability.Logger
}

func New(store BlogStore, blogGen *aiblog.Generator, logger *observability.Logger) BlogProcessor
```

`GenerateBlogPost` delegates to `blogGen.Generate`:

```go
func (p *BlogProcessor) GenerateBlogPost(ctx context.Context, accountID uuid.UUID, instruction string, keywords []string, mediaIDs []uuid.UUID) (store.BlogPost, error) {
    ctx = observability.WithFields(ctx, ...)

    mediaItems := p.buildMediaItems(ctx, mediaIDs) // presigns URLs, converts to aiblog.MediaItem
    req := aiblog.Request{Prompt: instruction, Keywords: keywords, Media: mediaItems}

    result, err := p.blogGen.Generate(ctx, req)
    if err != nil {
        p.logger.Error(ctx, "blog AI generation failed", err)
        return store.BlogPost{}, ErrBlogGenerationFailed
    }

    // slug resolution + store.CreateBlogPost (unchanged from today)
    ...
}
```

`StreamGenerateBlogPost` delegates to `blogGen.GenerateStream`:

```go
func (p *BlogProcessor) StreamGenerateBlogPost(ctx context.Context, ..., cb BlogStreamCallbacks) error {
    mediaItems := p.buildMediaItems(ctx, mediaIDs)
    ch, _ := p.blogGen.GenerateStream(ctx, aiblog.Request{Prompt: instruction, Keywords: keywords, Media: mediaItems})
    cb.OnPhase("generating")
    for evt := range ch {
        switch e := evt.(type) {
        case aiblog.BlogChunkEvent:
            cb.OnChunk(e.Chunk)
        case aiblog.BlogDoneEvent:
            // persist + cb.OnDone
        case aiblog.BlogErrorEvent:
            cb.OnError(e.Err)
            return e.Err
        }
    }
    return nil
}
```

`buildMediaItems` is the new private helper that replaces `fetchImagesForPrompt`. It calls `p.store.GetMediaByIDs`, presigns `s3://` URLs, and returns `[]aiblog.MediaItem` with `Description` fields populated from the media row's existing alt-text (or empty `Description{Usable: false}` when there is no alt text — the blog AI will still embed the image using the URL).

The `ai aiclient.Client` field is removed from `BlogProcessor`.

**Commit message:** `refactor(blog/processor): delegate AI generation to ai/blog`

---

### B10: Bootstrap wiring

**File to modify:** `base-server/internal/infra/bootstrap/processors.go`

**Depends on:** B1–B9

#### New imports to add

```go
aiblog          "base-server/internal/ai/blog"
commitclassifier "base-server/internal/ai/commitclassifier"
mediadescriber  "base-server/internal/ai/mediadescriber"
mediaplanner    "base-server/internal/ai/mediaplanner"
socialposts     "base-server/internal/ai/socialposts"
```

#### New fields on `procs`

```go
// AI packages (no store, no HTTP — pure AI libraries)
aiDescriber  *mediadescriber.Describer
aiClassifier *commitclassifier.Classifier
aiPlanner    *mediaplanner.Planner
aiPosts      *socialposts.Generator
aiBlog       *aiblog.Generator
```

#### Construction block to add (after Tier service, before Content generation)

```go
// AI packages — constructed once, injected by value into feature processors.
p.aiDescriber  = mediadescriber.New(cl.gemini, logger)
p.aiClassifier = commitclassifier.New(cl.gemini, logger)
p.aiPlanner    = mediaplanner.New(cl.gemini, logger)
p.aiPosts      = socialposts.New(cl.gemini, logger)
p.aiBlog       = aiblog.New(cl.gemini, logger)
```

#### Replace old content processor construction

Remove:
```go
p.content = contentProcessor.New(s, cl.gemini, logger)
if cl.s3Fetch != nil {
    p.content.WithMediaFetcher(s, cl.s3Fetch)
}
```

Remove `contentProcessor` import (`base-server/internal/content/processor`).

#### Update content handler construction

The `Handler` in `content/handler` now takes `(describer, generator, store, logger)`:

```go
contentHandler := contentHandler.New(p.aiDescriber, p.aiPosts, s, logger)
```

(Pass `s` as the `HandlerStore` — `*store.Store` implements `GetVoiceProfileByAccount`.)

#### Update blog processor construction

```go
p.blog = blogProcessor.New(s, p.aiBlog, logger)
p.blog.SetURLSigner(cl.urlSigner)
```

#### Update draft generator construction

```go
p.draftGen = githubProcessor.NewDraftGenerator(
    s,
    p.aiClassifier,
    p.aiDescriber,
    p.aiPlanner,
    p.aiPosts,
    &p.posts,
    cl.s3Head,
    cl.s3Fetch,
    cfg.S3.Bucket,
    logger,
)
```

#### Update `SetCommitClassifier` call

```go
p.github.SetCommitClassifier(p.aiClassifier)
```

The `CommitClassifier` interface on `GitHubProcessor` now expects a `Classify(ctx, message, diff string) (commitclassifier.Verdict, error)` — `*commitclassifier.Classifier` satisfies this directly.

Remove the `p.github.SetCommitClassifier(&p.content)` line.

**Commit message:** `refactor(bootstrap): wire ai/* packages into feature processors`

---

### B11: Delete old packages and update `processor_test.go`

**Depends on:** B7–B10

#### Files to delete in full

```
base-server/internal/content/processor/classify.go
base-server/internal/content/processor/generate.go
base-server/internal/content/processor/media_plan.go
base-server/internal/content/processor/voice.go
base-server/internal/content/processor/processor.go
base-server/internal/content/processor/mocks_test.go
base-server/internal/content/processor/processor_test.go
base-server/internal/content/prompts/platforms.go
base-server/internal/content/prompts/media_plan.go
base-server/internal/content/prompts/prompts.go
base-server/internal/content/prompts/voice.go
```

The two directories `internal/content/processor/` and `internal/content/prompts/` are removed entirely.

#### Tests previously in `processor_test.go` (1336 lines) → where they move

| Old test name | New home |
|---|---|
| `TestContentProcessor_ClassifyCommit` | `internal/ai/commitclassifier/commitclassifier_test.go` (already written in B3) |
| `TestContentProcessor_DescribeImages` | `internal/ai/mediadescriber/mediadescriber_test.go` (already written in B2) |
| `TestContentProcessor_SelectMediaAndMode` | `internal/ai/mediaplanner/mediaplanner_test.go` (already written in B4) |
| `TestContentProcessor_DecideMode` | Deleted — `DecideMode` is removed |
| `TestContentProcessor_FetchAndBucketMedia` | Deleted — `FetchAndBucketMedia` no longer exists as a standalone method |
| `TestContentProcessor_GeneratePost`, `TestContentProcessor_AdaptContent`, `TestContentProcessor_GenerateThread` | Deleted — those methods no longer exist; equivalent coverage lives in `socialposts_test.go` |
| `TestContentProcessor_GenerateWithMediaPlan`, `TestContentProcessor_StreamGenerateAndAdapt` | `internal/ai/socialposts/socialposts_test.go` and `stream_test.go` (written in B5) |
| `TestParseThreadSegmentsWithImages` | `internal/ai/socialposts/socialposts_test.go` — `parseThreadSegments` is now package-internal but tested via Generate output |

#### Run final build check

```bash
cd base-server && go build ./...
cd base-server && go test ./...
```

Both must pass before this task is considered complete.

**Commit message:** `refactor(content): delete processor/ and prompts/ packages`

---

### B12: End-to-end integration test for Path A (draft worker)

**File to create:** `base-server/tests/draft_generation_integration_test.go`

**Depends on:** B7, B10, B11

This test exercises the full Path A wiring:
1. Construct a `DraftGenerator` with mocked AI clients (all four: classifier, describer, planner, generator) and a real in-process store.
2. Seed a `github_commits` row with a `capture_output` containing two keys (one `.mp4`, one `.png`).
3. Use a mock `S3Fetcher` that returns fake bytes.
4. Mock responses:
   - `commitclassifier`: `{worthwhile: true, reason: "demo feature"}`
   - `mediadescriber` (video): `"A demo of the new editor in action."`
   - `mediadescriber` (image): `"A screenshot of the final state."`
   - `mediaplanner`: `{keep_indexes:[1], mode:"thread", thread_parts:2}`
   - `socialposts`: returns a `Result` with base content and `Thread` for "x".
5. Call `GenerateDraftFromCommit(ctx, commitID)`.
6. Assert: no error returned, `posts` row exists, `platform_posts` row exists for "x" with thread segments, `github_commits.post_id` is updated.

**Commit message:** `test(integration): add end-to-end draft generation test`

---

## Complete File Inventory

### New files (create)

```
base-server/internal/ai/platforms/platforms.go
base-server/internal/ai/platforms/platforms_test.go
base-server/internal/ai/mediadescriber/mediadescriber.go
base-server/internal/ai/mediadescriber/mediadescriber_test.go
base-server/internal/ai/mediadescriber/mocks_test.go        ← generated by go:generate
base-server/internal/ai/commitclassifier/commitclassifier.go
base-server/internal/ai/commitclassifier/commitclassifier_test.go
base-server/internal/ai/commitclassifier/mocks_test.go      ← generated
base-server/internal/ai/mediaplanner/mediaplanner.go
base-server/internal/ai/mediaplanner/mediaplanner_test.go
base-server/internal/ai/mediaplanner/mocks_test.go          ← generated
base-server/internal/ai/socialposts/socialposts.go
base-server/internal/ai/socialposts/events.go
base-server/internal/ai/socialposts/prompts/single.go
base-server/internal/ai/socialposts/prompts/thread.go
base-server/internal/ai/socialposts/socialposts_test.go
base-server/internal/ai/socialposts/stream_test.go
base-server/internal/ai/socialposts/mocks_test.go           ← generated
base-server/internal/ai/blog/blog.go
base-server/internal/ai/blog/blog_test.go
base-server/internal/ai/blog/mocks_test.go                  ← generated
base-server/tests/draft_generation_integration_test.go
```

### Files modified

```
base-server/internal/github/processor/draft.go           — new struct fields, new constructor, rewritten GenerateDraftFromCommit
base-server/internal/github/processor/draft_media.go     — remove assessMediaAndMode; add DescribeBatch wiring
base-server/internal/github/processor/draft_assembly.go  — accept socialposts.PlatformResult instead of ThreadWithMediaPlanResult
base-server/internal/github/processor/processor.go       — CommitClassifier interface uses commitclassifier.Verdict
base-server/internal/content/handler/handler.go          — new struct/constructor, unified HandleStreamGenerate, content_type validation
base-server/internal/blog/processor/processor.go         — BlogProcessor.blogGen field, delegate AI calls
base-server/internal/infra/bootstrap/processors.go       — construct ai/* packages, update all wiring
```

### Files deleted

```
base-server/internal/content/processor/classify.go
base-server/internal/content/processor/generate.go
base-server/internal/content/processor/media_plan.go
base-server/internal/content/processor/voice.go
base-server/internal/content/processor/processor.go
base-server/internal/content/processor/mocks_test.go
base-server/internal/content/processor/processor_test.go
base-server/internal/content/prompts/platforms.go
base-server/internal/content/prompts/media_plan.go
base-server/internal/content/prompts/prompts.go
base-server/internal/content/prompts/voice.go
```

---

## Parallelisation Map for `backend-subagent-development`

```
Phase 1 (parallel batch — no deps):
  agent-1: B1 (platforms)
  agent-2: B2 (mediadescriber)
  agent-3: B3 (commitclassifier)
  agent-4: B4 (mediaplanner)

Phase 2 (parallel batch — depend on Phase 1):
  agent-5: B5 (socialposts) — depends on B1, B2
  agent-6: B6 (blog)        — depends on B2

Phase 3 (parallel batch — depend on Phase 2):
  agent-7: B7 (github/processor)  — depends on B1–B5
  agent-8: B8 (content/handler)   — depends on B2, B5
  agent-9: B9 (blog/processor)    — depends on B6

Phase 4 (sequential — all prior phases complete):
  B10 (bootstrap)  — depends on B7–B9
  B11 (delete old) — depends on B10
  B12 (integration test) — depends on B11
```

---

## Decisions (confirmed 2026-04-19)

1. **Legacy non-streaming endpoints — REMOVE.** `HandleGeneratePost`, `HandleAdaptContent`, `HandleGenerateThread` are deleted along with their routes. Only `HandleStreamGenerate` (covering both generate + regenerate) survives.

2. **S3 fetcher on content handler — APPROVED.** Handler constructor gains `s3Fetch S3Fetcher` parameter. Bootstrap (B10) passes `cl.s3Fetch` in.

3. **`commitclassifier.Verdict` mock migration — ACKNOWLEDGED.** Mechanical update; implementer of B7 updates all `CommitClassifier` mocks in `github/processor` tests to use the new type.
