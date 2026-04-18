# Error Handling

## Two-Tier Strategy

**Tier 1 — Processor (Error level):** Logs detailed errors with full context (user_id, operation, domain fields). Contains root cause. Used for debugging.

**Tier 2 — Handler (Info level via apierrors):** Maps processor errors to HTTP responses. Logs minimal correlation info (request_id, status_code, error_code). No duplicate logging.

This lets you trace an API response back to the processor log via `request_id`.

## Error Definition

Define domain errors as package-level variables in the processor package:

```go
var (
    ErrEmailAlreadyExists = errors.New("email already exists")
    ErrUserNotFound       = errors.New("user not found")
    ErrFailedGetUser      = errors.New("failed to get user")
)
```

## Processor Layer

Log full context before returning. Map `store.ErrNotFound` to a domain error:

```go
func (p *Processor) GetUser(ctx context.Context, userID uuid.UUID) (User, error) {
    ctx = observability.WithFields(ctx,
        observability.Field{Key: "user_id", Value: userID},
        observability.Field{Key: "operation", Value: "get_user"},
    )
    user, err := p.store.GetUserByID(ctx, userID)
    if err != nil {
        p.logger.Error(ctx, "failed to get user", err)
        if errors.Is(err, store.ErrNotFound) {
            return User{}, ErrUserNotFound
        }
        return User{}, ErrFailedGetUser
    }
    return user, nil
}
```

## Handler Layer

Implement one `handleError` method per handler that maps processor errors to `apierrors` responses:

```go
import "base-server/internal/infra/apierrors"

func (h *Handler) handleError(c *gin.Context, err error) {
    switch {
    case errors.Is(err, processor.ErrUserNotFound):
        apierrors.NotFound(c, "User not found")
    case errors.Is(err, processor.ErrEmailAlreadyExists):
        apierrors.Conflict(c, "EMAIL_EXISTS", "Email already exists")
    case errors.Is(err, processor.ErrUnauthorized):
        apierrors.Forbidden(c, "FORBIDDEN", "You do not have access")
    default:
        apierrors.InternalError(c, err)
    }
}
```

Use it in every handler method:

```go
func (h *Handler) HandleGetUser(c *gin.Context) {
    ctx := c.Request.Context()
    userID := parseUserID(c)

    user, err := h.processor.GetUser(ctx, userID)
    if err != nil {
        h.handleError(c, err)
        return
    }
    c.JSON(http.StatusOK, user)
}
```

## Validation Errors

Use `apierrors.ValidationError` for binding failures — it produces structured field-level details:

```go
var req CreateUserRequest
if err := c.ShouldBindJSON(&req); err != nil {
    apierrors.ValidationError(c, err)
    return
}
```

## Adding New Error Mappings

1. Define in processor: `var ErrYourError = errors.New("...")`
2. Add a `case` to the handler's `handleError` switch
3. Add a test case that hits that branch

## Available `apierrors` Functions

```go
apierrors.BadRequest(c, "ERROR_CODE", "message")     // 400
apierrors.ValidationError(c, err)                     // 400, structured
apierrors.Unauthorized(c, "message")                  // 401
apierrors.Forbidden(c, "ERROR_CODE", "message")       // 403
apierrors.NotFound(c, "message")                      // 404
apierrors.Conflict(c, "ERROR_CODE", "message")        // 409
apierrors.InternalError(c, err)                       // 500, sanitized
apierrors.ServiceUnavailable(c, "CODE", "msg", err)   // 503
```

## Error Response Format

```json
{ "error": "User-friendly message", "code": "ERROR_CODE" }
```
