package github

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"base-server/internal/infra/observability"
)

func TestClient_DeleteFileContents(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	tests := []struct {
		name             string
		getStatus        int
		getBody          string
		deleteStatus     int
		deleteBody       string
		wantErr          bool
		wantDeleteCalled bool
	}{
		{
			name:             "GET returns 404 - file already deleted, no DELETE issued",
			getStatus:        http.StatusNotFound,
			getBody:          `{"message":"Not Found"}`,
			wantErr:          false,
			wantDeleteCalled: false,
		},
		{
			name:             "GET returns 200 with sha - DELETE issued and succeeds with 200",
			getStatus:        http.StatusOK,
			getBody:          `{"sha":"abc123"}`,
			deleteStatus:     http.StatusOK,
			deleteBody:       `{"commit":{"sha":"def456"}}`,
			wantErr:          false,
			wantDeleteCalled: true,
		},
		{
			name:             "GET returns 500 - wrapped error, no DELETE issued",
			getStatus:        http.StatusInternalServerError,
			getBody:          "internal error",
			wantErr:          true,
			wantDeleteCalled: false,
		},
		{
			name:             "GET succeeds but DELETE returns 500 - wrapped error",
			getStatus:        http.StatusOK,
			getBody:          `{"sha":"abc123"}`,
			deleteStatus:     http.StatusInternalServerError,
			deleteBody:       "delete failed",
			wantErr:          true,
			wantDeleteCalled: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			var deleteCalled bool
			var deleteReqBody map[string]any

			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				switch r.Method {
				case http.MethodGet:
					assert.Equal(t, "/repos/acme/blog/contents/posts/hello.md", r.URL.Path)
					assert.Equal(t, "main", r.URL.Query().Get("ref"))
					w.WriteHeader(tt.getStatus)
					_, _ = w.Write([]byte(tt.getBody))
				case http.MethodDelete:
					deleteCalled = true
					assert.Equal(t, "/repos/acme/blog/contents/posts/hello.md", r.URL.Path)
					require.NoError(t, json.NewDecoder(r.Body).Decode(&deleteReqBody))
					w.WriteHeader(tt.deleteStatus)
					_, _ = w.Write([]byte(tt.deleteBody))
				default:
					t.Fatalf("unexpected method %s", r.Method)
				}
			}))
			defer server.Close()

			client := NewClient("client-id", "client-secret", server.URL, server.URL+"/oauth/token", server.Client(), logger)

			err := client.DeleteFileContents(context.Background(), "test-token", "acme", "blog", "posts/hello.md", "main", "chore: delete post")

			assert.Equal(t, tt.wantDeleteCalled, deleteCalled, "DELETE handler invocation mismatch")

			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)

			if tt.wantDeleteCalled {
				require.NotNil(t, deleteReqBody)
				assert.Equal(t, "chore: delete post", deleteReqBody["message"])
				assert.Equal(t, "abc123", deleteReqBody["sha"])
				assert.Equal(t, "main", deleteReqBody["branch"])
			}
		})
	}
}

func TestClient_EnableAutoMerge(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	tests := []struct {
		name          string
		prStatus      int
		prBody        string
		graphqlStatus int
		graphqlBody   string
		wantErr       bool
		wantGraphQL   bool
	}{
		{
			name:          "looks up node id then enables auto-merge",
			prStatus:      http.StatusOK,
			prBody:        `{"number":42,"node_id":"PR_kwDO123"}`,
			graphqlStatus: http.StatusOK,
			graphqlBody:   `{"data":{"enablePullRequestAutoMerge":{"pullRequest":{"number":42}}}}`,
			wantGraphQL:   true,
		},
		{
			name:     "PR lookup fails - error, no GraphQL call",
			prStatus: http.StatusNotFound,
			prBody:   `{"message":"Not Found"}`,
			wantErr:  true,
		},
		{
			name:          "GraphQL returns errors (auto-merge not allowed) - error",
			prStatus:      http.StatusOK,
			prBody:        `{"number":42,"node_id":"PR_kwDO123"}`,
			graphqlStatus: http.StatusOK,
			graphqlBody:   `{"errors":[{"message":"Pull request is in clean status"}]}`,
			wantErr:       true,
			wantGraphQL:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			var graphQLCalled bool
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				switch {
				case r.Method == http.MethodGet && r.URL.Path == "/repos/acme/site/pulls/42":
					w.WriteHeader(tt.prStatus)
					_, _ = w.Write([]byte(tt.prBody))
				case r.Method == http.MethodPost && r.URL.Path == "/graphql":
					graphQLCalled = true
					body, _ := io.ReadAll(r.Body)
					assert.Contains(t, string(body), "enablePullRequestAutoMerge")
					assert.Contains(t, string(body), "PR_kwDO123")
					assert.Equal(t, "Bearer gh-token", r.Header.Get("Authorization"))
					w.WriteHeader(tt.graphqlStatus)
					_, _ = w.Write([]byte(tt.graphqlBody))
				default:
					t.Errorf("unexpected request %s %s", r.Method, r.URL.Path)
				}
			}))
			defer server.Close()

			client := NewClient("client-id", "client-secret", server.URL, server.URL+"/oauth/token", server.Client(), logger)
			err := client.EnableAutoMerge(context.Background(), "gh-token", "acme", "site", 42)

			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
			assert.Equal(t, tt.wantGraphQL, graphQLCalled)
		})
	}
}
