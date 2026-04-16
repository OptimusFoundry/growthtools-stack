package processor

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"

	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestContentProcessor_GeneratePost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("happy path with voice profile", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockContentStore{
			GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
				return store.VoiceProfile{
					ID:        uuid.New(),
					AccountID: aID,
					Tone:      "professional",
					Style:     "concise",
				}, nil
			},
		}
		mockAI := &MockAIClient{
			CreateMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
				return "Generated post content", nil
			},
		}
		proc := New(mockStore, mockAI, logger)

		result, err := proc.GeneratePost(context.Background(), accountID, "Write about Go", []string{"x", "linkedin"})

		require.NoError(t, err)
		assert.Equal(t, "Generated post content", result)
	})

	t.Run("happy path without voice profile uses generic prompt", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockContentStore{
			GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
				return store.VoiceProfile{}, store.ErrNotFound
			},
		}
		mockAI := &MockAIClient{
			CreateMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
				return "Generic generated content", nil
			},
		}
		proc := New(mockStore, mockAI, logger)

		result, err := proc.GeneratePost(context.Background(), accountID, "Write about Go", []string{"x"})

		require.NoError(t, err)
		assert.Equal(t, "Generic generated content", result)
	})

	t.Run("voice profile store error falls back gracefully", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockContentStore{
			GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
				return store.VoiceProfile{}, errors.New("db error")
			},
		}
		mockAI := &MockAIClient{
			CreateMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
				return "Fallback content", nil
			},
		}
		proc := New(mockStore, mockAI, logger)

		result, err := proc.GeneratePost(context.Background(), accountID, "Write about Go", nil)

		require.NoError(t, err)
		assert.Equal(t, "Fallback content", result)
	})

	t.Run("ai error returns ErrGeneratePost", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockContentStore{
			GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
				return store.VoiceProfile{}, store.ErrNotFound
			},
		}
		mockAI := &MockAIClient{
			CreateMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
				return "", errors.New("api error")
			},
		}
		proc := New(mockStore, mockAI, logger)

		_, err := proc.GeneratePost(context.Background(), accountID, "Write about Go", nil)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrGeneratePost)
	})
}

func TestContentProcessor_AdaptContent(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	noVoiceStore := &MockContentStore{
		GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
			return store.VoiceProfile{}, store.ErrNotFound
		},
	}

	t.Run("happy path known platform", func(t *testing.T) {
		t.Parallel()
		mockAI := &MockAIClient{
			CreateMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
				return "Adapted for X", nil
			},
		}
		proc := New(noVoiceStore, mockAI, logger)

		result, err := proc.AdaptContent(context.Background(), accountID, "Long content here", "x")

		require.NoError(t, err)
		assert.Equal(t, "Adapted for X", result)
	})

	t.Run("unknown platform defaults to 280 chars", func(t *testing.T) {
		t.Parallel()
		mockAI := &MockAIClient{
			CreateMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
				return "Adapted content", nil
			},
		}
		proc := New(noVoiceStore, mockAI, logger)

		result, err := proc.AdaptContent(context.Background(), accountID, "Long content", "unknown_platform")

		require.NoError(t, err)
		assert.Equal(t, "Adapted content", result)
	})

	t.Run("ai error returns ErrAdaptContent", func(t *testing.T) {
		t.Parallel()
		mockAI := &MockAIClient{
			CreateMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
				return "", errors.New("api error")
			},
		}
		proc := New(noVoiceStore, mockAI, logger)

		_, err := proc.AdaptContent(context.Background(), accountID, "content", "x")

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrAdaptContent)
	})
}

func TestContentProcessor_StreamGenerateAndAdapt(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	noVoiceStore := &MockContentStore{
		GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
			return store.VoiceProfile{}, store.ErrNotFound
		},
	}

	t.Run("happy path streams base then adapts per platform", func(t *testing.T) {
		t.Parallel()
		var callCount int
		var mu sync.Mutex
		mockAI := &MockAIClient{
			StreamMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
				mu.Lock()
				callCount++
				n := callCount
				mu.Unlock()

				if n == 1 {
					// Base content generation
					onChunk("Base content ")
					onChunk("about Go")
					return nil
				}
				// Per-platform adaptation — use the user message to determine platform
				content := messages[0].Content
				if content == "Base content about Go" {
					onChunk("Adapted for platform")
				}
				return nil
			},
		}
		proc := New(noVoiceStore, mockAI, logger)

		var phases []string
		var baseResult string
		var platformsDone []string
		var platformContents []string
		var chunksMu sync.Mutex

		err := proc.StreamGenerateAndAdapt(context.Background(), accountID, "Write about Go", []string{"x", "linkedin"}, "text", nil, 0, StreamCallbacks{
			OnPhase: func(phase string, platform string) {
				chunksMu.Lock()
				phases = append(phases, phase+":"+platform)
				chunksMu.Unlock()
			},
			OnChunk: func(platform string, chunk string) {},
			OnBaseDone: func(content string) {
				baseResult = content
			},
			OnPlatformDone: func(platform string, content string) {
				chunksMu.Lock()
				platformsDone = append(platformsDone, platform)
				platformContents = append(platformContents, content)
				chunksMu.Unlock()
			},
		})

		require.NoError(t, err)
		assert.Equal(t, "Base content about Go", baseResult)
		assert.Contains(t, phases, "generating:")
		assert.Len(t, platformsDone, 2)
	})

	t.Run("base content streamed via OnChunk with empty platform", func(t *testing.T) {
		t.Parallel()
		callCount := 0
		mockAI := &MockAIClient{
			StreamMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
				callCount++
				if callCount == 1 {
					onChunk("Hello ")
					onChunk("world")
				} else {
					onChunk("Adapted")
				}
				return nil
			},
		}
		proc := New(noVoiceStore, mockAI, logger)

		var chunks []struct {
			platform string
			text     string
		}

		err := proc.StreamGenerateAndAdapt(context.Background(), accountID, "test", []string{"x"}, "text", nil, 0, StreamCallbacks{
			OnPhase: func(string, string) {},
			OnChunk: func(platform string, chunk string) {
				chunks = append(chunks, struct {
					platform string
					text     string
				}{platform, chunk})
			},
			OnBaseDone:     func(string) {},
			OnPlatformDone: func(string, string) {},
		})

		require.NoError(t, err)
		// First two chunks are base content (empty platform)
		assert.Equal(t, "", chunks[0].platform)
		assert.Equal(t, "Hello ", chunks[0].text)
		assert.Equal(t, "", chunks[1].platform)
		assert.Equal(t, "world", chunks[1].text)
	})

	t.Run("thread mode returns thread segments", func(t *testing.T) {
		t.Parallel()
		callCount := 0
		mockAI := &MockAIClient{
			StreamMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
				callCount++
				if callCount == 1 {
					// Base content
					onChunk("Base content for threading")
					return nil
				}
				// Thread generation — return thread segments
				onChunk("1/ First post---THREAD_BREAK---2/ Second post---THREAD_BREAK---3/ Third post")
				return nil
			},
		}
		proc := New(noVoiceStore, mockAI, logger)

		var threadPlatforms []string
		var threadSegments [][]ThreadSegment

		err := proc.StreamGenerateAndAdapt(context.Background(), accountID, "Write about Go", []string{"x"}, "thread", nil, 0, StreamCallbacks{
			OnPhase:        func(string, string) {},
			OnChunk:        func(string, string) {},
			OnBaseDone:     func(string) {},
			OnPlatformDone: func(string, string) {},
			OnThreadDone: func(platform string, segments []ThreadSegment) {
				threadPlatforms = append(threadPlatforms, platform)
				threadSegments = append(threadSegments, segments)
			},
		})

		require.NoError(t, err)
		assert.Equal(t, []string{"x"}, threadPlatforms)
		require.Len(t, threadSegments, 1)
		assert.Len(t, threadSegments[0], 3)
		assert.Equal(t, "1/ First post", threadSegments[0][0].Content)
		assert.Nil(t, threadSegments[0][0].ImageIndex)
	})

	t.Run("base streaming error returns ErrStreamGenerate", func(t *testing.T) {
		t.Parallel()
		mockAI := &MockAIClient{
			StreamMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
				return errors.New("api error")
			},
		}
		proc := New(noVoiceStore, mockAI, logger)

		err := proc.StreamGenerateAndAdapt(context.Background(), accountID, "Write about Go", []string{"x"}, "text", nil, 0, StreamCallbacks{
			OnPhase:        func(string, string) {},
			OnChunk:        func(string, string) {},
			OnBaseDone:     func(string) {},
			OnPlatformDone: func(string, string) {},
		})

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrStreamGenerate)
	})

	t.Run("platform adaptation error returns ErrStreamGenerate", func(t *testing.T) {
		t.Parallel()
		callCount := 0
		mockAI := &MockAIClient{
			StreamMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
				callCount++
				if callCount == 1 {
					onChunk("Base content")
					return nil
				}
				return errors.New("platform api error")
			},
		}
		proc := New(noVoiceStore, mockAI, logger)

		err := proc.StreamGenerateAndAdapt(context.Background(), accountID, "test", []string{"x"}, "text", nil, 0, StreamCallbacks{
			OnPhase:        func(string, string) {},
			OnChunk:        func(string, string) {},
			OnBaseDone:     func(string) {},
			OnPlatformDone: func(string, string) {},
		})

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrStreamGenerate)
	})

	t.Run("truncates content exceeding char limit", func(t *testing.T) {
		t.Parallel()
		longContent := strings.Repeat("a ", 200) // 400 chars
		callCount := 0
		mockAI := &MockAIClient{
			StreamMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
				callCount++
				if callCount == 1 {
					onChunk("Base content")
					return nil
				}
				// Return content that exceeds BlueSky's 300 char limit
				onChunk(longContent)
				return nil
			},
		}
		proc := New(noVoiceStore, mockAI, logger)

		var resultContent string

		err := proc.StreamGenerateAndAdapt(context.Background(), accountID, "test", []string{"bluesky"}, "text", nil, 0, StreamCallbacks{
			OnPhase:    func(string, string) {},
			OnChunk:    func(string, string) {},
			OnBaseDone: func(string) {},
			OnPlatformDone: func(platform string, content string) {
				resultContent = content
			},
		})

		require.NoError(t, err)
		assert.LessOrEqual(t, len([]rune(resultContent)), 300)
	})

	t.Run("with images describes then includes context in prompt", func(t *testing.T) {
		t.Parallel()
		var callCount int
		var mu sync.Mutex
		var capturedPrompt string
		mockAI := &MockAIClient{
			CreateMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
				// DescribeImages call
				assert.NotEmpty(t, messages[0].Images)
				return "A sunset over a city skyline", nil
			},
			StreamMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
				mu.Lock()
				callCount++
				n := callCount
				mu.Unlock()

				if n == 1 {
					capturedPrompt = messages[0].Content
					onChunk("Content about the sunset")
					return nil
				}
				onChunk("Adapted content")
				return nil
			},
		}
		proc := New(noVoiceStore, mockAI, logger)

		var phases []string
		var phasesMu sync.Mutex

		images := []aiclient.ImageData{
			{MIMEType: "image/jpeg", Data: []byte("fake-image-data")},
		}

		err := proc.StreamGenerateAndAdapt(context.Background(), accountID, "Check out this view", []string{"x"}, "text", images, 0, StreamCallbacks{
			OnPhase: func(phase string, platform string) {
				phasesMu.Lock()
				phases = append(phases, phase)
				phasesMu.Unlock()
			},
			OnChunk:        func(string, string) {},
			OnBaseDone:     func(string) {},
			OnPlatformDone: func(string, string) {},
		})

		require.NoError(t, err)
		assert.Contains(t, phases, "describing")
		assert.Contains(t, capturedPrompt, "Image 1:")
		assert.Contains(t, capturedPrompt, "A sunset over a city skyline")
	})
}

func TestContentProcessor_GenerateThread(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	t.Run("happy path splits thread", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockContentStore{}
		mockAI := &MockAIClient{
			CreateMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
				return "1/ First post---THREAD_BREAK---2/ Second post---THREAD_BREAK---3/ Third post", nil
			},
		}
		proc := New(mockStore, mockAI, logger)

		result, err := proc.GenerateThread(context.Background(), "Long content", "x")

		require.NoError(t, err)
		assert.Len(t, result, 3)
		assert.Equal(t, "1/ First post", result[0])
		assert.Equal(t, "2/ Second post", result[1])
		assert.Equal(t, "3/ Third post", result[2])
	})

	t.Run("empty parts are filtered", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockContentStore{}
		mockAI := &MockAIClient{
			CreateMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
				return "1/ Post---THREAD_BREAK------THREAD_BREAK---2/ Post", nil
			},
		}
		proc := New(mockStore, mockAI, logger)

		result, err := proc.GenerateThread(context.Background(), "content", "x")

		require.NoError(t, err)
		assert.Len(t, result, 2)
	})

	t.Run("ai error returns ErrGenerateThread", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockContentStore{}
		mockAI := &MockAIClient{
			CreateMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
				return "", errors.New("api error")
			},
		}
		proc := New(mockStore, mockAI, logger)

		_, err := proc.GenerateThread(context.Background(), "content", "x")

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrGenerateThread)
	})
}

func TestParseThreadSegmentsWithImages(t *testing.T) {
	t.Parallel()

	t.Run("extracts IMAGE markers", func(t *testing.T) {
		t.Parallel()
		raw := "1/ First post\n[IMAGE:1]---THREAD_BREAK---2/ Second post---THREAD_BREAK---3/ Third post\n[IMAGE:2]"
		segments := parseThreadSegmentsWithImages(raw)

		require.Len(t, segments, 3)
		assert.Equal(t, "1/ First post", segments[0].Content)
		require.NotNil(t, segments[0].ImageIndex)
		assert.Equal(t, 1, *segments[0].ImageIndex)

		assert.Equal(t, "2/ Second post", segments[1].Content)
		assert.Nil(t, segments[1].ImageIndex)

		assert.Equal(t, "3/ Third post", segments[2].Content)
		require.NotNil(t, segments[2].ImageIndex)
		assert.Equal(t, 2, *segments[2].ImageIndex)
	})

	t.Run("no markers returns plain segments", func(t *testing.T) {
		t.Parallel()
		raw := "1/ First---THREAD_BREAK---2/ Second"
		segments := parseThreadSegmentsWithImages(raw)

		require.Len(t, segments, 2)
		assert.Equal(t, "1/ First", segments[0].Content)
		assert.Nil(t, segments[0].ImageIndex)
	})

	t.Run("empty parts filtered", func(t *testing.T) {
		t.Parallel()
		raw := "1/ Post---THREAD_BREAK------THREAD_BREAK---2/ Post"
		segments := parseThreadSegmentsWithImages(raw)

		assert.Len(t, segments, 2)
	})
}

func TestDescribeImages(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	noVoiceStore := &MockContentStore{
		GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
			return store.VoiceProfile{}, store.ErrNotFound
		},
	}

	t.Run("describes images in parallel", func(t *testing.T) {
		t.Parallel()
		mockAI := &MockAIClient{
			CreateMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
				assert.Len(t, messages[0].Images, 1)
				return "A beautiful landscape", nil
			},
		}
		proc := New(noVoiceStore, mockAI, logger)

		images := []aiclient.ImageData{
			{MIMEType: "image/jpeg", Data: []byte("img1")},
			{MIMEType: "image/png", Data: []byte("img2")},
		}

		descriptions := proc.DescribeImages(context.Background(), images)

		require.Len(t, descriptions, 2)
		assert.Equal(t, 1, descriptions[0].Index)
		assert.Equal(t, "A beautiful landscape", descriptions[0].Description)
		assert.Equal(t, 2, descriptions[1].Index)
		assert.Equal(t, "A beautiful landscape", descriptions[1].Description)
	})

	t.Run("falls back on AI error", func(t *testing.T) {
		t.Parallel()
		mockAI := &MockAIClient{
			CreateMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
				return "", errors.New("ai error")
			},
		}
		proc := New(noVoiceStore, mockAI, logger)

		images := []aiclient.ImageData{
			{MIMEType: "image/jpeg", Data: []byte("img1")},
		}

		descriptions := proc.DescribeImages(context.Background(), images)

		require.Len(t, descriptions, 1)
		assert.Equal(t, "An attached image", descriptions[0].Description)
	})
}
