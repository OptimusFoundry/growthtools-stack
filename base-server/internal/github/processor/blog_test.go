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

	aiblog "base-server/internal/ai/blog"
	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

// mockAIClient is a hand-rolled stub for aiclient.Client — the interface is
// in another package and not auto-generated here.
type mockAIClient struct {
	createFn func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
	lastImgs int
	lastUser string
	lastSys  string
}

func (m *mockAIClient) CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
	m.lastSys = systemPrompt
	if len(messages) > 0 {
		m.lastUser = messages[0].Content
		m.lastImgs = len(messages[0].Images)
	}
	if m.createFn != nil {
		return m.createFn(ctx, systemPrompt, messages, maxTokens)
	}
	return "", nil
}

func (m *mockAIClient) CreateJSONMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
	return m.CreateMessage(ctx, systemPrompt, messages, maxTokens)
}

func (m *mockAIClient) StreamMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
	return nil
}

func (m *mockAIClient) StreamJSONMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
	return nil
}

// aiAdapter wraps mockAIClient to satisfy aiclient.Client interface.
type aiAdapter struct{ m *mockAIClient }

func (a aiAdapter) CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
	return a.m.CreateMessage(ctx, systemPrompt, messages, maxTokens)
}

func (a aiAdapter) CreateJSONMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
	return a.m.CreateJSONMessage(ctx, systemPrompt, messages, maxTokens)
}

func (a aiAdapter) StreamMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
	return a.m.StreamMessage(ctx, systemPrompt, messages, maxTokens, onChunk)
}

func (a aiAdapter) StreamJSONMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
	return a.m.StreamJSONMessage(ctx, systemPrompt, messages, maxTokens, onChunk)
}

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

	happyJSON := `{"title":"Ship the blog pipeline","content":"# Ship the blog pipeline\n\nWe added an async blog generator that consumes Kafka events and produces drafts.\n\n## Architecture\n\nDetails here.","excerpt":"We added an async blog generator that consumes Kafka events and produces drafts.","seo_title":"Ship the blog pipeline","meta_description":"How we built an async blog generator.","keywords":["blog","kafka","generator"],"og_title":"Ship the blog pipeline","og_description":"How we built an async blog generator."}`
	happyMarkdown := happyJSON

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
				ai.createFn = func(_ context.Context, _ string, _ []aiclient.Message, _ int) (string, error) {
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
				ai.createFn = func(context.Context, string, []aiclient.Message, int) (string, error) {
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
				ai.createFn = func(context.Context, string, []aiclient.Message, int) (string, error) {
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
				ai.createFn = func(context.Context, string, []aiclient.Message, int) (string, error) { return happyMarkdown, nil }
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
				ai.createFn = func(context.Context, string, []aiclient.Message, int) (string, error) { return happyMarkdown, nil }
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
				ai.createFn = func(context.Context, string, []aiclient.Message, int) (string, error) { return happyMarkdown, nil }
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

func TestBlogJSONResponse_Parse(t *testing.T) {
	t.Parallel()

	t.Run("valid JSON response", func(t *testing.T) {
		t.Parallel()
		raw := `{"title":"My Title","content":"# My Title\n\nContent here.","excerpt":"Short summary.","seo_title":"SEO Title","meta_description":"Meta desc","keywords":["go","blog"],"og_title":"OG Title","og_description":"OG desc"}`
		var resp blogJSONResponse
		err := json.Unmarshal([]byte(raw), &resp)
		require.NoError(t, err)
		assert.Equal(t, "My Title", resp.Title)
		assert.Contains(t, resp.Content, "# My Title")
		assert.Equal(t, "Short summary.", resp.Excerpt)
		assert.Equal(t, "SEO Title", resp.SEOTitle)
		assert.Equal(t, []string{"go", "blog"}, resp.Keywords)
	})

	t.Run("invalid JSON returns error", func(t *testing.T) {
		t.Parallel()
		raw := "Just prose, no JSON."
		var resp blogJSONResponse
		err := json.Unmarshal([]byte(raw), &resp)
		require.Error(t, err)
	})
}

func TestBlogSystemPrompt_TeachesDiagrams(t *testing.T) {
	t.Parallel()
	assert.Contains(t, blogSystemPrompt, aiblog.DiagramGuide)
}
