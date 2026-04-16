package store

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// createTestPlatformPost creates account -> post -> platform_post and returns all IDs.
func createTestPlatformPost(t *testing.T, s *Store, platform string) (accountID, postID, platformPostID uuid.UUID) {
	t.Helper()
	accountID, postID = createTestPost(t, s)
	ctx := context.Background()

	pp, err := s.CreatePlatformPost(ctx, CreatePlatformPostParams{
		PostID:   postID,
		Platform: platform,
	})
	require.NoError(t, err)
	return accountID, postID, pp.ID
}

func TestRecordPostAnalytics(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	_, _, ppID := createTestPlatformPost(t, s, PlatformX)
	ctx := context.Background()

	pa, err := s.RecordPostAnalytics(ctx, RecordPostAnalyticsParams{
		PlatformPostID: ppID,
		Platform:       PlatformX,
		Impressions:    1000,
		Likes:          50,
		Comments:       10,
		Shares:         5,
		Clicks:         200,
	})
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, pa.ID)
	assert.Equal(t, ppID, pa.PlatformPostID)
	assert.Equal(t, PlatformX, pa.Platform)
	assert.Equal(t, 1000, pa.Impressions)
	assert.Equal(t, 50, pa.Likes)
	assert.Equal(t, 10, pa.Comments)
	assert.Equal(t, 5, pa.Shares)
	assert.Equal(t, 200, pa.Clicks)
	assert.False(t, pa.CollectedAt.IsZero())
}

func TestGetAnalyticsByPlatformPost(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	_, _, ppID := createTestPlatformPost(t, s, PlatformLinkedIn)
	ctx := context.Background()

	// Record two snapshots
	for i := 0; i < 2; i++ {
		_, err := s.RecordPostAnalytics(ctx, RecordPostAnalyticsParams{
			PlatformPostID: ppID,
			Platform:       PlatformLinkedIn,
			Impressions:    100 * (i + 1),
			Likes:          10 * (i + 1),
		})
		require.NoError(t, err)
	}

	analytics, err := s.GetAnalyticsByPlatformPost(ctx, ppID)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(analytics), 2)

	// Empty for non-existent
	analytics, err = s.GetAnalyticsByPlatformPost(ctx, uuid.New())
	require.NoError(t, err)
	assert.Empty(t, analytics)
}

func TestGetAnalyticsOverview(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID, _, ppID := createTestPlatformPost(t, s, PlatformX)
	ctx := context.Background()

	_, err := s.RecordPostAnalytics(ctx, RecordPostAnalyticsParams{
		PlatformPostID: ppID,
		Platform:       PlatformX,
		Impressions:    500,
		Likes:          25,
		Comments:       3,
		Shares:         2,
		Clicks:         100,
	})
	require.NoError(t, err)

	from := time.Now().UTC().Add(-1 * time.Hour)
	to := time.Now().UTC().Add(1 * time.Hour)

	overview, err := s.GetAnalyticsOverview(ctx, accountID, from, to)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, overview.TotalImpressions, 500)
	assert.GreaterOrEqual(t, overview.TotalLikes, 25)
	assert.GreaterOrEqual(t, overview.TotalComments, 3)
	assert.GreaterOrEqual(t, overview.TotalShares, 2)
	assert.GreaterOrEqual(t, overview.TotalClicks, 100)

	// Zero for other account
	otherAccount := createTestAccount(t, s)
	overview, err = s.GetAnalyticsOverview(ctx, otherAccount, from, to)
	require.NoError(t, err)
	assert.Equal(t, 0, overview.TotalImpressions)
}

func TestGetAnalyticsTimeSeries(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID, _, ppID := createTestPlatformPost(t, s, PlatformX)
	ctx := context.Background()

	_, err := s.RecordPostAnalytics(ctx, RecordPostAnalyticsParams{
		PlatformPostID: ppID,
		Platform:       PlatformX,
		Impressions:    300,
		Likes:          15,
	})
	require.NoError(t, err)

	from := time.Now().UTC().Add(-1 * time.Hour)
	to := time.Now().UTC().Add(1 * time.Hour)

	series, err := s.GetAnalyticsTimeSeries(ctx, accountID, from, to)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(series), 1)

	// Empty for other account
	otherAccount := createTestAccount(t, s)
	series, err = s.GetAnalyticsTimeSeries(ctx, otherAccount, from, to)
	require.NoError(t, err)
	assert.Empty(t, series)
}

func TestGetAnalyticsByPlatform(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	// Create account and posts for two platforms
	accountID := createTestAccount(t, s)

	post1, err := s.CreatePost(ctx, CreatePostParams{
		AccountID:   accountID,
		Content:     "analytics platform test 1",
		ContentType: ContentTypeText,
		Status:      PostStatusPublished,
		Source:      PostSourceManual,
	})
	require.NoError(t, err)

	pp1, err := s.CreatePlatformPost(ctx, CreatePlatformPostParams{
		PostID:   post1.ID,
		Platform: PlatformX,
	})
	require.NoError(t, err)

	pp2, err := s.CreatePlatformPost(ctx, CreatePlatformPostParams{
		PostID:   post1.ID,
		Platform: PlatformLinkedIn,
	})
	require.NoError(t, err)

	_, err = s.RecordPostAnalytics(ctx, RecordPostAnalyticsParams{
		PlatformPostID: pp1.ID,
		Platform:       PlatformX,
		Impressions:    1000,
		Likes:          50,
	})
	require.NoError(t, err)

	_, err = s.RecordPostAnalytics(ctx, RecordPostAnalyticsParams{
		PlatformPostID: pp2.ID,
		Platform:       PlatformLinkedIn,
		Impressions:    500,
		Likes:          30,
	})
	require.NoError(t, err)

	from := time.Now().UTC().Add(-1 * time.Hour)
	to := time.Now().UTC().Add(1 * time.Hour)

	byPlatform, err := s.GetAnalyticsByPlatform(ctx, accountID, from, to)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(byPlatform), 2)

	// Verify platform breakdown exists
	platforms := make(map[string]bool)
	for _, p := range byPlatform {
		platforms[p.Platform] = true
	}
	assert.True(t, platforms[PlatformX])
	assert.True(t, platforms[PlatformLinkedIn])
}
