# Testing

**CRITICAL:** All code changes MUST include corresponding tests. Always verify tests pass before considering work complete.

## The Three Test Levels

| Level | Location | What it tests | Dependencies | Command |
|-------|----------|---------------|--------------|---------|
| **Store** | `internal/infra/store/*_test.go` | Every exported store method against real Postgres | Real DB | `make dev-test-store` |
| **Unit** | `internal/*/processor/*_test.go` and `internal/*/handler/*_test.go` | Processor + handler logic with interface mocks | None (mocks) | `make dev-test-unit` |
| **Integration** | `tests/*_test.go` | Real HTTP requests against the real router + real DB, asserting response + DB state | Real DB | `make dev-test-integration` |

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

## Level 3: Integration Tests

**These are real API tests against a server that is already running.** Real HTTP client → real server (in docker or `go run main.go`) → real Postgres. The test process does NOT boot its own server — no `httptest.NewServer`, no `bootstrap.Initialize`, no in-process Gin router. If you need an in-process router, you're writing a handler unit test, not an integration test.

- Tests live in `base-server/tests/*_test.go` with `//go:build integration` so they only run when explicitly requested.
- The target server runs out-of-band. Locally: `make dev-up` plus `go run main.go` in another shell. In CI/docker: `make docker-up` brings up the `server` compose service.
- Tests read `TEST_API_HOST` / `TEST_API_PORT` (defaults `localhost:8080`) to form the base URL and fire real HTTP requests via `http.DefaultClient`.
- Seed the DB **directly through the store package** (same DB container — `TEST_DB_*` env vars). The store handle is for fixture setup and post-mutation assertions; it is not for driving behavior.
- `JWT_SECRET` for minting test tokens MUST match what the running server was started with. Both read it from env; tests default to the value in `base-server/env.test`.
- **Cover every status code the endpoint can return.** 200/201/204 happy paths plus 400/401/403/404/409/422 sad paths as applicable.
- **Do not integration-test paths that call third-party services** (Stripe, Resend, GitHub API, OAuth providers, social platforms). Those are covered by processor/handler unit tests with gomock. Integration tests stay fast and deterministic by only exercising DB-backed behavior.
- Assert both the HTTP response and, when the endpoint mutates state, the DB row directly via the store.

```go
func TestPostsAPI_GetPost(t *testing.T) {
    t.Parallel()
    c := testClient(t) // reads TEST_API_HOST/PORT + TEST_DB_*

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

## Before Completing Any Task

1. Run tests at every level you touched: store tests if the store changed, unit tests if a processor or handler changed, integration tests if an endpoint's behavior changed.
2. `go generate ./...` if you changed a processor or handler interface — the gomock mocks need to regenerate.
3. `go test -race -short ./...` before pushing — catches concurrent-write bugs the per-level runs miss.
4. If you add a new store method, a new processor method, a new handler, or a new endpoint, the same PR must add the corresponding test. A PR that ships new surface with zero test coverage is not mergeable.
