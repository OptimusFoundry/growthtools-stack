// Package posttitler generates a short, one-line post title (≤60 chars) from
// post content using a single-shot AI call.
package posttitler

//go:generate go run go.uber.org/mock/mockgen@latest -source=posttitler.go -destination=mocks_test.go -package=posttitler

import (
	"context"
	"fmt"
	"strings"

	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
)

// AIClient is the subset of aiclient.Client used by this package.
type AIClient interface {
	CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
}

const systemPrompt = `You are a social media editor. Given post content, produce a single short title.

Rules:
- Maximum 60 characters
- Single line, no newlines
- Plain text only — no quotes, no punctuation at the end
- Capture the key topic or hook of the post
- Respond with the title only. No preamble, no explanation.`

// Titler generates a short post title from content.
type Titler struct {
	aiClient AIClient
	logger   *observability.Logger
}

// New creates a Titler.
func New(aiClient AIClient, logger *observability.Logger) *Titler {
	return &Titler{aiClient: aiClient, logger: logger}
}

// GenerateTitle calls the AI to produce a ≤60-char title for the given
// content. If the AI call fails or returns an empty string, an error is
// returned and the caller is expected to apply its own fallback.
func (t *Titler) GenerateTitle(ctx context.Context, content string) (string, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "operation", Value: "generate_post_title"},
	)

	messages := []aiclient.Message{
		{Role: "user", Content: content},
	}

	raw, err := t.aiClient.CreateMessage(ctx, systemPrompt, messages, 80)
	if err != nil {
		t.logger.Error(ctx, "failed to generate post title via ai", err)
		return "", err
	}

	title := strings.TrimSpace(raw)
	if title == "" {
		return "", fmt.Errorf("ai returned empty title")
	}

	if len(title) > 60 {
		title = title[:60]
	}

	return title, nil
}
