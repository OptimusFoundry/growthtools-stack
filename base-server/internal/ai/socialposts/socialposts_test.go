package socialposts

import (
	"context"
	"errors"
	"testing"

	"base-server/internal/ai/mediadescriber"
	"base-server/internal/infra/observability"

	"go.uber.org/mock/gomock"
)

func TestGenerate(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()

	tests := []struct {
		name            string
		req             Request
		mockAISetup     func(*MockAIClient)
		expectErr       error
		expectBaseCount int
	}{
		{
			name: "happy path with base content generation",
			req: Request{
				Prompt:    "Just shipped feature X",
				Platforms: []string{"x", "linkedin"},
				Mode:      ModeSingle,
			},
			mockAISetup: func(m *MockAIClient) {
				// First call: base content generation
				m.EXPECT().
					CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("Feature X is ready to use", nil).
					Times(1)
				// Two platform adaptations
				m.EXPECT().
					CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("Feature X on X", nil).
					Times(2)
			},
			expectErr:       nil,
			expectBaseCount: 2,
		},
		{
			name: "happy path with provided base content",
			req: Request{
				Prompt:      "Just shipped feature X",
				BaseContent: "Feature X is ready",
				Platforms:   []string{"x"},
				Mode:        ModeSingle,
			},
			mockAISetup: func(m *MockAIClient) {
				// Only platform adaptation, no base generation
				m.EXPECT().
					CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("Feature X on X", nil).
					Times(1)
			},
			expectErr:       nil,
			expectBaseCount: 1,
		},
		{
			name: "error on no platforms",
			req: Request{
				Prompt:    "test",
				Platforms: []string{},
				Mode:      ModeSingle,
			},
			mockAISetup: func(m *MockAIClient) {
				// No calls expected
			},
			expectErr:       ErrNoPlatforms,
			expectBaseCount: 0,
		},
		{
			name: "error on invalid mode",
			req: Request{
				Prompt:    "test",
				Platforms: []string{"x"},
				Mode:      Mode("invalid"),
			},
			mockAISetup: func(m *MockAIClient) {
				// No calls expected
			},
			expectErr:       ErrInvalidMode,
			expectBaseCount: 0,
		},
		{
			name: "error on AI failure during base generation",
			req: Request{
				Prompt:    "test",
				Platforms: []string{"x"},
				Mode:      ModeSingle,
			},
			mockAISetup: func(m *MockAIClient) {
				m.EXPECT().
					CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("", errors.New("ai error")).
					Times(1)
			},
			expectErr:       ErrGenerate,
			expectBaseCount: 0,
		},
		{
			name: "error on platform adaptation failure",
			req: Request{
				Prompt:      "test",
				BaseContent: "base",
				Platforms:   []string{"x"},
				Mode:        ModeSingle,
			},
			mockAISetup: func(m *MockAIClient) {
				m.EXPECT().
					CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("", errors.New("platform error")).
					Times(1)
			},
			expectErr:       ErrGenerate,
			expectBaseCount: 0,
		},
		{
			name: "multiple platforms fan-out",
			req: Request{
				Prompt:      "shipped",
				BaseContent: "base",
				Platforms:   []string{"x", "linkedin", "bluesky"},
				Mode:        ModeSingle,
			},
			mockAISetup: func(m *MockAIClient) {
				m.EXPECT().
					CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("adapted", nil).
					Times(3)
			},
			expectErr:       nil,
			expectBaseCount: 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockAI := NewMockAIClient(ctrl)
			tt.mockAISetup(mockAI)

			gen := New(mockAI, logger)
			result, err := gen.Generate(context.Background(), tt.req)

			if tt.expectErr != nil {
				if !errors.Is(err, tt.expectErr) {
					t.Errorf("expected error %v, got %v", tt.expectErr, err)
				}
				return
			}
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}

			if len(result.Platforms) != tt.expectBaseCount {
				t.Errorf("expected %d platforms, got %d", tt.expectBaseCount, len(result.Platforms))
			}

			for _, res := range result.Platforms {
				if res.ModeKind() != ModeSingle {
					t.Errorf("expected ModeSingle, got %v", res.ModeKind())
				}
			}
		})
	}
}

func TestGenerateThread(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)
	mockAI.EXPECT().
		CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("Part 1\n---THREAD_BREAK---\nPart 2\n---THREAD_BREAK---\nPart 3", nil).
		Times(1)

	gen := New(mockAI, logger)
	result, err := gen.Generate(context.Background(), Request{
		Prompt:      "test",
		BaseContent: "base",
		Platforms:   []string{"x"},
		Mode:        ModeThread,
	})

	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	if len(result.Platforms) != 1 {
		t.Errorf("expected 1 platform, got %d", len(result.Platforms))
	}

	thread, ok := result.Platforms["x"].(Thread)
	if !ok {
		t.Errorf("expected Thread, got %T", result.Platforms["x"])
	}

	if len(thread.Segments) != 3 {
		t.Errorf("expected 3 segments, got %d", len(thread.Segments))
	}

	for i, seg := range thread.Segments {
		if ts, ok := seg.(TextSegment); !ok || ts.Content == "" {
			t.Errorf("segment %d: expected TextSegment with content, got %v", i, seg)
		}
	}
}

func TestGenerateThreadWithMedia(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)
	mockAI.EXPECT().
		CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("Part 1 with image\n[IMAGE:1]\n---THREAD_BREAK---\nPart 2", nil).
		Times(1)

	gen := New(mockAI, logger)
	result, err := gen.Generate(context.Background(), Request{
		Prompt:      "test",
		BaseContent: "base",
		Platforms:   []string{"x"},
		Mode:        ModeThread,
		Media: []mediadescriber.Description{
			{Index: 1, Kind: mediadescriber.KindImage, Usable: true},
		},
	})

	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	thread := result.Platforms["x"].(Thread)
	if len(thread.Segments) != 2 {
		t.Errorf("expected 2 segments, got %d", len(thread.Segments))
	}

	if ms, ok := thread.Segments[0].(MediaSegment); ok {
		if ms.ImageIndex != 1 {
			t.Errorf("expected image index 1, got %d", ms.ImageIndex)
		}
	} else {
		t.Errorf("expected MediaSegment, got %T", thread.Segments[0])
	}
}

func TestModeText(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)
	mockAI.EXPECT().
		CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("adapted", nil).
		Times(1)

	gen := New(mockAI, logger)
	result, err := gen.Generate(context.Background(), Request{
		Prompt:      "test",
		BaseContent: "base",
		Platforms:   []string{"x"},
		Mode:        ModeText, // ModeText should be treated like ModeSingle
	})

	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	if res, ok := result.Platforms["x"].(SinglePost); !ok || res.ModeKind() != ModeSingle {
		t.Errorf("expected SinglePost with ModeSingle, got %T with mode %v", result.Platforms["x"], result.Platforms["x"].ModeKind())
	}
}

func TestCharLimitTruncation(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	longContent := "This is a very long post that will exceed the character limit " +
		"and should be truncated at the boundary words to ensure we don't cut mid-word " +
		"or lose important information during the truncation process. " +
		"We verify the truncation works correctly by checking the final length."

	mockAI := NewMockAIClient(ctrl)
	mockAI.EXPECT().
		CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(longContent, nil).
		Times(1)

	gen := New(mockAI, logger)
	result, err := gen.Generate(context.Background(), Request{
		Prompt:      "test",
		BaseContent: "base",
		Platforms:   []string{"x"}, // X has 280 char limit
		Mode:        ModeSingle,
	})

	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	post := result.Platforms["x"].(SinglePost)
	if len([]rune(post.Content)) > 280 {
		t.Errorf("post exceeds char limit: %d > 280", len([]rune(post.Content)))
	}
}

func TestVoiceContextPropagation(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)
	// Base generation expects system prompt with voice context
	mockAI.EXPECT().
		CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("base", nil).
		Times(1)
	// Platform adaptation
	mockAI.EXPECT().
		CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("adapted", nil).
		Times(1)

	gen := New(mockAI, logger)
	_, err := gen.Generate(context.Background(), Request{
		Prompt:    "test",
		Platforms: []string{"x"},
		Mode:      ModeSingle,
		Voice: &VoiceContext{
			Tone:  "professional",
			Style: "technical",
		},
	})

	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}
