package handler

import (
	"errors"
	"io"
	"net/http"
	"strconv"

	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/observability"
	"base-server/internal/media/processor"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	processor processor.MediaProcessor
	logger    *observability.Logger
}

func New(processor processor.MediaProcessor, logger *observability.Logger) Handler {
	return Handler{
		processor: processor,
		logger:    logger,
	}
}

// HandleUpload handles multipart form file upload
func (h *Handler) HandleUpload(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	fileHeader, err := c.FormFile("file")
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "File is required")
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		apierrors.InternalError(c, err)
		return
	}
	defer file.Close()

	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	media, err := h.processor.Upload(ctx, accountID, fileHeader.Filename, contentType, fileHeader.Size, file)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, media)
}

// HandleList returns paginated media for the account
func (h *Handler) HandleList(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	limit := 20
	offset := 0

	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if parsed, err := strconv.Atoi(offsetStr); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	mediaList, err := h.processor.List(ctx, accountID, limit, offset)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, mediaList)
}

// HandleDelete deletes a media record and its stored file
func (h *Handler) HandleDelete(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	mediaID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid media ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "media_id", Value: mediaID.String()},
	)

	if err := h.processor.Delete(ctx, accountID, mediaID); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Media deleted successfully"})
}

// HandleGetFile streams a file from storage with the correct Content-Type
func (h *Handler) HandleGetFile(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	mediaID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid media ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "media_id", Value: mediaID.String()},
	)

	reader, contentType, err := h.processor.GetFile(ctx, accountID, mediaID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	defer reader.Close()

	c.Header("Content-Type", contentType)
	c.Status(http.StatusOK)
	io.Copy(c.Writer, reader)
}

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, processor.ErrMediaNotFound):
		apierrors.NotFound(c, "Media not found")
	case errors.Is(err, processor.ErrFailedUpload):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrFailedDelete):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrFailedGetFile):
		apierrors.InternalError(c, err)
	default:
		apierrors.InternalError(c, err)
	}
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
