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
	"fmt"
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
	if err := json.Unmarshal([]byte(extractJSONObject(raw)), &parsed); err != nil {
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
			fmt.Fprintf(&sb, "%d", d.Index)
			sb.WriteString(" (")
			sb.WriteString(string(d.Kind))
			sb.WriteString("): UNUSABLE — ")
			sb.WriteString(d.Issue)
			sb.WriteString("\n")
		} else {
			sb.WriteString("- Index ")
			fmt.Fprintf(&sb, "%d", d.Index)
			sb.WriteString(" (")
			sb.WriteString(string(d.Kind))
			sb.WriteString("): ")
			sb.WriteString(d.Description)
			sb.WriteString("\n")
		}
	}
	return sb.String()
}

// extractJSONObject returns the JSON object substring from raw, tolerating
// markdown code fences, single backticks, or preamble/trailing prose that
// Gemini occasionally emits around the JSON payload.
func extractJSONObject(raw string) string {
	s := stripCodeFence(raw)
	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start == -1 || end == -1 || end < start {
		return s
	}
	return s[start : end+1]
}

// stripCodeFence removes surrounding ```json ... ``` or ``` ... ``` markdown
// fences that some models wrap around JSON responses despite instructions to
// return raw JSON only. If no fence is present, the input is returned trimmed.
func stripCodeFence(raw string) string {
	s := strings.TrimSpace(raw)
	if !strings.HasPrefix(s, "```") {
		return s
	}
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```")
	if idx := strings.LastIndex(s, "```"); idx != -1 {
		s = s[:idx]
	}
	return strings.TrimSpace(s)
}
