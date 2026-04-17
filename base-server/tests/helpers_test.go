//go:build integration

package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"base-server/internal/infra/bootstrap"
	"base-server/internal/infra/config"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/server"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

// sharedSrv is the single TestServer shared across all tests in this package.
// Using one server avoids concurrent calls to bootstrap.Initialize which would
// race on third-party SDK global state (e.g. stripe.Key).
var sharedSrv *TestServer

// TestMain runs once before any test in the package. We use it to set the
// process-wide environment variables that config.Load requires. Using
// t.Setenv inside t.Parallel tests would panic, so we set them here instead.
func TestMain(m *testing.M) {
	// Tell config.Load not to look for env.local.
	os.Setenv("GO_ENV", "test")

	// DB — prefer TEST_DB_* overrides, fall back to docker-compose defaults.
	setenv("DB_HOST", envOrDefault("TEST_DB_HOST", "localhost"))
	setenv("DB_USERNAME", envOrDefault("TEST_DB_USER", "base_user"))
	setenv("DB_PASSWORD", envOrDefault("TEST_DB_PASS", "base_password"))
	setenv("DB_NAME", envOrDefault("TEST_DB_NAME", "base_db"))

	// Auth / services — fake values; tests never actually call these third parties.
	setenv("JWT_SECRET", "test_jwt_secret_for_integration_tests")
	setenv("GOOGLE_CLIENT_ID", "test-google-client-id")
	setenv("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
	setenv("GOOGLE_REDIRECT_URI", "http://localhost:8080/api/auth/google/callback")
	setenv("STRIPE_SECRET_KEY", "sk_test_fake_key_for_tests")
	setenv("STRIPE_WEBHOOK_SECRET", "whsec_fake_for_tests")
	setenv("RESEND_API_KEY", "re_fake_for_tests")
	setenv("DEFAULT_EMAIL_SENDER_ADDRESS", "noreply@test.example.com")
	setenv("WEBAPP_URI", "http://localhost:3000")
	setenv("SERVER_PORT", "0") // httptest.NewServer picks its own port

	// Optional services — empty values are fine.
	setenv("GOOGLE_AI_API_KEY", "fake-gemini-key")
	setenv("STORAGE_TYPE", "local")
	setenv("MEDIA_DIR", os.TempDir())
	setenv("MEDIA_PUBLIC_URL_BASE", "http://localhost/public/media/file")
	setenv("GITHUB_WEBHOOK_SECRET", "test-webhook-secret")
	setenv("KAFKA_BROKERS", "localhost:9092")
	setenv("KAFKA_CONSUMER_GROUP", "test-consumers")

	gin.SetMode(gin.TestMode)

	// Boot the shared test server once, before any test runs.
	srv, cleanup := initSharedServer()
	sharedSrv = srv
	code := m.Run()
	cleanup()
	os.Exit(code)
}

// setenv sets key=value only if key is not already set (so callers can
// override via real env vars if needed).
func setenv(key, value string) {
	if os.Getenv(key) == "" {
		os.Setenv(key, value) //nolint:errcheck
	}
}

func envOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// TestServer bundles the live HTTP server + direct store handle so tests
// can assert DB state without going through the API.
type TestServer struct {
	HTTP  *httptest.Server
	Store *store.Store
}

// setupTestServer returns the package-level shared TestServer. It is
// initialized exactly once (in TestMain) so that parallel outer tests do not
// race on third-party SDK global state (e.g. stripe.Key set in products.New).
func setupTestServer(t *testing.T) *TestServer {
	t.Helper()
	if sharedSrv == nil {
		t.Fatal("sharedSrv not initialized — ensure TestMain calls initSharedServer")
	}
	return sharedSrv
}

// initSharedServer creates the shared test server. Called from TestMain before
// m.Run() so it runs in a single goroutine.
func initSharedServer() (*TestServer, func()) {
	cfg, err := config.Load()
	if err != nil {
		panic("initSharedServer: failed to load config: " + err.Error())
	}

	logger := observability.NewLogger()
	ctx := context.Background()

	deps, err := bootstrap.Initialize(ctx, cfg, logger)
	if err != nil {
		panic("initSharedServer: failed to initialize dependencies: " + err.Error())
	}

	srv := server.New(cfg, deps, logger)
	srv.Setup()

	ts := httptest.NewServer(srv.Router())
	cleanup := func() {
		ts.Close()
		deps.Cleanup()
	}

	return &TestServer{HTTP: ts, Store: &deps.Store}, cleanup
}

// jwtSecret must match the value set in setTestEnv.
const jwtSecret = "test_jwt_secret_for_integration_tests"

// newJWT mints a signed JWT that the HandleJWTMiddleware will accept.
// userID becomes the "sub" claim; accountID becomes "account_id".
func newJWT(t *testing.T, userID, accountID uuid.UUID) string {
	t.Helper()
	claims := jwt.MapClaims{
		"sub":        userID.String(),
		"account_id": accountID.String(),
		"auth_type":  "email",
		"iss":        "base-server",
		"aud":        "base-server",
		"exp":        time.Now().Add(24 * time.Hour).Unix(),
		"iat":        time.Now().Unix(),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString([]byte(jwtSecret))
	require.NoError(t, err)
	return signed
}

// ── Seed helpers ─────────────────────────────────────────────────────────────
// All seeds go directly through the store so tests are not coupled to each
// other's endpoints.

// seedUserAndAccount inserts a user row and an account row owned by that user.
// Returns userID and accountID.
func seedUserAndAccount(t *testing.T, s *store.Store) (userID uuid.UUID, accountID uuid.UUID) {
	t.Helper()
	ctx := context.Background()

	userID = uuid.New()
	_, err := s.GetDB().ExecContext(ctx,
		`INSERT INTO users (id, first_name, last_name, stripe_customer_id) VALUES ($1, $2, $3, $4)`,
		userID, "Test", "User", fmt.Sprintf("cus_test_%s", userID.String()[:8]))
	require.NoError(t, err, "seedUserAndAccount: insert user")

	acct, err := s.CreateAccount(ctx, store.CreateAccountParams{
		Name:        "Test Account " + userID.String()[:8],
		Slug:        "test-" + userID.String()[:8],
		OwnerUserID: userID,
		Plan:        store.AccountPlanFree,
	})
	require.NoError(t, err, "seedUserAndAccount: create account")

	return userID, acct.ID
}

type seedPostOpts struct {
	Content     string
	ContentType string
	Status      string
	Tags        []string
}

// seedPost inserts a post directly into the DB.
func seedPost(t *testing.T, s *store.Store, accountID uuid.UUID, opts seedPostOpts) store.Post {
	t.Helper()
	content := opts.Content
	if content == "" {
		content = "default test content"
	}
	contentType := opts.ContentType
	if contentType == "" {
		contentType = "text"
	}
	status := opts.Status
	if status == "" {
		status = "draft"
	}
	tags := store.StringArray(opts.Tags)
	if tags == nil {
		tags = store.StringArray{}
	}
	post, err := s.CreatePost(context.Background(), store.CreatePostParams{
		AccountID:   accountID,
		Content:     content,
		ContentType: contentType,
		Status:      status,
		Source:      "manual",
		Tags:        tags,
		MediaIDs:    store.UUIDArray{},
	})
	require.NoError(t, err, "seedPost")
	return post
}

type seedBlogOpts struct {
	Title   string
	Slug    string
	Content string
	Status  string
}

// seedBlogPost inserts a blog post directly into the DB.
func seedBlogPost(t *testing.T, s *store.Store, accountID uuid.UUID, opts seedBlogOpts) store.BlogPost {
	t.Helper()
	title := opts.Title
	if title == "" {
		title = "Test Blog Post"
	}
	slug := opts.Slug
	if slug == "" {
		slug = "test-blog-" + uuid.New().String()[:8]
	}
	content := opts.Content
	if content == "" {
		content = "blog content"
	}
	status := opts.Status
	if status == "" {
		status = "draft"
	}
	bp, err := s.CreateBlogPost(context.Background(), store.CreateBlogPostParams{
		AccountID: accountID,
		Title:     title,
		Slug:      slug,
		Content:   content,
		Status:    status,
		Keywords:  store.StringArray{},
	})
	require.NoError(t, err, "seedBlogPost")
	return bp
}

// seedVoiceProfile inserts a voice profile directly into the DB.
func seedVoiceProfile(t *testing.T, s *store.Store, accountID uuid.UUID) store.VoiceProfile {
	t.Helper()
	vp, err := s.CreateVoiceProfile(context.Background(), store.CreateVoiceProfileParams{
		AccountID:    accountID,
		Tone:         "professional",
		Style:        "concise",
		ExamplePosts: store.StringArray{"example post one"},
	})
	require.NoError(t, err, "seedVoiceProfile")
	return vp
}

// seedPlatformConnection inserts a platform connection directly into the DB.
func seedPlatformConnection(t *testing.T, s *store.Store, accountID uuid.UUID, platform string) store.PlatformConnection {
	t.Helper()
	dn := "Test User"
	pc, err := s.CreatePlatformConnection(context.Background(), store.CreatePlatformConnectionParams{
		AccountID:      accountID,
		Platform:       platform,
		PlatformUserID: "testuser-" + uuid.New().String()[:8],
		DisplayName:    &dn,
		AccessToken:    "test-access-token",
		Scopes:         store.StringArray{"read", "write"},
	})
	require.NoError(t, err, "seedPlatformConnection")
	return pc
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

// Request fires an HTTP call against the test server and returns the response
// and body bytes. token, if non-empty, is sent as a "token" cookie — matching
// the cookie the HandleJWTMiddleware reads.
func (s *TestServer) Request(t *testing.T, method, path string, body any, token string) (*http.Response, []byte) {
	t.Helper()

	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		require.NoError(t, err)
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, s.HTTP.URL+path, reqBody)
	require.NoError(t, err)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.AddCookie(&http.Cookie{Name: "token", Value: token})
	}

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)

	respBody, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	_ = resp.Body.Close()

	return resp, respBody
}

// RequestWithHeaders fires an HTTP call with arbitrary additional headers.
func (s *TestServer) RequestWithHeaders(t *testing.T, method, path string, body []byte, headers map[string]string) (*http.Response, []byte) {
	t.Helper()

	var reqBody io.Reader
	if body != nil {
		reqBody = bytes.NewReader(body)
	}

	req, err := http.NewRequest(method, s.HTTP.URL+path, reqBody)
	require.NoError(t, err)
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)

	respBody, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	_ = resp.Body.Close()

	return resp, respBody
}

// ── Shared response types ─────────────────────────────────────────────────────

type errorResponse struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

type messageResponse struct {
	Message string `json:"message"`
}

// strPtr returns a pointer to s, used when constructing optional fields.
func strPtr(s string) *string { return &s }
