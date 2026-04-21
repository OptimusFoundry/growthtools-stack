# Configuration, Build & Deployment

## Environment Variables

Required variables (loaded from `env.local` in development):

```bash
# Database
DB_HOST=
DB_PORT=
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
