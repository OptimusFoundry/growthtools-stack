// Package componentmatcher resolves a free-form showcase brief to the single
// UI component it most plausibly demonstrates, if any.
package componentmatcher

//go:generate go run go.uber.org/mock/mockgen@latest -source=componentmatcher.go -destination=mocks_test.go -package=componentmatcher

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
)

// AIClient is the subset of aiclient.Client used by this package.
type AIClient interface {
	CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
}

const systemPrompt = `You are matching a short showcase brief to the single UI component it most plausibly demonstrates.

You will be given a brief and a list of candidate component names. Respond with exactly one component name, copied verbatim from the list, and nothing else — no punctuation, no explanation.

If no single component in the list can be confidently matched to the brief, respond with the literal token: NONE

Never respond with anything other than one name from the list or the token NONE.`

const maxTokens = 50

// Matcher resolves a brief to a matching component name via AI.
type Matcher struct {
	aiClient AIClient
	logger   *observability.Logger
}

// New creates a Matcher.
func New(aiClient AIClient, logger *observability.Logger) *Matcher {
	return &Matcher{aiClient: aiClient, logger: logger}
}

// Resolve matches a showcase brief against a list of candidate component
// names and returns the single best match, or nil if none can be
// confidently chosen.
func (m *Matcher) Resolve(ctx context.Context, brief string, componentNames []string) (matched *string, err error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "operation", Value: "resolve_component_match"},
	)

	sorted := make([]string, len(componentNames))
	copy(sorted, componentNames)
	sort.Strings(sorted)

	userMessage := fmt.Sprintf("Brief:\n%s\n\nCandidate components:\n%s", strings.TrimSpace(brief), strings.Join(sorted, "\n"))

	raw, err := m.aiClient.CreateMessage(ctx, systemPrompt, []aiclient.Message{
		{Role: "user", Content: userMessage},
	}, maxTokens)
	if err != nil {
		m.logger.Error(ctx, "failed to resolve component match via ai", err)
		return nil, err
	}

	trimmed := strings.TrimSpace(raw)
	if trimmed == "" || trimmed == "NONE" {
		return nil, nil
	}

	for _, name := range componentNames {
		if trimmed == name {
			return &name, nil
		}
	}
	for _, name := range componentNames {
		if strings.EqualFold(trimmed, name) {
			return &name, nil
		}
	}

	return nil, nil
}
