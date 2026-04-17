//go:build integration

package tests

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBlogAPI_CreateBlog(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) string
		body        any
		wantStatus  int
		afterAssert func(t *testing.T, body []byte)
	}{
		{
			name: "201 persists blog post to DB",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body: map[string]any{
				"title":   "My First Blog",
				"slug":    "my-first-blog-" + uuid.New().String()[:8],
				"content": "blog body text",
			},
			wantStatus: http.StatusCreated,
			afterAssert: func(t *testing.T, body []byte) {
				var created store.BlogPost
				require.NoError(t, json.Unmarshal(body, &created))
				assert.Equal(t, "My First Blog", created.Title)
				got, err := c.Store.GetBlogPostByID(context.Background(), created.AccountID, created.ID)
				require.NoError(t, err)
				assert.Equal(t, "blog body text", got.Content)
				t.Cleanup(func() {
					_, _ = c.Store.GetDB().ExecContext(context.Background(),
						`DELETE FROM blog_posts WHERE id = $1`, created.ID)
				})
			},
		},
		{
			name: "400 when title is missing",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body: map[string]any{
				"slug":    "slug-" + uuid.New().String()[:8],
				"content": "body",
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when slug is missing",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body: map[string]any{
				"title":   "Title",
				"content": "body",
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when content is missing",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body: map[string]any{
				"title": "Title",
				"slug":  "slug-" + uuid.New().String()[:8],
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) string {
				return ""
			},
			body: map[string]any{
				"title":   "Title",
				"slug":    "slug",
				"content": "body",
			},
			wantStatus: http.StatusUnauthorized,
		},
		// 409 slug conflict is exercised in TestBlogAPI_CreateBlog_SlugConflict below
		// because the slug value must be coordinated between setup and body.
		{
			name: "409 when slug already exists for account",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				seedBlog(t, c.Store, u.AccountID, seedBlogOpts{Slug: "duplicate-slug-" + u.AccountID.String()[:8]})
				return u.Token
			},
			body: map[string]any{
				"title":   "Title",
				"slug":    "placeholder",
				"content": "body",
			},
			wantStatus: http.StatusConflict, // unreachable here; tested in separate function
		},
	}

	for _, tt := range tests {
		tt := tt
		if tt.name == "409 when slug already exists for account" {
			continue // tested separately below
		}
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token := tt.setup(t)
			resp, body := c.Request(t, http.MethodPost, "/api/protected/blog", tt.body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil {
				tt.afterAssert(t, body)
			}
		})
	}
}

func TestBlogAPI_CreateBlog_SlugConflict(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token, slug string)
		wantStatus int
	}{
		{
			name: "409 when slug already exists for account",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				slug := "dup-slug-" + u.AccountID.String()[:8]
				seedBlog(t, c.Store, u.AccountID, seedBlogOpts{Slug: slug})
				return u.Token, slug
			},
			wantStatus: http.StatusConflict,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, slug := tt.setup(t)
			resp, _ := c.Request(t, http.MethodPost, "/api/protected/blog", map[string]any{
				"title":   "Dup Title",
				"slug":    slug,
				"content": "body",
			}, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

func TestBlogAPI_GetBlog(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token, blogID string)
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns the blog post",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				bp := seedBlog(t, c.Store, u.AccountID, seedBlogOpts{Content: "blog body"})
				return u.Token, bp.ID.String()
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got store.BlogPost
				require.NoError(t, json.Unmarshal(body, &got))
				assert.Equal(t, "blog body", got.Content)
			},
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", uuid.New().String()
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "400 when id is not a uuid",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, "not-a-uuid"
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 when blog post does not exist",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, uuid.New().String()
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "404 when blog post belongs to another account",
			setup: func(t *testing.T) (string, string) {
				me := seedUserWithAccount(t, c.Store)
				them := seedUserWithAccount(t, c.Store)
				theirBlog := seedBlog(t, c.Store, them.AccountID, seedBlogOpts{})
				return me.Token, theirBlog.ID.String()
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, blogID := tt.setup(t)
			resp, body := c.Request(t, http.MethodGet, "/api/protected/blog/"+blogID, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

func TestBlogAPI_ListBlogs(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) string
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns list",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				seedBlog(t, c.Store, u.AccountID, seedBlogOpts{})
				return u.Token
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got []store.BlogPost
				require.NoError(t, json.Unmarshal(body, &got))
				assert.GreaterOrEqual(t, len(got), 1)
			},
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) string {
				return ""
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token := tt.setup(t)
			resp, body := c.Request(t, http.MethodGet, "/api/protected/blog", nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

func TestBlogAPI_UpdateBlog(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token, blogID string)
		body        any
		wantStatus  int
		afterAssert func(t *testing.T, accountID, blogID uuid.UUID)
	}{
		{
			name: "200 updates the blog post and persists",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				bp := seedBlog(t, c.Store, u.AccountID, seedBlogOpts{Content: "original"})
				return u.Token, bp.ID.String()
			},
			body: map[string]any{
				"content": "updated blog content",
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, accountID, blogID uuid.UUID) {
				got, err := c.Store.GetBlogPostByID(context.Background(), accountID, blogID)
				require.NoError(t, err)
				assert.Equal(t, "updated blog content", got.Content)
			},
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", uuid.New().String()
			},
			body:       map[string]any{"content": "x"},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "400 when id is not a uuid",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, "not-a-uuid"
			},
			body:       map[string]any{"content": "x"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 when blog post does not exist",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, uuid.New().String()
			},
			body:       map[string]any{"content": "x"},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, blogIDStr := tt.setup(t)
			resp, body := c.Request(t, http.MethodPut, "/api/protected/blog/"+blogIDStr, tt.body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil && resp.StatusCode == http.StatusOK {
				var updated store.BlogPost
				require.NoError(t, json.Unmarshal(body, &updated))
				tt.afterAssert(t, updated.AccountID, updated.ID)
			}
		})
	}
}

func TestBlogAPI_DeleteBlog(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token, blogID string, accountID uuid.UUID)
		wantStatus  int
		afterAssert func(t *testing.T, accountID, blogID uuid.UUID)
	}{
		{
			name: "200 soft-deletes the blog post",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				bp := seedBlog(t, c.Store, u.AccountID, seedBlogOpts{})
				return u.Token, bp.ID.String(), u.AccountID
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, accountID, blogID uuid.UUID) {
				_, err := c.Store.GetBlogPostByID(context.Background(), accountID, blogID)
				assert.ErrorIs(t, err, store.ErrNotFound)
			},
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				return "", uuid.New().String(), uuid.Nil
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "400 when id is not a uuid",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, "not-a-uuid", u.AccountID
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 when blog post does not exist",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, uuid.New().String(), u.AccountID
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, blogIDStr, accountID := tt.setup(t)
			resp, _ := c.Request(t, http.MethodDelete, "/api/protected/blog/"+blogIDStr, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil && resp.StatusCode == http.StatusOK {
				blogID, err := uuid.Parse(blogIDStr)
				require.NoError(t, err)
				tt.afterAssert(t, accountID, blogID)
			}
		})
	}
}

func TestBlogAPI_PublishBlog(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token, blogID string)
		wantStatus  int
		afterAssert func(t *testing.T, accountID, blogID uuid.UUID)
	}{
		{
			name: "200 sets status to published and persists published_at",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				bp := seedBlog(t, c.Store, u.AccountID, seedBlogOpts{Status: "draft"})
				return u.Token, bp.ID.String()
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, accountID, blogID uuid.UUID) {
				got, err := c.Store.GetBlogPostByID(context.Background(), accountID, blogID)
				require.NoError(t, err)
				assert.Equal(t, "published", got.Status)
				assert.NotNil(t, got.PublishedAt)
			},
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", uuid.New().String()
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "400 when id is not a uuid",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, "not-a-uuid"
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 when blog post does not exist",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, uuid.New().String()
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, blogIDStr := tt.setup(t)
			resp, body := c.Request(t, http.MethodPost, "/api/protected/blog/"+blogIDStr+"/publish", nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil && resp.StatusCode == http.StatusOK {
				var published store.BlogPost
				require.NoError(t, json.Unmarshal(body, &published))
				tt.afterAssert(t, published.AccountID, published.ID)
			}
		})
	}
}
