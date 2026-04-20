package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"base-server/internal/infra/observability"
	"base-server/internal/posts/processor"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestHandler_GetPostAnalytics(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	postID := uuid.New()
	logger := observability.NewLogger()

	happyResult := processor.GetPostAnalyticsResult{
		PlatformPosts: []processor.PlatformPostAnalytics{
			{
				PlatformPostID: uuid.New().String(),
				Platform:       "x",
				Status:         "published",
				History:        make([]processor.AnalyticsSnapshot, 0),
			},
		},
	}

	tests := []struct {
		name       string
		postID     string
		mock       func(m *MockPostProcessor)
		wantStatus int
	}{
		{
			name:   "200 happy path",
			postID: postID.String(),
			mock: func(m *MockPostProcessor) {
				m.EXPECT().GetPostAnalytics(gomock.Any(), accountID, postID).
					Return(happyResult, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name:   "404 post not found",
			postID: postID.String(),
			mock: func(m *MockPostProcessor) {
				m.EXPECT().GetPostAnalytics(gomock.Any(), accountID, postID).
					Return(processor.GetPostAnalyticsResult{}, processor.ErrPostNotFound)
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "400 invalid UUID",
			postID:     "not-a-uuid",
			mock:       func(m *MockPostProcessor) {},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:   "500 internal error",
			postID: postID.String(),
			mock: func(m *MockPostProcessor) {
				m.EXPECT().GetPostAnalytics(gomock.Any(), accountID, postID).
					Return(processor.GetPostAnalyticsResult{}, processor.ErrFailedGetPostAnalytics)
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPostProcessor(ctrl)
			tt.mock(m)
			h := New(m, logger)

			gin.SetMode(gin.TestMode)
			r := gin.New()
			r.GET("/posts/:id/analytics", func(c *gin.Context) {
				c.Set("Account-ID", accountID.String())
			}, h.HandleGetPostAnalytics)

			req := httptest.NewRequest(http.MethodGet, "/posts/"+tt.postID+"/analytics", nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}
