package handler

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

var analyticsGinOnce sync.Once

func setupAnalyticsRouter(h Handler, accountID uuid.UUID) *gin.Engine {
	analyticsGinOnce.Do(func() { gin.SetMode(gin.TestMode) })
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("Account-ID", accountID.String())
		c.Next()
	})
	r.GET("/analytics/overview", h.HandleGetOverview)
	r.GET("/analytics/timeseries", h.HandleGetTimeSeries)
	r.GET("/analytics/platforms", h.HandleGetPlatformBreakdown)
	return r
}

func TestHandler_HandleGetOverview(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	from := time.Now().AddDate(0, 0, -7).UTC().Format(time.RFC3339)
	to := time.Now().UTC().Format(time.RFC3339)

	tests := []struct {
		name       string
		mocks      func(m *MockAnalyticsProcessor)
		query      string
		wantStatus int
	}{
		{
			name: "200 happy path with defaults",
			mocks: func(m *MockAnalyticsProcessor) {
				m.EXPECT().GetOverview(gomock.Any(), accountID, gomock.Any(), gomock.Any()).
					Return(store.AnalyticsOverview{TotalImpressions: 100}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "200 happy path with explicit dates",
			mocks: func(m *MockAnalyticsProcessor) {
				m.EXPECT().GetOverview(gomock.Any(), accountID, gomock.Any(), gomock.Any()).
					Return(store.AnalyticsOverview{}, nil)
			},
			query:      "?from=" + from + "&to=" + to,
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid from date",
			mocks:      func(m *MockAnalyticsProcessor) {},
			query:      "?from=not-a-date",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 invalid to date",
			mocks:      func(m *MockAnalyticsProcessor) {},
			query:      "?to=not-a-date",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 from after to",
			mocks:      func(m *MockAnalyticsProcessor) {},
			query:      "?from=" + to + "&to=" + from,
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "500 on processor error",
			mocks: func(m *MockAnalyticsProcessor) {
				m.EXPECT().GetOverview(gomock.Any(), accountID, gomock.Any(), gomock.Any()).
					Return(store.AnalyticsOverview{}, errors.New("db error"))
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockAnalyticsProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupAnalyticsRouter(h, accountID)

			req := httptest.NewRequest(http.MethodGet, "/analytics/overview"+tt.query, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleGetTimeSeries(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockAnalyticsProcessor)
		query      string
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockAnalyticsProcessor) {
				m.EXPECT().GetTimeSeries(gomock.Any(), accountID, gomock.Any(), gomock.Any()).
					Return([]store.AnalyticsTimeSeries{}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid from date",
			mocks:      func(m *MockAnalyticsProcessor) {},
			query:      "?from=bad",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "500 on processor error",
			mocks: func(m *MockAnalyticsProcessor) {
				m.EXPECT().GetTimeSeries(gomock.Any(), accountID, gomock.Any(), gomock.Any()).
					Return(nil, errors.New("db error"))
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockAnalyticsProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupAnalyticsRouter(h, accountID)

			req := httptest.NewRequest(http.MethodGet, "/analytics/timeseries"+tt.query, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleGetPlatformBreakdown(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockAnalyticsProcessor)
		query      string
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockAnalyticsProcessor) {
				m.EXPECT().GetPlatformBreakdown(gomock.Any(), accountID, gomock.Any(), gomock.Any()).
					Return([]store.PlatformAnalytics{}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid to date",
			mocks:      func(m *MockAnalyticsProcessor) {},
			query:      "?to=bad",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "500 on processor error",
			mocks: func(m *MockAnalyticsProcessor) {
				m.EXPECT().GetPlatformBreakdown(gomock.Any(), accountID, gomock.Any(), gomock.Any()).
					Return(nil, errors.New("db error"))
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockAnalyticsProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupAnalyticsRouter(h, accountID)

			req := httptest.NewRequest(http.MethodGet, "/analytics/platforms"+tt.query, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}
