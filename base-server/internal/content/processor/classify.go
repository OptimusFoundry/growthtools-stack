package processor

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
)

// CommitVerdict is the classifier's call on a single pushed commit.
type CommitVerdict struct {
	// Worthwhile is true when the change is visible to end users — a feature,
	// a fix, a UI tweak, something that would make sense as a social post.
	Worthwhile bool
	// Reason is a short human-readable sentence the classifier writes either
	// way, so skip decisions (and pick decisions) are auditable in logs.
	Reason string
}

// ClassifyCommit decides whether a pushed commit is worth running the
// capture + draft pipeline on. The classifier reads the commit message +
// diff and returns a verdict plus a short reason (logged on both sides of
// the decision so operators can sanity-check what the AI is dropping).
//
// Callers should treat errors as fail-open — if classification fails,
// proceed with the capture rather than silently swallowing user changes.
func (p *ContentProcessor) ClassifyCommit(ctx context.Context, message, diff string) (CommitVerdict, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "operation", Value: "classify_commit"},
	)

	systemPrompt := `You are a release-notes editor for a solo founder's product. You decide whether a single git commit is worth turning into a short social media post — videos captured from the app, a thread announcing the change.

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
	if len(diff) > maxDiffChars {
		diff = diff[:maxDiffChars] + "\n… [truncated]"
	}
	userMessage := fmt.Sprintf("Commit message:\n%s\n\nDiff:\n```\n%s\n```", strings.TrimSpace(message), diff)

	raw, err := p.aiClient.CreateMessage(ctx, systemPrompt, []aiclient.Message{
		{Role: "user", Content: userMessage},
	}, 1024)
	if err != nil {
		p.logger.Error(ctx, "failed to classify commit via ai", err)
		return CommitVerdict{}, ErrClassifyCommit
	}

	// The provider occasionally returns a blank body (rate-limited /
	// truncated / token ran out). Treat that as "no verdict, let the
	// commit through" without an error — the caller already treats
	// errors as fail-open, but returning success here keeps the log at
	// info level instead of firing "commit classifier failed" on what
	// is really a transient provider blip.
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		p.logger.Info(ctx, "commit classifier returned empty response; defaulting to include")
		return CommitVerdict{
			Worthwhile: true,
			Reason:     "classifier returned empty response; defaulting to include",
		}, nil
	}

	var parsed struct {
		Worthwhile bool   `json:"worthwhile"`
		Reason     string `json:"reason"`
	}
	if err := json.Unmarshal([]byte(trimmed), &parsed); err != nil {
		p.logger.Error(ctx, "failed to parse commit classifier response", err)
		return CommitVerdict{}, ErrClassifyCommit
	}
	if parsed.Reason == "" {
		// Don't leave the log line empty — something is better than nothing
		// when an operator later asks "why did we skip commit X".
		parsed.Reason = "classifier returned no reason"
	}
	return CommitVerdict{Worthwhile: parsed.Worthwhile, Reason: parsed.Reason}, nil
}
