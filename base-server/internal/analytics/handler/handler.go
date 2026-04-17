package handler

//go:generate go run go.uber.org/mock/mockgen@latest -source=handler.go -destination=mocks_test.go -package=handler

import (
	"context"
	"net/http"
	"time"

	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AnalyticsProcessor defines the analytics operations required by the handler.
type AnalyticsProcessor interface {
	GetOverview(ctx context.Context, accountID uuid.UUID, from, to time.Time) (store.AnalyticsOverview, error)
	GetTimeSeries(ctx context.Context, accountID uuid.UUID, from, to time.Time) ([]store.AnalyticsTimeSeries, error)
	GetPlatformBreakdown(ctx context.Context, accountID uuid.UUID, from, to time.Time) ([]store.PlatformAnalytics, error)
}

type Handler struct {
	processor AnalyticsProcessor
	logger    *observability.Logger
}

func New(processor AnalyticsProcessor, logger *observability.Logger) Handler {
	return Handler{
		processor: processor,
		logger:    logger,
	}
}

// HandleGetOverview returns aggregated analytics for a date range
func (h *Handler) HandleGetOverview(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	from, to, ok := h.parseDateRange(c)
	if !ok {
		return
	}

	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	overview, err := h.processor.GetOverview(ctx, accountID, from, to)
	if err != nil {
		apierrors.InternalError(c, err)
		return
	}

	c.JSON(http.StatusOK, overview)
}

// HandleGetTimeSeries returns time-series analytics data for a date range
func (h *Handler) HandleGetTimeSeries(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	from, to, ok := h.parseDateRange(c)
	if !ok {
		return
	}

	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	series, err := h.processor.GetTimeSeries(ctx, accountID, from, to)
	if err != nil {
		apierrors.InternalError(c, err)
		return
	}

	c.JSON(http.StatusOK, series)
}

// HandleGetPlatformBreakdown returns per-platform analytics for a date range
func (h *Handler) HandleGetPlatformBreakdown(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	from, to, ok := h.parseDateRange(c)
	if !ok {
		return
	}

	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	breakdown, err := h.processor.GetPlatformBreakdown(ctx, accountID, from, to)
	if err != nil {
		apierrors.InternalError(c, err)
		return
	}

	c.JSON(http.StatusOK, breakdown)
}

// parseDateRange parses the "from" and "to" query parameters as RFC3339 timestamps.
// Defaults: from = 30 days ago, to = now.
func (h *Handler) parseDateRange(c *gin.Context) (time.Time, time.Time, bool) {
	now := time.Now().UTC()
	from := now.AddDate(0, 0, -30)
	to := now

	if fromStr := c.Query("from"); fromStr != "" {
		parsed, err := time.Parse(time.RFC3339, fromStr)
		if err != nil {
			apierrors.BadRequest(c, "INVALID_INPUT", "Invalid 'from' date format, expected RFC3339")
			return time.Time{}, time.Time{}, false
		}
		from = parsed
	}

	if toStr := c.Query("to"); toStr != "" {
		parsed, err := time.Parse(time.RFC3339, toStr)
		if err != nil {
			apierrors.BadRequest(c, "INVALID_INPUT", "Invalid 'to' date format, expected RFC3339")
			return time.Time{}, time.Time{}, false
		}
		to = parsed
	}

	if from.After(to) {
		apierrors.BadRequest(c, "INVALID_INPUT", "'from' date must be before 'to' date")
		return time.Time{}, time.Time{}, false
	}

	return from, to, true
}

func (h *Handler) getAccountID(c *gin.Context) (uuid.UUID, bool) {
	accountIDStr, exists := c.Get("Account-ID")
	if !exists {
		apierrors.Unauthorized(c, "Account ID not found in context")
		return uuid.UUID{}, false
	}
	accountID, err := uuid.Parse(accountIDStr.(string))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid account ID format")
		return uuid.UUID{}, false
	}
	return accountID, true
}
