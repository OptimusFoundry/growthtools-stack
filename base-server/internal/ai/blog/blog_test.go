package blog

import (
	"context"
	"errors"
	"strings"
	"testing"

	"base-server/internal/ai/mediadescriber"
	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"

	"go.uber.org/mock/gomock"
)

func TestGenerate_HappyPath(t *testing.T) {
	t.Parallel()

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)
	logger := observability.NewLogger()
	gen := New(mockAI, logger)

	validJSON := `{
		"title": "Test Blog",
		"content": "# Test Blog\n\nContent here.",
		"excerpt": "Test excerpt",
		"seo_title": "Test SEO",
		"meta_description": "Test meta",
		"keywords": ["test", "blog"],
		"og_title": "Test OG",
		"og_description": "Test OG desc"
	}`

	mockAI.EXPECT().
		CreateMessage(gomock.Any(), systemPrompt, gomock.Any(), generateMaxTokens).
		Return(validJSON, nil)

	req := Request{
		Prompt:   "Write about testing",
		Keywords: []string{"test"},
	}

	result, err := gen.Generate(context.Background(), req)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if result.Title != "Test Blog" {
		t.Errorf("expected title 'Test Blog', got %q", result.Title)
	}
	if result.Content != "# Test Blog\n\nContent here." {
		t.Errorf("unexpected content: %q", result.Content)
	}
	if result.Excerpt != "Test excerpt" {
		t.Errorf("unexpected excerpt: %q", result.Excerpt)
	}
	if len(result.Keywords) != 2 {
		t.Errorf("expected 2 keywords, got %d", len(result.Keywords))
	}
}

func TestCleanKeywords_StripsEmbeddedQuotes(t *testing.T) {
	t.Parallel()

	in := []string{`"API optimization"`, "GoLang", `"backend performance"`, "  DTOs  ", `"web development"`}
	want := []string{"API optimization", "GoLang", "backend performance", "DTOs", "web development"}

	got := cleanKeywords(in)
	if len(got) != len(want) {
		t.Fatalf("expected %d keywords, got %d: %v", len(want), len(got), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("keyword %d: expected %q, got %q", i, want[i], got[i])
		}
	}
}

func TestGenerate_AIError(t *testing.T) {
	t.Parallel()

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)
	logger := observability.NewLogger()
	gen := New(mockAI, logger)

	mockAI.EXPECT().
		CreateMessage(gomock.Any(), systemPrompt, gomock.Any(), generateMaxTokens).
		Return("", errors.New("ai service down"))

	req := Request{Prompt: "Write about testing"}

	result, err := gen.Generate(context.Background(), req)
	if !errors.Is(err, ErrGenerate) {
		t.Errorf("expected ErrGenerate, got %v", err)
	}
	if result.Title != "" {
		t.Errorf("expected empty result on error, got %+v", result)
	}
}

func TestGenerate_ParseError(t *testing.T) {
	t.Parallel()

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)
	logger := observability.NewLogger()
	gen := New(mockAI, logger)

	invalidJSON := `{invalid json}`

	mockAI.EXPECT().
		CreateMessage(gomock.Any(), systemPrompt, gomock.Any(), generateMaxTokens).
		Return(invalidJSON, nil)

	req := Request{Prompt: "Write about testing"}

	result, err := gen.Generate(context.Background(), req)
	if !errors.Is(err, ErrGenerate) {
		t.Errorf("expected ErrGenerate for parse error, got %v", err)
	}
	if result.Title != "" {
		t.Errorf("expected empty result on parse error, got %+v", result)
	}
}

func TestGenerate_MissingTitleOrContent(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		json string
	}{
		{
			name: "missing_title",
			json: `{
				"title": "",
				"content": "# Content here",
				"excerpt": "Test",
				"seo_title": "Test",
				"meta_description": "Test",
				"keywords": [],
				"og_title": "Test",
				"og_description": "Test"
			}`,
		},
		{
			name: "missing_content",
			json: `{
				"title": "Test Blog",
				"content": "",
				"excerpt": "Test",
				"seo_title": "Test",
				"meta_description": "Test",
				"keywords": [],
				"og_title": "Test",
				"og_description": "Test"
			}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockAI := NewMockAIClient(ctrl)
			logger := observability.NewLogger()
			gen := New(mockAI, logger)

			mockAI.EXPECT().
				CreateMessage(gomock.Any(), systemPrompt, gomock.Any(), generateMaxTokens).
				Return(tt.json, nil)

			req := Request{Prompt: "Write about testing"}

			result, err := gen.Generate(context.Background(), req)
			if !errors.Is(err, ErrGenerate) {
				t.Errorf("expected ErrGenerate, got %v", err)
			}
			if result.Title != "" {
				t.Errorf("expected empty result, got %+v", result)
			}
		})
	}
}

func TestGenerateStream_HappyPath(t *testing.T) {
	t.Parallel()

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)
	logger := observability.NewLogger()
	gen := New(mockAI, logger)

	mockAI.EXPECT().
		StreamJSONMessage(gomock.Any(), systemPrompt, gomock.Any(), generateMaxTokens, gomock.Any()).
		DoAndReturn(func(ctx context.Context, sysPrompt string, msgs []aiclient.Message, maxTokens int, onChunk func(string)) error {
			// Simulate streaming chunks
			onChunk(`{"title": "Stream Test", "content": "# Stream Test\n\nContent.", `)
			onChunk(`"excerpt": "Stream excerpt", "seo_title": "Stream SEO", `)
			onChunk(`"meta_description": "Stream meta", "keywords": ["stream"], `)
			onChunk(`"og_title": "Stream OG", "og_description": "Stream OG desc"}`)
			return nil
		})

	req := Request{Prompt: "Write about streaming"}

	ch, err := gen.GenerateStream(context.Background(), req)
	if err != nil {
		t.Fatalf("expected no setup error, got %v", err)
	}
	if ch == nil {
		t.Fatal("expected non-nil channel")
	}

	var chunks []string
	var finalResult *Result
	var finalErr error

	for event := range ch {
		switch e := event.(type) {
		case BlogChunkEvent:
			chunks = append(chunks, e.Chunk)
		case BlogDoneEvent:
			finalResult = &e.Result
		case BlogErrorEvent:
			finalErr = e.Err
		}
	}

	if finalErr != nil {
		t.Errorf("expected no error event, got %v", finalErr)
	}
	if finalResult == nil {
		t.Fatal("expected done event with result")
	}
	if finalResult.Title != "Stream Test" {
		t.Errorf("expected title 'Stream Test', got %q", finalResult.Title)
	}
	if len(chunks) == 0 {
		t.Error("expected at least one chunk event")
	}
}

func TestGenerateStream_AIStreamError(t *testing.T) {
	t.Parallel()

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)
	logger := observability.NewLogger()
	gen := New(mockAI, logger)

	mockAI.EXPECT().
		StreamJSONMessage(gomock.Any(), systemPrompt, gomock.Any(), generateMaxTokens, gomock.Any()).
		Return(errors.New("stream connection lost"))

	req := Request{Prompt: "Write about streaming"}

	ch, err := gen.GenerateStream(context.Background(), req)
	if err != nil {
		t.Fatalf("expected no setup error, got %v", err)
	}

	var gotError *BlogErrorEvent
	for event := range ch {
		if e, ok := event.(BlogErrorEvent); ok {
			gotError = &e
		}
	}

	if gotError == nil {
		t.Fatal("expected BlogErrorEvent, got none")
	}
	if !errors.Is(gotError.Err, ErrGenerate) {
		t.Errorf("expected ErrGenerate in error event, got %v", gotError.Err)
	}
}

func TestGenerateStream_ParseError(t *testing.T) {
	t.Parallel()

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockAI := NewMockAIClient(ctrl)
	logger := observability.NewLogger()
	gen := New(mockAI, logger)

	mockAI.EXPECT().
		StreamJSONMessage(gomock.Any(), systemPrompt, gomock.Any(), generateMaxTokens, gomock.Any()).
		DoAndReturn(func(ctx context.Context, sysPrompt string, msgs []aiclient.Message, maxTokens int, onChunk func(string)) error {
			onChunk(`{invalid json}`)
			return nil
		})

	req := Request{Prompt: "Write about streaming"}

	ch, err := gen.GenerateStream(context.Background(), req)
	if err != nil {
		t.Fatalf("expected no setup error, got %v", err)
	}

	var gotError *BlogErrorEvent
	for event := range ch {
		if e, ok := event.(BlogErrorEvent); ok {
			gotError = &e
		}
	}

	if gotError == nil {
		t.Fatal("expected BlogErrorEvent, got none")
	}
	if !errors.Is(gotError.Err, ErrGenerate) {
		t.Errorf("expected ErrGenerate in error event, got %v", gotError.Err)
	}
}

func TestBuildUserMessage_WithMedia(t *testing.T) {
	t.Parallel()

	req := Request{
		Prompt:   "Write about Go",
		Keywords: []string{"golang", "backend"},
		Media: []MediaItem{
			{
				Description: mediadescriber.Description{
					Description: "A gopher mascot",
					Usable:      true,
				},
				URL: "https://example.com/gopher.png",
			},
			{
				Description: mediadescriber.Description{
					Description: "Code snippet",
					Usable:      true,
				},
				URL: "https://example.com/code.png",
			},
		},
	}

	msg := buildUserMessage(req)

	if !strings.Contains(msg, "Topic / Instructions:") {
		t.Error("expected prompt header in message")
	}
	if !strings.Contains(msg, "Write about Go") {
		t.Error("expected prompt in message")
	}
	if !strings.Contains(msg, "Keywords: golang, backend") {
		t.Error("expected keywords in message")
	}
	if !strings.Contains(msg, "Attached images") {
		t.Error("expected media header in message")
	}
	if !strings.Contains(msg, "https://example.com/gopher.png") {
		t.Error("expected first media URL in message")
	}
	if !strings.Contains(msg, "A gopher mascot") {
		t.Error("expected first media description in message")
	}
	if !strings.Contains(msg, "https://example.com/code.png") {
		t.Error("expected second media URL in message")
	}
	if !strings.Contains(msg, "Code snippet") {
		t.Error("expected second media description in message")
	}
}

func TestBuildUserMessage_NoMedia(t *testing.T) {
	t.Parallel()

	req := Request{
		Prompt:   "Write about testing",
		Keywords: []string{"test"},
		Media:    []MediaItem{},
	}

	msg := buildUserMessage(req)

	if !strings.Contains(msg, "Write about testing") {
		t.Error("expected prompt in message")
	}
	if !strings.Contains(msg, "Keywords: test") {
		t.Error("expected keywords in message")
	}
	if strings.Contains(msg, "Attached images") {
		t.Error("expected no media header for empty media")
	}
}

func TestBuildUserMessage_MediaWithoutDescription(t *testing.T) {
	t.Parallel()

	req := Request{
		Prompt:   "Write about images",
		Keywords: []string{},
		Media: []MediaItem{
			{
				Description: mediadescriber.Description{
					Description: "",
					Usable:      false,
				},
				URL: "https://example.com/img.png",
			},
		},
	}

	msg := buildUserMessage(req)

	if !strings.Contains(msg, "https://example.com/img.png") {
		t.Error("expected media URL in message")
	}
	// Should not have alt= for empty description
	if strings.Contains(msg, `alt=""`) {
		t.Error("expected no alt attribute for empty description")
	}
}
