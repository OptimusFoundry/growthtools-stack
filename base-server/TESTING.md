# Testing Guide

## Overview

The test suite has three levels:

| Level | Location | What it tests | External deps |
|-------|----------|---------------|---------------|
| Unit | `internal/.../processor/`, `internal/.../handler/` | Business logic with gomock | None |
| Store | `internal/infra/store/` | SQL queries against a real Postgres | DB only |
| Integration | `tests/` | Full HTTP API via in-process `httptest.Server` | DB + Kafka |

## Prerequisites

- Go 1.23+
- Docker (for Postgres + Kafka only — no server container needed)

## Quick Start

```bash
# Start Postgres + Kafka + run Flyway migrations
make dev-up

# Run integration tests (server starts in-process automatically)
go test -v -race -tags=integration ./tests/...

# Stop services when done
make dev-down
```

## How It Works

`TestMain` in `tests/main_test.go` bootstraps the entire server in-process:

1. Starts one `httptest.Server` per upstream HTTP client (Google OAuth, GitHub, X, LinkedIn, BlueSky, Facebook, Instagram, Threads, TikTok, Pinterest).
2. Sets env vars (`GOOGLE_OAUTH_TOKEN_URL`, `X_API_BASE`, etc.) so the real client constructors point at those mock servers instead of the internet.
3. Loads `env.test` for the remaining config (DB credentials, JWT secret, etc.).
4. Calls `bootstrap.Initialize()` then `server.New(...).Setup()` to build the real Gin router.
5. Wraps the router in `httptest.NewServer` — no OS port binding, no Docker server image.
6. Opens a direct `*store.Store` handle for seed helpers and DB assertions.

Background workers are **not** started — `server.Start()` is never called. Only HTTP-in/HTTP-out code paths run.

## Running Tests

### Unit tests (no deps)

```bash
go test -short ./internal/.../processor/... ./internal/.../service/...
# or
make dev-test-unit
```

### Store tests (Postgres only)

```bash
make dev-up
go test -race ./internal/infra/store/...
# or after dev-up:
make dev-test-store
```

### Integration tests (Postgres + Kafka)

```bash
make dev-up
go test -v -race -tags=integration ./tests/...
# or:
make dev-test-integration
```

Run a specific test:

```bash
go test -v -race -tags=integration ./tests/... -run TestPostsAPI_CreatePost
```

### All tests in isolated Docker environment (CI-equivalent)

```bash
make docker-test-all
```

This runs `docker-up` (test docker-compose), unit + store + integration tests, then `docker-down`.

## Writing Integration Tests

### Unauthenticated requests

```go
//go:build integration

func TestSomeAPI(t *testing.T) {
    t.Parallel()
    c := testClient(t)

    resp, body := c.Request(t, http.MethodGet, "/health", nil, "")
    require.Equal(t, http.StatusOK, resp.StatusCode)
    _ = body
}
```

### Authenticated requests

Seed a user + account, then sign a JWT:

```go
func TestSomeProtectedAPI(t *testing.T) {
    t.Parallel()
    c := testClient(t)
    u := seedUserWithAccount(t, c.Store)

    resp, body := c.Request(t, http.MethodGet, "/api/protected/user", nil, u.Token)
    require.Equal(t, http.StatusOK, resp.StatusCode)
    _ = body
}
```

### Seeding test data

Use the seed helpers in `helpers_test.go`:

```go
post  := seedPost(t, c.Store, u.AccountID, seedPostOpts{})
blog  := seedBlog(t, c.Store, u.AccountID, seedBlogOpts{})
media := seedMedia(t, c.Store, u.AccountID)
vp    := seedVoiceProfile(t, c.Store, u.AccountID)
conn  := seedPlatformConnection(t, c.Store, u.AccountID, "x")
```

Each seed helper registers a `t.Cleanup` that deletes the row after the test.

### Mock expectations for upstream API calls

When a test exercises a code path that calls an external API, register an expectation before making the request:

```go
func TestPublishToX(t *testing.T) {
    t.Parallel()
    env := testenv.GlobalEnv
    c := testClient(t)
    u := seedUserWithAccount(t, c.Store)
    conn := seedPlatformConnection(t, c.Store, u.AccountID, "x")

    // Tell the X mock what to expect and what to return
    env.X.ExpectCreatePost(t).
        Times(1).
        ReturnJSON(http.StatusCreated, map[string]any{
            "data": map[string]any{"id": "123456", "text": "hello"},
        })

    resp, _ := c.Request(t, http.MethodPost, "/api/protected/posts/"+postID+"/publish", nil, u.Token)
    require.Equal(t, http.StatusOK, resp.StatusCode)
}
```

Available mock handles on `testenv.GlobalEnv`:

| Field | Typed mock | Upstream |
|-------|-----------|---------|
| `GoogleOAuth` | `*mocks.GoogleOAuthMock` | Google OAuth token + userinfo |
| `GitHub` | `*mocks.GitHubMock` | GitHub REST API |
| `X` | `*mocks.XMock` | X (Twitter) API v2 |
| `LinkedIn` | `*mocks.LinkedInMock` | LinkedIn API |
| `BlueSky` | `*mocks.BlueskyMock` | BlueSky AT Protocol |
| `Facebook` | `*mocks.FacebookMock` | Facebook Graph API |
| `Instagram` | `*mocks.InstagramMock` | Instagram Graph API |
| `Threads` | `*mocks.ThreadsMock` | Threads Graph API |
| `TikTok` | `*mocks.TikTokMock` | TikTok Open API |
| `Pinterest` | `*mocks.PinterestMock` | Pinterest API |

### Expectation cardinality

```go
exp := env.X.ExpectCreatePost(t)
exp.Times(1)        // must be called exactly once (fails if 0 or 2+)
exp.AtLeast(1)      // must be called at least once
exp.AnyTimes()      // may be called any number of times (including zero)
```

If no cardinality method is called, the default is `Times(1)`.

### Out-of-scope code paths

The following upstream integrations are **not** mocked and should not be exercised by integration tests:

- **Stripe** — billing endpoints that call Stripe (checkout, portal, webhook)
- **Gemini AI** — content generation endpoints
- **S3** — media upload/download endpoints that hit AWS
- **Resend** — email-sending code paths

Tests for these code paths either use the `//go:build integration` tag and are skipped with `t.Skip(...)`, or they are covered only by unit tests with gomock.

## Test Structure

```
tests/
├── main_test.go          # TestMain: starts in-process server via testenv.Start
├── helpers_test.go       # testClient(), seed helpers, newJWT()
├── auth_test.go
├── analytics_test.go
├── billing_test.go
├── blog_test.go
├── github_test.go
├── media_test.go
├── platforms_test.go
├── posts_test.go
├── settings_test.go
├── mocks/
│   ├── registry.go       # MockServer engine, Expectation builder
│   ├── googleoauth.go
│   ├── github.go
│   ├── x.go
│   ├── linkedin.go
│   ├── bluesky.go
│   ├── facebook.go
│   ├── instagram.go
│   ├── threads.go
│   ├── tiktok.go
│   └── pinterest.go
└── testenv/
    └── env.go            # Env harness: Start/Stop, GlobalEnv, DB handle
```

## Troubleshooting

**`dial tcp 127.0.0.1:5432: connect: connection refused`**
Run `make dev-up` first to start Postgres.

**`dial tcp 127.0.0.1:9092: connect: connection refused`**
Run `make dev-up` first to start Kafka.

**`FAIL: unmatched request: POST /v2/tweets`**
A code path called an upstream API but no `Expect*` was registered for this test. Either add the expectation or verify the test doesn't exercise that code path.

**`FAIL: expected 1 call(s) to POST /v2/tweets, got 0`**
An expectation was registered but the code path was never reached. Check the request path and authentication.

**Tests interfere with each other**
All tests should call `t.Parallel()`. Seed helpers use `t.Cleanup` for row deletion. If two tests share state, use unique seed data (the helpers generate UUIDs for you).
