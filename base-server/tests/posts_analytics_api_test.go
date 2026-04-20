//go:build integration

package tests

import (
	"encoding/json"
	"net/http"
	"testing"

	"base-server/internal/posts/processor"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostsAnalyticsAPI(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token, postID string)
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns platform_posts slice",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				post := seedPost(t, c.Store, u.AccountID, seedPostOpts{Status: "published"})
				return u.Token, post.ID.String()
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got processor.GetPostAnalyticsResult
				require.NoError(t, json.Unmarshal(body, &got))
				assert.NotNil(t, got.PlatformPosts)
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
			name: "404 when post not owned",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, uuid.New().String()
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "400 when invalid UUID",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, "not-a-uuid"
			},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, postID := tt.setup(t)
			resp, body := c.Request(t, http.MethodGet, "/api/protected/posts/"+postID+"/analytics", nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}
