package bluesky

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"base-server/internal/infra/observability"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestClient_GetPosts(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name          string
		statusCode    int
		responseBody  any
		requestedURIs []string
		expectErr     bool
		errContains   string
		validateResp  func(t *testing.T, resp GetPostsResponse)
	}{
		{
			name:       "happy_path_single_post",
			statusCode: http.StatusOK,
			responseBody: map[string]any{
				"posts": []map[string]any{
					{
						"uri":         "at://x",
						"likeCount":   10,
						"repostCount": 5,
						"replyCount":  3,
					},
				},
			},
			requestedURIs: []string{"at://x"},
			expectErr:     false,
			validateResp: func(t *testing.T, resp GetPostsResponse) {
				require.Len(t, resp.Posts, 1)
				assert.Equal(t, "at://x", resp.Posts[0].URI)
				assert.Equal(t, 10, resp.Posts[0].LikeCount)
				assert.Equal(t, 5, resp.Posts[0].RepostCount)
				assert.Equal(t, 3, resp.Posts[0].ReplyCount)
			},
		},
		{
			name:          "empty_posts_array",
			statusCode:    http.StatusOK,
			responseBody:  map[string]any{"posts": []any{}},
			requestedURIs: []string{"at://nonexistent"},
			expectErr:     false,
			validateResp: func(t *testing.T, resp GetPostsResponse) {
				require.Len(t, resp.Posts, 0)
			},
		},
		{
			name:          "server_error_500",
			statusCode:    http.StatusInternalServerError,
			responseBody:  map[string]any{"error": "ServerError"},
			requestedURIs: []string{"at://x"},
			expectErr:     true,
			errContains:   "getPosts returned 500",
		},
		{
			name:          "malformed_json",
			statusCode:    http.StatusOK,
			responseBody:  "not json",
			requestedURIs: []string{"at://x"},
			expectErr:     true,
			errContains:   "failed to parse getPosts response",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Set up mock AppView server
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				// Verify request path
				assert.Equal(t, "/xrpc/app.bsky.feed.getPosts", r.URL.Path)

				// Verify uris query param is present
				assert.Contains(t, r.URL.RawQuery, "uris=")

				w.WriteHeader(tt.statusCode)

				// Marshal and write response
				if strBody, ok := tt.responseBody.(string); ok {
					// For malformed JSON test
					w.Write([]byte(strBody))
				} else {
					body, _ := json.Marshal(tt.responseBody)
					w.Write(body)
				}
			}))
			defer srv.Close()

			// Create client with test server
			logger := observability.NewLogger()
			httpClient := srv.Client()
			client := NewClient("http://unused-pds", httpClient, logger).WithAppViewHost(srv.URL)

			// Call GetPosts
			resp, err := client.GetPosts(context.Background(), tt.requestedURIs)

			// Verify error behavior
			if tt.expectErr {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.errContains)
			} else {
				require.NoError(t, err)
				if tt.validateResp != nil {
					tt.validateResp(t, resp)
				}
			}
		})
	}
}
