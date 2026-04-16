package processor

import (
	"context"
	"errors"
	"strings"
	"testing"

	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestChatProcessor_StreamConversation_NewConversation(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	convID := uuid.New()

	t.Run("happy path creates new conversation", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockChatStore{
			CreateAIConversationFn: func(ctx context.Context, aID uuid.UUID, title *string) (store.AIConversation, error) {
				return store.AIConversation{ID: convID, AccountID: aID, Title: title}, nil
			},
			CreateAIMessageFn: func(ctx context.Context, conversationID uuid.UUID, role, content string) (store.AIMessage, error) {
				return store.AIMessage{ID: uuid.New(), ConversationID: conversationID, Role: role, Content: content}, nil
			},
			GetAIMessagesByConversationFn: func(ctx context.Context, conversationID uuid.UUID) ([]store.AIMessage, error) {
				return []store.AIMessage{
					{Role: "user", Content: "Hello"},
				}, nil
			},
		}
		mockAI := &MockChatAIClient{
			StreamMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
				onChunk("Hello ")
				onChunk("there!")
				return nil
			},
		}
		proc := New(mockStore, mockAI, logger)

		var chunks []string
		resultID, err := proc.StreamConversation(context.Background(), accountID, nil, "Hello", func(chunk string) {
			chunks = append(chunks, chunk)
		})

		require.NoError(t, err)
		assert.Equal(t, convID, resultID)
		assert.Equal(t, []string{"Hello ", "there!"}, chunks)
	})

	t.Run("create conversation error", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockChatStore{
			CreateAIConversationFn: func(ctx context.Context, aID uuid.UUID, title *string) (store.AIConversation, error) {
				return store.AIConversation{}, errors.New("db error")
			},
		}
		mockAI := &MockChatAIClient{}
		proc := New(mockStore, mockAI, logger)

		_, err := proc.StreamConversation(context.Background(), accountID, nil, "Hello", func(string) {})

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrStreamConversation)
	})
}

func TestChatProcessor_StreamConversation_ExistingConversation(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	convID := uuid.New()

	t.Run("happy path continues existing conversation", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockChatStore{
			GetAIConversationByIDFn: func(ctx context.Context, aID, id uuid.UUID) (store.AIConversation, error) {
				return store.AIConversation{ID: id, AccountID: aID}, nil
			},
			CreateAIMessageFn: func(ctx context.Context, conversationID uuid.UUID, role, content string) (store.AIMessage, error) {
				return store.AIMessage{ID: uuid.New(), ConversationID: conversationID, Role: role, Content: content}, nil
			},
			GetAIMessagesByConversationFn: func(ctx context.Context, conversationID uuid.UUID) ([]store.AIMessage, error) {
				return []store.AIMessage{
					{Role: "user", Content: "previous"},
					{Role: "assistant", Content: "response"},
					{Role: "user", Content: "follow up"},
				}, nil
			},
		}
		mockAI := &MockChatAIClient{
			StreamMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
				onChunk("streamed response")
				return nil
			},
		}
		proc := New(mockStore, mockAI, logger)

		resultID, err := proc.StreamConversation(context.Background(), accountID, &convID, "follow up", func(string) {})

		require.NoError(t, err)
		assert.Equal(t, convID, resultID)
	})

	t.Run("conversation not found", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockChatStore{
			GetAIConversationByIDFn: func(ctx context.Context, aID, id uuid.UUID) (store.AIConversation, error) {
				return store.AIConversation{}, store.ErrNotFound
			},
		}
		mockAI := &MockChatAIClient{}
		proc := New(mockStore, mockAI, logger)

		_, err := proc.StreamConversation(context.Background(), accountID, &convID, "msg", func(string) {})

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrConversationNotFound)
	})

	t.Run("save user message error", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockChatStore{
			GetAIConversationByIDFn: func(ctx context.Context, aID, id uuid.UUID) (store.AIConversation, error) {
				return store.AIConversation{ID: id, AccountID: aID}, nil
			},
			CreateAIMessageFn: func(ctx context.Context, conversationID uuid.UUID, role, content string) (store.AIMessage, error) {
				return store.AIMessage{}, errors.New("db error")
			},
		}
		mockAI := &MockChatAIClient{}
		proc := New(mockStore, mockAI, logger)

		_, err := proc.StreamConversation(context.Background(), accountID, &convID, "msg", func(string) {})

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrSaveMessage)
	})

	t.Run("stream error returns ErrStreamConversation", func(t *testing.T) {
		t.Parallel()
		callCount := 0
		mockStore := &MockChatStore{
			GetAIConversationByIDFn: func(ctx context.Context, aID, id uuid.UUID) (store.AIConversation, error) {
				return store.AIConversation{ID: id, AccountID: aID}, nil
			},
			CreateAIMessageFn: func(ctx context.Context, conversationID uuid.UUID, role, content string) (store.AIMessage, error) {
				callCount++
				return store.AIMessage{ID: uuid.New()}, nil
			},
			GetAIMessagesByConversationFn: func(ctx context.Context, conversationID uuid.UUID) ([]store.AIMessage, error) {
				return []store.AIMessage{{Role: "user", Content: "msg"}}, nil
			},
		}
		mockAI := &MockChatAIClient{
			StreamMessageFn: func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
				return errors.New("streaming failed")
			},
		}
		proc := New(mockStore, mockAI, logger)

		_, err := proc.StreamConversation(context.Background(), accountID, &convID, "msg", func(string) {})

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrStreamConversation)
	})
}

func TestChatProcessor_ListConversations(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockChatStore{
			ListAIConversationsFn: func(ctx context.Context, aID uuid.UUID, limit, offset int) ([]store.AIConversation, error) {
				return []store.AIConversation{{ID: uuid.New()}, {ID: uuid.New()}}, nil
			},
		}
		mockAI := &MockChatAIClient{}
		proc := New(mockStore, mockAI, logger)

		result, err := proc.ListConversations(context.Background(), accountID, 10, 0)

		require.NoError(t, err)
		assert.Len(t, result, 2)
	})

	t.Run("store error returns ErrListConversations", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockChatStore{
			ListAIConversationsFn: func(ctx context.Context, aID uuid.UUID, limit, offset int) ([]store.AIConversation, error) {
				return nil, errors.New("db error")
			},
		}
		mockAI := &MockChatAIClient{}
		proc := New(mockStore, mockAI, logger)

		_, err := proc.ListConversations(context.Background(), accountID, 10, 0)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrListConversations)
	})
}

func TestChatProcessor_GetConversation(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	convID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockChatStore{
			GetAIConversationByIDFn: func(ctx context.Context, aID, id uuid.UUID) (store.AIConversation, error) {
				return store.AIConversation{ID: id, AccountID: aID}, nil
			},
			GetAIMessagesByConversationFn: func(ctx context.Context, conversationID uuid.UUID) ([]store.AIMessage, error) {
				return []store.AIMessage{{Role: "user", Content: "hello"}}, nil
			},
		}
		mockAI := &MockChatAIClient{}
		proc := New(mockStore, mockAI, logger)

		conv, msgs, err := proc.GetConversation(context.Background(), accountID, convID)

		require.NoError(t, err)
		assert.Equal(t, convID, conv.ID)
		assert.Len(t, msgs, 1)
	})

	t.Run("conversation not found", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockChatStore{
			GetAIConversationByIDFn: func(ctx context.Context, aID, id uuid.UUID) (store.AIConversation, error) {
				return store.AIConversation{}, store.ErrNotFound
			},
		}
		mockAI := &MockChatAIClient{}
		proc := New(mockStore, mockAI, logger)

		_, _, err := proc.GetConversation(context.Background(), accountID, convID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrConversationNotFound)
	})

	t.Run("get messages error returns ErrGetConversation", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockChatStore{
			GetAIConversationByIDFn: func(ctx context.Context, aID, id uuid.UUID) (store.AIConversation, error) {
				return store.AIConversation{ID: id}, nil
			},
			GetAIMessagesByConversationFn: func(ctx context.Context, conversationID uuid.UUID) ([]store.AIMessage, error) {
				return nil, errors.New("db error")
			},
		}
		mockAI := &MockChatAIClient{}
		proc := New(mockStore, mockAI, logger)

		_, _, err := proc.GetConversation(context.Background(), accountID, convID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrGetConversation)
	})
}

func TestChatProcessor_DeleteConversation(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	convID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockChatStore{
			DeleteAIConversationFn: func(ctx context.Context, aID, id uuid.UUID) error {
				return nil
			},
		}
		mockAI := &MockChatAIClient{}
		proc := New(mockStore, mockAI, logger)

		err := proc.DeleteConversation(context.Background(), accountID, convID)

		require.NoError(t, err)
	})

	t.Run("not found returns ErrConversationNotFound", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockChatStore{
			DeleteAIConversationFn: func(ctx context.Context, aID, id uuid.UUID) error {
				return store.ErrNotFound
			},
		}
		mockAI := &MockChatAIClient{}
		proc := New(mockStore, mockAI, logger)

		err := proc.DeleteConversation(context.Background(), accountID, convID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrConversationNotFound)
	})

	t.Run("other error returns ErrDeleteConversation", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockChatStore{
			DeleteAIConversationFn: func(ctx context.Context, aID, id uuid.UUID) error {
				return errors.New("db error")
			},
		}
		mockAI := &MockChatAIClient{}
		proc := New(mockStore, mockAI, logger)

		err := proc.DeleteConversation(context.Background(), accountID, convID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrDeleteConversation)
	})
}

func TestBuildAPIMessages(t *testing.T) {
	t.Parallel()

	t.Run("truncates to max messages", func(t *testing.T) {
		t.Parallel()
		messages := make([]store.AIMessage, 25)
		for i := range messages {
			messages[i] = store.AIMessage{Role: "user", Content: "msg"}
		}

		result := buildAPIMessages(messages, 20)

		assert.Len(t, result, 20)
	})

	t.Run("returns all when under max", func(t *testing.T) {
		t.Parallel()
		messages := []store.AIMessage{
			{Role: "user", Content: "hello"},
			{Role: "assistant", Content: "hi"},
		}

		result := buildAPIMessages(messages, 20)

		assert.Len(t, result, 2)
	})
}

func TestDeriveTitle(t *testing.T) {
	t.Parallel()

	t.Run("short message unchanged", func(t *testing.T) {
		t.Parallel()
		assert.Equal(t, "Hello world", deriveTitle("Hello world"))
	})

	t.Run("long message truncated with ellipsis", func(t *testing.T) {
		t.Parallel()
		longMsg := strings.Repeat("a", 100)
		result := deriveTitle(longMsg)
		assert.Len(t, result, 63) // 60 + "..."
		assert.True(t, strings.HasSuffix(result, "..."))
	})
}
