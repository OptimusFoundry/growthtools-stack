package handler

import (
	"net/http"
	"strconv"

	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/observability"

	"github.com/gin-gonic/gin"
)

// HandleGetCalendarMonth serves GET /api/protected/posts/calendar?year=YYYY&month=MM.
// It returns per-day status + platform counts and month totals for the
// requested month. Only days with at least one post are included in Days[];
// the frontend fills empty-day gaps.
//
// Query params:
//
//	year  — 4-digit year (2000–2100), required
//	month — 1-based month (1–12), required
func (h *Handler) HandleGetCalendarMonth(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	yearStr := c.Query("year")
	monthStr := c.Query("month")
	if yearStr == "" || monthStr == "" {
		apierrors.BadRequest(c, "INVALID_INPUT", "year and month query params are required")
		return
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "year must be a 4-digit integer")
		return
	}
	month, err := strconv.Atoi(monthStr)
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "month must be an integer between 1 and 12")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "year", Value: year},
		observability.Field{Key: "month", Value: month},
	)

	result, err := h.processor.GetCalendarMonth(ctx, accountID, year, month)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}
