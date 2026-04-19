package handler

import (
	"errors"
	"net/http"
	"os"

	"base-server/internal/admin/processor"
	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/observability"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler holds admin HTTP handler logic.
type Handler struct {
	adminProcessor *processor.AdminProcessor
	webAppHost     string
	logger         *observability.Logger
}

// New constructs a Handler with the supplied dependencies.
func New(ap *processor.AdminProcessor, webAppHost string, logger *observability.Logger) Handler {
	return Handler{
		adminProcessor: ap,
		webAppHost:     webAppHost,
		logger:         logger,
	}
}

// HandleAdminMiddleware gates all /api/admin/* routes to confirmed admin emails only.
// It reads the real (non-impersonated) user ID from context to perform the check.
func (h *Handler) HandleAdminMiddleware(c *gin.Context) {
	ctx := c.Request.Context()

	// Determine the real user ID: if we're currently impersonating, the real
	// admin is stored in impersonated_by context field, not user_id (which holds the target).
	var realUserIDStr string
	if observability.IsImpersonated(ctx) {
		adminID, ok := observability.ImpersonatedBy(ctx)
		if !ok {
			apierrors.Forbidden(c, "FORBIDDEN", "Not authorized")
			c.Abort()
			return
		}
		realUserIDStr = adminID
	} else {
		uid, ok := c.Get("User-ID")
		if !ok {
			apierrors.Forbidden(c, "FORBIDDEN", "Not authorized")
			c.Abort()
			return
		}
		realUserIDStr = uid.(string)
	}

	realUserID, err := uuid.Parse(realUserIDStr)
	if err != nil {
		apierrors.Forbidden(c, "FORBIDDEN", "Not authorized")
		c.Abort()
		return
	}

	email, err := h.adminProcessor.GetUserEmailByID(ctx, realUserID)
	if err != nil {
		apierrors.Forbidden(c, "FORBIDDEN", "Not authorized")
		c.Abort()
		return
	}

	if !h.adminProcessor.IsAdminEmail(email) {
		apierrors.Forbidden(c, "FORBIDDEN", "Not authorized")
		c.Abort()
		return
	}

	c.Next()
}

// userSearchResult is the JSON shape for one row in GET /api/admin/users.
type userSearchResult struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	CreatedAt string `json:"created_at"`
}

// SearchUsers handles GET /api/admin/users?q=<email-prefix>.
func (h *Handler) SearchUsers(c *gin.Context) {
	ctx := c.Request.Context()
	q := c.Query("q")

	users, err := h.adminProcessor.SearchUsers(ctx, q)
	if err != nil {
		apierrors.InternalError(c, err)
		return
	}

	results := make([]userSearchResult, 0, len(users))
	for _, u := range users {
		results = append(results, userSearchResult{
			ID:        u.ID.String(),
			Email:     u.Email,
			FirstName: u.FirstName,
			LastName:  u.LastName,
			CreatedAt: u.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		})
	}

	c.JSON(http.StatusOK, results)
}

// StartImpersonation handles POST /api/admin/impersonate/:user_id.
func (h *Handler) StartImpersonation(c *gin.Context) {
	ctx := c.Request.Context()

	// Reject nested impersonation
	if observability.IsImpersonated(ctx) {
		apierrors.Conflict(c, "ALREADY_IMPERSONATING", "Cannot nest impersonation sessions")
		return
	}

	targetUserIDStr := c.Param("user_id")
	targetUserID, err := uuid.Parse(targetUserIDStr)
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid user ID")
		return
	}

	// Resolve admin user ID from the normal User-ID context key
	adminUserIDRaw, ok := c.Get("User-ID")
	if !ok {
		apierrors.Unauthorized(c, "User ID not found in context")
		return
	}
	adminUserID, err := uuid.Parse(adminUserIDRaw.(string))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid admin user ID")
		return
	}

	tokenStr, _, err := h.adminProcessor.MintImpersonateCookie(ctx, adminUserID, targetUserID, false)
	if err != nil {
		h.handleError(c, err)
		return
	}

	logCtx := observability.WithFields(ctx,
		observability.Field{Key: "event", Value: "admin_impersonation_start"},
		observability.Field{Key: "admin_user_id", Value: adminUserID.String()},
		observability.Field{Key: "target_user_id", Value: targetUserID.String()},
	)
	h.logger.Info(logCtx, "admin_impersonation_start")

	secure := os.Getenv("GO_ENV") == "production"
	c.SetCookie("impersonate", tokenStr, 3600, "/", h.webAppHost, secure, true)
	c.Status(http.StatusNoContent)
}

// StopImpersonation handles DELETE /api/admin/impersonate.
// Idempotent — always clears the cookie and returns 204.
func (h *Handler) StopImpersonation(c *gin.Context) {
	ctx := c.Request.Context()

	// Determine admin user ID for logging (may be impersonating or not)
	var adminUserIDStr string
	if observability.IsImpersonated(ctx) {
		adminUserIDStr, _ = observability.ImpersonatedBy(ctx)
	} else {
		uid, _ := c.Get("User-ID")
		if uid != nil {
			adminUserIDStr, _ = uid.(string)
		}
	}

	// Determine target user for logging (only relevant if we were impersonating)
	targetUserIDStr := ""
	if observability.IsImpersonated(ctx) {
		uid, _ := c.Get("User-ID") // User-ID holds the target when impersonating
		if uid != nil {
			targetUserIDStr, _ = uid.(string)
		}
	}

	if adminUserIDStr != "" {
		logCtx := observability.WithFields(ctx,
			observability.Field{Key: "event", Value: "admin_impersonation_stop"},
			observability.Field{Key: "admin_user_id", Value: adminUserIDStr},
		)
		if targetUserIDStr != "" {
			logCtx = observability.WithFields(logCtx,
				observability.Field{Key: "target_user_id", Value: targetUserIDStr},
			)
		}
		h.logger.Info(logCtx, "admin_impersonation_stop")
	}

	// Clear cookie regardless of whether one was present (idempotent)
	secure := os.Getenv("GO_ENV") == "production"
	c.SetCookie("impersonate", "", -1, "/", h.webAppHost, secure, true)
	c.Status(http.StatusNoContent)
}

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, processor.ErrUserNotFound):
		apierrors.NotFound(c, "User not found")
	case errors.Is(err, processor.ErrAccountNotFound):
		apierrors.NotFound(c, "No account found for user")
	case errors.Is(err, processor.ErrAlreadyImpersonating):
		apierrors.Conflict(c, "ALREADY_IMPERSONATING", "Cannot nest impersonation sessions")
	default:
		apierrors.InternalError(c, err)
	}
}

