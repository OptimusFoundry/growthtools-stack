package handler

//go:generate go run go.uber.org/mock/mockgen@latest -source=handler.go -destination=mocks_test.go -package=handler

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strconv"

	"base-server/internal/github/processor"
	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GitHubProcessor defines the GitHub operations required by the handler.
type GitHubProcessor interface {
	HandleWebhookEvent(ctx context.Context, deliveryID, eventType string, payload []byte, signature string) error
	InitOAuth(ctx context.Context, userID uuid.UUID) (string, error)
	CompleteOAuth(ctx context.Context, state, code string) (uuid.UUID, error)
	GetConnection(ctx context.Context, userID uuid.UUID) (store.GitHubConnection, error)
	Disconnect(ctx context.Context, userID uuid.UUID) error
	ListAvailableRepos(ctx context.Context, userID uuid.UUID, page int) ([]processor.AvailableRepo, error)
	ConnectRepo(ctx context.Context, userID uuid.UUID, owner, name string) (store.GitHubRepo, error)
	DisconnectRepo(ctx context.Context, userID uuid.UUID, owner, name string) error
	ListRecentCommits(ctx context.Context, userID uuid.UUID, limit, offset int) ([]store.GitHubCommitSummary, int, error)
	GetCommit(ctx context.Context, userID, commitID uuid.UUID) (store.GitHubCommit, error)
	RetryCapture(ctx context.Context, userID, commitID uuid.UUID) error
}

type Handler struct {
	processor   GitHubProcessor
	regenerator DraftRegenerator
	webAppHost  string
	logger      *observability.Logger
}

func New(proc GitHubProcessor, webAppHost string, logger *observability.Logger) Handler {
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
	case errors.Is(err, processor.ErrCommitNotFound):
		apierrors.NotFound(c, "GitHub commit not found")
	case errors.Is(err, processor.ErrFailedGetCommit):
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

// ListCommitsResponse is the paginated response for HandleListCommits. List
// rows drop the heavy capture_output blob; hit GET /commits/:id for the full
// payload including uploaded artifacts.
type ListCommitsResponse struct {
	Commits []store.GitHubCommitSummary `json:"commits"`
	Total   int                         `json:"total"`
	Limit   int                         `json:"limit"`
	Offset  int                         `json:"offset"`
}

// HandleListCommits returns a page of commits across all connected repos.
// GET /api/protected/github/commits?limit=N&offset=M
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

	offset := 0
	if o := c.Query("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	commits, total, err := h.processor.ListRecentCommits(ctx, userID, limit, offset)
	if err != nil {
		h.handleError(c, err)
		return
	}

	if commits == nil {
		commits = []store.GitHubCommitSummary{}
	}

	c.JSON(http.StatusOK, ListCommitsResponse{
		Commits: commits,
		Total:   total,
		Limit:   limit,
		Offset:  offset,
	})
}

// HandleGetCommit returns a single commit by id, scoped to the current user.
// GET /api/protected/github/commits/:id
func (h *Handler) HandleGetCommit(c *gin.Context) {
	ctx := c.Request.Context()

	userID, ok := h.getUserID(c)
	if !ok {
		return
	}

	commitID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid commit id")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "commit_id", Value: commitID.String()},
	)

	commit, err := h.processor.GetCommit(ctx, userID, commitID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, commit)
}

// HandleRetryCapture re-runs the capture pipeline for a single commit.
// POST /api/protected/github/commits/:id/retry-capture
func (h *Handler) HandleRetryCapture(c *gin.Context) {
	ctx := c.Request.Context()

	userID, ok := h.getUserID(c)
	if !ok {
		return
	}

	commitID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid commit id")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "commit_id", Value: commitID.String()},
	)

	if err := h.processor.RetryCapture(ctx, userID, commitID); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"status": "queued"})
}
