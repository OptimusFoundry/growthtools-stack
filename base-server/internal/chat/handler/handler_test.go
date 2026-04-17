package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"base-server/internal/chat/processor"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

var chatGinOnce sync.Once

func setupChatRouter(h Handler, accountID uuid.UUID) *gin.Engine {
	chatGinOnce.Do(func() { gin.SetMode(gin.TestMode) })
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("Account-ID", accountID.String())
		c.Next()
	})
	r.POST("/chat", h.HandleChat)
	r.GET("/conversations", h.HandleGetConversations)
	r.GET("/conversations/:id", h.HandleGetConversation)
	r.DELETE("/conversations/:id", h.HandleDeleteConversation)
	return r
}

func chatBody(t *testing.T, v any) *bytes.Buffer {
	t.Helper()
	b, err := json.Marshal(v)
	require.NoError(t, err)
	return bytes.NewBuffer(b)
}

func TestHandler_HandleChat(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockChatProcessor)
		body       any
		wantStatus int
	}{
		{
			name: "200 happy path SSE stream",
			mocks: func(m *MockChatProcessor) {
				m.EXPECT().StreamConversation(gomock.Any(), accountID, gomock.Any(), "hello", gomock.Any()).
					DoAndReturn(func(_ interface{}, _ uuid.UUID, _ *uuid.UUID, _ string, cb func(string)) (uuid.UUID, error) {
						cb("chunk1")
						return uuid.New(), nil
					})
			},
			body:       map[string]any{"message": "hello"},
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 missing message",
			mocks:      func(m *MockChatProcessor) {},
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 invalid conversation_id format",
			mocks:      func(m *MockChatProcessor) {},
			body:       map[string]any{"message": "hi", "conversation_id": "not-a-uuid"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "200 SSE stream with processor error (still 200 via SSE error event)",
			mocks: func(m *MockChatProcessor) {
				m.EXPECT().StreamConversation(gomock.Any(), accountID, gomock.Any(), "hello", gomock.Any()).
					Return(uuid.Nil, processor.ErrStreamConversation)
			},
			body:       map[string]any{"message": "hello"},
			wantStatus: http.StatusOK, // SSE errors are sent as SSE event:error, not HTTP 500
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockChatProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupChatRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPost, "/chat", chatBody(t, tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleGetConversations(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockChatProcessor)
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockChatProcessor) {
				m.EXPECT().ListConversations(gomock.Any(), accountID, 20, 0).
					Return([]store.AIConversation{}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "500 on list error",
			mocks: func(m *MockChatProcessor) {
				m.EXPECT().ListConversations(gomock.Any(), accountID, 20, 0).
					Return(nil, processor.ErrListConversations)
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockChatProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupChatRouter(h, accountID)

			req := httptest.NewRequest(http.MethodGet, "/conversations", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleGetConversation(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	convID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockChatProcessor)
		convID     string
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockChatProcessor) {
				m.EXPECT().GetConversation(gomock.Any(), accountID, convID).
					Return(store.AIConversation{ID: convID}, []store.AIMessage{}, nil)
			},
			convID:     convID.String(),
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid UUID",
			mocks:      func(m *MockChatProcessor) {},
			convID:     "bad",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 conversation not found",
			mocks: func(m *MockChatProcessor) {
				m.EXPECT().GetConversation(gomock.Any(), accountID, convID).
					Return(store.AIConversation{}, nil, processor.ErrConversationNotFound)
			},
			convID:     convID.String(),
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on get error",
			mocks: func(m *MockChatProcessor) {
				m.EXPECT().GetConversation(gomock.Any(), accountID, convID).
					Return(store.AIConversation{}, nil, processor.ErrGetConversation)
			},
			convID:     convID.String(),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockChatProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupChatRouter(h, accountID)

			req := httptest.NewRequest(http.MethodGet, "/conversations/"+tt.convID, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleDeleteConversation(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	convID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockChatProcessor)
		convID     string
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockChatProcessor) {
				m.EXPECT().DeleteConversation(gomock.Any(), accountID, convID).Return(nil)
			},
			convID:     convID.String(),
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid UUID",
			mocks:      func(m *MockChatProcessor) {},
			convID:     "bad",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 conversation not found",
			mocks: func(m *MockChatProcessor) {
				m.EXPECT().DeleteConversation(gomock.Any(), accountID, convID).Return(processor.ErrConversationNotFound)
			},
			convID:     convID.String(),
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on delete error",
			mocks: func(m *MockChatProcessor) {
				m.EXPECT().DeleteConversation(gomock.Any(), accountID, convID).Return(processor.ErrDeleteConversation)
			},
			convID:     convID.String(),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockChatProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupChatRouter(h, accountID)

			req := httptest.NewRequest(http.MethodDelete, "/conversations/"+tt.convID, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}
