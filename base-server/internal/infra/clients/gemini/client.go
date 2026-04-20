package gemini

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"

	"google.golang.org/genai"
)

const defaultModel = "gemini-2.5-flash-lite"

var (
	ErrAPIRequest  = errors.New("gemini api request failed")
	ErrAPIResponse = errors.New("gemini api response error")
	ErrStreaming   = errors.New("gemini streaming error")
)

// Client is a Gemini API client that implements the aiclient.Client interface.
type Client struct {
	client *genai.Client
	logger *observability.Logger
}

// NewClient creates a new Gemini API client.
func NewClient(ctx context.Context, apiKey string, logger *observability.Logger) (*Client, error) {
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, fmt.Errorf("%w: failed to create client: %v", ErrAPIRequest, err)
	}

	return &Client{
		client: client,
		logger: logger,
	}, nil
}

func buildContents(messages []aiclient.Message) []*genai.Content {
	contents := make([]*genai.Content, len(messages))
	for i, m := range messages {
		role := m.Role
		if role == "assistant" {
			role = "model"
		}

		var parts []*genai.Part
		for _, img := range m.Images {
			parts = append(parts, &genai.Part{
				InlineData: &genai.Blob{
					MIMEType: img.MIMEType,
					Data:     img.Data,
				},
			})
		}
		parts = append(parts, &genai.Part{Text: m.Content})

		contents[i] = &genai.Content{
			Role:  role,
			Parts: parts,
		}
	}
	return contents
}

func buildConfig(systemPrompt string, maxTokens int) *genai.GenerateContentConfig {
	config := &genai.GenerateContentConfig{}
	if maxTokens > 0 {
		config.MaxOutputTokens = int32(maxTokens)
	}
	if systemPrompt != "" {
		config.SystemInstruction = &genai.Content{
			Parts: []*genai.Part{{Text: systemPrompt}},
		}
	}
	return config
}

// CreateMessage sends a message to the Gemini API and returns the full response text.
func (c *Client) CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
	return c.generate(ctx, systemPrompt, messages, maxTokens, false)
}

// CreateJSONMessage forces Gemini to return raw JSON via response_mime_type.
// Eliminates the markdown-fence wrapping that breaks json.Unmarshal callers.
func (c *Client) CreateJSONMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
	return c.generate(ctx, systemPrompt, messages, maxTokens, true)
}

func (c *Client) generate(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, jsonMode bool) (string, error) {
	contents := buildContents(messages)
	config := buildConfig(systemPrompt, maxTokens)
	if jsonMode {
		config.ResponseMIMEType = "application/json"
	}

	result, err := c.client.Models.GenerateContent(ctx, defaultModel, contents, config)
	if err != nil {
		c.logger.Error(ctx, "gemini api request failed", err)
		return "", fmt.Errorf("%w: %v", ErrAPIResponse, err)
	}

	text := result.Text()
	if text == "" {
		return "", fmt.Errorf("%w: empty content in response", ErrAPIResponse)
	}

	return strings.TrimSpace(text), nil
}

// StreamMessage sends a message to the Gemini API and streams the response,
// calling onChunk for each text chunk received.
func (c *Client) StreamMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
	return c.stream(ctx, systemPrompt, messages, maxTokens, false, onChunk)
}

// StreamJSONMessage streams a Gemini response with response_mime_type=application/json,
// guaranteeing the concatenated chunks form valid JSON (no markdown fences).
func (c *Client) StreamJSONMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
	return c.stream(ctx, systemPrompt, messages, maxTokens, true, onChunk)
}

func (c *Client) stream(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, jsonMode bool, onChunk func(string)) error {
	contents := buildContents(messages)
	config := buildConfig(systemPrompt, maxTokens)
	if jsonMode {
		config.ResponseMIMEType = "application/json"
	}

	for result, err := range c.client.Models.GenerateContentStream(ctx, defaultModel, contents, config) {
		if err != nil {
			c.logger.Error(ctx, "gemini streaming error", err)
			return fmt.Errorf("%w: %v", ErrStreaming, err)
		}

		text := result.Text()
		if text != "" {
			onChunk(text)
		}
	}

	return nil
}
