package aiclient

import "context"

// ImageData holds a single image for multimodal AI requests.
type ImageData struct {
	MIMEType string
	Data     []byte
}

// Message represents a single message in an AI conversation.
type Message struct {
	Role    string
	Content string
	Images  []ImageData // Optional; nil = text-only (backward compatible).
}

// Client defines the interface for AI provider clients.
type Client interface {
	CreateMessage(ctx context.Context, systemPrompt string, messages []Message, maxTokens int) (string, error)
	// CreateJSONMessage is like CreateMessage but instructs the provider to
	// return raw JSON (no markdown fences, no preamble). Use this whenever the
	// caller is going to json.Unmarshal the result.
	CreateJSONMessage(ctx context.Context, systemPrompt string, messages []Message, maxTokens int) (string, error)
	StreamMessage(ctx context.Context, systemPrompt string, messages []Message, maxTokens int, onChunk func(string)) error
	// StreamJSONMessage is like StreamMessage but instructs the provider to
	// return raw JSON. The streamed chunks together form valid JSON (no
	// markdown fences), safe to json.Unmarshal once concatenated.
	StreamJSONMessage(ctx context.Context, systemPrompt string, messages []Message, maxTokens int, onChunk func(string)) error
}
