package handler

import (
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/media/processor"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

var mediaGinOnce sync.Once

func setupMediaRouter(h Handler, accountID uuid.UUID) *gin.Engine {
	mediaGinOnce.Do(func() { gin.SetMode(gin.TestMode) })
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("Account-ID", accountID.String())
		c.Next()
	})
	r.GET("/media", h.HandleList)
	r.DELETE("/media/:id", h.HandleDelete)
	r.GET("/media/:id/file", h.HandleGetFile)
	r.GET("/public/media/file/*key", h.HandlePublicGetFile)
	return r
}

func TestHandler_HandleList(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockMediaProcessor)
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockMediaProcessor) {
				m.EXPECT().List(gomock.Any(), accountID, 20, 0).
					Return([]store.Media{}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "500 on list error",
			mocks: func(m *MockMediaProcessor) {
				m.EXPECT().List(gomock.Any(), accountID, 20, 0).
					Return(nil, errors.New("db error"))
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockMediaProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupMediaRouter(h, accountID)

			req := httptest.NewRequest(http.MethodGet, "/media", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleDelete(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	mediaID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockMediaProcessor)
		mediaID    string
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockMediaProcessor) {
				m.EXPECT().Delete(gomock.Any(), accountID, mediaID).Return(nil)
			},
			mediaID:    mediaID.String(),
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid UUID",
			mocks:      func(m *MockMediaProcessor) {},
			mediaID:    "bad",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 media not found",
			mocks: func(m *MockMediaProcessor) {
				m.EXPECT().Delete(gomock.Any(), accountID, mediaID).Return(processor.ErrMediaNotFound)
			},
			mediaID:    mediaID.String(),
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on delete error",
			mocks: func(m *MockMediaProcessor) {
				m.EXPECT().Delete(gomock.Any(), accountID, mediaID).Return(processor.ErrFailedDelete)
			},
			mediaID:    mediaID.String(),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockMediaProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupMediaRouter(h, accountID)

			req := httptest.NewRequest(http.MethodDelete, "/media/"+tt.mediaID, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleGetFile(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	mediaID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockMediaProcessor)
		mediaID    string
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockMediaProcessor) {
				m.EXPECT().GetFile(gomock.Any(), accountID, mediaID).
					Return(io.NopCloser(strings.NewReader("file-contents")), "image/png", nil)
			},
			mediaID:    mediaID.String(),
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid UUID",
			mocks:      func(m *MockMediaProcessor) {},
			mediaID:    "bad",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 media not found",
			mocks: func(m *MockMediaProcessor) {
				m.EXPECT().GetFile(gomock.Any(), accountID, mediaID).
					Return(nil, "", processor.ErrMediaNotFound)
			},
			mediaID:    mediaID.String(),
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on get error",
			mocks: func(m *MockMediaProcessor) {
				m.EXPECT().GetFile(gomock.Any(), accountID, mediaID).
					Return(nil, "", processor.ErrFailedGetFile)
			},
			mediaID:    mediaID.String(),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockMediaProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupMediaRouter(h, accountID)

			req := httptest.NewRequest(http.MethodGet, "/media/"+tt.mediaID+"/file", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandlePublicGetFile(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockMediaProcessor)
		key        string
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockMediaProcessor) {
				m.EXPECT().GetFileByKey(gomock.Any(), "account-id/file.png").
					Return(io.NopCloser(strings.NewReader("data")), "image/png", nil)
			},
			key:        "account-id/file.png",
			wantStatus: http.StatusOK,
		},
		{
			name: "404 media not found",
			mocks: func(m *MockMediaProcessor) {
				m.EXPECT().GetFileByKey(gomock.Any(), "account-id/missing.png").
					Return(nil, "", processor.ErrMediaNotFound)
			},
			key:        "account-id/missing.png",
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on get error",
			mocks: func(m *MockMediaProcessor) {
				m.EXPECT().GetFileByKey(gomock.Any(), "account-id/file.png").
					Return(nil, "", processor.ErrFailedGetFile)
			},
			key:        "account-id/file.png",
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockMediaProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupMediaRouter(h, accountID)

			req := httptest.NewRequest(http.MethodGet, "/public/media/file/"+tt.key, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}
