package store

import (
	"context"
	"fmt"
)

// sqlCalendarStatusCounts groups posts by UTC date and pivots status into
// named count columns. Only posts where at least one of scheduled_at /
// published_at is non-NULL are included (drafts with neither date are
// excluded from calendar bucketing). The pivot uses FILTER so no CASE
// expression is needed. $1=account_id, $2=year, $3=month.
const sqlCalendarStatusCounts = `
SELECT
    TO_CHAR(
        (COALESCE(published_at, scheduled_at) AT TIME ZONE 'UTC')::date,
        'YYYY-MM-DD'
    ) AS day,
    COUNT(*) FILTER (WHERE status = 'draft')               AS cnt_draft,
    COUNT(*) FILTER (WHERE status = 'scheduled')           AS cnt_scheduled,
    COUNT(*) FILTER (WHERE status = 'publishing')          AS cnt_publishing,
    COUNT(*) FILTER (WHERE status = 'published')           AS cnt_published,
    COUNT(*) FILTER (WHERE status = 'failed')              AS cnt_failed,
    COUNT(*) FILTER (WHERE status = 'partially_published') AS cnt_partially_published
FROM posts
WHERE account_id = $1
  AND deleted_at IS NULL
  AND COALESCE(published_at, scheduled_at) IS NOT NULL
  AND EXTRACT(YEAR  FROM (COALESCE(published_at, scheduled_at) AT TIME ZONE 'UTC')) = $2
  AND EXTRACT(MONTH FROM (COALESCE(published_at, scheduled_at) AT TIME ZONE 'UTC')) = $3
GROUP BY day
ORDER BY day ASC
`

// GetCalendarStatusCounts returns one CalendarStatusRow per day that has at
// least one post in the requested month. Days with no posts are omitted;
// the frontend fills gaps.
func (s *Store) GetCalendarStatusCounts(ctx context.Context, params CalendarParams) ([]CalendarStatusRow, error) {
	rows := make([]CalendarStatusRow, 0)
	err := s.db.SelectContext(ctx, &rows, sqlCalendarStatusCounts,
		params.AccountID, params.Year, params.Month)
	if err != nil {
		return nil, fmt.Errorf("failed to get calendar status counts: %w", err)
	}
	return rows, nil
}

// sqlCalendarPlatformCounts counts platform_posts rows (not posts rows) per
// day per platform. One post targeting 3 platforms produces 3 rows here.
// $1=account_id, $2=year, $3=month.
const sqlCalendarPlatformCounts = `
SELECT
    TO_CHAR(
        (COALESCE(p.published_at, p.scheduled_at) AT TIME ZONE 'UTC')::date,
        'YYYY-MM-DD'
    ) AS day,
    pp.platform,
    COUNT(*) AS cnt
FROM platform_posts pp
JOIN posts p ON p.id = pp.post_id
WHERE p.account_id = $1
  AND p.deleted_at IS NULL
  AND COALESCE(p.published_at, p.scheduled_at) IS NOT NULL
  AND EXTRACT(YEAR  FROM (COALESCE(p.published_at, p.scheduled_at) AT TIME ZONE 'UTC')) = $2
  AND EXTRACT(MONTH FROM (COALESCE(p.published_at, p.scheduled_at) AT TIME ZONE 'UTC')) = $3
GROUP BY day, pp.platform
ORDER BY day ASC, pp.platform ASC
`

// GetCalendarPlatformCounts returns one CalendarPlatformRow per (day, platform)
// pair that has at least one platform_post in the requested month.
func (s *Store) GetCalendarPlatformCounts(ctx context.Context, params CalendarParams) ([]CalendarPlatformRow, error) {
	rows := make([]CalendarPlatformRow, 0)
	err := s.db.SelectContext(ctx, &rows, sqlCalendarPlatformCounts,
		params.AccountID, params.Year, params.Month)
	if err != nil {
		return nil, fmt.Errorf("failed to get calendar platform counts: %w", err)
	}
	return rows, nil
}
