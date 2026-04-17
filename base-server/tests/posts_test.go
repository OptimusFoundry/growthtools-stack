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
	c := testClient(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token string)
		body        any
		wantStatus  int
		afterAssert func(t *testing.T, body []byte)
	}{
		{
			name: "201 persists post to DB",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body: map[string]any{
				"content":      "hello world",
				"content_type": "text",
			},
			wantStatus: http.StatusCreated,
			afterAssert: func(t *testing.T, body []byte) {
				var created store.Post
				require.NoError(t, json.Unmarshal(body, &created))
				assert.NotEqual(t, uuid.Nil, created.ID)
				assert.Equal(t, "hello world", created.Content)
				// Verify persisted in DB
				got, err := c.Store.GetPostByID(context.Background(), created.AccountID, created.ID)
				require.NoError(t, err)
				assert.Equal(t, "hello world", got.Content)
				// cleanup
				t.Cleanup(func() {
					_, _ = c.Store.GetDB().ExecContext(context.Background(),
						`DELETE FROM posts WHERE id = $1`, created.ID)
				})
			},
		},
		{
			name: "400 when content is missing",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body: map[string]any{
				"content_type": "text",
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when content_type is missing",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body: map[string]any{
				"content": "some content",
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) string {
				return ""
			},
			body: map[string]any{
				"content":      "some content",
				"content_type": "text",
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token := tt.setup(t)
			resp, body := c.Request(t, http.MethodPost, "/api/protected/posts", tt.body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil {
				tt.afterAssert(t, body)
			}
		})
	}
}

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
				u := seedUserWithAccount(t, c.Store)
				p := seedPost(t, c.Store, u.AccountID, seedPostOpts{Content: "integration test post"})
				return u.Token, p.ID.String()
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got store.Post
				require.NoError(t, json.Unmarshal(body, &got))
				assert.Equal(t, "integration test post", got.Content)
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
			name: "400 when id is not a valid uuid",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, "not-a-uuid"
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 when post does not exist",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, uuid.New().String()
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "404 when post belongs to another account",
			setup: func(t *testing.T) (string, string) {
				me := seedUserWithAccount(t, c.Store)
				them := seedUserWithAccount(t, c.Store)
				theirPost := seedPost(t, c.Store, them.AccountID, seedPostOpts{})
				return me.Token, theirPost.ID.String()
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

func TestPostsAPI_ListPosts(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token, query string)
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns list (may be empty)",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, ""
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got []store.Post
				require.NoError(t, json.Unmarshal(body, &got))
				assert.NotNil(t, got)
			},
		},
		{
			name: "200 returns seeded post in list",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				seedPost(t, c.Store, u.AccountID, seedPostOpts{Content: "list test post"})
				return u.Token, ""
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got []store.Post
				require.NoError(t, json.Unmarshal(body, &got))
				assert.GreaterOrEqual(t, len(got), 1)
			},
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", ""
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, query := tt.setup(t)
			path := "/api/protected/posts"
			if query != "" {
				path += "?" + query
			}
			resp, body := c.Request(t, http.MethodGet, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

func TestPostsAPI_UpdatePost(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token, postID string)
		body        any
		wantStatus  int
		afterAssert func(t *testing.T, accountID uuid.UUID, postID uuid.UUID)
	}{
		{
			name: "200 updates the post and persists to DB",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				p := seedPost(t, c.Store, u.AccountID, seedPostOpts{Content: "original"})
				return u.Token, p.ID.String()
			},
			body: map[string]any{
				"content": "updated content",
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, accountID, postID uuid.UUID) {
				got, err := c.Store.GetPostByID(context.Background(), accountID, postID)
				require.NoError(t, err)
				assert.Equal(t, "updated content", got.Content)
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
			name: "400 when post id is not a uuid",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, "not-a-uuid"
			},
			body:       map[string]any{"content": "x"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 when post does not exist",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, uuid.New().String()
			},
			body:       map[string]any{"content": "x"},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "404 when post belongs to another account",
			setup: func(t *testing.T) (string, string) {
				me := seedUserWithAccount(t, c.Store)
				them := seedUserWithAccount(t, c.Store)
				theirPost := seedPost(t, c.Store, them.AccountID, seedPostOpts{})
				return me.Token, theirPost.ID.String()
			},
			body:       map[string]any{"content": "x"},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, postIDStr := tt.setup(t)
			resp, body := c.Request(t, http.MethodPut, "/api/protected/posts/"+postIDStr, tt.body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil && resp.StatusCode == http.StatusOK {
				var updated store.Post
				require.NoError(t, json.Unmarshal(body, &updated))
				tt.afterAssert(t, updated.AccountID, updated.ID)
			}
		})
	}
}

func TestPostsAPI_DeletePost(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token, postID string, accountID uuid.UUID)
		wantStatus  int
		afterAssert func(t *testing.T, accountID, postID uuid.UUID)
	}{
		{
			name: "200 deletes the post and soft-deletes in DB",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				p := seedPost(t, c.Store, u.AccountID, seedPostOpts{})
				return u.Token, p.ID.String(), u.AccountID
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, accountID, postID uuid.UUID) {
				_, err := c.Store.GetPostByID(context.Background(), accountID, postID)
				assert.ErrorIs(t, err, store.ErrNotFound, "post should be soft-deleted")
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
			name: "400 when post id is not a uuid",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, "not-a-uuid", u.AccountID
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 when post does not exist",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, uuid.New().String(), u.AccountID
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "404 when post belongs to another account",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				me := seedUserWithAccount(t, c.Store)
				them := seedUserWithAccount(t, c.Store)
				theirPost := seedPost(t, c.Store, them.AccountID, seedPostOpts{})
				return me.Token, theirPost.ID.String(), me.AccountID
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, postIDStr, accountID := tt.setup(t)
			resp, _ := c.Request(t, http.MethodDelete, "/api/protected/posts/"+postIDStr, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil && resp.StatusCode == http.StatusOK {
				postID, err := uuid.Parse(postIDStr)
				require.NoError(t, err)
				tt.afterAssert(t, accountID, postID)
			}
		})
	}
}

func TestPostsAPI_GetPostDetails(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token, postID string)
		wantStatus int
	}{
		{
			name: "200 returns post with platform posts",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				p := seedPost(t, c.Store, u.AccountID, seedPostOpts{})
				return u.Token, p.ID.String()
			},
			wantStatus: http.StatusOK,
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
			name: "404 when post does not exist",
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
			token, postID := tt.setup(t)
			resp, _ := c.Request(t, http.MethodGet, "/api/protected/posts/"+postID+"/details", nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

func TestPostsAPI_SchedulePost(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	futureTime := time.Now().Add(24 * time.Hour).UTC().Format(time.RFC3339)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token, postID string)
		body        any
		wantStatus  int
		afterAssert func(t *testing.T, accountID, postID uuid.UUID)
	}{
		{
			name: "200 schedules the post",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				p := seedPost(t, c.Store, u.AccountID, seedPostOpts{})
				return u.Token, p.ID.String()
			},
			body:       map[string]any{"scheduled_at": futureTime},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, accountID, postID uuid.UUID) {
				got, err := c.Store.GetPostByID(context.Background(), accountID, postID)
				require.NoError(t, err)
				assert.Equal(t, "scheduled", got.Status)
				assert.NotNil(t, got.ScheduledAt)
			},
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", uuid.New().String()
			},
			body:       map[string]any{"scheduled_at": futureTime},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "400 when id is not a uuid",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, "not-a-uuid"
			},
			body:       map[string]any{"scheduled_at": futureTime},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when scheduled_at is malformed",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				p := seedPost(t, c.Store, u.AccountID, seedPostOpts{})
				return u.Token, p.ID.String()
			},
			body:       map[string]any{"scheduled_at": "not-a-timestamp"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when scheduled_at is missing",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				p := seedPost(t, c.Store, u.AccountID, seedPostOpts{})
				return u.Token, p.ID.String()
			},
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 when post does not exist",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, uuid.New().String()
			},
			body:       map[string]any{"scheduled_at": futureTime},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, postIDStr := tt.setup(t)
			resp, body := c.Request(t, http.MethodPost, "/api/protected/posts/"+postIDStr+"/schedule", tt.body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil && resp.StatusCode == http.StatusOK {
				var updated store.Post
				require.NoError(t, json.Unmarshal(body, &updated))
				tt.afterAssert(t, updated.AccountID, updated.ID)
			}
		})
	}
}

func TestPostsAPI_SaveDraft(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) string // returns token
		body        any
		wantStatus  int
		afterAssert func(t *testing.T, body []byte)
	}{
		{
			name: "201 persists draft",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body: map[string]any{
				"content":      "draft content",
				"content_type": "text",
				"platforms":    []any{},
			},
			wantStatus: http.StatusCreated,
			afterAssert: func(t *testing.T, body []byte) {
				var created store.Post
				require.NoError(t, json.Unmarshal(body, &created))
				assert.Equal(t, "draft content", created.Content)
				t.Cleanup(func() {
					_, _ = c.Store.GetDB().ExecContext(context.Background(),
						`DELETE FROM posts WHERE id = $1`, created.ID)
				})
			},
		},
		{
			name: "400 when content is missing",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body: map[string]any{
				"content_type": "text",
				"platforms":    []any{},
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when platforms is missing",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body: map[string]any{
				"content":      "some content",
				"content_type": "text",
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) string {
				return ""
			},
			body: map[string]any{
				"content":      "x",
				"content_type": "text",
				"platforms":    []any{},
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token := tt.setup(t)
			resp, body := c.Request(t, http.MethodPost, "/api/protected/posts/draft", tt.body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil {
				tt.afterAssert(t, body)
			}
		})
	}
}

func TestPostsAPI_UpdateDraft(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token, postID string)
		body       any
		wantStatus int
	}{
		{
			name: "200 updates the draft",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				p := seedPost(t, c.Store, u.AccountID, seedPostOpts{Content: "original draft"})
				return u.Token, p.ID.String()
			},
			body: map[string]any{
				"content":      "updated draft content",
				"content_type": "text",
				"platforms":    []any{},
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", uuid.New().String()
			},
			body: map[string]any{
				"content":      "x",
				"content_type": "text",
				"platforms":    []any{},
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "400 when id is not a uuid",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, "not-a-uuid"
			},
			body: map[string]any{
				"content":      "x",
				"content_type": "text",
				"platforms":    []any{},
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 when post does not exist",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, uuid.New().String()
			},
			body: map[string]any{
				"content":      "x",
				"content_type": "text",
				"platforms":    []any{},
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, postIDStr := tt.setup(t)
			resp, _ := c.Request(t, http.MethodPut, "/api/protected/posts/"+postIDStr+"/draft", tt.body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

// TestPostsAPI_PublishPost and TestPostsAPI_RetryPost are OUT OF SCOPE:
// both call social platform adapters (third parties). They are covered at the
// processor unit-test level with gomock.

func TestPostsAPI_SchedulePost_DBAssertion(t *testing.T) {
	// This is covered by TestPostsAPI_SchedulePost "200 schedules the post" case above.
	// Added here as documentation: scheduled_at and status="scheduled" are verified
	// directly via c.Store.GetPostByID after the HTTP call.
	t.Skip("covered in TestPostsAPI_SchedulePost")
}

