package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

import (
	"context"
	"errors"

	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

var (
	ErrGeneratePost       = errors.New("failed to generate post")
	ErrAdaptContent       = errors.New("failed to adapt content")
	ErrGenerateThread     = errors.New("failed to generate thread")
	ErrVoiceProfile       = errors.New("failed to get voice profile")
	ErrStreamGenerate     = errors.New("failed to stream generate and adapt")
	ErrSelectMediaAndMode = errors.New("failed to select media and mode")
	ErrClassifyCommit     = errors.New("failed to classify commit")
)

// ContentStore defines the database operations required by ContentProcessor.
type ContentStore interface {
	GetVoiceProfileByAccount(ctx context.Context, accountID uuid.UUID) (store.VoiceProfile, error)
}

// AIClient defines the AI operations required by ContentProcessor.
type AIClient interface {
	CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
	StreamMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error
}

// ImageDescription holds the result of describing a single image.
type ImageDescription struct {
	Index       int
	Description string
	MIMEType    string
}

// ThreadSegment represents a single part of a thread with optional image placement.
type ThreadSegment struct {
	Content    string `json:"content"`
	ImageIndex *int   `json:"image_index,omitempty"`
}

// StreamCallbacks holds the callback functions for streaming generation.
// All callbacks must be safe for concurrent use — multiple platform goroutines call them simultaneously.
type StreamCallbacks struct {
	OnPhase        func(phase string, platform string)
	OnChunk        func(platform string, chunk string)
	OnBaseDone     func(content string)
	OnPlatformDone func(platform string, content string)
	OnThreadDone   func(platform string, segments []ThreadSegment)
}

// ContentProcessor handles AI-powered content generation.
type ContentProcessor struct {
	store    ContentStore
	aiClient AIClient
	logger   *observability.Logger
}

// New creates a new ContentProcessor.
func New(store ContentStore, aiClient AIClient, logger *observability.Logger) ContentProcessor {
	return ContentProcessor{
		store:    store,
		aiClient: aiClient,
		logger:   logger,
	}
}
