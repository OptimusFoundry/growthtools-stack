# Blog Post Generation from GitHub Commits — Implementation Plan

**Goal:** Auto-generate long-form engineering blog-post drafts from successful GitHub commit captures via a parallel Kafka pipeline that calls Gemini 2.5 Flash with the full diff + screenshots, then persists a `blog_posts` row as a draft the user can review and publish.

**Scope:** full-stack (backend pipeline + frontend list/detail upgrades)

**Design spec:** `docs/superpowers/specs/2026-04-18-blog-generation-design.md`

---

## Architecture Summary

### Why

`CaptureResultWorker` already fans out `github.draft.generate` to produce a social-media draft. Blog generation is a second, independent consumer of the same capture output — published side-by-side rather than chained — so a blog-AI failure cannot starve social drafts and vice versa. One schema column (`blog_post_id` on `github_commits`) mirrors `post_id` and provides the "already generated" guard.

### Database

- `V0049__add_blog_post_id_to_github_commits.sql` — add `blog_post_id UUID NULL REFERENCES blog_posts(id)` to `github_commits` + partial index. Mirrors the `post_id` column already on the table.

### Backend

- **Kafka topic:** new constant `TopicBlogGenerate = "github.blog.generate"` in `workers/github_blog.go`. `BlogGenerateEvent` struct shape matches `DraftGenerateEvent` (single `CommitID` field).
- **CaptureResultWorker fan-out:** after successfully publishing to `TopicDraftGenerate`, also publish to `TopicBlogGenerate`. Blog publish failure does NOT block draft publish; both failures are logged at ERROR and swallowed (persistence already succeeded).
- **New store methods** in `infra/store/github_commit.go`:
  - `GetGitHubCommitForBlog(ctx, commitID)` — returns a new `GitHubCommitForBlog` struct that joins `github_repos` + `github_connections` and returns repo owner/name, account ID, and the connection's `access_token` so the blog generator can re-fetch the diff.
  - `UpdateGitHubCommitBlogPostID(ctx, commitID, blogPostID)` — mirrors `UpdateGitHubCommitPostID` exactly.
- **New worker** `workers/github_blog.go` (`BlogGeneratorWorker`) — consumes `github.blog.generate`, invokes `BlogGenerator.GenerateBlogFromCommit`, swallows guard-tripped + unexpected errors (identical shape to `DraftGeneratorWorker`).
- **New processor** `github/processor/blog.go` (`BlogDraftGenerator`):
  - Loads commit + token + repo context via `GetGitHubCommitForBlog`.
  - Guards: already-has-blog-post, missing capture_output, capture-error, malformed capture JSON → `ErrBlogGuardTripped`.
  - Re-fetches the diff from GitHub REST (`GetCommitDiff`).
  - Fetches up to 5 screenshot images from S3 as base64 multimodal inputs.
  - Calls Gemini 2.5 Flash with a fixed system prompt + diff + screenshots.
  - Parses response → extracts title (from first `# ...` line), derives slug (lowercase + hyphenate; on collision, append an 8-character UUID suffix in a single attempt — never loops), extracts excerpt (first non-heading, non-empty paragraph, 200-char truncate).
  - Persists draft `blog_posts` row via `CreateBlogPost`.
  - Links commit via `UpdateGitHubCommitBlogPostID` (soft failure — logged but not returned).
- **Bootstrap wiring** — construct `BlogDraftGenerator` in `processors.go`, register `BlogGeneratorWorker` in `workers.go` next to `DraftGeneratorWorker`.

### Frontend

- `routes/blog.tsx` — upgrade to match the `posts.tsx` pattern: stats bar, `Dropdown` filter, custom card layout with inline delete + publish buttons, motion stagger, empty/filtered-empty states, delete `Modal`.
- `routes/blog_.$id.tsx` — combined view/edit page mirroring the `posts_.$id.tsx` pattern: view mode renders `content` with `react-markdown` + `remark-gfm` + `rehype-highlight`; edit mode renders the existing `BlogPostForm` pre-filled from the loaded post. Header hosts Edit/Save/Cancel (edit mode) and Publish/Delete (view mode). No separate read-only viewer.
- New CSS module `routes/blog.module.scss` cloned from `posts.module.scss`.
- New hooks: `useDeleteBlog.ts`. (`useBlogPosts` and `usePublishBlog` already exist.)

### API

No new endpoints. `GET/POST/PUT/DELETE /blog` + `POST /blog/:id/publish` already exist.

---

## File Map

### New files

**Backend**

- `base-server/migrations/V0049__add_blog_post_id_to_github_commits.sql`
- `base-server/internal/workers/github_blog.go`
- `base-server/internal/workers/github_blog_test.go`
- `base-server/internal/github/processor/blog.go`
- `base-server/internal/github/processor/blog_test.go`
- `base-server/internal/github/processor/blog_mocks_test.go` (gomock-generated)

**Frontend**

- `webapp/src/hooks/useDeleteBlog.ts`
- `webapp/src/routes/blog.module.scss`

### Modified files

**Backend**

- `base-server/internal/infra/store/github_commit.go` — add `GitHubCommitForBlog`, `GetGitHubCommitForBlog`, `UpdateGitHubCommitBlogPostID`, extend `GitHubCommit` struct with `BlogPostID *uuid.UUID` (so list/detail queries can eventually surface it).
- `base-server/internal/infra/store/github_commit_test.go` — add tests for the two new methods.
- `base-server/internal/workers/github_capture.go` — add `TopicBlogGenerate` constant + `BlogGenerateEvent` type + publish to blog topic after draft topic; keep both publish failures non-fatal.
- `base-server/internal/workers/github_capture_test.go` — add assertions that blog topic is also published on success.
- `base-server/internal/infra/bootstrap/processors.go` — construct `BlogDraftGenerator` and add to `procs`.
- `base-server/internal/infra/bootstrap/workers.go` — register `BlogGeneratorWorker`.

**Frontend**

- `webapp/src/routes/blog.tsx` — full rewrite to posts-style layout.
- `webapp/src/routes/blog_.$id.tsx` — rewrite as combined view/edit page: view mode renders markdown (react-markdown + remark-gfm + rehype-highlight); edit mode reuses `BlogPostForm`; header actions Edit/Save/Cancel/Publish/Delete.
- `webapp/package.json` — add `rehype-highlight` dependency (`remark-gfm` is already present).
- `webapp/src/routes/editor.module.scss` — append a `.markdown` class used by the blog detail view.

---

## Execution Order

Tasks are TDD-ordered and commit-boundary. Each task is independently runnable and leaves `go build ./...` + `npm run build` green.

---

## Task B1 — Migration: add `blog_post_id` to `github_commits`

**File:** `base-server/migrations/V0049__add_blog_post_id_to_github_commits.sql`

```sql
-- Adds a link from a captured commit to the long-form blog post generated
-- from it. Mirrors the existing post_id column which links to the social
-- media draft. Nullable — a commit may never have a blog post generated
-- (capture failed, user not using blog feature, worker down, etc.).
ALTER TABLE github_commits
    ADD COLUMN blog_post_id UUID NULL REFERENCES blog_posts(id);

-- Partial index to quickly find commits that still need a blog post.
-- Excludes rows where blog_post_id IS NOT NULL so the index stays small.
CREATE INDEX IF NOT EXISTS idx_github_commits_blog_post_id_null
    ON github_commits (id)
    WHERE blog_post_id IS NULL;
```

**Verify:**

```bash
cd /Users/shubh/Workspaces/growth-tools/base-server
make dev-up
# Flyway runs migrations on startup. Verify the column + index exist:
docker compose exec -T postgres psql -U postgres -d base -c "\d github_commits" | grep blog_post_id
# Expected output contains: blog_post_id | uuid | | |
```

**Commit:**

```bash
cd /Users/shubh/Workspaces/growth-tools
git add base-server/migrations/V0049__add_blog_post_id_to_github_commits.sql
git commit -m "feat(db): add blog_post_id to github_commits for blog generation pipeline"
```

---

## Task B2 — Store: extend `GitHubCommit`, add `GitHubCommitForBlog`, add two methods

### B2.1 Write failing store tests

**File:** `base-server/internal/infra/store/github_commit_test.go`

Append these test functions to the file (after `TestStore_GetGitHubCommitForDraft`):

```go
// ============================================================================
// GetGitHubCommitForBlog
// ============================================================================

func TestStore_GetGitHubCommitForBlog(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) uuid.UUID // returns commitID
		wantErr error
		assert  func(t *testing.T, got GitHubCommitForBlog)
	}{
		{
			name: "happy path returns access_token, account_id, repo owner/name, sha, message",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				sha := "sha-blog-" + uuid.New().String()[:16]
				branch := "main"
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, sha,
					strPtr("Author"), strPtr("a@b.com"), "blog commit message",
					&branch, strPtr("https://github.com/example"), time.Now().UTC(), nil)
				require.NoError(t, err)
				return commit.ID
			},
			assert: func(t *testing.T, got GitHubCommitForBlog) {
				assert.NotEqual(t, uuid.Nil, got.ID)
				assert.NotEqual(t, uuid.Nil, got.AccountID)
				assert.NotEmpty(t, got.RepoOwner)
				assert.NotEmpty(t, got.RepoName)
				assert.NotEmpty(t, got.ConnectionAccessToken)
				assert.Equal(t, "blog commit message", got.Message)
				assert.NotNil(t, got.Branch)
				assert.Equal(t, "main", *got.Branch)
				assert.Nil(t, got.BlogPostID)
				assert.Nil(t, got.CaptureOutput)
			},
		},
		{
			name: "happy path returns capture_output and blog_post_id when set",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				sha := "sha-blog-cap-" + uuid.New().String()[:12]
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, sha,
					nil, nil, "capture msg", nil, nil, time.Now().UTC(), nil)
				require.NoError(t, err)
				captureJSON := json.RawMessage(`{"uploaded":[{"key":"a.png"}]}`)
				require.NoError(t, s.UpdateGitHubCommitCapture(ctx, commit.ID, captureJSON))

				accountID := createTestAccount(t, s)
				bp, err := s.CreateBlogPost(ctx, CreateBlogPostParams{
					AccountID: accountID,
					Title:     "Linked Blog",
					Slug:      "linked-" + uuid.New().String()[:8],
					Content:   "# linked",
					Status:    BlogStatusDraft,
					Keywords:  StringArray{},
				})
				require.NoError(t, err)
				require.NoError(t, s.UpdateGitHubCommitBlogPostID(ctx, commit.ID, bp.ID))
				return commit.ID
			},
			assert: func(t *testing.T, got GitHubCommitForBlog) {
				assert.NotNil(t, got.CaptureOutput)
				require.NotNil(t, got.BlogPostID)
				assert.NotEqual(t, uuid.Nil, *got.BlogPostID)
			},
		},
		{
			name: "returns ErrNotFound when commit id does not exist",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return uuid.New()
			},
			wantErr: ErrNotFound,
		},
		{
			name: "returns ErrNotFound when owning connection is soft-deleted",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				sha := "sha-blog-delconn-" + uuid.New().String()[:10]
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, sha,
					nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
				require.NoError(t, err)
				require.NoError(t, s.SoftDeleteGitHubConnection(ctx, userID))
				return commit.ID
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			commitID := tt.setup(t)
			got, err := s.GetGitHubCommitForBlog(ctx, commitID)
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

// ============================================================================
// UpdateGitHubCommitBlogPostID
// ============================================================================

func TestStore_UpdateGitHubCommitBlogPostID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, uuid.UUID) // commitID, blogPostID
		wantErr error
	}{
		{
			name: "happy path links commit to blog post",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				accountID := createTestAccount(t, s)
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, "sha-b-"+uuid.New().String()[:16],
					nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
				require.NoError(t, err)
				bp, err := s.CreateBlogPost(ctx, CreateBlogPostParams{
					AccountID: accountID,
					Title:     "T",
					Slug:      "t-" + uuid.New().String()[:8],
					Content:   "# t",
					Status:    BlogStatusDraft,
					Keywords:  StringArray{},
				})
				require.NoError(t, err)
				return commit.ID, bp.ID
			},
		},
		{
			name: "not found for unknown commit",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				return uuid.New(), uuid.New()
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			commitID, blogPostID := tt.setup(t)
			err := s.UpdateGitHubCommitBlogPostID(ctx, commitID, blogPostID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}
```

### B2.2 Implement store changes

**File:** `base-server/internal/infra/store/github_commit.go`

1. Add `BlogPostID *uuid.UUID` to the `GitHubCommit` struct, right after `PostDeleted`:

```go
// within type GitHubCommit struct, after PostDeleted field:
BlogPostID         *uuid.UUID       `db:"blog_post_id" json:"blog_post_id,omitempty"`
```

2. Update existing `RETURNING` / `SELECT` clauses that hydrate `GitHubCommit` to include `blog_post_id`. Replace the three SQL constants exactly:

   Replace `sqlInsertGitHubCommit`:

```go
const sqlInsertGitHubCommit = `
INSERT INTO github_commits (repo_id, sha, author_name, author_email, message, branch, commit_url, pushed_at, payload)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (repo_id, sha) DO NOTHING
RETURNING id, repo_id, sha, author_name, author_email, message, branch, commit_url, pushed_at, payload, post_id, FALSE AS post_deleted, blog_post_id, capture_output, capture_requested_at, skipped_reason, processed_at, created_at
`
```

   Replace `sqlGetGitHubCommitByRepoSHA`:

```go
const sqlGetGitHubCommitByRepoSHA = `
SELECT gc.id, gc.repo_id, gc.sha, gc.author_name, gc.author_email, gc.message, gc.branch, gc.commit_url, gc.pushed_at, gc.payload, gc.post_id,
       (gc.post_id IS NOT NULL AND p.deleted_at IS NOT NULL) AS post_deleted,
       gc.blog_post_id,
       gc.capture_output, gc.capture_requested_at, gc.skipped_reason, gc.processed_at, gc.created_at
FROM github_commits gc
LEFT JOIN posts p ON p.id = gc.post_id
WHERE gc.repo_id = $1 AND gc.sha = $2
`
```

   Replace `sqlGetGitHubCommitByIDForUser`:

```go
const sqlGetGitHubCommitByIDForUser = `
SELECT gc.id, gc.repo_id, gc.sha, gc.author_name, gc.author_email, gc.message, gc.branch, gc.commit_url, gc.pushed_at, gc.payload, gc.post_id,
       (gc.post_id IS NOT NULL AND p.deleted_at IS NOT NULL) AS post_deleted,
       gc.blog_post_id,
       gc.capture_output, gc.capture_requested_at, gc.skipped_reason, gc.processed_at, gc.created_at,
       gr.owner AS repo_owner, gr.name AS repo_name
FROM github_commits gc
JOIN github_repos gr ON gr.id = gc.repo_id
JOIN github_connections conn ON conn.id = gr.connection_id
LEFT JOIN posts p ON p.id = gc.post_id
WHERE gc.id = $1
  AND conn.user_id = $2
  AND gr.deleted_at IS NULL
  AND conn.deleted_at IS NULL
`
```

3. Add the new `GitHubCommitForBlog` struct (immediately after `GitHubCommitForDraft`):

```go
// GitHubCommitForBlog is the commit + owning account + repo context + OAuth
// token a background worker needs to generate a blog post. Includes the
// connection's access token because the blog generator re-fetches the full
// diff from GitHub — the one stored on the commit at webhook time is only the
// message and metadata.
type GitHubCommitForBlog struct {
	ID                    uuid.UUID        `db:"id"`
	SHA                   string           `db:"sha"`
	Message               string           `db:"message"`
	Branch                *string          `db:"branch"`
	BlogPostID            *uuid.UUID       `db:"blog_post_id"`
	CaptureOutput         *json.RawMessage `db:"capture_output"`
	AccountID             uuid.UUID        `db:"account_id"`
	RepoOwner             string           `db:"repo_owner"`
	RepoName              string           `db:"repo_name"`
	ConnectionAccessToken string           `db:"connection_access_token"`
}
```

4. Add the new SQL constants + methods (after `GetGitHubCommitForDraft`):

```go
const sqlGetGitHubCommitForBlog = `
SELECT gc.id, gc.sha, gc.message, gc.branch, gc.blog_post_id, gc.capture_output,
       a.id AS account_id,
       gr.owner AS repo_owner, gr.name AS repo_name,
       c.access_token AS connection_access_token
FROM github_commits gc
JOIN github_repos gr ON gr.id = gc.repo_id AND gr.deleted_at IS NULL
JOIN github_connections c ON c.id = gr.connection_id AND c.deleted_at IS NULL
JOIN accounts a ON a.owner_user_id = c.user_id AND a.deleted_at IS NULL
WHERE gc.id = $1
`

// GetGitHubCommitForBlog resolves the account, repo metadata, and OAuth token
// needed to generate a blog post from a commit id. Used by the blog-generator
// worker which has only a commit id.
func (s *Store) GetGitHubCommitForBlog(ctx context.Context, commitID uuid.UUID) (GitHubCommitForBlog, error) {
	var row GitHubCommitForBlog
	err := s.db.GetContext(ctx, &row, sqlGetGitHubCommitForBlog, commitID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return GitHubCommitForBlog{}, ErrNotFound
		}
		return GitHubCommitForBlog{}, fmt.Errorf("failed to get github commit for blog: %w", err)
	}
	return row, nil
}

const sqlUpdateGitHubCommitBlogPostID = `
UPDATE github_commits
SET blog_post_id = $2
WHERE id = $1
`

// UpdateGitHubCommitBlogPostID links a commit to the blog post that was
// generated from it. Mirrors UpdateGitHubCommitPostID.
func (s *Store) UpdateGitHubCommitBlogPostID(ctx context.Context, commitID, blogPostID uuid.UUID) error {
	res, err := s.db.ExecContext(ctx, sqlUpdateGitHubCommitBlogPostID, commitID, blogPostID)
	if err != nil {
		return fmt.Errorf("failed to update github commit blog_post_id: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}
```

### B2.3 Verify

```bash
cd /Users/shubh/Workspaces/growth-tools/base-server
go build ./...
# Expected: no output (success)

make dev-up
go test ./internal/infra/store/ -run 'TestStore_GetGitHubCommitForBlog|TestStore_UpdateGitHubCommitBlogPostID' -v
# Expected: all sub-tests PASS; 0 failures
```

### B2.4 Commit

```bash
cd /Users/shubh/Workspaces/growth-tools
git add base-server/internal/infra/store/github_commit.go base-server/internal/infra/store/github_commit_test.go
git commit -m "feat(store): add GetGitHubCommitForBlog and UpdateGitHubCommitBlogPostID"
```

---

## Task B3 — CaptureResultWorker: publish to blog topic on success

### B3.1 Write failing test update

**File:** `base-server/internal/workers/github_capture_test.go`

Extend `TestCaptureResultWorker_Handle`: in the "happy path success=true" case, bump expected publish count to 2 and assert both topics get published. Replace the "happy path success=true persists and publishes event" case with:

```go
{
    name:  "happy path success=true persists and publishes both draft and blog events",
    value: successMsg(),
    store: &mockCaptureStore{},
    publisher: &mockDraftPublisher{
        publishFn: func(_ context.Context, topic, key string, payload any) error {
            assert.Contains(t, []string{TopicDraftGenerate, TopicBlogGenerate}, topic)
            assert.Equal(t, commitID.String(), key)
            switch topic {
            case TopicDraftGenerate:
                evt, ok := payload.(DraftGenerateEvent)
                require.True(t, ok)
                assert.Equal(t, commitID, evt.CommitID)
            case TopicBlogGenerate:
                evt, ok := payload.(BlogGenerateEvent)
                require.True(t, ok)
                assert.Equal(t, commitID, evt.CommitID)
            }
            return nil
        },
    },
    assertPublish: func(t *testing.T, pub *mockDraftPublisher) {
        t.Helper()
        assert.Equal(t, 2, pub.publishCalled)
    },
},
```

Also update "publish failure does not surface as error" to expect `publishCalled == 2` (both attempts still fire; both are swallowed). Replace its `assertPublish`:

```go
assertPublish: func(t *testing.T, pub *mockDraftPublisher) {
    t.Helper()
    assert.Equal(t, 2, pub.publishCalled)
},
```

Leave `success=false` and error cases unchanged — no publishes expected when success is false.

### B3.2 Implement worker change

**File:** `base-server/internal/workers/github_capture.go`

1. Add new constant + event type directly below the existing `TopicDraftGenerate` block:

```go
// TopicBlogGenerate is published alongside TopicDraftGenerate on a
// successful capture. BlogGeneratorWorker consumes it and produces a
// long-form blog-post draft from the commit + captured artefacts.
const TopicBlogGenerate = "github.blog.generate"

// BlogGenerateEvent is the github.blog.generate message body.
type BlogGenerateEvent struct {
	CommitID uuid.UUID `json:"commit_id"`
}
```

2. Replace the `if msg.Success && w.publisher != nil { ... }` block in `handle(...)` with:

```go
// Fan out to both the draft and the blog generator on success only —
// failed captures don't produce usable artefacts. The two publishes are
// independent: a failure on one is logged but does not prevent the other.
if msg.Success && w.publisher != nil {
    draftEvent := DraftGenerateEvent{CommitID: msg.CommitID}
    if err := w.publisher.Publish(ctx, TopicDraftGenerate, msg.CommitID.String(), draftEvent); err != nil {
        w.logger.Error(ctx, "failed to publish draft.generate event", err)
    }

    blogEvent := BlogGenerateEvent{CommitID: msg.CommitID}
    if err := w.publisher.Publish(ctx, TopicBlogGenerate, msg.CommitID.String(), blogEvent); err != nil {
        w.logger.Error(ctx, "failed to publish blog.generate event", err)
    }
}
```

### B3.3 Verify

```bash
cd /Users/shubh/Workspaces/growth-tools/base-server
go build ./...
go test ./internal/workers/ -run 'TestCaptureResultWorker_Handle' -v
# Expected: all sub-tests PASS. "happy path" and "publish failure" cases show publishCalled=2.
```

### B3.4 Commit

```bash
cd /Users/shubh/Workspaces/growth-tools
git add base-server/internal/workers/github_capture.go base-server/internal/workers/github_capture_test.go
git commit -m "feat(github): fan out blog.generate alongside draft.generate on capture success"
```

---

## Task B4 — BlogDraftGenerator: processor + unit tests

### B4.1 Write failing processor + tests + mocks scaffold

**File:** `base-server/internal/github/processor/blog.go`

```go
package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=blog.go -destination=blog_mocks_test.go -package=processor

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"regexp"
	"strings"

	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

const (
	blogMaxScreenshots = 5
	blogExcerptMax     = 200
	// blogMaxOutputTokens caps Gemini output. 2.5 Flash supports up to 65k
	// output; 8k is enough for a long-form blog post and keeps latency +
	// cost predictable.
	blogMaxOutputTokens = 8192
	blogSystemPrompt    = "You are a technical engineering blog author. Write detailed, first-person blog posts about software changes. Cover what was built, why architectural decisions were made, what tradeoffs existed, and what the implementation looks like. Be specific — reference actual code, file names, and design patterns from the diff. Output raw markdown only, starting with a `# Title` heading. Use H2 sections. No preamble, no meta-commentary."
)

var (
	ErrBlogGuardTripped     = errors.New("blog generation guard tripped")
	ErrBlogGenerationFailed = errors.New("failed to generate blog from commit")
)

// BlogDraftStore is the slice of the store the blog generator needs.
type BlogDraftStore interface {
	GetGitHubCommitForBlog(ctx context.Context, commitID uuid.UUID) (store.GitHubCommitForBlog, error)
	UpdateGitHubCommitBlogPostID(ctx context.Context, commitID, blogPostID uuid.UUID) error
	CreateBlogPost(ctx context.Context, params store.CreateBlogPostParams) (store.BlogPost, error)
	GetBlogPostBySlug(ctx context.Context, accountID uuid.UUID, slug string) (store.BlogPost, error)
}

// GitHubDiffFetcher returns the full unified diff for a commit. Interface
// wrapper around the real GitHub REST client so tests can stub it.
type GitHubDiffFetcher interface {
	GetCommitDiff(ctx context.Context, token, owner, name, sha string) (string, error)
}

// BlogDraftGenerator turns a completed capture into a long-form markdown
// blog post draft.
type BlogDraftGenerator struct {
	store   BlogDraftStore
	ai      aiclient.Client
	s3Fetch S3Fetcher
	diffs   GitHubDiffFetcher
	logger  *observability.Logger
}

// NewBlogDraftGenerator wires the dependencies. s3Fetch may be nil (localdir
// deploy); the generator will skip screenshot attachment and call Gemini
// with the diff only.
func NewBlogDraftGenerator(
	st BlogDraftStore,
	ai aiclient.Client,
	s3Fetch S3Fetcher,
	diffs GitHubDiffFetcher,
	logger *observability.Logger,
) BlogDraftGenerator {
	return BlogDraftGenerator{
		store:   st,
		ai:      ai,
		s3Fetch: s3Fetch,
		diffs:   diffs,
		logger:  logger,
	}
}

// GenerateBlogFromCommit is the top-level flow invoked by the worker.
// Returns ErrBlogGuardTripped for expected no-ops so the worker can log at
// INFO. Hard failures return ErrBlogGenerationFailed.
func (g *BlogDraftGenerator) GenerateBlogFromCommit(ctx context.Context, commitID uuid.UUID) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "commit_id", Value: commitID.String()},
		observability.Field{Key: "operation", Value: "generate_blog_from_commit"},
	)

	commit, err := g.store.GetGitHubCommitForBlog(ctx, commitID)
	if err != nil {
		g.logger.Error(ctx, "failed to load commit for blog generation", err)
		return ErrBlogGenerationFailed
	}

	if commit.BlogPostID != nil {
		g.logger.Info(ctx, "commit already linked to a blog post; skipping blog generation")
		return ErrBlogGuardTripped
	}
	if commit.CaptureOutput == nil {
		g.logger.Info(ctx, "commit has no capture_output; skipping blog generation")
		return ErrBlogGuardTripped
	}

	var payload capturePayload
	if err := json.Unmarshal(*commit.CaptureOutput, &payload); err != nil {
		g.logger.Error(ctx, "failed to parse capture_output", err)
		return ErrBlogGenerationFailed
	}
	if payload.Error != "" {
		g.logger.Info(ctx, "capture output reports failure; skipping blog generation")
		return ErrBlogGuardTripped
	}

	// Full diff: re-fetched at generation time rather than pulled from the
	// webhook payload because push events only ship the commit metadata.
	diff, err := g.diffs.GetCommitDiff(ctx, commit.ConnectionAccessToken, commit.RepoOwner, commit.RepoName, commit.SHA)
	if err != nil {
		g.logger.Error(ctx, "failed to fetch commit diff", err)
		return ErrBlogGenerationFailed
	}

	// Screenshots: bucket the capture artefacts and pick up to N images.
	// Video is intentionally skipped — Gemini gets far more value from the
	// diff + screenshots than from a 30-second screen capture.
	_, imageKeys := bucketArtifacts(payload.Uploaded)
	if len(imageKeys) > blogMaxScreenshots {
		imageKeys = imageKeys[:blogMaxScreenshots]
	}
	images := make([]aiclient.ImageData, 0, len(imageKeys))
	if g.s3Fetch != nil {
		for _, key := range imageKeys {
			img, err := g.fetchImage(ctx, key)
			if err != nil {
				g.logger.Error(ctx, "failed to fetch capture image for blog; continuing without it", err)
				continue
			}
			images = append(images, img)
		}
	}

	userMessage := buildBlogUserMessage(commit, diff)
	rawOutput, err := g.ai.CreateMessage(ctx, blogSystemPrompt, []aiclient.Message{
		{Role: "user", Content: userMessage, Images: images},
	}, blogMaxOutputTokens)
	if err != nil {
		g.logger.Error(ctx, "gemini blog generation failed", err)
		return ErrBlogGenerationFailed
	}

	title, excerpt, content := parseBlogResponse(rawOutput)
	if title == "" || content == "" {
		g.logger.Error(ctx, "gemini blog response missing title or content", fmt.Errorf("raw length=%d", len(rawOutput)))
		return ErrBlogGenerationFailed
	}

	slug, err := g.resolveUniqueSlug(ctx, commit.AccountID, slugify(title))
	if err != nil {
		g.logger.Error(ctx, "failed to resolve unique slug", err)
		return ErrBlogGenerationFailed
	}

	params := store.CreateBlogPostParams{
		AccountID: commit.AccountID,
		Title:     title,
		Slug:      slug,
		Content:   content,
		Status:    store.BlogStatusDraft,
		Keywords:  store.StringArray{},
	}
	if excerpt != "" {
		params.Excerpt = &excerpt
	}

	bp, err := g.store.CreateBlogPost(ctx, params)
	if err != nil {
		g.logger.Error(ctx, "failed to persist blog post", err)
		return ErrBlogGenerationFailed
	}

	if err := g.store.UpdateGitHubCommitBlogPostID(ctx, commit.ID, bp.ID); err != nil {
		// Blog post is already persisted — log but don't surface: the user
		// can still see the draft on the Blog page.
		g.logger.Error(ctx, "failed to link commit to blog post", err)
	}
	return nil
}

// fetchImage downloads an image body from S3 and packages it for a
// multimodal AI request. Falls back to the extension-derived MIME type
// when S3 returns an empty / generic content-type (same logic as the
// draft generator).
func (g *BlogDraftGenerator) fetchImage(ctx context.Context, key string) (aiclient.ImageData, error) {
	body, contentType, err := g.s3Fetch.GetFile(ctx, key)
	if err != nil {
		return aiclient.ImageData{}, err
	}
	defer body.Close()
	data, err := io.ReadAll(body)
	if err != nil {
		return aiclient.ImageData{}, err
	}
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = contentTypeFor(key)
	}
	return aiclient.ImageData{MIMEType: contentType, Data: data}, nil
}

// buildBlogUserMessage formats the repo + commit + diff context for Gemini.
func buildBlogUserMessage(c store.GitHubCommitForBlog, diff string) string {
	branch := ""
	if c.Branch != nil {
		branch = *c.Branch
	}
	var b strings.Builder
	b.WriteString("Repo: ")
	b.WriteString(c.RepoOwner)
	b.WriteString("/")
	b.WriteString(c.RepoName)
	b.WriteString("\nBranch: ")
	b.WriteString(branch)
	b.WriteString("\nSHA: ")
	b.WriteString(c.SHA)
	b.WriteString("\nCommit message:\n")
	b.WriteString(c.Message)
	b.WriteString("\n\nFull diff:\n")
	b.WriteString(diff)
	return b.String()
}

// parseBlogResponse extracts (title, excerpt, content) from a markdown
// response. Title: first `# ...` heading. Excerpt: first non-heading,
// non-empty paragraph, truncated to blogExcerptMax chars. Content: the
// full raw markdown, unchanged.
func parseBlogResponse(raw string) (title, excerpt, content string) {
	content = strings.TrimSpace(raw)
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "# ") {
			title = strings.TrimSpace(strings.TrimPrefix(trimmed, "# "))
			break
		}
	}
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}
		excerpt = trimmed
		break
	}
	if len([]rune(excerpt)) > blogExcerptMax {
		runes := []rune(excerpt)
		excerpt = string(runes[:blogExcerptMax])
	}
	return title, excerpt, content
}

// slugPattern strips everything that is not a-z0-9.
var slugPattern = regexp.MustCompile(`[^a-z0-9]+`)

// slugify lowercases, replaces runs of non-alphanumerics with hyphens, and
// trims leading / trailing hyphens. Empty result defaults to "post".
func slugify(title string) string {
	s := strings.ToLower(strings.TrimSpace(title))
	s = slugPattern.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "post"
	}
	return s
}

// resolveUniqueSlug looks up the natural slug once. If it is free, return it.
// If a row already owns it for this account, append an 8-character UUID suffix
// and return that. No retry loop — the suffix is effectively collision-free
// (~4 billion combinations per base) so a second lookup is not needed.
func (g *BlogDraftGenerator) resolveUniqueSlug(ctx context.Context, accountID uuid.UUID, base string) (string, error) {
	_, err := g.store.GetBlogPostBySlug(ctx, accountID, base)
	if errors.Is(err, store.ErrNotFound) {
		return base, nil
	}
	if err != nil {
		return "", err
	}
	// Collision — derive a disambiguating suffix from a fresh UUID.
	suffix := strings.ReplaceAll(uuid.New().String(), "-", "")[:8]
	return fmt.Sprintf("%s-%s", base, suffix), nil
}
```

**File:** `base-server/internal/github/processor/blog_mocks_test.go`

Generate gomock. Run:

```bash
cd /Users/shubh/Workspaces/growth-tools/base-server
go run go.uber.org/mock/mockgen@latest -source=internal/github/processor/blog.go -destination=internal/github/processor/blog_mocks_test.go -package=processor
```

This produces `MockBlogDraftStore`, `MockGitHubDiffFetcher`, plus reuses the existing `MockS3Fetcher` from `draft_mocks_test.go`. If MockS3Fetcher conflicts (already defined in the same package), the generator will skip it automatically because the source file declares the same interface. If it does re-emit, delete the duplicate symbol from `blog_mocks_test.go` after generation — `MockS3Fetcher` must exist only once in the package.

**File:** `base-server/internal/github/processor/blog_test.go`

```go
package processor

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"regexp"
	"strings"
	"testing"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

// MockAIClient is a hand-rolled stub for aiclient.Client — the interface is
// in another package and not auto-generated here.
type mockAIClient struct {
	createFn func(ctx context.Context, systemPrompt string, messages []mockAIMessage, maxTokens int) (string, error)
	lastImgs int
	lastUser string
	lastSys  string
}

type mockAIMessage struct {
	Role    string
	Content string
	Images  int
}

func (m *mockAIClient) CreateMessage(ctx context.Context, systemPrompt string, messages []aiclientMessage, maxTokens int) (string, error) {
	// Stash inspectable state for assertions.
	m.lastSys = systemPrompt
	if len(messages) > 0 {
		m.lastUser = messages[0].Content
		m.lastImgs = len(messages[0].Images)
	}
	if m.createFn != nil {
		msgs := make([]mockAIMessage, len(messages))
		for i, mm := range messages {
			msgs[i] = mockAIMessage{Role: mm.Role, Content: mm.Content, Images: len(mm.Images)}
		}
		return m.createFn(ctx, systemPrompt, msgs, maxTokens)
	}
	return "", nil
}

func (m *mockAIClient) StreamMessage(ctx context.Context, systemPrompt string, messages []aiclientMessage, maxTokens int, onChunk func(string)) error {
	return nil
}

// Type alias so the mock file does not import aiclient and create a cycle.
type aiclientMessage = aiclientMessageImport

// aiclientMessageImport is a named re-export kept in this same test file via
// a blank import trick — instead, import the package here.
func newCommitForBlog(t *testing.T) store.GitHubCommitForBlog {
	t.Helper()
	capture := map[string]any{
		"uploaded": []map[string]string{
			{"key": "captures/xyz/step-1.png"},
			{"key": "captures/xyz/step-2.png"},
		},
	}
	raw, err := json.Marshal(capture)
	require.NoError(t, err)
	rawMsg := json.RawMessage(raw)
	branch := "main"
	return store.GitHubCommitForBlog{
		ID:                    uuid.New(),
		SHA:                   "deadbeef",
		Message:               "feat: add blog generation",
		Branch:                &branch,
		CaptureOutput:         &rawMsg,
		AccountID:             uuid.New(),
		RepoOwner:             "acme",
		RepoName:              "widget",
		ConnectionAccessToken: "gh_token_abc",
	}
}

func TestBlogDraftGenerator_GenerateBlogFromCommit(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	happyMarkdown := "# Ship the blog pipeline\n\nWe added an async blog generator that consumes Kafka events and produces drafts.\n\n## Architecture\n\nDetails here."

	tests := []struct {
		name    string
		mocks   func(t *testing.T, s *MockBlogDraftStore, d *MockGitHubDiffFetcher, f *MockS3Fetcher, ai *mockAIClient)
		wantErr error
		assert  func(t *testing.T, ai *mockAIClient)
	}{
		{
			name: "happy path: fetches diff, fetches screenshots, calls AI, persists draft, links commit",
			mocks: func(t *testing.T, s *MockBlogDraftStore, d *MockGitHubDiffFetcher, f *MockS3Fetcher, ai *mockAIClient) {
				commit := newCommitForBlog(t)
				s.EXPECT().GetGitHubCommitForBlog(gomock.Any(), gomock.Any()).Return(commit, nil)
				d.EXPECT().GetCommitDiff(gomock.Any(), "gh_token_abc", "acme", "widget", "deadbeef").
					Return("diff --git a/x.go b/x.go\n+added line", nil)
				for _, key := range []string{"captures/xyz/step-1.png", "captures/xyz/step-2.png"} {
					body := io.NopCloser(bytes.NewReader([]byte("imgbytes")))
					f.EXPECT().GetFile(gomock.Any(), key).Return(body, "image/png", nil)
				}
				ai.createFn = func(_ context.Context, _ string, _ []mockAIMessage, _ int) (string, error) {
					return happyMarkdown, nil
				}
				s.EXPECT().GetBlogPostBySlug(gomock.Any(), commit.AccountID, "ship-the-blog-pipeline").
					Return(store.BlogPost{}, store.ErrNotFound)
				bpID := uuid.New()
				s.EXPECT().CreateBlogPost(gomock.Any(), gomock.Cond(func(p store.CreateBlogPostParams) bool {
					return p.AccountID == commit.AccountID &&
						p.Title == "Ship the blog pipeline" &&
						p.Slug == "ship-the-blog-pipeline" &&
						p.Status == store.BlogStatusDraft &&
						p.Excerpt != nil &&
						*p.Excerpt == "We added an async blog generator that consumes Kafka events and produces drafts." &&
						strings.HasPrefix(p.Content, "# Ship the blog pipeline")
				})).Return(store.BlogPost{ID: bpID, AccountID: commit.AccountID}, nil)
				s.EXPECT().UpdateGitHubCommitBlogPostID(gomock.Any(), commit.ID, bpID).Return(nil)
			},
			assert: func(t *testing.T, ai *mockAIClient) {
				assert.Equal(t, 2, ai.lastImgs)
				assert.Contains(t, ai.lastUser, "acme/widget")
				assert.Contains(t, ai.lastUser, "deadbeef")
				assert.Contains(t, ai.lastUser, "diff --git")
				assert.Contains(t, ai.lastSys, "technical engineering blog author")
			},
		},
		{
			name: "guard: commit already has blog_post_id",
			mocks: func(t *testing.T, s *MockBlogDraftStore, d *MockGitHubDiffFetcher, f *MockS3Fetcher, ai *mockAIClient) {
				commit := newCommitForBlog(t)
				existing := uuid.New()
				commit.BlogPostID = &existing
				s.EXPECT().GetGitHubCommitForBlog(gomock.Any(), gomock.Any()).Return(commit, nil)
			},
			wantErr: ErrBlogGuardTripped,
		},
		{
			name: "guard: capture output missing",
			mocks: func(t *testing.T, s *MockBlogDraftStore, d *MockGitHubDiffFetcher, f *MockS3Fetcher, ai *mockAIClient) {
				commit := newCommitForBlog(t)
				commit.CaptureOutput = nil
				s.EXPECT().GetGitHubCommitForBlog(gomock.Any(), gomock.Any()).Return(commit, nil)
			},
			wantErr: ErrBlogGuardTripped,
		},
		{
			name: "guard: capture output reports error",
			mocks: func(t *testing.T, s *MockBlogDraftStore, d *MockGitHubDiffFetcher, f *MockS3Fetcher, ai *mockAIClient) {
				commit := newCommitForBlog(t)
				raw := json.RawMessage(`{"error":"chrome crashed"}`)
				commit.CaptureOutput = &raw
				s.EXPECT().GetGitHubCommitForBlog(gomock.Any(), gomock.Any()).Return(commit, nil)
			},
			wantErr: ErrBlogGuardTripped,
		},
		{
			name: "hard error: commit lookup fails",
			mocks: func(t *testing.T, s *MockBlogDraftStore, d *MockGitHubDiffFetcher, f *MockS3Fetcher, ai *mockAIClient) {
				s.EXPECT().GetGitHubCommitForBlog(gomock.Any(), gomock.Any()).
					Return(store.GitHubCommitForBlog{}, errors.New("db down"))
			},
			wantErr: ErrBlogGenerationFailed,
		},
		{
			name: "hard error: diff fetch fails",
			mocks: func(t *testing.T, s *MockBlogDraftStore, d *MockGitHubDiffFetcher, f *MockS3Fetcher, ai *mockAIClient) {
				commit := newCommitForBlog(t)
				s.EXPECT().GetGitHubCommitForBlog(gomock.Any(), gomock.Any()).Return(commit, nil)
				d.EXPECT().GetCommitDiff(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("", errors.New("github 500"))
			},
			wantErr: ErrBlogGenerationFailed,
		},
		{
			name: "hard error: AI call fails",
			mocks: func(t *testing.T, s *MockBlogDraftStore, d *MockGitHubDiffFetcher, f *MockS3Fetcher, ai *mockAIClient) {
				commit := newCommitForBlog(t)
				s.EXPECT().GetGitHubCommitForBlog(gomock.Any(), gomock.Any()).Return(commit, nil)
				d.EXPECT().GetCommitDiff(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return("diff", nil)
				for _, key := range []string{"captures/xyz/step-1.png", "captures/xyz/step-2.png"} {
					body := io.NopCloser(bytes.NewReader([]byte("imgbytes")))
					f.EXPECT().GetFile(gomock.Any(), key).Return(body, "image/png", nil)
				}
				ai.createFn = func(context.Context, string, []mockAIMessage, int) (string, error) {
					return "", errors.New("gemini down")
				}
			},
			wantErr: ErrBlogGenerationFailed,
		},
		{
			name: "hard error: AI returns markdown with no title heading",
			mocks: func(t *testing.T, s *MockBlogDraftStore, d *MockGitHubDiffFetcher, f *MockS3Fetcher, ai *mockAIClient) {
				commit := newCommitForBlog(t)
				s.EXPECT().GetGitHubCommitForBlog(gomock.Any(), gomock.Any()).Return(commit, nil)
				d.EXPECT().GetCommitDiff(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return("diff", nil)
				for _, key := range []string{"captures/xyz/step-1.png", "captures/xyz/step-2.png"} {
					body := io.NopCloser(bytes.NewReader([]byte("imgbytes")))
					f.EXPECT().GetFile(gomock.Any(), key).Return(body, "image/png", nil)
				}
				ai.createFn = func(context.Context, string, []mockAIMessage, int) (string, error) {
					return "Just some paragraph with no heading.", nil
				}
			},
			wantErr: ErrBlogGenerationFailed,
		},
		{
			name: "slug collision: appends 8-char UUID suffix in a single attempt",
			mocks: func(t *testing.T, s *MockBlogDraftStore, d *MockGitHubDiffFetcher, f *MockS3Fetcher, ai *mockAIClient) {
				commit := newCommitForBlog(t)
				s.EXPECT().GetGitHubCommitForBlog(gomock.Any(), gomock.Any()).Return(commit, nil)
				d.EXPECT().GetCommitDiff(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return("diff", nil)
				for _, key := range []string{"captures/xyz/step-1.png", "captures/xyz/step-2.png"} {
					body := io.NopCloser(bytes.NewReader([]byte("imgbytes")))
					f.EXPECT().GetFile(gomock.Any(), key).Return(body, "image/png", nil)
				}
				ai.createFn = func(context.Context, string, []mockAIMessage, int) (string, error) { return happyMarkdown, nil }
				// Base slug collides — expect exactly one lookup, then a
				// UUID-suffixed slug handed to CreateBlogPost. No second lookup.
				s.EXPECT().GetBlogPostBySlug(gomock.Any(), commit.AccountID, "ship-the-blog-pipeline").
					Return(store.BlogPost{ID: uuid.New()}, nil)
				bpID := uuid.New()
				suffixPattern := regexp.MustCompile(`^ship-the-blog-pipeline-[0-9a-f]{8}$`)
				s.EXPECT().CreateBlogPost(gomock.Any(), gomock.Cond(func(p store.CreateBlogPostParams) bool {
					return suffixPattern.MatchString(p.Slug)
				})).Return(store.BlogPost{ID: bpID, AccountID: commit.AccountID}, nil)
				s.EXPECT().UpdateGitHubCommitBlogPostID(gomock.Any(), commit.ID, bpID).Return(nil)
			},
		},
		{
			name: "screenshot fetch failure is tolerated; generation continues without the bad image",
			mocks: func(t *testing.T, s *MockBlogDraftStore, d *MockGitHubDiffFetcher, f *MockS3Fetcher, ai *mockAIClient) {
				commit := newCommitForBlog(t)
				s.EXPECT().GetGitHubCommitForBlog(gomock.Any(), gomock.Any()).Return(commit, nil)
				d.EXPECT().GetCommitDiff(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return("diff", nil)
				// First image fails; second succeeds.
				f.EXPECT().GetFile(gomock.Any(), "captures/xyz/step-1.png").
					Return(io.NopCloser(bytes.NewReader(nil)), "", errors.New("s3 403"))
				f.EXPECT().GetFile(gomock.Any(), "captures/xyz/step-2.png").
					Return(io.NopCloser(bytes.NewReader([]byte("ok"))), "image/png", nil)
				ai.createFn = func(context.Context, string, []mockAIMessage, int) (string, error) { return happyMarkdown, nil }
				s.EXPECT().GetBlogPostBySlug(gomock.Any(), commit.AccountID, "ship-the-blog-pipeline").
					Return(store.BlogPost{}, store.ErrNotFound)
				s.EXPECT().CreateBlogPost(gomock.Any(), gomock.Any()).
					Return(store.BlogPost{ID: uuid.New(), AccountID: commit.AccountID}, nil)
				s.EXPECT().UpdateGitHubCommitBlogPostID(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
			},
			assert: func(t *testing.T, ai *mockAIClient) {
				// Only the second screenshot made it through.
				assert.Equal(t, 1, ai.lastImgs)
			},
		},
		{
			name: "UpdateGitHubCommitBlogPostID failure is swallowed after CreateBlogPost",
			mocks: func(t *testing.T, s *MockBlogDraftStore, d *MockGitHubDiffFetcher, f *MockS3Fetcher, ai *mockAIClient) {
				commit := newCommitForBlog(t)
				s.EXPECT().GetGitHubCommitForBlog(gomock.Any(), gomock.Any()).Return(commit, nil)
				d.EXPECT().GetCommitDiff(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return("diff", nil)
				for _, key := range []string{"captures/xyz/step-1.png", "captures/xyz/step-2.png"} {
					body := io.NopCloser(bytes.NewReader([]byte("ok")))
					f.EXPECT().GetFile(gomock.Any(), key).Return(body, "image/png", nil)
				}
				ai.createFn = func(context.Context, string, []mockAIMessage, int) (string, error) { return happyMarkdown, nil }
				s.EXPECT().GetBlogPostBySlug(gomock.Any(), gomock.Any(), gomock.Any()).
					Return(store.BlogPost{}, store.ErrNotFound)
				bpID := uuid.New()
				s.EXPECT().CreateBlogPost(gomock.Any(), gomock.Any()).
					Return(store.BlogPost{ID: bpID, AccountID: commit.AccountID}, nil)
				s.EXPECT().UpdateGitHubCommitBlogPostID(gomock.Any(), gomock.Any(), bpID).
					Return(errors.New("link failed"))
			},
			// No wantErr — function returns nil.
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			bs := NewMockBlogDraftStore(ctrl)
			df := NewMockGitHubDiffFetcher(ctrl)
			s3f := NewMockS3Fetcher(ctrl)
			ai := &mockAIClient{}
			tt.mocks(t, bs, df, s3f, ai)

			g := NewBlogDraftGenerator(bs, aiAdapter{m: ai}, s3f, df, logger)
			err := g.GenerateBlogFromCommit(context.Background(), uuid.New())
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assert != nil {
				tt.assert(t, ai)
			}
		})
	}
}

func TestSlugify(t *testing.T) {
	t.Parallel()
	tests := []struct {
		in, want string
	}{
		{"Ship the blog pipeline", "ship-the-blog-pipeline"},
		{"Hello, World!", "hello-world"},
		{"  spaces trimmed  ", "spaces-trimmed"},
		{"---", "post"},
		{"UPPER lower 123", "upper-lower-123"},
	}
	for _, tt := range tests {
		got := slugify(tt.in)
		assert.Equal(t, tt.want, got, "slugify(%q)", tt.in)
	}
}

func TestParseBlogResponse(t *testing.T) {
	t.Parallel()
	title, excerpt, content := parseBlogResponse("# My title\n\nFirst paragraph here.\n\n## Section\n\nMore.")
	assert.Equal(t, "My title", title)
	assert.Equal(t, "First paragraph here.", excerpt)
	assert.Contains(t, content, "# My title")

	// Excerpt truncation
	longPara := strings.Repeat("a", 250)
	_, longExcerpt, _ := parseBlogResponse("# T\n\n" + longPara)
	assert.Len(t, []rune(longExcerpt), 200)

	// No title
	title, _, _ = parseBlogResponse("Just prose, no heading.")
	assert.Equal(t, "", title)
}
```

> **Note on `aiclientMessageImport` / `aiAdapter`:** the test file avoids a cycle by defining a tiny adapter that implements `aiclient.Client`. Replace the placeholder at the top of the test file with this concrete adapter:

```go
// At top of blog_test.go, after imports, in the same package:
//
// aiclientMessageImport lets tests reference aiclient.Message without a
// second import statement cluttering the mock struct. (Named type alias
// intentional.)

// -- REPLACE the alias + placeholder block with: --

// imports update: add "base-server/internal/infra/clients/aiclient"

type aiAdapter struct{ m *mockAIClient }

func (a aiAdapter) CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
	return a.m.CreateMessage(ctx, systemPrompt, messages, maxTokens)
}
func (a aiAdapter) StreamMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
	return a.m.StreamMessage(ctx, systemPrompt, messages, maxTokens, onChunk)
}

// And update mockAIClient.CreateMessage / StreamMessage signatures to take
// []aiclient.Message directly (not the alias). Drop the type alias entirely.
```

Agent should produce `blog_test.go` with `mockAIClient` taking `[]aiclient.Message` directly and a thin `aiAdapter` used only for the interface seat. The alias block shown earlier is scaffolding notes only.

### B4.2 Verify

```bash
cd /Users/shubh/Workspaces/growth-tools/base-server
go build ./...
go test ./internal/github/processor/ -run 'TestBlogDraftGenerator|TestSlugify|TestParseBlogResponse' -v
# Expected: all sub-tests PASS. No failures.
```

### B4.3 Commit

```bash
cd /Users/shubh/Workspaces/growth-tools
git add base-server/internal/github/processor/blog.go \
        base-server/internal/github/processor/blog_test.go \
        base-server/internal/github/processor/blog_mocks_test.go
git commit -m "feat(github): add BlogDraftGenerator for commit-driven blog post drafts"
```

---

## Task B5 — BlogGeneratorWorker + tests

### B5.1 Write failing worker test

**File:** `base-server/internal/workers/github_blog_test.go`

```go
package workers

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	githubProcessor "base-server/internal/github/processor"
	"base-server/internal/infra/observability"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockBlogGenerator struct {
	generateFn func(ctx context.Context, commitID uuid.UUID) error
}

func (m *mockBlogGenerator) GenerateBlogFromCommit(ctx context.Context, commitID uuid.UUID) error {
	if m.generateFn != nil {
		return m.generateFn(ctx, commitID)
	}
	return nil
}

func TestBlogGeneratorWorker_Handle(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	commitID := uuid.New()

	validEvent := func(id uuid.UUID) []byte {
		b, _ := json.Marshal(BlogGenerateEvent{CommitID: id})
		return b
	}

	tests := []struct {
		name      string
		value     []byte
		generator BlogGenerator
		wantErr   bool
	}{
		{
			name:  "happy path returns nil",
			value: validEvent(commitID),
			generator: &mockBlogGenerator{
				generateFn: func(_ context.Context, id uuid.UUID) error {
					assert.Equal(t, commitID, id)
					return nil
				},
			},
		},
		{
			name:      "invalid JSON returns an error",
			value:     []byte("not json"),
			generator: &mockBlogGenerator{},
			wantErr:   true,
		},
		{
			name:  "ErrBlogGuardTripped is swallowed — returns nil",
			value: validEvent(commitID),
			generator: &mockBlogGenerator{
				generateFn: func(context.Context, uuid.UUID) error {
					return githubProcessor.ErrBlogGuardTripped
				},
			},
		},
		{
			name:  "ErrBlogGenerationFailed is swallowed — returns nil",
			value: validEvent(commitID),
			generator: &mockBlogGenerator{
				generateFn: func(context.Context, uuid.UUID) error {
					return githubProcessor.ErrBlogGenerationFailed
				},
			},
		},
		{
			name:  "unknown error is swallowed — returns nil",
			value: validEvent(commitID),
			generator: &mockBlogGenerator{
				generateFn: func(context.Context, uuid.UUID) error {
					return errors.New("boom")
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			w := &BlogGeneratorWorker{generator: tt.generator, logger: logger}
			err := w.handle(context.Background(), nil, tt.value)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
		})
	}
}
```

### B5.2 Implement worker

**File:** `base-server/internal/workers/github_blog.go`

```go
package workers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	githubProcessor "base-server/internal/github/processor"
	"base-server/internal/infra/clients/kafka"
	"base-server/internal/infra/observability"

	"github.com/google/uuid"
)

// BlogGenerator is the processor dependency the blog worker needs.
type BlogGenerator interface {
	GenerateBlogFromCommit(ctx context.Context, commitID uuid.UUID) error
}

// BlogGeneratorWorker consumes github.blog.generate events and invokes the
// blog generator to turn a completed capture into a long-form draft blog
// post. Mirrors DraftGeneratorWorker exactly — same swallowing behaviour
// so Kafka doesn't retry AI failures indefinitely.
type BlogGeneratorWorker struct {
	consumer  *kafka.Consumer
	generator BlogGenerator
	logger    *observability.Logger
}

// NewBlogGeneratorWorker wires a consumer for the blog-generate topic.
func NewBlogGeneratorWorker(brokers, groupID string, generator BlogGenerator, logger *observability.Logger) *BlogGeneratorWorker {
	w := &BlogGeneratorWorker{generator: generator, logger: logger}
	w.consumer = kafka.NewConsumer(brokers, groupID, TopicBlogGenerate, w.handle, logger)
	return w
}

func (w *BlogGeneratorWorker) handle(ctx context.Context, key, value []byte) error {
	var event BlogGenerateEvent
	if err := json.Unmarshal(value, &event); err != nil {
		return fmt.Errorf("failed to unmarshal blog generate event: %w", err)
	}
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "commit_id", Value: event.CommitID.String()},
	)
	err := w.generator.GenerateBlogFromCommit(ctx, event.CommitID)
	if err == nil {
		return nil
	}
	if errors.Is(err, githubProcessor.ErrBlogGuardTripped) {
		return nil
	}
	// Swallow other errors — the processor already logged; Kafka redelivery
	// won't un-break an AI or GitHub-API failure.
	return nil
}

// Start runs the consumer loop until ctx is cancelled.
func (w *BlogGeneratorWorker) Start(ctx context.Context) error {
	return w.consumer.Start(ctx)
}

// Name reports the worker name for the manager's log lines.
func (w *BlogGeneratorWorker) Name() string {
	return "github-blog-generator-worker"
}
```

### B5.3 Verify

```bash
cd /Users/shubh/Workspaces/growth-tools/base-server
go build ./...
go test ./internal/workers/ -run 'TestBlogGeneratorWorker_Handle' -v
# Expected: all sub-tests PASS
```

### B5.4 Commit

```bash
cd /Users/shubh/Workspaces/growth-tools
git add base-server/internal/workers/github_blog.go base-server/internal/workers/github_blog_test.go
git commit -m "feat(workers): add BlogGeneratorWorker consuming github.blog.generate"
```

---

## Task B6 — Bootstrap wiring

### B6.1 Wire processor + worker

**File:** `base-server/internal/infra/bootstrap/processors.go`

1. Add field to `procs`:

```go
// within type procs struct, after draftGen:
blogGen     githubProcessor.BlogDraftGenerator
```

2. Add construction after the `p.draftGen = ...` line:

```go
// Blog draft generator: consumes github.blog.generate, fetches the full
// commit diff from GitHub + capture screenshots from S3, calls Gemini,
// and persists a draft blog_posts row. cl.ghClient implements
// GetCommitDiff; cl.gemini implements aiclient.Client.
p.blogGen = githubProcessor.NewBlogDraftGenerator(s, cl.gemini, cl.s3Fetch, cl.ghClient, logger)
```

**File:** `base-server/internal/infra/bootstrap/workers.go`

1. After the `draftGeneratorWorker` declaration add:

```go
// Blog generator: consumes github.blog.generate, calls Gemini with the
// full diff + capture screenshots, persists a blog_posts draft.
blogGeneratorWorker := workers.NewBlogGeneratorWorker(cfg.Kafka.Brokers, cfg.Kafka.ConsumerGroup, &p.blogGen, logger)
```

2. After `deps.WorkerManager.Register(draftGeneratorWorker)` add:

```go
deps.WorkerManager.Register(blogGeneratorWorker)
```

### B6.2 Verify

```bash
cd /Users/shubh/Workspaces/growth-tools/base-server
go build ./...
go vet ./...
go test ./... -short
# Expected: all pass; no new failures.
```

### B6.3 Commit

```bash
cd /Users/shubh/Workspaces/growth-tools
git add base-server/internal/infra/bootstrap/processors.go base-server/internal/infra/bootstrap/workers.go
git commit -m "feat(bootstrap): wire BlogDraftGenerator and BlogGeneratorWorker"
```

---

## Task F1 — Hook: `useDeleteBlog`

**File:** `webapp/src/hooks/useDeleteBlog.ts`

```ts
import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage } from "@/utils/errorHandler";

export const useDeleteBlog = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const deleteBlog = useCallback(async (id: string): Promise<void> => {
		setLoading(true);
		setError(null);
		try {
			await fetcher<void>(
				`${import.meta.env.VITE_API_URL}/api/protected/blog/${id}`,
				{ method: "DELETE" },
			);
		} catch (err: unknown) {
			const message = getErrorMessage(err);
			setError(message);
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	return { deleteBlog, loading, error };
};
```

**Verify:**

```bash
cd /Users/shubh/Workspaces/growth-tools/webapp
npm run lint -- src/hooks/useDeleteBlog.ts
npx tsc --noEmit
# Expected: no errors.
```

**Commit:**

```bash
cd /Users/shubh/Workspaces/growth-tools
git add webapp/src/hooks/useDeleteBlog.ts
git commit -m "feat(webapp): add useDeleteBlog hook"
```

---

## Task F2 — Blog list page: posts-style redesign

### F2.1 CSS module

**File:** `webapp/src/routes/blog.module.scss`

Copy the entire contents of `webapp/src/routes/posts.module.scss` verbatim. The class names used by the page are already aligned.

### F2.2 Page component

**File:** `webapp/src/routes/blog.tsx` (replace entire file)

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Globe, Plus, SearchX, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { useDeleteBlog } from "@/hooks/useDeleteBlog";
import { usePublishBlog } from "@/hooks/usePublishBlog";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Dropdown } from "@/proto-design-system/components/overlays/Dropdown";
import { Modal } from "@/proto-design-system/components/overlays/Modal";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { BlogStatus } from "@/types/blog";
import styles from "./blog.module.scss";

export const Route = createFileRoute("/blog")({
	component: BlogPage,
});

const STATUS_ITEMS = [
	{ id: "", label: "All Statuses" },
	{ id: "draft", label: "Draft" },
	{ id: "published", label: "Published" },
	{ id: "archived", label: "Archived" },
];

const STATUS_BADGE_VARIANT: Record<
	BlogStatus,
	"default" | "success" | "secondary"
> = {
	draft: "default",
	published: "success",
	archived: "secondary",
};

const STATUS_LABELS: Record<BlogStatus, string> = {
	draft: "Draft",
	published: "Published",
	archived: "Archived",
};

function timeAgo(iso: string): string {
	const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return new Date(iso).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
}

function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	const truncated = text.slice(0, maxLen);
	const lastSpace = truncated.lastIndexOf(" ");
	return (
		(lastSpace > maxLen * 0.6 ? truncated.slice(0, lastSpace) : truncated) +
		"..."
	);
}

function BlogPage() {
	const [statusFilter, setStatusFilter] = useState<string>("");

	const filters = useMemo(
		() => ({
			status: (statusFilter || undefined) as BlogStatus | undefined,
		}),
		[statusFilter],
	);

	const { blogPosts: allPosts } = useBlogPosts();
	const { blogPosts, loading, refetch } = useBlogPosts(filters);
	const { deleteBlog, loading: deleting } = useDeleteBlog();
	const { publishBlog, loading: publishing } = usePublishBlog();
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

	const handleDeleteConfirm = useCallback(async () => {
		if (!deleteTargetId) return;
		try {
			await deleteBlog(deleteTargetId);
			setDeleteTargetId(null);
			refetch();
		} catch {
			// error surfaced via hook state
		}
	}, [deleteTargetId, deleteBlog, refetch]);

	const handlePublish = async (id: string) => {
		try {
			await publishBlog(id);
			refetch();
		} catch {
			// error surfaced via hook state
		}
	};

	const hasActiveFilter = statusFilter !== "";
	const postCount = allPosts.length;
	const publishedCount = allPosts.filter((p) => p.status === "published").length;
	const draftCount = allPosts.filter((p) => p.status === "draft").length;

	return (
		<Stack gap="lg" className={styles.page} animate>
			<Stack direction="row" justify="between" align="start" wrap>
				<Stack gap="xs">
					<Text as="h1" size="2xl" weight="bold">
						Blog
					</Text>
					<Text color="muted">Write and manage your long-form blog posts</Text>
				</Stack>
				<Link to="/blog/new">
					<Button variant="primary">
						<Plus size={16} /> New Post
					</Button>
				</Link>
			</Stack>

			<div className={styles.stats}>
				<div className={styles.statItem}>
					<Text size="2xl" weight="bold">
						{postCount}
					</Text>
					<Text size="xs" color="muted">
						Total
					</Text>
				</div>
				<div className={styles.statDivider} />
				<div className={styles.statItem}>
					<Text size="2xl" weight="bold">
						{publishedCount}
					</Text>
					<Text size="xs" color="muted">
						Published
					</Text>
				</div>
				<div className={styles.statDivider} />
				<div className={styles.statItem}>
					<Text size="2xl" weight="bold">
						{draftCount}
					</Text>
					<Text size="xs" color="muted">
						Drafts
					</Text>
				</div>
			</div>

			<div className={styles.filters}>
				<Dropdown
					items={STATUS_ITEMS}
					value={statusFilter}
					onChange={setStatusFilter}
					placeholder="Filter by status"
					size="sm"
					variant="outline"
				/>
			</div>

			<div className={styles.content}>
				{loading ? (
					<div className={styles.loadingState}>
						<Spinner />
					</div>
				) : blogPosts.length === 0 && hasActiveFilter ? (
					<EmptyState
						title="No matching posts"
						description="Try adjusting your filters to find what you're looking for."
						icon={<SearchX size={48} />}
						action={
							<Button variant="secondary" onClick={() => setStatusFilter("")}>
								Clear filters
							</Button>
						}
					/>
				) : blogPosts.length === 0 ? (
					<EmptyState
						title="No blog posts yet"
						description="Create your first blog post to share long-form content."
						icon={<FileText size={48} />}
						action={
							<Link to="/blog/new">
								<Button variant="primary">
									<Plus size={16} /> New Post
								</Button>
							</Link>
						}
					/>
				) : (
					<Stack gap="xs">
						{blogPosts.map((post, index) => (
							<motion.div
								key={post.id}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.2, delay: index * 0.03 }}
							>
								<Link
									to="/blog/$id"
									params={{ id: post.id }}
									className={styles.postLink}
								>
									<div className={styles.postCard}>
										<div className={styles.postCardLeft}>
											<div className={styles.postIcon}>
												<FileText size={16} />
											</div>
										</div>
										<div className={styles.postCardBody}>
											<div className={styles.postTitleRow}>
												<Text
													size="sm"
													weight="medium"
													className={styles.postTitle}
												>
													{truncate(post.title, 80)}
												</Text>
												<Badge
													variant={STATUS_BADGE_VARIANT[post.status]}
													size="sm"
												>
													{STATUS_LABELS[post.status]}
												</Badge>
											</div>
											{post.excerpt && (
												<Text size="xs" color="muted">
													{truncate(post.excerpt, 160)}
												</Text>
											)}
											{post.keywords.length > 0 && (
												<div className={styles.postTags}>
													{post.keywords.slice(0, 4).map((kw) => (
														<span key={kw} className={styles.tag}>
															{kw}
														</span>
													))}
													{post.keywords.length > 4 && (
														<span className={styles.tag}>
															+{post.keywords.length - 4}
														</span>
													)}
												</div>
											)}
											<div className={styles.postFooter}>
												<div className={styles.postMeta}>
													<span className={styles.metaItem}>
														{post.publishedAt
															? `Published ${timeAgo(post.publishedAt)}`
															: timeAgo(post.createdAt)}
													</span>
												</div>
												<div className={styles.postActions}>
													{post.status === "draft" && (
														<Button
															variant="primary"
															size="sm"
															isIconOnly
															onClick={(e) => {
																e.preventDefault();
																e.stopPropagation();
																handlePublish(post.id);
															}}
															isLoading={publishing}
															aria-label="Publish blog post"
														>
															<Globe size={14} />
														</Button>
													)}
													{post.status !== "published" && (
														<Button
															variant="ghost"
															size="sm"
															isIconOnly
															onClick={(e) => {
																e.preventDefault();
																e.stopPropagation();
																setDeleteTargetId(post.id);
															}}
															aria-label="Delete blog post"
														>
															<Trash2 size={14} />
														</Button>
													)}
												</div>
											</div>
										</div>
									</div>
								</Link>
							</motion.div>
						))}
					</Stack>
				)}
			</div>

			<Modal
				isOpen={deleteTargetId !== null}
				onClose={() => setDeleteTargetId(null)}
				title="Delete blog post"
				size="sm"
				footer={
					<Stack direction="row" gap="sm" justify="end">
						<Button variant="ghost" onClick={() => setDeleteTargetId(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDeleteConfirm}
							isLoading={deleting}
						>
							Delete
						</Button>
					</Stack>
				}
			>
				<Text color="secondary">
					Are you sure you want to delete this blog post? This action cannot be
					undone.
				</Text>
			</Modal>
		</Stack>
	);
}
```

### F2.3 Verify

```bash
cd /Users/shubh/Workspaces/growth-tools/webapp
npm run lint
npm run lint:scss
npm run build
# Expected: build succeeds, no lint errors.
```

### F2.4 Commit

```bash
cd /Users/shubh/Workspaces/growth-tools
git add webapp/src/routes/blog.tsx webapp/src/routes/blog.module.scss
git commit -m "feat(webapp): redesign blog list page with stats, dropdown filters, inline actions"
```

---

## Task F3 — Blog detail page: combined view/edit

This task replaces `routes/blog_.$id.tsx` with a **combined view/edit page** that mirrors the `posts_.$id.tsx` pattern (which delegates to a wizard with a readOnly toggle): a single component owns both modes, toggled by local state. In view mode the rendered markdown is shown with publish/delete/edit actions. In edit mode the existing `BlogPostForm` is rendered pre-filled with the loaded post, with save/cancel actions in the header. On save the page switches back to view mode without navigating away. There is **no separate read-only viewer file** — this single file handles both modes.

### F3.1 Install `rehype-highlight`

`remark-gfm` and `react-markdown` are already in `webapp/package.json`. Only `rehype-highlight` needs to be added.

```bash
cd /Users/shubh/Workspaces/growth-tools/webapp
npm install rehype-highlight
```

Verify the new entry lands in `webapp/package.json` under `dependencies` (version resolved by npm).

Highlight.js themes: `rehype-highlight` relies on a highlight.js CSS theme being loaded for code-block colours. Import the default theme once at the top of the detail page:

```ts
import "highlight.js/styles/github.css";
```

The `highlight.js` package ships as a transitive dependency of `rehype-highlight`, so no additional install is needed for the stylesheet import.

### F3.2 Append `.markdown` class to `webapp/src/routes/editor.module.scss`

Only if the class is not already present. Skip if it is.

```scss
.markdown {
  max-width: 72ch;
  color: var(--color-base-content);
  line-height: var(--line-height-relaxed);

  h1, h2, h3, h4 {
    margin-top: var(--space-6);
    margin-bottom: var(--space-3);
    font-weight: var(--font-weight-semibold);
    color: var(--color-base-content);
  }

  p {
    margin-bottom: var(--space-4);
  }

  code {
    background: var(--color-base-100);
    padding: var(--space-0-5) var(--space-1);
    border-radius: var(--radius-sm);
    font-family: var(--font-family-mono);
    font-size: 0.9em;
  }

  pre {
    background: var(--color-base-100);
    padding: var(--space-4);
    border-radius: var(--radius-md);
    overflow-x: auto;

    code {
      background: transparent;
      padding: 0;
    }
  }

  ul, ol {
    margin-bottom: var(--space-4);
    padding-left: var(--space-6);
  }

  li {
    margin-bottom: var(--space-1);
  }

  table {
    border-collapse: collapse;
    margin-bottom: var(--space-4);

    th, td {
      border: 1px solid var(--color-border);
      padding: var(--space-2) var(--space-3);
    }

    th {
      background: var(--color-base-100);
      font-weight: var(--font-weight-semibold);
    }
  }
}
```

### F3.3 Page component (replace entire file)

**File:** `webapp/src/routes/blog_.$id.tsx`

```tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import "highlight.js/styles/github.css";
import { Edit, Globe, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import {
	BlogPostForm,
	type BlogPostFormData,
} from "@/components/blog/BlogPostForm";
import { useDeleteBlog } from "@/hooks/useDeleteBlog";
import { useGetBlogPost } from "@/hooks/useGetBlogPost";
import { usePublishBlog } from "@/hooks/usePublishBlog";
import { useUpdateBlogPost } from "@/hooks/useUpdateBlogPost";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Modal } from "@/proto-design-system/components/overlays/Modal";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { BlogPost } from "@/types/blog";
import styles from "./editor.module.scss";

export const Route = createFileRoute("/blog_/$id")({
	component: BlogDetailPage,
});

/**
 * Maps a loaded BlogPost onto the shape BlogPostForm expects.
 * Keywords are joined with ", " because BlogPostForm treats keywords as
 * a comma-separated string (its `collectFormData` splits on ",").
 */
function toFormData(bp: BlogPost): BlogPostFormData {
	return {
		title: bp.title,
		slug: bp.slug,
		content: bp.content,
		excerpt: bp.excerpt ?? "",
		seoTitle: bp.seoTitle ?? "",
		metaDescription: bp.metaDescription ?? "",
		ogTitle: bp.ogTitle ?? "",
		ogDescription: bp.ogDescription ?? "",
		keywords: bp.keywords.join(", "),
	};
}

function BlogDetailPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const {
		blogPost,
		loading: fetching,
		error: fetchError,
		refetch,
	} = useGetBlogPost(id);
	const { publishBlog, loading: publishing } = usePublishBlog();
	const { deleteBlog, loading: deleting } = useDeleteBlog();
	const { updateBlogPost, loading: saving } = useUpdateBlogPost();

	const [isEditing, setIsEditing] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	const handlePublish = useCallback(async () => {
		await publishBlog(id);
		navigate({ to: "/blog" });
	}, [id, publishBlog, navigate]);

	const handleDelete = useCallback(async () => {
		await deleteBlog(id);
		setConfirmDelete(false);
		navigate({ to: "/blog" });
	}, [id, deleteBlog, navigate]);

	const handleSaveDraft = useCallback(
		async (data: BlogPostFormData) => {
			await updateBlogPost(id, {
				title: data.title,
				slug: data.slug,
				content: data.content,
				excerpt: data.excerpt || undefined,
				seo_title: data.seoTitle || undefined,
				meta_description: data.metaDescription || undefined,
				keywords: data.keywords
					? data.keywords
							.split(",")
							.map((k) => k.trim())
							.filter(Boolean)
					: undefined,
				og_title: data.ogTitle || undefined,
				og_description: data.ogDescription || undefined,
			});
			setIsEditing(false);
			refetch();
		},
		[id, updateBlogPost, refetch],
	);

	const handleSaveAndPublish = useCallback(
		async (data: BlogPostFormData) => {
			await updateBlogPost(id, {
				title: data.title,
				slug: data.slug,
				content: data.content,
				excerpt: data.excerpt || undefined,
				seo_title: data.seoTitle || undefined,
				meta_description: data.metaDescription || undefined,
				keywords: data.keywords
					? data.keywords
							.split(",")
							.map((k) => k.trim())
							.filter(Boolean)
					: undefined,
				og_title: data.ogTitle || undefined,
				og_description: data.ogDescription || undefined,
			});
			await publishBlog(id);
			navigate({ to: "/blog" });
		},
		[id, updateBlogPost, publishBlog, navigate],
	);

	if (fetching) return <Spinner />;
	if (fetchError) return <Alert variant="error">{fetchError}</Alert>;
	if (!blogPost) return <Alert variant="warning">Blog post not found.</Alert>;

	// ------------------------------------------------------------------
	// Edit mode: header shows Cancel; the form itself provides Save/Publish
	// buttons via its built-in onSaveDraft / onPublish props.
	// ------------------------------------------------------------------
	if (isEditing) {
		return (
			<motion.div
				className={styles.editor}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
			>
				<Stack gap="md">
					<Stack direction="row" justify="between" align="center" wrap>
						<Stack gap="xs">
							<Text as="h1" size="2xl" weight="bold">
								Edit blog post
							</Text>
							<Text size="sm" color="muted">
								/{blogPost.slug}
							</Text>
						</Stack>
						<Button
							variant="ghost"
							onClick={() => setIsEditing(false)}
							aria-label="Cancel edit"
						>
							<X size={16} /> Cancel
						</Button>
					</Stack>
					<BlogPostForm
						initialData={toFormData(blogPost)}
						onSaveDraft={handleSaveDraft}
						onPublish={handleSaveAndPublish}
						loading={saving || publishing}
					/>
				</Stack>
			</motion.div>
		);
	}

	// ------------------------------------------------------------------
	// View mode: rendered markdown + header actions (Edit/Publish/Delete).
	// ------------------------------------------------------------------
	return (
		<motion.div
			className={styles.editor}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.4 }}
		>
			<Stack gap="md">
				<Stack direction="row" justify="between" align="start" wrap>
					<Stack gap="xs">
						<Stack direction="row" gap="sm" align="center">
							<Text as="h1" size="2xl" weight="bold">
								{blogPost.title}
							</Text>
							<Badge
								variant={
									blogPost.status === "published"
										? "success"
										: blogPost.status === "archived"
											? "secondary"
											: "default"
								}
							>
								{blogPost.status}
							</Badge>
						</Stack>
						<Text size="sm" color="muted">
							/{blogPost.slug}
						</Text>
						{blogPost.publishedAt && (
							<Text size="xs" color="muted">
								Published {new Date(blogPost.publishedAt).toLocaleString()}
							</Text>
						)}
					</Stack>
					<Stack direction="row" gap="sm">
						<Button
							variant="secondary"
							onClick={() => setIsEditing(true)}
						>
							<Edit size={16} /> Edit
						</Button>
						{blogPost.status !== "published" && (
							<Button
								variant="primary"
								onClick={handlePublish}
								isLoading={publishing}
							>
								<Globe size={16} /> Publish
							</Button>
						)}
						<Button
							variant="ghost"
							onClick={() => setConfirmDelete(true)}
							aria-label="Delete"
						>
							<Trash2 size={16} />
						</Button>
					</Stack>
				</Stack>

				{blogPost.excerpt && (
					<Text color="secondary" size="sm">
						{blogPost.excerpt}
					</Text>
				)}

				{blogPost.keywords.length > 0 && (
					<Stack direction="row" gap="xs" wrap>
						{blogPost.keywords.map((kw) => (
							<Badge key={kw} variant="outline" size="sm">
								{kw}
							</Badge>
						))}
					</Stack>
				)}

				<div className={styles.markdown}>
					<ReactMarkdown
						remarkPlugins={[remarkGfm]}
						rehypePlugins={[rehypeHighlight]}
					>
						{blogPost.content}
					</ReactMarkdown>
				</div>
			</Stack>

			<Modal
				isOpen={confirmDelete}
				onClose={() => setConfirmDelete(false)}
				title="Delete blog post"
				size="sm"
				footer={
					<Stack direction="row" gap="sm" justify="end">
						<Button variant="ghost" onClick={() => setConfirmDelete(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							isLoading={deleting}
						>
							Delete
						</Button>
					</Stack>
				}
			>
				<Text color="secondary">
					Are you sure you want to delete this blog post? This action cannot be
					undone.
				</Text>
			</Modal>
		</motion.div>
	);
}
```

**Notes for the executing agent:**

- `useGetBlogPost` already exposes `{ blogPost, loading, error, refetch }` — the refetch call after save keeps the view mode in sync with the saved content without a navigation.
- `BlogPostForm` owns its internal form state seeded from `initialData`; when the user clicks its "Save Draft" button it calls `onSaveDraft(data)` and when it clicks "Publish" it calls `onPublish(data)`. No separate submit handling is needed in this page.
- Do **not** create a new read-only viewer file. This single file is both viewer and editor — any existing separate detail/viewer component must be removed if present.
- Keywords round-trip: `BlogPost.keywords` is `string[]`; `BlogPostFormData.keywords` is a comma-separated `string`. `toFormData` joins with ", " and the save handlers split on ",".

### F3.4 Verify

```bash
cd /Users/shubh/Workspaces/growth-tools/webapp
npm run lint
npm run lint:scss
npx tsc --noEmit
npm run build
# Expected: build succeeds, no lint errors. TypeScript compiles cleanly —
# rehype-highlight + remark-gfm types resolve from their own packages.
```

Manual smoke (once backend is running):

1. Navigate to `/blog/{id}` for an existing draft.
2. Confirm rendered markdown shows tables / task lists / fenced code with syntax highlighting (GFM + highlight.js).
3. Click Edit; confirm the form is pre-filled with title, slug, content, excerpt, keywords.
4. Change the title, click "Save Draft"; confirm the page returns to view mode and shows the updated title + content immediately (via `refetch`).
5. Click Edit again, click "Publish" in the form; confirm a redirect to `/blog` and the post now shows as published.
6. Back on the detail page for a draft, click Publish in the header; confirm redirect to `/blog` and status change.
7. Click Delete; confirm modal, confirm deletion, confirm redirect.

### F3.5 Commit

```bash
cd /Users/shubh/Workspaces/growth-tools
git add webapp/package.json webapp/package-lock.json \
        webapp/src/routes/blog_.\$id.tsx \
        webapp/src/routes/editor.module.scss
git commit -m "feat(webapp): combined view/edit blog detail with GFM + highlight markdown"
```

---

## Task F4 — Final whole-project verification

```bash
cd /Users/shubh/Workspaces/growth-tools/base-server
go build ./...
go vet ./...
go test ./... -short
# Expected: all green.

cd /Users/shubh/Workspaces/growth-tools/webapp
npm run lint
npm run lint:scss
npm run build
# Expected: build succeeds, no lint errors.
```

No additional commit needed.

---

## Post-merge Verification (manual)

1. `make dev-up` + `go run main.go` in `base-server/`.
2. `npm run dev` in `webapp/`.
3. Connect a GitHub repo via the `/github` page; push a visible-change commit.
4. Wait for capture-worker to finish (or use `/test-login` + synthetic push).
5. Observe new row appear in `/blog` with status draft and the inline Publish/Delete buttons.
6. Click the post; verify markdown renders, Publish moves it to published status, Delete removes it from the list.

---

## Self-review checklist

- [x] Migration version is real (`V0049`).
- [x] Every store method includes full struct, SQL constant, Go method body.
- [x] Every processor task includes error variables, interface definitions, full function bodies.
- [x] Every worker task includes full file contents.
- [x] Bootstrap wiring references the exact variable names from existing code (`p.draftGen`, `cl.s3Fetch`, `cl.ghClient`, `cl.gemini`).
- [x] Kafka topic name matches the design spec exactly (`github.blog.generate`).
- [x] Frontend tasks embed the full JSX and point to existing design-system component paths verified in `webapp/src/proto-design-system/components/*`.
- [x] Every task has explicit verify + commit steps.
- [x] `react-markdown` and `remark-gfm` are already in `webapp/package.json` (verified); F3.1 installs the missing `rehype-highlight`.
- [x] Slug resolution is a single DB lookup + UUID-suffix fallback — no retry loop, no `attempt-count` cap.
- [x] Blog detail route is a single combined view/edit component mirroring `posts_.$id.tsx` — no separate read-only viewer file is introduced.
- [x] `toFormData` helper bridges `BlogPost.keywords: string[]` and `BlogPostFormData.keywords: string`; save handlers split on "," back to `string[]` for the API request.
- [x] Video frames remain out of scope — Gemini input is diff + screenshots only, unchanged from the original plan.
- [x] No task references an unresolved "pattern" — everything is embedded.
