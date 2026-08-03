package processor

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"testing"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

var branchNameRe = regexp.MustCompile(`^blog/([a-zA-Z0-9-]+)-([0-9a-f]{8})$`)

func TestGitHubProcessor_PublishBlogToSite(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	ownerUserID := uuid.New()

	post := store.BlogPost{
		ID:      uuid.New(),
		Title:   "My Great Post",
		Slug:    "my-great-post",
		Content: "some markdown body",
	}

	target := store.SitePublishTarget{
		ID:          uuid.New(),
		AccountID:   accountID,
		RepoOwner:   "acme",
		RepoName:    "site",
		BaseBranch:  "main",
		ContentPath: "src/content/blog",
	}

	account := store.Account{ID: accountID, OwnerUserID: ownerUserID}
	conn := store.GitHubConnection{ID: uuid.New(), UserID: ownerUserID, AccessToken: "gh-token"}

	tests := []struct {
		name    string
		post    store.BlogPost
		mocks   func(s *MockGitHubStore, c *MockGitHubClient)
		wantErr error
		wantURL string
		assert  func(t *testing.T, gotURL string, gotErr error)
	}{
		{
			name: "no site publish target configured – silent no-op",
			post: post,
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetSitePublishTargetByAccount(gomock.Any(), accountID).
					Return(store.SitePublishTarget{}, store.ErrNotFound)
				// No other store or client calls expected — strict controller
				// fails the test if any occur.
			},
			assert: func(t *testing.T, gotURL string, gotErr error) {
				require.NoError(t, gotErr)
				assert.Empty(t, gotURL)
			},
		},
		{
			name: "get site publish target unexpected error returns ErrSitePublishFailed",
			post: post,
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetSitePublishTargetByAccount(gomock.Any(), accountID).
					Return(store.SitePublishTarget{}, errors.New("db exploded"))
			},
			wantErr: ErrSitePublishFailed,
		},
		{
			name: "get account fails returns ErrGitHubNotConnected",
			post: post,
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetSitePublishTargetByAccount(gomock.Any(), accountID).
					Return(target, nil)
				s.EXPECT().GetAccountByID(gomock.Any(), accountID).
					Return(store.Account{}, errors.New("account not found"))
			},
			wantErr: ErrGitHubNotConnected,
		},
		{
			name: "get github connection fails returns ErrGitHubNotConnected",
			post: post,
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetSitePublishTargetByAccount(gomock.Any(), accountID).
					Return(target, nil)
				s.EXPECT().GetAccountByID(gomock.Any(), accountID).
					Return(account, nil)
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), ownerUserID).
					Return(store.GitHubConnection{}, store.ErrNotFound)
			},
			wantErr: ErrGitHubNotConnected,
		},
		{
			name: "media loading fails returns ErrSitePublishFailed, no github client calls",
			post: store.BlogPost{ID: post.ID, Title: post.Title, Slug: post.Slug, Content: post.Content, MediaIDs: store.UUIDArray{uuid.New()}},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetSitePublishTargetByAccount(gomock.Any(), accountID).
					Return(target, nil)
				s.EXPECT().GetAccountByID(gomock.Any(), accountID).
					Return(account, nil)
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), ownerUserID).
					Return(conn, nil)
				s.EXPECT().GetMediaByIDs(gomock.Any(), gomock.Any()).
					Return(nil, errors.New("media lookup failed"))
				// No GitHub client calls expected.
			},
			wantErr: ErrSitePublishFailed,
		},
		{
			name: "create branch fails returns ErrSitePublishFailed",
			post: post,
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetSitePublishTargetByAccount(gomock.Any(), accountID).
					Return(target, nil)
				s.EXPECT().GetAccountByID(gomock.Any(), accountID).
					Return(account, nil)
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), ownerUserID).
					Return(conn, nil)
				c.EXPECT().CreateBranch(gomock.Any(), "gh-token", "acme", "site", "main", gomock.Any()).
					Return(errors.New("branch create failed"))
			},
			wantErr: ErrSitePublishFailed,
		},
		{
			name: "create or update file contents fails returns ErrSitePublishFailed",
			post: post,
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetSitePublishTargetByAccount(gomock.Any(), accountID).
					Return(target, nil)
				s.EXPECT().GetAccountByID(gomock.Any(), accountID).
					Return(account, nil)
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), ownerUserID).
					Return(conn, nil)
				c.EXPECT().CreateBranch(gomock.Any(), "gh-token", "acme", "site", "main", gomock.Any()).
					Return(nil)
				c.EXPECT().CreateOrUpdateFileContents(gomock.Any(), "gh-token", "acme", "site", "src/content/blog/my-great-post.md", gomock.Any(), gomock.Any(), gomock.Any()).
					Return(errors.New("file write failed"))
			},
			wantErr: ErrSitePublishFailed,
		},
		{
			name: "create pull request fails returns ErrSitePublishFailed",
			post: post,
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetSitePublishTargetByAccount(gomock.Any(), accountID).
					Return(target, nil)
				s.EXPECT().GetAccountByID(gomock.Any(), accountID).
					Return(account, nil)
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), ownerUserID).
					Return(conn, nil)
				c.EXPECT().CreateBranch(gomock.Any(), "gh-token", "acme", "site", "main", gomock.Any()).
					Return(nil)
				c.EXPECT().CreateOrUpdateFileContents(gomock.Any(), "gh-token", "acme", "site", "src/content/blog/my-great-post.md", gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil)
				c.EXPECT().CreatePullRequest(gomock.Any(), "gh-token", "acme", "site", gomock.Any(), "main", gomock.Any(), gomock.Any()).
					Return("", 0, errors.New("pr create failed"))
			},
			wantErr: ErrSitePublishFailed,
		},
		{
			name: "happy path – full publish succeeds and auto-merges",
			post: post,
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetSitePublishTargetByAccount(gomock.Any(), accountID).
					Return(target, nil)
				s.EXPECT().GetAccountByID(gomock.Any(), accountID).
					Return(account, nil)
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), ownerUserID).
					Return(conn, nil)

				var branchName string
				c.EXPECT().CreateBranch(gomock.Any(), "gh-token", "acme", "site", "main", gomock.Any()).
					DoAndReturn(func(_ context.Context, _, _, _, _, newBranch string) error {
						branchName = newBranch
						return nil
					})
				c.EXPECT().CreateOrUpdateFileContents(gomock.Any(), "gh-token", "acme", "site", "src/content/blog/my-great-post.md", gomock.Any(), gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, _, _, _, _, branch string, _ []byte, commitMessage string) error {
						assert.Equal(t, branchName, branch, "file write branch must match created branch")
						assert.Contains(t, commitMessage, post.Title, "commit message must contain post title")
						return nil
					})
				c.EXPECT().CreatePullRequest(gomock.Any(), "gh-token", "acme", "site", gomock.Any(), "main", "Publish: My Great Post", gomock.Any()).
					DoAndReturn(func(_ context.Context, _, _, _, headBranch, _, _, _ string) (string, int, error) {
						assert.Equal(t, branchName, headBranch, "PR head branch must match created branch")
						return "https://github.com/acme/site/pull/42", 42, nil
					})
				c.EXPECT().MergePullRequest(gomock.Any(), "gh-token", "acme", "site", 42).
					Return(nil)
			},
			assert: func(t *testing.T, gotURL string, gotErr error) {
				require.NoError(t, gotErr)
				assert.Equal(t, "https://github.com/acme/site/pull/42", gotURL)
			},
		},
		{
			name: "auto-merge fails – publish still succeeds, PR URL still returned",
			post: post,
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetSitePublishTargetByAccount(gomock.Any(), accountID).
					Return(target, nil)
				s.EXPECT().GetAccountByID(gomock.Any(), accountID).
					Return(account, nil)
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), ownerUserID).
					Return(conn, nil)
				c.EXPECT().CreateBranch(gomock.Any(), "gh-token", "acme", "site", "main", gomock.Any()).
					Return(nil)
				c.EXPECT().CreateOrUpdateFileContents(gomock.Any(), "gh-token", "acme", "site", "src/content/blog/my-great-post.md", gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil)
				c.EXPECT().CreatePullRequest(gomock.Any(), "gh-token", "acme", "site", gomock.Any(), "main", "Publish: My Great Post", gomock.Any()).
					Return("https://github.com/acme/site/pull/42", 42, nil)
				c.EXPECT().MergePullRequest(gomock.Any(), "gh-token", "acme", "site", 42).
					Return(errors.New("merge conflict"))
			},
			assert: func(t *testing.T, gotURL string, gotErr error) {
				require.NoError(t, gotErr)
				assert.Equal(t, "https://github.com/acme/site/pull/42", gotURL)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			mockStore := NewMockGitHubStore(ctrl)
			mockClient := NewMockGitHubClient(ctrl)
			tt.mocks(mockStore, mockClient)

			proc := NewWithOAuth(mockStore, mockClient, NewMockEventPublisher(ctrl), testWebhookSecret, "client-id", "http://localhost", logger)

			gotURL, err := proc.PublishBlogToSite(context.Background(), accountID, tt.post)

			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				assert.Empty(t, gotURL)
				return
			}
			if tt.assert != nil {
				tt.assert(t, gotURL, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

// TestGitHubProcessor_PublishBlogToSite_BranchNameShape isolates the branch
// naming contract (blog/<slug>-<8-hex-suffix>) since it depends on a
// randomly generated suffix and can't be asserted with a fixed expectation.
func TestGitHubProcessor_PublishBlogToSite_BranchNameShape(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	ownerUserID := uuid.New()

	post := store.BlogPost{
		ID:      uuid.New(),
		Title:   "My Great Post",
		Slug:    "my-great-post",
		Content: "some markdown body",
	}
	target := store.SitePublishTarget{
		ID:          uuid.New(),
		AccountID:   accountID,
		RepoOwner:   "acme",
		RepoName:    "site",
		BaseBranch:  "main",
		ContentPath: "src/content/blog",
	}
	account := store.Account{ID: accountID, OwnerUserID: ownerUserID}
	conn := store.GitHubConnection{ID: uuid.New(), UserID: ownerUserID, AccessToken: "gh-token"}

	tests := []struct {
		name string
	}{
		{name: "branch name has blog/<slug>-<8hex> shape and is reused for all three calls"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			mockStore := NewMockGitHubStore(ctrl)
			mockClient := NewMockGitHubClient(ctrl)

			var seenBranches []string

			mockStore.EXPECT().GetSitePublishTargetByAccount(gomock.Any(), accountID).Return(target, nil)
			mockStore.EXPECT().GetAccountByID(gomock.Any(), accountID).Return(account, nil)
			mockStore.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), ownerUserID).Return(conn, nil)

			mockClient.EXPECT().CreateBranch(gomock.Any(), "gh-token", "acme", "site", "main", gomock.Any()).
				DoAndReturn(func(_ context.Context, _, _, _, _, newBranch string) error {
					seenBranches = append(seenBranches, newBranch)
					return nil
				})
			mockClient.EXPECT().CreateOrUpdateFileContents(gomock.Any(), "gh-token", "acme", "site", "src/content/blog/my-great-post.md", gomock.Any(), gomock.Any(), gomock.Any()).
				DoAndReturn(func(_ context.Context, _, _, _, _, branch string, _ []byte, _ string) error {
					seenBranches = append(seenBranches, branch)
					return nil
				})
			mockClient.EXPECT().CreatePullRequest(gomock.Any(), "gh-token", "acme", "site", gomock.Any(), "main", "Publish: My Great Post", gomock.Any()).
				DoAndReturn(func(_ context.Context, _, _, _, headBranch, _, _, _ string) (string, int, error) {
					seenBranches = append(seenBranches, headBranch)
					return "https://github.com/acme/site/pull/1", 1, nil
				})
			mockClient.EXPECT().MergePullRequest(gomock.Any(), "gh-token", "acme", "site", 1).
				Return(nil)

			proc := NewWithOAuth(mockStore, mockClient, NewMockEventPublisher(ctrl), testWebhookSecret, "client-id", "http://localhost", logger)
			prURL, err := proc.PublishBlogToSite(context.Background(), accountID, post)

			require.NoError(t, err)
			assert.Equal(t, "https://github.com/acme/site/pull/1", prURL)

			require.Len(t, seenBranches, 3)
			for _, b := range seenBranches {
				assert.True(t, strings.HasPrefix(b, "blog/my-great-post-"), "branch %q must have prefix blog/my-great-post-", b)
				assert.Regexp(t, branchNameRe, b, "branch %q must match blog/<slug>-<8hex> shape", b)
				assert.Equal(t, seenBranches[0], b, "same branch name must be used across all three calls")
			}
		})
	}
}

func TestBuildBlogMarkdown(t *testing.T) {
	t.Parallel()

	pubDate := mustParseTime(t, "2026-01-15")

	excerpt := "an excerpt"
	metaDesc := "a meta description"

	tests := []struct {
		name          string
		post          store.BlogPost
		media         []store.Media
		publicURLBase string
		assert        func(t *testing.T, got string)
	}{
		{
			name: "frontmatter includes title, pubDate, excerpt as description, tags, readingTime",
			post: store.BlogPost{
				Title:       "Hello World",
				Content:     strings.Repeat("word ", 250),
				Excerpt:     &excerpt,
				Keywords:    store.StringArray{"go", "testing"},
				PublishedAt: &pubDate,
			},
			publicURLBase: "https://example.com",
			assert: func(t *testing.T, got string) {
				assert.Contains(t, got, `title: "Hello World"`)
				assert.Contains(t, got, `pubDate: "2026-01-15"`)
				assert.Contains(t, got, `description: "an excerpt"`)
				assert.Contains(t, got, `tags: ["go", "testing"]`)
				assert.Contains(t, got, `readingTime: "2 min read"`)
			},
		},
		{
			name: "description falls back to meta_description when excerpt is nil",
			post: store.BlogPost{
				Title:           "No Excerpt",
				Content:         "short content",
				MetaDescription: &metaDesc,
			},
			publicURLBase: "https://example.com",
			assert: func(t *testing.T, got string) {
				assert.Contains(t, got, `description: "a meta description"`)
			},
		},
		{
			name: "description falls back to empty string when both excerpt and meta_description are nil",
			post: store.BlogPost{
				Title:   "No Description At All",
				Content: "short content",
			},
			publicURLBase: "https://example.com",
			assert: func(t *testing.T, got string) {
				assert.Contains(t, got, `description: ""`)
			},
		},
		{
			name: "body contains post content",
			post: store.BlogPost{
				Title:   "Body Test",
				Content: "this is the unique body content marker",
			},
			publicURLBase: "https://example.com",
			assert: func(t *testing.T, got string) {
				assert.Contains(t, got, "this is the unique body content marker")
			},
		},
		{
			name: "media S3 URLs are rewritten to public URLs and originals removed",
			post: store.BlogPost{
				Title:   "Media Post",
				Content: "Check out this image: https://s3.amazonaws.com/bucket/private/image.png and more text.",
			},
			media: []store.Media{
				{S3Key: "private/image.png", S3URL: "https://s3.amazonaws.com/bucket/private/image.png"},
			},
			publicURLBase: "https://cdn.example.com",
			assert: func(t *testing.T, got string) {
				assert.Contains(t, got, "https://cdn.example.com/public/media/file/private/image.png")
				assert.NotContains(t, got, "https://s3.amazonaws.com/bucket/private/image.png")
			},
		},
		{
			name: "no media items leaves content unchanged",
			post: store.BlogPost{
				Title:   "No Media",
				Content: "plain content with no urls to rewrite",
			},
			media:         nil,
			publicURLBase: "https://cdn.example.com",
			assert: func(t *testing.T, got string) {
				assert.Contains(t, got, "plain content with no urls to rewrite")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := buildBlogMarkdown(tt.post, tt.media, tt.publicURLBase)
			tt.assert(t, string(got))
		})
	}
}

func TestComputeReadingTime(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		wordCount int
		want      string
	}{
		{name: "0 words clamps to minimum 1 min read", wordCount: 0, want: "1 min read"},
		{name: "200 words rounds to 1 min read", wordCount: 200, want: "1 min read"},
		{name: "201 words rounds up to 2 min read", wordCount: 201, want: "2 min read"},
		{name: "400 words rounds to 2 min read", wordCount: 400, want: "2 min read"},
		{name: "401 words rounds up to 3 min read", wordCount: 401, want: "3 min read"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			content := strings.TrimSpace(strings.Repeat("word ", tt.wordCount))
			got := computeReadingTime(content)
			assert.Equal(t, tt.want, got)
		})
	}
}

// mustParseTime parses a YYYY-MM-DD date string for test fixtures.
func mustParseTime(t *testing.T, s string) time.Time {
	t.Helper()
	parsed, err := time.Parse("2006-01-02", s)
	require.NoError(t, err)
	return parsed
}
