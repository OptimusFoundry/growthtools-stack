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
