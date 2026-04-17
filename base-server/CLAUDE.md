# Go Base Server - Developer Guidelines

## Project Structure

### Directory Organization
```
base-server/
├── internal/               # Private application code
│   ├── infra/             # Infrastructure & plumbing (no business logic)
│   │   ├── api/           # API setup and route registration
│   │   ├── apierrors/     # Centralized API error handling
│   │   ├── bootstrap/     # Application bootstrap and initialization
│   │   ├── clients/       # Infra-only external clients
│   │   │   ├── anthropic/ # Claude AI client
│   │   │   ├── googleoauth/ # Google OAuth client
│   │   │   ├── kafka/     # Kafka producer/consumer
│   │   │   ├── mail/      # Email service client (Resend)
│   │   │   └── s3/        # S3 storage client
│   │   ├── config/        # Configuration management
│   │   ├── email/         # Email service abstraction
│   │   ├── observability/ # Logging, metrics, and tracing
│   │   ├── server/        # HTTP server setup
│   │   ├── store/         # Database layer and models
│   │   └── tiers/         # Subscription tier management
│   │
│   ├── platform/          # Social media platform integration
│   │   ├── adapters/      # Platform adapter implementations
│   │   ├── clients/       # Platform API HTTP clients
│   │   │   ├── bluesky/   # BlueSky API client
│   │   │   ├── facebook/  # Facebook API client
│   │   │   ├── instagram/ # Instagram API client
│   │   │   ├── linkedin/  # LinkedIn API client
│   │   │   ├── pinterest/ # Pinterest API client
│   │   │   ├── threads/   # Threads API client
│   │   │   ├── tiktok/    # TikTok API client
│   │   │   └── x/         # X (Twitter) API client
│   │   ├── handler/       # HTTP handlers for platform connections
│   │   └── processor/     # Business logic for platform operations
│   │
│   ├── billing/           # Billing and payment domain
│   │   ├── handler/       # HTTP handlers for billing
│   │   ├── processor/     # Business logic for billing
│   │   ├── products/      # Product management service
│   │   └── subscriptions/ # Subscription management service
│   │
│   ├── analytics/         # Analytics endpoints
│   │   ├── handler/       # HTTP handlers for analytics
│   │   └── processor/     # Business logic for analytics
│   ├── auth/              # Authentication & authorization
│   │   ├── handler/       # HTTP handlers for auth endpoints
│   │   └── processor/     # Business logic for auth operations
│   ├── store/             # Database layer and models
│   ├── blog/              # Blog management
│   │   ├── handler/
│   │   └── processor/
│   ├── chat/              # AI chat
│   │   ├── handler/
│   │   └── processor/
│   ├── content/           # Content generation
│   │   ├── handler/
│   │   └── processor/
│   ├── github/            # GitHub integration
│   │   ├── handler/
│   │   └── processor/
│   ├── media/             # Media management
│   │   ├── handler/
│   │   └── processor/
│   ├── posts/             # Post management
│   │   ├── handler/
│   │   └── processor/
│   ├── settings/          # User settings
│   │   ├── handler/
│   │   └── processor/
│   └── workers/           # Background workers
├── migrations/            # SQL migration files (Flyway format)
├── tests/                 # Integration tests
├── docs/                  # Documentation
├── main.go               # Application entry point
└── go.mod                # Go module definition
```

### Package Patterns
- **Handler**: HTTP request handling, input validation, response formatting
- **Processor**: Business logic, orchestration, external service calls
- **Service**: Domain-specific business operations
- **Store**: Database operations and models
- **Client**: External API integrations
- **APIErrors**: Centralized API error handling, sanitization, and logging

## Code Conventions

### Naming Conventions
- **Variables**: camelCase (e.g., `userID`, `stripeCustomerID`)
- **Functions/Methods**: 
  - Exported: PascalCase (e.g., `HandleEmailLogin`, `CreateUser`)
  - Private: camelCase (e.g., `validateToken`, `hashPassword`)
- **Structs**: PascalCase (e.g., `AuthProcessor`, `EmailSignupRequest`)
- **Interfaces**: PascalCase with descriptive names (e.g., `Store`, `BillingProcessor`)
- **Constants**: PascalCase for exported, camelCase for private
- **Error Variables**: `Err` prefix (e.g., `ErrEmailAlreadyExists`, `ErrUserNotFound`)

### Import Organization
```go
import (
    // Standard library
    "context"
    "errors"
    "fmt"
    
    // Internal packages (with aliases for clarity)
    "base-server/internal/infra/observability"
    "base-server/internal/infra/store"
    billingHandler "base-server/internal/billing/handler"
    "base-server/internal/auth/processor"
    
    // Third-party packages
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "go.uber.org/zap"
)
```

## Architecture Patterns

### Dependency Injection
All components use constructor-based dependency injection:
```go
func New(store store.Store, authConfig AuthConfig, logger *observability.Logger) AuthProcessor {
    return AuthProcessor{
        store:      store,
        authConfig: authConfig,
        logger:     logger,
    }
}
```

### Layered Architecture
1. **HTTP Layer** (handlers): Request/response handling
2. **Business Layer** (processors/services): Core business logic
3. **Data Layer** (store): Database operations

### Context Usage
Always pass context through the call chain for:
- Request tracing (request_id)
- Structured logging fields
- Cancellation propagation

```go
ctx = observability.WithFields(ctx, observability.Field{Key: "user_id", Value: userID})
```

## Error Handling

### Error Definition
Define domain-specific errors as package-level variables in processor/service packages:
```go
var (
    ErrEmailAlreadyExists = errors.New("email already exists")
    ErrUserNotFound       = errors.New("user not found")
    ErrCampaignNotFound   = errors.New("campaign not found")
)
```

### Centralized API Error Handling
**CRITICAL:** All API handlers MUST use the `internal/apierrors` package for error responses. This ensures:
- Internal details (SQL errors, database schema, stack traces) never leak to clients
- Consistent error response format across all endpoints
- Two-tier logging: detailed errors in processor, correlation info in API layer

### Processor Layer Error Handling
Processors should log errors with full context before returning them:
```go
func (p *Processor) GetUserByExternalID(ctx context.Context, userID uuid.UUID) (User, error) {
    // Enrich context with operation-specific fields
    ctx = observability.WithFields(ctx,
        observability.Field{Key: "user_id", Value: userID},
        observability.Field{Key: "operation", Value: "get_user"},
    )

    user, err := p.store.GetUserByExternalID(ctx, userID)
    if err != nil {
        // Log detailed error with full context (user_id, operation, etc.)
        p.logger.Error(ctx, "failed to get user by external id", err)
        if errors.Is(err, store.ErrNotFound) {
            return User{}, ErrUserNotFound
        }
        return User{}, ErrFailedGetUser
    }
    return user, nil
}
```

### Handler Layer Error Handling
Handlers use a private `handleError` method to map processor errors to API responses:

**Define a handleError method per handler:**
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

**For processor/business logic errors:**
```go
func (h *Handler) HandleGetUser(c *gin.Context) {
    ctx := c.Request.Context()
    userID := parseUserID(c) // your parsing logic

    user, err := h.processor.GetUserByExternalID(ctx, userID)
    if err != nil {
        // Processor already logged detailed error with full context
        // handleError maps the error to appropriate API response
        h.handleError(c, err)
        return
    }

    c.JSON(http.StatusOK, user)
}
```

**For validation errors:**
```go
func (h *Handler) HandleCreateUser(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        // Handles validation errors with structured field-level details
        apierrors.ValidationError(c, err)
        return
    }

    user, err := h.processor.CreateUser(c.Request.Context(), req)
    if err != nil {
        h.handleError(c, err)
        return
    }

    c.JSON(http.StatusCreated, user)
}
```

### Two-Tier Logging Strategy
The error handling system uses a two-tier logging approach to balance debugging capability with log efficiency:

**Tier 1 - Processor Layer (Error Level):**
- Logs detailed errors with full enriched context
- Includes domain-specific fields (user_id, campaign_id, account_id, etc.)
- Contains root cause information
- Used for debugging and root cause analysis

**Tier 2 - API Layer (Info Level):**
- Logs minimal correlation information
- Includes request_id, status_code, error_code, error_message
- Used to correlate API responses with processor logs
- No duplicate error logging

This approach ensures you can trace from an API response back to the detailed processor logs using the request_id.

### Error Response Format
All API errors return this consistent JSON structure:
```json
{
  "error": "User-friendly error message",
  "code": "ERROR_CODE"
}
```

Error codes use `UPPER_SNAKE_CASE` format (e.g., `USER_NOT_FOUND`, `EMAIL_EXISTS`, `INVALID_INPUT`).

### Adding New Error Mappings
When adding new processor errors:

1. **Define the error in the processor package:**
```go
// internal/yourfeature/processor/processor.go
var (
    ErrYourNewError = errors.New("your new error")
)
```

2. **Update the handler's handleError method:**
```go
// internal/yourfeature/handler/handler.go
func (h *Handler) handleError(c *gin.Context, err error) {
    switch {
    case errors.Is(err, processor.ErrYourNewError):
        apierrors.NotFound(c, "Resource not found")
    // ... other error mappings
    default:
        apierrors.InternalError(c, err)
    }
}
```

### Available apierrors Functions
```go
// 400 Bad Request
apierrors.BadRequest(c, "ERROR_CODE", "User-friendly message")
apierrors.ValidationError(c, err) // For binding/validation errors

// 401 Unauthorized
apierrors.Unauthorized(c, "User-friendly message")

// 403 Forbidden
apierrors.Forbidden(c, "ERROR_CODE", "User-friendly message")

// 404 Not Found
apierrors.NotFound(c, "User-friendly message")

// 409 Conflict
apierrors.Conflict(c, "ERROR_CODE", "User-friendly message")

// 500 Internal Server Error (logs error, returns sanitized message)
apierrors.InternalError(c, err)

// 503 Service Unavailable (logs error, returns custom message)
apierrors.ServiceUnavailable(c, "ERROR_CODE", "User-friendly message", internalErr)
```

## HTTP Handling

### Handler Structure
```go
import (
    "errors"
    "net/http"

    "base-server/internal/infra/apierrors"
    "base-server/internal/infra/observability"
    "base-server/internal/yourfeature/processor"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
)

type Handler struct {
    processor processor.SomeProcessor
    logger    *observability.Logger
}

func New(processor processor.SomeProcessor, logger *observability.Logger) Handler {
    return Handler{
        processor: processor,
        logger:    logger,
    }
}

func (h *Handler) HandleSomeAction(c *gin.Context) {
    ctx := c.Request.Context()

    // Get account ID from context (set by auth middleware)
    accountID, ok := h.getAccountID(c)
    if !ok {
        return
    }
    ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

    // Input validation - use apierrors for validation errors
    var req RequestStruct
    if err := c.ShouldBindJSON(&req); err != nil {
        apierrors.ValidationError(c, err)
        return
    }

    // Business logic - processor logs detailed errors
    result, err := h.processor.ProcessAction(ctx, req)
    if err != nil {
        // handleError maps processor errors to API responses
        h.handleError(c, err)
        return
    }

    // Success response
    c.JSON(http.StatusOK, result)
}

// handleError maps processor errors to appropriate API error responses
func (h *Handler) handleError(c *gin.Context, err error) {
    switch {
    case errors.Is(err, processor.ErrNotFound):
        apierrors.NotFound(c, "Resource not found")
    case errors.Is(err, processor.ErrConflict):
        apierrors.Conflict(c, "CONFLICT", "Resource already exists")
    default:
        apierrors.InternalError(c, err)
    }
}

// Helper to extract and validate account ID from context
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

### Request Validation
Use Gin's binding tags for validation:
```go
type EmailSignupRequest struct {
    FirstName string `json:"first_name" binding:"required"`
    LastName  string `json:"last_name" binding:"required"`
    Email     string `json:"email" binding:"required,email"`
    Password  string `json:"password" binding:"required,min=8"`
}
```

### Routing Pattern
```go
func (a *API) RegisterRoutes() {
    apiGroup := a.router.Group("/api")
    {
        authGroup := apiGroup.Group("/auth")
        authGroup.POST("/login/email", a.authHandler.HandleEmailLogin)
        
        protectedGroup := apiGroup.Group("/protected", a.authHandler.HandleJWTMiddleware)
        {
            protectedGroup.GET("/user", a.authHandler.GetUserInfo)
        }
    }
}
```

## Database Operations

### Store Pattern
```go
type Store struct {
    db     *sqlx.DB
    logger *observability.Logger
}

// Use pointer receivers for all Store methods
func (s *Store) GetUserByExternalID(ctx context.Context, externalID uuid.UUID) (User, error) {
    var user User
    query := `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`
    err := s.db.GetContext(ctx, &user, query, externalID)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return User{}, ErrNotFound
        }
        return User{}, fmt.Errorf("failed to get user by external id: %w", err)
    }
    return user, nil
}
```

### List/Query Operations Pattern
**IMPORTANT:** Any store method that returns a slice (`[]T`) MUST initialize the destination with `make([]T, 0)`, not `var xs []T`.

Why: sqlx's `SelectContext` only appends scanned rows to the destination; it does not re-initialize the slice. When the query returns zero rows, a `var`-declared slice stays nil. A nil slice serializes to JSON as `null`, not `[]`, which breaks frontend code that expects an iterable array.

```go
// ❌ BAD — returns null on empty result
func (s *Store) ListThings(ctx context.Context, accountID uuid.UUID) ([]Thing, error) {
    var things []Thing
    if err := s.db.SelectContext(ctx, &things, sqlListThings, accountID); err != nil {
        return nil, fmt.Errorf("failed to list things: %w", err)
    }
    return things, nil
}

// ✅ GOOD — always returns [] on empty result
func (s *Store) ListThings(ctx context.Context, accountID uuid.UUID) ([]Thing, error) {
    things := make([]Thing, 0)
    if err := s.db.SelectContext(ctx, &things, sqlListThings, accountID); err != nil {
        return nil, fmt.Errorf("failed to list things: %w", err)
    }
    return things, nil
}
```

The same rule applies to any slice built in a processor or handler before it is serialized to JSON — early-return paths must use `[]T{}` / `make([]T, 0)`, never a bare `nil`. Error paths may still `return nil, err` since the slice is not serialized.

### Update/Delete Operations Pattern
**IMPORTANT:** All UPDATE and DELETE operations MUST check rows affected and return `ErrNotFound` if no rows were modified.

```go
// Define SQL queries as package-level constants
const sqlDeleteSomething = `
UPDATE something
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
`

func (s *Store) DeleteSomething(ctx context.Context, accountID, id uuid.UUID) error {
    result, err := s.db.ExecContext(ctx, sqlDeleteSomething, id, accountID)
    if err != nil {
        return fmt.Errorf("failed to delete something: %w", err)
    }

    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return fmt.Errorf("failed to get rows affected: %w", err)
    }

    if rowsAffected == 0 {
        return ErrNotFound
    }

    return nil
}
```

**For updates that return the updated entity:**
```go
const sqlUpdateSomething = `
UPDATE something
SET name = COALESCE($3, name), updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
RETURNING id, account_id, name, created_at, updated_at, deleted_at
`

func (s *Store) UpdateSomething(ctx context.Context, accountID, id uuid.UUID, name *string) (Something, error) {
    var result Something
    err := s.db.GetContext(ctx, &result, sqlUpdateSomething, id, accountID, name)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return Something{}, ErrNotFound
        }
        return Something{}, fmt.Errorf("failed to update something: %w", err)
    }
    return result, nil
}
```

**Exception:** Operations that are idempotent by design (e.g., incrementing counters, adding to sets) may skip the rows affected check if the operation can safely succeed on non-existent records.

### Migration Format
Use Flyway-compatible SQL migrations:
- Filename: `V{version}__{description}.sql`
- Example: `V0001__init.sql`
- Always use UUID with `uuid-ossp` extension
- Include `created_at`, `updated_at`, `deleted_at` for soft deletes

## Logging & Observability

### Structured Logging
Use the custom Logger with context-based fields:
```go
logger := observability.NewLogger()
ctx = observability.WithFields(ctx, 
    observability.Field{Key: "user_id", Value: userID},
    observability.Field{Key: "operation", Value: "signup"},
)
logger.Info(ctx, "User signed up successfully")
logger.Error(ctx, "Failed to create user", err)
```

### Middleware
Apply observability middleware for automatic request tracking:
```go
r.Use(observability.Middleware(logger))
```

## External Services

### Client Pattern
```go
type Client struct {
    apiKey string
    logger *observability.Logger
}

func NewClient(apiKey string, logger *observability.Logger) *Client {
    return &Client{
        apiKey: apiKey,
        logger: logger,
    }
}
```

### Service Integration
- **Stripe**: Payment processing and subscriptions (`github.com/stripe/stripe-go/v79`)
- **Resend**: Email sending (`github.com/resendlabs/resend-go`)
- **Google OAuth**: Authentication (`internal/clients/googleoauth`)
- **OpenAI**: AI text/image capabilities (`github.com/openai/openai-go`)
- **Google Gemini**: AI capabilities (`google.golang.org/genai`)
- **Twilio**: Voice and messaging (`github.com/twilio/twilio-go`)
- **Kafka**: Event streaming for webhook delivery (`github.com/segmentio/kafka-go`)

## Configuration

### Environment Variables
Required environment variables (loaded from `env.local` in development):
```bash
# Database
DB_HOST=
DB_USERNAME=
DB_PASSWORD=
DB_NAME=

# Authentication
JWT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Services
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=

# Kafka (Event Streaming)
KAFKA_BROKERS=                         # Comma-separated list (e.g., localhost:9092 or AWS MSK brokers)
KAFKA_TOPIC=webhook-events             # Optional, defaults to 'webhook-events'
KAFKA_CONSUMER_GROUP=webhook-consumers # Optional, defaults to 'webhook-consumers'

# Application
WEBAPP_URI=
SERVER_PORT=
DEFAULT_EMAIL_SENDER_ADDRESS=
```

### Environment Check
```go
if os.Getenv("GO_ENV") != "production" {
    err := godotenv.Load("env.local")
    // Development-specific configuration
}
```

## Build & Deployment

### Build Commands
```bash
# Local build
go build -o server main.go

# Run locally
go run main.go

# Docker build
docker build -t base-server .

# Run with Docker Compose (for services)
docker-compose -f docker-compose.services.yml up
```

### Database Migrations
```bash
# Build migration container
docker build -t flyway-migrate -f dbmigrator.dockerfile .

# Run migrations
docker run --platform linux/amd64 --rm \
  -e DB_HOST=$DB_HOST \
  -e DB_USERNAME=$DB_USERNAME \
  -e DB_PASSWORD=$DB_PASSWORD \
  flyway-migrate
```

### Docker Configuration
- Multi-stage build for minimal image size
- Alpine Linux base for production
- Health check endpoint at `/health`

## Security Patterns

### Authentication
- JWT tokens for session management
- bcrypt for password hashing
- Cookie-based token storage with HttpOnly flag

### Input Validation
- Always validate and sanitize input
- Use Gin's binding tags
- Return generic error messages to clients

### Context Security
```go
// Set secure cookie in production
if os.Getenv("GO_ENV") == "production" {
    c.SetCookie("token", token, 86400, "/", domain, true, true) // Secure, HttpOnly
}
```

## WebSocket Support

### WebSocket API
Separate WebSocket server running on `SERVER_PORT + 1`:
```go
websocketServer := &http.Server{
    Addr:         fmt.Sprintf(":%d", parsedServerPort+1),
    Handler:      x,
    ReadTimeout:  0,  // No timeout for WebSocket
    WriteTimeout: 0,
}
```

## Testing Requirements

**CRITICAL:** All code changes MUST include corresponding tests. Always verify tests pass before considering work complete.

### The Three Test Levels

| Level | Location | What it tests | Dependencies | Command |
|-------|----------|---------------|--------------|---------|
| **Store** | `internal/infra/store/*_test.go` | Every exported store method against real Postgres | Real DB | `make dev-test-store` |
| **Unit** | `internal/*/processor/*_test.go` and `internal/*/handler/*_test.go` | Processor + handler logic with interface mocks | None (mocks) | `make dev-test-unit` |
| **Integration** | `tests/*_test.go` | Real HTTP requests against the real router + real DB, asserting response + DB state | Real DB | `make dev-test-integration` |

### Universal Rules (apply to ALL test levels)

1. **Every test function is table-driven.** Even single-case tests — use a one-element table. Consistency matters more than brevity.

   ```go
   tests := []struct {
       name    string
       setup   func(t *testing.T) inputs
       wantErr error // nil means success
       assert  func(t *testing.T, got result)
   }{
       {name: "happy path", ...},
       {name: "not found", ...},
       {name: "invalid input", ...},
   }
   for _, tt := range tests {
       t.Run(tt.name, func(t *testing.T) { ... })
   }
   ```

2. **`t.Parallel()` on every test function and every sub-test.** Unique UUIDs, no shared state, no shared maps being written to.
3. **`require` for fatal preconditions, `assert` for checks.** `require.NoError` before dereferencing a result; `assert.Equal` for field-level checks.
4. **Name sub-tests after scenarios, not functions.** `"returns 404 when post does not exist"` not `"TestX_case1"`.
5. **Cover happy path AND sad paths.** If the function can fail, there's a test for each failure mode.

### Level 1: Store Tests

**Coverage requirement: every exported method on `*Store` has at least one test.** If you add a store method, add a test in the same PR. A PR that leaves a store method untested gets rejected.

- Use the real Postgres running via `make dev-up` (or `docker-up` in CI).
- Seed via `SetupTestStore(t)` + `createTestAccount(t, s)` helpers in `internal/infra/store/test_helpers_test.go`. Add new helpers there if you need a fresh fixture (e.g. `createTestPost`).
- `if testing.Short() { t.Skip(...) }` at the top so `-short` runs skip store tests.
- Every method gets: happy path + each error branch. CREATE → insert succeeds + constraint violation (unique, FK) when applicable. GET → found + not-found + wrong-account. LIST → populated + empty + filter applied. UPDATE/DELETE → success + not-found (rows_affected=0).
- Use table-driven form even for single-method tests so future cases extend cleanly.

```go
func TestStore_CreatePost(t *testing.T) {
    t.Parallel()
    if testing.Short() { t.Skip("skipping store test in short mode") }

    s := SetupTestStore(t)
    ctx := context.Background()

    tests := []struct {
        name    string
        setup   func(t *testing.T) CreatePostParams
        wantErr error
    }{
        {
            name: "minimum required fields",
            setup: func(t *testing.T) CreatePostParams {
                accountID := createTestAccount(t, s)
                return CreatePostParams{
                    AccountID: accountID, Content: "body",
                    ContentType: ContentTypeText, Status: PostStatusDraft,
                    Source: PostSourceManual,
                }
            },
        },
        {
            name: "with tags and media",
            setup: func(t *testing.T) CreatePostParams {
                accountID := createTestAccount(t, s)
                return CreatePostParams{
                    AccountID: accountID, Content: "body",
                    ContentType: ContentTypeText, Status: PostStatusDraft,
                    Source: PostSourceManual,
                    Tags:   StringArray{"a", "b"},
                }
            },
        },
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            params := tt.setup(t)
            got, err := s.CreatePost(ctx, params)
            if tt.wantErr != nil {
                require.ErrorIs(t, err, tt.wantErr)
                return
            }
            require.NoError(t, err)
            assert.NotEqual(t, uuid.Nil, got.ID)
            assert.Equal(t, params.Content, got.Content)
        })
    }
}
```

### Level 2: Processor / Handler Unit Tests

**Coverage requirement: every public method on every processor and handler has happy + sad path tests.**

- **Mocks are ubermock-generated only.** Every mocked dependency goes through `go.uber.org/mock/mockgen` into `mocks_test.go` **in the same directory as the interface being mocked**. Manual `type mockXxx struct { ... }` definitions are not allowed at this level — if you see one, delete it and regenerate.
- Each processor and handler file carries a `go:generate` directive at the top:
  ```go
  //go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor
  ```
- Regenerate after every interface change:
  ```
  go generate ./internal/<feature>/processor/...
  go generate ./internal/<feature>/handler/...
  ```
- If a handler takes a **concrete processor struct** today, extract an interface in the handler package first, wire the handler to the interface, then add the generate directive and generate the mock. The handler test will mock the interface, not the struct.
- For handler tests, set up a `gin.TestMode` router (gate with `sync.Once` so parallel tests don't race the global), fire the request with `httptest.NewRecorder()`, assert status + body shape.
- Cover every branch of `handleError` — each `errors.Is` case should have a test that hits it.
- Table-driven with a `mocks func(m *MockStore)` field that registers expectations per case:

```go
func TestPostProcessor_GetPost(t *testing.T) {
    accountID := uuid.New()
    postID := uuid.New()
    logger := observability.NewLogger()

    tests := []struct {
        name    string
        mock    func(m *MockPostStore)
        wantErr error
    }{
        {
            name: "happy path",
            mock: func(m *MockPostStore) {
                m.EXPECT().GetPostByID(gomock.Any(), accountID, postID).
                    Return(store.Post{ID: postID, AccountID: accountID}, nil)
            },
        },
        {
            name: "not found maps to ErrPostNotFound",
            mock: func(m *MockPostStore) {
                m.EXPECT().GetPostByID(gomock.Any(), accountID, postID).
                    Return(store.Post{}, store.ErrNotFound)
            },
            wantErr: ErrPostNotFound,
        },
        {
            name: "other store error maps to generic failure",
            mock: func(m *MockPostStore) {
                m.EXPECT().GetPostByID(gomock.Any(), accountID, postID).
                    Return(store.Post{}, errors.New("db exploded"))
            },
            wantErr: ErrFailedGetPost,
        },
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            ctrl := gomock.NewController(t)
            m := NewMockPostStore(ctrl)
            tt.mock(m)
            proc := New(m, NewMockEventPublisher(ctrl), logger)

            _, err := proc.GetPost(context.Background(), accountID, postID)
            if tt.wantErr != nil {
                require.ErrorIs(t, err, tt.wantErr)
                return
            }
            require.NoError(t, err)
        })
    }
}
```

Handler tests follow the same table pattern but fire an HTTP request through the Gin router and assert the status code + JSON body shape.

### Level 3: Integration Tests

**These are real API tests.** Real HTTP client → real Gin router → real Postgres. No store mocks, no recorder — the only mocks allowed are for third-party services we can't hit from CI (Stripe, Resend, GitHub API).

- Tests live in `base-server/tests/*_test.go` with `//go:build integration` so they only run when explicitly requested.
- Boot the router once per test binary via `setupTestServer(t)` — returns `*httptest.Server` with the real dependency graph wired up (real store, real processors, real handlers).
- Seed the DB **directly through the store** in setup helpers, not via HTTP. Example: `seedPost(t, store, accountID, opts)` — faster, clearer intent, doesn't couple the test to the Create endpoint.
- **Cover every status code the endpoint can return.** If the endpoint returns 200/400/401/403/404/409/500 under different conditions, each one has a test row.
- Assert both the HTTP response and, when the endpoint mutates state, the DB row directly via the store.

```go
func TestPostsAPI_GetPost(t *testing.T) {
    t.Parallel()
    srv := setupTestServer(t)

    tests := []struct {
        name       string
        setup      func(t *testing.T) (token string, postID string)
        wantStatus int
        wantBody   func(t *testing.T, body []byte)
    }{
        {
            name: "200 returns the post",
            setup: func(t *testing.T) (string, string) {
                user := seedUser(t, srv.Store)
                post := seedPost(t, srv.Store, user.AccountID, seedPostOpts{Content: "hello"})
                return newJWT(t, user.ID), post.ID.String()
            },
            wantStatus: http.StatusOK,
            wantBody: func(t *testing.T, body []byte) {
                var got store.Post
                require.NoError(t, json.Unmarshal(body, &got))
                assert.Equal(t, "hello", got.Content)
            },
        },
        {
            name: "401 when missing token",
            setup: func(t *testing.T) (string, string) {
                return "", uuid.New().String()
            },
            wantStatus: http.StatusUnauthorized,
        },
        {
            name: "404 for post that does not exist",
            setup: func(t *testing.T) (string, string) {
                user := seedUser(t, srv.Store)
                return newJWT(t, user.ID), uuid.New().String()
            },
            wantStatus: http.StatusNotFound,
        },
        {
            name: "404 for post owned by another account",
            setup: func(t *testing.T) (string, string) {
                me := seedUser(t, srv.Store)
                other := seedUser(t, srv.Store)
                theirPost := seedPost(t, srv.Store, other.AccountID, seedPostOpts{})
                return newJWT(t, me.ID), theirPost.ID.String()
            },
            wantStatus: http.StatusNotFound,
        },
        {
            name: "400 for malformed UUID",
            setup: func(t *testing.T) (string, string) {
                user := seedUser(t, srv.Store)
                return newJWT(t, user.ID), "not-a-uuid"
            },
            wantStatus: http.StatusBadRequest,
        },
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            token, postID := tt.setup(t)
            resp, body := srv.Request(t, http.MethodGet, "/api/protected/posts/"+postID, nil, token)
            assert.Equal(t, tt.wantStatus, resp.StatusCode)
            if tt.wantBody != nil {
                tt.wantBody(t, body)
            }
        })
    }
}
```

### Running Tests

```bash
# Local DB / kafka via docker compose
make dev-up

# Then:
make dev-test-unit         # mocked, fast, no deps
make dev-test-store        # needs dev-up
make dev-test-integration  # needs dev-up

# Fully isolated (matches CI):
make docker-test-all

# Single test:
go test -run TestPostsAPI_GetPost ./tests/... -tags=integration
```

### Before Completing Any Task

1. Run tests at every level you touched: store tests if the store changed, unit tests if a processor or handler changed, integration tests if an endpoint's behavior changed.
2. `go generate ./...` if you changed a processor or handler interface — the gomock mocks need to regenerate.
3. `go test -race -short ./...` before pushing — catches concurrent-write bugs the per-level runs miss.
4. If you add a new store method, a new processor method, a new handler, or a new endpoint, the same PR must add the corresponding test. A PR that ships new surface with zero test coverage is not mergeable.

## Common Patterns to Follow

1. **Always use context**: Pass context through all function calls
2. **Centralized error handling**: Always use `apierrors.RespondWithError()` and `apierrors.RespondWithValidationError()` in handlers
3. **Two-tier logging**: Processors log detailed errors, API layer logs correlation info
4. **Structured errors**: Define errors as package-level variables
5. **Dependency injection**: Use constructor functions for initialization
6. **Graceful shutdown**: Handle OS signals properly
7. **Request tracing**: Use request IDs for debugging
8. **Middleware composition**: Apply cross-cutting concerns via middleware
9. **Resource cleanup**: Use defer for cleanup operations
10. **Configuration validation**: Check all required env vars at startup
11. **Always add tests**: Every code change must include corresponding tests
12. **Verify tests pass**: Run `make test-unit`, `make test-store`, `make test-integration` before completing work