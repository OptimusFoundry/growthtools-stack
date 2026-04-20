package processor

import (
	"context"
	"errors"
	"testing"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

func intPtr(i int) *int { return &i }

func TestPostProcessor_GetPostAnalytics(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	postID := uuid.New()
	ppID := uuid.New()
	logger := observability.NewLogger()

	now := time.Now().UTC().Truncate(time.Second)

	xPost := store.PlatformPostLatest{
		PlatformPostID:         ppID,
		Platform:               "x",
		Status:                 "published",
		PublishedAt:            &now,
		PlatformPostIDStr:      strPtr("1234567890"),
		AnalyticsUnavailableAt: nil,
		Impressions:            intPtr(500),
		Likes:                  intPtr(20),
		Comments:               intPtr(3),
		Shares:                 intPtr(7),
		Clicks:                 intPtr(12),
		CollectedAt:            &now,
	}

	analyticsHistory := []store.PostAnalytics{
		{ID: uuid.New(), PlatformPostID: ppID, Platform: "x", Impressions: 500, Likes: 20, CollectedAt: now},
	}

	tests := []struct {
		name    string
		mock    func(m *MockPostStore)
		wantErr error
		assert  func(t *testing.T, got GetPostAnalyticsResult)
	}{
		{
			name: "happy path — one platform post with analytics",
			mock: func(m *MockPostStore) {
				m.EXPECT().GetPostByID(gomock.Any(), accountID, postID).
					Return(store.Post{ID: postID, AccountID: accountID}, nil)
				m.EXPECT().GetLatestAnalyticsByPost(gomock.Any(), postID).
					Return([]store.PlatformPostLatest{xPost}, nil)
				m.EXPECT().GetAnalyticsByPlatformPost(gomock.Any(), ppID).
					Return(analyticsHistory, nil)
			},
			assert: func(t *testing.T, got GetPostAnalyticsResult) {
				require.Len(t, got.PlatformPosts, 1)
				pp := got.PlatformPosts[0]
				assert.Equal(t, "x", pp.Platform)
				require.NotNil(t, pp.Latest)
				assert.Equal(t, 500, pp.Latest.Impressions)
				require.NotNil(t, pp.PostURL)
				assert.Contains(t, *pp.PostURL, "1234567890")
				require.Len(t, pp.History, 1)
			},
		},
		{
			name: "post not owned by account → ErrPostNotFound",
			mock: func(m *MockPostStore) {
				m.EXPECT().GetPostByID(gomock.Any(), accountID, postID).
					Return(store.Post{}, store.ErrNotFound)
			},
			wantErr: ErrPostNotFound,
		},
		{
			name: "GetLatestAnalyticsByPost store error → ErrFailedGetPostAnalytics",
			mock: func(m *MockPostStore) {
				m.EXPECT().GetPostByID(gomock.Any(), accountID, postID).
					Return(store.Post{ID: postID, AccountID: accountID}, nil)
				m.EXPECT().GetLatestAnalyticsByPost(gomock.Any(), postID).
					Return(nil, errors.New("db boom"))
			},
			wantErr: ErrFailedGetPostAnalytics,
		},
		{
			name: "empty platform_posts list — returns empty slice",
			mock: func(m *MockPostStore) {
				m.EXPECT().GetPostByID(gomock.Any(), accountID, postID).
					Return(store.Post{ID: postID, AccountID: accountID}, nil)
				m.EXPECT().GetLatestAnalyticsByPost(gomock.Any(), postID).
					Return([]store.PlatformPostLatest{}, nil)
			},
			assert: func(t *testing.T, got GetPostAnalyticsResult) {
				assert.Empty(t, got.PlatformPosts)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPostStore(ctrl)
			tt.mock(m)
			proc := New(m, NewMockEventPublisher(ctrl), logger)

			got, err := proc.GetPostAnalytics(context.Background(), accountID, postID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assert != nil {
				tt.assert(t, got)
			}
		})
	}
}
