// Package testenv provides the global integration-test harness.
// It is a non-_test package so it can be imported by main_test.go and
// the individual test files.
package testenv

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"base-server/internal/infra/bootstrap"
	"base-server/internal/infra/config"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/server"
	"base-server/internal/infra/store"
	"base-server/tests/mocks"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Env is the single global test harness. It holds the in-process server URL,
// a direct DB handle for seeding, and per-client mock handles.
type Env struct {
	// BaseURL is the URL of the httptest.Server wrapping the real gin router.
	BaseURL string

	// DB is a direct sqlx handle to the same Postgres instance the server uses.
	// Use it for seeding and assertions; do not use it for application logic.
	DB *store.Store

	// Mock handles — one per upstream client.
	GoogleOAuth *mocks.GoogleOAuthMock
	GitHub      *mocks.GitHubMock
	X           *mocks.XMock
	LinkedIn    *mocks.LinkedInMock
	Bluesky     *mocks.BlueskyMock
	Facebook    *mocks.FacebookMock
	Instagram   *mocks.InstagramMock
	Threads     *mocks.ThreadsMock
	TikTok      *mocks.TikTokMock
	Pinterest   *mocks.PinterestMock

	// internal
	httpServer *httptest.Server
	jwtSecret  string
}

// GlobalEnv is set by Start and read by testClient() in helpers_test.go.
var GlobalEnv *Env

// Start initialises the full environment: mock servers, config, bootstrap,
// gin router, httptest.Server. Sets GlobalEnv. Must be called from TestMain.
func Start(_ *testing.M) *Env {
	ctx := context.Background()
	logger := observability.NewLogger()

	e := &Env{}

	// Start one mock server per upstream.
	googleOAuthMock := mocks.NewMockServer()
	githubMock := mocks.NewMockServer()
	xMock := mocks.NewMockServer()
	linkedinMock := mocks.NewMockServer()
	blueskyMock := mocks.NewMockServer()
	facebookMock := mocks.NewMockServer()
	instagramMock := mocks.NewMockServer()
	threadsMock := mocks.NewMockServer()
	tiktokMock := mocks.NewMockServer()
	pinterestMock := mocks.NewMockServer()

	e.GoogleOAuth = &mocks.GoogleOAuthMock{MockServer: googleOAuthMock}
	e.GitHub = &mocks.GitHubMock{MockServer: githubMock}
	e.X = &mocks.XMock{MockServer: xMock}
	e.LinkedIn = &mocks.LinkedInMock{MockServer: linkedinMock}
	e.Bluesky = &mocks.BlueskyMock{MockServer: blueskyMock}
	e.Facebook = &mocks.FacebookMock{MockServer: facebookMock}
	e.Instagram = &mocks.InstagramMock{MockServer: instagramMock}
	e.Threads = &mocks.ThreadsMock{MockServer: threadsMock}
	e.TikTok = &mocks.TikTokMock{MockServer: tiktokMock}
	e.Pinterest = &mocks.PinterestMock{MockServer: pinterestMock}

	// Set env vars to point clients at mock servers.
	// These override whatever env.test sets.
	os.Setenv("GOOGLE_OAUTH_TOKEN_URL", googleOAuthMock.Server.URL+"/token")
	os.Setenv("GOOGLE_USERINFO_URL", googleOAuthMock.Server.URL+"/userinfo")
	os.Setenv("GITHUB_API_BASE", githubMock.Server.URL)
	os.Setenv("GITHUB_OAUTH_TOKEN_URL", githubMock.Server.URL+"/login/oauth/access_token")
	os.Setenv("X_API_BASE", xMock.Server.URL)
	os.Setenv("LINKEDIN_API_BASE", linkedinMock.Server.URL)
	os.Setenv("BLUESKY_PDS_HOST", blueskyMock.Server.URL)
	os.Setenv("FACEBOOK_GRAPH_BASE", facebookMock.Server.URL)
	os.Setenv("INSTAGRAM_GRAPH_BASE", instagramMock.Server.URL)
	os.Setenv("THREADS_API_BASE", threadsMock.Server.URL)
	os.Setenv("TIKTOK_API_BASE", tiktokMock.Server.URL)
	os.Setenv("PINTEREST_API_BASE", pinterestMock.Server.URL)
	// OAuth token exchange URL overrides for FB/IG/TikTok/Pinterest
	os.Setenv("FACEBOOK_OAUTH_TOKEN_URL", facebookMock.Server.URL+"/v21.0/oauth/access_token")
	os.Setenv("INSTAGRAM_OAUTH_TOKEN_URL", instagramMock.Server.URL+"/v21.0/oauth/access_token")
	os.Setenv("TIKTOK_OAUTH_TOKEN_URL", tiktokMock.Server.URL+"/v2/oauth/token/")
	os.Setenv("PINTEREST_OAUTH_TOKEN_URL", pinterestMock.Server.URL+"/v5/oauth/token")

	// Load env.test for DB credentials, AUTH_JWT_SECRET, etc.
	// We load manually so that mock URL env vars (already set above) are not
	// overwritten.
	loadEnvTestFile("env.test")

	// Load config (picks up DB settings + mock URLs from environment).
	// Must set GO_ENV=test so config.Load doesn't try to read env.local.
	os.Setenv("GO_ENV", "test")
	cfg, err := config.Load()
	if err != nil {
		panic(fmt.Sprintf("testenv: failed to load config: %v", err))
	}

	e.jwtSecret = cfg.Auth.JWTSecret

	// Initialize all dependencies (clients, processors, handlers).
	// This wires all platform clients to the mock servers via cfg.ExternalURLs.
	deps, err := bootstrap.Initialize(ctx, cfg, logger)
	if err != nil {
		panic(fmt.Sprintf("testenv: failed to initialize bootstrap: %v", err))
	}

	// Build the gin router and wrap it in an httptest.Server.
	// We call Setup() but never Start() so background workers never launch.
	srv := server.New(cfg, deps, logger)
	srv.Setup()
	e.httpServer = httptest.NewServer(srv.Router())
	e.BaseURL = e.httpServer.URL

	// Open a direct DB store for seeding/assertions.
	connStr := cfg.Database.ConnectionString()
	dbStore, err := store.New(connStr, logger)
	if err != nil {
		panic(fmt.Sprintf("testenv: failed to open DB store: %v", err))
	}
	e.DB = &dbStore

	GlobalEnv = e
	return e
}

// loadEnvTestFile reads a .env-style file and sets any unset environment variables.
// Already-set values (like mock server URLs) take precedence.
func loadEnvTestFile(filename string) {
	data, err := os.ReadFile(filename)
	if err != nil {
		// Try one directory up (when tests run from tests/ subdir).
		data, err = os.ReadFile("../" + filename)
		if err != nil {
			return // Missing env.test is OK when CI exports all vars directly.
		}
	}

	for _, line := range splitNewlines(string(data)) {
		key, val, ok := parseEnvLine(line)
		if !ok {
			continue
		}
		// Don't overwrite existing env vars — mock URLs take precedence.
		if os.Getenv(key) == "" {
			os.Setenv(key, val)
		}
	}
}

func splitNewlines(s string) []string {
	var lines []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			lines = append(lines, s[start:i])
			start = i + 1
		}
	}
	if start < len(s) {
		lines = append(lines, s[start:])
	}
	return lines
}

func parseEnvLine(line string) (key, val string, ok bool) {
	// Strip inline comments.
	for i, c := range line {
		if c == '#' {
			line = line[:i]
			break
		}
	}
	line = trimWhitespace(line)
	if line == "" {
		return "", "", false
	}
	for i, c := range line {
		if c == '=' {
			key = trimWhitespace(line[:i])
			val = trimWhitespace(line[i+1:])
			// Strip surrounding quotes.
			if len(val) >= 2 &&
				((val[0] == '"' && val[len(val)-1] == '"') ||
					(val[0] == '\'' && val[len(val)-1] == '\'')) {
				val = val[1 : len(val)-1]
			}
			return key, val, key != ""
		}
	}
	return "", "", false
}

func trimWhitespace(s string) string {
	start := 0
	for start < len(s) && (s[start] == ' ' || s[start] == '\t' || s[start] == '\r') {
		start++
	}
	end := len(s)
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\r') {
		end--
	}
	return s[start:end]
}

// Stop shuts down the httptest.Server and all mock servers cleanly.
// Must be called from TestMain after m.Run() returns.
func (e *Env) Stop() {
	if e.httpServer != nil {
		e.httpServer.Close()
	}
	e.GoogleOAuth.Stop()
	e.GitHub.Stop()
	e.X.Stop()
	e.LinkedIn.Stop()
	e.Bluesky.Stop()
	e.Facebook.Stop()
	e.Instagram.Stop()
	e.Threads.Stop()
	e.TikTok.Stop()
	e.Pinterest.Stop()
	if e.DB != nil {
		_ = e.DB.GetDB().Close()
	}
}

// TruncateAll truncates all application tables in dependency order.
// Call at the start of a test that needs a fully clean DB rather than
// per-row cleanup.
func (e *Env) TruncateAll(t *testing.T) {
	t.Helper()
	_, err := e.DB.GetDB().ExecContext(context.Background(), `
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
		RESTART IDENTITY CASCADE
	`)
	if err != nil {
		t.Fatalf("TruncateAll: %v", err)
	}
}

// AsUser returns an AuthedClient that signs requests with a JWT for the given
// userID (UUID string) and stamps a unique X-Request-ID on every call.
func (e *Env) AsUser(t *testing.T, userID string) *AuthedClient {
	t.Helper()
	return &AuthedClient{
		baseURL:   e.BaseURL,
		userID:    userID,
		jwtSecret: e.jwtSecret,
	}
}

// AuthedClient wraps an authenticated HTTP client bound to a specific user.
// Every method generates a fresh X-Request-ID and returns it as a string so
// the caller can pass it to mock expectations via ForRequestID.
type AuthedClient struct {
	baseURL   string
	userID    string
	jwtSecret string
}

// makeJWT generates a JWT for the client's userID.
// The claims shape mirrors generateJWTToken in auth/processor/jwt.go.
func (c *AuthedClient) makeJWT() string {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":        c.userID,
		"account_id": c.userID,
		"auth_type":  "email",
		"iss":        "base-server",
		"aud":        "base-server",
		"exp":        now.Add(time.Hour).Unix(),
		"iat":        now.Unix(),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := tok.SignedString([]byte(c.jwtSecret))
	return signed
}

// httpClient is a short-lived client for each request.
var httpClientInstance = &http.Client{Timeout: 15 * time.Second}

// Do executes req against the in-process server. It stamps a fresh UUID v4 as
// X-Request-ID on the request and sets the JWT as a `token` cookie.
// Returns (response, requestID, error).
func (c *AuthedClient) Do(req *http.Request) (*http.Response, string, error) {
	if req.Header == nil {
		req.Header = make(http.Header)
	}
	reqID := uuid.New().String()
	req.Header.Set("X-Request-ID", reqID)
	req.AddCookie(&http.Cookie{Name: "token", Value: c.makeJWT()})

	resp, err := httpClientInstance.Do(req)
	return resp, reqID, err
}

// Get issues a GET to path and returns (response, requestID, error).
func (c *AuthedClient) Get(path string) (*http.Response, string, error) {
	req, err := http.NewRequest(http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return nil, "", fmt.Errorf("AuthedClient.Get: %w", err)
	}
	return c.Do(req)
}

// PostJSON marshals body to JSON, issues a POST to path with
// Content-Type: application/json, and returns (response, requestID, error).
func (c *AuthedClient) PostJSON(path string, body any) (*http.Response, string, error) {
	var bodyBytes []byte
	if body != nil {
		var err error
		bodyBytes, err = json.Marshal(body)
		if err != nil {
			return nil, "", fmt.Errorf("AuthedClient.PostJSON marshal: %w", err)
		}
	}
	req, err := http.NewRequest(http.MethodPost, c.baseURL+path, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, "", fmt.Errorf("AuthedClient.PostJSON: %w", err)
	}
	req.Header = make(http.Header)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return c.Do(req)
}

// Delete issues a DELETE to path and returns (response, requestID, error).
func (c *AuthedClient) Delete(path string) (*http.Response, string, error) {
	req, err := http.NewRequest(http.MethodDelete, c.baseURL+path, nil)
	if err != nil {
		return nil, "", fmt.Errorf("AuthedClient.Delete: %w", err)
	}
	return c.Do(req)
}

// SSEEvent represents a single server-sent event.
type SSEEvent struct {
	Event string // value of the "event:" line; empty if no event line
	Data  string // value of the "data:" line(s) concatenated with "\n"
}

// ReadSSE reads all SSE events from resp.Body until EOF.
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
