package processor

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"testing"

	"base-server/internal/ai/commitclassifier"
	"base-server/internal/ai/mediadescriber"
	"base-server/internal/ai/mediaplanner"
	"base-server/internal/ai/socialposts"
	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	postsProc "base-server/internal/posts/processor"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

// plannerStubAIClient answers describer/generator CreateMessage calls with
// fixed text and the media-planner's CreateJSONMessage with plannerJSON.
type plannerStubAIClient struct {
	plannerJSON string
}

func (c *plannerStubAIClient) CreateMessage(_ context.Context, _ string, _ []aiclient.Message, _ int) (string, error) {
	return "generated post content", nil
}

func (c *plannerStubAIClient) CreateJSONMessage(_ context.Context, _ string, _ []aiclient.Message, _ int) (string, error) {
	return c.plannerJSON, nil
}

func (c *plannerStubAIClient) StreamMessage(_ context.Context, _ string, _ []aiclient.Message, _ int, _ func(string)) error {
	return errors.New("not implemented in stub")
}

func newTestDraftGenerator(t *testing.T, ai fullAIClient, ds *MockDraftStore, pd *MockPostsDrafter, s3h *MockS3HeadClient, s3f *MockS3Fetcher) DraftGenerator {
	t.Helper()
	logger := observability.NewLogger()
	return NewDraftGenerator(
		ds,
		commitclassifier.New(ai, logger),
		mediadescriber.New(ai, logger),
		mediaplanner.New(ai, logger),
		socialposts.New(ai, logger),
		pd, s3h, s3f, "bucket", logger,
	)
}

func TestDraftGenerator_GenerateDraftFromCommit_PoolsAllCaptures(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	ds := NewMockDraftStore(ctrl)
	pd := NewMockPostsDrafter(ctrl)
	s3h := NewMockS3HeadClient(ctrl)
	s3f := NewMockS3Fetcher(ctrl)

	accountID := uuid.New()
	commitID := uuid.New()
	postID := uuid.New()
	keys := []string{
		"captures/abc/demo/recording.mp4",
		"captures/abc/storybook/Badge--primitives-badge--default.png",
		"captures/abc/storybook/Badge--primitives-badge--primary.png",
	}
	uploaded := make([]map[string]string, 0, len(keys))
	for _, k := range keys {
		uploaded = append(uploaded, map[string]string{"key": k})
	}
	raw, err := json.Marshal(map[string]any{"uploaded": uploaded})
	require.NoError(t, err)
	rawMsg := json.RawMessage(raw)

	ds.EXPECT().GetGitHubCommitForDraft(gomock.Any(), commitID).Return(store.GitHubCommitForDraft{
		ID: commitID, SHA: "abc", Message: "feat(badge): pulse", CaptureOutput: &rawMsg,
		AccountID: accountID, RepoOwner: "acme", RepoName: "ui",
	}, nil)
	ds.EXPECT().ListPlatformConnectionsByAccount(gomock.Any(), accountID).
		Return([]store.PlatformConnection{{Platform: "x", Status: "active"}}, nil)
	for _, k := range keys {
		s3f.EXPECT().GetFile(gomock.Any(), k).Return(io.NopCloser(strings.NewReader("bytes")), "", nil)
	}
	s3h.EXPECT().HeadObject(gomock.Any(), gomock.Any()).Return(int64(5), "", nil).Times(len(keys))

	// Media rows are created in describer order: video, then images.
	ids := []uuid.UUID{uuid.New(), uuid.New(), uuid.New()}
	for i, k := range keys {
		ds.EXPECT().CreateMedia(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, p store.CreateMediaParams) (store.Media, error) {
				assert.Equal(t, k, p.S3Key)
				return store.Media{ID: ids[i]}, nil
			})
	}

	pd.EXPECT().SaveDraft(gomock.Any(), gomock.Any()).
		DoAndReturn(func(_ context.Context, p postsProc.SaveDraftParams) (store.Post, error) {
			// Planner kept only index 3 -> only that capture publishes.
			assert.Equal(t, store.UUIDArray{ids[2]}, p.MediaIDs)
			return store.Post{ID: postID}, nil
		})
	ds.EXPECT().SetPostCaptureMediaIDs(gomock.Any(), postID, store.UUIDArray(ids)).Return(nil)
	ds.EXPECT().UpdateGitHubCommitPostID(gomock.Any(), commitID, postID).Return(nil)

	ai := &plannerStubAIClient{plannerJSON: `{"keep_indexes":[3],"mode":"single","thread_parts":0,"reason":"test"}`}
	g := newTestDraftGenerator(t, ai, ds, pd, s3h, s3f)
	require.NoError(t, g.GenerateDraftFromCommit(context.Background(), commitID))
}

func TestDraftGenerator_RegenerateDraftWithMedia(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	postID := uuid.New()
	idA, idB, idC := uuid.New(), uuid.New(), uuid.New()
	pool := store.UUIDArray{idA, idB, idC}
	draftPost := store.Post{
		ID: postID, AccountID: accountID, Status: store.PostStatusDraft,
		ContentType: store.ContentTypeText, CaptureMediaIDs: pool,
	}

	tests := []struct {
		name     string
		selected []uuid.UUID
		mocks    func(t *testing.T, ds *MockDraftStore, pd *MockPostsDrafter, s3f *MockS3Fetcher)
		wantErr  error
	}{
		{
			name:     "empty selection is rejected before any lookup",
			selected: nil,
			mocks:    func(*testing.T, *MockDraftStore, *MockPostsDrafter, *MockS3Fetcher) {},
			wantErr:  ErrRegenerateNoMedia,
		},
		{
			name:     "post not found",
			selected: []uuid.UUID{idA},
			mocks: func(_ *testing.T, ds *MockDraftStore, _ *MockPostsDrafter, _ *MockS3Fetcher) {
				ds.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(store.Post{}, store.ErrNotFound)
			},
			wantErr: ErrRegeneratePostNotFound,
		},
		{
			name:     "non-draft post is rejected",
			selected: []uuid.UUID{idA},
			mocks: func(_ *testing.T, ds *MockDraftStore, _ *MockPostsDrafter, _ *MockS3Fetcher) {
				p := draftPost
				p.Status = store.PostStatusPublished
				ds.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(p, nil)
			},
			wantErr: ErrRegenerateNotDraft,
		},
		{
			name:     "media outside the capture pool is rejected",
			selected: []uuid.UUID{idA, uuid.New()},
			mocks: func(_ *testing.T, ds *MockDraftStore, _ *MockPostsDrafter, _ *MockS3Fetcher) {
				ds.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(draftPost, nil)
			},
			wantErr: ErrRegenerateMediaNotInPool,
		},
		{
			name:     "post without a source commit is unsupported",
			selected: []uuid.UUID{idA},
			mocks: func(_ *testing.T, ds *MockDraftStore, _ *MockPostsDrafter, _ *MockS3Fetcher) {
				ds.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(draftPost, nil)
				ds.EXPECT().GetGitHubCommitForDraftByPostID(gomock.Any(), accountID, postID).
					Return(store.GitHubCommitForDraft{}, store.ErrNotFound)
			},
			wantErr: ErrRegenerateUnsupported,
		},
		{
			name:     "happy path regenerates with the selection in the requested order",
			selected: []uuid.UUID{idC, idA},
			mocks: func(t *testing.T, ds *MockDraftStore, pd *MockPostsDrafter, s3f *MockS3Fetcher) {
				ds.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(draftPost, nil)
				ds.EXPECT().GetGitHubCommitForDraftByPostID(gomock.Any(), accountID, postID).
					Return(store.GitHubCommitForDraft{
						ID: uuid.New(), SHA: "abc", Message: "feat(badge): pulse",
						AccountID: accountID, RepoOwner: "acme", RepoName: "ui",
					}, nil)
				ds.EXPECT().ListPlatformConnectionsByAccount(gomock.Any(), accountID).
					Return([]store.PlatformConnection{{Platform: "x", Status: "active"}}, nil)
				// Store returns rows in its own order; regenerate must follow
				// the requested order.
				ds.EXPECT().GetMediaByIDs(gomock.Any(), gomock.Any()).Return([]store.Media{
					{ID: idA, S3Key: "captures/abc/demo/recording.mp4", ContentType: "video/mp4"},
					{ID: idC, S3Key: "captures/abc/storybook/Badge--b.png", ContentType: "image/png"},
				}, nil)
				s3f.EXPECT().GetFile(gomock.Any(), "captures/abc/storybook/Badge--b.png").
					Return(io.NopCloser(strings.NewReader("png")), "", nil)
				s3f.EXPECT().GetFile(gomock.Any(), "captures/abc/demo/recording.mp4").
					Return(io.NopCloser(strings.NewReader("mp4")), "", nil)
				pd.EXPECT().UpdateDraft(gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, p postsProc.UpdateDraftParams) (store.Post, error) {
						assert.Equal(t, accountID, p.AccountID)
						assert.Equal(t, postID, p.PostID)
						assert.Equal(t, store.UUIDArray{idC, idA}, p.MediaIDs)
						assert.Equal(t, store.ContentTypeText, p.ContentType)
						assert.True(t, p.AIGenerated)
						assert.NotEmpty(t, p.Content)
						require.Len(t, p.Platforms, 1)
						assert.Equal(t, "x", p.Platforms[0].Platform)
						return store.Post{ID: postID}, nil
					})
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			ds := NewMockDraftStore(ctrl)
			pd := NewMockPostsDrafter(ctrl)
			s3h := NewMockS3HeadClient(ctrl)
			s3f := NewMockS3Fetcher(ctrl)
			tt.mocks(t, ds, pd, s3f)

			g := newTestDraftGenerator(t, &plannerStubAIClient{}, ds, pd, s3h, s3f)
			_, err := g.RegenerateDraftWithMedia(context.Background(), accountID, postID, tt.selected)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}
