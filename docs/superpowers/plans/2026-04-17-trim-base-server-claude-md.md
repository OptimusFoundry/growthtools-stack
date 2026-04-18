# Trim base-server/CLAUDE.md — Split Into Focused Docs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shrink `base-server/CLAUDE.md` from ~990 lines to ~50 lines by extracting detailed reference content into focused doc files that agents load on demand.

**Architecture:** The trimmed CLAUDE.md becomes a quick-reference index (commands + architecture summary + links). Each extracted doc covers one concern in full so agents can read exactly what they need without loading everything at once.

**Tech Stack:** Markdown only — no code changes.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `base-server/docs/ARCHITECTURE.md` | Directory tree, package patterns, naming, imports, DI, context usage |
| Create | `base-server/docs/ERROR-HANDLING.md` | Two-tier error handling, apierrors reference, processor/handler examples |
| Create | `base-server/docs/STORE.md` | sqlx patterns, nil-slice gotcha, update/delete, migration format |
| Create | `base-server/docs/TESTING.md` | Three test levels, table-driven rules, running tests, pre-completion checklist |
| Create | `base-server/docs/CONFIGURATION.md` | Env vars, build commands, deployment, Docker, WebSocket, security |
| Rewrite | `base-server/CLAUDE.md` | Concise index: commands + arch summary + links to docs |

---

### Task 1: Create `base-server/docs/ARCHITECTURE.md`

**Files:**
- Create: `base-server/docs/ARCHITECTURE.md`

- [ ] **Step 1: Write the file**

```markdown
# Architecture & Patterns

## Directory Organization

```
base-server/
├── internal/
│   ├── infra/             # Infrastructure & plumbing (no business logic)
│   │   ├── api/           # API setup and route registration
│   │   ├── apierrors/     # Centralized API error handling
│   │   ├── bootstrap/     # Application bootstrap and initialization
│   │   ├── clients/       # External clients (anthropic, googleoauth, kafka, mail, s3)
│   │   ├── config/        # Configuration management
│   │   ├── email/         # Email service abstraction
│   │   ├── observability/ # Logging, metrics, and tracing
│   │   ├── server/        # HTTP server setup
│   │   ├── store/         # Database layer and models
│   │   └── tiers/         # Subscription tier management
│   ├── platform/          # Social media platform integration
│   │   ├── adapters/      # Platform adapter implementations
│   │   ├── clients/       # Platform API HTTP clients (bluesky, facebook, instagram, linkedin, pinterest, threads, tiktok, x)
│   │   ├── handler/       # HTTP handlers for platform connections
│   │   └── processor/     # Business logic for platform operations
│   ├── billing/           # handler/, processor/, products/, subscriptions/
│   ├── analytics/         # handler/, processor/
│   ├── auth/              # handler/, processor/
│   ├── blog/              # handler/, processor/
│   ├── chat/              # handler/, processor/
│   ├── content/           # handler/, processor/
│   ├── github/            # handler/, processor/
│   ├── media/             # handler/, processor/
│   ├── posts/             # handler/, processor/
│   ├── settings/          # handler/, processor/
│   └── workers/           # Background workers
├── migrations/            # SQL migration files (Flyway format)
├── tests/                 # Integration tests (//go:build integration)
├── main.go
└── go.mod
```

## Package Roles

| Package | Responsibility |
|---------|---------------|
| **handler** | HTTP request handling, input validation, response formatting |
| **processor** | Business logic, orchestration, external service calls |
| **store** | Database operations and models (lives in `internal/infra/store/`) |
| **client** | External API integrations |
| **apierrors** | Centralized API error handling, sanitization, logging |

## Naming Conventions

- **Variables**: camelCase (`userID`, `stripeCustomerID`)
- **Exported functions/types**: PascalCase (`HandleEmailLogin`, `AuthProcessor`)
- **Private functions**: camelCase (`validateToken`, `hashPassword`)
- **Error variables**: `Err` prefix (`ErrEmailAlreadyExists`, `ErrUserNotFound`)
- **Error codes**: `UPPER_SNAKE_CASE` (`USER_NOT_FOUND`, `EMAIL_EXISTS`)
- **Files**: `snake_case.go`

## Import Organization

```go
import (
    // Standard library
    "context"
    "errors"
    "fmt"

    // Internal packages
    "base-server/internal/infra/apierrors"
    "base-server/internal/infra/observability"
    "base-server/internal/infra/store"
    authProcessor "base-server/internal/auth/processor"

    // Third-party
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "go.uber.org/zap"
)
```

## Dependency Injection

All components use constructor-based DI — no global state:

```go
func New(store store.Store, cfg Config, logger *observability.Logger) Processor {
    return Processor{store: store, cfg: cfg, logger: logger}
}
```

## Layered Architecture

1. **HTTP Layer** (handlers): Request/response handling only
2. **Business Layer** (processors): Core business logic, no HTTP concerns
3. **Data Layer** (store): Database operations only

## Context Usage

Always pass and enrich context through the call chain:

```go
ctx = observability.WithFields(ctx,
    observability.Field{Key: "user_id", Value: userID},
    observability.Field{Key: "operation", Value: "get_user"},
)
logger.Info(ctx, "fetching user")
```

## External Client Pattern

```go
type Client struct {
    apiKey string
    logger *observability.Logger
}

func NewClient(apiKey string, logger *observability.Logger) *Client {
    return &Client{apiKey: apiKey, logger: logger}
}
```
```

- [ ] **Step 2: Verify file created**

```bash
wc -l base-server/docs/ARCHITECTURE.md
```

---

### Task 2: Create `base-server/docs/ERROR-HANDLING.md`

**Files:**
- Create: `base-server/docs/ERROR-HANDLING.md`

- [ ] **Step 1: Write the file**

```markdown
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
```

- [ ] **Step 2: Verify**

```bash
wc -l base-server/docs/ERROR-HANDLING.md
```

---

### Task 3: Create `base-server/docs/STORE.md`

**Files:**
- Create: `base-server/docs/STORE.md`

- [ ] **Step 1: Write the file**

```markdown
# Store Layer Patterns

All store code lives in `base-server/internal/infra/store/`.

## Store Method Structure

```go
type Store struct {
    db     *sqlx.DB
    logger *observability.Logger
}

// Pointer receivers on ALL Store methods
func (s *Store) GetUserByID(ctx context.Context, id uuid.UUID) (User, error) {
    var user User
    err := s.db.GetContext(ctx, &user, sqlGetUserByID, id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return User{}, ErrNotFound
        }
        return User{}, fmt.Errorf("failed to get user: %w", err)
    }
    return user, nil
}
```

## SQL Query Constants

Define all queries as package-level constants:

```go
const sqlGetUserByID = `
SELECT id, account_id, email, created_at, updated_at, deleted_at
FROM users
WHERE id = $1 AND deleted_at IS NULL
`
```

Rules:
- Never `SELECT *` — list columns explicitly
- Always include `deleted_at IS NULL` (soft deletes)
- Always include `account_id` in WHERE for multi-tenant isolation
- Use parameterized queries (`$1`, `$2`, etc.)

## List Operations — Nil Slice Gotcha

**CRITICAL:** List methods MUST use `make([]T, 0)`, never `var xs []T`.

`sqlx.SelectContext` only appends — it does not reinitialize the slice. A `var`-declared slice stays `nil` on zero rows. `nil` serializes to JSON as `null`, breaking any frontend code that iterates the result.

```go
// ❌ BAD — returns null on empty result
func (s *Store) ListPosts(ctx context.Context, accountID uuid.UUID) ([]Post, error) {
    var posts []Post
    if err := s.db.SelectContext(ctx, &posts, sqlListPosts, accountID); err != nil {
        return nil, fmt.Errorf("failed to list posts: %w", err)
    }
    return posts, nil
}

// ✅ GOOD — always returns []
func (s *Store) ListPosts(ctx context.Context, accountID uuid.UUID) ([]Post, error) {
    posts := make([]Post, 0)
    if err := s.db.SelectContext(ctx, &posts, sqlListPosts, accountID); err != nil {
        return nil, fmt.Errorf("failed to list posts: %w", err)
    }
    return posts, nil
}
```

The same rule applies to any slice built in a processor or handler before JSON serialization. Error paths may still `return nil, err` since the slice is not serialized.

## Delete Operations (Soft Delete)

Always soft-delete. Always check `RowsAffected` — return `ErrNotFound` if zero:

```go
const sqlDeletePost = `
UPDATE posts
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
`

func (s *Store) DeletePost(ctx context.Context, accountID, id uuid.UUID) error {
    result, err := s.db.ExecContext(ctx, sqlDeletePost, id, accountID)
    if err != nil {
        return fmt.Errorf("failed to delete post: %w", err)
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

## Update Operations (RETURNING)

Use `RETURNING` to get the updated entity. `sql.ErrNoRows` means not found:

```go
const sqlUpdatePost = `
UPDATE posts
SET content = COALESCE($3, content), updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
RETURNING id, account_id, content, created_at, updated_at, deleted_at
`

func (s *Store) UpdatePost(ctx context.Context, accountID, id uuid.UUID, content *string) (Post, error) {
    var result Post
    err := s.db.GetContext(ctx, &result, sqlUpdatePost, id, accountID, content)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return Post{}, ErrNotFound
        }
        return Post{}, fmt.Errorf("failed to update post: %w", err)
    }
    return result, nil
}
```

Use `COALESCE($n, column)` for optional update fields — only updates the column if the argument is non-nil.

**Exception:** Idempotent operations (e.g., counter increments, set additions) may skip the rows-affected check if they're safe to succeed on non-existent records.

## Model Definition

```go
type Post struct {
    ID        uuid.UUID  `db:"id"         json:"id"`
    AccountID uuid.UUID  `db:"account_id" json:"account_id"`
    Content   string     `db:"content"    json:"content"`
    CreatedAt time.Time  `db:"created_at" json:"created_at"`
    UpdatedAt time.Time  `db:"updated_at" json:"updated_at"`
    DeletedAt *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}
```

## Migration Format

Flyway-compatible filenames: `V{version}__{description}.sql`

Example: `V0042__add_posts_table.sql`

Rules:
- Use `uuid-ossp` extension for UUIDs
- Every table gets `created_at`, `updated_at`, `deleted_at` columns
- UUID primary keys (`id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`)
```

- [ ] **Step 2: Verify**

```bash
wc -l base-server/docs/STORE.md
```

---

### Task 4: Create `base-server/docs/TESTING.md`

**Files:**
- Create: `base-server/docs/TESTING.md`

- [ ] **Step 1: Write the file** (extract all testing content from CLAUDE.md verbatim, updating any paths)

Content: Entire "Testing Requirements" section from current `base-server/CLAUDE.md` — the three test levels, universal rules, example test functions, and the "Running Tests" / "Before Completing Any Task" sections. Update `internal/store/` references to `internal/infra/store/`.

- [ ] **Step 2: Verify**

```bash
wc -l base-server/docs/TESTING.md
```

---

### Task 5: Create `base-server/docs/CONFIGURATION.md`

**Files:**
- Create: `base-server/docs/CONFIGURATION.md`

- [ ] **Step 1: Write the file**

```markdown
# Configuration, Build & Deployment

## Environment Variables

Required variables (loaded from `env.local` in development):

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
GOOGLE_AI_API_KEY=

# Kafka (Event Streaming)
KAFKA_BROKERS=                         # Comma-separated (e.g., localhost:9092)
KAFKA_TOPIC=webhook-events             # Defaults to 'webhook-events'
KAFKA_CONSUMER_GROUP=webhook-consumers # Defaults to 'webhook-consumers'

# Application
WEBAPP_URI=
SERVER_PORT=
DEFAULT_EMAIL_SENDER_ADDRESS=
```

## Environment Check

```go
if os.Getenv("GO_ENV") != "production" {
    err := godotenv.Load("env.local")
    // handle err
}
```

## Build Commands

```bash
go build -o server main.go   # Local binary
go run main.go               # Run locally
go build ./...               # Verify all packages compile
go test -race -short ./...   # Fast check before pushing
```

## Docker & Docker Compose

```bash
# Start supporting services (DB, Kafka)
make dev-up

# Build server image
docker build -t base-server .

# Run with compose (full stack)
docker-compose -f docker-compose.services.yml up
```

## Database Migrations

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

Docker config: multi-stage build, Alpine Linux base, health check at `/health`.

## WebSocket Server

Runs on `SERVER_PORT + 1`. Read/write timeouts are set to 0 (no timeout for WebSocket connections).

## Security Patterns

- JWT tokens for session management; bcrypt for password hashing
- Cookie-based token storage with `HttpOnly` flag
- Secure cookies in production:

```go
if os.Getenv("GO_ENV") == "production" {
    c.SetCookie("token", token, 86400, "/", domain, true, true) // Secure + HttpOnly
}
```
- Always use Gin binding tags for input validation
- Return generic error messages to clients (never internal details)
```

- [ ] **Step 2: Verify**

```bash
wc -l base-server/docs/CONFIGURATION.md
```

---

### Task 6: Rewrite `base-server/CLAUDE.md` as Concise Index

**Files:**
- Rewrite: `base-server/CLAUDE.md`

- [ ] **Step 1: Replace entire file**

```markdown
# Go Base Server

## Commands

```bash
go build ./...               # Build
go test ./...                # All unit tests
make dev-up                  # Start Docker services (DB, Kafka)
make dev-test-unit           # Unit tests (mocked, no deps)
make dev-test-store          # Store tests (needs dev-up)
make dev-test-integration    # Integration tests (needs dev-up + go run main.go)
make docker-test-all         # Full isolated run (matches CI)
go run main.go               # Run server locally
```

## Architecture

Handler → Processor → Store (three-layer DI, all constructor-injected)

- **Handler** (`internal/{feature}/handler/`): HTTP in/out only. `ShouldBindJSON` for validation. `handleError` method maps processor errors to `apierrors` responses.
- **Processor** (`internal/{feature}/processor/`): Business logic. Defines a minimal store interface. Package-level `ErrXxx` variables. Enriches context before logging.
- **Store** (`internal/infra/store/`): sqlx DB ops. Pointer receivers. SQL constants. Soft deletes (`deleted_at IS NULL`). `make([]T, 0)` for list results.

## Key Rules

- **Errors:** Use `internal/infra/apierrors` for ALL HTTP errors — never `c.JSON` with raw errors.
- **Lists:** Initialize with `make([]T, 0)`, never `var`. A nil slice serializes as JSON `null`.
- **Update/Delete:** Always check `RowsAffected()` — return `ErrNotFound` if zero.
- **Tests:** Table-driven always. `t.Parallel()` everywhere. gomock only (no hand-rolled mocks).
- **Context:** Pass and enrich through every call. Use `observability.WithFields`.

## Docs

- [Architecture & patterns](docs/ARCHITECTURE.md) — directory structure, naming, DI, context
- [Error handling](docs/ERROR-HANDLING.md) — two-tier pattern, apierrors reference
- [Store & DB patterns](docs/STORE.md) — sqlx patterns, nil-slice gotcha, migrations
- [Testing (3 levels)](docs/TESTING.md) — store/unit/integration tests, running tests
- [Config & deployment](docs/CONFIGURATION.md) — env vars, build, Docker, security
```

- [ ] **Step 2: Verify line count**

```bash
wc -l base-server/CLAUDE.md
# Should be ~45 lines
```

---

## Self-Review

**Spec coverage:**
- ✅ Directory structure → ARCHITECTURE.md
- ✅ Naming + imports → ARCHITECTURE.md
- ✅ DI + layered arch → ARCHITECTURE.md
- ✅ Error handling (full) → ERROR-HANDLING.md
- ✅ HTTP handler structure + routing → summarized in CLAUDE.md, full example in ERROR-HANDLING.md
- ✅ DB operations + nil-slice + update/delete → STORE.md
- ✅ Migration format → STORE.md
- ✅ Logging → ARCHITECTURE.md (context section) + note in ERROR-HANDLING.md
- ✅ External services → ARCHITECTURE.md (client pattern) + CONFIGURATION.md (services list)
- ✅ Env vars + build/deploy → CONFIGURATION.md
- ✅ Security patterns → CONFIGURATION.md
- ✅ WebSocket → CONFIGURATION.md
- ✅ Testing (three levels) → TESTING.md
- ✅ Concise index → new CLAUDE.md

**Placeholder scan:** Task 4 (TESTING.md) says "extract verbatim" — acceptable since the content is already written and the instruction is to copy it exactly, not re-derive it.

**Type consistency:** No cross-task type dependencies in this doc-only plan.
