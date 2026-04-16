package handler

import (
	"errors"
	"net/http"
	"strconv"

	"base-server/internal/infra/apierrors"
	"base-server/internal/blog/processor"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	processor processor.BlogProcessor
	logger    *observability.Logger
}

func New(processor processor.BlogProcessor, logger *observability.Logger) Handler {
	return Handler{
		processor: processor,
		logger:    logger,
	}
}

type CreateBlogRequest struct {
	Title           string   `json:"title" binding:"required"`
	Slug            string   `json:"slug" binding:"required"`
	Content         string   `json:"content" binding:"required"`
	Excerpt         *string  `json:"excerpt"`
	SEOTitle        *string  `json:"seo_title"`
	MetaDescription *string  `json:"meta_description"`
	Keywords        []string `json:"keywords"`
	OGTitle         *string  `json:"og_title"`
	OGDescription   *string  `json:"og_description"`
	FeaturedImageID *string  `json:"featured_image_id"`
}

type UpdateBlogRequest struct {
	Title           *string  `json:"title"`
	Slug            *string  `json:"slug"`
	Content         *string  `json:"content"`
	Excerpt         *string  `json:"excerpt"`
	SEOTitle        *string  `json:"seo_title"`
	MetaDescription *string  `json:"meta_description"`
	Keywords        []string `json:"keywords"`
	OGTitle         *string  `json:"og_title"`
	OGDescription   *string  `json:"og_description"`
	FeaturedImageID *string  `json:"featured_image_id"`
}

func (h *Handler) HandleCreateBlog(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	var req CreateBlogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	params := store.CreateBlogPostParams{
		AccountID:       accountID,
		Title:           req.Title,
		Slug:            req.Slug,
		Content:         req.Content,
		Excerpt:         req.Excerpt,
		Status:          "draft",
		SEOTitle:        req.SEOTitle,
		MetaDescription: req.MetaDescription,
		Keywords:        store.StringArray(req.Keywords),
		OGTitle:         req.OGTitle,
		OGDescription:   req.OGDescription,
	}

	if req.FeaturedImageID != nil {
		id, err := uuid.Parse(*req.FeaturedImageID)
		if err != nil {
			apierrors.BadRequest(c, "INVALID_INPUT", "Invalid featured_image_id format")
			return
		}
		params.FeaturedImageID = &id
	}

	created, err := h.processor.CreateBlogPost(ctx, params)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, created)
}

func (h *Handler) HandleGetBlog(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid blog post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	post, err := h.processor.GetBlogPost(ctx, accountID, postID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, post)
}

func (h *Handler) HandleListBlogs(c *gin.Context) {
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

	var statusFilter *string
	if s := c.Query("status"); s != "" {
		statusFilter = &s
	}

	posts, err := h.processor.ListBlogPosts(ctx, accountID, statusFilter, limit, offset)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, posts)
}

func (h *Handler) HandleUpdateBlog(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid blog post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	var req UpdateBlogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	updateParams := store.UpdateBlogPostParams{
		Title:           req.Title,
		Slug:            req.Slug,
		Content:         req.Content,
		Excerpt:         req.Excerpt,
		SEOTitle:        req.SEOTitle,
		MetaDescription: req.MetaDescription,
		OGTitle:         req.OGTitle,
		OGDescription:   req.OGDescription,
	}
	if req.Keywords != nil {
		updateParams.Keywords = store.StringArray(req.Keywords)
	}
	if req.FeaturedImageID != nil {
		id, err := uuid.Parse(*req.FeaturedImageID)
		if err != nil {
			apierrors.BadRequest(c, "INVALID_INPUT", "Invalid featured_image_id format")
			return
		}
		updateParams.FeaturedImageID = &id
	}

	updated, err := h.processor.UpdateBlogPost(ctx, accountID, postID, updateParams)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, updated)
}

func (h *Handler) HandleDeleteBlog(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid blog post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	if err := h.processor.DeleteBlogPost(ctx, accountID, postID); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Blog post deleted successfully"})
}

func (h *Handler) HandlePublishBlog(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid blog post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	published, err := h.processor.PublishBlogPost(ctx, accountID, postID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, published)
}

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, processor.ErrBlogPostNotFound):
		apierrors.NotFound(c, "Blog post not found")
	case errors.Is(err, processor.ErrSlugAlreadyExists):
		apierrors.Conflict(c, "SLUG_EXISTS", "A blog post with this slug already exists")
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
