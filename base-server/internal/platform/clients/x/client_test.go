package x

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"base-server/internal/infra/observability"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestClient_GetTweetMetrics(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name           string
		mockStatusCode int
		mockResponse   string
		tweetID        string
		expectErr      bool
		expectErrType  error
		validateResp   func(t *testing.T, metrics TweetMetrics)
	}{
		{
			name:           "happy_path",
			mockStatusCode: http.StatusOK,
			mockResponse: `{
				"data": {
					"public_metrics": {
						"impression_count": 100,
						"like_count": 10,
						"reply_count": 5,
						"retweet_count": 3,
						"quote_count": 2,
						"bookmark_count": 1
					}
				}
			}`,
			tweetID:   "123456789",
			expectErr: false,
			validateResp: func(t *testing.T, metrics TweetMetrics) {
				assert.Equal(t, 100, metrics.ImpressionCount)
				assert.Equal(t, 10, metrics.LikeCount)
				assert.Equal(t, 5, metrics.ReplyCount)
				assert.Equal(t, 3, metrics.RetweetCount)
				assert.Equal(t, 2, metrics.QuoteCount)
				assert.Equal(t, 1, metrics.BookmarkCount)
			},
		},
		{
			name:           "tweet_not_found_returns_ErrNotFound",
			mockStatusCode: http.StatusNotFound,
			mockResponse:   `{"detail":"Not found"}`,
			tweetID:        "nonexistent-tweet",
			expectErr:      true,
			expectErrType:  ErrNotFound,
			validateResp:   nil,
		},
		{
			name:           "server_error_500",
			mockStatusCode: http.StatusInternalServerError,
			mockResponse:   `{"detail":"Server error"}`,
			tweetID:        "123456789",
			expectErr:      true,
			expectErrType:  nil, // not ErrNotFound, but a generic error
			validateResp:   nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				// Verify request path includes the tweet ID and tweet.fields parameter
				assert.Contains(t, r.URL.Path, "/2/tweets/"+tt.tweetID)
				assert.Contains(t, r.URL.RawQuery, "tweet.fields=public_metrics")

				w.WriteHeader(tt.mockStatusCode)
				w.Write([]byte(tt.mockResponse))
			}))
			defer srv.Close()

			logger := observability.NewLogger()
			client := NewClient("", "", srv.URL, srv.Client(), logger)

			metrics, err := client.GetTweetMetrics(context.Background(), tt.tweetID, "access_token", "token_secret")

			if tt.expectErr {
				require.Error(t, err)
				if tt.expectErrType != nil {
					assert.ErrorIs(t, err, tt.expectErrType)
				}
			} else {
				require.NoError(t, err)
				if tt.validateResp != nil {
					tt.validateResp(t, metrics)
				}
			}
		})
	}
}
