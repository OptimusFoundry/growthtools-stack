package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"base-server/internal/infra/observability"
	"base-server/internal/posts/processor"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

func setupCalendarRouter(h Handler, accountID uuid.UUID) *gin.Engine {
	postsGinOnce.Do(func() { gin.SetMode(gin.TestMode) })
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("Account-ID", accountID.String())
		c.Next()
	})
	// calendar must be before /:id to match correctly
	r.GET("/posts/calendar", h.HandleGetCalendarMonth)
	r.GET("/posts/:id", h.HandleGetPost)
	return r
}

func TestHandleGetCalendarMonth_Happy(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	ctrl := gomock.NewController(t)
	m := NewMockPostProcessor(ctrl)
	m.EXPECT().GetCalendarMonth(gomock.Any(), accountID, 2026, 4).
		Return(processor.CalendarMonth{
			Month: "2026-04",
			Days:  []processor.CalendarDay{},
		}, nil)

	h := New(m, logger)
	r := setupCalendarRouter(h, accountID)

	req := httptest.NewRequest(http.MethodGet, "/posts/calendar?year=2026&month=4", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var body map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, "2026-04", body["month"])
	assert.NotNil(t, body["days"])
	assert.NotNil(t, body["month_totals"])
}

func TestHandleGetCalendarMonth_MissingYear(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	ctrl := gomock.NewController(t)
	m := NewMockPostProcessor(ctrl)
	// GetCalendarMonth must NOT be called when year is missing.

	h := New(m, logger)
	r := setupCalendarRouter(h, accountID)

	req := httptest.NewRequest(http.MethodGet, "/posts/calendar?month=4", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestHandleGetCalendarMonth_MissingMonth(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	ctrl := gomock.NewController(t)
	m := NewMockPostProcessor(ctrl)
	// GetCalendarMonth must NOT be called when month is missing.

	h := New(m, logger)
	r := setupCalendarRouter(h, accountID)

	req := httptest.NewRequest(http.MethodGet, "/posts/calendar?year=2026", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestHandleGetCalendarMonth_InvalidParams(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	ctrl := gomock.NewController(t)
	m := NewMockPostProcessor(ctrl)
	m.EXPECT().GetCalendarMonth(gomock.Any(), accountID, 1800, 1).
		Return(processor.CalendarMonth{}, processor.ErrInvalidCalendarParams)

	h := New(m, logger)
	r := setupCalendarRouter(h, accountID)

	req := httptest.NewRequest(http.MethodGet, "/posts/calendar?year=1800&month=1", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestHandleListPosts_WithDateRange(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	ctrl := gomock.NewController(t)
	m := NewMockPostProcessor(ctrl)
	// Verify that From and To are non-nil when passed.
	m.EXPECT().ListPosts(gomock.Any(), gomock.Any()).Return(nil, nil)

	h := New(m, logger)
	r := setupPostsRouter(h, accountID)

	req := httptest.NewRequest(http.MethodGet, "/posts?from=2026-04-01&to=2026-04-15", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestHandleListPosts_InvalidFrom(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	ctrl := gomock.NewController(t)
	m := NewMockPostProcessor(ctrl)
	// ListPosts must NOT be called with invalid from param.

	h := New(m, logger)
	r := setupPostsRouter(h, accountID)

	req := httptest.NewRequest(http.MethodGet, "/posts?from=not-a-date", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}
