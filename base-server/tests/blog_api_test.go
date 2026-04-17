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
	srv := setupTestServer(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token string, body map[string]any)
		wantStatus  int
		afterAssert func(t *testing.T, respBody []byte)
	}{
		{
			name: "201 creates draft blog post",
			setup: func(t *testing.T) (string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), map[string]any{
					"title":   "Integration Blog",
					"slug":    "integration-blog-" + uuid.New().String()[:8],
					"content": "# Hello\nThis is blog content.",
				}
			},
			wantStatus: http.StatusCreated,
			afterAssert: func(t *testing.T, body []byte) {
				var created store.BlogPost
				require.NoError(t, json.Unmarshal(body, &created))
				assert.Equal(t, "Integration Blog", created.Title)
				assert.Equal(t, "draft", created.Status)
				// Verify persisted in DB
				got, err := srv.Store.GetBlogPostByID(context.Background(), created.AccountID, created.ID)
				require.NoError(t, err)
				assert.Equal(t, "Integration Blog", got.Title)
			},
		},
		{
			name: "201 creates blog with SEO fields",
			setup: func(t *testing.T) (string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), map[string]any{
					"title":            "SEO Blog",
					"slug":             "seo-blog-" + uuid.New().String()[:8],
					"content":          "SEO content",
					"excerpt":          "A short excerpt",
					"seo_title":        "SEO Title",
					"meta_description": "Meta desc",
					"keywords":         []string{"go", "test"},
				}
			},
			wantStatus: http.StatusCreated,
			afterAssert: func(t *testing.T, body []byte) {
				var created store.BlogPost
				require.NoError(t, json.Unmarshal(body, &created))
				require.NotNil(t, created.Excerpt)
				assert.Equal(t, "A short excerpt", *created.Excerpt)
				require.NotNil(t, created.SEOTitle)
				assert.Equal(t, "SEO Title", *created.SEOTitle)
			},
		},
		{
			name: "400 when title is missing",
			setup: func(t *testing.T) (string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), map[string]any{
					"slug":    "no-title",
					"content": "content",
				}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when slug is missing",
			setup: func(t *testing.T) (string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), map[string]any{
					"title":   "No Slug",
					"content": "content",
				}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when content is missing",
			setup: func(t *testing.T) (string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), map[string]any{
					"title": "No Content",
					"slug":  "no-content",
				}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, map[string]any) {
				return "", map[string]any{"title": "x", "slug": "x", "content": "x"}
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "409 when slug already exists",
			setup: func(t *testing.T) (string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				slug := "duplicate-slug-" + uuid.New().String()[:8]
				// Seed a blog post with this slug
				seedBlogPost(t, srv.Store, accountID, seedBlogOpts{Slug: slug})
				return newJWT(t, userID, accountID), map[string]any{
					"title":   "Duplicate",
					"slug":    slug,
					"content": "content",
				}
			},
			wantStatus: http.StatusConflict,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, body := tt.setup(t)
			resp, respBody := srv.Request(t, http.MethodPost, "/api/protected/blog", body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil {
				tt.afterAssert(t, respBody)
			}
		})
	}
}

func TestBlogAPI_GetBlog(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token string, path string)
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns blog post",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				bp := seedBlogPost(t, srv.Store, accountID, seedBlogOpts{Title: "My Blog"})
				return newJWT(t, userID, accountID), "/api/protected/blog/" + bp.ID.String()
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got store.BlogPost
				require.NoError(t, json.Unmarshal(body, &got))
				assert.Equal(t, "My Blog", got.Title)
			},
		},
		{
			name: "400 when id is not a uuid",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), "/api/protected/blog/not-a-uuid"
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", "/api/protected/blog/" + uuid.New().String()
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 when blog does not exist",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), "/api/protected/blog/" + uuid.New().String()
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "404 when blog belongs to another account",
			setup: func(t *testing.T) (string, string) {
				myUserID, myAccountID := seedUserAndAccount(t, srv.Store)
				_, theirAccountID := seedUserAndAccount(t, srv.Store)
				theirBlog := seedBlogPost(t, srv.Store, theirAccountID, seedBlogOpts{})
				return newJWT(t, myUserID, myAccountID), "/api/protected/blog/" + theirBlog.ID.String()
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, path := tt.setup(t)
			resp, body := srv.Request(t, http.MethodGet, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

func TestBlogAPI_ListBlogs(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token string, path string)
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns empty array when no blogs",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), "/api/protected/blog"
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var posts []store.BlogPost
				require.NoError(t, json.Unmarshal(body, &posts))
				assert.Empty(t, posts)
			},
		},
		{
			name: "200 returns blogs for account",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				seedBlogPost(t, srv.Store, accountID, seedBlogOpts{Title: "Blog A"})
				seedBlogPost(t, srv.Store, accountID, seedBlogOpts{Title: "Blog B"})
				return newJWT(t, userID, accountID), "/api/protected/blog"
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var posts []store.BlogPost
				require.NoError(t, json.Unmarshal(body, &posts))
				assert.Len(t, posts, 2)
			},
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", "/api/protected/blog"
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, path := tt.setup(t)
			resp, body := srv.Request(t, http.MethodGet, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

func TestBlogAPI_UpdateBlog(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token string, path string, body map[string]any)
		wantStatus  int
		afterAssert func(t *testing.T, respBody []byte)
	}{
		{
			name: "200 updates blog post",
			setup: func(t *testing.T) (string, string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				bp := seedBlogPost(t, srv.Store, accountID, seedBlogOpts{Title: "Original"})
				return newJWT(t, userID, accountID),
					"/api/protected/blog/" + bp.ID.String(),
					map[string]any{"title": "Updated Title", "content": "Updated content"}
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, body []byte) {
				var updated store.BlogPost
				require.NoError(t, json.Unmarshal(body, &updated))
				assert.Equal(t, "Updated Title", updated.Title)
				// Verify DB
				got, err := srv.Store.GetBlogPostByID(context.Background(), updated.AccountID, updated.ID)
				require.NoError(t, err)
				assert.Equal(t, "Updated Title", got.Title)
			},
		},
		{
			name: "400 when id is not a uuid",
			setup: func(t *testing.T) (string, string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), "/api/protected/blog/bad-id", map[string]any{"title": "x"}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string, map[string]any) {
				return "", "/api/protected/blog/" + uuid.New().String(), map[string]any{"title": "x"}
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 when blog does not exist",
			setup: func(t *testing.T) (string, string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID),
					"/api/protected/blog/" + uuid.New().String(),
					map[string]any{"title": "x"}
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, path, body := tt.setup(t)
			resp, respBody := srv.Request(t, http.MethodPut, path, body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil {
				tt.afterAssert(t, respBody)
			}
		})
	}
}

func TestBlogAPI_DeleteBlog(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token string, path string, blogID uuid.UUID, accountID uuid.UUID)
		wantStatus  int
		afterAssert func(t *testing.T, blogID, accountID uuid.UUID)
	}{
		{
			name: "200 soft-deletes blog post",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				bp := seedBlogPost(t, srv.Store, accountID, seedBlogOpts{})
				return newJWT(t, userID, accountID),
					"/api/protected/blog/" + bp.ID.String(),
					bp.ID, accountID
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, blogID, accountID uuid.UUID) {
				_, err := srv.Store.GetBlogPostByID(context.Background(), accountID, blogID)
				assert.ErrorIs(t, err, store.ErrNotFound)
			},
		},
		{
			name: "400 when id is not a uuid",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), "/api/protected/blog/bad-id", uuid.Nil, uuid.Nil
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				return "", "/api/protected/blog/" + uuid.New().String(), uuid.Nil, uuid.Nil
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 when blog does not exist",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID),
					"/api/protected/blog/" + uuid.New().String(),
					uuid.Nil, uuid.Nil
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, path, blogID, accountID := tt.setup(t)
			resp, _ := srv.Request(t, http.MethodDelete, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil {
				tt.afterAssert(t, blogID, accountID)
			}
		})
	}
}

func TestBlogAPI_PublishBlog(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token string, path string)
		wantStatus  int
		afterAssert func(t *testing.T, respBody []byte)
	}{
		{
			name: "200 publishes blog post",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				bp := seedBlogPost(t, srv.Store, accountID, seedBlogOpts{Title: "Publish Me"})
				return newJWT(t, userID, accountID), "/api/protected/blog/" + bp.ID.String() + "/publish"
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, body []byte) {
				var published store.BlogPost
				require.NoError(t, json.Unmarshal(body, &published))
				assert.Equal(t, "published", published.Status)
				assert.NotNil(t, published.PublishedAt)
			},
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", "/api/protected/blog/" + uuid.New().String() + "/publish"
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 when blog does not exist",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID),
					"/api/protected/blog/" + uuid.New().String() + "/publish"
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, path := tt.setup(t)
			resp, respBody := srv.Request(t, http.MethodPost, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil {
				tt.afterAssert(t, respBody)
			}
		})
	}
}
