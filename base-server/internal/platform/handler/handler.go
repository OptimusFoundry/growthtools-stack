package handler

//go:generate go run go.uber.org/mock/mockgen@latest -source=handler.go -destination=mocks_test.go -package=handler

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/platform/processor"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// PlatformProcessor defines the platform operations required by the handler.
type PlatformProcessor interface {
	InitiateOAuth(ctx context.Context, accountID uuid.UUID, platform string) (string, error)
	HandleOAuthCallback(ctx context.Context, accountID uuid.UUID, platform string, code string) (store.PlatformConnection, error)
	ConnectBluesky(ctx context.Context, accountID uuid.UUID, handle string, appPassword string) (store.PlatformConnection, error)
	ConnectWithToken(ctx context.Context, accountID uuid.UUID, platform string) (store.PlatformConnection, error)
	DisconnectPlatform(ctx context.Context, accountID uuid.UUID, connectionID uuid.UUID) error
	ListConnections(ctx context.Context, accountID uuid.UUID) ([]store.PlatformConnection, error)
	EnsureFreshConnection(ctx context.Context, conn store.PlatformConnection) (store.PlatformConnection, error)
}

// Handler handles HTTP requests for platform connections.
type Handler struct {
	processor  PlatformProcessor
	logger     *observability.Logger
	webAppURI  string
}

// New creates a new platforms Handler.
func New(proc PlatformProcessor, logger *observability.Logger, webAppURI string) Handler {
	return Handler{
		processor:  proc,
		logger:     logger,
		webAppURI:  webAppURI,
	}
}

// InitiateOAuthRequest is the request body for starting an OAuth flow.
type InitiateOAuthRequest struct {
	Platform string `json:"platform" binding:"required"`
}

// ConnectBlueskyRequest is the request body for connecting a Bluesky account.
type ConnectBlueskyRequest struct {
	Handle      string `json:"handle" binding:"required"`
	AppPassword string `json:"app_password" binding:"required"`
}

// HandleInitiateOAuth starts an OAuth flow for a platform and returns the auth URL.
func (h *Handler) HandleInitiateOAuth(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	var req InitiateOAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	authURL, err := h.processor.InitiateOAuth(ctx, accountID, req.Platform)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"auth_url": authURL})
}

// HandleOAuthCallback processes the OAuth callback from a platform.
// The platform is extracted from the URL path: /api/platforms/oauth/callback/:platform
// On success, redirects to the frontend settings page.
func (h *Handler) HandleOAuthCallback(c *gin.Context) {
	ctx := c.Request.Context()

	platform := c.Param("platform")
	if platform == "" {
		apierrors.BadRequest(c, "INVALID_INPUT", "Missing platform in URL path")
		return
	}

	code := c.Query("code")
	if code == "" {
		apierrors.BadRequest(c, "INVALID_INPUT", "Missing code query parameter")
		return
	}

	stateStr := c.Query("state")
	if stateStr == "" {
		apierrors.BadRequest(c, "INVALID_INPUT", "Missing state query parameter")
		return
	}

	accountID, err := uuid.Parse(stateStr)
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid state parameter")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "platform", Value: platform},
	)

	_, err = h.processor.HandleOAuthCallback(ctx, accountID, platform, code)
	if err != nil {
		// Redirect to frontend with error
		redirectURL := fmt.Sprintf("%s/account?tab=platforms&error=%s", h.webAppURI, platform)
		c.Redirect(http.StatusFound, redirectURL)
		return
	}

	// Redirect to frontend account page on success
	redirectURL := fmt.Sprintf("%s/account?tab=platforms&connected=%s", h.webAppURI, platform)
	c.Redirect(http.StatusFound, redirectURL)
}

// ConnectTokenRequest is the request body for connecting a platform using a static token.
type ConnectTokenRequest struct {
	Platform string `json:"platform" binding:"required"`
}

// HandleConnectWithToken connects a platform using a pre-configured access token.
func (h *Handler) HandleConnectWithToken(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	var req ConnectTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	conn, err := h.processor.ConnectWithToken(ctx, accountID, req.Platform)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, conn)
}

// HandleConnectBluesky connects a Bluesky account using an app password.
func (h *Handler) HandleConnectBluesky(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	var req ConnectBlueskyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	conn, err := h.processor.ConnectBluesky(ctx, accountID, req.Handle, req.AppPassword)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, conn)
}

// HandleDisconnect soft-deletes a platform connection.
func (h *Handler) HandleDisconnect(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	connectionIDStr := c.Param("id")
	connectionID, err := uuid.Parse(connectionIDStr)
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid connection ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "connection_id", Value: connectionID.String()},
	)

	if err := h.processor.DisconnectPlatform(ctx, accountID, connectionID); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "platform disconnected"})
}

// HandleListConnections returns all platform connections for the account.
func (h *Handler) HandleListConnections(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	connections, err := h.processor.ListConnections(ctx, accountID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	if connections == nil {
		connections = []store.PlatformConnection{}
	}

	c.JSON(http.StatusOK, connections)
}

// handleError maps processor errors to appropriate API responses.
func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, processor.ErrUnsupportedPlatform):
		apierrors.BadRequest(c, "UNSUPPORTED_PLATFORM", "The specified platform is not supported")
	case errors.Is(err, processor.ErrConnectionNotFound):
		apierrors.NotFound(c, "Platform connection not found")
	case errors.Is(err, processor.ErrAlreadyConnected):
		apierrors.Conflict(c, "ALREADY_CONNECTED", "This platform account is already connected")
	case errors.Is(err, processor.ErrInitiateOAuth):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrHandleOAuthCallback):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrConnectBluesky):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrConnectThreads):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrMissingToken):
		apierrors.BadRequest(c, "MISSING_TOKEN", "No access token configured for this platform")
	case errors.Is(err, processor.ErrDisconnectPlatform):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrTokenRevoked):
		apierrors.BadRequest(c, "TOKEN_REVOKED", "Platform token has been revoked. Please reconnect.")
	case errors.Is(err, processor.ErrTokenRefresh):
		apierrors.ServiceUnavailable(c, "TOKEN_REFRESH_FAILED", "Failed to refresh platform token. Please try again later.", err)
	case errors.Is(err, processor.ErrNoRefreshToken):
		apierrors.BadRequest(c, "NO_REFRESH_TOKEN", "No refresh token available. Please reconnect the platform.")
	case errors.Is(err, processor.ErrListConnections):
		apierrors.InternalError(c, err)
	default:
		apierrors.InternalError(c, err)
	}
}

// getAccountID extracts and validates the account ID from the gin context.
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
