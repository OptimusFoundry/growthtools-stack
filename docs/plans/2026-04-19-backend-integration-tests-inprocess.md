# Backend Integration Tests — In-Process Refactor

**Goal:** Replace the Docker-running server dependency with an in-process `httptest.Server` backed by the real `server.Router()`, while giving each test typed mock handles for every upstream HTTP client the server calls.

**Scope:** backend-only

---

## Context

Today `base-server/tests/` connects over TCP to a Docker container built from `Dockerfile` and started by `docker-compose.test.yml`. This has four problems: (1) the round-trip through Docker adds 20–60 s of startup overhead on CI; (2) tests that exercise code paths touching third-party APIs either skip those paths or make real network calls; (3) the Docker server image must be rebuilt on every code change; (4) there is no per-test mock-expectation system, so tests that call Stripe, GitHub API, Resend mail, or social platform APIs must avoid those code paths entirely. The refactor eliminates the server container, starts the real router in-process, and provides a fully typed mock layer for every upstream HTTP client.

---

## Non-Goals

- Not rewriting unit tests (`internal/.../processor/`, `internal/.../handler/`); those remain gomock-based.
- Not adopting `testcontainers-go`; Postgres and Kafka stay as external Docker prereqs via `make dev-up`.
- Not mocking the Gemini client — it uses the `google.golang.org/genai` SDK which constructs its own `*http.Client` internally and does not expose a `BaseURL` override through any public config field. Gemini-touching code paths remain out of scope for integration tests.
- Not mocking the S3 client — it uses the AWS SDK v2 which has its own endpoint resolution. S3-touching code paths remain out of scope.
- Not mocking Stripe — billing endpoints that call Stripe remain out of scope.
- Not mocking Kafka — Kafka is an external prereq; the producer simply writes to it.
- Not mocking Resend — the Resend Go SDK (`resend-go/v3`) constructs its own transport internally with no base URL override. Email-touching code paths remain out of scope.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Background workers (Kafka consumers, scheduler, async publisher) keep goroutines running after `httptest.Server` stops, causing data races or panics | Phase 2 harness skips `WorkerManager.StartAll` — the harness calls `bootstrap.Initialize` then `server.New(...).Setup()` but never calls `server.Start()`. Workers are never started. |
| Hidden production clients not enumerated here get `baseURL=""` and make real outbound calls | The mock registry's default handler returns HTTP 500 with a clear message for unregistered hosts. Any client that bypasses the env-var plumbing will call a real host and either time out or get a DNS error — both are loud failures that surface during the first test run. |
| `t.Cleanup` ordering: a test panics after registering expectations but before `t.Cleanup` fires | The mock server's handler records unmatched requests to a slice under a mutex. The `t.Cleanup` drains the slice and calls `t.Errorf`. If the test panicked, `testing.T` marks the test as failed independently; the cleanup still runs (Go's `t.Cleanup` runs even on panic within the test function). |
| Per-test DB state: seeded rows from one test bleed into another | Each test uses `t.Cleanup` to delete its own rows (already present in `helpers_test.go`). The harness also exposes `Env.TruncateAll(t)` for tests that prefer a clean slate. Both are opt-in; nothing is forced. |
| The `facebook` and `instagram` clients use `http.PostForm` (bare `http.DefaultClient`) which ignores the injected `*http.Client` | Phase 1 adds a `baseURL string` field + `httpClient *http.Client` field to both structs and rewrites `PostToFeed`, `PostPhoto`, `CreateMediaContainer`, `PublishMedia` to use `c.httpClient.Do` with the baseURL-prefixed endpoint instead of the hardcoded `graph.facebook.com` URL. |
| The `tiktok` client uses a hardcoded `https://open.tiktokapis.com` URL with no struct field | Phase 1 adds a `baseURL string` field and an `apiBase()` method identical to the pattern used by `x`, `linkedin`, `bluesky`, `threads`, and `pinterest`. |
| The `googleoauth` client has two hardcoded constants (`googleOauthTokenURL`, `https://www.googleapis.com/oauth2/v3/userinfo`) | Phase 1 adds `tokenURL string` and `userinfoURL string` fields initialized to those constants; `buildClients` passes the values from config, which defaults to production values when env vars are unset. |
| The `github` client has two hardcoded constants (`githubAPIBase`, `githubOAuthTokenURL`) | Same pattern: add `apiBase string` and `oauthTokenURL string` fields. |
| Header propagation gaps: if any client constructs its own `*http.Client` instead of using the shared wrapped one, outbound requests will be untagged and mocks will misroute | As part of Phase 1.5, grep for `http.Client{}` / `http.DefaultClient` under `internal/` and convert every hit. The known instances beyond the named clients are: `internal/platform/processor/refresh.go` (3 calls), `internal/platform/processor/oauth.go` (2 calls), `internal/platform/processor/profiles.go` (7 calls), and `internal/platform/adapters/helpers.go` (1 call) — all use `http.DefaultClient`. Phase 1.5 sub-task P1.5-D converts these to use a shared wrapped client threaded through their constructors. A follow-up CI lint rule (e.g., a `go vet` plugin or a simple `grep` gate) to forbid new `http.DefaultClient` uses under `internal/` is feasible and recommended. |
| Worker-initiated outbound calls (no inbound request = no request-ID): tests that exercise worker code paths must either seed a context with a synthetic request-ID or use `ForUserID`/`ForAuth` matchers | Document in TESTING.md. Workers are not started in the harness by default (see first risk row), so this affects only future tests that explicitly invoke worker functions. |

---

## Architecture Summary

### What changes

- **`base-server/internal/infra/config/config.go`** — add `*_BASE_URL` string fields for every mockable upstream: `GoogleOAuthTokenURL`, `GoogleUserInfoURL`, `GitHubAPIBase`, `GitHubOAuthTokenURL`, `XAPIBase`, `LinkedInAPIBase`, `BlueskyPDSHost`, `FacebookGraphBase`, `InstagramGraphBase`, `ThreadsAPIBase`, `TikTokAPIBase`, `PinterestAPIBase`. All default to their production values when unset.
- **`base-server/internal/infra/observability/context.go`** — add exported `RequestIDKey`, `SetRequestID(ctx, id) context.Context`, `GetRequestID(ctx) string` helpers so the RoundTripper (Phase 1.5) can read the request-ID without touching the opaque observability fields bag.
- **`base-server/internal/infra/observability/middleware.go`** — call `SetRequestID(ctx, requestID)` in addition to the existing `WithFields` call so the request-ID is available to the new RoundTripper.
- **`base-server/internal/auth/handler/auth.go`** — call `observability.SetUserID(ctx, sub)` in `HandleJWTMiddleware` alongside the existing `c.Set("User-ID", sub)` so the RoundTripper can read the authenticated user-ID from Go context.
- **`base-server/internal/infra/observability/context.go`** (continued) — add `UserIDKey`, `SetUserID(ctx, id) context.Context`, `GetUserID(ctx) string` alongside the request-ID helpers.
- **`base-server/internal/infra/httpclient/roundtripper.go`** (new) — `TracingTransport` wraps any `http.RoundTripper` and propagates `X-Request-ID` and `X-User-ID` outbound headers from context. Inert when headers are absent.
- **`base-server/internal/infra/bootstrap/clients.go`** — thread new config fields into every client constructor call; delete `NewTestClient` references; wrap the `*http.Client` passed into each client constructor with `httpclient.NewTracingTransport`.
- **Every client under `internal/infra/clients/*` and `internal/platform/clients/*`** — add `baseURL`/`tokenURL`/`userinfoURL` fields + `apiBase()` helper; remove `NewTestClient`. Facebook, Instagram, and TikTok get `baseURL` fields for the first time.
- **`base-server/tests/testenv/`** (new, non-`_test` package) — `Env` harness struct, `Start`/`Stop`, DB handle, `TruncateAll`, `AsUser` helper.
- **`base-server/tests/main_test.go`** (new) — `TestMain` calling `testenv.Start` → `m.Run` → `testenv.Stop`.
- **`base-server/tests/mocks/registry.go`** (new) — generic `MockServer`, `Expectation` builder with ownership tokens, header-based request disambiguation, cleanup hook, unmatched/under-called error reporting.
- **`base-server/tests/mocks/<client>.go`** (new, one per upstream) — typed helper files binding the registry to real endpoint paths.
- **`base-server/tests/helpers_test.go`** — remove `healthCheckOnce`, replace `testClient()` with a function that reads `testenv.GlobalEnv`.
- **`base-server/docker-compose.test.yml`** — remove `server` and `runner` services; keep `db`, `flyway`, `kafka`.
- **`base-server/Makefile`** — simplify `docker-test-integration` and `dev-test-integration` to `go test -tags=integration ./tests/...` after `make dev-up`.
- **`base-server/TESTING.md`** and **`base-server/CLAUDE.md`** — update instructions.

---

## Phase Sequencing and Parallelism

```
Phase 1   (client plumbing)            <- must complete before anything else
Phase 1.5 (outbound tracing headers)   <- depends on Phase 1; can overlap with Phase 2+3
Phase 2   (harness scaffold)           <- can start in parallel with Phase 3
Phase 3   (mock registry engine)       <- can start in parallel with Phase 2
Phase 4   (typed mock files)           <- after Phase 3
Phase 5   (pilot migration)            <- after Phases 1, 1.5, 2, 3, 4
Phase 6   (batch migration)            <- after Phase 5 (template established)
Phase 7   (retire Docker tooling)      <- after Phase 6
```

Phases 2 and 3 have no dependency on each other and can run as parallel haiku agents. Phase 1.5 can start as soon as Phase 1 is complete and run in parallel with Phases 2 and 3. Phase 4 depends on Phase 3. All migration phases (5, 6) depend on all code phases (1–4, 1.5). Phase 7 depends on Phase 6.

---

## Phase 1: Client Base-URL Plumbing

**Goal:** Every client that makes outbound HTTP calls accepts a `BaseURL` from config and defaults to its production URL when unset. `NewTestClient` constructors are deleted from `internal/`.

### P1-A: Config additions

**File:** `base-server/internal/infra/config/config.go`

Add the following struct and Load block. All values use `getEnvWithDefault` so they are optional; unset means production URL.

**New struct to add inside `Config`:**
```go
// ExternalURLs overrides production base URLs for testing.
// Leave empty in production — each client defaults to the real URL.
ExternalURLs ExternalURLsConfig
```

**New struct definition (add after `PlatformsConfig`):**
```go
// ExternalURLsConfig holds optional overrides for upstream API base URLs.
// Used by integration tests to point clients at httptest.Server instances.
// All fields default to the canonical production URL when empty.
type ExternalURLsConfig struct {
    // Google OAuth
    GoogleOAuthTokenURL string // default: https://oauth2.googleapis.com/token
    GoogleUserInfoURL   string // default: https://www.googleapis.com/oauth2/v3/userinfo

    // GitHub
    GitHubAPIBase      string // default: https://api.github.com
    GitHubOAuthTokenURL string // default: https://github.com/login/oauth/access_token

    // Platform API clients
    XAPIBase         string // default: https://api.x.com
    LinkedInAPIBase  string // default: https://api.linkedin.com
    BlueskyPDSHost   string // default: https://bsky.social
    FacebookGraphBase string // default: https://graph.facebook.com
    InstagramGraphBase string // default: https://graph.facebook.com  (same host as FB)
    ThreadsAPIBase   string // default: https://graph.threads.net
    TikTokAPIBase    string // default: https://open.tiktokapis.com
    PinterestAPIBase string // default: https://api.pinterest.com
}
```

**Load block to add (after platform credentials section):**
```go
// External URL overrides (for integration tests; empty = production)
cfg.ExternalURLs.GoogleOAuthTokenURL  = getEnvWithDefault("GOOGLE_OAUTH_TOKEN_URL",   "https://oauth2.googleapis.com/token")
cfg.ExternalURLs.GoogleUserInfoURL    = getEnvWithDefault("GOOGLE_USERINFO_URL",       "https://www.googleapis.com/oauth2/v3/userinfo")
cfg.ExternalURLs.GitHubAPIBase        = getEnvWithDefault("GITHUB_API_BASE",           "https://api.github.com")
cfg.ExternalURLs.GitHubOAuthTokenURL  = getEnvWithDefault("GITHUB_OAUTH_TOKEN_URL",    "https://github.com/login/oauth/access_token")
cfg.ExternalURLs.XAPIBase             = getEnvWithDefault("X_API_BASE",                "https://api.x.com")
cfg.ExternalURLs.LinkedInAPIBase      = getEnvWithDefault("LINKEDIN_API_BASE",         "https://api.linkedin.com")
cfg.ExternalURLs.BlueskyPDSHost       = getEnvWithDefault("BLUESKY_PDS_HOST",          "https://bsky.social")
cfg.ExternalURLs.FacebookGraphBase    = getEnvWithDefault("FACEBOOK_GRAPH_BASE",       "https://graph.facebook.com")
cfg.ExternalURLs.InstagramGraphBase   = getEnvWithDefault("INSTAGRAM_GRAPH_BASE",      "https://graph.facebook.com")
cfg.ExternalURLs.ThreadsAPIBase       = getEnvWithDefault("THREADS_API_BASE",          "https://graph.threads.net")
cfg.ExternalURLs.TikTokAPIBase        = getEnvWithDefault("TIKTOK_API_BASE",           "https://open.tiktokapis.com")
cfg.ExternalURLs.PinterestAPIBase     = getEnvWithDefault("PINTEREST_API_BASE",        "https://api.pinterest.com")
```

### P1-B: googleoauth client

**File:** `base-server/internal/infra/clients/googleoauth/client.go`

**Changes:**
1. Remove the two package-level constants `googleOauthTokenURL` and the inline `"https://www.googleapis.com/oauth2/v3/userinfo"` string.
2. Add fields to `Client`:
   ```go
   tokenURL    string
   userinfoURL string
   ```
3. Change `NewClient` signature:
   ```go
   func NewClient(clientID, clientSecret, redirectURL string, tokenURL, userinfoURL string, logger *observability.Logger) *Client
   ```
   Set `c.tokenURL = tokenURL` and `c.userinfoURL = userinfoURL` in the constructor.
4. Replace `googleOauthTokenURL` with `c.tokenURL` in `GetAccessToken`.
5. Replace the literal URL with `c.userinfoURL` in `GetUserInfo`.
6. Delete `NewTestClient` (no such function exists today in this file — nothing to delete).

### P1-C: github client

**File:** `base-server/internal/infra/clients/github/client.go`

**Changes:**
1. Remove constants `githubAPIBase` and `githubOAuthTokenURL`.
2. Add fields:
   ```go
   apiBase      string
   oauthTokenURL string
   ```
3. Change `NewClient` signature:
   ```go
   func NewClient(clientID, clientSecret, apiBase, oauthTokenURL string, logger *observability.Logger) *Client
   ```
4. Replace every use of `githubAPIBase` with `c.apiBase` and `githubOAuthTokenURL` with `c.oauthTokenURL`.

### P1-D: x client

**File:** `base-server/internal/platform/clients/x/client.go`

**Changes:**
1. `NewClient` already stores credentials only; `baseURL` field already exists (set to `""`).
2. Update `NewClient` to accept an optional `baseURL string` parameter:
   ```go
   func NewClient(apiKey, apiSecret, baseURL string, logger *observability.Logger) *Client
   ```
   Set `c.baseURL = baseURL`.
3. Delete `NewTestClient` entirely.
4. `apiBase()` and `uploadBase()` already check `c.baseURL != ""` — no change needed there.

### P1-E: linkedin client

**File:** `base-server/internal/platform/clients/linkedin/client.go`

**Changes:**
1. Update `NewClient`:
   ```go
   func NewClient(baseURL string, logger *observability.Logger) *Client
   ```
   Set `c.baseURL = baseURL`.
2. Delete `NewTestClient` entirely.
3. `apiBase()` already checks `c.baseURL != ""` — no change needed.

### P1-F: bluesky client

**File:** `base-server/internal/platform/clients/bluesky/client.go`

**Changes:**
1. Update `NewClient`:
   ```go
   func NewClient(baseURL string, logger *observability.Logger) *Client
   ```
   Set `c.baseURL = baseURL`.
2. Delete `NewTestClient` entirely.
3. `host()` already checks `c.baseURL != ""` — no change needed.

### P1-G: facebook client

**File:** `base-server/internal/platform/clients/facebook/client.go`

**Changes:**
1. Add fields to `Client`:
   ```go
   baseURL    string
   httpClient *http.Client
   ```
2. Update `NewClient`:
   ```go
   func NewClient(baseURL string, httpClient *http.Client, logger *observability.Logger) *Client {
       return &Client{
           httpClient: httpClient,
           logger:     logger,
           baseURL:    baseURL,
       }
   }
   ```
   **Rationale:** `*http.Client` is a required positional parameter on every `NewClient` — no `WithHTTPClient` option setter. All client instantiation flows exclusively through `bootstrap/clients.go`; there are no direct callers outside the DI root, so a positional parameter is simpler and safer than an option setter.
3. Add helper:
   ```go
   func (c *Client) graphBase() string {
       if c.baseURL != "" {
           return c.baseURL
       }
       return "https://graph.facebook.com"
   }
   ```
4. Rewrite `PostToFeed` and `PostPhoto` to use `http.NewRequestWithContext` + `c.httpClient.Do` targeting `c.graphBase()+"/v21.0/"+pageID+"/feed"` (and `/photos`), replacing the bare `http.PostForm` call. Encode the form params into the request body with `strings.NewReader(params.Encode())` and set `Content-Type: application/x-www-form-urlencoded`.
5. Rewrite `GetPostInsights` endpoint construction using `c.graphBase()`.

### P1-H: instagram client

**File:** `base-server/internal/platform/clients/instagram/client.go`

**Changes:** Identical pattern to facebook.
1. Add `baseURL string` and `httpClient *http.Client` fields.
2. Update `NewClient(baseURL string, httpClient *http.Client, logger *observability.Logger) *Client` — pass `httpClient` directly rather than constructing `&http.Client{}` internally.
3. Add `func (c *Client) graphBase() string` returning `c.baseURL` or `"https://graph.facebook.com"`.
4. Rewrite `CreateMediaContainer` and `PublishMedia` to use `c.httpClient.Do` rather than bare `http.PostForm`, targeting `c.graphBase()+"/v21.0/"+igAccountID+"/media"` (and `/media_publish`).
5. Rewrite `GetMediaInsights` and `GetPermalink` using `c.graphBase()`.

### P1-I: threads client

**File:** `base-server/internal/platform/clients/threads/client.go`

**Changes:**
1. Update `NewClient`:
   ```go
   func NewClient(baseURL string, logger *observability.Logger) *Client
   ```
   Set `c.baseURL = baseURL`.
2. Delete `NewTestClient`.
3. `apiBase()` already checks `c.baseURL != ""` — no change needed.

### P1-J: tiktok client

**File:** `base-server/internal/platform/clients/tiktok/client.go`

**Changes:**
1. Add fields:
   ```go
   baseURL    string
   httpClient *http.Client
   ```
2. Update `NewClient`:
   ```go
   func NewClient(baseURL string, httpClient *http.Client, logger *observability.Logger) *Client {
       return &Client{
           httpClient: httpClient,
           logger:     logger,
           baseURL:    baseURL,
       }
   }
   ```
3. Add helper:
   ```go
   func (c *Client) apiBase() string {
       if c.baseURL != "" {
           return c.baseURL
       }
       return "https://open.tiktokapis.com"
   }
   ```
4. Replace the hardcoded `"https://open.tiktokapis.com/v2/post/publish/inbox/video/init/"` URL in `InitVideoUpload` with `c.apiBase()+"/v2/post/publish/inbox/video/init/"`.
5. `UploadVideo` takes a caller-provided `uploadURL` — no change needed (the URL comes from the init response).

### P1-K: pinterest client

**File:** `base-server/internal/platform/clients/pinterest/client.go`

**Changes:**
1. Update `NewClient`:
   ```go
   func NewClient(baseURL string, logger *observability.Logger) *Client
   ```
   Set `c.baseURL = baseURL`.
2. Delete `NewTestClient`.
3. `apiBase()` already checks `c.baseURL != ""` — no change needed.

### P1-L: bootstrap/clients.go wiring

**File:** `base-server/internal/infra/bootstrap/clients.go`

Update every constructor call to pass `cfg.ExternalURLs.*`:

```go
c.googleOAuth = googleoauth.NewClient(
    cfg.Auth.GoogleClientID,
    cfg.Auth.GoogleClientSecret,
    cfg.Auth.GoogleRedirectURI,
    cfg.ExternalURLs.GoogleOAuthTokenURL,
    cfg.ExternalURLs.GoogleUserInfoURL,
    logger,
)

c.ghClient = githubclient.NewClient(
    cfg.GitHub.OAuthClientID,
    cfg.GitHub.OAuthClientSecret,
    cfg.ExternalURLs.GitHubAPIBase,
    cfg.ExternalURLs.GitHubOAuthTokenURL,
    logger,
)

c.xClient     = x.NewClient(cfg.Platforms.XAPIKey, cfg.Platforms.XAPISecret, cfg.ExternalURLs.XAPIBase, httpclient.NewTracingClient(), logger)
c.bluesky     = bluesky.NewClient(cfg.ExternalURLs.BlueskyPDSHost, httpclient.NewTracingClient(), logger)
c.linkedin    = linkedin.NewClient(cfg.ExternalURLs.LinkedInAPIBase, httpclient.NewTracingClient(), logger)
c.facebook    = facebook.NewClient(cfg.ExternalURLs.FacebookGraphBase, httpclient.NewTracingClient(), logger)
c.instagram   = instagram.NewClient(cfg.ExternalURLs.InstagramGraphBase, httpclient.NewTracingClient(), logger)
c.threads     = threads.NewClient(cfg.ExternalURLs.ThreadsAPIBase, httpclient.NewTracingClient(), logger)
c.tiktok      = tiktok.NewClient(cfg.ExternalURLs.TikTokAPIBase, httpclient.NewTracingClient(), logger)
c.pinterest   = pinterest.NewClient(cfg.ExternalURLs.PinterestAPIBase, httpclient.NewTracingClient(), logger)
```

Also update the OAuth config `TokenURL` fields in `c.oauthConfigs` to source from `cfg.ExternalURLs.*`:
- `"x"` → `TokenURL: cfg.ExternalURLs.XAPIBase + "/2/oauth2/token"`
- `"linkedin"` → `TokenURL: cfg.ExternalURLs.LinkedInAPIBase + "/oauth/v2/accessToken"`
- `"threads"` → `TokenURL: cfg.ExternalURLs.ThreadsAPIBase + "/oauth/access_token"`

The `"facebook"` and `"instagram"` `oauthConfigs.TokenURL` values remain hardcoded to `"https://graph.facebook.com/v21.0/oauth/access_token"`. The Facebook/Instagram OAuth exchange flow is out of scope for integration tests (no test currently exercises that path), so routing it through `ExternalURLs` adds complexity with no benefit. Revisit if a test for the OAuth callback endpoint is ever added.

(Pinterest and TikTok token URLs are handled by the `golang.org/x/oauth2` library using their own hardcoded AuthURL/TokenURL in `oauthConfigs`; those remain hardcoded strings in `clients.go`.)

Note: the `httpclient.NewTracingTransport` wrapping described in Phase 1.5 is applied here in `clients.go` — it is a separate sub-task (P1.5-C) so that Phase 1 and Phase 1.5 can be reviewed independently.

### P1 Acceptance Criteria

- `cd base-server && go build ./...` passes with no compilation errors.
- `grep -r "NewTestClient" base-server/internal/` returns no matches.

---

## Phase 1.5: Outbound Tracing Headers

**Goal:** A production improvement shipped for its own sake. Every outbound HTTP call made by an internal client propagates `X-Request-ID` and `X-User-ID` from the Go `context.Context` into the request headers. This gives downstream services (and, in tests, mock servers) a reliable way to identify which inbound request triggered an outbound call — enabling parallel integration tests to disambiguate mock expectations by request-ID.

This phase has three concerns: (a) exporting the request-ID and user-ID from the context so the RoundTripper can read them; (b) writing the RoundTripper; (c) wiring every `*http.Client` through it; (d) converting all bare `http.DefaultClient` calls in processor/adapter code to use a shared wrapped client.

### P1.5-A: Export request-ID and user-ID context helpers

**File:** `base-server/internal/infra/observability/context.go`

The existing `observability.WithFields` stores a bag of `Field` pairs under an unexported key. The RoundTripper cannot efficiently extract a single named value from that bag, so add dedicated typed accessors alongside the existing bag API.

**Add to the bottom of the file (do not remove anything existing):**

```go
// requestIDCtxKey and userIDCtxKey are unexported so callers must use the typed
// helpers below, preventing key collisions from other packages.
type requestIDCtxKey struct{}
type userIDCtxKey struct{}

// SetRequestID stores a request-ID in ctx, returning the new context.
// Called by observability.Middleware after generating or reading X-Request-ID.
func SetRequestID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, requestIDCtxKey{}, id)
}

// GetRequestID returns the request-ID stored by SetRequestID, or "" if absent.
func GetRequestID(ctx context.Context) string {
    if id, ok := ctx.Value(requestIDCtxKey{}).(string); ok {
        return id
    }
    return ""
}

// SetUserID stores an authenticated user-ID (UUID string) in ctx, returning the new context.
// Called by auth.HandleJWTMiddleware after validating the JWT.
func SetUserID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, userIDCtxKey{}, id)
}

// GetUserID returns the user-ID stored by SetUserID, or "" if absent (unauthenticated).
func GetUserID(ctx context.Context) string {
    if id, ok := ctx.Value(userIDCtxKey{}).(string); ok {
        return id
    }
    return ""
}
```

### P1.5-B: Call SetRequestID and SetUserID in middleware

**File:** `base-server/internal/infra/observability/middleware.go`

In the `Middleware` function, after the block that sets `requestID`, add:
```go
ctx = SetRequestID(ctx, requestID)
```
This goes immediately after `c.Request.Header.Set("X-Request-ID", requestID)` and before `ctx = WithFields(ctx, ...)`.

**File:** `base-server/internal/auth/handler/auth.go`

In `HandleJWTMiddleware`, after `c.Set("User-ID", sub)` (line 126), add:
```go
ctx = observability.SetUserID(ctx, sub)
```
The updated `ctx` is already stored back via `c.Request = c.Request.WithContext(ctx)` on line 134 — ensure this line appears after both the `c.Set` calls and the new `SetUserID` call. The import of `base-server/internal/infra/observability` is already present.

### P1.5-C: TracingTransport RoundTripper

**File:** `base-server/internal/infra/httpclient/roundtripper.go` (new file, new package)

**Package:** `package httpclient`

```go
package httpclient

import (
    "net/http"

    "base-server/internal/infra/observability"
)

// TracingTransport is an http.RoundTripper that reads X-Request-ID and X-User-ID
// from the request's context and adds them as outbound headers. It is inert when
// the context does not carry those values (e.g., worker-initiated calls at boot).
//
// Wrap any *http.Client's Transport with NewTracingTransport before passing it to
// a client constructor. The wrapped transport falls back to http.DefaultTransport
// when inner is nil.
type TracingTransport struct {
    inner http.RoundTripper
}

// NewTracingTransport returns a TracingTransport wrapping inner.
// Pass nil to wrap http.DefaultTransport.
func NewTracingTransport(inner http.RoundTripper) *TracingTransport {
    if inner == nil {
        inner = http.DefaultTransport
    }
    return &TracingTransport{inner: inner}
}

// NewTracingClient returns an *http.Client whose Transport is a TracingTransport
// wrapping http.DefaultTransport. Use this as the default constructor in bootstrap.
func NewTracingClient() *http.Client {
    return &http.Client{Transport: NewTracingTransport(nil)}
}

// RoundTrip implements http.RoundTripper.
func (t *TracingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
    ctx := req.Context()

    if id := observability.GetRequestID(ctx); id != "" {
        // Clone the request so we do not mutate the caller's headers.
        req = req.Clone(ctx)
        req.Header.Set("X-Request-ID", id)
    }
    if uid := observability.GetUserID(ctx); uid != "" {
        if req.Header == nil {
            req = req.Clone(ctx)
        }
        req.Header.Set("X-User-ID", uid)
    }

    return t.inner.RoundTrip(req)
}
```

**Note on the Clone guard:** `req.Clone` is called at most once (if both headers are present the second block reuses the already-cloned request because `req` was reassigned). The implementation should be written so the clone happens once. A cleaner implementation clones unconditionally when either value is non-empty:

```go
func (t *TracingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
    ctx := req.Context()
    reqID := observability.GetRequestID(ctx)
    userID := observability.GetUserID(ctx)

    if reqID != "" || userID != "" {
        req = req.Clone(ctx)
        if reqID != "" {
            req.Header.Set("X-Request-ID", reqID)
        }
        if userID != "" {
            req.Header.Set("X-User-ID", userID)
        }
    }
    return t.inner.RoundTrip(req)
}
```

Use the second (cleaner) form.

### P1.5-D: Wire TracingTransport into all client constructors

**File:** `base-server/internal/infra/bootstrap/clients.go`

Replace every `&http.Client{}` construction (and the `httpClient: &http.Client{}` field assignments) that is passed into a client constructor with `httpclient.NewTracingClient()`:

The clients whose constructors currently receive a plain `*http.Client` from `bootstrap/clients.go` (after Phase 1 plumbing is applied) are:

| Client | Constructor field | Change |
|--------|------------------|--------|
| `googleoauth` | internal `httpClient` set inside its own `NewClient` | `googleoauth.NewClient` should accept an `*http.Client` parameter — update signature to accept one, and bootstrap passes `httpclient.NewTracingClient()` |
| `github` | internal `httpClient: &http.Client{}` in its own `NewClient` | same — accept `*http.Client`, bootstrap passes `httpclient.NewTracingClient()` |
| `facebook` | `httpClient *http.Client` field in `NewClient` (added in P1-G) | bootstrap passes `httpclient.NewTracingClient()` |
| `instagram` | same (added in P1-H) | bootstrap passes `httpclient.NewTracingClient()` |
| `tiktok` | same (added in P1-J) | bootstrap passes `httpclient.NewTracingClient()` |
| `x` | `httpClient: &http.Client{}` in its own `NewClient` | accept `*http.Client`, bootstrap passes `httpclient.NewTracingClient()` |
| `linkedin` | `httpClient: &http.Client{}` in its own `NewClient` | accept `*http.Client`, bootstrap passes `httpclient.NewTracingClient()` |
| `bluesky` | `httpClient: &http.Client{}` in its own `NewClient` | accept `*http.Client`, bootstrap passes `httpclient.NewTracingClient()` |
| `threads` | `httpClient: &http.Client{}` in its own `NewClient` | accept `*http.Client`, bootstrap passes `httpclient.NewTracingClient()` |
| `pinterest` | `httpClient: &http.Client{}` in its own `NewClient` | accept `*http.Client`, bootstrap passes `httpclient.NewTracingClient()` |

The pattern for each client constructor is:
```go
// Before (inside client's NewClient):
httpClient: &http.Client{}

// After (accept parameter):
func NewClient(..., httpClient *http.Client, logger *observability.Logger) *Client {
    return &Client{httpClient: httpClient, ...}
}
```

Bootstrap then passes `httpclient.NewTracingClient()` at every call site.

**Decision locked (no option setter):** `*http.Client` is a required positional parameter on every `NewClient(...)` call — not an option setter. Rationale: all client instantiation flows exclusively through `bootstrap/clients.go`; there are no direct callers outside the DI root. A positional parameter is simpler and removes any ambiguity about whether the transport is applied.

### P1.5-E: Convert bare http.DefaultClient calls in processor/adapter code

The following files use `http.DefaultClient.Do(req)` directly, bypassing both the base-URL override and the tracing transport. They must be converted.

**Files to modify:**
- `base-server/internal/platform/processor/refresh.go` (3 `http.DefaultClient.Do` calls — token refresh for LinkedIn, TikTok, and Pinterest)
- `base-server/internal/platform/processor/oauth.go` (2 `http.DefaultClient.Do` calls — TikTok and Pinterest OAuth token exchange)
- `base-server/internal/platform/processor/profiles.go` (7 `http.DefaultClient.Do` calls — profile fetching across platforms)
- `base-server/internal/platform/adapters/helpers.go` (1 `http.DefaultClient.Do` call — helper used by platform adapters)

**Change pattern:** The `PlatformProcessor` struct (and related processor structs) must gain an `httpClient *http.Client` field. Bootstrap injects `httpclient.NewTracingClient()`. Each file replaces `http.DefaultClient.Do(req)` with `p.httpClient.Do(req)`.

Because these processors are instantiated in `bootstrap/processors.go`, that file must also be updated to pass the shared `*http.Client`. The shared client should be constructed once in `bootstrap/clients.go` and passed through:

```go
// In bootstrap/clients.go, add:
c.tracingHTTPClient = httpclient.NewTracingClient()

// In bootstrap/processors.go, inject into PlatformProcessor:
platformProcessor := platformprocessor.New(
    store,
    clients.tracingHTTPClient,
    // ... other deps ...
    logger,
)
```

### P1.5 Acceptance Criteria

1. **Build:** `cd base-server && go build ./...` passes.
2. **Smoke — authenticated inbound request propagates both headers:** A unit test in `base-server/internal/infra/httpclient/roundtripper_test.go` creates a context with both `SetRequestID` and `SetUserID`, wraps a `http.RoundTripper` that records headers, calls `RoundTrip`, and asserts both `X-Request-ID` and `X-User-ID` are present on the outbound request.
3. **Smoke — pre-auth request propagates only X-Request-ID:** Same test, context has `SetRequestID` but no `SetUserID`. Assert `X-Request-ID` is present and `X-User-ID` is absent.
4. **Smoke — no-context call produces no test headers:** Context has neither value. Assert neither header is added.
5. **DefaultClient audit:** `grep -rn "http\.DefaultClient" base-server/internal/` returns no matches (all converted in P1.5-E).
6. **No bare http.Client{} in bootstrap:** `grep -n "http\.Client{}" base-server/internal/infra/bootstrap/` returns no matches.

---

## Phase 2: Harness Scaffold

**Goal:** Create `base-server/tests/testenv/` — a non-`_test` package providing the global test environment, in-process server, and DB handle. Create `base-server/tests/main_test.go` with `TestMain`.

### P2-A: testenv package

**File:** `base-server/tests/testenv/env.go`

**Package:** `package testenv` (not `package testenv_test` — must be importable)

**Struct and constructor signatures:**

```go
// Env is the single global test harness. It holds the in-process server URL,
// a direct DB handle for seeding, and per-client mock handles.
type Env struct {
    // BaseURL is the URL of the httptest.Server wrapping the real gin router.
    BaseURL string

    // DB is a direct sqlx handle to the same Postgres instance the server uses.
    // Use it for seeding and assertions; do not use it for application logic.
    DB *store.Store

    // Mock handles — one per upstream client.
    GoogleOAuth *mocks.MockServer
    GitHub      *mocks.MockServer
    X           *mocks.MockServer
    LinkedIn    *mocks.MockServer
    Bluesky     *mocks.MockServer
    Facebook    *mocks.MockServer
    Instagram   *mocks.MockServer
    Threads     *mocks.MockServer
    TikTok      *mocks.MockServer
    Pinterest   *mocks.MockServer

    // internal
    httpServer *httptest.Server
    deps       *bootstrap.Dependencies
}

// GlobalEnv is set by Start and read by testClient() in helpers_test.go.
var GlobalEnv *Env

// Start initialises the full environment: mock servers, config, bootstrap,
// gin router, httptest.Server. Sets GlobalEnv. Must be called from TestMain.
func Start(m *testing.M) *Env

// Stop shuts down the httptest.Server and all mock servers cleanly.
// Must be called from TestMain after m.Run() returns.
func (e *Env) Stop()

// TruncateAll truncates all application tables in dependency order.
// Call at the start of a test that needs a fully clean DB rather than
// per-row cleanup.
func (e *Env) TruncateAll(t *testing.T)

// AsUser returns an AuthedClient that signs requests with a JWT for the given
// userID (UUID string) and stamps a unique X-Request-ID on every call.
// Each method returns the stamped request-ID as its second return value so
// tests can bind mock expectations to that exact ID for parallel safety.
//
// Example:
//
//   client := env.AsUser(t, userID)
//   resp, reqID, err := client.Get("/api/protected/posts")
//   env.X.Expect(t, http.MethodPost, "/2/tweets").
//       ForRequestID(reqID).Times(1, t).ReturnJSON(201, ...)
func (e *Env) AsUser(t *testing.T, userID string) *AuthedClient

// AuthedClient wraps an authenticated HTTP client bound to a specific user.
// Every method generates a fresh X-Request-ID and returns it as a string so
// the caller can pass it to mock expectations via ForRequestID.
type AuthedClient struct {
    baseURL string
    // unexported: jwt cookie value + underlying http.Client
}

// Do executes req against the in-process server. It stamps a fresh UUID v4 as
// X-Request-ID on the request (overwriting any existing value) and sets the
// JWT as a `token` cookie. Returns the response, the stamped request-ID, and
// any transport error.
func (c *AuthedClient) Do(req *http.Request) (*http.Response, string, error)

// Get issues a GET to path (relative, e.g. "/api/protected/posts") and returns
// (response, requestID, error). A fresh X-Request-ID is generated per call.
func (c *AuthedClient) Get(path string) (*http.Response, string, error)

// PostJSON marshals body to JSON, issues a POST to path with
// Content-Type: application/json, and returns (response, requestID, error).
// A fresh X-Request-ID is generated per call.
func (c *AuthedClient) PostJSON(path string, body any) (*http.Response, string, error)

// Delete issues a DELETE to path and returns (response, requestID, error).
// A fresh X-Request-ID is generated per call.
func (c *AuthedClient) Delete(path string) (*http.Response, string, error)
```

**`Start` behaviour (prose, not code):**
1. Read `env.test` by setting `GO_ENV=test` so `config.Load()` picks it up (or call `godotenv.Load("env.test")` directly before `config.Load()`).
2. Start one `mocks.NewMockServer()` for each upstream. Each returns an `*httptest.Server` plus a `*mocks.MockServer` handle.
3. Set env vars:
   - `GOOGLE_OAUTH_TOKEN_URL` → GoogleOAuth mock server URL + `/token`
   - `GOOGLE_USERINFO_URL` → GoogleOAuth mock server URL + `/userinfo`
   - `GITHUB_API_BASE` → GitHub mock server URL
   - `GITHUB_OAUTH_TOKEN_URL` → GitHub mock server URL + `/login/oauth/access_token`
   - `X_API_BASE` → X mock server URL
   - `LINKEDIN_API_BASE` → LinkedIn mock server URL
   - `BLUESKY_PDS_HOST` → Bluesky mock server URL
   - `FACEBOOK_GRAPH_BASE` → Facebook mock server URL
   - `INSTAGRAM_GRAPH_BASE` → Instagram mock server URL
   - `THREADS_API_BASE` → Threads mock server URL
   - `TIKTOK_API_BASE` → TikTok mock server URL
   - `PINTEREST_API_BASE` → Pinterest mock server URL
4. Call `config.Load()` — picks up DB settings from `env.test` and mock URLs from the env vars just set.
5. Call `bootstrap.Initialize(ctx, cfg, logger)` — wires all clients (now pointing at mocks), processors, handlers.
6. Build a `server.New(cfg, deps, logger)`, call `.Setup()`, wrap with `httptest.NewServer(srv.Router())`.
7. Open a direct DB store with the same connection string as `cfg.Database.ConnectionString()`.
8. Populate `GlobalEnv` and return `*Env`.

**`AsUser` behaviour:**
- Generates a JWT signed with the same `JWT_SECRET` from `env.test` for the given `userID`.
- Returns an `AuthedClient` wrapping a fresh `*http.Client` with a custom `http.RoundTripper` that: (a) sets the JWT as a `token` cookie on every request; (b) generates a fresh UUID v4 as `X-Request-ID` for each individual call (not shared across calls); (c) stamps the `X-Request-ID` header.
- Each of `Do`, `Get`, `PostJSON`, and `Delete` generates its own UUID v4, stamps it on the outbound request, and returns it as the second return value. There is no global `CurrentRequestID()` on `Env` — concurrent requests in the same test each get a distinct ID via distinct method calls.
- The `X-Request-ID` stamped by the `AuthedClient` travels through the in-process server's `observability.Middleware` (which reads it and stores it via `SetRequestID`) and then out through the `TracingTransport` into mock server calls — this is the chain that enables header-based mock disambiguation.

**`TruncateAll` behaviour:**
Execute the following SQL in a single `ExecContext` call (order respects FK constraints):
```sql
TRUNCATE TABLE
    post_platform_results,
    scheduled_post_platforms,
    scheduled_posts,
    platform_connections,
    github_commits,
    github_repos,
    github_connections,
    voice_profiles,
    media,
    blog_posts,
    posts,
    billing_events,
    subscriptions,
    accounts,
    email_auth,
    user_auth,
    users
RESTART IDENTITY CASCADE;
```

### P2-B: TestMain

**File:** `base-server/tests/main_test.go`

```go
//go:build integration

package tests

import (
    "os"
    "testing"

    "base-server/tests/testenv"
)

func TestMain(m *testing.M) {
    env := testenv.Start(m)
    code := m.Run()
    env.Stop()
    os.Exit(code)
}
```

### P2-C: Rewire helpers_test.go

**File:** `base-server/tests/helpers_test.go`

**Changes:**
1. Remove `var healthCheckOnce sync.Once` and the entire `healthCheckOnce.Do(...)` block inside `testClient`.
2. Remove the DB connection string block that re-opens a `store.Store` — use `testenv.GlobalEnv.DB` instead.
3. Replace `testClient` body with:
   ```go
   func testClient(t *testing.T) *Client {
       t.Helper()
       return &Client{
           baseURL: testenv.GlobalEnv.BaseURL,
           http:    &http.Client{Timeout: 15 * time.Second},
           Store:   testenv.GlobalEnv.DB,
       }
   }
   ```
4. Remove `envOrDefault` calls for `TEST_API_HOST` and `TEST_API_PORT` (no longer needed). Keep `envOrDefault` for `JWT_SECRET` inside `newJWT` — it still reads from env so the test can set `JWT_SECRET=test-jwt-secret-for-testing-only` in `env.test`.

### P2 Acceptance Criteria

- Package compiles: `cd base-server && go build ./tests/testenv/...` passes.
- `main_test.go` compiles with `//go:build integration` tag.

---

## Phase 3: Mock Registry Engine

**Goal:** A generic, reusable mock HTTP server and expectation builder with per-test ownership and header-based request disambiguation. Lives in a non-`_test` package so `testenv` can import it.

### Design rationale for parallelism support

With `t.Parallel()` allowed in integration tests, multiple tests can be in-flight simultaneously, each making requests to the same shared mock servers. Two mechanisms prevent expectation cross-contamination:

1. **Ownership tokens:** every `Expect(...)` call captures the calling test's name via `t.Name()` as an owner token. `t.Cleanup` only verifies and removes expectations owned by the current test.
2. **Header-based matching order:** when a request arrives at the mock, matching prefers expectations whose filter matches the `X-Request-ID` header first, then `X-User-ID`, then `Authorization`, then falls back to FIFO across all owners for `(method, path)`. This ensures that parallel tests with distinct request-IDs (stamped by `env.AsUser`) do not steal each other's expectations.

### P3-A: Registry

**File:** `base-server/tests/mocks/registry.go`

**Package:** `package mocks`

**Complete struct and method signatures:**

```go
// MockServer wraps an httptest.Server with a per-test expectation queue.
// One MockServer instance per upstream service; shared across all tests.
// Tests register expectations before making API calls; t.Cleanup fires per-test
// verification and removal.
type MockServer struct {
    Server    *httptest.Server // expose so testenv can read .URL
    mu        sync.Mutex
    queues    map[string][]*Expectation // key: "METHOD /path"
    unmatched []unmatchedRequest
}

type unmatchedRequest struct {
    method  string
    path    string
    headers http.Header
}

// Expectation represents a single registered HTTP interaction.
type Expectation struct {
    method      string
    path        string
    ownerToken  string     // t.Name() of the registering test
    minTimes    int        // 0 = any; set by Times/AtLeast
    maxTimes    int        // -1 = unlimited; set by AnyTimes; >0 set by Times
    callCount   int
    statusCode  int
    body        []byte
    contentType string
    bodyMatcher func(body []byte) error

    // Header filters — used for matching priority (see matching order below).
    // Only one of these will typically be set per expectation.
    filterRequestID string // match if X-Request-ID == this value
    filterUserID    string // match if X-User-ID == this value
    filterAuth      string // match if Authorization == this value

    owner *MockServer
}

// NewMockServer creates and starts a new httptest.Server with the mock handler.
func NewMockServer() *MockServer

// Expect registers a new expectation for the given method and path.
// The expectation is owned by the calling test (t.Name()).
// Returns *Expectation for chaining.
// Must call Times, AtLeast, or AnyTimes to complete registration and bind t.Cleanup.
func (m *MockServer) Expect(t *testing.T, method, path string) *Expectation

// --- Header filter helpers (call before Times/AtLeast/AnyTimes) ---

// ForRequestID constrains this expectation to only match requests whose
// X-Request-ID header equals id. Used by AsUser-based test flows.
func (e *Expectation) ForRequestID(id string) *Expectation

// ForUserID constrains this expectation to only match requests whose
// X-User-ID header equals id. Used for worker-initiated calls.
func (e *Expectation) ForUserID(id string) *Expectation

// ForAuth constrains this expectation to only match requests whose
// Authorization header equals token.
func (e *Expectation) ForAuth(token string) *Expectation

// --- Call count requirements (bind t.Cleanup) ---

// Times sets an exact call count requirement and registers t.Cleanup.
// The cleanup calls t.Errorf if callCount != n at cleanup time.
func (e *Expectation) Times(n int, t *testing.T) *Expectation

// AtLeast sets a minimum call count requirement and registers t.Cleanup.
// The cleanup calls t.Errorf if callCount < n at cleanup time.
func (e *Expectation) AtLeast(n int, t *testing.T) *Expectation

// AnyTimes marks the expectation as optional (0 or more calls) and registers
// t.Cleanup. No error is produced regardless of call count.
func (e *Expectation) AnyTimes(t *testing.T) *Expectation

// --- Response configuration ---

// Return sets the HTTP status code and raw body bytes to respond with.
func (e *Expectation) Return(statusCode int, body []byte) *Expectation

// ReturnJSON marshals v to JSON and sets Content-Type: application/json.
func (e *Expectation) ReturnJSON(statusCode int, v any) *Expectation

// ReturnStatus sets only the status code with an empty body.
func (e *Expectation) ReturnStatus(statusCode int) *Expectation

// AssertBodyJSON registers an optional body-matcher that is called when
// the expectation matches a request. Return a non-nil error to fail the test
// and send HTTP 400 back so the server-under-test receives a failure signal.
func (e *Expectation) AssertBodyJSON(fn func(body []byte) error) *Expectation
```

**Handler behaviour — matching order (prose):**

When a request arrives at the mock server's HTTP handler:

1. Lock the mutex.
2. Look up all expectations in `queues["METHOD /path"]` whose `maxTimes` has not been exhausted (i.e., `maxTimes == -1` or `callCount < maxTimes`).
3. If no candidates exist: record an `unmatchedRequest` and respond HTTP 500 with body `{"error":"unexpected request: METHOD /path"}`. Unlock and return.
4. Evaluate candidate expectations in the following priority order, returning the first match:
   - **Priority 1 — Request-ID match:** candidate has `filterRequestID != ""` and the request's `X-Request-ID` header equals it.
   - **Priority 2 — User-ID match:** candidate has `filterUserID != ""` and the request's `X-User-ID` header equals it.
   - **Priority 3 — Auth match:** candidate has `filterAuth != ""` and the request's `Authorization` header equals it.
   - **Priority 4 — FIFO unfiltered:** candidate has no header filters set (all filter fields are `""`). Return the first such candidate in queue order.
5. If no candidate matches after all priorities: record `unmatchedRequest` and respond HTTP 500. Unlock and return.
6. Increment `e.callCount`. If `e.bodyMatcher != nil`, read the request body; if the matcher returns a non-nil error, respond HTTP 400 + error text and do NOT increment `callCount` (the expectation was not satisfied). Otherwise respond with `e.statusCode`, `e.contentType`, and `e.body`.
7. If the expectation has `maxTimes > 0` and `callCount >= maxTimes`, remove it from the queue.
8. Unlock.

**`t.Cleanup` behaviour:**

- `Times(n, t)` registers `t.Cleanup` that asserts `e.callCount == n`; calls `t.Errorf` if not. Removes the expectation from the queue.
- `AtLeast(n, t)` registers `t.Cleanup` that asserts `e.callCount >= n`; calls `t.Errorf` if not. Removes the expectation from the queue.
- `AnyTimes(t)` registers `t.Cleanup` that simply removes the expectation from the queue (no error check).
- A top-level `t.Cleanup` registered by `testenv.Start` for each mock server calls `m.drainUnmatched(t)` which calls `t.Errorf` for each unmatched entry accumulated during that test.

**`Stop` method on `MockServer`:**
```go
func (m *MockServer) Stop()
```
Calls `m.Server.Close()`.

### P3 Acceptance Criteria

- `cd base-server && go build ./tests/mocks/...` passes.

---

## Phase 4: Typed Per-Client Mock Files

**Goal:** One file per upstream under `base-server/tests/mocks/`, exporting typed helper methods that bind the generic registry to the exact endpoint paths the real client calls. This makes `tests/mocks/` a live catalog of upstream dependencies.

The typed helpers take an explicit `requestID` string (returned by `AuthedClient.Do`/`Get`/`PostJSON`/`Delete`) so they bind to the exact request even when `t.Parallel()` is in use. The recommended usage pattern in a test is:

```go
// Register the mock expectation BEFORE making the call (the expectation
// fires when the server makes the outbound call, which happens synchronously
// within the inbound request handler).
// Then make the call, capturing the returned requestID.
env.GitHub.ExpectGetAuthenticatedUser(t).
    Times(1, t).
    ReturnJSON(200, map[string]any{"login": "testuser"})

resp, reqID, err := client.PostJSON("/api/protected/github/connect", payload)
// reqID is now the X-Request-ID that was on this specific inbound request.
// If you need to pre-bind the mock to the ID before the call, generate the
// ID yourself (uuid.New().String()), pass it to Do() via a custom request,
// and use ForRequestID(id) on the expectation.
```

### P4-A: `mocks/googleoauth.go`

**File:** `base-server/tests/mocks/googleoauth.go`

```go
// GoogleOAuthMock provides typed helpers for the Google OAuth mock server.
type GoogleOAuthMock struct{ *MockServer }

// ExpectTokenExchange expects POST /token — called by googleoauth.Client.GetAccessToken.
func (m *GoogleOAuthMock) ExpectTokenExchange(t *testing.T) *Expectation

// ExpectGetUserInfo expects GET /userinfo — called by googleoauth.Client.GetUserInfo.
func (m *GoogleOAuthMock) ExpectGetUserInfo(t *testing.T) *Expectation
```

Endpoints:
| Method | Path | Client method |
|--------|------|---------------|
| POST | `/token` | `GetAccessToken` |
| GET | `/userinfo` | `GetUserInfo` |

### P4-B: `mocks/github.go`

**File:** `base-server/tests/mocks/github.go`

```go
type GitHubMock struct{ *MockServer }

func (m *GitHubMock) ExpectOAuthTokenExchange(t *testing.T) *Expectation  // POST /login/oauth/access_token
func (m *GitHubMock) ExpectGetAuthenticatedUser(t *testing.T) *Expectation // GET /user
func (m *GitHubMock) ExpectListUserRepos(t *testing.T) *Expectation        // GET /user/repos
func (m *GitHubMock) ExpectCreateWebhook(t *testing.T, owner, repo string) *Expectation // POST /repos/{owner}/{repo}/hooks
func (m *GitHubMock) ExpectDeleteWebhook(t *testing.T, owner, repo string, hookID int64) *Expectation // DELETE /repos/{owner}/{repo}/hooks/{id}
func (m *GitHubMock) ExpectGetCommitDiff(t *testing.T, owner, repo, sha string) *Expectation // GET /repos/{owner}/{repo}/commits/{sha}
func (m *GitHubMock) ExpectGetRepoReadme(t *testing.T, owner, repo string) *Expectation // GET /repos/{owner}/{repo}/readme
```

Endpoints:
| Method | Path pattern | Client method |
|--------|-------------|---------------|
| POST | `/login/oauth/access_token` | `ExchangeOAuthCode` |
| GET | `/user` | `GetAuthenticatedUser` |
| GET | `/user/repos` | `ListUserRepos` |
| POST | `/repos/{owner}/{repo}/hooks` | `CreateWebhook` |
| DELETE | `/repos/{owner}/{repo}/hooks/{id}` | `DeleteWebhook` |
| GET | `/repos/{owner}/{repo}/commits/{sha}` | `GetCommitDiff` |
| GET | `/repos/{owner}/{repo}/readme` | `GetRepoReadme` |

### P4-C: `mocks/x.go`

**File:** `base-server/tests/mocks/x.go`

```go
type XMock struct{ *MockServer }

func (m *XMock) ExpectCreateTweet(t *testing.T) *Expectation           // POST /2/tweets
func (m *XMock) ExpectGetTweetMetrics(t *testing.T, id string) *Expectation // GET /2/tweets/{id}
func (m *XMock) ExpectVerifyCredentials(t *testing.T) *Expectation     // GET /2/users/me
func (m *XMock) ExpectOAuthToken(t *testing.T) *Expectation            // POST /2/oauth2/token
```

Endpoints:
| Method | Path | Client method |
|--------|------|---------------|
| POST | `/2/tweets` | `CreateTweet` |
| GET | `/2/tweets/{id}` | `GetTweetMetrics` |
| GET | `/2/users/me` | `VerifyCredentials` |
| POST | `/2/oauth2/token` | OAuth token exchange (via `golang.org/x/oauth2`) |

### P4-D: `mocks/linkedin.go`

**File:** `base-server/tests/mocks/linkedin.go`

```go
type LinkedInMock struct{ *MockServer }

func (m *LinkedInMock) ExpectCreatePost(t *testing.T) *Expectation                 // POST /rest/posts
func (m *LinkedInMock) ExpectInitializeImageUpload(t *testing.T) *Expectation      // POST /rest/images?action=initializeUpload
func (m *LinkedInMock) ExpectUploadImage(t *testing.T, uploadPath string) *Expectation // PUT {uploadPath} (relative path on mock)
func (m *LinkedInMock) ExpectGetSocialMetadata(t *testing.T, postID string) *Expectation // GET /rest/socialMetadata/{postID}
func (m *LinkedInMock) ExpectOAuthToken(t *testing.T) *Expectation                 // POST /oauth/v2/accessToken
```

Endpoints:
| Method | Path | Client method |
|--------|------|---------------|
| POST | `/rest/posts` | `CreatePost` |
| POST | `/rest/images` | `InitializeImageUpload` |
| PUT | `{uploadPath}` | `UploadImage` |
| GET | `/rest/socialMetadata/{postID}` | `GetSocialMetadata` |
| POST | `/oauth/v2/accessToken` | OAuth token exchange |

### P4-E: `mocks/bluesky.go`

**File:** `base-server/tests/mocks/bluesky.go`

```go
type BlueskyMock struct{ *MockServer }

func (m *BlueskyMock) ExpectCreateSession(t *testing.T) *Expectation    // POST /xrpc/com.atproto.server.createSession
func (m *BlueskyMock) ExpectCreateRecord(t *testing.T) *Expectation     // POST /xrpc/com.atproto.repo.createRecord
func (m *BlueskyMock) ExpectUploadBlob(t *testing.T) *Expectation       // POST /xrpc/com.atproto.repo.uploadBlob
```

Endpoints:
| Method | Path | Client method |
|--------|------|---------------|
| POST | `/xrpc/com.atproto.server.createSession` | `CreateSession` / `VerifyCredentials` |
| POST | `/xrpc/com.atproto.repo.createRecord` | `CreateRecord` |
| POST | `/xrpc/com.atproto.repo.uploadBlob` | `UploadBlob` |

### P4-F: `mocks/facebook.go`

**File:** `base-server/tests/mocks/facebook.go`

The Facebook client uses `/v21.0/{pageID}/feed`, `/v21.0/{pageID}/photos`, and `/v21.0/{postID}`. Since the mock registry matches on exact paths, the typed helpers take the IDs as parameters.

```go
type FacebookMock struct{ *MockServer }

func (m *FacebookMock) ExpectPostToFeed(t *testing.T, pageID string) *Expectation        // POST /v21.0/{pageID}/feed
func (m *FacebookMock) ExpectPostPhoto(t *testing.T, pageID string) *Expectation         // POST /v21.0/{pageID}/photos
func (m *FacebookMock) ExpectGetPostInsights(t *testing.T, postID string) *Expectation   // GET /v21.0/{postID}
func (m *FacebookMock) ExpectOAuthToken(t *testing.T) *Expectation                      // POST /v21.0/oauth/access_token
```

### P4-G: `mocks/instagram.go`

**File:** `base-server/tests/mocks/instagram.go`

```go
type InstagramMock struct{ *MockServer }

func (m *InstagramMock) ExpectCreateMediaContainer(t *testing.T, igAccountID string) *Expectation // POST /v21.0/{igAccountID}/media
func (m *InstagramMock) ExpectPublishMedia(t *testing.T, igAccountID string) *Expectation         // POST /v21.0/{igAccountID}/media_publish
func (m *InstagramMock) ExpectGetMediaInsights(t *testing.T, postID string) *Expectation          // GET /v21.0/{postID}
func (m *InstagramMock) ExpectGetPermalink(t *testing.T, mediaID string) *Expectation             // GET /v21.0/{mediaID}
```

### P4-H: `mocks/threads.go`

**File:** `base-server/tests/mocks/threads.go`

```go
type ThreadsMock struct{ *MockServer }

func (m *ThreadsMock) ExpectCreateThread(t *testing.T, userID string) *Expectation        // POST /v1.0/{userID}/threads
func (m *ThreadsMock) ExpectGetContainerStatus(t *testing.T, containerID string) *Expectation // GET /v1.0/{containerID}
func (m *ThreadsMock) ExpectPublishThread(t *testing.T, userID string) *Expectation       // POST /v1.0/{userID}/threads_publish
func (m *ThreadsMock) ExpectGetThreadInsights(t *testing.T, postID string) *Expectation   // GET /v1.0/{postID}/insights
func (m *ThreadsMock) ExpectVerifyCredentials(t *testing.T) *Expectation                 // GET /v1.0/me
func (m *ThreadsMock) ExpectGetPermalink(t *testing.T, threadID string) *Expectation     // GET /v1.0/{threadID}
func (m *ThreadsMock) ExpectOAuthToken(t *testing.T) *Expectation                       // POST /oauth/access_token
```

### P4-I: `mocks/tiktok.go`

**File:** `base-server/tests/mocks/tiktok.go`

```go
type TikTokMock struct{ *MockServer }

func (m *TikTokMock) ExpectInitVideoUpload(t *testing.T) *Expectation // POST /v2/post/publish/inbox/video/init/
func (m *TikTokMock) ExpectUploadVideo(t *testing.T, uploadPath string) *Expectation // PUT {uploadPath}
```

### P4-J: `mocks/pinterest.go`

**File:** `base-server/tests/mocks/pinterest.go`

```go
type PinterestMock struct{ *MockServer }

func (m *PinterestMock) ExpectListBoards(t *testing.T) *Expectation               // GET /v5/boards
func (m *PinterestMock) ExpectCreatePin(t *testing.T) *Expectation                // POST /v5/pins
func (m *PinterestMock) ExpectGetPinAnalytics(t *testing.T, pinID string) *Expectation // GET /v5/pins/{pinID}/analytics
func (m *PinterestMock) ExpectOAuthToken(t *testing.T) *Expectation               // POST /v5/oauth/token
```

### P4 Acceptance Criteria

- `cd base-server && go build ./tests/mocks/...` passes.

---

## Phase 5: Pilot Test Migration

**Goal:** Migrate one existing test file as the canonical template. Use `auth_test.go` — it exercises DB-only code paths (no third-party clients called) and shows the cleanest before/after.

### P5-A: Migrate auth_test.go

**File:** `base-server/tests/auth_test.go`

**What changes:**
1. The file already compiles and passes once Phases 1–4 are complete (it does not call any third-party clients).
2. Remove any remaining `envOrDefault("TEST_API_HOST", ...)` calls (already gone after P2-C).
3. Confirm `testClient(t)` now uses `testenv.GlobalEnv.BaseURL` — no source changes needed in the test body.
4. Verify `TestAuthAPI_EmailSignup` still skips the Stripe code path — the signup handler calls Stripe only for the happy path; the existing test only covers validation errors, so no mock expectation is needed.

**This test is the migration template.** It demonstrates:
- `testClient(t)` works against the in-process server.
- Seed helpers (`seedUserWithAccount`) work against `testenv.GlobalEnv.DB`.
- No mock expectations needed when the code path is DB-only.
- `t.Parallel()` may be called safely at the top of each test function.

### P5 Acceptance Criteria

```
cd base-server
go test -v -race -tags=integration -run TestAuthAPI ./tests/...
```
Passes without a running Docker server container.

---

## Phase 6: Batch-Migrate Remaining Test Files

Each file below can be migrated in parallel as an independent task. All are already DB-only or have their third-party calls deliberately excluded (documented as "OUT OF SCOPE" comments in the current test files).

| File | Mock servers needed | Notes |
|------|---------------------|-------|
| `tests/billing_test.go` | None | Only `GET /api/billing/plans` (DB read); all Stripe paths already excluded. |
| `tests/blog_test.go` | None | CRUD on `blog_posts` table; no outbound calls. |
| `tests/media_test.go` | None | Upload + list media; storage is `localdir` mode in test config. |
| `tests/posts_test.go` | None | CRUD on `posts` table; publishing endpoints excluded. |
| `tests/analytics_test.go` | None | DB reads only; platform metric-fetch paths excluded. |
| `tests/settings_test.go` | None | Voice profile + settings CRUD; no outbound calls. |
| `tests/platforms_test.go` | None | Only `GET /api/protected/platforms` and `DELETE /api/protected/platforms/:id` are in scope (DB reads/writes); OAuth + publish paths already excluded. |
| `tests/github_test.go` | None | Only DB-read/write paths in scope; GitHub API call paths already excluded. |

**For each file, the migration is identical:**
1. Replace `testClient(t)` body (already done in P2-C — it reads from `testenv.GlobalEnv`).
2. Remove any stray `envOrDefault("TEST_API_HOST", ...)` or `envOrDefault("TEST_API_PORT", ...)` calls.
3. Confirm no new `health_check` or `sync.Once` patterns were copied in.
4. Run the individual test to confirm it passes.

No new mock expectations are needed for any of these files in the current scope because all third-party API calls are already excluded from the integration test scope (see "OUT OF SCOPE" comments in each file).

### P6 Acceptance Criteria

```
cd base-server
go test -v -race -tags=integration ./tests/...
```
All tests pass with no running Docker server container and no `TEST_API_HOST`/`TEST_API_PORT` env vars set.

---

## Phase 7: Retire Docker Server and Simplify Tooling

### P7-A: docker-compose.test.yml

**File:** `base-server/docker-compose.test.yml`

Remove the `server` service (lines 61–88) and the `runner` service (lines 90–116) entirely. Keep `db`, `flyway`, and `kafka`. Remove the `test_go_mod_cache` and `test_go_build_cache` volumes (they were only used by `runner`).

**Resulting file structure:**
```yaml
name: base-server-test

services:
  db:
    # ... unchanged
  flyway:
    # ... unchanged
  kafka:
    # ... unchanged

volumes:
  test_postgres_data:
```

### P7-B: Dockerfile.test

**File:** `base-server/Dockerfile.test`

Delete this file entirely — it only existed to build the `runner` container. Confirm it exists first with `ls base-server/Dockerfile.test`; if absent, skip.

### P7-C: Makefile

**File:** `base-server/Makefile`

Replace the `docker-up`, `docker-down`, `docker-test-unit`, `docker-test-store`, `docker-test-integration`, `docker-test-db`, `docker-test-all`, `docker-logs`, `docker-clean` targets with simpler equivalents:

```makefile
# Start isolated Docker test environment (DB + Kafka + migrations only; no server)
docker-up:
	@echo "Starting test infrastructure (DB, Kafka, migrations)..."
	docker compose -f docker-compose.test.yml up -d --wait db kafka
	docker compose -f docker-compose.test.yml up flyway
	@echo "Test infrastructure ready!"

# Stop isolated Docker test environment
docker-down:
	@echo "Stopping test infrastructure..."
	docker compose -f docker-compose.test.yml down -v
	@echo "Done."

# Run integration tests against the in-process server (requires docker-up first)
docker-test-integration:
	@echo "Running integration tests (in-process server)..."
	go test -v -race -tags=integration ./tests/...

# Run all tests (unit + store + integration) after docker-up
docker-test-all:
	@$(MAKE) docker-up
	@$(MAKE) dev-test-unit
	@$(MAKE) dev-test-store
	@$(MAKE) docker-test-integration
	@$(MAKE) docker-down

# Remove docker-logs and docker-clean targets (server container gone)
```

Update `dev-test-integration` to match:
```makefile
dev-test-integration:
	@echo "Running integration tests locally (in-process server)..."
	go test -v -race -tags=integration ./tests/...
```

Remove the `TEST_API_HOST` and `TEST_API_PORT` export lines at the top of the Makefile (they are no longer used).

### P7-D: env.test

**File:** `base-server/env.test`

Remove lines that are no longer needed:
- `KAFKA_TOPIC=webhook-events` (was never read by config.go; was a leftover from an old service)
- `OPENAI_API_KEY=...` (not read by config.go)

Keep all remaining lines unchanged. The `*_BASE_URL` mock server URLs are set programmatically by `testenv.Start` via `os.Setenv`; they do not need entries in `env.test`.

### P7-E: TESTING.md

**File:** `base-server/TESTING.md`

Replace the entire document. The new document should describe:

1. **Prerequisites:** Go 1.23+, Docker (for Postgres + Kafka). No separate server process needed.
2. **Quick Start:** `make dev-up` then `go test -v -race -tags=integration ./tests/...`.
3. **How it works:** `TestMain` in `tests/main_test.go` starts the full gin router via `httptest.NewServer`, spins up per-client mock HTTP servers, sets env vars pointing the real clients at the mocks, then calls `m.Run()`.
4. **Writing integration tests:** Use `testClient(t)` for unauthenticated HTTP calls. Use `env.AsUser(t, userID)` for authenticated HTTP calls — it returns an `AuthedClient` that signs JWTs and stamps a unique `X-Request-ID` per call, returning the ID as a second return value. Use `testenv.GlobalEnv.DB` for direct DB access. Use `testenv.GlobalEnv.<Client>.Expect(t, method, path)` for mock expectations. Example:
   ```go
   func TestPublishPost(t *testing.T) {
       t.Parallel()
       env := testenv.GlobalEnv
       client := env.AsUser(t, seedUser.ExternalID.String())

       // Register mock expectation before triggering the call.
       env.X.Expect(t, http.MethodPost, "/2/tweets").
           Times(1, t).
           ReturnJSON(201, map[string]any{"data": map[string]any{"id": "123"}})

       // PostJSON returns (response, requestID, error).
       // Use the requestID to bind ForRequestID on the expectation when
       // you need strict parallel isolation (pre-register with a self-generated
       // UUID and pass it via a custom Do call; see TESTING.md for the pattern).
       resp, _, err := client.PostJSON("/api/protected/posts/"+postID+"/publish", nil)
       // assert resp ...
   }
   ```
5. **Parallelism:** Individual test functions and subtests may call `t.Parallel()` freely. Mock expectations are scoped to the registering test via `t.Name()` (ownership token). Requests are disambiguated using the `X-Request-ID` header stamped by `AuthedClient` — each `Do`/`Get`/`PostJSON`/`Delete` call generates a distinct UUID and returns it, so parallel tests that need strict isolation can use `.ForRequestID(id)` with that value. No additional guard is needed; header disambiguation handles concurrent requests natively.
6. **Header-based disambiguation:** The `TracingTransport` propagates `X-Request-ID` and `X-User-ID` from the Go context into every outbound HTTP call made by a server handler. Mock expectations registered with `.ForRequestID(id)` match only requests carrying that ID, enabling parallel tests to share mock servers without interference.
7. **Worker-initiated calls:** Workers are not started in integration tests (the harness skips `StartAll`). If a future test explicitly invokes a worker function, it must seed a context with `observability.SetRequestID` (for a synthetic ID) or use `.ForUserID` / `.ForAuth` matchers.
8. **What is out of scope:** Gemini, S3, Stripe, Resend, Kafka. Unit tests with gomock cover those paths.
9. **Available Make targets:** `make dev-up`, `make dev-down`, `make dev-test-integration`, `make dev-test-unit`, `make dev-test-store`, `make docker-up`, `make docker-test-all`.

### P7-F: CLAUDE.md

**File:** `base-server/CLAUDE.md`

Update the Commands section. Replace:
```
make dev-test-integration    # Integration tests (needs dev-up + go run main.go)
```
with:
```
make dev-test-integration    # Integration tests (needs dev-up only — server is in-process)
```

Remove any reference to `TEST_API_HOST`, `TEST_API_PORT`, or "needs running server" from the doc.

### P7 Acceptance Criteria

- `docker compose -f base-server/docker-compose.test.yml config` validates without errors.
- `cd base-server && make docker-test-all` runs successfully end-to-end on a clean machine with Docker available.
- `grep -r "TEST_API_HOST\|TEST_API_PORT\|go run main.go" base-server/CLAUDE.md base-server/TESTING.md base-server/Makefile` returns no matches.

---

## Complete File Inventory

### New files
| File | Phase | Description |
|------|-------|-------------|
| `base-server/internal/infra/httpclient/roundtripper.go` | 1.5 | `TracingTransport` — propagates `X-Request-ID` and `X-User-ID` outbound |
| `base-server/internal/infra/httpclient/roundtripper_test.go` | 1.5 | Unit tests for TracingTransport smoke scenarios |
| `base-server/tests/testenv/env.go` | 2 | Global harness: `Env`, `Start`, `Stop`, `TruncateAll`, `AsUser` |
| `base-server/tests/main_test.go` | 2 | `TestMain` wiring |
| `base-server/tests/mocks/registry.go` | 3 | Generic `MockServer` + `Expectation` builder with ownership + header-based matching |
| `base-server/tests/mocks/googleoauth.go` | 4 | Typed Google OAuth mock helpers |
| `base-server/tests/mocks/github.go` | 4 | Typed GitHub mock helpers |
| `base-server/tests/mocks/x.go` | 4 | Typed X (Twitter) mock helpers |
| `base-server/tests/mocks/linkedin.go` | 4 | Typed LinkedIn mock helpers |
| `base-server/tests/mocks/bluesky.go` | 4 | Typed Bluesky mock helpers |
| `base-server/tests/mocks/facebook.go` | 4 | Typed Facebook mock helpers |
| `base-server/tests/mocks/instagram.go` | 4 | Typed Instagram mock helpers |
| `base-server/tests/mocks/threads.go` | 4 | Typed Threads mock helpers |
| `base-server/tests/mocks/tiktok.go` | 4 | Typed TikTok mock helpers |
| `base-server/tests/mocks/pinterest.go` | 4 | Typed Pinterest mock helpers |

### Modified files
| File | Phase | Changes |
|------|-------|---------|
| `base-server/internal/infra/config/config.go` | 1 | Add `ExternalURLsConfig` struct + Load block |
| `base-server/internal/infra/clients/googleoauth/client.go` | 1, 1.5 | Add URL fields + `*http.Client` param, update `NewClient`, remove hardcoded constants |
| `base-server/internal/infra/clients/github/client.go` | 1, 1.5 | Add URL fields + `*http.Client` param, update `NewClient`, remove hardcoded constants |
| `base-server/internal/platform/clients/x/client.go` | 1, 1.5 | Add `baseURL` + `*http.Client` params to `NewClient`, delete `NewTestClient` |
| `base-server/internal/platform/clients/linkedin/client.go` | 1, 1.5 | Add `baseURL` + `*http.Client` params to `NewClient`, delete `NewTestClient` |
| `base-server/internal/platform/clients/bluesky/client.go` | 1, 1.5 | Add `baseURL` + `*http.Client` params to `NewClient`, delete `NewTestClient` |
| `base-server/internal/platform/clients/facebook/client.go` | 1, 1.5 | Add `baseURL`+`httpClient` fields (Phase 1), wire TracingClient (Phase 1.5) |
| `base-server/internal/platform/clients/instagram/client.go` | 1, 1.5 | Same as facebook |
| `base-server/internal/platform/clients/threads/client.go` | 1, 1.5 | Add `baseURL` + `*http.Client` params to `NewClient`, delete `NewTestClient` |
| `base-server/internal/platform/clients/tiktok/client.go` | 1, 1.5 | Add `baseURL`+`httpClient` fields (Phase 1), wire TracingClient (Phase 1.5) |
| `base-server/internal/platform/clients/pinterest/client.go` | 1, 1.5 | Add `baseURL` + `*http.Client` params to `NewClient`, delete `NewTestClient` |
| `base-server/internal/infra/observability/context.go` | 1.5 | Add `SetRequestID`, `GetRequestID`, `SetUserID`, `GetUserID` typed context helpers |
| `base-server/internal/infra/observability/middleware.go` | 1.5 | Call `SetRequestID(ctx, requestID)` after generating/reading the request-ID |
| `base-server/internal/auth/handler/auth.go` | 1.5 | Call `observability.SetUserID(ctx, sub)` in `HandleJWTMiddleware` |
| `base-server/internal/platform/processor/refresh.go` | 1.5 | Replace `http.DefaultClient.Do` with injected `p.httpClient.Do` |
| `base-server/internal/platform/processor/oauth.go` | 1.5 | Replace `http.DefaultClient.Do` with injected `p.httpClient.Do` |
| `base-server/internal/platform/processor/profiles.go` | 1.5 | Replace `http.DefaultClient.Do` with injected `p.httpClient.Do` |
| `base-server/internal/platform/adapters/helpers.go` | 1.5 | Replace `http.DefaultClient.Do` with injected client |
| `base-server/internal/infra/bootstrap/clients.go` | 1, 1.5 | Thread `cfg.ExternalURLs.*` into all client constructors; inject `httpclient.NewTracingClient()` |
| `base-server/internal/infra/bootstrap/processors.go` | 1.5 | Inject `*http.Client` into platform processor constructors |
| `base-server/tests/helpers_test.go` | 2 | Remove health check, read from `testenv.GlobalEnv` |
| `base-server/docker-compose.test.yml` | 7 | Remove `server` and `runner` services |
| `base-server/Makefile` | 7 | Simplify docker-test targets; remove `-p 1`; remove TEST_API_* exports |
| `base-server/env.test` | 7 | Remove unused keys |
| `base-server/TESTING.md` | 7 | Full rewrite |
| `base-server/CLAUDE.md` | 7 | Update Commands section |

### Deleted files
| File | Phase | Reason |
|------|-------|--------|
| `base-server/Dockerfile.test` | 7 | Runner container eliminated |

---

## Executor Recommendation

Use `backend-supervisor` (Sonnet) for sequential phases 1 → 1.5 → 2+3 (parallel) → 4 → 5 → 6 → 7.

Alternatively, use `backend-subagent-development` skill which dispatches haiku agents in batches:
- **Batch A (parallel):** Phase 1 clients (P1-B through P1-K are 10 independent files) + P1-A (config)
- **Batch B (parallel):** P1-L (bootstrap wiring) + P1.5-A (observability context helpers) + P1.5-C (TracingTransport new file)
- **Batch C (parallel):** P1.5-B (middleware + auth wiring) + P1.5-D (bootstrap TracingClient wiring) + P1.5-E (processor/adapter DefaultClient conversion) — these touch distinct files
- **Batch D (sequential):** Compile check after P1.5 is complete — `go build ./...`
- **Batch E (parallel):** P2-A (testenv) + P3-A (registry) — independent of each other
- **Batch F (sequential):** P2-B (TestMain) + P2-C (helpers_test.go) — depends on Batch E
- **Batch G (parallel):** P4 mock files (10 independent files) — depends on Batch E
- **Batch H (sequential):** Phase 5 pilot — depends on all above
- **Batch I (parallel):** Phase 6 batch migration (8 files) — depends on Phase 5
- **Batch J (sequential):** Phase 7 tooling cleanup — depends on Phase 6

## Resolved Decisions

All decisions are resolved. The plan is ready for execution with no open questions.

| Decision | Resolution |
|----------|-----------|
| `*http.Client` constructor shape | Required positional parameter on every `NewClient(...)` — no `WithHTTPClient` option setter. All client instantiation flows exclusively through `bootstrap/clients.go`; there are no direct callers outside the DI root. |
| `AuthedClient` API shape | `env.AsUser(t, userID)` returns an `AuthedClient` struct. It has `Do(req *http.Request) (*http.Response, string, error)`, `Get(path string) (*http.Response, string, error)`, `PostJSON(path string, body any) (*http.Response, string, error)`, and `Delete(path string) (*http.Response, string, error)` — each generates a fresh `X-Request-ID` per call and returns it. Tests call `ForRequestID(id)` with the returned value. No global `CurrentRequestID()` on `Env`. |
| Facebook/Instagram OAuth `TokenURL` | Left hardcoded (`"https://graph.facebook.com/v21.0/oauth/access_token"`). The OAuth exchange flow is out of scope for integration tests; routing it through `ExternalURLs` adds complexity with no benefit. Revisit if a test for the OAuth callback endpoint is ever added. |
| `t.Parallel()` guard | None needed. Header-based disambiguation (`X-Request-ID` per call via `AuthedClient`) handles concurrent requests natively. |
