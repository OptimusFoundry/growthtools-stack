//go:build integration

package tests

import (
	"context"
	"strings"

	"base-server/internal/infra/clients/aiclient"
)

// fakeAIClient is a shared test double for every internal/ai/* package.
// Each AI package only uses a subset of aiclient.Client methods; implementing
// all four here means one fakeAIClient can stand in for classifier, describer,
// planner, socialposts.Generator, and blog.Generator.
type fakeAIClient struct {
	CreateMessageFn     func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
	CreateJSONMessageFn func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
	StreamMessageFn     func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error
	StreamJSONMessageFn func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error
}

func (f *fakeAIClient) CreateMessage(ctx context.Context, sys string, msgs []aiclient.Message, max int) (string, error) {
	if f.CreateMessageFn != nil {
		return f.CreateMessageFn(ctx, sys, msgs, max)
	}
	return "", nil
}

func (f *fakeAIClient) CreateJSONMessage(ctx context.Context, sys string, msgs []aiclient.Message, max int) (string, error) {
	if f.CreateJSONMessageFn != nil {
		return f.CreateJSONMessageFn(ctx, sys, msgs, max)
	}
	return "", nil
}

func (f *fakeAIClient) StreamMessage(ctx context.Context, sys string, msgs []aiclient.Message, max int, onChunk func(string)) error {
	if f.StreamMessageFn != nil {
		return f.StreamMessageFn(ctx, sys, msgs, max, onChunk)
	}
	return nil
}

func (f *fakeAIClient) StreamJSONMessage(ctx context.Context, sys string, msgs []aiclient.Message, max int, onChunk func(string)) error {
	if f.StreamJSONMessageFn != nil {
		return f.StreamJSONMessageFn(ctx, sys, msgs, max, onChunk)
	}
	return nil
}

// newFakeAIClient creates a preconfigured fake that dispatches on system prompt keywords.
// It returns appropriate canned responses for classifier, describer, planner, and generator calls.
func newFakeAIClient() *fakeAIClient {
	return &fakeAIClient{
		CreateMessageFn: func(ctx context.Context, sys string, msgs []aiclient.Message, max int) (string, error) {
			// Dispatch by inspecting the system prompt to determine which AI component is calling.

			// commitclassifier: system prompt contains "release-notes editor"
			if strings.Contains(sys, "release-notes editor") {
				return `{"worthwhile": true, "reason": "demo feature"}`, nil
			}

			// mediadescriber: system prompt contains "Describe this" (for image or video)
			if strings.Contains(sys, "Describe this") || strings.Contains(sys, "describe") {
				// Return a reasonable description
				return "A clean demo of the feature in action showing the UI.", nil
			}

			// mediaplanner: system prompt contains "editorial director"
			if strings.Contains(sys, "editorial director") {
				return `{"keep_indexes": [1, 2], "mode": "thread", "thread_parts": 2, "reason": "demo"}`, nil
			}

			// socialposts generator: system prompt contains platform-specific content
			// (this is a fallback for any X/LinkedIn/etc post generation)
			if strings.Contains(sys, "X (formerly Twitter)") ||
				strings.Contains(sys, "LinkedIn") ||
				strings.Contains(sys, "social") ||
				strings.Contains(sys, "Post") {
				return `Generated post content for the feature.`, nil
			}

			// Default fallback
			return `{}`, nil
		},
		CreateJSONMessageFn: func(ctx context.Context, sys string, msgs []aiclient.Message, max int) (string, error) {
			// Same dispatch logic as CreateMessageFn, but for JSON-specific methods.
			// For this test, socialposts may call CreateJSONMessage if it needs structured output.

			if strings.Contains(sys, "release-notes editor") {
				return `{"worthwhile": true, "reason": "demo feature"}`, nil
			}

			if strings.Contains(sys, "editorial director") {
				return `{"keep_indexes": [1, 2], "mode": "thread", "thread_parts": 2, "reason": "demo"}`, nil
			}

			// Default
			return `{}`, nil
		},
	}
}
