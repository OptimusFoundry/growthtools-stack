//go:build integration

package tests

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCalendarEndpoint_Happy(t *testing.T) {
	t.Parallel()
	c := testClient(t)
	u := seedUserWithAccount(t, c.Store)
	ctx := context.Background()

	// Seed 2 posts in April 2026 on different days.
	_, err := c.Store.GetDB().ExecContext(ctx,
		`INSERT INTO posts (account_id, content, content_type, status, scheduled_at, source, media_ids, tags)
		 VALUES ($1, 'april post 1', 'text', 'scheduled', $2, 'manual', '{}', '{}')`,
		u.AccountID, time.Date(2026, 4, 5, 10, 0, 0, 0, time.UTC),
	)
	require.NoError(t, err)

	_, err = c.Store.GetDB().ExecContext(ctx,
		`INSERT INTO posts (account_id, content, content_type, status, scheduled_at, source, media_ids, tags)
		 VALUES ($1, 'april post 2', 'text', 'scheduled', $2, 'manual', '{}', '{}')`,
		u.AccountID, time.Date(2026, 4, 15, 10, 0, 0, 0, time.UTC),
	)
	require.NoError(t, err)

	t.Cleanup(func() {
		_, _ = c.Store.GetDB().ExecContext(context.Background(),
			`DELETE FROM posts WHERE account_id = $1`, u.AccountID)
	})

	resp, body := c.Request(t, http.MethodGet,
		"/api/protected/posts/calendar?year=2026&month=4",
		nil, u.Token)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.Unmarshal(body, &result))
	assert.Equal(t, "2026-04", result["month"])
	days, ok := result["days"].([]any)
	require.True(t, ok)
	assert.Len(t, days, 2)
}

func TestCalendarEndpoint_EmptyMonth(t *testing.T) {
	t.Parallel()
	c := testClient(t)
	u := seedUserWithAccount(t, c.Store)

	resp, body := c.Request(t, http.MethodGet,
		"/api/protected/posts/calendar?year=2025&month=1",
		nil, u.Token)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.Unmarshal(body, &result))
	days, ok := result["days"].([]any)
	require.True(t, ok)
	assert.Empty(t, days)
}

func TestCalendarEndpoint_MissingYear(t *testing.T) {
	t.Parallel()
	c := testClient(t)
	u := seedUserWithAccount(t, c.Store)

	resp, _ := c.Request(t, http.MethodGet,
		"/api/protected/posts/calendar?month=4",
		nil, u.Token)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestCalendarEndpoint_MissingMonth(t *testing.T) {
	t.Parallel()
	c := testClient(t)
	u := seedUserWithAccount(t, c.Store)

	resp, _ := c.Request(t, http.MethodGet,
		"/api/protected/posts/calendar?year=2026",
		nil, u.Token)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestCalendarEndpoint_InvalidYear(t *testing.T) {
	t.Parallel()
	c := testClient(t)
	u := seedUserWithAccount(t, c.Store)

	resp, _ := c.Request(t, http.MethodGet,
		"/api/protected/posts/calendar?year=1800&month=4",
		nil, u.Token)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestCalendarEndpoint_Unauthenticated(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	resp, _ := c.Request(t, http.MethodGet,
		"/api/protected/posts/calendar?year=2026&month=4",
		nil, "") // no token
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestListPosts_FromTo(t *testing.T) {
	t.Parallel()
	c := testClient(t)
	u := seedUserWithAccount(t, c.Store)
	ctx := context.Background()

	// Seed posts across April 2026.
	dates := []time.Time{
		time.Date(2026, 4, 1, 12, 0, 0, 0, time.UTC),
		time.Date(2026, 4, 10, 12, 0, 0, 0, time.UTC),
		time.Date(2026, 4, 20, 12, 0, 0, 0, time.UTC),
		time.Date(2026, 4, 25, 12, 0, 0, 0, time.UTC),
	}
	for _, d := range dates {
		_, err := c.Store.GetDB().ExecContext(ctx,
			`INSERT INTO posts (account_id, content, content_type, status, scheduled_at, source, media_ids, tags)
			 VALUES ($1, 'date range post', 'text', 'scheduled', $2, 'manual', '{}', '{}')`,
			u.AccountID, d,
		)
		require.NoError(t, err)
	}

	t.Cleanup(func() {
		_, _ = c.Store.GetDB().ExecContext(context.Background(),
			`DELETE FROM posts WHERE account_id = $1`, u.AccountID)
	})

	// Request only the first half of the month.
	resp, body := c.Request(t, http.MethodGet,
		"/api/protected/posts?from=2026-04-01&to=2026-04-15",
		nil, u.Token)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var posts []map[string]any
	require.NoError(t, json.Unmarshal(body, &posts))
	// Only posts on April 1 and April 10 should be returned.
	assert.Len(t, posts, 2)
}
