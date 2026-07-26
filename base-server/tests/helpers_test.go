//go:build integration

package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"testing"
	"time"

	"base-server/internal/infra/store"
	"base-server/tests/testenv"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

// Client is a thin HTTP client bound to the already-running API server
// plus a direct Postgres store handle for seeding and assertions.
type Client struct {
	baseURL string
	http    *http.Client
	Store   *store.Store
}

func testClient(t *testing.T) *Client {
	t.Helper()
	return &Client{
		baseURL: testenv.GlobalEnv.BaseURL,
		http:    &http.Client{Timeout: 15 * time.Second},
		Store:   testenv.GlobalEnv.DB,
	}
}

// Request fires an HTTP call at the running server and returns response + body.
func (c *Client) Request(t *testing.T, method, path string, body any, token string) (*http.Response, []byte) {
	t.Helper()

	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		require.NoError(t, err)
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, c.baseURL+path, reqBody)
	require.NoError(t, err)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.AddCookie(&http.Cookie{Name: "token", Value: token})
	}

	resp, err := c.http.Do(req)
	require.NoError(t, err)

	respBody, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	_ = resp.Body.Close()

	return resp, respBody
}

// newJWT signs a token the running server's auth middleware will accept.
// JWT claims shape mirrors generateJWTToken in auth/processor/jwt.go:
//
//	sub=userID, account_id=accountID, auth_type="email",
//	iss="base-server", aud="base-server"
func newJWT(t *testing.T, userID, accountID uuid.UUID) string {
	t.Helper()
	secret := envOrDefault("AUTH_JWT_SECRET", "base_secret")
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":        userID.String(),
		"account_id": accountID.String(),
		"auth_type":  "email",
		"iss":        "base-server",
		"aud":        "base-server",
		"exp":        now.Add(time.Hour).Unix(),
		"iat":        now.Unix(),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString([]byte(secret))
	require.NoError(t, err)
	return signed
}

// ============================================================================
// Seed helpers — insert rows directly so tests don't couple to endpoints.
// ============================================================================

type seedUserResult struct {
	UserID    uuid.UUID
	AccountID uuid.UUID
	Token     string
}

// seedUserWithAccount creates a fresh user + account in the DB and returns a
// signed JWT that the running server will accept.
func seedUserWithAccount(t *testing.T, s *store.Store) seedUserResult {
	t.Helper()
	ctx := context.Background()

	userID := uuid.New()
	_, err := s.GetDB().ExecContext(ctx,
		`INSERT INTO users (id, first_name, last_name, stripe_customer_id) VALUES ($1, $2, $3, $4)`,
		userID, "Test", "User-"+userID.String()[:8], "")
	require.NoError(t, err)

	// user_auth row required by the email login path (and the JWT validator
	// cross-references it via GetUserByAuthID).
	authID := uuid.New()
	_, err = s.GetDB().ExecContext(ctx,
		`INSERT INTO user_auth (id, user_id, auth_type) VALUES ($1, $2, $3)`,
		authID, userID, "email")
	require.NoError(t, err)

	hashed, err := bcrypt.GenerateFromPassword([]byte("TestPass1!"), bcrypt.MinCost)
	require.NoError(t, err)
	email := fmt.Sprintf("user-%s@test.example.com", userID.String()[:8])
	_, err = s.GetDB().ExecContext(ctx,
		`INSERT INTO email_auth (auth_id, email, hashed_password) VALUES ($1, $2, $3)`,
		authID, email, string(hashed))
	require.NoError(t, err)

	account, err := s.CreateAccount(ctx, store.CreateAccountParams{
		Name:        "Test Account " + userID.String()[:8],
		Slug:        "test-" + userID.String()[:8],
		OwnerUserID: userID,
		Plan:        "free",
	})
	require.NoError(t, err)

	t.Cleanup(func() {
		bg := context.Background()
		// Delete in reverse FK order.
		_, _ = s.GetDB().ExecContext(bg, `DELETE FROM accounts WHERE id = $1`, account.ID)
		_, _ = s.GetDB().ExecContext(bg, `DELETE FROM email_auth WHERE auth_id = $1`, authID)
		_, _ = s.GetDB().ExecContext(bg, `DELETE FROM user_auth WHERE id = $1`, authID)
		_, _ = s.GetDB().ExecContext(bg, `DELETE FROM users WHERE id = $1`, userID)
	})

	return seedUserResult{
		UserID:    userID,
		AccountID: account.ID,
		Token:     newJWT(t, userID, account.ID),
	}
}

type seedPostOpts struct {
	Content     string
	ContentType string
	Status      string
	Source      string
}

func seedPost(t *testing.T, s *store.Store, accountID uuid.UUID, opts seedPostOpts) store.Post {
	t.Helper()
	if opts.Content == "" {
		opts.Content = "test content"
	}
	if opts.ContentType == "" {
		opts.ContentType = "text"
	}
	if opts.Status == "" {
		opts.Status = "draft"
	}
	if opts.Source == "" {
		opts.Source = "manual"
	}

	post, err := s.CreatePost(context.Background(), store.CreatePostParams{
		AccountID:   accountID,
		Content:     opts.Content,
		ContentType: opts.ContentType,
		Status:      opts.Status,
		Source:      opts.Source,
		Tags:        store.StringArray{},
		MediaIDs:    store.UUIDArray{},
	})
	require.NoError(t, err)

	t.Cleanup(func() {
		_, _ = s.GetDB().ExecContext(context.Background(),
			`DELETE FROM posts WHERE id = $1`, post.ID)
	})
	return post
}

type seedBlogOpts struct {
	Title   string
	Slug    string
	Content string
	Status  string
}

func seedBlog(t *testing.T, s *store.Store, accountID uuid.UUID, opts seedBlogOpts) store.BlogPost {
	t.Helper()
	if opts.Title == "" {
		opts.Title = "Test Blog " + uuid.New().String()[:8]
	}
	if opts.Slug == "" {
		opts.Slug = "test-blog-" + uuid.New().String()[:8]
	}
	if opts.Content == "" {
		opts.Content = "blog content"
	}
	if opts.Status == "" {
		opts.Status = "draft"
	}

	bp, err := s.CreateBlogPost(context.Background(), store.CreateBlogPostParams{
		AccountID: accountID,
		Title:     opts.Title,
		Slug:      opts.Slug,
		Content:   opts.Content,
		Status:    opts.Status,
		Keywords:  store.StringArray{},
	})
	require.NoError(t, err)

	t.Cleanup(func() {
		_, _ = s.GetDB().ExecContext(context.Background(),
			`DELETE FROM blog_posts WHERE id = $1`, bp.ID)
	})
	return bp
}

func seedMedia(t *testing.T, s *store.Store, accountID uuid.UUID) store.Media {
	t.Helper()
	m, err := s.CreateMedia(context.Background(), store.CreateMediaParams{
		AccountID:   accountID,
		Filename:    "test.jpg",
		ContentType: "image/jpeg",
		S3Key:       accountID.String() + "/" + uuid.New().String() + ".jpg",
		S3URL:       "https://fake-s3.example.com/test.jpg",
		SizeBytes:   1024,
		Source:      "upload",
	})
	require.NoError(t, err)

	t.Cleanup(func() {
		_, _ = s.GetDB().ExecContext(context.Background(),
			`DELETE FROM media WHERE id = $1`, m.ID)
	})
	return m
}

func seedVoiceProfile(t *testing.T, s *store.Store, accountID uuid.UUID) store.VoiceProfile {
	t.Helper()
	vp, err := s.CreateVoiceProfile(context.Background(), store.CreateVoiceProfileParams{
		AccountID:    accountID,
		Tone:         "professional",
		Style:        "formal",
		ExamplePosts: store.StringArray{},
	})
	require.NoError(t, err)

	t.Cleanup(func() {
		_, _ = s.GetDB().ExecContext(context.Background(),
			`DELETE FROM voice_profiles WHERE account_id = $1`, accountID)
	})
	return vp
}

func seedPlatformConnection(t *testing.T, s *store.Store, accountID uuid.UUID, platform string) store.PlatformConnection {
	t.Helper()
	conn, err := s.CreatePlatformConnection(context.Background(), store.CreatePlatformConnectionParams{
		AccountID:      accountID,
		Platform:       platform,
		PlatformUserID: "test-user-" + uuid.New().String()[:8],
		AccessToken:    "fake-access-token",
		Scopes:         store.StringArray{},
	})
	require.NoError(t, err)

	t.Cleanup(func() {
		_, _ = s.GetDB().ExecContext(context.Background(),
			`DELETE FROM platform_connections WHERE id = $1`, conn.ID)
	})
	return conn
}

// seedGoogleOAuthUser inserts a user + Google OAuth auth row for integration tests.
// Returns the email and the Google external_id (sub) so callers can build mock responses.
func seedGoogleOAuthUser(t *testing.T, s *store.Store) (email string, googleSub string) {
	t.Helper()
	ctx := context.Background()

	userID := uuid.New()
	_, err := s.GetDB().ExecContext(ctx,
		`INSERT INTO users (id, first_name, last_name) VALUES ($1, $2, $3)`,
		userID, "Google", "OAuthUser-"+userID.String()[:8])
	require.NoError(t, err)

	authID := uuid.New()
	_, err = s.GetDB().ExecContext(ctx,
		`INSERT INTO user_auth (id, user_id, auth_type) VALUES ($1, $2, $3)`,
		authID, userID, "oauth")
	require.NoError(t, err)

	googleSub = "google-sub-" + userID.String()[:8]
	email = "google-" + userID.String()[:8] + "@test.example.com"
	_, err = s.GetDB().ExecContext(ctx,
		`INSERT INTO oauth_auth (auth_id, external_id, email, full_name, auth_provider) VALUES ($1, $2, $3, $4, $5)`,
		authID, googleSub, email, "Google OAuthUser-"+userID.String()[:8], "google")
	require.NoError(t, err)

	// Create an account for the user (required by GetUserByAuthID JOIN on accounts).
	accountSlug := "google-" + userID.String()[:8]
	var accountID uuid.UUID
	err = s.GetDB().GetContext(ctx, &accountID,
		`INSERT INTO accounts (name, slug, owner_user_id, plan, settings) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		"Google User "+userID.String()[:8], accountSlug, userID, "free", `{}`)
	require.NoError(t, err)

	t.Cleanup(func() {
		bg := context.Background()
		_, _ = s.GetDB().ExecContext(bg, `DELETE FROM accounts WHERE id = $1`, accountID)
		_, _ = s.GetDB().ExecContext(bg, `DELETE FROM oauth_auth WHERE auth_id = $1`, authID)
		_, _ = s.GetDB().ExecContext(bg, `DELETE FROM user_auth WHERE id = $1`, authID)
		_, _ = s.GetDB().ExecContext(bg, `DELETE FROM users WHERE id = $1`, userID)
	})

	return email, googleSub
}

// envOrDefault returns the environment variable value or the default if unset.
func envOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

// ptr is a convenience helper for building pointer values inline.
func ptr[T any](v T) *T { return &v }
