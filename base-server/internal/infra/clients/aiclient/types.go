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
	StreamMessage(ctx context.Context, systemPrompt string, messages []Message, maxTokens int, onChunk func(string)) error
}
