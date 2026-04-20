package threads

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"base-server/internal/infra/observability"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestClient_GetThreadInsights(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name           string
		mockStatusCode int
		mockResponse   string
		postID         string
		expectErr      bool
		expectErrType  error
		validateResp   func(t *testing.T, insights ThreadInsights)
	}{
		{
			name:           "happy_path",
			mockStatusCode: http.StatusOK,
			mockResponse: `{
				"data": [
					{"name": "views", "values": [{"value": 500}]},
					{"name": "likes", "values": [{"value": 50}]},
					{"name": "replies", "values": [{"value": 10}]},
					{"name": "reposts", "values": [{"value": 5}]}
				]
			}`,
			postID:    "123456789",
			expectErr: false,
			validateResp: func(t *testing.T, insights ThreadInsights) {
				assert.Equal(t, 500, insights.Views)
				assert.Equal(t, 50, insights.Likes)
				assert.Equal(t, 10, insights.Replies)
				assert.Equal(t, 5, insights.Reposts)
			},
		},
		{
			name:           "post_not_found_returns_ErrNotFound",
			mockStatusCode: http.StatusNotFound,
			mockResponse:   `{"error":"Not found"}`,
			postID:         "nonexistent-post",
			expectErr:      true,
			expectErrType:  ErrNotFound,
			validateResp:   nil,
		},
		{
			name:           "graph_object_missing_400_returns_ErrNotFound",
			mockStatusCode: http.StatusBadRequest,
			mockResponse:   `{"error":{"message":"Unsupported get request. Object with ID 'x' does not exist","type":"THApiException","code":100,"error_subcode":33,"fbtrace_id":"abc"}}`,
			postID:         "18142020445502460",
			expectErr:      true,
			expectErrType:  ErrNotFound,
			validateResp:   nil,
		},
		{
			name:           "server_error_500",
			mockStatusCode: http.StatusInternalServerError,
			mockResponse:   `{"error":"Server error"}`,
			postID:         "123456789",
			expectErr:      true,
			expectErrType:  nil, // not ErrNotFound, but a generic error
			validateResp:   nil,
		},
		{
			name:           "partial_metrics",
			mockStatusCode: http.StatusOK,
			mockResponse: `{
				"data": [
					{"name": "views", "values": [{"value": 100}]},
					{"name": "likes", "values": [{"value": 10}]}
				]
			}`,
			postID:    "mixed-post",
			expectErr: false,
			validateResp: func(t *testing.T, insights ThreadInsights) {
				assert.Equal(t, 100, insights.Views)
				assert.Equal(t, 10, insights.Likes)
				assert.Equal(t, 0, insights.Replies) // not in response
				assert.Equal(t, 0, insights.Reposts) // not in response
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				// Verify request path includes the post ID
				assert.Contains(t, r.URL.Path, "/v1.0/"+tt.postID)
				// Verify metrics query param is present
				assert.Contains(t, r.URL.RawQuery, "metric=")
				// Verify access_token is in the query
				assert.Contains(t, r.URL.RawQuery, "access_token=")

				w.WriteHeader(tt.mockStatusCode)
				w.Write([]byte(tt.mockResponse))
			}))
			defer srv.Close()

			logger := observability.NewLogger()
			client := NewClient(srv.URL, srv.Client(), logger)

			insights, err := client.GetThreadInsights(context.Background(), tt.postID, "access_token")

			if tt.expectErr {
				require.Error(t, err)
				if tt.expectErrType != nil {
					assert.ErrorIs(t, err, tt.expectErrType)
				}
			} else {
				require.NoError(t, err)
				if tt.validateResp != nil {
					tt.validateResp(t, insights)
				}
			}
		})
	}
}
