package handler

import (
	"net/http"

	"base-server/internal/infra/apierrors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// HandleGetPostAnalytics returns per-platform analytics for a single post.
// GET /api/protected/posts/:id/analytics
func (h *Handler) HandleGetPostAnalytics(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postIDStr := c.Param("id")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid post ID format")
		return
	}

	result, err := h.processor.GetPostAnalytics(ctx, accountID, postID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}
