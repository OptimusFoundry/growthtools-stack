package handler

import (
	"errors"
	"io"
	"net/http"
	"net/url"
	"strconv"

	"base-server/internal/github/processor"
	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/observability"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	processor  processor.GitHubProcessor
	webAppHost string
	logger     *observability.Logger
}

func New(proc processor.GitHubProcessor, webAppHost string, logger *observability.Logger) Handler {
	return Handler{
		processor:  proc,
		webAppHost: webAppHost,
		logger:     logger,
	}
}

// HandleWebhook handles incoming GitHub webhook events.
// This is a public endpoint — authentication is via HMAC signature.
func (h *Handler) HandleWebhook(c *gin.Context) {
	ctx := c.Request.Context()

	eventType := c.GetHeader("X-GitHub-Event")
	deliveryID := c.GetHeader("X-GitHub-Delivery")
	signature := c.GetHeader("X-Hub-Signature-256")

	if eventType == "" || deliveryID == "" || signature == "" {
		apierrors.BadRequest(c, "INVALID_INPUT", "Missing required GitHub webhook headers")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "event_type", Value: eventType},
		observability.Field{Key: "delivery_id", Value: deliveryID},
	)

	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		apierrors.InternalError(c, err)
		return
	}

	if err := h.processor.HandleWebhookEvent(ctx, deliveryID, eventType, payload, signature); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Webhook received"})
}

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, processor.ErrInvalidSignature):
		apierrors.Unauthorized(c, "Invalid webhook signature")
	case errors.Is(err, processor.ErrDuplicateEvent):
		// GitHub expects a 200 for duplicates to stop retrying
		c.JSON(http.StatusOK, gin.H{"message": "Duplicate event ignored"})
	case errors.Is(err, processor.ErrInvalidOAuthState):
		apierrors.BadRequest(c, "INVALID_STATE", "Invalid or expired OAuth state")
	case errors.Is(err, processor.ErrOAuthExchangeFailed):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrConnectionNotFound):
		apierrors.NotFound(c, "GitHub connection not found")
	case errors.Is(err, processor.ErrRepoNotFound):
		apierrors.NotFound(c, "GitHub repo not found")
	case errors.Is(err, processor.ErrRepoAlreadyLinked):
		apierrors.Conflict(c, "REPO_ALREADY_LINKED", "Repository is already connected")
	case errors.Is(err, processor.ErrFailedDisconnect):
		apierrors.InternalError(c, err)
	default:
		apierrors.InternalError(c, err)
	}
}

// getUserID extracts and parses the User-ID from Gin context (set by JWT middleware)
func (h *Handler) getUserID(c *gin.Context) (uuid.UUID, bool) {
	raw, exists := c.Get("User-ID")
	if !exists {
		apierrors.Unauthorized(c, "User ID not found in context")
		return uuid.Nil, false
	}
	id, err := uuid.Parse(raw.(string))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid user ID")
		return uuid.Nil, false
	}
	return id, true
}

// HandleInitOAuth returns the GitHub authorization URL for the current user
// GET /api/protected/github/oauth/init
func (h *Handler) HandleInitOAuth(c *gin.Context) {
	ctx := c.Request.Context()

	userID, ok := h.getUserID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "user_id", Value: userID.String()})

	authorizeURL, err := h.processor.InitOAuth(ctx, userID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"authorize_url": authorizeURL})
}

// HandleOAuthCallback handles the redirect from GitHub after user authorizes the app
// GET /api/github/oauth/callback?code=&state=
func (h *Handler) HandleOAuthCallback(c *gin.Context) {
	ctx := c.Request.Context()

	code := c.Query("code")
	state := c.Query("state")

	if code == "" || state == "" {
		apierrors.BadRequest(c, "INVALID_INPUT", "Missing code or state parameter")
		return
	}

	_, err := h.processor.CompleteOAuth(ctx, state, code)

	base, _ := url.Parse(h.webAppHost)
	redirectURL := url.URL{
		Scheme: base.Scheme,
		Host:   base.Host,
		Path:   "/account",
	}
	q := redirectURL.Query()
	q.Set("tab", "platforms")
	if err != nil {
		h.logger.Error(ctx, "github oauth callback failed", err)
		q.Set("github", "error")
	} else {
		q.Set("github", "connected")
	}
	redirectURL.RawQuery = q.Encode()

	c.Redirect(http.StatusFound, redirectURL.String())
}

// HandleGetConnection returns the current user's GitHub connection info
// GET /api/protected/github/connection
func (h *Handler) HandleGetConnection(c *gin.Context) {
	ctx := c.Request.Context()

	userID, ok := h.getUserID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "user_id", Value: userID.String()})

	conn, err := h.processor.GetConnection(ctx, userID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, conn)
}

// HandleDisconnect soft-deletes the user's GitHub connection and all repos
// DELETE /api/protected/github/connection
func (h *Handler) HandleDisconnect(c *gin.Context) {
	ctx := c.Request.Context()

	userID, ok := h.getUserID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "user_id", Value: userID.String()})

	if err := h.processor.Disconnect(ctx, userID); err != nil {
		h.handleError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// HandleListAvailableRepos lists GitHub repos for the user, flagging connected ones
// GET /api/protected/github/repos?page=N
func (h *Handler) HandleListAvailableRepos(c *gin.Context) {
	ctx := c.Request.Context()

	userID, ok := h.getUserID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "user_id", Value: userID.String()})

	page := 1
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	repos, err := h.processor.ListAvailableRepos(ctx, userID, page)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, repos)
}

// HandleConnectRepo registers a webhook and connects a repo for the user
// POST /api/protected/github/repos/:owner/:name/connect
func (h *Handler) HandleConnectRepo(c *gin.Context) {
	ctx := c.Request.Context()

	userID, ok := h.getUserID(c)
	if !ok {
		return
	}

	owner := c.Param("owner")
	name := c.Param("name")
	if owner == "" || name == "" {
		apierrors.BadRequest(c, "INVALID_INPUT", "Missing owner or name path parameter")
		return
	}
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "repo", Value: owner + "/" + name},
	)

	repo, err := h.processor.ConnectRepo(ctx, userID, owner, name)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, repo)
}

// HandleDisconnectRepo removes a connected repo (webhook deleted, row soft-deleted)
// DELETE /api/protected/github/repos/:owner/:name
func (h *Handler) HandleDisconnectRepo(c *gin.Context) {
	ctx := c.Request.Context()

	userID, ok := h.getUserID(c)
	if !ok {
		return
	}

	owner := c.Param("owner")
	name := c.Param("name")
	if owner == "" || name == "" {
		apierrors.BadRequest(c, "INVALID_INPUT", "Missing owner or name path parameter")
		return
	}
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "repo", Value: owner + "/" + name},
	)

	if err := h.processor.DisconnectRepo(ctx, userID, owner, name); err != nil {
		h.handleError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// HandleListCommits returns recent commits across all connected repos
// GET /api/protected/github/commits?limit=N
func (h *Handler) HandleListCommits(c *gin.Context) {
	ctx := c.Request.Context()

	userID, ok := h.getUserID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "user_id", Value: userID.String()})

	limit := 50
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 200 {
			limit = parsed
		}
	}

	commits, err := h.processor.ListRecentCommits(ctx, userID, limit)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, commits)
}
