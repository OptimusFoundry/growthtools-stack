# Testing

**CRITICAL:** All code changes MUST include corresponding tests. Always verify tests pass before considering work complete.

## The Three Test Levels

| Level | Location | What it tests | Dependencies |
|-------|----------|---------------|--------------|
| **Unit** | `internal/*/processor/*_test.go` and `internal/*/handler/*_test.go` | Processor + handler logic with interface mocks | None (mocks) |
| **Store** | `internal/infra/store/*_test.go` | Every exported store method against real Postgres | Real DB |
| **Integration** | `tests/*_test.go` | Full HTTP API via an in-process `httptest.Server`, asserting response + DB state | Real DB |

All three run together with `make test`, which brings up the isolated test stack, sources `env.test`, executes each level in order, then tears the stack down. See the Makefile for the exact invocations.

## env.test is the source of truth

`base-server/env.test` holds every knob needed to run the suite — DB creds, `JWT_SECRET`, Stripe test keys, Kafka brokers, platform tokens. Both the Makefile `test` target and the CI workflow source it with `set -a; . ./env.test; set +a` before `go test`. The integration harness also loads it at runtime via `testenv.Start`, as belt-and-suspenders for anyone running `go test` directly. Store tests read `DB_*` vars from the process env — no file loading — which is why sourcing `env.test` first is required.

Changing a port, secret, or token is a single-file edit to `env.test`.

## Universal Rules (apply to ALL test levels)

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

## Level 1: Store Tests

**Coverage requirement: every exported method on `*Store` has at least one test.** If you add a store method, add a test in the same PR. A PR that leaves a store method untested gets rejected.

- Use `SetupTestStore(t)` from `internal/infra/store/test_helpers_test.go` — it reads `DB_*` from env and opens a connection. Seed via `createTestAccount(t, s)` and add new helpers there as needed (e.g. `createTestPost`).
- `if testing.Short() { t.Skip(...) }` at the top so `-short` runs skip store tests.
- Every method gets: happy path + each error branch. CREATE → insert succeeds + constraint violation (unique, FK) when applicable. GET → found + not-found + wrong-account. LIST → populated + empty + filter applied. UPDATE/DELETE → success + not-found (rows_affected=0).

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

## Level 2: Processor / Handler Unit Tests

**Coverage requirement: every public method on every processor and handler has happy + sad path tests.**

- **Mocks are gomock-generated only.** Every mocked dependency goes through `go.uber.org/mock/mockgen` into `mocks_test.go` **in the same directory as the interface being mocked**. Manual `type mockXxx struct { ... }` definitions are not allowed at this level — if you see one, delete it and regenerate.
- Each processor and handler file carries a `go:generate` directive at the top:
  ```go
  //go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor
  ```
- Regenerate after every interface change:
  ```
  go generate ./internal/<feature>/processor/...
  go generate ./internal/<feature>/handler/...
  ```
- If a handler takes a **concrete processor struct** today, extract an interface in the handler package first, wire the handler to the interface, then add the generate directive and generate the mock.
- For handler tests, set up a `gin.TestMode` router (gate with `sync.Once` so parallel tests don't race the global), fire the request with `httptest.NewRecorder()`, assert status + body shape.
- Cover every branch of `handleError` — each `errors.Is` case should have a test that hits it.

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

## Level 3: Integration Tests (in-process server)

**The entire server boots in-process inside the test binary** — no Docker server image, no OS port binding. The test talks to an `httptest.Server` wrapping the real Gin router, backed by the real Postgres from the test stack. Build tag `//go:build integration`.

What `testenv.Start` does (see `tests/testenv/env.go`):

1. Stands up one `httptest.Server` per upstream HTTP client (Google OAuth, GitHub, X, LinkedIn, Bluesky, Facebook, Instagram, Threads, TikTok, Pinterest).
2. Sets env vars (`GOOGLE_OAUTH_TOKEN_URL`, `X_API_BASE`, etc.) so the real client constructors point at those mocks instead of the internet.
3. Loads `env.test` for DB creds, `JWT_SECRET`, Stripe test keys, platform tokens. Already-set env vars (the mock URLs just set above) take precedence.
4. Sets `GO_ENV=test` and calls `config.Load()`.
5. Calls `bootstrap.Initialize()` and `server.New(...).Setup()` to build the real router.
6. Wraps the router in `httptest.NewServer` and opens a direct `*store.Store` handle for fixture seeding and post-mutation assertions.

Background workers are **not** started — `server.Start()` is never called. Only HTTP-in/HTTP-out code paths run.

Rules:

- Cover every status code the endpoint can return. 200/201/204 happy paths plus 400/401/403/404/409/422 sad paths as applicable.
- Do not integration-test paths that call third-party services (Stripe, Resend, OAuth providers, social platforms) except via the mock `httptest.Server`s. Those paths stay covered by processor/handler unit tests with gomock.
- Assert both the HTTP response and, when the endpoint mutates state, the DB row directly via the store handle.
- `JWT_SECRET` used to mint test tokens comes from `env.test` via `config.Load()` — same value the in-process server was started with.

```go
func TestPostsAPI_GetPost(t *testing.T) {
    t.Parallel()
    c := testClient(t)

    tests := []struct {
        name       string
        setup      func(t *testing.T) (token, postID string)
        wantStatus int
        wantBody   func(t *testing.T, body []byte)
    }{
        {
            name: "200 returns the post",
            setup: func(t *testing.T) (string, string) {
                user := seedUser(t, c.Store)
                acct := seedAccount(t, c.Store, user.ID)
                post := seedPost(t, c.Store, acct.ID, seedPostOpts{Content: "hello"})
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
                user := seedUser(t, c.Store)
                return newJWT(t, user.ID), uuid.New().String()
            },
            wantStatus: http.StatusNotFound,
        },
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            token, postID := tt.setup(t)
            resp, body := c.Request(t, http.MethodGet, "/api/protected/posts/"+postID, nil, token)
            assert.Equal(t, tt.wantStatus, resp.StatusCode)
            if tt.wantBody != nil {
                tt.wantBody(t, body)
            }
        })
    }
}
```

## Running Tests

```bash
# Full suite — brings stack up, sources env.test, runs all three levels, tears down
make test

# Just the test stack (inspect it between runs, or iterate manually)
make test-up
set -a; . ./env.test; set +a
go test -race -short ./...                       # unit
go test -race ./internal/infra/store/...         # store
go test -v -race -tags=integration ./tests/...   # integration
make test-down

# Single test
set -a; . ./env.test; set +a
go test -run TestPostsAPI_GetPost -tags=integration ./tests/...
```

CI invokes `go test` and `docker compose` directly (not via `make`) but uses the same `env.test` sourcing pattern — see `.github/workflows/*-server.yml`.

## Before Completing Any Task

1. Run tests at every level you touched: store tests if the store changed, unit tests if a processor or handler changed, integration tests if an endpoint's behavior changed.
2. `go generate ./...` if you changed a processor or handler interface — the gomock mocks need to regenerate.
3. `make test` before pushing — catches concurrent-write bugs the per-level runs miss.
4. If you add a new store method, a new processor method, a new handler, or a new endpoint, the same PR must add the corresponding test.
