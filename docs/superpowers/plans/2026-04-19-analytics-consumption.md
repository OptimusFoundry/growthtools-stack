# Analytics Consumption — Implementation Plan

**Goal:** Surface time-series charts, date-range controls, and trend chips on `/analytics`; add a new `GET /api/protected/posts/:id/analytics` endpoint with a matching `/posts/$id/analytics` detail page; and inject a `LastSevenDaysSection` widget on the dashboard home page.

**Scope:** Full-stack — no migrations required (all tables and columns already exist via V0051).

**Executor:** `fullstack-supervisor` — use `backend-subagent-development` skill for the backend phase, then dispatch `frontend-supervisor` for the frontend phase.

---

## Architecture Summary

### Database changes
None. All required tables (`post_analytics`, `platform_posts`, `posts`) and the `analytics_unavailable_at` column exist. A new store method `GetLatestAnalyticsByPost` joins them with a `DISTINCT ON` window.

### API changes
- New `GET /api/protected/posts/:id/analytics` — returns per-platform-post analytics with history. Registered in `base-server/internal/infra/api/api.go` under the `protectedGroup`, alongside the existing `/posts/:id` routes. Handled by new method `HandleGetPostAnalytics` on the existing `posts` handler.

### Frontend changes
- `useAnalytics` hook extended with `rangeToDates` / `priorWindow` helpers.
- New `useAnalyticsComparison` hook — calls `useAnalytics` twice (current + prior window) and exposes `deltas`.
- New `usePostAnalytics` hook — fetches the new endpoint.
- New chart primitives: `chart-theme.ts`, `TimeSeriesChart/`, `Sparkline/`.
- New UI controls: `DateRangeTabs/`, `MetricSelector/`.
- `AnalyticsPage` component refactored: adds date-range tabs, trend chips, chart section, `.tbl`-style table.
- New `LastSevenDaysSection/` component — inserted into `webapp/src/routes/index.tsx`.
- New route `webapp/src/routes/posts.$id.analytics.tsx` — mounts `PostAnalyticsPage/`.
- New `PostAnalyticsPage/` and `PlatformPostAnalyticsCard/` components.
- `webapp/src/routes/posts.tsx` — analytics icon-button added to every published post row.
- Playwright E2E spec extensions for `/analytics`, new spec for `/posts/$id/analytics`, dashboard section tests.

---

## Phase 1 — Backend: Store

### B1: Add `GetLatestAnalyticsByPost` store method

**File:** `base-server/internal/infra/store/post_analytics.go`

Add after the existing `GetAnalyticsByPlatformPost` function (after line 67).

**New struct** (add to the same file, before the new SQL constant):

```go
// PlatformPostLatest is the return type for GetLatestAnalyticsByPost. It joins
// platform_posts with the most-recent post_analytics row per platform_post.
// Analytics columns are nullable because a platform_post may have no analytics
// rows yet.
type PlatformPostLatest struct {
	PlatformPostID          uuid.UUID  `db:"platform_post_id"           json:"platform_post_id"`
	Platform                string     `db:"platform"                   json:"platform"`
	Status                  string     `db:"status"                     json:"status"`
	PublishedAt             *time.Time `db:"published_at"               json:"published_at"`
	PostURL                 *string    `db:"post_url"                   json:"post_url"`
	AnalyticsUnavailableAt  *time.Time `db:"analytics_unavailable_at"   json:"analytics_unavailable_at"`
	Impressions             *int       `db:"impressions"                json:"impressions"`
	Likes                   *int       `db:"likes"                      json:"likes"`
	Comments                *int       `db:"comments"                   json:"comments"`
	Shares                  *int       `db:"shares"                     json:"shares"`
	Clicks                  *int       `db:"clicks"                     json:"clicks"`
	CollectedAt             *time.Time `db:"collected_at"               json:"collected_at"`
}
```

Note: `platform_posts` does not have a `post_url` column in the DB schema — the spec says to render an external-link icon when `post_url` is non-null. The `platform_post_id` string (the ID on the remote platform, e.g. a tweet ID) is available as `pp.platform_post_id` which is a `*string`. We surface it as `PostURL` by constructing the URL in the processor layer (not in SQL). So the struct field `PostURL *string` is populated by the processor after the query, not by the store. Remove `post_url` from the SQL SELECT and from the struct `db` tag; keep it as a plain struct field with no `db` tag so sqlx ignores it.

**Corrected struct:**

```go
type PlatformPostLatest struct {
	PlatformPostID         uuid.UUID  `db:"platform_post_id"          json:"platform_post_id"`
	Platform               string     `db:"platform"                  json:"platform"`
	Status                 string     `db:"status"                    json:"status"`
	PublishedAt            *time.Time `db:"published_at"              json:"published_at"`
	PlatformPostIDStr      *string    `db:"platform_post_id_str"      json:"-"`
	AnalyticsUnavailableAt *time.Time `db:"analytics_unavailable_at"  json:"analytics_unavailable_at"`
	Impressions            *int       `db:"impressions"               json:"impressions"`
	Likes                  *int       `db:"likes"                     json:"likes"`
	Comments               *int       `db:"comments"                  json:"comments"`
	Shares                 *int       `db:"shares"                    json:"shares"`
	Clicks                 *int       `db:"clicks"                    json:"clicks"`
	CollectedAt            *time.Time `db:"collected_at"              json:"collected_at"`
	PostURL                *string    `db:"-"                         json:"post_url"`
}
```

**SQL constant:**

```go
const sqlGetLatestAnalyticsByPost = `
SELECT
    pp.id                          AS platform_post_id,
    pp.platform                    AS platform,
    pp.status                      AS status,
    pp.published_at                AS published_at,
    pp.platform_post_id            AS platform_post_id_str,
    pp.analytics_unavailable_at    AS analytics_unavailable_at,
    latest.impressions             AS impressions,
    latest.likes                   AS likes,
    latest.comments                AS comments,
    latest.shares                  AS shares,
    latest.clicks                  AS clicks,
    latest.collected_at            AS collected_at
FROM platform_posts pp
LEFT JOIN LATERAL (
    SELECT impressions, likes, comments, shares, clicks, collected_at
    FROM post_analytics
    WHERE platform_post_id = pp.id
    ORDER BY collected_at DESC
    LIMIT 1
) latest ON TRUE
WHERE pp.post_id = $1
ORDER BY pp.created_at ASC
`
```

**Method:**

```go
func (s *Store) GetLatestAnalyticsByPost(ctx context.Context, postID uuid.UUID) ([]PlatformPostLatest, error) {
	rows := make([]PlatformPostLatest, 0)
	err := s.db.SelectContext(ctx, &rows, sqlGetLatestAnalyticsByPost, postID)
	if err != nil {
		return nil, fmt.Errorf("failed to get latest analytics by post: %w", err)
	}
	return rows, nil
}
```

---

### B2: Store test for `GetLatestAnalyticsByPost`

**File:** `base-server/internal/infra/store/post_analytics_test.go`

Add a new test function `TestStore_GetLatestAnalyticsByPost` after the existing analytics tests. Use the `SetupTestStore` + `createTestAccount` helpers already in `test_helpers_test.go`.

```go
func TestStore_GetLatestAnalyticsByPost(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name   string
		setup  func(t *testing.T) uuid.UUID // returns postID
		assert func(t *testing.T, rows []store.PlatformPostLatest)
	}{
		{
			name: "returns one row per platform_post with latest analytics",
			setup: func(t *testing.T) uuid.UUID {
				accountID := createTestAccount(t, s)
				post, err := s.CreatePost(ctx, store.CreatePostParams{
					AccountID: accountID, Content: "hello",
					ContentType: "text", Status: "published",
					Source: "manual",
				})
				require.NoError(t, err)
				pp, err := s.CreatePlatformPost(ctx, store.CreatePlatformPostParams{
					PostID: post.ID, Platform: "x",
				})
				require.NoError(t, err)
				// two analytics rows — only the later one should be "latest"
				_, err = s.RecordPostAnalytics(ctx, store.RecordPostAnalyticsParams{
					PlatformPostID: pp.ID, Platform: "x",
					Impressions: 100, Likes: 5,
				})
				require.NoError(t, err)
				_, err = s.RecordPostAnalytics(ctx, store.RecordPostAnalyticsParams{
					PlatformPostID: pp.ID, Platform: "x",
					Impressions: 200, Likes: 10,
				})
				require.NoError(t, err)
				return post.ID
			},
			assert: func(t *testing.T, rows []store.PlatformPostLatest) {
				require.Len(t, rows, 1)
				assert.Equal(t, "x", rows[0].Platform)
				require.NotNil(t, rows[0].Impressions)
				assert.Equal(t, 200, *rows[0].Impressions)
				require.NotNil(t, rows[0].Likes)
				assert.Equal(t, 10, *rows[0].Likes)
			},
		},
		{
			name: "returns row with nil analytics when no analytics recorded",
			setup: func(t *testing.T) uuid.UUID {
				accountID := createTestAccount(t, s)
				post, err := s.CreatePost(ctx, store.CreatePostParams{
					AccountID: accountID, Content: "no analytics",
					ContentType: "text", Status: "published",
					Source: "manual",
				})
				require.NoError(t, err)
				_, err = s.CreatePlatformPost(ctx, store.CreatePlatformPostParams{
					PostID: post.ID, Platform: "linkedin",
				})
				require.NoError(t, err)
				return post.ID
			},
			assert: func(t *testing.T, rows []store.PlatformPostLatest) {
				require.Len(t, rows, 1)
				assert.Equal(t, "linkedin", rows[0].Platform)
				assert.Nil(t, rows[0].Impressions)
				assert.Nil(t, rows[0].CollectedAt)
			},
		},
		{
			name: "returns analytics_unavailable_at when marked",
			setup: func(t *testing.T) uuid.UUID {
				accountID := createTestAccount(t, s)
				post, err := s.CreatePost(ctx, store.CreatePostParams{
					AccountID: accountID, Content: "deleted post",
					ContentType: "text", Status: "published",
					Source: "manual",
				})
				require.NoError(t, err)
				pp, err := s.CreatePlatformPost(ctx, store.CreatePlatformPostParams{
					PostID: post.ID, Platform: "x",
				})
				require.NoError(t, err)
				err = s.MarkPlatformPostAnalyticsUnavailable(ctx, pp.ID)
				require.NoError(t, err)
				return post.ID
			},
			assert: func(t *testing.T, rows []store.PlatformPostLatest) {
				require.Len(t, rows, 1)
				assert.NotNil(t, rows[0].AnalyticsUnavailableAt)
			},
		},
		{
			name: "returns empty slice when post has no platform_posts",
			setup: func(t *testing.T) uuid.UUID {
				accountID := createTestAccount(t, s)
				post, err := s.CreatePost(ctx, store.CreatePostParams{
					AccountID: accountID, Content: "no platforms",
					ContentType: "text", Status: "draft",
					Source: "manual",
				})
				require.NoError(t, err)
				return post.ID
			},
			assert: func(t *testing.T, rows []store.PlatformPostLatest) {
				assert.Empty(t, rows)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			postID := tt.setup(t)
			rows, err := s.GetLatestAnalyticsByPost(ctx, postID)
			require.NoError(t, err)
			tt.assert(t, rows)
		})
	}
}
```

Run: `make dev-test-store`

---

## Phase 2 — Backend: Processor + Handler

### B3: Add `GetPostAnalytics` to posts processor

**File:** `base-server/internal/posts/processor/processor.go`

**Step 1 — Extend the `PostStore` interface** (add to the existing `PostStore` interface definition around line 30):

```go
GetLatestAnalyticsByPost(ctx context.Context, postID uuid.UUID) ([]store.PlatformPostLatest, error)
GetAnalyticsByPlatformPost(ctx context.Context, platformPostID uuid.UUID) ([]store.PostAnalytics, error)
```

**Step 2 — Add error variables** (add to the existing `var (...)` block at line 51):

```go
ErrFailedGetPostAnalytics = errors.New("failed to get post analytics")
```

**Step 3 — Add response types** (add before the `GetPostAnalytics` method, after the existing types):

```go
// AnalyticsSnapshot is one metrics point in a history slice or latest reading.
type AnalyticsSnapshot struct {
	Impressions int       `json:"impressions"`
	Likes       int       `json:"likes"`
	Comments    int       `json:"comments"`
	Shares      int       `json:"shares"`
	Clicks      int       `json:"clicks"`
	CollectedAt time.Time `json:"collected_at"`
}

// PlatformPostAnalytics is the per-platform block in GetPostAnalyticsResult.
type PlatformPostAnalytics struct {
	PlatformPostID         string             `json:"platform_post_id"`
	Platform               string             `json:"platform"`
	Status                 string             `json:"status"`
	PublishedAt            *time.Time         `json:"published_at"`
	PostURL                *string            `json:"post_url"`
	AnalyticsUnavailableAt *time.Time         `json:"analytics_unavailable_at"`
	Latest                 *AnalyticsSnapshot `json:"latest"`
	History                []AnalyticsSnapshot `json:"history"`
}

// GetPostAnalyticsResult is the response shape for HandleGetPostAnalytics.
type GetPostAnalyticsResult struct {
	PlatformPosts []PlatformPostAnalytics `json:"platform_posts"`
}
```

**Step 4 — Add the method** (append to processor.go):

```go
// buildPostURL constructs a human-readable URL for a published platform post
// from the raw platform_post_id string. Returns nil when platformPostIDStr is
// nil or empty, or when the platform doesn't have a deterministic URL shape.
func buildPostURL(platform string, platformPostIDStr *string) *string {
	if platformPostIDStr == nil || *platformPostIDStr == "" {
		return nil
	}
	id := *platformPostIDStr
	var u string
	switch platform {
	case store.PlatformX:
		u = "https://x.com/i/web/status/" + id
	case store.PlatformBlueSky:
		// BlueSky AT URIs are not direct web URLs; skip rather than expose raw AT URI.
		return nil
	case store.PlatformThreads:
		u = "https://www.threads.net/t/" + id
	default:
		return nil
	}
	return &u
}

// GetPostAnalytics returns per-platform analytics for a single post. It first
// verifies the post belongs to the caller's account, then fetches each
// platform_post's latest snapshot and full history.
func (p *PostProcessor) GetPostAnalytics(ctx context.Context, accountID, postID uuid.UUID) (GetPostAnalyticsResult, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "operation", Value: "get_post_analytics"},
	)

	// Verify ownership.
	if _, err := p.store.GetPostByID(ctx, accountID, postID); err != nil {
		p.logger.Error(ctx, "failed to verify post ownership for analytics", err)
		if errors.Is(err, store.ErrNotFound) {
			return GetPostAnalyticsResult{}, ErrPostNotFound
		}
		return GetPostAnalyticsResult{}, ErrFailedGetPostAnalytics
	}

	latestRows, err := p.store.GetLatestAnalyticsByPost(ctx, postID)
	if err != nil {
		p.logger.Error(ctx, "failed to get latest analytics by post", err)
		return GetPostAnalyticsResult{}, ErrFailedGetPostAnalytics
	}

	platformPosts := make([]PlatformPostAnalytics, 0, len(latestRows))
	for _, row := range latestRows {
		var latest *AnalyticsSnapshot
		if row.CollectedAt != nil {
			imp := 0
			if row.Impressions != nil {
				imp = *row.Impressions
			}
			lk := 0
			if row.Likes != nil {
				lk = *row.Likes
			}
			cm := 0
			if row.Comments != nil {
				cm = *row.Comments
			}
			sh := 0
			if row.Shares != nil {
				sh = *row.Shares
			}
			cl := 0
			if row.Clicks != nil {
				cl = *row.Clicks
			}
			latest = &AnalyticsSnapshot{
				Impressions: imp,
				Likes:       lk,
				Comments:    cm,
				Shares:      sh,
				Clicks:      cl,
				CollectedAt: *row.CollectedAt,
			}
		}

		historyRows, err := p.store.GetAnalyticsByPlatformPost(ctx, row.PlatformPostID)
		if err != nil {
			p.logger.Error(ctx, "failed to get analytics history for platform post", err)
			return GetPostAnalyticsResult{}, ErrFailedGetPostAnalytics
		}

		history := make([]AnalyticsSnapshot, 0, len(historyRows))
		for _, h := range historyRows {
			history = append(history, AnalyticsSnapshot{
				Impressions: h.Impressions,
				Likes:       h.Likes,
				Comments:    h.Comments,
				Shares:      h.Shares,
				Clicks:      h.Clicks,
				CollectedAt: h.CollectedAt,
			})
		}

		platformPosts = append(platformPosts, PlatformPostAnalytics{
			PlatformPostID:         row.PlatformPostID.String(),
			Platform:               row.Platform,
			Status:                 row.Status,
			PublishedAt:            row.PublishedAt,
			PostURL:                buildPostURL(row.Platform, row.PlatformPostIDStr),
			AnalyticsUnavailableAt: row.AnalyticsUnavailableAt,
			Latest:                 latest,
			History:                history,
		})
	}

	return GetPostAnalyticsResult{PlatformPosts: platformPosts}, nil
}
```

**Step 5 — Regenerate mocks:**

```bash
cd base-server && go generate ./internal/posts/processor/...
```

---

### B4: Processor unit tests for `GetPostAnalytics`

**File:** `base-server/internal/posts/processor/processor_test.go`

Add a new test function `TestPostProcessor_GetPostAnalytics`. The mock is already generated from B3.

```go
func TestPostProcessor_GetPostAnalytics(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	postID    := uuid.New()
	ppID      := uuid.New()
	logger    := observability.NewLogger()

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
			name: "happy path — two analytics rows, one platform post",
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

func intPtr(i int) *int { return &i }
```

Run: `make dev-test-unit`

---

### B5: Add `HandleGetPostAnalytics` to posts handler

**File:** `base-server/internal/posts/handler/handler.go`

**Step 1 — Extend `PostProcessor` interface** (add after the existing `GetCalendarMonth` line ~line 33):

```go
GetPostAnalytics(ctx context.Context, accountID, postID uuid.UUID) (processor.GetPostAnalyticsResult, error)
```

**Step 2 — Add to `handleError`** (add after the `ErrInvalidCalendarParams` case):

```go
case errors.Is(err, processor.ErrFailedGetPostAnalytics):
    apierrors.InternalError(c, err)
```

**Step 3 — Regenerate mocks:**

```bash
cd base-server && go generate ./internal/posts/handler/...
```

**Step 4 — Create the handler file:**

**File:** `base-server/internal/posts/handler/analytics.go`

```go
package handler

import (
	"net/http"

	"base-server/internal/infra/apierrors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// HandleGetPostAnalytics returns per-platform analytics for a single post.
// GET /api/protected/posts/:id/analytics
func (h *Handler) HandleGetPostAnalytics(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postIDStr := c.Param("id")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid post ID format")
		return
	}

	result, err := h.processor.GetPostAnalytics(ctx, accountID, postID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}
```

**Step 5 — Register the route** in `base-server/internal/infra/api/api.go`. Add after line 133 (`protectedGroup.GET("/posts/:id/details", ...)`):

```go
protectedGroup.GET("/posts/:id/analytics", a.postsHandler.HandleGetPostAnalytics)
```

Run: `cd base-server && go build ./...`

---

### B6: Handler unit tests for `HandleGetPostAnalytics`

**File:** `base-server/internal/posts/handler/handler_test.go`

Add a new test function `TestHandler_GetPostAnalytics`:

```go
func TestHandler_GetPostAnalytics(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	postID    := uuid.New()
	logger    := observability.NewLogger()

	happyResult := processor.GetPostAnalyticsResult{
		PlatformPosts: []processor.PlatformPostAnalytics{
			{
				PlatformPostID: uuid.New().String(),
				Platform:       "x",
				Status:         "published",
				History:        make([]processor.AnalyticsSnapshot, 0),
			},
		},
	}

	tests := []struct {
		name       string
		postID     string
		mock       func(m *MockPostProcessor)
		wantStatus int
	}{
		{
			name:   "200 happy path",
			postID: postID.String(),
			mock: func(m *MockPostProcessor) {
				m.EXPECT().GetPostAnalytics(gomock.Any(), accountID, postID).
					Return(happyResult, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name:   "404 post not found",
			postID: postID.String(),
			mock: func(m *MockPostProcessor) {
				m.EXPECT().GetPostAnalytics(gomock.Any(), accountID, postID).
					Return(processor.GetPostAnalyticsResult{}, processor.ErrPostNotFound)
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "400 invalid UUID",
			postID:     "not-a-uuid",
			mock:       func(m *MockPostProcessor) {},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:   "500 internal error",
			postID: postID.String(),
			mock: func(m *MockPostProcessor) {
				m.EXPECT().GetPostAnalytics(gomock.Any(), accountID, postID).
					Return(processor.GetPostAnalyticsResult{}, processor.ErrFailedGetPostAnalytics)
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPostProcessor(ctrl)
			tt.mock(m)
			h := New(m, logger)

			gin.SetMode(gin.TestMode)
			r := gin.New()
			r.GET("/posts/:id/analytics", func(c *gin.Context) {
				c.Set("Account-ID", accountID.String())
			}, h.HandleGetPostAnalytics)

			req := httptest.NewRequest(http.MethodGet, "/posts/"+tt.postID+"/analytics", nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}
```

Run: `make dev-test-unit`

---

### B7: Integration test for `GET /posts/:id/analytics`

**File:** `base-server/tests/posts_analytics_api_test.go`

```go
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
				user := seedUser(t, c.Store)
				acct := seedAccount(t, c.Store, user.ID)
				post := seedPost(t, c.Store, acct.ID, seedPostOpts{Status: "published"})
				return newJWT(t, user.ID), post.ID.String()
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
				user := seedUser(t, c.Store)
				return newJWT(t, user.ID), uuid.New().String()
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "400 when invalid UUID",
			setup: func(t *testing.T) (string, string) {
				user := seedUser(t, c.Store)
				return newJWT(t, user.ID), "not-a-uuid"
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
```

Run: `make dev-test-integration`

---

## Phase 3 — Frontend: Shared Primitives

### F1: Extend API types for post analytics

**File:** `webapp/src/api/types/analytics.ts`

Add at the end of the file:

```typescript
// ── Per-post analytics (new endpoint: GET /posts/:id/analytics) ──────────────

export interface ApiAnalyticsSnapshot {
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  collected_at: string;
}

export interface ApiPlatformPostAnalytics {
  platform_post_id: string;
  platform: string;
  status: string;
  published_at: string | null;
  post_url: string | null;
  analytics_unavailable_at: string | null;
  latest: ApiAnalyticsSnapshot | null;
  history: ApiAnalyticsSnapshot[];
}

export interface ApiPostAnalytics {
  platform_posts: ApiPlatformPostAnalytics[];
}
```

---

### F2: Add frontend domain types for post analytics

**File:** `webapp/src/types/analytics.ts`

Add at the end:

```typescript
// ── Per-post analytics ────────────────────────────────────────────────────────

export interface AnalyticsSnapshot {
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  collectedAt: string;
}

export interface PlatformPostAnalytics {
  platformPostId: string;
  platform: string;
  status: string;
  publishedAt: string | null;
  postUrl: string | null;
  analyticsUnavailableAt: string | null;
  latest: AnalyticsSnapshot | null;
  history: AnalyticsSnapshot[];
}

export interface PostAnalytics {
  platformPosts: PlatformPostAnalytics[];
}
```

---

### F3: Add transforms for post analytics

**File:** `webapp/src/api/transforms/analytics.ts`

Add at the end:

```typescript
import type {
  ApiAnalyticsSnapshot,
  ApiPlatformPostAnalytics,
  ApiPostAnalytics,
} from '../types/analytics';
import type {
  AnalyticsSnapshot,
  PlatformPostAnalytics,
  PostAnalytics,
} from '@/types/analytics';

export function toAnalyticsSnapshot(api: ApiAnalyticsSnapshot): AnalyticsSnapshot {
  return {
    impressions: api.impressions,
    likes: api.likes,
    comments: api.comments,
    shares: api.shares,
    clicks: api.clicks,
    collectedAt: api.collected_at,
  };
}

export function toPlatformPostAnalytics(api: ApiPlatformPostAnalytics): PlatformPostAnalytics {
  return {
    platformPostId: api.platform_post_id,
    platform: api.platform,
    status: api.status,
    publishedAt: api.published_at,
    postUrl: api.post_url,
    analyticsUnavailableAt: api.analytics_unavailable_at,
    latest: api.latest ? toAnalyticsSnapshot(api.latest) : null,
    history: api.history.map(toAnalyticsSnapshot),
  };
}

export function toPostAnalytics(api: ApiPostAnalytics): PostAnalytics {
  return {
    platformPosts: api.platform_posts.map(toPlatformPostAnalytics),
  };
}
```

---

### F4: Extend `useAnalytics` with `rangeToDates` / `priorWindow` and add `useAnalyticsComparison` + `usePostAnalytics`

**File:** `webapp/src/hooks/useAnalytics.ts`

Replace the entire file:

```typescript
import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import {
  toAnalyticsOverview,
  toPlatformBreakdown,
  toTimeSeriesDataPoint,
} from "@/api/transforms/analytics";
import type {
  ApiAnalyticsOverview,
  ApiPlatformBreakdown,
  ApiTimeSeriesDataPoint,
} from "@/api/types/analytics";
import type {
  AnalyticsOverview,
  PlatformBreakdown,
  TimeSeriesDataPoint,
} from "@/types/analytics";
import { getErrorMessage, isAbortError } from "@/utils/errorHandler";

// ── Date helpers ────────────────────────────────────────────────────────────

export type RangeKey = "7d" | "30d" | "90d";

export interface DateWindow {
  from: string; // ISO date string "YYYY-MM-DD"
  to: string;
}

/**
 * Converts a RangeKey into {from, to} relative to today (UTC).
 * "30d" returns undefined (omit params → backend uses its own default of 30d).
 */
export function rangeToDates(range: RangeKey): DateWindow {
  const to = new Date();
  const from = new Date();
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  from.setUTCDate(from.getUTCDate() - days);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

/**
 * Returns the date window immediately before the given window, of the same
 * length. Used for prior-period delta computation.
 */
export function priorWindow(current: DateWindow): DateWindow {
  const fromDate = new Date(current.from);
  const toDate = new Date(current.to);
  const days = Math.round(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const priorTo = new Date(fromDate);
  priorTo.setUTCDate(priorTo.getUTCDate() - 1);
  const priorFrom = new Date(priorTo);
  priorFrom.setUTCDate(priorFrom.getUTCDate() - days);
  return {
    from: priorFrom.toISOString().slice(0, 10),
    to: priorTo.toISOString().slice(0, 10),
  };
}

// ── useAnalytics ────────────────────────────────────────────────────────────

interface AnalyticsFilters {
  from?: string;
  to?: string;
}

export const useAnalytics = (filters?: AnalyticsFilters) => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [timeseries, setTimeseries] = useState<TimeSeriesDataPoint[]>([]);
  const [platformBreakdown, setPlatformBreakdown] = useState<PlatformBreakdown[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    const query = params.toString();
    return query ? `?${query}` : "";
  }, [filters?.from, filters?.to]);

  const fetchAnalytics = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError(null);
      const query = buildQuery();
      const base = `${import.meta.env.VITE_API_URL}/api/protected/analytics`;
      try {
        const [overviewData, timeseriesData, platformData] = await Promise.all([
          fetcher<ApiAnalyticsOverview>(`${base}/overview${query}`, { method: "GET", signal }),
          fetcher<ApiTimeSeriesDataPoint[]>(`${base}/timeseries${query}`, { method: "GET", signal }),
          fetcher<ApiPlatformBreakdown[]>(`${base}/platforms${query}`, { method: "GET", signal }),
        ]);
        setOverview(toAnalyticsOverview(overviewData));
        setTimeseries(timeseriesData.map(toTimeSeriesDataPoint));
        setPlatformBreakdown(platformData.map(toPlatformBreakdown));
      } catch (err: unknown) {
        if (isAbortError(err)) {
          console.debug("Analytics request aborted.");
        } else {
          setError(getErrorMessage(err));
        }
      } finally {
        setLoading(false);
      }
    },
    [buildQuery],
  );

  const refetch = useCallback(() => {
    const controller = new AbortController();
    fetchAnalytics(controller.signal);
    return () => controller.abort();
  }, [fetchAnalytics]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAnalytics(controller.signal);
    return () => controller.abort();
  }, [fetchAnalytics]);

  return { overview, timeseries, platformBreakdown, loading, error, refetch };
};
```

**New file:** `webapp/src/hooks/useAnalyticsComparison.ts`

```typescript
import { useMemo } from "react";
import { priorWindow, rangeToDates, useAnalytics } from "./useAnalytics";
import type { RangeKey } from "./useAnalytics";

export interface AnalyticsDeltas {
  impressions: number; // current - prior (positive = up)
  likes: number;
  comments: number;
  shares: number;
}

export interface AnalyticsComparisonResult {
  current: ReturnType<typeof useAnalytics>;
  prior: ReturnType<typeof useAnalytics>;
  deltas: AnalyticsDeltas | null; // null while either window is loading
}

/**
 * Calls useAnalytics twice (current window + prior window of the same length)
 * and exposes computed deltas. Doubles request volume but responses are small
 * and independent.
 */
export function useAnalyticsComparison(range: RangeKey): AnalyticsComparisonResult {
  const currentWindow = useMemo(() => rangeToDates(range), [range]);
  const priorWin = useMemo(() => priorWindow(currentWindow), [currentWindow]);

  const current = useAnalytics(currentWindow);
  const prior = useAnalytics(priorWin);

  const deltas = useMemo<AnalyticsDeltas | null>(() => {
    if (!current.overview || !prior.overview) return null;
    return {
      impressions: current.overview.totalImpressions - prior.overview.totalImpressions,
      likes: current.overview.totalLikes - prior.overview.totalLikes,
      comments: current.overview.totalComments - prior.overview.totalComments,
      shares: current.overview.totalShares - prior.overview.totalShares,
    };
  }, [current.overview, prior.overview]);

  return { current, prior, deltas };
}
```

**New file:** `webapp/src/hooks/usePostAnalytics.ts`

```typescript
import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { toPostAnalytics } from "@/api/transforms/analytics";
import type { ApiPostAnalytics } from "@/api/types/analytics";
import type { PostAnalytics } from "@/types/analytics";
import { getErrorMessage, isAbortError } from "@/utils/errorHandler";

export interface UsePostAnalyticsResult {
  data: PostAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePostAnalytics(postId: string): UsePostAnalyticsResult {
  const [data, setData] = useState<PostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const raw = await fetcher<ApiPostAnalytics>(
          `${import.meta.env.VITE_API_URL}/api/protected/posts/${postId}/analytics`,
          { method: "GET", signal },
        );
        setData(toPostAnalytics(raw));
      } catch (err: unknown) {
        if (isAbortError(err)) return;
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [postId],
  );

  const refetch = useCallback(() => {
    const ctrl = new AbortController();
    fetch(ctrl.signal);
    return () => ctrl.abort();
  }, [fetch]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(ctrl.signal);
    return () => ctrl.abort();
  }, [fetch]);

  return { data, loading, error, refetch };
}
```

---

### F5: Recharts chart theme module

**File:** `webapp/src/features/analytics/components/chart-theme.ts`

```typescript
/**
 * chart-theme.ts
 *
 * Reads CSS custom properties at call time so charts respect the active
 * theme. Import getChartColors() at render time, not at module load.
 */

export interface ChartColors {
  primary: string;
  accent: string;
  border: string;
  fg2: string;
  fg3: string;
  bgSurface: string;
}

export function getChartColors(): ChartColors {
  const s = getComputedStyle(document.documentElement);
  const get = (v: string) => s.getPropertyValue(v).trim() || v;
  return {
    primary: get("--color-primary"),
    accent: get("--color-accent"),
    border: get("--color-border"),
    fg2: get("--color-base-content-secondary"),
    fg3: get("--color-base-content-tertiary"),
    bgSurface: get("--color-surface"),
  };
}

// Shared axis / grid props for Recharts — reduces boilerplate in charts.
export const gridProps = {
  strokeDasharray: "0",
  stroke: "var(--color-border)",
  vertical: false,
} as const;

export const xAxisProps = {
  tick: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    textTransform: "uppercase" as const,
    fill: "var(--color-base-content-secondary)",
  },
  axisLine: false,
  tickLine: false,
} as const;

export const yAxisProps = {
  ...xAxisProps,
  width: 48,
} as const;
```

---

### F6: `Sparkline` component

**Files:**
- `webapp/src/features/analytics/components/Sparkline/component.tsx`
- `webapp/src/features/analytics/components/Sparkline/component.module.scss`

```tsx
// component.tsx
import { memo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export interface SparklinePoint {
  value: number;
}

interface SparklineProps {
  data: SparklinePoint[];
  stroke: string;
  height?: number;
  ariaLabel: string;
}

export const Sparkline = memo(function Sparkline({
  data,
  stroke,
  height = 60,
  ariaLabel,
}: SparklineProps) {
  if (data.length === 0) {
    return <div style={{ height }} aria-label={ariaLabel} />;
  }
  return (
    <ResponsiveContainer width="100%" height={height} aria-label={ariaLabel}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sg-${stroke.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={stroke} stopOpacity={0.15} />
            <stop offset="95%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={1.5}
          fill={`url(#sg-${stroke.replace(/[^a-z0-9]/gi, "")})`}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          contentStyle={{ display: "none" }}
          cursor={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

Sparkline.displayName = "Sparkline";
```

```scss
// component.module.scss
// Sparkline has no local SCSS beyond host sizing handled by the parent.
```

---

### F7: `TimeSeriesChart` component

**Files:**
- `webapp/src/features/analytics/components/TimeSeriesChart/component.tsx`
- `webapp/src/features/analytics/components/TimeSeriesChart/component.module.scss`

```tsx
// component.tsx
import { memo, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getChartColors, gridProps, xAxisProps, yAxisProps } from "../chart-theme";
import type { TimeSeriesDataPoint } from "@/types/analytics";
import styles from "./component.module.scss";

export type MetricKey = "impressions" | "likes" | "comments" | "shares";

interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  metric: MetricKey;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipDate}>{label}</span>
      <span className={styles.tooltipValue}>{payload[0].value.toLocaleString()}</span>
    </div>
  );
}

export const TimeSeriesChart = memo(function TimeSeriesChart({
  data,
  metric,
}: TimeSeriesChartProps) {
  const colors = useMemo(() => getChartColors(), []);

  const chartData = useMemo(
    () => data.map((d) => ({ date: d.date.slice(0, 10), value: d[metric] })),
    [data, metric],
  );

  const gradId = `tsc-area-${metric}`;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors.primary} stopOpacity={0.08} />
            <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="date" {...xAxisProps} />
        <YAxis {...yAxisProps} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="none"
          fill={`url(#${gradId})`}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={colors.primary}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

TimeSeriesChart.displayName = "TimeSeriesChart";
```

```scss
// component.module.scss
.tooltip {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.tooltipDate {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-base-content-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tooltipValue {
  font-family: var(--font-serif);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-base-content);
}
```

---

### F8: `DateRangeTabs` component

**Files:**
- `webapp/src/features/analytics/components/DateRangeTabs/component.tsx`
- `webapp/src/features/analytics/components/DateRangeTabs/component.module.scss`

```tsx
// component.tsx
import styles from "./component.module.scss";
import type { RangeKey } from "@/hooks/useAnalytics";

interface DateRangeTabsProps {
  value: RangeKey;
  onChange: (range: RangeKey) => void;
}

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

export function DateRangeTabs({ value, onChange }: DateRangeTabsProps) {
  return (
    <div className={styles.root} role="tablist" aria-label="Date range">
      {RANGES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          className={`${styles.tab} ${value === key ? styles.active : ""}`}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

```scss
// component.module.scss
.root {
  display: inline-flex;
  gap: var(--space-1);
  background: var(--color-base-200);
  border-radius: var(--radius-full);
  padding: var(--space-1);
}

.tab {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  font-size: var(--font-size-sm);
  font-family: var(--font-mono);
  color: var(--color-base-content-secondary);
  cursor: pointer;
  transition: background var(--duration-fast), color var(--duration-fast);

  &:hover {
    color: var(--color-base-content);
  }
}

.active {
  background: var(--color-surface);
  color: var(--color-base-content);
  font-weight: var(--font-weight-medium);
  box-shadow: var(--shadow-xs);
}
```

---

### F9: `MetricSelector` component

**Files:**
- `webapp/src/features/analytics/components/MetricSelector/component.tsx`
- `webapp/src/features/analytics/components/MetricSelector/component.module.scss`

```tsx
// component.tsx
import styles from "./component.module.scss";
import type { MetricKey } from "../TimeSeriesChart/component";

interface MetricSelectorProps {
  value: MetricKey;
  onChange: (metric: MetricKey) => void;
}

const METRICS: { key: MetricKey; label: string }[] = [
  { key: "impressions", label: "Impressions" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
];

export function MetricSelector({ value, onChange }: MetricSelectorProps) {
  return (
    <div className={styles.root} role="tablist" aria-label="Select metric">
      {METRICS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          className={`${styles.tab} ${value === key ? styles.active : ""}`}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

```scss
// component.module.scss — same pill style as DateRangeTabs
.root {
  display: inline-flex;
  gap: var(--space-1);
  background: var(--color-base-200);
  border-radius: var(--radius-full);
  padding: var(--space-1);
}

.tab {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  font-size: var(--font-size-sm);
  font-family: var(--font-mono);
  color: var(--color-base-content-secondary);
  cursor: pointer;
  transition: background var(--duration-fast), color var(--duration-fast);

  &:hover { color: var(--color-base-content); }
}

.active {
  background: var(--color-surface);
  color: var(--color-base-content);
  font-weight: var(--font-weight-medium);
  box-shadow: var(--shadow-xs);
}
```

---

## Phase 4 — Frontend: Surface A — `/analytics` Page

### F10: Refactor `AnalyticsPage` component

**File:** `webapp/src/features/analytics/components/AnalyticsPage/component.tsx`

Replace the entire file:

```tsx
/**
 * AnalyticsPage — enhanced with date-range tabs, trend chips, time-series
 * chart, and .tbl-style platform breakdown table.
 */

import { BarChart2, Eye, Heart, MessageCircle, RefreshCw, Share2 } from "lucide-react";
import { memo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Topbar } from "@/components/Layout/Topbar";
import { useAnalyticsComparison } from "@/hooks/useAnalyticsComparison";
import type { RangeKey } from "@/hooks/useAnalytics";
import { rangeToDates } from "@/hooks/useAnalytics";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { StatCard } from "@/proto-design-system/components/data/StatCard";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Skeleton } from "@/proto-design-system/components/primitives/Skeleton";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { PlatformType } from "@/types/platform";
import { PLATFORM_DISPLAY_NAMES } from "@/types/platform";
import { DateRangeTabs } from "../DateRangeTabs/component";
import { MetricSelector } from "../MetricSelector/component";
import { TimeSeriesChart } from "../TimeSeriesChart/component";
import type { MetricKey } from "../TimeSeriesChart/component";
import pageStyles from "@/routes/page.module.scss";
import styles from "./component.module.scss";

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function getPlatformLabel(platform: string): string {
  return PLATFORM_DISPLAY_NAMES[platform as PlatformType] ?? platform;
}

function TrendChip({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const dir = delta > 0 ? "up" : delta < 0 ? "down" : "neutral";
  const label = delta > 0 ? `+${formatNumber(delta)}` : formatNumber(delta);
  return (
    <span className={`${styles.trendChip} ${styles[`trendChip--${dir}`]}`} aria-label={`Trend: ${label}`}>
      {label}
    </span>
  );
}

function StatGridSkeleton() {
  return (
    <div className={styles.statsGrid}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={styles.skCard}>
          <Skeleton height={12} width="50%" />
          <Skeleton height={32} width="70%" />
          <Skeleton height={12} width="40%" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <Skeleton height={280} />;
}

const VALID_RANGES: RangeKey[] = ["7d", "30d", "90d"];

export const AnalyticsPage = memo(function AnalyticsPage() {
  // Range synced to ?range= search param. Default 30d (omits param).
  const search = useSearch({ from: "/analytics" }) as { range?: string };
  const navigate = useNavigate();
  const range: RangeKey =
    VALID_RANGES.includes(search.range as RangeKey)
      ? (search.range as RangeKey)
      : "30d";

  const [metric, setMetric] = useState<MetricKey>("impressions");

  const window = rangeToDates(range);
  const { current, deltas } = useAnalyticsComparison(range);
  const { overview, timeseries, platformBreakdown, loading, error, refetch } = current;

  function handleRangeChange(next: RangeKey) {
    navigate({
      to: "/analytics",
      search: next === "30d" ? {} : { range: next },
      replace: true,
    });
  }

  const topbar = <Topbar title="Analytics" />;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        {topbar}
        <Stack gap="lg" className={styles.page} animate>
          <header className={pageStyles.pageHero}>
            <div className={pageStyles.pageHeroText}>
              <div className={pageStyles.pageEyebrow}>PERFORMANCE · loading</div>
              <h1 className={pageStyles.pageHeroTitle}>
                The numbers, <em>without the noise</em>.
              </h1>
            </div>
          </header>
          <DateRangeTabs value={range} onChange={handleRangeChange} />
          <StatGridSkeleton />
          <ChartSkeleton />
        </Stack>
      </>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <>
        {topbar}
        <Stack gap="lg" className={styles.page} animate>
          <Card variant="outlined" padding="lg">
            <Stack gap="md" align="center">
              <Text weight="semibold">Something went wrong</Text>
              <Text color="muted" size="sm">{error}</Text>
              <Button variant="secondary" leftIcon={<RefreshCw size={16} />} onClick={refetch}>
                Retry
              </Button>
            </Stack>
          </Card>
        </Stack>
      </>
    );
  }

  // ── Empty — no connected platforms ────────────────────────────────────────
  const isNoPlatforms =
    platformBreakdown.length === 0 &&
    overview !== null &&
    overview.totalImpressions === 0 &&
    overview.totalLikes === 0;

  if (!overview || isNoPlatforms) {
    return (
      <>
        {topbar}
        <Stack gap="lg" className={styles.page} animate>
          <DateRangeTabs value={range} onChange={handleRangeChange} />
          <EmptyState
            icon={<BarChart2 size={48} />}
            title="No platforms connected"
            description="Connect your social platforms and start publishing to see analytics here."
            action={
              <Button variant="primary" onClick={() => navigate({ to: "/account", search: { tab: "platforms" } })}>
                Connect platforms
              </Button>
            }
          />
        </Stack>
      </>
    );
  }

  // ── Empty — connected but no data in range ────────────────────────────────
  if (timeseries.length === 0 && platformBreakdown.length === 0) {
    return (
      <>
        {topbar}
        <Stack gap="lg" className={styles.page} animate>
          <DateRangeTabs value={range} onChange={handleRangeChange} />
          <EmptyState
            icon={<BarChart2 size={48} />}
            title="No data for this range"
            description="There is no activity recorded in this time window."
            action={
              <Button variant="ghost" onClick={() => handleRangeChange("30d")}>
                Switch to 30 days
              </Button>
            }
          />
        </Stack>
      </>
    );
  }

  // ── Happy path ─────────────────────────────────────────────────────────────
  return (
    <>
      {topbar}
      <Stack gap="lg" className={styles.page} animate>
        <header className={pageStyles.pageHero}>
          <div className={pageStyles.pageHeroText}>
            <div className={pageStyles.pageEyebrow}>
              PERFORMANCE · {platformBreakdown.length}{" "}
              {platformBreakdown.length === 1 ? "platform" : "platforms"}
            </div>
            <h1 className={pageStyles.pageHeroTitle}>
              The numbers, <em>without the noise</em>.
            </h1>
            <p className={pageStyles.pageHeroSub}>
              Impressions, engagement, and reach across every connected platform — at a glance.
            </p>
          </div>
        </header>

        <DateRangeTabs value={range} onChange={handleRangeChange} />

        <div className={styles.statsGrid}>
          <StatCard
            label="Impressions"
            value={formatNumber(overview.totalImpressions)}
            numericValue={overview.totalImpressions}
            formatValue={formatNumber}
            icon={<Eye size={18} />}
            variant="outlined"
            footer={<TrendChip delta={deltas?.impressions ?? null} />}
          />
          <StatCard
            label="Likes"
            value={formatNumber(overview.totalLikes)}
            numericValue={overview.totalLikes}
            formatValue={formatNumber}
            icon={<Heart size={18} />}
            variant="outlined"
            footer={<TrendChip delta={deltas?.likes ?? null} />}
          />
          <StatCard
            label="Comments"
            value={formatNumber(overview.totalComments)}
            numericValue={overview.totalComments}
            formatValue={formatNumber}
            icon={<MessageCircle size={18} />}
            variant="outlined"
            footer={<TrendChip delta={deltas?.comments ?? null} />}
          />
          <StatCard
            label="Shares"
            value={formatNumber(overview.totalShares)}
            numericValue={overview.totalShares}
            formatValue={formatNumber}
            icon={<Share2 size={18} />}
            variant="outlined"
            footer={<TrendChip delta={deltas?.shares ?? null} />}
          />
        </div>

        {timeseries.length > 0 && (
          <Card variant="outlined" padding="md">
            <Stack gap="md">
              <Stack direction="row" justify="between" align="center">
                <span className={styles.chartEyebrow}>ENGAGEMENT OVER TIME</span>
                <MetricSelector value={metric} onChange={setMetric} />
              </Stack>
              <TimeSeriesChart data={timeseries} metric={metric} />
            </Stack>
          </Card>
        )}

        {platformBreakdown.length > 0 && (
          <Card variant="outlined" padding="md">
            <Stack gap="md">
              <Text as="h3" size="lg" weight="semibold">Platform Breakdown</Text>
              <div className={styles.tableWrapper}>
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Impressions</th>
                      <th>Likes</th>
                      <th>Comments</th>
                      <th>Shares</th>
                      <th>Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformBreakdown.map((row) => (
                      <tr key={row.platform}>
                        <td>{getPlatformLabel(row.platform)}</td>
                        <td>{row.impressions.toLocaleString()}</td>
                        <td>{row.likes.toLocaleString()}</td>
                        <td>{row.comments.toLocaleString()}</td>
                        <td>{row.shares.toLocaleString()}</td>
                        <td>{row.clicks.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Stack>
          </Card>
        )}
      </Stack>
    </>
  );
});

AnalyticsPage.displayName = "AnalyticsPage";
```

**File:** `webapp/src/features/analytics/components/AnalyticsPage/component.module.scss`

Replace the entire file:

```scss
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-9);
  max-width: var(--max-width-7xl);
  padding: var(--space-9) var(--space-9) var(--space-12);
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.skCard {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  min-height: 96px;
}

.chartEyebrow {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-base-content-secondary);
}

.tableWrapper {
  overflow-x: auto;
}

.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);

  th {
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-base-content-secondary);
    font-weight: var(--font-weight-medium);
    padding: var(--space-2) var(--space-4);
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }

  td {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    border-bottom: 1px solid var(--color-border);
    font-variant-numeric: tabular-nums;
    color: var(--color-base-content);
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover {
    background: var(--color-base-200);
  }
}

// ── Trend chips ────────────────────────────────────────────────────────────

.trendChip {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-weight: var(--font-weight-medium);
}

.trendChip--up {
  background: color-mix(in srgb, var(--color-success) 12%, transparent);
  color: var(--color-success);
}

.trendChip--down {
  background: color-mix(in srgb, var(--color-error) 12%, transparent);
  color: var(--color-error);
}

.trendChip--neutral {
  background: var(--color-base-200);
  color: var(--color-base-content-secondary);
}
```

Note: `StatCard` accepts a `footer` prop — if the existing `StatCard` component does not have a `footer` prop, add it. Check `webapp/src/proto-design-system/components/data/StatCard/` first; if `footer` is absent, add `footer?: ReactNode` to the props interface and render it below the value. The plan agent must inspect this file before writing it.

Run: `cd webapp && npm run build`

---

## Phase 5 — Frontend: Surface B — `/posts/$id/analytics` Page

### F11: `PlatformPostAnalyticsCard` component

**Files:**
- `webapp/src/features/posts/components/PlatformPostAnalyticsCard/component.tsx`
- `webapp/src/features/posts/components/PlatformPostAnalyticsCard/component.module.scss`

```tsx
// component.tsx
import { ExternalLink } from "lucide-react";
import { Tooltip } from "@/proto-design-system/components/overlays/Tooltip";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { PlatformPostAnalytics } from "@/types/analytics";
import { PLATFORM_DISPLAY_NAMES } from "@/types/platform";
import type { PlatformType } from "@/types/platform";
import { Sparkline } from "@/features/analytics/components/Sparkline/component";
import styles from "./component.module.scss";

interface PlatformPostAnalyticsCardProps {
  pp: PlatformPostAnalytics;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function PlatformPostAnalyticsCard({ pp }: PlatformPostAnalyticsCardProps) {
  const platformLabel =
    PLATFORM_DISPLAY_NAMES[pp.platform as PlatformType] ?? pp.platform;

  const isUnavailable = pp.analyticsUnavailableAt !== null;

  const sparkData = pp.history.map((h) => ({ value: h.impressions }));

  const lastCollected = pp.latest?.collectedAt
    ? formatDate(pp.latest.collectedAt)
    : null;

  return (
    <Card variant="outlined" padding="md">
      {/* Header row */}
      <Stack direction="row" justify="between" align="center" className={styles.header}>
        <Stack direction="row" gap="sm" align="center">
          <Badge variant="default">{platformLabel}</Badge>
          {pp.publishedAt && (
            <span className={styles.mono}>{formatDate(pp.publishedAt)}</span>
          )}
        </Stack>
        <Stack direction="row" gap="sm" align="center">
          {isUnavailable && (
            <Badge variant="warning">Analytics unavailable</Badge>
          )}
          {pp.postUrl && (
            <a
              href={pp.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.externalLink}
              aria-label={`Open on ${platformLabel}`}
            >
              <ExternalLink size={16} />
            </a>
          )}
        </Stack>
      </Stack>

      {/* Unavailable branch */}
      {isUnavailable ? (
        <Stack gap="sm" className={styles.unavailableBody}>
          <Tooltip
            content={`This post is no longer reachable on ${platformLabel}. Metrics stopped updating on ${formatDate(pp.analyticsUnavailableAt!)}.`}
          >
            <span className={styles.unavailableHint}>Why is this unavailable?</span>
          </Tooltip>
          {pp.latest && (
            <div className={`${styles.kpiGrid} ${styles.kpiGridFaded}`}>
              <KpiCell label="Impressions" value={pp.latest.impressions} />
              <KpiCell label="Likes" value={pp.latest.likes} />
              <KpiCell label="Comments" value={pp.latest.comments} />
              <KpiCell label="Shares" value={pp.latest.shares} />
            </div>
          )}
        </Stack>
      ) : (
        /* Live branch */
        <Stack gap="md" className={styles.liveBody}>
          <div className={styles.kpiGrid}>
            <KpiCell label="Impressions" value={pp.latest?.impressions ?? 0} />
            <KpiCell label="Likes" value={pp.latest?.likes ?? 0} />
            <KpiCell label="Comments" value={pp.latest?.comments ?? 0} />
            <KpiCell label="Shares" value={pp.latest?.shares ?? 0} />
          </div>
          {sparkData.length > 0 && (
            <Sparkline
              data={sparkData}
              stroke="var(--color-primary)"
              height={80}
              ariaLabel={`Impressions over time for ${platformLabel}`}
            />
          )}
          {lastCollected && (
            <span className={styles.updatedCaption}>
              Updated {lastCollected}
            </span>
          )}
        </Stack>
      )}
    </Card>
  );
}

function KpiCell({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.kpiCell}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{formatNum(value)}</span>
    </div>
  );
}
```

```scss
// component.module.scss
.header {
  margin-bottom: var(--space-4);
}

.mono {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-base-content-secondary);
}

.externalLink {
  display: flex;
  align-items: center;
  color: var(--color-base-content-secondary);
  transition: color var(--duration-fast);

  &:hover {
    color: var(--color-primary);
  }
}

.kpiGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.kpiGridFaded {
  opacity: 0.5;
}

.kpiCell {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.kpiLabel {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-base-content-secondary);
}

.kpiValue {
  font-family: var(--font-serif);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-base-content);
}

.unavailableBody,
.liveBody {
  margin-top: var(--space-3);
}

.unavailableHint {
  font-size: var(--font-size-sm);
  color: var(--color-base-content-secondary);
  cursor: help;
  text-decoration: underline dotted;
}

.updatedCaption {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-base-content-tertiary);
}
```

---

### F12: `PostAnalyticsPage` component

**Files:**
- `webapp/src/features/posts/components/PostAnalyticsPage/component.tsx`
- `webapp/src/features/posts/components/PostAnalyticsPage/component.module.scss`

```tsx
// component.tsx
import { PenSquare, RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePostAnalytics } from "@/hooks/usePostAnalytics";
import { Breadcrumb } from "@/proto-design-system/components/navigation/Breadcrumb";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Skeleton } from "@/proto-design-system/components/primitives/Skeleton";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { PlatformPostAnalyticsCard } from "../PlatformPostAnalyticsCard/component";
import styles from "./component.module.scss";

interface PostAnalyticsPageProps {
  postId: string;
  /** Excerpt of the post body (40 chars max) for breadcrumb. */
  postExcerpt?: string;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

export function PostAnalyticsPage({ postId, postExcerpt }: PostAnalyticsPageProps) {
  const { data, loading, error, refetch } = usePostAnalytics(postId);

  const breadcrumbLabel = postExcerpt
    ? truncate(postExcerpt, 40)
    : "Post";

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Stack gap="lg" className={styles.page} animate>
        <Stack direction="row" gap="sm" align="center">
          <Breadcrumb
            size="lg"
            items={[
              { label: "Posts", href: "/posts", icon: <PenSquare size={18} /> },
              { label: breadcrumbLabel, href: `/posts/${postId}` },
              { label: "Analytics" },
            ]}
          />
        </Stack>
        <Divider />
        <Skeleton height={80} />
        <Skeleton height={160} />
        <Skeleton height={160} />
      </Stack>
    );
  }

  // ── 404 ───────────────────────────────────────────────────────────────────
  if (error?.includes("404") || error?.includes("not found")) {
    return (
      <Stack gap="lg" className={styles.page} animate>
        <Stack direction="row" gap="sm" align="center">
          <Breadcrumb
            size="lg"
            items={[
              { label: "Posts", href: "/posts", icon: <PenSquare size={18} /> },
              { label: "Analytics" },
            ]}
          />
        </Stack>
        <Divider />
        <Card variant="outlined" padding="lg">
          <Stack gap="md" align="center">
            <Text weight="semibold">Post not found.</Text>
            <Link to="/posts">
              <Button variant="secondary">Back to Posts</Button>
            </Link>
          </Stack>
        </Card>
      </Stack>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Stack gap="lg" className={styles.page} animate>
        <Stack direction="row" gap="sm" align="center">
          <Breadcrumb
            size="lg"
            items={[
              { label: "Posts", href: "/posts", icon: <PenSquare size={18} /> },
              { label: "Analytics" },
            ]}
          />
        </Stack>
        <Divider />
        <Card variant="outlined" padding="lg">
          <Stack gap="md" align="center">
            <Text weight="semibold">Something went wrong</Text>
            <Button variant="secondary" leftIcon={<RefreshCw size={16} />} onClick={refetch}>
              Retry
            </Button>
          </Stack>
        </Card>
      </Stack>
    );
  }

  // ── Empty — no platform posts ─────────────────────────────────────────────
  if (!data || data.platformPosts.length === 0) {
    return (
      <Stack gap="lg" className={styles.page} animate>
        <Stack direction="row" gap="sm" align="center">
          <Breadcrumb
            size="lg"
            items={[
              { label: "Posts", href: "/posts", icon: <PenSquare size={18} /> },
              { label: breadcrumbLabel, href: `/posts/${postId}`, title: postExcerpt },
              { label: "Analytics" },
            ]}
          />
        </Stack>
        <Divider />
        <EmptyState
          title="No analytics yet"
          description="This post isn't published yet. Analytics will appear here once it goes live."
          icon={<PenSquare size={48} />}
        />
      </Stack>
    );
  }

  // ── Happy path ─────────────────────────────────────────────────────────────
  return (
    <Stack gap="lg" className={styles.page} animate>
      <Stack direction="row" gap="sm" align="center">
        <Breadcrumb
          size="lg"
          items={[
            { label: "Posts", href: "/posts", icon: <PenSquare size={18} /> },
            {
              label: breadcrumbLabel,
              href: `/posts/${postId}`,
              title: postExcerpt,
            },
            { label: "Analytics" },
          ]}
        />
      </Stack>
      <Divider />

      <Stack gap="md">
        {data.platformPosts.map((pp) => (
          <PlatformPostAnalyticsCard key={pp.platformPostId} pp={pp} />
        ))}
      </Stack>
    </Stack>
  );
}
```

```scss
// component.module.scss
.page {
  padding: var(--space-5);
  max-width: var(--max-width-4xl);
}
```

---

### F13: Route file for `/posts/$id/analytics`

**File:** `webapp/src/routes/posts.$id.analytics.tsx`

```tsx
import { createFileRoute, useParams } from "@tanstack/react-router";
import { PostAnalyticsPage } from "@/features/posts/components/PostAnalyticsPage/component";

export const Route = createFileRoute("/posts/$id/analytics")({
  component: PostAnalyticsRoute,
});

function PostAnalyticsRoute() {
  const { id } = useParams({ from: "/posts/$id/analytics" });
  return <PostAnalyticsPage postId={id} />;
}
```

---

### F14: Add analytics button to posts list

**File:** `webapp/src/routes/posts.tsx`

Find the existing post row render block (around line 227, inside the `posts.map(...)` callback). In the `metaRow` div, after the existing `statusBadge` span and before the `chevronBtn` span, add:

```tsx
{post.status === "published" && (
  <Link
    to="/posts/$id/analytics"
    params={{ id: post.id }}
    onClick={(e) => e.stopPropagation()}
    className={styles.analyticsBtn}
    aria-label={`View analytics for "${truncate(post.title || post.content, 40)}"`}
  >
    <BarChart2 size={16} />
  </Link>
)}
```

Also add the `BarChart2` import to the top of the file (it is already imported in `index.tsx`; check if it is present in `posts.tsx` — if not, add it to the existing lucide imports):

```tsx
import { BarChart2, ChevronRight, FileText, Plus, SearchX, Trash2 } from "lucide-react";
```

Add to `posts.module.scss`:

```scss
.analyticsBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--space-7);
  height: var(--space-7);
  border-radius: var(--radius-sm);
  color: var(--color-base-content-secondary);
  transition: color var(--duration-fast), background var(--duration-fast);
  text-decoration: none;

  &:hover {
    color: var(--color-primary);
    background: var(--color-base-200);
  }
}
```

---

## Phase 6 — Frontend: Surface C — Dashboard Widget

### F15: `LastSevenDaysSection` component

**Files:**
- `webapp/src/features/analytics/components/LastSevenDaysSection/component.tsx`
- `webapp/src/features/analytics/components/LastSevenDaysSection/component.module.scss`

```tsx
// component.tsx
import { Link } from "@tanstack/react-router";
import { useAnalyticsComparison } from "@/hooks/useAnalyticsComparison";
import { Skeleton } from "@/proto-design-system/components/primitives/Skeleton";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { Sparkline } from "../Sparkline/component";
import styles from "./component.module.scss";

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function TrendChip({ delta }: { delta: number }) {
  const dir = delta > 0 ? "up" : delta < 0 ? "down" : "neutral";
  const prefix = delta > 0 ? "+" : "";
  return (
    <span className={`${styles.trendChip} ${styles[`trendChip--${dir}`]}`}>
      {prefix}{formatNumber(delta)} vs prior 7d
    </span>
  );
}

export function LastSevenDaysSection() {
  const { current, deltas } = useAnalyticsComparison("7d");
  const { overview, timeseries, loading, error } = current;

  // Silently hide on error — dashboard should never break for this widget.
  if (error) return null;

  // Hide when all data is zero (permanently-empty S-3.3 pattern).
  if (!loading && overview && overview.totalImpressions === 0 && overview.totalLikes === 0) {
    return null;
  }

  if (loading) {
    return (
      <Stack gap="md">
        <div className={styles.eyebrow}>LAST 7 DAYS · PERFORMANCE</div>
        <h2 className={styles.heading}>
          Momentum <em>at a glance</em>.
        </h2>
        <div className={styles.grid}>
          <Skeleton height={120} />
          <Skeleton height={120} />
        </div>
      </Stack>
    );
  }

  if (!overview) return null;

  const engagements =
    overview.totalLikes + overview.totalComments + overview.totalShares;

  const impressionSpark = timeseries.map((d) => ({ value: d.impressions }));
  const engagementSpark = timeseries.map((d) => ({
    value: d.likes + d.comments + d.shares,
  }));

  return (
    <Stack gap="md">
      <div className={styles.eyebrow}>LAST 7 DAYS · PERFORMANCE</div>
      <Stack direction="row" justify="between" align="end">
        <h2 className={styles.heading}>
          Momentum <em>at a glance</em>.
        </h2>
        <Link to="/analytics" search={{ range: "7d" }} className={styles.viewAll}>
          View analytics →
        </Link>
      </Stack>
      <div className={styles.grid}>
        {/* Impressions card */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>IMPRESSIONS</div>
          <div className={styles.cardValue}>{formatNumber(overview.totalImpressions)}</div>
          {impressionSpark.length > 0 && (
            <Sparkline
              data={impressionSpark}
              stroke="var(--color-primary)"
              height={60}
              ariaLabel="Impressions sparkline for last 7 days"
            />
          )}
          {deltas !== null && <TrendChip delta={deltas.impressions} />}
        </div>
        {/* Engagements card */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>ENGAGEMENTS</div>
          <div className={styles.cardValue}>{formatNumber(engagements)}</div>
          {engagementSpark.length > 0 && (
            <Sparkline
              data={engagementSpark}
              stroke="var(--color-accent)"
              height={60}
              ariaLabel="Engagements sparkline for last 7 days"
            />
          )}
          {deltas !== null && (
            <TrendChip
              delta={
                deltas.likes + deltas.comments + deltas.shares
              }
            />
          )}
        </div>
      </div>
    </Stack>
  );
}
```

```scss
// component.module.scss
.eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-base-content-secondary);
}

.heading {
  font-family: var(--font-serif);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-base-content);
  margin: 0;

  em {
    font-style: italic;
  }
}

.viewAll {
  font-size: var(--font-size-sm);
  color: var(--color-base-content-secondary);
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    color: var(--color-primary);
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.cardLabel {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-base-content-secondary);
}

.cardValue {
  font-family: var(--font-serif);
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-base-content);
  line-height: 1;
}

.trendChip {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-weight: var(--font-weight-medium);
  align-self: flex-start;
}

.trendChip--up {
  background: color-mix(in srgb, var(--color-success) 12%, transparent);
  color: var(--color-success);
}

.trendChip--down {
  background: color-mix(in srgb, var(--color-error) 12%, transparent);
  color: var(--color-error);
}

.trendChip--neutral {
  background: var(--color-base-200);
  color: var(--color-base-content-secondary);
}
```

---

### F16: Insert `LastSevenDaysSection` into dashboard

**File:** `webapp/src/routes/index.tsx`

Add import at top:

```tsx
import { LastSevenDaysSection } from "@/features/analytics/components/LastSevenDaysSection/component";
```

In the `Index` function, between the closing `</header>` tag and the `<Stack gap="xs">` that wraps Quick Access, insert:

```tsx
<LastSevenDaysSection />
```

Run: `cd webapp && npm run build`

---

## Phase 7 — Frontend: Playwright E2E Tests

### F17: Extend MSW mock data with post analytics fixture

**File:** `webapp/e2e/mocks/data/index.ts`

Add at the end, after the existing exports:

```typescript
import type { ApiPostAnalytics } from "../../../src/api/types/analytics";

export const postAnalyticsWithTwoPlatforms: ApiPostAnalytics = {
  platform_posts: [
    {
      platform_post_id: "pp-x-001",
      platform: "x",
      status: "published",
      published_at: "2026-04-18T10:22:00Z",
      post_url: "https://x.com/i/web/status/1234567890",
      analytics_unavailable_at: null,
      latest: {
        impressions: 1240,
        likes: 48,
        comments: 3,
        shares: 7,
        clicks: 12,
        collected_at: "2026-04-19T14:00:00Z",
      },
      history: [
        {
          impressions: 800,
          likes: 30,
          comments: 1,
          shares: 4,
          clicks: 8,
          collected_at: "2026-04-18T11:00:00Z",
        },
        {
          impressions: 1240,
          likes: 48,
          comments: 3,
          shares: 7,
          clicks: 12,
          collected_at: "2026-04-19T14:00:00Z",
        },
      ],
    },
    {
      platform_post_id: "pp-li-001",
      platform: "linkedin",
      status: "published",
      published_at: "2026-04-18T10:22:00Z",
      post_url: null,
      analytics_unavailable_at: "2026-04-19T09:00:00Z",
      latest: {
        impressions: 320,
        likes: 12,
        comments: 1,
        shares: 2,
        clicks: 5,
        collected_at: "2026-04-19T08:00:00Z",
      },
      history: [],
    },
  ],
};

export const postAnalyticsEmpty: ApiPostAnalytics = {
  platform_posts: [],
};
```

---

### F18: Extend `analytics.handlers.ts` with post analytics scenario

**File:** `webapp/e2e/handlers/analytics.handlers.ts`

Replace the entire file:

```typescript
/**
 * Analytics API handlers
 */
import { HttpResponse, http } from "msw";
import { setupEndpoint } from "../helpers/endpoint";
import {
  analyticsOverview,
  analyticsTimeseries,
  platformBreakdown,
  postAnalyticsWithTwoPlatforms,
  postAnalyticsEmpty,
} from "../mocks/data";

export const analyticsEndpoints = {
  overview: setupEndpoint(
    "GET",
    "*/api/protected/analytics/overview",
    analyticsOverview,
  ),
  timeseries: setupEndpoint(
    "GET",
    "*/api/protected/analytics/timeseries",
    analyticsTimeseries,
  ),
  platforms: setupEndpoint(
    "GET",
    "*/api/protected/analytics/platforms",
    platformBreakdown,
  ),
};

export const postAnalyticsEndpoint = setupEndpoint(
  "GET",
  "*/api/protected/posts/:id/analytics",
  postAnalyticsWithTwoPlatforms,
);

export const analyticsHandlers = Object.values(analyticsEndpoints).map((e) =>
  e[200](),
);

export const analyticsScenarios = {
  /** No analytics data — every endpoint returns an empty/null body. */
  empty: () => [
    http.get("*/api/protected/analytics/overview", () =>
      HttpResponse.json(null),
    ),
    http.get("*/api/protected/analytics/timeseries", () =>
      HttpResponse.json([]),
    ),
    http.get("*/api/protected/analytics/platforms", () =>
      HttpResponse.json([]),
    ),
  ],
  /** Zero overview totals — simulates connected but no-data-in-range. */
  zeroTotals: () => [
    http.get("*/api/protected/analytics/overview", () =>
      HttpResponse.json({
        total_impressions: 0,
        total_likes: 0,
        total_comments: 0,
        total_shares: 0,
        total_clicks: 0,
        engagement_rate: 0,
      }),
    ),
    http.get("*/api/protected/analytics/timeseries", () =>
      HttpResponse.json([]),
    ),
    http.get("*/api/protected/analytics/platforms", () =>
      HttpResponse.json([]),
    ),
  ],
  postAnalyticsEmpty: () => [
    postAnalyticsEndpoint[200](),
    http.get("*/api/protected/posts/:id/analytics", () =>
      HttpResponse.json(postAnalyticsEmpty),
    ),
  ],
};
```

---

### F19: Add `postAnalyticsEndpoint` to `handlers/index.ts`

**File:** `webapp/e2e/handlers/index.ts`

Read the existing file, then add the `postAnalyticsEndpoint[200]()` call to the exported default handlers array. The exact change depends on the current content of the file; the agent must read it first, then insert `postAnalyticsEndpoint[200]()` from the import `{ postAnalyticsEndpoint } from "./analytics.handlers"` into the handlers array so the default MSW worker registers the handler.

---

### F20: Extend `analytics.spec.ts` with new `/analytics` scenarios

**File:** `webapp/e2e/analytics.spec.ts`

Add the following test suites after the existing `test.describe("Status Code Coverage — GET /analytics/platforms")` block:

```typescript
// =========================================================================
// Date-range tabs
// =========================================================================

test.describe("Date range tabs", () => {
  test("renders date-range tab controls", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("tab", { name: "7 days" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "30 days" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "90 days" })).toBeVisible();
  });

  test("switching to 7d updates URL search param", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    await page.getByRole("tab", { name: "7 days" }).click();
    await expect(page).toHaveURL(/range=7d/);
  });

  test("30d range omits query param", async ({ page }) => {
    await page.goto("/analytics?range=7d");
    await page.waitForLoadState("networkidle");

    await page.getByRole("tab", { name: "30 days" }).click();
    // URL should NOT contain ?range= when 30d is selected
    const url = page.url();
    expect(url).not.toMatch(/range=/);
  });
});

// =========================================================================
// Time-series chart
// =========================================================================

test.describe("Time-series chart", () => {
  test("renders chart section when timeseries data present", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/ENGAGEMENT OVER TIME/i)).toBeVisible();
  });

  test("metric selector buttons are visible", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("tab", { name: "Impressions" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Likes" })).toBeVisible();
  });
});

// =========================================================================
// Empty states
// =========================================================================

test.describe("Empty states — no connected platforms", () => {
  test("shows connect platforms CTA when overview totals are zero and no platforms", async ({
    network,
    page,
  }) => {
    network.use(
      ...analyticsScenarios.empty(),
    );

    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/no platforms connected/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /connect platforms/i })).toBeVisible();
  });
});

test.describe("Empty states — connected but no data in range", () => {
  test("shows switch-to-30d ghost action when timeseries is empty", async ({
    network,
    page,
  }) => {
    network.use(...analyticsScenarios.zeroTotals());

    await page.goto("/analytics?range=7d");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/no data for this range/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /switch to 30 days/i })).toBeVisible();
  });
});
```

Also add the `analyticsScenarios` import at the top if not already present:

```typescript
import { analyticsScenarios } from "./handlers/analytics.handlers";
```

---

### F21: New Playwright spec for `/posts/$id/analytics`

**File:** `webapp/e2e/post-analytics.spec.ts`

```typescript
/**
 * Post Analytics E2E Tests
 *
 * Tests for the /posts/$id/analytics route.
 *
 * Endpoint coverage:
 *   GET /api/protected/posts/:id/analytics → 200, 401, 404, 500
 */

import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import {
  postAnalyticsEndpoint,
  analyticsScenarios,
} from "./handlers/analytics.handlers";
import {
  postAnalyticsWithTwoPlatforms,
  postAnalyticsEmpty,
} from "./mocks/data";

const TEST_POST_ID = "post_test_123";
const ANALYTICS_URL = `/posts/${TEST_POST_ID}/analytics`;

// ── Status-code table ────────────────────────────────────────────────────────

const statusCases = [
  {
    status: 401 as const,
    body: { error: "Unauthorized", code: "UNAUTHORIZED" },
    label: "unauthorized — missing session",
  },
  {
    status: 404 as const,
    body: { error: "Post not found", code: "NOT_FOUND" },
    label: "post not found",
  },
  {
    status: 500 as const,
    body: {
      error: "An internal error occurred. Please try again later.",
      code: "INTERNAL_ERROR",
    },
    label: "internal server error",
  },
];

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Post Analytics Page", () => {
  // =========================================================================
  // 200 — live platform posts
  // =========================================================================

  test.describe("200 — two platform posts (one live, one unavailable)", () => {
    test("renders breadcrumb", async ({ page }) => {
      await page.goto(ANALYTICS_URL);
      await page.waitForLoadState("networkidle");

      await expect(page.getByText("Posts")).toBeVisible();
      await expect(page.getByText("Analytics")).toBeVisible();
    });

    test("renders live platform card with KPIs", async ({ page }) => {
      await page.goto(ANALYTICS_URL);
      await page.waitForLoadState("networkidle");

      // X card should show impressions
      const content = await page.textContent("body");
      expect(content).toMatch(/1[,.]?240|1\.2K/);
    });

    test("renders analytics-unavailable badge for marked platform post", async ({
      page,
    }) => {
      await page.goto(ANALYTICS_URL);
      await page.waitForLoadState("networkidle");

      await expect(page.getByText(/analytics unavailable/i)).toBeVisible();
    });

    test("renders external link for post_url when present", async ({ page }) => {
      await page.goto(ANALYTICS_URL);
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByRole("link", { name: /open on x/i }),
      ).toBeVisible();
    });
  });

  // =========================================================================
  // 200 — empty platform_posts
  // =========================================================================

  test.describe("200 — empty platform posts", () => {
    test("shows not-published empty state", async ({ network, page }) => {
      network.use(
        http.get("*/api/protected/posts/:id/analytics", () =>
          HttpResponse.json(postAnalyticsEmpty),
        ),
      );

      await page.goto(ANALYTICS_URL);
      await page.waitForLoadState("networkidle");

      await expect(page.getByText(/no analytics yet/i)).toBeVisible();
    });
  });

  // =========================================================================
  // Status code coverage
  // =========================================================================

  test.describe("Status Code Coverage", () => {
    for (const tc of statusCases) {
      test(`handles ${tc.status} — ${tc.label}`, async ({ network, page }) => {
        network.use(
          http.get("*/api/protected/posts/:id/analytics", () =>
            HttpResponse.json(tc.body, { status: tc.status }),
          ),
        );

        await page.goto(ANALYTICS_URL);
        await page.waitForLoadState("networkidle");

        if (tc.status === 404) {
          await expect(page.getByText(/post not found/i)).toBeVisible();
        } else if (tc.status === 401) {
          // 401 from fetcher causes error state
          await expect(
            page.getByText(/something went wrong|post not found/i),
          ).toBeVisible();
        } else {
          await expect(page.getByText(/something went wrong/i)).toBeVisible();
        }
      });
    }

    test("handles transport failure", async ({ network, page }) => {
      network.use(
        http.get("*/api/protected/posts/:id/analytics", () =>
          HttpResponse.error(),
        ),
      );

      await page.goto(ANALYTICS_URL);
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByText(/something went wrong/i),
      ).toBeVisible();
    });
  });
});
```

---

### F22: New Playwright tests for Dashboard `LastSevenDaysSection`

**File:** `webapp/e2e/dashboard.spec.ts`

Check if this file already exists. If it does, append the new suite. If not, create it:

```typescript
/**
 * Dashboard E2E Tests
 *
 * Tests for the / (index) route, specifically the LastSevenDaysSection widget.
 *
 * Endpoint coverage (analytics):
 *   GET /api/protected/analytics/overview   → 200, 500
 *   GET /api/protected/analytics/timeseries → 200
 *   GET /api/protected/analytics/platforms  → 200
 */

import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import { analyticsScenarios } from "./handlers/analytics.handlers";

test.describe("Dashboard — LastSevenDaysSection", () => {
  test("renders last-7-days section with data", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Section header
    await expect(page.getByText(/LAST 7 DAYS · PERFORMANCE/i)).toBeVisible();
    // Stat labels
    await expect(page.getByText("IMPRESSIONS")).toBeVisible();
    await expect(page.getByText("ENGAGEMENTS")).toBeVisible();
    // View analytics link
    await expect(
      page.getByRole("link", { name: /view analytics/i }),
    ).toBeVisible();
  });

  test("hides section when all data is zero", async ({ network, page }) => {
    network.use(...analyticsScenarios.zeroTotals());

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Quick Access should still render; section should be absent
    await expect(page.getByText(/quick access/i)).toBeVisible();
    await expect(
      page.getByText(/LAST 7 DAYS · PERFORMANCE/i),
    ).not.toBeVisible();
  });

  test("hides section on analytics 500 — rest of dashboard renders", async ({
    network,
    page,
  }) => {
    network.use(
      http.get("*/api/protected/analytics/overview", () =>
        HttpResponse.json(
          {
            error: "An internal error occurred. Please try again later.",
            code: "INTERNAL_ERROR",
          },
          { status: 500 },
        ),
      ),
    );

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Dashboard still works
    await expect(page.getByText(/quick access/i)).toBeVisible();
    // Section is silently hidden
    await expect(
      page.getByText(/LAST 7 DAYS · PERFORMANCE/i),
    ).not.toBeVisible();
  });
});
```

---

## Phase 8 — Verification

### V1: Backend verification

```bash
cd base-server

# Build
go build ./...

# Unit tests
make dev-test-unit

# Store tests (requires dev-up)
make dev-up  # if not already running
make dev-test-store

# Integration tests
make dev-test-integration

# Race detector
go test -race -short ./...
```

### V2: Frontend verification

```bash
cd webapp

# TypeScript + Vite build
npm run build

# Biome linter
npm run lint

# SCSS linter
npm run lint:scss
```

### V3: Playwright

```bash
cd webapp
npx playwright test analytics.spec.ts post-analytics.spec.ts dashboard.spec.ts
```

---

## Commit sequence

1. `feat(analytics): add GetLatestAnalyticsByPost store method and tests`
2. `feat(analytics): add GetPostAnalytics processor method with ownership check`
3. `feat(analytics): add HandleGetPostAnalytics endpoint GET /posts/:id/analytics`
4. `feat(analytics): add chart primitives (Sparkline, TimeSeriesChart, chart-theme)`
5. `feat(analytics): add DateRangeTabs and MetricSelector controls`
6. `feat(analytics): refactor AnalyticsPage with date range, chart, trend chips, tbl table`
7. `feat(analytics): add PostAnalyticsPage and route posts.$id.analytics`
8. `feat(analytics): add LastSevenDaysSection widget to dashboard`
9. `feat(analytics): add Playwright E2E tests for analytics, post-analytics, dashboard`

---

## Key decisions

**No migration required** — `analytics_unavailable_at` was added in V0051, `post_analytics` and `platform_posts` tables are fully in place.

**`post_url` constructed in processor, not DB** — `platform_posts` has `platform_post_id` (the remote platform's ID string) but no `post_url` column. Rather than a migration, the processor constructs canonical URLs for X and Threads from the ID string. Platforms without deterministic URL patterns (BlueSky AT URIs, LinkedIn) return `null` and the frontend omits the link icon per spec.

**Prior-period deltas via double hook call** — doubles request volume but responses are small; matches spec's stated v1 approach. Backend `?compare=prev` upgrade deferred.

**`StatCard` footer prop** — the plan agent must verify whether `StatCard` accepts a `footer?: ReactNode` prop before rendering `<TrendChip>` in it. If absent, add the prop to the `StatCard` component in `webapp/src/proto-design-system/components/data/StatCard/`.
