# HTTP Handler Patterns

## Request / Response Structs

Define in the handler file or a separate types file:

```go
type CreatePostRequest struct {
    Content     string  `json:"content"     binding:"required,min=1,max=10000"`
    Description *string `json:"description" binding:"omitempty,max=1000"`
    Status      string  `json:"status"      binding:"required,oneof=draft published"`
}

type CreatePostResponse struct {
    ID          uuid.UUID `json:"id"`
    Content     string    `json:"content"`
    Description *string   `json:"description,omitempty"`
    Status      string    `json:"status"`
    CreatedAt   time.Time `json:"created_at"`
}
```

## Handler Method Template

```go
func (h *Handler) HandleCreatePost(c *gin.Context) {
    ctx := c.Request.Context()

    // Extract account ID from auth middleware
    accountID, ok := h.getAccountID(c)
    if !ok {
        return
    }
    ctx = observability.WithFields(ctx,
        observability.Field{Key: "account_id", Value: accountID.String()},
    )

    // Validate input
    var req CreatePostRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        apierrors.ValidationError(c, err)
        return
    }

    // Call processor
    result, err := h.processor.CreatePost(ctx, accountID, processor.CreatePostParams{
        Content:     req.Content,
        Description: req.Description,
        Status:      req.Status,
    })
    if err != nil {
        h.handleError(c, err)
        return
    }

    c.JSON(http.StatusCreated, CreatePostResponse{
        ID:          result.ID,
        Content:     result.Content,
        Description: result.Description,
        Status:      result.Status,
        CreatedAt:   result.CreatedAt,
    })
}
```

## getAccountID Helper

Every handler struct needs this helper:

```go
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
```

## Processor Method Template

```go
type CreatePostParams struct {
    Content     string
    Description *string
    Status      string
}

func (p *Processor) CreatePost(ctx context.Context, accountID uuid.UUID, params CreatePostParams) (Post, error) {
    ctx = observability.WithFields(ctx,
        observability.Field{Key: "operation", Value: "create_post"},
    )

    post, err := p.store.CreatePost(ctx, store.CreatePostParams{
        AccountID:   accountID,
        Content:     params.Content,
        Description: params.Description,
        Status:      params.Status,
    })
    if err != nil {
        p.logger.Error(ctx, "failed to create post", err)
        return Post{}, ErrFailedCreatePost
    }

    p.logger.Info(ctx, "post created")
    return mapPost(post), nil
}
```

## Route Registration

Add routes in `internal/infra/api/api.go` inside the appropriate group:

```go
postsGroup := protected.Group("/posts")
{
    postsGroup.POST("",              a.postHandler.HandleCreatePost)
    postsGroup.GET("",               a.postHandler.HandleListPosts)
    postsGroup.GET("/:post_id",      a.postHandler.HandleGetPost)
    postsGroup.PUT("/:post_id",      a.postHandler.HandleUpdatePost)
    postsGroup.DELETE("/:post_id",   a.postHandler.HandleDeletePost)
}
```

## URL Parameter Extraction

```go
// Path parameter
postIDStr := c.Param("post_id")
postID, err := uuid.Parse(postIDStr)
if err != nil {
    apierrors.BadRequest(c, "INVALID_ID", "Invalid post ID format")
    return
}

// Query parameters
page    := c.DefaultQuery("page", "1")
limit   := c.DefaultQuery("limit", "20")
status  := c.Query("status") // optional, empty string if absent
```

## Validation Tag Reference

```go
`binding:"required"`                        // must be present
`binding:"min=1,max=255"`                   // string length
`binding:"email"`                           // email format
`binding:"uuid"`                            // UUID format
`binding:"oneof=draft published archived"`  // enum
`binding:"omitempty,max=1000"`              // optional with max
`binding:"min=1,max=100"`                   // numeric range
```

## Handler Constructor

```go
type Handler struct {
    processor SomeProcessor // interface defined in this package
    logger    *observability.Logger
}

func New(processor SomeProcessor, logger *observability.Logger) Handler {
    return Handler{processor: processor, logger: logger}
}
```

## Processor Interface (defined in handler package)

```go
type SomeProcessor interface {
    CreatePost(ctx context.Context, accountID uuid.UUID, params CreatePostParams) (Post, error)
    GetPost(ctx context.Context, accountID, postID uuid.UUID) (Post, error)
    ListPosts(ctx context.Context, accountID uuid.UUID) ([]Post, error)
    UpdatePost(ctx context.Context, accountID, postID uuid.UUID, params UpdatePostParams) (Post, error)
    DeletePost(ctx context.Context, accountID, postID uuid.UUID) error
}
```
