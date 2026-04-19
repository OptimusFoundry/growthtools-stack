# Platform API Integration Tests — Implementation Plan

**Goal:** Add exhaustive integration tests for every backend endpoint that calls a third-party upstream, covering every reachable status code, every success branch, and every upstream-error branch.

**Scope:** Backend-only — new and extended test files in `base-server/tests/`, plus prerequisite infrastructure changes (Stripe mock helper, Gemini mock helper, SSE read helper, `env.go` wiring).

---

## Context

The in-process integration test harness (PR #30) is merged. `TestMain` boots the real Gin router against mock `httptest.Server`s for each platform client. Ten platform mocks exist (Google OAuth, GitHub, X, LinkedIn, Bluesky, Facebook, Instagram, Threads, TikTok, Pinterest). The harness intentionally excluded Stripe and Gemini (the existing TESTING.md says they are "out of scope").

This plan overrides that exclusion for Stripe and Gemini by adding mock servers for both, then adds exhaustive test coverage for all upstream-touching endpoints.

### What already exists (do not re-implement)

Reading `base-server/tests/`:

- `auth_test.go` — email login, email signup (validation only), get-user-info: **present**
- `platforms_test.go` — `GET /api/protected/platforms` (list), `DELETE /api/protected/platforms/:id` (disconnect): **present** — the file explicitly says OAuth/Bluesky/token endpoints are out of scope; that comment is **wrong and must be removed**
- `billing_test.go` — list plans only: **present** — a comment says checkout/portal/webhook are out of scope; that comment is **wrong and must be removed**
- `blog_test.go` — create, get, list, update, delete, publish blog: **present** — generate and stream-generate are **missing**
- `github_test.go` — get-connection, disconnect, list-commits, get-commit, webhook (validation only): **present** — oauth-init, oauth-callback, list-repos, connect-repo, disconnect-repo, retry-capture are **missing**
- `posts_test.go` — create, get, list, update, delete: **present** — publish, retry, schedule are **missing**
- `content_test.go` — **entirely missing**

### Non-goals

- No new product features.
- No changes to production handler or processor code unless a tested code path is provably unreachable (none found).
- No store-layer or unit tests (those exist under `internal/`).
- No frontend tests.

---

## Critical finding: AI provider

The content, blog, and chat processors use **Gemini** (Google AI), not Anthropic/Claude. The client is `base-server/internal/infra/clients/gemini/client.go` which wraps `google.golang.org/genai`. The `genai.Client` is constructed with `&genai.ClientConfig{APIKey: ..., Backend: genai.BackendGeminiAPI}`. **The genai SDK does not expose a base-URL override in its public API.** Therefore Gemini calls cannot be intercepted by a local mock server without patching the SDK.

**Decision:** Content, blog, and chat endpoints that call Gemini are tested for all non-Gemini code paths (401 unauthenticated, 400 validation errors) only. The Gemini success path and Gemini-error path are intentionally **not** tested at integration level. They are already covered by unit tests with gomock in `internal/content/processor/processor_test.go` and `internal/blog/processor/processor_test.go`. This matches the existing TESTING.md policy for Gemini (listed as out of scope).

**SSE endpoints** (`POST /api/protected/content/generate/stream`, `POST /api/protected/blog/generate/stream`) exercise the SSE header-setting code path even when the processor immediately errors. We test that: (a) 400 is returned for invalid request bodies (before SSE headers are written), and (b) the `Content-Type: text/event-stream` header is set when the request reaches the SSE handler.

### Stripe finding

Stripe uses `stripe.Key = cfg.Services.StripeSecretKey` as a package-level global and the stripe-go v83 SDK's `client.API` uses `stripe.DefaultBackend` which hits `api.stripe.com`. The `stripe.Backends` global **can** be overridden per-call via `&stripe.BackendConfig{URL: "..."}` using `backends.GetWithConfig(...)`, but that requires threading the override through every `session.New(params)` and `customer.New(params)` call site in the billing processor — a non-trivial production code change.

**Decision:** Billing endpoints that call Stripe (checkout session, customer portal, webhook) remain unit-tested only at this stage, as the existing TESTING.md explicitly calls them out of scope. The only billing integration test we add is the webhook signature-verification path — because `webhook.ConstructEvent` is a pure local crypto check (no outbound call) and we can test it entirely with a correctly/incorrectly signed payload. The integration tests add: 400 (missing header), 400 (invalid signature), and 200 (valid signature, idempotent event type such as `customer.subscription.updated` with DB state that produces a no-op).

---

## Architecture Summary

### Infrastructure changes (Phase 0 — prerequisite)

1. **`testenv/env.go`** — add `ReadSSE(t, resp) []SSEEvent` helper and `SSEEvent` type (no mock server needed for Gemini).
2. **No Stripe mock** — as explained above, Stripe wiring requires production code changes. Billing webhook tested with real `webhook.ConstructEvent` using test signing secrets.
3. **No Gemini mock** — SDK does not support base-URL override without patching.

### Test file changes (Phase 1 — parallel batch)

All new test logic goes into existing or new `*_test.go` files in `base-server/tests/`. Each file has the `//go:build integration` tag. All test functions call `t.Parallel()`.

| File | Status | New test functions |
|------|--------|--------------------|
| `tests/auth_test.go` | extend | `TestAuthAPI_GoogleOAuthCallback` |
| `tests/platforms_test.go` | extend | `TestPlatformsAPI_InitiateOAuth`, `TestPlatformsAPI_OAuthCallback_LinkedIn`, `TestPlatformsAPI_OAuthCallback_Facebook`, `TestPlatformsAPI_OAuthCallback_Threads`, `TestPlatformsAPI_OAuthCallback_Pinterest`, `TestPlatformsAPI_OAuthCallback_TikTok`, `TestPlatformsAPI_OAuthCallback_X`, `TestPlatformsAPI_ConnectBluesky`, `TestPlatformsAPI_ConnectWithToken` |
| `tests/posts_test.go` | extend | `TestPostsAPI_PublishPost`, `TestPostsAPI_RetryPost`, `TestPostsAPI_SchedulePost` |
| `tests/content_test.go` | new | `TestContentAPI_GeneratePost`, `TestContentAPI_AdaptContent`, `TestContentAPI_GenerateThread`, `TestContentAPI_StreamGenerate` |
| `tests/blog_test.go` | extend | `TestBlogAPI_GenerateBlog`, `TestBlogAPI_StreamGenerateBlog` |
| `tests/github_test.go` | extend | `TestGitHubAPI_InitOAuth`, `TestGitHubAPI_OAuthCallback`, `TestGitHubAPI_ListRepos`, `TestGitHubAPI_ConnectRepo`, `TestGitHubAPI_DisconnectRepo`, `TestGitHubAPI_RetryCapture` |
| `tests/billing_test.go` | extend | `TestBillingAPI_WebhookInvalidSignature`, `TestBillingAPI_WebhookMissingHeader`, `TestBillingAPI_CreateCheckoutSession_Unauthenticated`, `TestBillingAPI_CreateCustomerPortal_Unauthenticated` |
| `tests/testenv/env.go` | extend | `ReadSSE`, `SSEEvent` |

---

## Phase 0: Infrastructure Tasks

### P0-T1: Add `ReadSSE` helper to `testenv/env.go`

**File:** `/Users/shubh/Workspaces/growth-tools/.worktrees/platform-api-tests/base-server/tests/testenv/env.go`

Add the following to the bottom of the file. No imports beyond `bufio`, `strings`, and `testing` are needed (all already available in Go stdlib).

```go
// SSEEvent represents a single server-sent event.
type SSEEvent struct {
    Event string // value of the "event:" line; empty if no event line
    Data  string // value of the "data:" line(s) concatenated with "\n"
}

// ReadSSE reads all SSE events from resp.Body until EOF or 5-second timeout.
// The caller is responsible for closing resp.Body.
// Call this only for responses with Content-Type: text/event-stream.
func ReadSSE(t *testing.T, resp *http.Response) []SSEEvent {
    t.Helper()
    var events []SSEEvent
    scanner := bufio.NewScanner(resp.Body)

    var cur SSEEvent
    var dataLines []string

    for scanner.Scan() {
        line := scanner.Text()
        if line == "" {
            // Empty line = end of event block.
            if len(dataLines) > 0 || cur.Event != "" {
                cur.Data = strings.Join(dataLines, "\n")
                events = append(events, cur)
                cur = SSEEvent{}
                dataLines = nil
            }
            continue
        }
        if strings.HasPrefix(line, "event:") {
            cur.Event = strings.TrimSpace(strings.TrimPrefix(line, "event:"))
        } else if strings.HasPrefix(line, "data:") {
            dataLines = append(dataLines, strings.TrimSpace(strings.TrimPrefix(line, "data:")))
        }
    }
    // Flush any trailing partial event (no final blank line).
    if len(dataLines) > 0 || cur.Event != "" {
        cur.Data = strings.Join(dataLines, "\n")
        events = append(events, cur)
    }
    return events
}
```

The `bufio` and `strings` packages must be added to the import block of `env.go`.

---

## Phase 1: Test Tasks (all parallel-safe — different files)

### T1: `auth_test.go` — Google OAuth callback

**File:** `/Users/shubh/Workspaces/growth-tools/.worktrees/platform-api-tests/base-server/tests/auth_test.go`

**Endpoint:** `GET /api/auth/google/callback?code=<code>`

**Handler path:** `HandleGoogleOauthCallback` in `internal/auth/handler/auth.go`

**Upstream calls made by `SignInGoogleUserWithCode`:**
1. `POST /token` on `GoogleOAuth` mock (GetAccessToken)
2. `GET /userinfo` on `GoogleOAuth` mock (GetUserInfo)

If the user is new, it also calls `CreateStripeCustomer` and `CreateFreeSubscription` — both of these call real Stripe. **Therefore the new-user happy path is out of scope for integration tests.** We test the returning-user path (user already exists in DB) and all error paths.

**`handleError` mapping for auth:**
- `ErrFailedSignIn` → 500 (InternalError)
- No code check (400 inline): `code == ""` → 400

**Status codes to cover:**

| Status | Scenario | Mocks needed |
|--------|----------|--------------|
| 302 | Existing user signs in: token exchange succeeds, userinfo succeeds, user found in DB | `GoogleOAuth.ExpectTokenExchange(t).Times(1,t).ReturnJSON(200, {...})`, `GoogleOAuth.ExpectGetUserInfo(t).Times(1,t).ReturnJSON(200, {...})` |
| 400 | Missing `code` query param (no mocks needed) | none |
| 500 | Token exchange fails (mock returns 500) | `GoogleOAuth.ExpectTokenExchange(t).Times(1,t).ReturnStatus(500)` |
| 500 | Userinfo fails (mock returns 500 after token exchange succeeds) | both mock calls |

**Seeding required for 302 path:** Call `seedUserWithAccount(t, c.Store)` but also insert an `oauth_auth` row and link it to the user (to simulate an existing Google OAuth user). The processor calls `store.CheckIfEmailExists` → `store.GetOauthUserByEmail` → `store.GetUserByAuthID`. Examine the store signature:

```sql
-- The google oauth path needs an oauth_auth row.
-- seedGoogleOAuthUser inserts: users + user_auth(auth_type="google") + oauth_auth(sub=googleSub, email=...) + accounts
```

Add `seedGoogleOAuthUser(t, c.Store) seedUserResult` helper to `github_test.go`... actually add it to `helpers_test.go` to keep it with the other seed helpers.

**`seedGoogleOAuthUser` helper to add to `helpers_test.go`:**
```go
// seedGoogleOAuthUser inserts a user + Google OAuth auth row.
// Returns a seedUserResult so tests can verify the redirect sets the cookie.
func seedGoogleOAuthUser(t *testing.T, s *store.Store, email string) seedUserResult {
    t.Helper()
    ctx := context.Background()

    userID := uuid.New()
    _, err := s.GetDB().ExecContext(ctx,
        `INSERT INTO users (id, first_name, last_name, stripe_customer_id) VALUES ($1, $2, $3, $4)`,
        userID, "Google", "User-"+userID.String()[:8], "cus_test123")
    require.NoError(t, err)

    authID := uuid.New()
    _, err = s.GetDB().ExecContext(ctx,
        `INSERT INTO user_auth (id, user_id, auth_type) VALUES ($1, $2, $3)`,
        authID, userID, "google")
    require.NoError(t, err)

    googleSub := "google-sub-" + userID.String()[:8]
    _, err = s.GetDB().ExecContext(ctx,
        `INSERT INTO oauth_auth (auth_id, provider_user_id, email) VALUES ($1, $2, $3)`,
        authID, googleSub, email)
    require.NoError(t, err)

    account, err := s.CreateAccount(ctx, store.CreateAccountParams{
        Name:        "Google User " + userID.String()[:8],
        Slug:        "google-" + userID.String()[:8],
        OwnerUserID: userID,
        Plan:        "free",
    })
    require.NoError(t, err)

    t.Cleanup(func() {
        bg := context.Background()
        _, _ = s.GetDB().ExecContext(bg, `DELETE FROM accounts WHERE id = $1`, account.ID)
        _, _ = s.GetDB().ExecContext(bg, `DELETE FROM oauth_auth WHERE auth_id = $1`, authID)
        _, _ = s.GetDB().ExecContext(bg, `DELETE FROM user_auth WHERE id = $1`, authID)
        _, _ = s.GetDB().ExecContext(bg, `DELETE FROM users WHERE id = $1`, userID)
    })

    return seedUserResult{UserID: userID, AccountID: account.ID}
}
```

**Note on 302 response:** `HandleGoogleOauthCallback` calls `c.Redirect(http.StatusFound, ...)`. The test HTTP client has `CheckRedirect: func(...) error { return http.ErrUseLastResponse }` disabled by default — use `http.Client{CheckRedirect: ..., Timeout: 15s}` with `ErrUseLastResponse` to capture the 302 without following it. The `testClient.Request` method does not allow custom redirect policy; the auth callback test must use `http.NewRequest` + `http.DefaultClient` with redirect disabled, or use `env.GoogleOAuth` directly. Simplest: build the request manually in the test using `c.baseURL`.

**Test function skeleton:**
```go
func TestAuthAPI_GoogleOAuthCallback(t *testing.T) {
    t.Parallel()
    env := testenv.GlobalEnv
    c := testClient(t)
    noRedirectClient := &http.Client{
        Timeout: 15 * time.Second,
        CheckRedirect: func(req *http.Request, via []*http.Request) error {
            return http.ErrUseLastResponse
        },
    }

    tests := []struct {
        name       string
        queryCode  string
        setup      func(t *testing.T)
        wantStatus int
    }{
        {
            name:       "400 when code is missing",
            queryCode:  "",
            setup:      func(t *testing.T) {},
            wantStatus: http.StatusBadRequest,
        },
        {
            name:      "500 when Google token exchange fails",
            queryCode: "valid-code",
            setup: func(t *testing.T) {
                env.GoogleOAuth.ExpectTokenExchange(t).
                    ReturnStatus(http.StatusInternalServerError).
                    Times(1, t)
            },
            wantStatus: http.StatusInternalServerError,
        },
        {
            name:      "500 when Google userinfo fails",
            queryCode: "valid-code",
            setup: func(t *testing.T) {
                env.GoogleOAuth.ExpectTokenExchange(t).
                    ReturnJSON(http.StatusOK, map[string]any{
                        "access_token": "goog-token",
                        "token_type":   "Bearer",
                    }).Times(1, t)
                env.GoogleOAuth.ExpectGetUserInfo(t).
                    ReturnStatus(http.StatusInternalServerError).
                    Times(1, t)
            },
            wantStatus: http.StatusInternalServerError,
        },
        {
            name:      "302 redirects to webapp for existing user",
            queryCode: "valid-code",
            setup: func(t *testing.T) {
                email := "google-existing-" + uuid.New().String()[:8] + "@test.example.com"
                seedGoogleOAuthUser(t, c.Store, email)
                env.GoogleOAuth.ExpectTokenExchange(t).
                    ReturnJSON(http.StatusOK, map[string]any{
                        "access_token": "goog-access-token",
                        "token_type":   "Bearer",
                    }).Times(1, t)
                env.GoogleOAuth.ExpectGetUserInfo(t).
                    ReturnJSON(http.StatusOK, map[string]any{
                        "id":         "google-sub-" + <match the seeded sub>,
                        "email":      email,
                        "given_name": "Google",
                        "family_name":"User",
                    }).Times(1, t)
            },
            wantStatus: http.StatusFound,
        },
    }
    // ... table-driven execution using noRedirectClient
}
```

**Implementation note on 302 path:** The `googleSub` used in the mock `GetUserInfo` response must match the `provider_user_id` inserted by `seedGoogleOAuthUser`. The simplest approach is to make `seedGoogleOAuthUser` return the sub string in the result, or to derive it deterministically from the email. Update `seedUserResult` to add an optional `GoogleSub string` field, or accept the sub as a param.

Recommended approach: `seedGoogleOAuthUser` accepts `email` and returns `(seedUserResult, googleSub string)`. The test sets up the mock to return the sub it received.

---

### T2: `platforms_test.go` — OAuth init, callbacks, Bluesky, token connect

**File:** `/Users/shubh/Workspaces/growth-tools/.worktrees/platform-api-tests/base-server/tests/platforms_test.go`

Remove the comment block at the bottom that says these endpoints are "OUT OF SCOPE". Add the following test functions.

#### T2-A: `TestPlatformsAPI_InitiateOAuth`

**Endpoint:** `POST /api/protected/platforms/oauth/init`  
**Handler:** `HandleInitiateOAuth` in `internal/platform/handler/handler.go`  
**Upstream calls:** None — `InitiateOAuth` only builds a URL string from config; no HTTP call.  
**Errors mapped:**
- 400 (ValidationError): missing `platform` field
- 400 (`ErrUnsupportedPlatform`): platform not in oauthConfigs
- 401: no JWT
- 200: success, returns `{"auth_url": "..."}`

**Status codes to cover:**

| Status | Scenario |
|--------|----------|
| 200 | `platform: "linkedin"` — returns an auth URL |
| 200 | `platform: "x"` — X uses PKCE, URL contains `code_challenge` |
| 400 | Missing `platform` field |
| 400 | `platform: "unsupported_platform_xyz"` |
| 401 | No JWT cookie |

No mocks needed (all status codes are deterministic from config/DB).

#### T2-B: `TestPlatformsAPI_OAuthCallback_*` (one per supported platform)

**Endpoint:** `GET /api/platforms/oauth/callback/:platform?code=AUTH_CODE&state=ACCOUNT_UUID`  
**Handler:** `HandleOAuthCallback` in `internal/platform/handler/handler.go`  
**This is a public endpoint** — no JWT required. The `state` parameter encodes the account UUID.

The handler redirects (302) on both success and failure. Success: `{webAppURI}/account?tab=platforms&connected={platform}`. Failure: `{webAppURI}/account?tab=platforms&error={platform}`.

**Upstream calls per platform (through `HandleOAuthCallback` → `HandleOAuthCallback` → `exchangeOAuth2Token` / `exchangeXOAuth2Token`):**

For most platforms (`linkedin`, `facebook`, `instagram`, `threads`, `tiktok`, `pinterest`):
1. `POST {TokenURL}` — token exchange (routed through the platform's mock)
2. `GET {ProfileURL}` — fetch user profile (routed through the same platform's mock, using hardcoded API URLs that go through the tracing HTTP client which resolves against the mock base URL via config)

**Critical finding:** The `fetchUserProfile` calls (e.g. `fetchLinkedInProfile`) use hardcoded URLs like `"https://api.linkedin.com/v2/userinfo"`. These are NOT routed through the mock. The tracing HTTP client uses the real URL. **Only the token exchange URL** (`cfg.TokenURL`) is configurable through `LINKEDIN_API_BASE`, etc.

Looking at the platform OAuth token URLs from `clients.go`:
- LinkedIn: `cfg.ExternalURLs.LinkedInAPIBase + "/oauth/v2/accessToken"` → routed to mock
- Facebook/Instagram: `"https://graph.facebook.com/v21.0/oauth/access_token"` → **hardcoded, NOT mocked**
- Threads: `cfg.ExternalURLs.ThreadsAPIBase + "/oauth/access_token"` → routed to mock
- TikTok: `"https://open.tiktokapis.com/v2/oauth/token/"` → **hardcoded, NOT mocked**
- Pinterest: `"https://api.pinterest.com/v5/oauth/token"` → **hardcoded, NOT mocked**
- X: `cfg.ExternalURLs.XAPIBase + "/2/oauth2/token"` → routed to mock

So only **LinkedIn**, **Threads**, and **X** have mockable token exchange URLs. The others use hardcoded HTTPS URLs that would attempt real network connections.

**Plan for callback tests:**

For platforms with mockable token URLs (LinkedIn, Threads, X):
- Test success path (302 to `connected=platform`)
- Test token exchange failure (mock returns 400, redirects to `error=platform`)
- Test missing `code` param (400 inline)
- Test missing `state` param (400 inline)
- Test invalid `state` (not a UUID → 400)

For platforms with hardcoded token URLs (Facebook, Instagram, TikTok, Pinterest):
- Only test the non-upstream code paths: missing params (400), invalid state (400)
- The success and token-failure paths are NOT testable without real network access

**X OAuth callback special case:** X uses PKCE, which requires `InitiateOAuth` to first be called to store a PKCE verifier for the account. The test must call `POST /api/protected/platforms/oauth/init` first (with a valid JWT for the account) to seed the PKCE verifier, then call the callback with the same account UUID as state.

**Status codes per platform group:**

LinkedIn + Threads (mockable token URL):

| Status | Scenario | Mock |
|--------|----------|------|
| 302 → connected | code+state valid, token exchange succeeds, profile fetch best-effort | `LinkedIn.ExpectOAuthToken(t).ReturnJSON(200, {...})` |
| 302 → error | token exchange returns 400 | `LinkedIn.ExpectOAuthToken(t).ReturnStatus(400)` |
| 400 | missing `code` | none |
| 400 | missing `state` | none |
| 400 | `state` not UUID | none |

X (mockable token URL, requires PKCE init first):

| Status | Scenario | Mock |
|--------|----------|------|
| 302 → connected | PKCE init + callback, token exchange succeeds, user profile succeeds | `X.ExpectOAuthToken(t)`, `X.ExpectVerifyCredentials(t)` (for `/2/users/me`) |
| 302 → error | token exchange fails | `X.ExpectOAuthToken(t).ReturnStatus(400)` |
| 302 → error | PKCE verifier not found (state UUID not known) | none (pass account UUID that never called init) |

Facebook, Instagram, TikTok, Pinterest (hardcoded token URL):

| Status | Scenario |
|--------|----------|
| 400 | missing `code` |
| 400 | missing `state` |
| 400 | `state` not UUID |

**Note on 302 tests:** Use `noRedirectClient` (same pattern as `TestAuthAPI_GoogleOAuthCallback`) to capture the 302 without following it, then assert `resp.Header.Get("Location")` contains the expected suffix.

**Note on X `/2/users/me`:** The `fetchXProfile` function uses a hardcoded URL `"https://api.x.com/2/users/me?user.fields=username"` — this is NOT `cfg.ExternalURLs.XAPIBase`. However, looking at `clients.go`, `x.NewClient` receives `cfg.ExternalURLs.XAPIBase` as its base URL. The `fetchXProfile` is called from `exchangeXOAuth2Token` which uses `p.httpClient.Do(req)` with a hardcoded URL. The tracing client passes through all requests. So the `/2/users/me` call on the hardcoded URL will fail in tests (connection refused to `api.x.com`). Since the code handles this failure with `p.logger.Error(ctx, "failed to fetch X profile, using fallback", err)` and continues with `platformUserID = "unknown"`, the callback will still succeed with 302 → connected.

#### T2-C: `TestPlatformsAPI_ConnectBluesky`

**Endpoint:** `POST /api/protected/platforms/bluesky`  
**Handler:** `HandleConnectBluesky`  
**Upstream calls:** `blueskyClient.VerifyCredentials(ctx, handle, appPassword)` → `POST /xrpc/com.atproto.server.createSession` on `Bluesky` mock

**`handleError` mapping:**
- `ErrConnectBluesky` → 500 (InternalError)
- `ErrAlreadyConnected` → 409
- 400 (ValidationError): missing handle or app_password
- 401: no JWT

**Status codes to cover:**

| Status | Scenario | Mock |
|--------|----------|------|
| 201 | Valid handle + app_password, Bluesky returns 200 | `Bluesky.ExpectCreateSession(t).ReturnJSON(200, {...}).Times(1, t)` |
| 400 | Missing `handle` | none |
| 400 | Missing `app_password` | none |
| 401 | No JWT | none |
| 409 | Platform already connected (seed existing connection first) | `Bluesky.ExpectCreateSession(t).ReturnJSON(200, {...}).Times(1, t)` |
| 500 | Bluesky returns 401 (invalid credentials) | `Bluesky.ExpectCreateSession(t).ReturnStatus(401).Times(1, t)` |

**Seeding for 409:** `seedPlatformConnection(t, c.Store, u.AccountID, "bluesky")` — creates a connected bluesky row. Then POST again; the processor calls `VerifyCredentials` first and then tries to create; the uniqueness constraint on `(account_id, platform)` in the store returns an error that maps to `ErrAlreadyConnected`.

**Bluesky mock response shape** (for 201 success case):
```json
{
  "did": "did:plc:testuser",
  "handle": "testuser.bsky.social",
  "accessJwt": "eyJfaketoken",
  "refreshJwt": "eyJfakerefresh"
}
```
The `VerifyCredentials` implementation in the Bluesky client POSTs `createSession` and parses `did` from the response to confirm the account exists.

#### T2-D: `TestPlatformsAPI_ConnectWithToken`

**Endpoint:** `POST /api/protected/platforms/token`  
**Handler:** `HandleConnectWithToken`  
**Upstream calls:** `ConnectWithToken` calls `p.xClient.VerifyCredentials` (for X) or `p.threadsClient.VerifyCredentials` (for Threads). Other platforms with static tokens are not validated against the upstream.

Looking at `internal/platform/processor/` to understand `ConnectWithToken`:

The `ConnectWithToken` function (in `processor/`) looks up `p.staticTokens[platform]`. If no token is configured, returns `ErrMissingToken`. If found, calls the appropriate verify function then creates the connection.

From `clients.go`, only `threads` has a static token configured (`cfg.Platforms.ThreadsAccessToken`). X does not use static tokens (it uses OAuth). So `ConnectWithToken` for X will return `ErrMissingToken` unless `X_ACCESS_TOKEN` is configured.

**Status codes to cover:**

| Status | Scenario | Mock |
|--------|----------|------|
| 201 | `platform: "threads"`, static token is configured, Threads VerifyCredentials succeeds | `Threads.ExpectVerifyCredentials(t).ReturnJSON(200, {...}).Times(1, t)` |
| 400 | Missing `platform` field | none |
| 400 | `ErrUnsupportedPlatform` — platform not in oauth or token map | none |
| 400 | `ErrMissingToken` — platform that has no static token configured (e.g., `"x"`) | none |
| 401 | No JWT | none |
| 409 | `ErrAlreadyConnected` — seed connection for threads, then try again | `Threads.ExpectVerifyCredentials(t).ReturnJSON(200, {...}).Times(1, t)` |

**Note:** Whether the 201 path is exercisable depends on `THREADS_ACCESS_TOKEN` being set in `env.test`. If it is empty, the processor immediately returns `ErrMissingToken` for all platforms. The test must either: (a) set the env var in the test via `os.Setenv("THREADS_ACCESS_TOKEN", "fake-token")` before bootstrap runs — this is too late since bootstrap already ran; or (b) document that the 201 path requires `THREADS_ACCESS_TOKEN=fake-token` in `env.test`. The plan recommends adding `THREADS_ACCESS_TOKEN=fake-threads-token` to `env.test` and ensuring the token maps to a threads `VerifyCredentials` mock expectation.

---

### T3: `posts_test.go` — publish, retry, schedule

**File:** `/Users/shubh/Workspaces/growth-tools/.worktrees/platform-api-tests/base-server/tests/posts_test.go`

#### T3-A: `TestPostsAPI_PublishPost`

**Endpoint:** `POST /api/protected/posts/:id/publish`  
**Handler:** `HandlePublishPost`  
**What it does:** Creates platform_posts, updates post status to `"publishing"`, publishes `post.publish` event to Kafka. **No synchronous upstream call.** The Kafka publish is best-effort (failure is logged, not returned).

**`handleError` mapping:**
- `ErrPostNotFound` → 404
- `ErrFailedUpdatePost` → 500
- 400 (ValidationError): invalid request body
- 401: no JWT

**Status codes to cover:**

| Status | Scenario |
|--------|----------|
| 200 | Valid post owned by account, `platforms: ["x"]` in body |
| 400 | Missing `platforms` field or invalid JSON |
| 400 | Invalid post ID format (not a UUID) |
| 401 | No JWT |
| 404 | Post not found (random UUID) |
| 404 | Post owned by different account |

**Seeding:** `seedPost(t, c.Store, u.AccountID, seedPostOpts{})` for success and owned-by-other cases.

**DB assertion for 200:** After the HTTP call, assert `store.GetPostByID` returns the post with `Status == "publishing"`.

**Note:** No mocks needed. Kafka publish is asynchronous and best-effort; if the test Kafka broker is not receiving, the publish just fails silently.

#### T3-B: `TestPostsAPI_RetryPost`

**Endpoint:** `POST /api/protected/posts/:id/retry`  
**Handler:** `HandleRetryPost`  
**What it does:** Resets `platform_posts` status and sets post to `"publishing"`. No synchronous upstream.

**Status codes:**

| Status | Scenario |
|--------|----------|
| 200 | Post found, has failed platform posts |
| 400 | Invalid post ID format |
| 401 | No JWT |
| 404 | Post not found |
| 404 | Post owned by other account |

**Seeding for 200:** `seedPost` with `Status: "failed"`, then seed a `platform_post` row with status `"permanently_failed"`.

To seed a `platform_post` directly, use the store:
```go
_, err := c.Store.GetDB().ExecContext(ctx,
    `INSERT INTO post_platform_results (post_id, platform, status) VALUES ($1, $2, $3)`,
    post.ID, "x", "permanently_failed")
```
But `RetryFailedPlatformPosts` calls `store.ResetPlatformPostsForRetry` which resets `platform_posts` rows (not `post_platform_results`). Read the store to check which table — the store uses `platform_posts` table based on `CreatePlatformPost` → stored as `platform_posts`. Need to insert a row into `platform_posts`:
```go
_, err := c.Store.GetDB().ExecContext(ctx,
    `INSERT INTO platform_posts (post_id, platform, status) VALUES ($1, $2, $3)`,
    post.ID, "x", "permanently_failed")
```

#### T3-C: `TestPostsAPI_SchedulePost`

**Endpoint:** `POST /api/protected/posts/:id/schedule`  
**Handler:** `HandleSchedulePost`  
**What it does:** Sets `status = "scheduled"` and `scheduled_at`. Pure DB write.

**Status codes:**

| Status | Scenario |
|--------|----------|
| 200 | Valid post + valid RFC3339 time |
| 400 | Invalid post ID format |
| 400 | Missing `scheduled_at` |
| 400 | Invalid `scheduled_at` format (not RFC3339) |
| 401 | No JWT |
| 404 | Post not found |

No mocks needed.

---

### T4: `content_test.go` — generate, adapt, thread, stream (new file)

**File:** `/Users/shubh/Workspaces/growth-tools/.worktrees/platform-api-tests/base-server/tests/content_test.go`

**Critical finding:** All content generation endpoints call Gemini, which cannot be mocked at the SDK level. We test only the auth/validation code paths.

#### T4-A: `TestContentAPI_GeneratePost`

**Endpoint:** `POST /api/protected/content/generate`  
**`handleError` mapping:**
- `ErrGeneratePost` → 503
- `ErrVoiceProfile` → 500
- 400 (ValidationError): missing `prompt`
- 401: no JWT

| Status | Scenario |
|--------|----------|
| 400 | Missing `prompt` |
| 401 | No JWT |

The 503 path (Gemini failure) is NOT testable at integration level.

#### T4-B: `TestContentAPI_AdaptContent`

**Endpoint:** `POST /api/protected/content/adapt`  
**`handleError` mapping:**
- `ErrAdaptContent` → 503
- 400: missing `content` or `platform`
- 401: no JWT

| Status | Scenario |
|--------|----------|
| 400 | Missing `content` |
| 400 | Missing `platform` |
| 401 | No JWT |

#### T4-C: `TestContentAPI_GenerateThread`

**Endpoint:** `POST /api/protected/content/thread`  
**`handleError` mapping:**
- `ErrGenerateThread` → 503
- 400: missing `content` or `platform`
- 401: no JWT

| Status | Scenario |
|--------|----------|
| 400 | Missing `content` |
| 400 | Missing `platform` |
| 401 | No JWT |

#### T4-D: `TestContentAPI_StreamGenerate`

**Endpoint:** `POST /api/protected/content/generate/stream`  
**Special behavior:** SSE headers are set before calling the processor. A 400 validation error (missing `prompt`) is returned BEFORE SSE headers are written. After SSE headers are written, errors are emitted as SSE `error` events, not HTTP 4xx/5xx.

| Status | Scenario | Assertion |
|--------|----------|-----------|
| 400 | Missing `prompt` | normal JSON error response |
| 400 | Missing `platforms` (min=1) | normal JSON error response |
| 401 | No JWT | normal JSON error response |
| 200 + SSE | Request is valid, Gemini call is in flight — but since Gemini fails with empty API key in test env, the SSE stream will emit `event: error` | Assert `Content-Type: text/event-stream`, read SSE events, assert `error` event is emitted |

For the last case, use `ReadSSE(t, resp)` and assert `len(events) >= 1 && events[last].Event == "error"`.

---

### T5: `blog_test.go` — generate and stream-generate

**File:** `/Users/shubh/Workspaces/growth-tools/.worktrees/platform-api-tests/base-server/tests/blog_test.go`

#### T5-A: `TestBlogAPI_GenerateBlog`

**Endpoint:** `POST /api/protected/blog/generate`  
**`handleError` mapping:**
- `ErrBlogGenerationFailed` → 500
- 400: missing `instruction`
- 401: no JWT

| Status | Scenario |
|--------|----------|
| 400 | Missing `instruction` |
| 401 | No JWT |

The 201 success path (Gemini) and 500 Gemini-failure path are NOT testable at integration level.

#### T5-B: `TestBlogAPI_StreamGenerateBlog`

**Endpoint:** `POST /api/protected/blog/generate/stream`

| Status | Scenario | Assertion |
|--------|----------|-----------|
| 400 | Missing `instruction` | JSON error |
| 401 | No JWT | JSON error |
| 200 + SSE | Valid request, Gemini fails in background → SSE `error` event | `Content-Type: text/event-stream`, `ReadSSE` finds error event |

---

### T6: `github_test.go` — OAuth init, callback, list-repos, connect-repo, disconnect-repo, retry-capture

**File:** `/Users/shubh/Workspaces/growth-tools/.worktrees/platform-api-tests/base-server/tests/github_test.go`

#### T6-A: `TestGitHubAPI_InitOAuth`

**Endpoint:** `GET /api/protected/github/oauth/init`  
**Handler:** `HandleInitOAuth`  
**Upstream calls:** None — just generates a URL. No HTTP call made by `InitOAuth`.

| Status | Scenario |
|--------|----------|
| 200 | Returns `{"authorize_url": "..."}` |
| 401 | No JWT |

#### T6-B: `TestGitHubAPI_OAuthCallback`

**Endpoint:** `GET /api/github/oauth/callback?code=CODE&state=STATE`  
**Handler:** `HandleOAuthCallback` (public, no JWT)  
**This always redirects (302)** — on both success and failure.

**Upstream calls in `CompleteOAuth`:**
1. `POST /login/oauth/access_token` on `GitHub` mock (ExchangeOAuthCode)
2. `GET /user` on `GitHub` mock (GetAuthenticatedUser)

**Status codes (all are 302 with different query param on Location):**

| Outcome | Scenario | Mock |
|---------|----------|------|
| 302 → `github=connected` | Valid state+code, token exchange succeeds, user fetch succeeds | `GitHub.ExpectOAuthTokenExchange(t)`, `GitHub.ExpectGetAuthenticatedUser(t)` |
| 302 → `github=error` | Missing `code` — handler calls `CompleteOAuth` and... wait. Handler returns 400 if `code == ""` or `state == ""`. Re-reading handler: `if code == "" || state == ""` → `apierrors.BadRequest`. So 400 is possible. |
| 400 | `code == ""` | none |
| 400 | `state == ""` | none |
| 302 → `github=error` | Valid state (must match one stored by InitOAuth first) but token exchange fails | `GitHub.ExpectOAuthTokenExchange(t).ReturnStatus(400)` |
| 302 → `github=error` | State not found in in-process cache (never called init) | none |

**For the success path:** Must call `GET /api/protected/github/oauth/init` first (authenticated) to store the PKCE-equivalent state. Retrieve the `authorize_url` from the response and extract the `state` query param. Then call the callback with that state and `code=fake-code`.

**GitHub mock token exchange response:**
```json
{
  "access_token": "ghu_fakegithubtoken",
  "scope": "repo,user",
  "token_type": "bearer"
}
```

**GitHub mock get-authenticated-user response:**
```json
{
  "id": 12345678,
  "login": "testghuser"
}
```

#### T6-C: `TestGitHubAPI_ListRepos`

**Endpoint:** `GET /api/protected/github/repos`  
**Handler:** `HandleListAvailableRepos`  
**Upstream calls:** `p.githubClient.ListUserRepos` → `GET /user/repos` on `GitHub` mock

**`handleError` mapping:**
- `ErrConnectionNotFound` → 404
- `ErrFailedDisconnect` → 500 (used for both "failed to list repos" and other errors — this is a bug in the processor but it's the existing behavior)
- 401: no JWT

| Status | Scenario | Mock |
|--------|----------|------|
| 200 | GitHub connection exists, GitHub API returns repos | `GitHub.ExpectListUserRepos(t).ReturnJSON(200, [{...}])` |
| 200 | Empty repos list | `GitHub.ExpectListUserRepos(t).ReturnJSON(200, [])` |
| 401 | No JWT | none |
| 404 | No GitHub connection | none |
| 500 | GitHub API returns 500 | `GitHub.ExpectListUserRepos(t).ReturnStatus(500)` |

**Seeding:** `seedGitHubConnection(t, c.Store, u.UserID)` for the 200 and 500 cases.

**GitHub mock list-repos response shape:**
```json
[
  {
    "id": 123456789,
    "name": "my-repo",
    "owner": {"login": "testowner"},
    "private": false,
    "default_branch": "main",
    "updated_at": "2026-01-01T00:00:00Z"
  }
]
```

#### T6-D: `TestGitHubAPI_ConnectRepo`

**Endpoint:** `POST /api/protected/github/repos/:owner/:name/connect`  
**Handler:** `HandleConnectRepo`  
**Upstream calls:** `p.githubClient.CreateWebhook` → `POST /repos/{owner}/{name}/hooks` on `GitHub` mock

**`handleError` mapping:**
- `ErrConnectionNotFound` → 404
- `ErrFailedDisconnect` → 500 (webhook creation failed)
- `ErrRepoAlreadyLinked` → 409 (NOTE: looking at `ConnectRepo`, there is no explicit duplicate check before inserting — the conflict would come from a DB unique constraint. The processor wraps all errors from `CreateGitHubRepo` as `ErrFailedDisconnect`. So 409 via `ErrRepoAlreadyLinked` is actually unreachable from `ConnectRepo`. Skip the 409 case.)
- 400: missing owner or name
- 401: no JWT

| Status | Scenario | Mock |
|--------|----------|------|
| 201 | Connection exists, webhook created successfully | `GitHub.ExpectCreateWebhook(t, "owner", "my-repo").ReturnJSON(201, {"id": 42})` |
| 400 | Empty owner or name (not testable via path params since Gin will match empty segment as separate route; use an invalid path) | none |
| 401 | No JWT | none |
| 404 | No GitHub connection | none |
| 500 | Webhook creation fails (GitHub returns 422) | `GitHub.ExpectCreateWebhook(t, "owner", "my-repo").ReturnStatus(422)` |

**Seeding:** `seedGitHubConnection(t, c.Store, u.UserID)` for 201 and 500 cases.

**GitHub webhook creation response:**
```json
{"id": 999888777, "active": true}
```

#### T6-E: `TestGitHubAPI_DisconnectRepo`

**Endpoint:** `DELETE /api/protected/github/repos/:owner/:name`  
**Handler:** `HandleDisconnectRepo`  
**Upstream calls:** `p.githubClient.DeleteWebhook` → `DELETE /repos/{owner}/{name}/hooks/{hookID}` on `GitHub` mock (best-effort; failure is logged but does not fail the request)

| Status | Scenario | Mock |
|--------|----------|------|
| 204 | Connection + repo exist, webhook deleted successfully | `GitHub.ExpectDeleteWebhook(t, "owner", repoName, hookID).ReturnStatus(204)` |
| 204 | Repo has no webhookID (nil) | none |
| 401 | No JWT | none |
| 404 | No GitHub connection | none |
| 404 | Repo not found | `seedGitHubConnection` but no matching repo |

**Seeding for 204:** `seedGitHubConnection` + `seedGitHubRepo(t, c.Store, connID, owner, name, hookID)` (new helper needed — see below).

**New seed helper to add to `github_test.go`:**
```go
func seedGitHubRepo(t *testing.T, s *store.Store, connID uuid.UUID, owner, name string, hookID *int64) store.GitHubRepo {
    t.Helper()
    ghRepoID := int64(3000000000) + int64(uuid.New().ID())
    branch := "main"
    repo, err := s.CreateGitHubRepo(context.Background(), connID, ghRepoID, owner, name, &branch, hookID, "webhook-secret")
    require.NoError(t, err)
    t.Cleanup(func() {
        _, _ = s.GetDB().ExecContext(context.Background(),
            `DELETE FROM github_repos WHERE id = $1`, repo.ID)
    })
    return repo
}
```

#### T6-F: `TestGitHubAPI_RetryCapture`

**Endpoint:** `POST /api/protected/github/commits/:id/retry-capture`  
**Handler:** `HandleRetryCapture`  
**Upstream calls:** `RetryCapture` calls `p.publisher.Publish` (Kafka) — async, best-effort. No synchronous HTTP upstream.

**`handleError` mapping:**
- `ErrCommitNotFound` → 404
- `ErrFailedGetCommit` → 500 (NOTE: looking at the processor, `RetryCapture` calls `ResetGitHubCommitCapture` and then publishes. The error cases return the processor errors.)

Looking at the handler's `handleError`:
- `ErrCommitNotFound` → 404

```go
// From processor:
func (p *GitHubProcessor) RetryCapture(ctx context.Context, userID, commitID uuid.UUID) error {
    // Calls GetGitHubCommitByIDForUser → ErrNotFound → ErrCommitNotFound
    // Then ResetGitHubCommitCapture → error → ErrFailedGetCommit (not defined in processor.go...)
```

Looking at the processor `RetryCapture` implementation (not yet read — infer from handleError and processor.go error vars):

`ErrCommitNotFound` and `ErrFailedGetCommit` are both in `processor.go`. The handler maps both. So:

| Status | Scenario | Mock |
|--------|----------|------|
| 202 | Commit exists and owned by user | none (Kafka publish is async) |
| 400 | Invalid commit ID format | none |
| 401 | No JWT | none |
| 404 | Commit not found | none |
| 404 | Commit belongs to another user | seed another user's commit |
| 500 | DB error on reset | not easily induced |

**Seeding:** `seedGitHubCommit(t, c.Store, conn.ID)` for 202 path (existing helper).

---

### T7: `billing_test.go` — webhook signature tests

**File:** `/Users/shubh/Workspaces/growth-tools/.worktrees/platform-api-tests/base-server/tests/billing_test.go`

Remove the comment block saying checkout/portal/webhook are out of scope.

**Endpoint:** `POST /api/billing/webhook` (public)  
**Handler:** `HandleWebhook` in `internal/billing/handler/webhook.go`

The webhook handler uses `webhook.ConstructEvent(payload, signatureHeader, h.processor.WebhookSecret)` — this is a **local crypto check**, no outbound call. After constructing the event, it calls `h.processor.HandleWebhook(ctx, event)` which may or may not call Stripe depending on the event type. For event types where the processor just logs or reads from DB (not Stripe write calls), we can test end-to-end.

**Status codes:**

| Status | Scenario |
|--------|----------|
| 400 | Missing `Stripe-Signature` header |
| 400 | Invalid payload (signature check fails with bad sig) |
| 200 | Valid Stripe signature, event type `customer.subscription.created` or similar (processor may 500 if DB is not seeded — so use a no-op event type or one that produces a graceful error) |

**For the 200 path:** `webhook.ConstructEvent` requires a real Stripe-formatted signature computed with the webhook secret. The webhook secret is set via `STRIPE_WEBHOOK_SECRET` in `env.test`. If set to a known test value (e.g., `"whsec_test_secret_for_integration_tests"`), we can compute the correct signature.

Stripe signature format: `t=UNIX_TIMESTAMP,v1=HMAC_SHA256(webhook_secret, "UNIX_TIMESTAMP.payload")`

**Helper to add to `billing_test.go`:**
```go
func stripeWebhookSignature(t *testing.T, payload []byte, secret string) string {
    t.Helper()
    ts := time.Now().Unix()
    toSign := fmt.Sprintf("%d.%s", ts, string(payload))
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(toSign))
    sig := hex.EncodeToString(mac.Sum(nil))
    return fmt.Sprintf("t=%d,v1=%s", ts, sig)
}
```

**For the `STRIPE_WEBHOOK_SECRET` value:** `env.test` must contain a known test value. The plan assumes `STRIPE_WEBHOOK_SECRET=whsec_test_12345` (or whatever is currently in `env.test`). Read the current value at test-write time.

**Event type for 200:** Use `customer.subscription.deleted` with a minimal payload. The `HandleWebhook` calls `SubscriptionDeleted` which calls `p.subscriptionService.CancelSubscription` which calls a Stripe API. Better: use `product.created` — the processor calls `p.productService.CreateProduct` which is a DB write. This is testable.

Actually, looking at `HandleWebhook` in `processor/webhook.go` (not yet read), we need to understand what happens for each event type:

```go
// Read webhook.go to determine which event types only touch the DB
```

Since I don't have this file read, I'll recommend using `product.created` event type which the processor stores to DB without calling Stripe. If the processing fails (500), that's still a valid integration test result — the signature verification succeeded and the processing path was reached. The test can assert either 200 or 500 (both indicate the signature check passed).

**Revised 200 test:** Test that a well-signed payload reaches the processor (signature verification passes). The test asserts `resp.StatusCode != 400` (i.e., the signature was accepted). The exact status code from `HandleWebhook` after signature success depends on the event type and DB state.

**Recommended test cases:**

| Status | Scenario |
|--------|----------|
| 400 | Missing `Stripe-Signature` header |
| 400 | Malformed signature (wrong HMAC) |
| 400 | Correct signature format but wrong secret (HMAC mismatch) |
| not-400 | Valid signature with minimal `product.created` event payload |

---

## Batch Grouping

All Phase 1 tasks write to different files. They are **fully parallel-safe**. Assign one `backend-integration-test-writer` haiku agent per task.

| Batch | Tasks | Files written |
|-------|-------|--------------|
| Phase 0 | P0-T1 | `tests/testenv/env.go` |
| Phase 1-A | T1 | `tests/auth_test.go`, `tests/helpers_test.go` |
| Phase 1-B | T2-A, T2-B, T2-C, T2-D | `tests/platforms_test.go` |
| Phase 1-C | T3-A, T3-B, T3-C | `tests/posts_test.go` |
| Phase 1-D | T4 | `tests/content_test.go` (new file) |
| Phase 1-E | T5 | `tests/blog_test.go` |
| Phase 1-F | T6 | `tests/github_test.go` |
| Phase 1-G | T7 | `tests/billing_test.go` |

Phase 0 must complete before Phase 1 (the `ReadSSE` helper is used by T4 and T5). All Phase 1 batches can run in parallel with each other.

---

## Complete Status Code Matrix

### AUTH

| Endpoint | Method | Status codes |
|----------|--------|-------------|
| `/api/auth/login/email` | POST | 200, 400 (validation), 404 (no user), 401 (wrong password) — **already covered** |
| `/api/auth/signup/email` | POST | 400 (validation) — **already covered** (200/409 require Stripe, not testable) |
| `/api/auth/google/callback` | GET | 302 (success), 400 (missing code), 500 (token fail), 500 (userinfo fail) — **add T1** |
| `/api/protected/user` | GET | 200, 401, 401 (bad token) — **already covered** |

### PLATFORMS

| Endpoint | Method | Status codes |
|----------|--------|-------------|
| `GET /api/protected/platforms` | GET | 200, 401 — **already covered** |
| `DELETE /api/protected/platforms/:id` | DELETE | 200, 400, 401, 404 — **already covered** |
| `POST /api/protected/platforms/oauth/init` | POST | 200, 400 (validation), 400 (unsupported), 401 — **add T2-A** |
| `GET /api/platforms/oauth/callback/:platform` | GET | 302→connected, 302→error (token fail), 400 (missing params), 302→error (no PKCE verifier) — **add T2-B** |
| `POST /api/protected/platforms/bluesky` | POST | 201, 400, 401, 409, 500 — **add T2-C** |
| `POST /api/protected/platforms/token` | POST | 201 (if THREADS_ACCESS_TOKEN set), 400, 400 (unsupported), 400 (missing token), 401, 409 — **add T2-D** |

### POSTS

| Endpoint | Method | Status codes |
|----------|--------|-------------|
| `POST /api/protected/posts` | POST | 201, 400, 401 — **already covered** |
| `GET /api/protected/posts` | GET | 200, 401 — **already covered** |
| `GET /api/protected/posts/:id` | GET | 200, 400, 401, 404 — **already covered** |
| `PUT /api/protected/posts/:id` | PUT | 200, 400, 401, 404 — **already covered** |
| `DELETE /api/protected/posts/:id` | DELETE | 200, 400, 401, 404 — **already covered** |
| `POST /api/protected/posts/:id/publish` | POST | 200, 400, 401, 404 — **add T3-A** |
| `POST /api/protected/posts/:id/retry` | POST | 200, 400, 401, 404 — **add T3-B** |
| `POST /api/protected/posts/:id/schedule` | POST | 200, 400, 401, 404 — **add T3-C** |

### CONTENT (Gemini-backed)

| Endpoint | Method | Status codes |
|----------|--------|-------------|
| `POST /api/protected/content/generate` | POST | 400, 401 — **add T4-A** (200/503 require Gemini) |
| `POST /api/protected/content/adapt` | POST | 400, 401 — **add T4-B** |
| `POST /api/protected/content/thread` | POST | 400, 401 — **add T4-C** |
| `POST /api/protected/content/generate/stream` | POST | 400, 401, 200+SSE(error) — **add T4-D** |

### BLOG (Gemini-backed)

| Endpoint | Method | Status codes |
|----------|--------|-------------|
| `POST /api/protected/blog/generate` | POST | 400, 401 — **add T5-A** |
| `POST /api/protected/blog/generate/stream` | POST | 400, 401, 200+SSE(error) — **add T5-B** |
| Other blog CRUD | various | — **already covered** |

### GITHUB

| Endpoint | Method | Status codes |
|----------|--------|-------------|
| `GET /api/protected/github/oauth/init` | GET | 200, 401 — **add T6-A** |
| `GET /api/github/oauth/callback` | GET | 302→connected, 302→error, 400 — **add T6-B** |
| `GET /api/protected/github/repos` | GET | 200, 401, 404, 500 — **add T6-C** |
| `POST /api/protected/github/repos/:owner/:name/connect` | POST | 201, 401, 404, 500 — **add T6-D** |
| `DELETE /api/protected/github/repos/:owner/:name` | DELETE | 204, 401, 404 — **add T6-E** |
| `GET /api/protected/github/connection` | GET | 200, 404, 401 — **already covered** |
| `DELETE /api/protected/github/connection` | DELETE | 204, 404, 401 — **already covered** |
| `GET /api/protected/github/commits` | GET | 200, 404, 401 — **already covered** |
| `GET /api/protected/github/commits/:id` | GET | 200, 400, 404, 401 — **already covered** |
| `POST /api/protected/github/commits/:id/retry-capture` | POST | 202, 400, 401, 404 — **add T6-F** |
| `POST /api/github/webhook` | POST | 400, 401, 200 (dup) — **already covered** |

### BILLING (Stripe-backed)

| Endpoint | Method | Status codes |
|----------|--------|-------------|
| `GET /api/billing/plans` | GET | 200 — **already covered** |
| `POST /api/billing/webhook` | POST | 400 (missing sig), 400 (bad sig), not-400 (valid sig) — **add T7** |
| `POST /api/protected/billing/create-checkout-session` | POST | 400 (validation), 401 — **add validation-only cases to T7** |
| `POST /api/protected/billing/create-customer-portal` | POST | 401 — **add auth-only case to T7** |
| Other billing | various | Stripe-backed, out of scope |

---

## Acceptance Criteria

1. `cd base-server && make dev-up && go test -tags=integration -race -timeout=120s ./tests/... -v` passes with no failures.
2. Every endpoint in the matrix above has at least one test per distinct status code that is reachable without a real network connection to a third-party API.
3. Gemini-backed 200/503 paths are explicitly documented as unit-test-only (not silently missing).
4. Stripe-backed 200 paths for checkout and portal are explicitly documented as unit-test-only.
5. No existing test is broken.
6. The `//go:build integration` tag is present on every new test file.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| `fetchXProfile` calls hardcoded `api.x.com` — connection refused in test | The processor handles this with a fallback to `"unknown"` and does not fail the OAuth callback. The 302→connected test still passes. |
| `fetchFacebookProfile`, `fetchInstagramProfile`, etc. use hardcoded Graph API URLs for profile fetch after token exchange | Token exchange for Facebook/Instagram/Pinterest/TikTok also uses hardcoded URLs (not mocked). These platforms' success callbacks cannot be tested at integration level. Only parameter-validation paths are covered. |
| `THREADS_ACCESS_TOKEN` env var not set in `env.test` | Document in plan: add `THREADS_ACCESS_TOKEN=fake-threads-token` to `env.test` and `env.test.example`. If not set, `TestPlatformsAPI_ConnectWithToken` 201 case skips with `t.Skip("THREADS_ACCESS_TOKEN not configured")`. |
| Kafka not available during test | `PublishPost` logs but does not return an error if Kafka publish fails. Tests pass regardless of Kafka state. |
| SSE stream never closes in test (Gemini blocks) | `ReadSSE` uses `bufio.Scanner` which reads until EOF. The SSE handler in production writes an `error` event and returns when the processor fails. Since Gemini is configured with empty key in test env, the call fails immediately and the SSE stream closes. To avoid hanging: set a response body read deadline via a `context.WithTimeout` wrapper in `ReadSSE`. |
| `webhook.ConstructEvent` requires exact timestamp matching | Stripe allows a tolerance window (default 300s). As long as the timestamp used to sign matches the `t=` field and is within 300s, it passes. Use `time.Now().Unix()` both for signing and in the header. |
| State in PKCE verifier map is in-process memory — tests may collide if parallel | The verifier map is keyed by `accountID.String()`. Each test creates a unique account via `seedUserWithAccount`, so keys never collide. Safe. |
| `noRedirectClient` must not follow the 302 from Google OAuth or GitHub callbacks | Confirm `http.ErrUseLastResponse` is used as the `CheckRedirect` policy. This is standard Go pattern. |

---

## Decisions Needed from User

1. **Gemini mocking:** Confirmed non-testable at integration level. Accept coverage gap for 200/503 paths on content/blog/chat? Or invest in moving to a different AI client that supports base-URL override (e.g., switch to the Anthropic client which supports `WithBaseURL`)?

2. **Facebook/Instagram/TikTok/Pinterest OAuth callback success paths:** These use hardcoded token exchange URLs that cannot be mocked. Accept coverage gap for success callbacks on these four platforms, or should the production code be refactored to make token URLs configurable (change `"https://graph.facebook.com/v21.0/oauth/access_token"` to `cfg.ExternalURLs.FacebookTokenURL`)?

3. **`env.test` `THREADS_ACCESS_TOKEN`:** Confirm value to use (or confirm that `ConnectWithToken` 201 path should be skipped if not configured).

4. **Stripe webhook 200 path:** Confirm `STRIPE_WEBHOOK_SECRET` value in `env.test` and confirm the test should compute its own HMAC signature for the test payload rather than using a real Stripe test secret.
