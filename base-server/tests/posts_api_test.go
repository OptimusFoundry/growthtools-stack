//go:build integration

package tests

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostsAPI_CreatePost(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token string, body map[string]any)
		wantStatus  int
		afterAssert func(t *testing.T, respBody []byte)
	}{
		{
			name: "201 creates draft with required fields",
			setup: func(t *testing.T) (string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), map[string]any{
					"content":      "Hello world integration test",
					"content_type": "text",
				}
			},
			wantStatus: http.StatusCreated,
			afterAssert: func(t *testing.T, body []byte) {
				var created store.Post
				require.NoError(t, json.Unmarshal(body, &created))
				assert.Equal(t, "Hello world integration test", created.Content)
				assert.Equal(t, "text", created.ContentType)
				assert.Equal(t, "draft", created.Status)
				// Verify it persisted to DB
				got, err := srv.Store.GetPostByID(context.Background(), created.AccountID, created.ID)
				require.NoError(t, err)
				assert.Equal(t, "Hello world integration test", got.Content)
			},
		},
		{
			name: "201 creates post with optional title and tags",
			setup: func(t *testing.T) (string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), map[string]any{
					"title":        "My Post",
					"content":      "tagged content",
					"content_type": "image",
					"tags":         []string{"go", "test"},
				}
			},
			wantStatus: http.StatusCreated,
			afterAssert: func(t *testing.T, body []byte) {
				var created store.Post
				require.NoError(t, json.Unmarshal(body, &created))
				require.NotNil(t, created.Title)
				assert.Equal(t, "My Post", *created.Title)
				assert.ElementsMatch(t, []string{"go", "test"}, []string(created.Tags))
			},
		},
		{
			name: "400 when content is missing",
			setup: func(t *testing.T) (string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), map[string]any{
					"content_type": "text",
				}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when content_type is missing",
			setup: func(t *testing.T) (string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), map[string]any{
					"content": "some content",
				}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, map[string]any) {
				return "", map[string]any{"content": "x", "content_type": "text"}
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, body := tt.setup(t)
			resp, respBody := srv.Request(t, http.MethodPost, "/api/protected/posts", body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil {
				tt.afterAssert(t, respBody)
			}
		})
	}
}

func TestPostsAPI_GetPost(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token string, path string)
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns the post",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				post := seedPost(t, srv.Store, accountID, seedPostOpts{Content: "integration content"})
				return newJWT(t, userID, accountID), "/api/protected/posts/" + post.ID.String()
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got store.Post
				require.NoError(t, json.Unmarshal(body, &got))
				assert.Equal(t, "integration content", got.Content)
			},
		},
		{
			name: "400 when id is not a uuid",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), "/api/protected/posts/not-a-uuid"
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", "/api/protected/posts/" + uuid.New().String()
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 when post does not exist",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), "/api/protected/posts/" + uuid.New().String()
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "404 when post belongs to another account",
			setup: func(t *testing.T) (string, string) {
				myUserID, myAccountID := seedUserAndAccount(t, srv.Store)
				_, theirAccountID := seedUserAndAccount(t, srv.Store)
				theirPost := seedPost(t, srv.Store, theirAccountID, seedPostOpts{})
				return newJWT(t, myUserID, myAccountID), "/api/protected/posts/" + theirPost.ID.String()
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

func TestPostsAPI_ListPosts(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token string, path string)
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns empty array when no posts",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), "/api/protected/posts"
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var posts []store.Post
				require.NoError(t, json.Unmarshal(body, &posts))
				assert.Empty(t, posts)
			},
		},
		{
			name: "200 returns posts for account",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				seedPost(t, srv.Store, accountID, seedPostOpts{Content: "post 1"})
				seedPost(t, srv.Store, accountID, seedPostOpts{Content: "post 2"})
				return newJWT(t, userID, accountID), "/api/protected/posts"
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var posts []store.Post
				require.NoError(t, json.Unmarshal(body, &posts))
				assert.Len(t, posts, 2)
			},
		},
		{
			name: "200 does not return other accounts posts",
			setup: func(t *testing.T) (string, string) {
				myUserID, myAccountID := seedUserAndAccount(t, srv.Store)
				_, theirAccountID := seedUserAndAccount(t, srv.Store)
				seedPost(t, srv.Store, theirAccountID, seedPostOpts{Content: "their post"})
				return newJWT(t, myUserID, myAccountID), "/api/protected/posts"
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var posts []store.Post
				require.NoError(t, json.Unmarshal(body, &posts))
				assert.Empty(t, posts)
			},
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", "/api/protected/posts"
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

func TestPostsAPI_UpdatePost(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token string, path string, body map[string]any)
		wantStatus  int
		afterAssert func(t *testing.T, respBody []byte)
	}{
		{
			name: "200 updates post content",
			setup: func(t *testing.T) (string, string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				post := seedPost(t, srv.Store, accountID, seedPostOpts{Content: "original"})
				return newJWT(t, userID, accountID),
					"/api/protected/posts/" + post.ID.String(),
					map[string]any{"content": "updated content"}
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, body []byte) {
				var updated store.Post
				require.NoError(t, json.Unmarshal(body, &updated))
				assert.Equal(t, "updated content", updated.Content)
				// Verify DB persisted
				got, err := srv.Store.GetPostByID(context.Background(), updated.AccountID, updated.ID)
				require.NoError(t, err)
				assert.Equal(t, "updated content", got.Content)
			},
		},
		{
			name: "400 when id is not a uuid",
			setup: func(t *testing.T) (string, string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), "/api/protected/posts/not-uuid", map[string]any{"content": "x"}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string, map[string]any) {
				return "", "/api/protected/posts/" + uuid.New().String(), map[string]any{"content": "x"}
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 when post does not exist",
			setup: func(t *testing.T) (string, string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID),
					"/api/protected/posts/" + uuid.New().String(),
					map[string]any{"content": "x"}
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "404 when post belongs to another account",
			setup: func(t *testing.T) (string, string, map[string]any) {
				myUserID, myAccountID := seedUserAndAccount(t, srv.Store)
				_, theirAccountID := seedUserAndAccount(t, srv.Store)
				theirPost := seedPost(t, srv.Store, theirAccountID, seedPostOpts{})
				return newJWT(t, myUserID, myAccountID),
					"/api/protected/posts/" + theirPost.ID.String(),
					map[string]any{"content": "attempted update"}
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

func TestPostsAPI_DeletePost(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token string, path string, postID uuid.UUID, accountID uuid.UUID)
		wantStatus  int
		afterAssert func(t *testing.T, postID, accountID uuid.UUID)
	}{
		{
			name: "200 soft-deletes the post",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				post := seedPost(t, srv.Store, accountID, seedPostOpts{Content: "to delete"})
				return newJWT(t, userID, accountID),
					"/api/protected/posts/" + post.ID.String(),
					post.ID, accountID
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, postID, accountID uuid.UUID) {
				_, err := srv.Store.GetPostByID(context.Background(), accountID, postID)
				assert.ErrorIs(t, err, store.ErrNotFound, "post should be soft-deleted")
			},
		},
		{
			name: "400 when id is not a uuid",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), "/api/protected/posts/bad-id", uuid.Nil, uuid.Nil
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				return "", "/api/protected/posts/" + uuid.New().String(), uuid.Nil, uuid.Nil
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 when post does not exist",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID),
					"/api/protected/posts/" + uuid.New().String(),
					uuid.Nil, uuid.Nil
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "404 when post belongs to another account",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				myUserID, myAccountID := seedUserAndAccount(t, srv.Store)
				_, theirAccountID := seedUserAndAccount(t, srv.Store)
				theirPost := seedPost(t, srv.Store, theirAccountID, seedPostOpts{})
				return newJWT(t, myUserID, myAccountID),
					"/api/protected/posts/" + theirPost.ID.String(),
					theirPost.ID, theirAccountID
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, path, postID, accountID := tt.setup(t)
			resp, _ := srv.Request(t, http.MethodDelete, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil {
				tt.afterAssert(t, postID, accountID)
			}
		})
	}
}

func TestPostsAPI_PublishPost(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token string, path string, body map[string]any)
		wantStatus int
	}{
		{
			name: "200 queues post for publishing",
			setup: func(t *testing.T) (string, string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				post := seedPost(t, srv.Store, accountID, seedPostOpts{Content: "publish me"})
				return newJWT(t, userID, accountID),
					"/api/protected/posts/" + post.ID.String() + "/publish",
					map[string]any{"platforms": []string{"x", "linkedin"}}
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "400 when platforms is missing",
			setup: func(t *testing.T) (string, string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				post := seedPost(t, srv.Store, accountID, seedPostOpts{})
				return newJWT(t, userID, accountID),
					"/api/protected/posts/" + post.ID.String() + "/publish",
					map[string]any{}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when id is not a uuid",
			setup: func(t *testing.T) (string, string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID),
					"/api/protected/posts/bad-id/publish",
					map[string]any{"platforms": []string{"x"}}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string, map[string]any) {
				return "", "/api/protected/posts/" + uuid.New().String() + "/publish",
					map[string]any{"platforms": []string{"x"}}
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 when post does not exist",
			setup: func(t *testing.T) (string, string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID),
					"/api/protected/posts/" + uuid.New().String() + "/publish",
					map[string]any{"platforms": []string{"x"}}
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, path, body := tt.setup(t)
			resp, _ := srv.Request(t, http.MethodPost, path, body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

func TestPostsAPI_SchedulePost(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	futureTime := time.Now().Add(24 * time.Hour).UTC().Format(time.RFC3339)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token string, path string, body map[string]any)
		wantStatus  int
		afterAssert func(t *testing.T, respBody []byte)
	}{
		{
			name: "200 schedules the post",
			setup: func(t *testing.T) (string, string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				post := seedPost(t, srv.Store, accountID, seedPostOpts{Content: "schedule me"})
				return newJWT(t, userID, accountID),
					"/api/protected/posts/" + post.ID.String() + "/schedule",
					map[string]any{"scheduled_at": futureTime}
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, body []byte) {
				var updated store.Post
				require.NoError(t, json.Unmarshal(body, &updated))
				assert.Equal(t, "scheduled", updated.Status)
				assert.NotNil(t, updated.ScheduledAt)
			},
		},
		{
			name: "400 when scheduled_at is invalid",
			setup: func(t *testing.T) (string, string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				post := seedPost(t, srv.Store, accountID, seedPostOpts{})
				return newJWT(t, userID, accountID),
					"/api/protected/posts/" + post.ID.String() + "/schedule",
					map[string]any{"scheduled_at": "not-a-date"}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when scheduled_at is missing",
			setup: func(t *testing.T) (string, string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				post := seedPost(t, srv.Store, accountID, seedPostOpts{})
				return newJWT(t, userID, accountID),
					"/api/protected/posts/" + post.ID.String() + "/schedule",
					map[string]any{}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string, map[string]any) {
				return "", "/api/protected/posts/" + uuid.New().String() + "/schedule",
					map[string]any{"scheduled_at": futureTime}
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 when post does not exist",
			setup: func(t *testing.T) (string, string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID),
					"/api/protected/posts/" + uuid.New().String() + "/schedule",
					map[string]any{"scheduled_at": futureTime}
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, path, body := tt.setup(t)
			resp, respBody := srv.Request(t, http.MethodPost, path, body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil {
				tt.afterAssert(t, respBody)
			}
		})
	}
}
