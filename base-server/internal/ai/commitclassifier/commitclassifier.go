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
	CreateJSONMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
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

	raw, err := c.aiClient.CreateJSONMessage(ctx, systemPrompt, []aiclient.Message{
		{Role: "user", Content: userMessage},
	}, 600_000)
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
	if err := json.Unmarshal([]byte(extractJSONObject(trimmed)), &parsed); err != nil {
		c.logger.Error(ctx, "failed to parse commit classifier response", err)
		return Verdict{}, ErrClassify
	}
	if parsed.Reason == "" {
		parsed.Reason = "classifier returned no reason"
	}
	return Verdict{Worthwhile: parsed.Worthwhile, Reason: parsed.Reason}, nil
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
