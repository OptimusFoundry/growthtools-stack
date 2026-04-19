package socialposts

import (
	"context"
	"errors"
	"testing"

	"base-server/internal/infra/observability"

	"go.uber.org/mock/gomock"
)

func TestGenerateStreamHappyPath(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)

	// Base content streaming
	mockAI.EXPECT().
		StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		DoAndReturn(func(ctx context.Context, sys string, msgs interface{}, maxTokens int, onChunk func(string)) error {
			onChunk("Hello ")
			onChunk("World")
			return nil
		}).
		Times(1)

	// Platform adaptation
	mockAI.EXPECT().
		CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("Hello World on X", nil).
		Times(1)

	gen := New(mockAI, logger)
	ch, err := gen.GenerateStream(context.Background(), Request{
		Prompt:    "test",
		Platforms: []string{"x"},
		Mode:      ModeSingle,
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if ch == nil {
		t.Fatal("expected channel, got nil")
	}

	// Drain and verify event sequence
	phaseCount := 0
	chunkCount := 0
	baseCount := 0
	platformCount := 0
	errCount := 0

	for event := range ch {
		switch e := event.(type) {
		case PhaseEvent:
			if e.Phase != "generating" {
				t.Errorf("expected phase 'generating', got %q", e.Phase)
			}
			if e.Platform != "" {
				t.Errorf("expected empty platform for base phase, got %q", e.Platform)
			}
			phaseCount++
		case ChunkEvent:
			if e.Platform != "" {
				t.Errorf("expected empty platform for base chunks, got %q", e.Platform)
			}
			if e.Chunk == "" {
				t.Error("chunk is empty")
			}
			chunkCount++
		case BaseDoneEvent:
			if e.Content != "Hello World" {
				t.Errorf("expected content 'Hello World', got %q", e.Content)
			}
			baseCount++
		case PlatformDoneEvent:
			if e.Platform != "x" {
				t.Errorf("expected platform 'x', got %q", e.Platform)
			}
			if e.Result == nil {
				t.Error("result is nil")
			}
			platformCount++
		case ErrorEvent:
			if e.Err != nil {
				t.Errorf("unexpected error event: %v", e.Err)
			}
			errCount++
		default:
			t.Errorf("unexpected event type: %T", e)
		}
	}

	if phaseCount < 1 {
		t.Errorf("expected at least 1 phase event, got %d", phaseCount)
	}
	if chunkCount < 2 {
		t.Errorf("expected at least 2 chunk events, got %d", chunkCount)
	}
	if baseCount != 1 {
		t.Errorf("expected 1 base done event, got %d", baseCount)
	}
	if platformCount != 1 {
		t.Errorf("expected 1 platform done event, got %d", platformCount)
	}
	if errCount > 0 {
		t.Errorf("expected 0 error events, got %d", errCount)
	}
}

func TestGenerateStreamWithProvidedBase(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)

	// No streaming call for base (already provided)
	mockAI.EXPECT().
		StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Times(0)

	// Platform adaptation
	mockAI.EXPECT().
		CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("adapted", nil).
		Times(1)

	gen := New(mockAI, logger)
	ch, err := gen.GenerateStream(context.Background(), Request{
		Prompt:      "test",
		BaseContent: "provided",
		Platforms:   []string{"x"},
		Mode:        ModeSingle,
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	baseCount := 0
	platformCount := 0

	for event := range ch {
		switch e := event.(type) {
		case BaseDoneEvent:
			if e.Content != "provided" {
				t.Errorf("expected 'provided', got %q", e.Content)
			}
			baseCount++
		case PlatformDoneEvent:
			platformCount++
		}
	}

	if baseCount != 1 {
		t.Errorf("expected 1 base done, got %d", baseCount)
	}
	if platformCount != 1 {
		t.Errorf("expected 1 platform done, got %d", platformCount)
	}
}

func TestGenerateStreamAIError(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)

	// Stream call fails
	mockAI.EXPECT().
		StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(errors.New("stream failed")).
		Times(1)

	gen := New(mockAI, logger)
	ch, err := gen.GenerateStream(context.Background(), Request{
		Prompt:    "test",
		Platforms: []string{"x"},
		Mode:      ModeSingle,
	})

	if err != nil {
		t.Fatalf("unexpected synchronous error: %v", err)
	}

	// Drain and expect terminal error event
	hasError := false
	isClosed := false

	for event := range ch {
		if _, ok := event.(ErrorEvent); ok {
			hasError = true
		}
	}
	isClosed = true

	if !hasError {
		t.Error("expected error event in stream")
	}
	if !isClosed {
		t.Error("expected channel to close after error event")
	}
}

func TestGenerateStreamSetupError(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)

	gen := New(mockAI, logger)
	ch, err := gen.GenerateStream(context.Background(), Request{
		Prompt:    "test",
		Platforms: []string{},
		Mode:      ModeSingle,
	})

	if err == nil {
		t.Fatal("expected synchronous error for empty platforms")
	}
	if !errors.Is(err, ErrNoPlatforms) {
		t.Errorf("expected ErrNoPlatforms, got %v", err)
	}
	if ch != nil {
		t.Error("expected nil channel on setup error")
	}
}

func TestGenerateStreamContextCancel(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)

	// Stream is interrupted by context cancellation
	mockAI.EXPECT().
		StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		DoAndReturn(func(ctx context.Context, sys string, msgs interface{}, maxTokens int, onChunk func(string)) error {
			return ctx.Err()
		}).
		Times(1)

	gen := New(mockAI, logger)

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	ch, err := gen.GenerateStream(ctx, Request{
		Prompt:    "test",
		Platforms: []string{"x"},
		Mode:      ModeSingle,
	})

	if err != nil {
		t.Fatalf("unexpected synchronous error: %v", err)
	}

	// Drain and expect error event with context error
	hasError := false
	for event := range ch {
		if ee, ok := event.(ErrorEvent); ok && ee.Err != nil {
			hasError = true
		}
	}

	if !hasError {
		t.Error("expected error event from cancelled context")
	}
}

func TestGenerateStreamMultiplePlatforms(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)

	// Base content streaming
	mockAI.EXPECT().
		StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		DoAndReturn(func(ctx context.Context, sys string, msgs interface{}, maxTokens int, onChunk func(string)) error {
			onChunk("base")
			return nil
		}).
		Times(1)

	// Three platform adaptations
	mockAI.EXPECT().
		CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("adapted", nil).
		Times(3)

	gen := New(mockAI, logger)
	ch, err := gen.GenerateStream(context.Background(), Request{
		Prompt:    "test",
		Platforms: []string{"x", "linkedin", "bluesky"},
		Mode:      ModeSingle,
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	baseCount := 0
	platformCount := 0

	for event := range ch {
		switch event.(type) {
		case BaseDoneEvent:
			baseCount++
		case PlatformDoneEvent:
			platformCount++
		}
	}

	if baseCount != 1 {
		t.Errorf("expected 1 base done, got %d", baseCount)
	}
	if platformCount != 3 {
		t.Errorf("expected 3 platform done events, got %d", platformCount)
	}
}

func TestGenerateStreamInvalidMode(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)

	gen := New(mockAI, logger)
	ch, err := gen.GenerateStream(context.Background(), Request{
		Prompt:    "test",
		Platforms: []string{"x"},
		Mode:      Mode("invalid"),
	})

	if err == nil {
		t.Fatal("expected synchronous error for invalid mode")
	}
	if !errors.Is(err, ErrInvalidMode) {
		t.Errorf("expected ErrInvalidMode, got %v", err)
	}
	if ch != nil {
		t.Error("expected nil channel on setup error")
	}
}

func TestGenerateStreamChannelBuffering(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)

	// Generate many chunks to verify buffering
	mockAI.EXPECT().
		StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		DoAndReturn(func(ctx context.Context, sys string, msgs interface{}, maxTokens int, onChunk func(string)) error {
			for i := 0; i < 20; i++ {
				onChunk("chunk")
			}
			return nil
		}).
		Times(1)

	mockAI.EXPECT().
		CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("adapted", nil).
		Times(1)

	gen := New(mockAI, logger)
	ch, err := gen.GenerateStream(context.Background(), Request{
		Prompt:    "test",
		Platforms: []string{"x"},
		Mode:      ModeSingle,
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	eventCount := 0
	for range ch {
		eventCount++
	}

	// Should have received all events without deadlock
	if eventCount == 0 {
		t.Fatal("expected events from channel")
	}
}
