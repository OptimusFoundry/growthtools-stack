package store

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// createTestPostWithDate creates a post for the given account and sets its
// scheduled_at (or published_at) to the provided time. Returns the post ID.
func createTestPostWithScheduledAt(t *testing.T, s *Store, accountID interface{ String() string }, status string, scheduledAt time.Time) {
	t.Helper()
	ctx := context.Background()

	accID, ok := accountID.(interface{ String() string })
	_ = accID
	_ = ok

	// Use raw SQL to be able to set scheduled_at precisely.
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO posts (account_id, content, content_type, status, scheduled_at, source, media_ids, tags)
		 VALUES ($1, $2, 'text', $3, $4, 'manual', '{}', '{}')`,
		accountID, "calendar test post "+status, status, scheduledAt,
	)
	require.NoError(t, err)
}

func createTestPostWithPublishedAt(t *testing.T, s *Store, accountID interface{ String() string }, status string, publishedAt time.Time) {
	t.Helper()
	ctx := context.Background()

	_, err := s.db.ExecContext(ctx,
		`INSERT INTO posts (account_id, content, content_type, status, published_at, source, media_ids, tags)
		 VALUES ($1, $2, 'text', $3, $4, 'manual', '{}', '{}')`,
		accountID, "calendar test post "+status, status, publishedAt,
	)
	require.NoError(t, err)
}

func TestGetCalendarStatusCounts_Happy(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	// April 2026 — two different days
	day1 := time.Date(2026, 4, 5, 10, 0, 0, 0, time.UTC)  // April 5
	day2 := time.Date(2026, 4, 15, 10, 0, 0, 0, time.UTC) // April 15

	createTestPostWithScheduledAt(t, s, accountID, PostStatusDraft, day1)
	createTestPostWithPublishedAt(t, s, accountID, PostStatusPublished, day1)
	createTestPostWithScheduledAt(t, s, accountID, PostStatusScheduled, day2)

	rows, err := s.GetCalendarStatusCounts(ctx, CalendarParams{
		AccountID: accountID,
		Year:      2026,
		Month:     4,
	})
	require.NoError(t, err)
	require.Len(t, rows, 2)

	// Rows are sorted by day ASC.
	assert.Equal(t, "2026-04-05", rows[0].Day)
	assert.Equal(t, 1, rows[0].StatusDraft)
	assert.Equal(t, 1, rows[0].StatusPublished)
	assert.Equal(t, 0, rows[0].StatusScheduled)

	assert.Equal(t, "2026-04-15", rows[1].Day)
	assert.Equal(t, 1, rows[1].StatusScheduled)
	assert.Equal(t, 0, rows[1].StatusPublished)
}

func TestGetCalendarStatusCounts_NullDates(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	// Insert a draft with no scheduled_at and no published_at — should be excluded.
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO posts (account_id, content, content_type, status, source, media_ids, tags)
		 VALUES ($1, 'no date draft', 'text', 'draft', 'manual', '{}', '{}')`,
		accountID,
	)
	require.NoError(t, err)

	rows, err := s.GetCalendarStatusCounts(ctx, CalendarParams{
		AccountID: accountID,
		Year:      2026,
		Month:     4,
	})
	require.NoError(t, err)
	assert.Empty(t, rows)
}

func TestGetCalendarStatusCounts_WrongMonth(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	// Post in March 2026 — query for April should return nothing.
	march := time.Date(2026, 3, 10, 10, 0, 0, 0, time.UTC)
	createTestPostWithScheduledAt(t, s, accountID, PostStatusScheduled, march)

	rows, err := s.GetCalendarStatusCounts(ctx, CalendarParams{
		AccountID: accountID,
		Year:      2026,
		Month:     4,
	})
	require.NoError(t, err)
	assert.Empty(t, rows)
}

func TestGetCalendarPlatformCounts_Happy(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	day := time.Date(2026, 4, 5, 10, 0, 0, 0, time.UTC)

	// Create post with scheduled_at.
	var postID interface{ String() string }
	err := s.db.QueryRowContext(ctx,
		`INSERT INTO posts (account_id, content, content_type, status, scheduled_at, source, media_ids, tags)
		 VALUES ($1, 'platform test', 'text', 'scheduled', $2, 'manual', '{}', '{}')
		 RETURNING id`,
		accountID, day,
	).Scan(&postID)
	require.NoError(t, err)

	// Get the actual postID as uuid.UUID by re-querying.
	var rawPostID string
	err = s.db.QueryRowContext(ctx,
		`SELECT id::text FROM posts WHERE account_id = $1 ORDER BY created_at DESC LIMIT 1`,
		accountID,
	).Scan(&rawPostID)
	require.NoError(t, err)

	// Insert 3 platform_posts for different platforms.
	for _, platform := range []string{PlatformX, PlatformLinkedIn, PlatformBlueSky} {
		_, err = s.db.ExecContext(ctx,
			`INSERT INTO platform_posts (post_id, platform, status, content) VALUES ($1::uuid, $2, 'pending', 'content')`,
			rawPostID, platform,
		)
		require.NoError(t, err)
	}

	rows, err := s.GetCalendarPlatformCounts(ctx, CalendarParams{
		AccountID: accountID,
		Year:      2026,
		Month:     4,
	})
	require.NoError(t, err)
	require.Len(t, rows, 3)

	// Verify all three platforms appear (sorted by platform ASC).
	platforms := make(map[string]int)
	for _, row := range rows {
		assert.Equal(t, "2026-04-05", row.Day)
		platforms[row.Platform] = row.Count
	}
	assert.Equal(t, 1, platforms[PlatformX])
	assert.Equal(t, 1, platforms[PlatformLinkedIn])
	assert.Equal(t, 1, platforms[PlatformBlueSky])
}

func TestGetCalendarPlatformCounts_Empty(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	rows, err := s.GetCalendarPlatformCounts(ctx, CalendarParams{
		AccountID: accountID,
		Year:      2026,
		Month:     4,
	})
	require.NoError(t, err)
	assert.Empty(t, rows)
}

func TestListPosts_DateRangeFilter(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	// Create posts on 3 different days.
	day1 := time.Date(2026, 4, 1, 12, 0, 0, 0, time.UTC)
	day2 := time.Date(2026, 4, 10, 12, 0, 0, 0, time.UTC)
	day3 := time.Date(2026, 4, 20, 12, 0, 0, 0, time.UTC)

	createTestPostWithScheduledAt(t, s, accountID, PostStatusScheduled, day1)
	createTestPostWithScheduledAt(t, s, accountID, PostStatusScheduled, day2)
	createTestPostWithScheduledAt(t, s, accountID, PostStatusScheduled, day3)

	// Also create a post with no scheduled_at (will use created_at — hard to
	// control, so we use From/To around known dates and it may or may not appear).

	from := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 4, 15, 23, 59, 59, 0, time.UTC)

	posts, err := s.ListPosts(ctx, ListPostsParams{
		AccountID: accountID,
		From:      &from,
		To:        &to,
		Limit:     100,
	})
	require.NoError(t, err)
	// day1 and day2 are within range; day3 is not.
	assert.Len(t, posts, 2)
}
