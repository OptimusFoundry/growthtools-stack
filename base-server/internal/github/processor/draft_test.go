package processor

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"testing"

	contentProc "base-server/internal/content/processor"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	postsProc "base-server/internal/posts/processor"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

// expectMediaAssessedKeepAll sets up mock expectations for the
// fetch-media + AI-assessment step that happens before generation. It
// fetches the video (if videoKey != "") plus every image, then returns a
// decision that keeps everything in thread mode with 3 parts — the
// closest behavioural equivalent to the old "select all images" helper.
func expectMediaAssessedKeepAll(f *MockS3Fetcher, c *MockContentGenerator, videoKey string, imageKeys ...string) {
	if videoKey != "" {
		body := io.NopCloser(bytes.NewReader([]byte("fake-video-bytes")))
		f.EXPECT().GetFile(gomock.Any(), videoKey).Return(body, "video/mp4", nil)
	}
	for _, key := range imageKeys {
		body := io.NopCloser(bytes.NewReader([]byte("fake-image-bytes")))
		f.EXPECT().GetFile(gomock.Any(), key).Return(body, "image/png", nil)
	}
	indexes := make([]int, len(imageKeys))
	for i := range imageKeys {
		indexes[i] = i + 1
	}
	c.EXPECT().
		SelectMediaAndMode(gomock.Any(), gomock.Any(), gomock.Len(len(imageKeys)), gomock.Any()).
		Return(contentProc.MediaAndModeDecision{
			UseVideo:     videoKey != "",
			ImageIndexes: indexes,
			Mode:         "thread",
			ThreadParts:  3,
			Reason:       "test fixture keeps everything",
		}, nil)
}

// newDraftFixture returns a commit fixture with a single video + two images
// uploaded, ready for the happy-path test to exercise the whole pipeline.
func newDraftFixture(t *testing.T) (store.GitHubCommitForDraft, uuid.UUID) {
	t.Helper()
	accountID := uuid.New()
	commitID := uuid.New()
	capture := map[string]any{
		"uploaded": []map[string]string{
			{"key": "captures/abc/demo.mp4", "url": "s3://bucket/captures/abc/demo.mp4"},
			{"key": "captures/abc/step-1.png", "url": "s3://bucket/captures/abc/step-1.png"},
			{"key": "captures/abc/step-2.jpg", "url": "s3://bucket/captures/abc/step-2.jpg"},
		},
	}
	raw, err := json.Marshal(capture)
	require.NoError(t, err)
	rawMsg := json.RawMessage(raw)
	branch := "main"
	return store.GitHubCommitForDraft{
		ID:            commitID,
		SHA:           "abcdef0",
		Message:       "feat: ship the thing",
		Branch:        &branch,
		CaptureOutput: &rawMsg,
		AccountID:     accountID,
		RepoOwner:     "acme",
		RepoName:      "widget",
	}, accountID
}

func TestDraftGenerator_GenerateDraftFromCommit(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()

	tests := []struct {
		name    string
		mocks   func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher)
		wantErr error
	}{
		{
			name: "happy path creates media, generates threads, saves draft, links commit",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, accountID := newDraftFixture(t)

				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
				s.EXPECT().ListPlatformConnectionsByAccount(gomock.Any(), accountID).Return([]store.PlatformConnection{
					{Platform: "x", Status: "active"},
					{Platform: "bluesky", Status: "active"},
					{Platform: "threads", Status: "active"},
					{Platform: "linkedin", Status: "active"}, // filtered out — not in draftTargetPlatforms
					{Platform: "x", Status: "expired"},       // filtered out — not active
				}, nil)

				// The draft generator fetches each candidate image and asks
				// the AI which ones matter. Here we keep both.
				expectMediaAssessedKeepAll(f, c, "captures/abc/demo.mp4", "captures/abc/step-1.png", "captures/abc/step-2.jpg")

				// HEAD one video + the two selected images.
				h.EXPECT().HeadObject(gomock.Any(), "captures/abc/demo.mp4").Return(int64(5_000_000), "video/mp4", nil)
				h.EXPECT().HeadObject(gomock.Any(), "captures/abc/step-1.png").Return(int64(150_000), "image/png", nil)
				h.EXPECT().HeadObject(gomock.Any(), "captures/abc/step-2.jpg").Return(int64(120_000), "image/jpeg", nil)

				videoMediaID := uuid.New()
				image1MediaID := uuid.New()
				image2MediaID := uuid.New()
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Any()).Return(store.Media{ID: videoMediaID}, nil)
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Any()).Return(store.Media{ID: image1MediaID}, nil)
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Any()).Return(store.Media{ID: image2MediaID}, nil)

				c.EXPECT().GenerateWithMediaPlan(gomock.Any(), accountID, gomock.Any(), gomock.Eq([]string{"x", "bluesky", "threads"}), gomock.Any()).
					DoAndReturn(func(_ context.Context, _ uuid.UUID, _ string, platforms []string, _ any) (string, map[string]contentProc.ThreadWithMediaPlanResult, error) {
						results := make(map[string]contentProc.ThreadWithMediaPlanResult, len(platforms))
						for _, pl := range platforms {
							results[pl] = contentProc.ThreadWithMediaPlanResult{
								Content: "seg1\nseg2\nseg3",
								Segments: []contentProc.ThreadSegment{
									{Content: "seg1"},
									{Content: "seg2"},
									{Content: "seg3"},
								},
							}
						}
						return "base content", results, nil
					})

				postID := uuid.New()
				p.EXPECT().SaveDraft(gomock.Any(), gomock.Any()).DoAndReturn(func(_ context.Context, params postsProc.SaveDraftParams) (store.Post, error) {
					assert.Equal(t, "github_event", params.Source)
					assert.Equal(t, "thread", params.ContentType)
					assert.True(t, params.AIGenerated)
					require.Len(t, params.MediaIDs, 3)
					assert.Equal(t, videoMediaID, params.MediaIDs[0])
					assert.Equal(t, image1MediaID, params.MediaIDs[1])
					assert.Equal(t, image2MediaID, params.MediaIDs[2])
					require.Len(t, params.Platforms, 3)

					for _, draft := range params.Platforms {
						require.NotNil(t, draft.ThreadSegments)
						var segs []contentProc.ThreadSegment
						require.NoError(t, json.Unmarshal(*draft.ThreadSegments, &segs))
						require.Len(t, segs, 3)
						// Video on segment 0, image1 on segment 1, image2 on
						// segment 2. ImageIndex is 1-based into MediaIDs so the
						// adapter's mediaURLForSegment resolves them correctly.
						require.NotNil(t, segs[0].ImageIndex)
						assert.Equal(t, 1, *segs[0].ImageIndex)
						require.NotNil(t, segs[1].ImageIndex)
						assert.Equal(t, 2, *segs[1].ImageIndex)
						require.NotNil(t, segs[2].ImageIndex)
						assert.Equal(t, 3, *segs[2].ImageIndex)
					}
					return store.Post{ID: postID}, nil
				})

				s.EXPECT().UpdateGitHubCommitPostID(gomock.Any(), commit.ID, postID).Return(nil)
			},
		},
		{
			name: "commit already drafted skips silently",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, _ := newDraftFixture(t)
				existingPostID := uuid.New()
				commit.PostID = &existingPostID
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
			},
			wantErr: ErrDraftGuardTripped,
		},
		{
			name: "capture output missing skips silently",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, _ := newDraftFixture(t)
				commit.CaptureOutput = nil
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
			},
			wantErr: ErrDraftGuardTripped,
		},
		{
			name: "capture reports error skips silently",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, _ := newDraftFixture(t)
				raw := json.RawMessage(`{"error":"headless chrome crashed"}`)
				commit.CaptureOutput = &raw
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
			},
			wantErr: ErrDraftGuardTripped,
		},
		{
			name: "no target platform connections skips silently",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, accountID := newDraftFixture(t)
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
				s.EXPECT().ListPlatformConnectionsByAccount(gomock.Any(), accountID).Return([]store.PlatformConnection{
					{Platform: "linkedin", Status: "active"},
					{Platform: "instagram", Status: "active"},
				}, nil)
			},
			wantErr: ErrDraftGuardTripped,
		},
		{
			name: "commit lookup fails returns hard error",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(store.GitHubCommitForDraft{}, errors.New("db exploded"))
			},
			wantErr: ErrDraftGenerationFailed,
		},
		{
			name: "content generation fails returns hard error",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, accountID := newDraftFixture(t)
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
				s.EXPECT().ListPlatformConnectionsByAccount(gomock.Any(), accountID).Return([]store.PlatformConnection{
					{Platform: "x", Status: "active"},
				}, nil)
				expectMediaAssessedKeepAll(f, c, "captures/abc/demo.mp4", "captures/abc/step-1.png", "captures/abc/step-2.jpg")
				h.EXPECT().HeadObject(gomock.Any(), gomock.Any()).Return(int64(100), "video/mp4", nil).AnyTimes()
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Any()).Return(store.Media{ID: uuid.New()}, nil).AnyTimes()
				c.EXPECT().GenerateWithMediaPlan(gomock.Any(), accountID, gomock.Any(), gomock.Any(), gomock.Any()).
					Return("", nil, errors.New("claude is down"))
			},
			wantErr: ErrDraftGenerationFailed,
		},
		{
			name: "save draft fails returns hard error",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, accountID := newDraftFixture(t)
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
				s.EXPECT().ListPlatformConnectionsByAccount(gomock.Any(), accountID).Return([]store.PlatformConnection{
					{Platform: "x", Status: "active"},
				}, nil)
				expectMediaAssessedKeepAll(f, c, "captures/abc/demo.mp4", "captures/abc/step-1.png", "captures/abc/step-2.jpg")
				h.EXPECT().HeadObject(gomock.Any(), gomock.Any()).Return(int64(100), "", nil).AnyTimes()
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Any()).Return(store.Media{ID: uuid.New()}, nil).AnyTimes()
				c.EXPECT().GenerateWithMediaPlan(gomock.Any(), accountID, gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base", map[string]contentProc.ThreadWithMediaPlanResult{
						"x": {Content: "s", Segments: []contentProc.ThreadSegment{{Content: "s"}}},
					}, nil)
				p.EXPECT().SaveDraft(gomock.Any(), gomock.Any()).Return(store.Post{}, errors.New("insert failed"))
			},
			wantErr: ErrDraftGenerationFailed,
		},
		{
			name: "redundant images are dropped so the post only gets AI-selected media",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				// Four captured images; AI keeps only the first and the third.
				commit, accountID := newDraftFixture(t)
				capture := map[string]any{
					"uploaded": []map[string]string{
						{"key": "captures/abc/demo.mp4"},
						{"key": "captures/abc/step-1.png"},
						{"key": "captures/abc/step-2.png"}, // redundant — skipped by AI
						{"key": "captures/abc/step-3.png"},
						{"key": "captures/abc/step-4.png"}, // redundant — skipped by AI
					},
				}
				raw, err := json.Marshal(capture)
				require.NoError(t, err)
				rawMsg := json.RawMessage(raw)
				commit.CaptureOutput = &rawMsg

				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
				s.EXPECT().ListPlatformConnectionsByAccount(gomock.Any(), accountID).Return([]store.PlatformConnection{
					{Platform: "x", Status: "active"},
				}, nil)

				// Video + every image gets fetched; assessor keeps video and
				// a subset of images (1 and 3, dropping redundant 2 and 4).
				videoBody := io.NopCloser(bytes.NewReader([]byte("video")))
				f.EXPECT().GetFile(gomock.Any(), "captures/abc/demo.mp4").Return(videoBody, "video/mp4", nil)
				for _, key := range []string{
					"captures/abc/step-1.png",
					"captures/abc/step-2.png",
					"captures/abc/step-3.png",
					"captures/abc/step-4.png",
				} {
					body := io.NopCloser(bytes.NewReader([]byte("fake")))
					f.EXPECT().GetFile(gomock.Any(), key).Return(body, "image/png", nil)
				}
				c.EXPECT().SelectMediaAndMode(gomock.Any(), gomock.Any(), gomock.Len(4), gomock.Any()).
					Return(contentProc.MediaAndModeDecision{
						UseVideo:     true,
						ImageIndexes: []int{1, 3},
						Mode:         "thread",
						ThreadParts:  3,
						Reason:       "video + two key screenshots tell the story",
					}, nil)

				// Only the video + the two AI-selected images should be
				// materialized and attached to the post.
				videoID := uuid.New()
				img1ID := uuid.New()
				img3ID := uuid.New()
				h.EXPECT().HeadObject(gomock.Any(), "captures/abc/demo.mp4").Return(int64(1), "video/mp4", nil)
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Cond(func(p store.CreateMediaParams) bool {
					return p.S3Key == "captures/abc/demo.mp4"
				})).Return(store.Media{ID: videoID}, nil)
				h.EXPECT().HeadObject(gomock.Any(), "captures/abc/step-1.png").Return(int64(1), "image/png", nil)
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Cond(func(p store.CreateMediaParams) bool {
					return p.S3Key == "captures/abc/step-1.png"
				})).Return(store.Media{ID: img1ID}, nil)
				h.EXPECT().HeadObject(gomock.Any(), "captures/abc/step-3.png").Return(int64(1), "image/png", nil)
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Cond(func(p store.CreateMediaParams) bool {
					return p.S3Key == "captures/abc/step-3.png"
				})).Return(store.Media{ID: img3ID}, nil)

				c.EXPECT().GenerateWithMediaPlan(gomock.Any(), accountID, gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base", map[string]contentProc.ThreadWithMediaPlanResult{
						"x": {
							Content: "one\ntwo\nthree",
							Segments: []contentProc.ThreadSegment{
								{Content: "one"}, {Content: "two"}, {Content: "three"},
							},
						},
					}, nil)

				p.EXPECT().SaveDraft(gomock.Any(), gomock.Any()).DoAndReturn(func(_ context.Context, params postsProc.SaveDraftParams) (store.Post, error) {
					// Media IDs should contain exactly [video, img1, img3] — no img2/img4.
					require.Len(t, params.MediaIDs, 3)
					assert.Equal(t, videoID, params.MediaIDs[0])
					assert.Equal(t, img1ID, params.MediaIDs[1])
					assert.Equal(t, img3ID, params.MediaIDs[2])

					// Video pinned to segment 0 with 1-based ImageIndex.
					var segs []contentProc.ThreadSegment
					require.NoError(t, json.Unmarshal(*params.Platforms[0].ThreadSegments, &segs))
					require.NotNil(t, segs[0].ImageIndex)
					assert.Equal(t, 1, *segs[0].ImageIndex)
					require.NotNil(t, segs[1].ImageIndex)
					assert.Equal(t, 2, *segs[1].ImageIndex)
					require.NotNil(t, segs[2].ImageIndex)
					assert.Equal(t, 3, *segs[2].ImageIndex)
					return store.Post{ID: uuid.New()}, nil
				})
				s.EXPECT().UpdateGitHubCommitPostID(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
			},
		},
		{
			name: "media-assessment failure falls back to keeping all media in thread mode",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, accountID := newDraftFixture(t)
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
				s.EXPECT().ListPlatformConnectionsByAccount(gomock.Any(), accountID).Return([]store.PlatformConnection{
					{Platform: "x", Status: "active"},
				}, nil)

				// Video + images fetched; assessor call errors — fallback
				// keeps everything.
				videoBody := io.NopCloser(bytes.NewReader([]byte("video")))
				f.EXPECT().GetFile(gomock.Any(), "captures/abc/demo.mp4").Return(videoBody, "video/mp4", nil)
				for _, key := range []string{"captures/abc/step-1.png", "captures/abc/step-2.jpg"} {
					body := io.NopCloser(bytes.NewReader([]byte("fake")))
					f.EXPECT().GetFile(gomock.Any(), key).Return(body, "image/png", nil)
				}
				c.EXPECT().SelectMediaAndMode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(contentProc.MediaAndModeDecision{}, errors.New("provider 500"))

				h.EXPECT().HeadObject(gomock.Any(), gomock.Any()).Return(int64(1), "", nil).AnyTimes()
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Any()).Return(store.Media{ID: uuid.New()}, nil).Times(3)

				c.EXPECT().GenerateWithMediaPlan(gomock.Any(), accountID, gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base", map[string]contentProc.ThreadWithMediaPlanResult{
						"x": {Content: "s", Segments: []contentProc.ThreadSegment{{Content: "s"}}},
					}, nil)
				p.EXPECT().SaveDraft(gomock.Any(), gomock.Any()).DoAndReturn(func(_ context.Context, params postsProc.SaveDraftParams) (store.Post, error) {
					// Fallback keeps all: video + both original images.
					assert.Len(t, params.MediaIDs, 3)
					return store.Post{ID: uuid.New()}, nil
				})
				s.EXPECT().UpdateGitHubCommitPostID(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
			},
		},
		{
			name: "commit with no artifacts still generates draft with no media",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, accountID := newDraftFixture(t)
				empty := json.RawMessage(`{"uploaded":[]}`)
				commit.CaptureOutput = &empty
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
				s.EXPECT().ListPlatformConnectionsByAccount(gomock.Any(), accountID).Return([]store.PlatformConnection{
					{Platform: "x", Status: "active"},
				}, nil)
				c.EXPECT().GenerateWithMediaPlan(gomock.Any(), accountID, gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base", map[string]contentProc.ThreadWithMediaPlanResult{
						"x": {Content: "one\ntwo", Segments: []contentProc.ThreadSegment{{Content: "one"}, {Content: "two"}}},
					}, nil)
				p.EXPECT().SaveDraft(gomock.Any(), gomock.Any()).DoAndReturn(func(_ context.Context, params postsProc.SaveDraftParams) (store.Post, error) {
					assert.Empty(t, params.MediaIDs)
					require.Len(t, params.Platforms, 1)
					var segs []contentProc.ThreadSegment
					require.NoError(t, json.Unmarshal(*params.Platforms[0].ThreadSegments, &segs))
					require.Len(t, segs, 2)
					assert.Nil(t, segs[0].ImageIndex)
					assert.Nil(t, segs[1].ImageIndex)
					return store.Post{ID: uuid.New()}, nil
				})
				s.EXPECT().UpdateGitHubCommitPostID(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			ds := NewMockDraftStore(ctrl)
			cg := NewMockContentGenerator(ctrl)
			pd := NewMockPostsDrafter(ctrl)
			s3h := NewMockS3HeadClient(ctrl)
			s3f := NewMockS3Fetcher(ctrl)
			tt.mocks(t, ds, cg, pd, s3h, s3f)

			g := NewDraftGenerator(ds, cg, pd, s3h, s3f, "https://cdn.example.com", logger)
			err := g.GenerateDraftFromCommit(context.Background(), uuid.New())
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}

// ---------------------------------------------------------------------------
// Gap-fill cases for GenerateDraftFromCommit
// ---------------------------------------------------------------------------

func TestDraftGenerator_GenerateDraftFromCommit_GapFill(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()

	tests := []struct {
		name    string
		mocks   func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher)
		wantErr error
	}{
		{
			name: "ListPlatformConnectionsByAccount failing returns hard error",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, accountID := newDraftFixture(t)
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
				s.EXPECT().ListPlatformConnectionsByAccount(gomock.Any(), accountID).
					Return(nil, errors.New("db timeout"))
			},
			wantErr: ErrDraftGenerationFailed,
		},
		{
			name: "CreateMedia failing mid-way through artifact ingest returns hard error",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, accountID := newDraftFixture(t)
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
				s.EXPECT().ListPlatformConnectionsByAccount(gomock.Any(), accountID).Return([]store.PlatformConnection{
					{Platform: "x", Status: "active"},
				}, nil)
				expectMediaAssessedKeepAll(f, c, "captures/abc/demo.mp4", "captures/abc/step-1.png", "captures/abc/step-2.jpg")
				// Video HEAD succeeds.
				h.EXPECT().HeadObject(gomock.Any(), "captures/abc/demo.mp4").Return(int64(1_000), "video/mp4", nil)
				// Video CreateMedia succeeds.
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Any()).Return(store.Media{ID: uuid.New()}, nil)
				// First image HEAD succeeds.
				h.EXPECT().HeadObject(gomock.Any(), "captures/abc/step-1.png").Return(int64(50_000), "image/png", nil)
				// First image CreateMedia fails — pipeline aborts here.
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Any()).Return(store.Media{}, errors.New("insert failed"))
			},
			wantErr: ErrDraftGenerationFailed,
		},
		{
			name: "UpdateGitHubCommitPostID failing after successful SaveDraft is swallowed",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, accountID := newDraftFixture(t)
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
				s.EXPECT().ListPlatformConnectionsByAccount(gomock.Any(), accountID).Return([]store.PlatformConnection{
					{Platform: "x", Status: "active"},
				}, nil)
				expectMediaAssessedKeepAll(f, c, "captures/abc/demo.mp4", "captures/abc/step-1.png", "captures/abc/step-2.jpg")
				h.EXPECT().HeadObject(gomock.Any(), gomock.Any()).Return(int64(100), "video/mp4", nil).AnyTimes()
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Any()).Return(store.Media{ID: uuid.New()}, nil).AnyTimes()
				c.EXPECT().GenerateWithMediaPlan(gomock.Any(), accountID, gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base", map[string]contentProc.ThreadWithMediaPlanResult{
						"x": {Content: "s", Segments: []contentProc.ThreadSegment{{Content: "s"}}},
					}, nil)
				postID := uuid.New()
				p.EXPECT().SaveDraft(gomock.Any(), gomock.Any()).Return(store.Post{ID: postID}, nil)
				// UpdateGitHubCommitPostID fails — but error should NOT be surfaced.
				s.EXPECT().UpdateGitHubCommitPostID(gomock.Any(), commit.ID, postID).
					Return(errors.New("link failed"))
			},
			// No wantErr — the function returns nil even though linking failed.
		},
		{
			name: "invalid JSON in capture_output returns hard error",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, _ := newDraftFixture(t)
				bad := json.RawMessage(`{not valid json`)
				commit.CaptureOutput = &bad
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
			},
			wantErr: ErrDraftGenerationFailed,
		},
		{
			name: "mixed-extension artifacts where video sits after images",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, accountID := newDraftFixture(t)
				// Override capture output: images before video.
				mixedCapture := map[string]any{
					"uploaded": []map[string]string{
						{"key": "captures/abc/step-1.png"},
						{"key": "captures/abc/step-2.jpg"},
						{"key": "captures/abc/demo.mp4"},
					},
				}
				raw, err := json.Marshal(mixedCapture)
				require.NoError(t, err)
				rawMsg := json.RawMessage(raw)
				commit.CaptureOutput = &rawMsg

				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
				s.EXPECT().ListPlatformConnectionsByAccount(gomock.Any(), accountID).Return([]store.PlatformConnection{
					{Platform: "x", Status: "active"},
				}, nil)
				expectMediaAssessedKeepAll(f, c, "captures/abc/demo.mp4", "captures/abc/step-1.png", "captures/abc/step-2.jpg")

				// Only the two images should be created (video listed after images but still picked up as video).
				// bucketArtifacts puts images first, then skips the video (already assigned).
				// Actually: images appear before video in the uploaded list, so they are bucketed as images;
				// the mp4 is last and becomes the videoKey.
				h.EXPECT().HeadObject(gomock.Any(), "captures/abc/demo.mp4").Return(int64(2_000_000), "video/mp4", nil)
				videoMediaID := uuid.New()
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Any()).Return(store.Media{ID: videoMediaID}, nil)

				h.EXPECT().HeadObject(gomock.Any(), "captures/abc/step-1.png").Return(int64(100_000), "image/png", nil)
				img1MediaID := uuid.New()
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Any()).Return(store.Media{ID: img1MediaID}, nil)

				h.EXPECT().HeadObject(gomock.Any(), "captures/abc/step-2.jpg").Return(int64(80_000), "image/jpeg", nil)
				img2MediaID := uuid.New()
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Any()).Return(store.Media{ID: img2MediaID}, nil)

				c.EXPECT().GenerateWithMediaPlan(gomock.Any(), accountID, gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base", map[string]contentProc.ThreadWithMediaPlanResult{
						"x": {Content: "s", Segments: []contentProc.ThreadSegment{{Content: "s"}}},
					}, nil)
				p.EXPECT().SaveDraft(gomock.Any(), gomock.Any()).DoAndReturn(func(_ context.Context, params postsProc.SaveDraftParams) (store.Post, error) {
					// video is materialized first, then the two images.
					require.Len(t, params.MediaIDs, 3)
					assert.Equal(t, videoMediaID, params.MediaIDs[0])
					assert.Equal(t, img1MediaID, params.MediaIDs[1])
					assert.Equal(t, img2MediaID, params.MediaIDs[2])
					return store.Post{ID: uuid.New()}, nil
				})
				s.EXPECT().UpdateGitHubCommitPostID(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
			},
		},
		{
			name: "s3 HeadObject returning error still creates media with fallback content-type",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, accountID := newDraftFixture(t)
				// Reduce to a single image for simplicity.
				singleCapture := map[string]any{
					"uploaded": []map[string]string{
						{"key": "captures/abc/step-1.png"},
					},
				}
				raw, err := json.Marshal(singleCapture)
				require.NoError(t, err)
				rawMsg := json.RawMessage(raw)
				commit.CaptureOutput = &rawMsg

				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
				s.EXPECT().ListPlatformConnectionsByAccount(gomock.Any(), accountID).Return([]store.PlatformConnection{
					{Platform: "x", Status: "active"},
				}, nil)
				// Single-image fixture — no video, just one image assessed.
				expectMediaAssessedKeepAll(f, c, "", "captures/abc/step-1.png")

				// HeadObject fails — should fall back to extension-derived content-type.
				h.EXPECT().HeadObject(gomock.Any(), "captures/abc/step-1.png").Return(int64(0), "", errors.New("s3 403"))

				// CreateMedia should still be called with size=0 and fallback "image/png".
				mediaID := uuid.New()
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Cond(func(p store.CreateMediaParams) bool {
					return p.ContentType == "image/png" && p.SizeBytes == 0
				})).Return(store.Media{ID: mediaID}, nil)

				c.EXPECT().GenerateWithMediaPlan(gomock.Any(), accountID, gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base", map[string]contentProc.ThreadWithMediaPlanResult{
						"x": {Content: "s", Segments: []contentProc.ThreadSegment{{Content: "s"}}},
					}, nil)
				p.EXPECT().SaveDraft(gomock.Any(), gomock.Any()).Return(store.Post{ID: uuid.New()}, nil)
				s.EXPECT().UpdateGitHubCommitPostID(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
			},
		},
		{
			name: "nil s3Head still works with size=0",
			mocks: func(t *testing.T, s *MockDraftStore, c *MockContentGenerator, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, accountID := newDraftFixture(t)
				singleCapture := map[string]any{
					"uploaded": []map[string]string{
						{"key": "captures/abc/step-1.png"},
					},
				}
				raw, err := json.Marshal(singleCapture)
				require.NoError(t, err)
				rawMsg := json.RawMessage(raw)
				commit.CaptureOutput = &rawMsg

				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
				s.EXPECT().ListPlatformConnectionsByAccount(gomock.Any(), accountID).Return([]store.PlatformConnection{
					{Platform: "x", Status: "active"},
				}, nil)

				// No HeadObject call expected (h is nil in the generator).
				mediaID := uuid.New()
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Cond(func(p store.CreateMediaParams) bool {
					return p.ContentType == "image/png" && p.SizeBytes == 0
				})).Return(store.Media{ID: mediaID}, nil)

				c.EXPECT().GenerateWithMediaPlan(gomock.Any(), accountID, gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base", map[string]contentProc.ThreadWithMediaPlanResult{
						"x": {Content: "s", Segments: []contentProc.ThreadSegment{{Content: "s"}}},
					}, nil)
				p.EXPECT().SaveDraft(gomock.Any(), gomock.Any()).Return(store.Post{ID: uuid.New()}, nil)
				s.EXPECT().UpdateGitHubCommitPostID(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			ds := NewMockDraftStore(ctrl)
			cg := NewMockContentGenerator(ctrl)
			pd := NewMockPostsDrafter(ctrl)
			s3h := NewMockS3HeadClient(ctrl)
			s3f := NewMockS3Fetcher(ctrl)
			tt.mocks(t, ds, cg, pd, s3h, s3f)

			var s3HeadArg S3HeadClient = s3h
			var s3FetchArg S3Fetcher = s3f
			if tt.name == "nil s3Head still works with size=0" {
				s3HeadArg = nil
				// Leave the AI-driven selection off when S3 isn't wired so
				// we don't need to mock a fetcher for the local-dir path.
				s3FetchArg = nil
			}

			g := NewDraftGenerator(ds, cg, pd, s3HeadArg, s3FetchArg, "https://cdn.example.com", logger)
			err := g.GenerateDraftFromCommit(context.Background(), uuid.New())
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}

func TestBucketArtifacts(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		uploaded   []captureUpload
		wantVideo  string
		wantImages []string
	}{
		{
			name: "video first plus two images",
			uploaded: []captureUpload{
				{Key: "a/demo.mp4"},
				{Key: "a/s1.png"},
				{Key: "a/s2.jpg"},
			},
			wantVideo:  "a/demo.mp4",
			wantImages: []string{"a/s1.png", "a/s2.jpg"},
		},
		{
			name: "ignores unknown extensions",
			uploaded: []captureUpload{
				{Key: "a/readme.txt"},
				{Key: "a/s.gif"},
				{Key: "a/pic.jpeg"},
			},
			wantVideo:  "",
			wantImages: []string{"a/pic.jpeg"},
		},
		{
			name: "only the first video is kept",
			uploaded: []captureUpload{
				{Key: "a/one.mp4"},
				{Key: "a/two.webm"},
			},
			wantVideo:  "a/one.mp4",
			wantImages: []string{},
		},
		{
			name:       "empty input",
			uploaded:   nil,
			wantVideo:  "",
			wantImages: []string{},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			gotVideo, gotImages := bucketArtifacts(tt.uploaded)
			assert.Equal(t, tt.wantVideo, gotVideo)
			assert.Equal(t, tt.wantImages, gotImages)
		})
	}
}
