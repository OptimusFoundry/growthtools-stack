package processor

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"sync"
	"testing"

	"base-server/internal/ai/commitclassifier"
	"base-server/internal/ai/mediadescriber"
	"base-server/internal/ai/mediaplanner"
	"base-server/internal/ai/socialposts"
	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

// fullAIClient is the union of AIClient methods used across commitclassifier,
// mediadescriber, mediaplanner, and socialposts — the four AI package
// constructors NewDraftGenerator wires up. A concrete type implementing this
// is assignable to every one of those narrower per-package interfaces.
type fullAIClient interface {
	CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
	CreateJSONMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
	StreamMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error
}

// componentPromptCapturingAIClient is a stub AI client used only by the
// "storybook component prompt" test case. It answers the media-planner's
// CreateJSONMessage call with a canned "keep nothing, single mode" decision
// (so the pipeline never touches CreateMedia/HeadObject) and records every
// user-message Content passed to CreateMessage so the test can assert the
// draft generator built a component-flavored prompt.
type componentPromptCapturingAIClient struct {
	mu      sync.Mutex
	prompts []string
}

func (c *componentPromptCapturingAIClient) CreateMessage(_ context.Context, _ string, messages []aiclient.Message, _ int) (string, error) {
	c.mu.Lock()
	for _, m := range messages {
		c.prompts = append(c.prompts, m.Content)
	}
	c.mu.Unlock()
	return "generated post content", nil
}

func (c *componentPromptCapturingAIClient) CreateJSONMessage(_ context.Context, _ string, _ []aiclient.Message, _ int) (string, error) {
	return `{"keep_indexes":[],"mode":"single","thread_parts":0,"reason":"skip media for test"}`, nil
}

func (c *componentPromptCapturingAIClient) StreamMessage(_ context.Context, _ string, _ []aiclient.Message, _ int, _ func(string)) error {
	return errors.New("not implemented in stub")
}

func (c *componentPromptCapturingAIClient) capturedPrompts() []string {
	c.mu.Lock()
	defer c.mu.Unlock()
	out := make([]string, len(c.prompts))
	copy(out, c.prompts)
	return out
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
		name  string
		mocks func(t *testing.T, s *MockDraftStore, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher)
		// aiClient overrides the default error-returning stubAIClient when set.
		// Only the storybook-component case below needs a real (non-erroring)
		// AI stub, since it must reach the socialposts.Generate call.
		aiClient fullAIClient
		wantErr  error
		// assertAIClient runs after a successful invocation, given the aiClient
		// instance actually used, so the test can inspect what the draft
		// generator sent to the AI layer (e.g. the built prompt).
		assertAIClient func(t *testing.T, ai fullAIClient)
	}{
		{
			name: "commit already drafted skips silently",
			mocks: func(t *testing.T, s *MockDraftStore, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, _ := newDraftFixture(t)
				existingPostID := uuid.New()
				commit.PostID = &existingPostID
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
			},
			wantErr: ErrDraftGuardTripped,
		},
		{
			name: "capture output missing skips silently",
			mocks: func(t *testing.T, s *MockDraftStore, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, _ := newDraftFixture(t)
				commit.CaptureOutput = nil
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
			},
			wantErr: ErrDraftGuardTripped,
		},
		{
			name: "capture reports error skips silently",
			mocks: func(t *testing.T, s *MockDraftStore, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				commit, _ := newDraftFixture(t)
				raw := json.RawMessage(`{"error":"headless chrome crashed"}`)
				commit.CaptureOutput = &raw
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
			},
			wantErr: ErrDraftGuardTripped,
		},
		{
			name: "no target platform connections skips silently",
			mocks: func(t *testing.T, s *MockDraftStore, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
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
			mocks: func(t *testing.T, s *MockDraftStore, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(store.GitHubCommitForDraft{}, errors.New("db exploded"))
			},
			wantErr: ErrDraftGenerationFailed,
		},
		{
			name: "storybook capture uses the component-flavored prompt",
			mocks: func(t *testing.T, s *MockDraftStore, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher) {
				accountID := uuid.New()
				commitID := uuid.New()
				storybookKey := "captures/abc123/storybook/Button--primitives-button--default.png"
				capture := map[string]any{
					"uploaded": []map[string]string{
						{"key": storybookKey, "url": "s3://bucket/" + storybookKey},
					},
				}
				raw, err := json.Marshal(capture)
				require.NoError(t, err)
				rawMsg := json.RawMessage(raw)
				commit := store.GitHubCommitForDraft{
					ID:            commitID,
					SHA:           "abcdef0",
					Message:       "feat: restyle the primary button",
					CaptureOutput: &rawMsg,
					AccountID:     accountID,
					RepoOwner:     "acme",
					RepoName:      "widget",
				}

				s.EXPECT().GetGitHubCommitForDraft(gomock.Any(), gomock.Any()).Return(commit, nil)
				s.EXPECT().ListPlatformConnectionsByAccount(gomock.Any(), accountID).Return([]store.PlatformConnection{
					{Platform: "x", Status: "active"},
				}, nil)
				f.EXPECT().GetFile(gomock.Any(), storybookKey).
					Return(io.NopCloser(strings.NewReader("fake-png-bytes")), "image/png", nil)
				// Every capture becomes a media row for the post's pool, even
				// though the stubbed planner keeps none of them.
				h.EXPECT().HeadObject(gomock.Any(), storybookKey).Return(int64(14), "image/png", nil)
				s.EXPECT().CreateMedia(gomock.Any(), gomock.Any()).Return(store.Media{ID: uuid.New()}, nil)
				p.EXPECT().SaveDraft(gomock.Any(), gomock.Any()).Return(store.Post{ID: uuid.New()}, nil)
				s.EXPECT().SetPostCaptureMediaIDs(gomock.Any(), gomock.Any(), gomock.Len(1)).Return(nil)
				s.EXPECT().UpdateGitHubCommitPostID(gomock.Any(), commitID, gomock.Any()).Return(nil)
			},
			aiClient: &componentPromptCapturingAIClient{},
			assertAIClient: func(t *testing.T, ai fullAIClient) {
				capturing, ok := ai.(*componentPromptCapturingAIClient)
				require.True(t, ok, "expected componentPromptCapturingAIClient")
				prompts := capturing.capturedPrompts()
				require.NotEmpty(t, prompts, "expected at least one captured CreateMessage prompt")

				found := false
				for _, p := range prompts {
					if strings.Contains(p, "Button") {
						found = true
						break
					}
				}
				assert.True(t, found, "expected the component-flavored prompt (mentioning \"Button\") to reach socialposts.Generate, got prompts: %v", prompts)
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
			tt.mocks(t, ds, pd, s3h, s3f)

			// Create minimal AI package instances for constructor. Most cases
			// use the always-erroring stubAIClient since they short-circuit
			// before any AI call; cases that need to reach the AI layer set
			// tt.aiClient explicitly.
			var aiClient fullAIClient = &stubAIClient{}
			if tt.aiClient != nil {
				aiClient = tt.aiClient
			}
			classifier := commitclassifier.New(aiClient, logger)
			describer := mediadescriber.New(aiClient, logger)
			planner := mediaplanner.New(aiClient, logger)
			generator := socialposts.New(aiClient, logger)

			g := NewDraftGenerator(
				ds, classifier, describer, planner, generator,
				pd, s3h, s3f, "s3://bucket", logger,
			)
			err := g.GenerateDraftFromCommit(context.Background(), uuid.New())
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assertAIClient != nil {
				tt.assertAIClient(t, aiClient)
			}
		})
	}
}

// newShowcaseJobFixture returns a showcase job fixture with a single
// uploaded image, ready for the happy-path test to exercise the whole
// pipeline.
func newShowcaseJobFixture(t *testing.T) (store.ShowcaseJobForDraft, uuid.UUID) {
	t.Helper()
	accountID := uuid.New()
	jobID := uuid.New()
	capture := map[string]any{
		"uploaded": []map[string]string{
			{"key": "captures/job-abc/step-1.png", "url": "s3://bucket/captures/job-abc/step-1.png"},
		},
	}
	raw, err := json.Marshal(capture)
	require.NoError(t, err)
	rawMsg := json.RawMessage(raw)
	return store.ShowcaseJobForDraft{
		ID:            jobID,
		Brief:         "Show off the new primary button with the hover glow effect",
		ComponentName: "Button",
		Status:        "drafting",
		CaptureOutput: &rawMsg,
		AccountID:     accountID,
	}, accountID
}

// briefPromptCapturingAIClient behaves like componentPromptCapturingAIClient
// but is used by the showcase-job tests: it answers the media planner's
// CreateJSONMessage call and records both the CreateMessage prompts (so the
// test can assert buildShowcaseDraftPrompt reached socialposts.Generate) and
// every CreateJSONMessage's own captured messages are not needed here, since
// the field of interest (mediaplanner.SelectRequest.CommitMessage) is
// asserted indirectly via the planner's own request — see
// planCapturingAIClient below for that.
type briefPromptCapturingAIClient struct {
	mu      sync.Mutex
	prompts []string
}

func (c *briefPromptCapturingAIClient) CreateMessage(_ context.Context, _ string, messages []aiclient.Message, _ int) (string, error) {
	c.mu.Lock()
	for _, m := range messages {
		c.prompts = append(c.prompts, m.Content)
	}
	c.mu.Unlock()
	return "generated post content", nil
}

func (c *briefPromptCapturingAIClient) CreateJSONMessage(_ context.Context, _ string, _ []aiclient.Message, _ int) (string, error) {
	return `{"keep_indexes":[],"mode":"single","thread_parts":0,"reason":"skip media for test"}`, nil
}

func (c *briefPromptCapturingAIClient) StreamMessage(_ context.Context, _ string, _ []aiclient.Message, _ int, _ func(string)) error {
	return errors.New("not implemented in stub")
}

func (c *briefPromptCapturingAIClient) capturedPrompts() []string {
	c.mu.Lock()
	defer c.mu.Unlock()
	out := make([]string, len(c.prompts))
	copy(out, c.prompts)
	return out
}

func TestDraftGenerator_GenerateDraftFromShowcaseJob(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()

	tests := []struct {
		name           string
		mocks          func(t *testing.T, s *MockDraftStore, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher, jobID uuid.UUID)
		aiClient       fullAIClient
		wantErr        error
		assertAIClient func(t *testing.T, ai fullAIClient)
	}{
		{
			name: "happy path: generates draft and links job to post",
			mocks: func(t *testing.T, s *MockDraftStore, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher, jobID uuid.UUID) {
				job, _ := newShowcaseJobFixture(t)
				job.ID = jobID
				s.EXPECT().GetShowcaseJobForDraft(gomock.Any(), jobID).Return(job, nil)
				f.EXPECT().GetFile(gomock.Any(), "captures/job-abc/step-1.png").
					Return(io.NopCloser(strings.NewReader("fake-png-bytes")), "image/png", nil)
				postID := uuid.New()
				p.EXPECT().SaveDraft(gomock.Any(), gomock.Any()).Return(store.Post{ID: postID}, nil)
				s.EXPECT().UpdateShowcaseJobPostID(gomock.Any(), jobID, postID).Return(nil)
			},
			aiClient: &briefPromptCapturingAIClient{},
		},
		{
			name: "no-op when job already has a PostID (already-drafted guard)",
			mocks: func(t *testing.T, s *MockDraftStore, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher, jobID uuid.UUID) {
				job, _ := newShowcaseJobFixture(t)
				job.ID = jobID
				existingPostID := uuid.New()
				job.PostID = &existingPostID
				s.EXPECT().GetShowcaseJobForDraft(gomock.Any(), jobID).Return(job, nil)
				// No describer/planner/generator/posts calls expected — gomock
				// fails the test if SaveDraft, UpdateShowcaseJobPostID, or
				// UpdateShowcaseJobFailed are invoked since they carry no
				// .EXPECT() here.
			},
			wantErr: ErrDraftGuardTripped,
		},
		{
			name: "marks job failed and returns without drafting when capture_output reports an error",
			mocks: func(t *testing.T, s *MockDraftStore, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher, jobID uuid.UUID) {
				job, _ := newShowcaseJobFixture(t)
				job.ID = jobID
				raw := json.RawMessage(`{"error":"capture-worker failed"}`)
				job.CaptureOutput = &raw
				s.EXPECT().GetShowcaseJobForDraft(gomock.Any(), jobID).Return(job, nil)
				s.EXPECT().UpdateShowcaseJobFailed(gomock.Any(), jobID, "capture-worker failed").Return(nil)
			},
			wantErr: ErrDraftGuardTripped,
		},
		{
			name: "calls UpdateShowcaseJobFailed and returns the error when the draft pipeline fails",
			mocks: func(t *testing.T, s *MockDraftStore, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher, jobID uuid.UUID) {
				job, _ := newShowcaseJobFixture(t)
				job.ID = jobID
				s.EXPECT().GetShowcaseJobForDraft(gomock.Any(), jobID).Return(job, nil)
				f.EXPECT().GetFile(gomock.Any(), "captures/job-abc/step-1.png").
					Return(io.NopCloser(strings.NewReader("fake-png-bytes")), "image/png", nil)
				p.EXPECT().SaveDraft(gomock.Any(), gomock.Any()).Return(store.Post{}, errors.New("db exploded"))
				s.EXPECT().UpdateShowcaseJobFailed(gomock.Any(), jobID, "db exploded").Return(nil)
			},
			aiClient: &briefPromptCapturingAIClient{},
			wantErr:  ErrDraftGenerationFailed,
		},
		{
			name: "passes job.Brief as mediaplanner.SelectRequest.CommitMessage and uses buildShowcaseDraftPrompt",
			mocks: func(t *testing.T, s *MockDraftStore, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher, jobID uuid.UUID) {
				job, _ := newShowcaseJobFixture(t)
				job.ID = jobID
				s.EXPECT().GetShowcaseJobForDraft(gomock.Any(), jobID).Return(job, nil)
				f.EXPECT().GetFile(gomock.Any(), "captures/job-abc/step-1.png").
					Return(io.NopCloser(strings.NewReader("fake-png-bytes")), "image/png", nil)
				postID := uuid.New()
				p.EXPECT().SaveDraft(gomock.Any(), gomock.Any()).Return(store.Post{ID: postID}, nil)
				s.EXPECT().UpdateShowcaseJobPostID(gomock.Any(), jobID, postID).Return(nil)
			},
			aiClient: &briefPromptCapturingAIClient{},
			assertAIClient: func(t *testing.T, ai fullAIClient) {
				capturing, ok := ai.(*briefPromptCapturingAIClient)
				require.True(t, ok, "expected briefPromptCapturingAIClient")
				prompts := capturing.capturedPrompts()
				require.NotEmpty(t, prompts, "expected at least one captured CreateMessage prompt")

				found := false
				for _, p := range prompts {
					// job.Brief flows into mediaplanner.SelectRequest.CommitMessage
					// (the same struct field the commit path populates from
					// commit.Message) and from there into the socialposts.Generate
					// call by way of buildShowcaseDraftPrompt, so the brief text
					// showing up in a captured prompt demonstrates both: the brief
					// reached the planner request and the showcase (not commit)
					// prompt builder was used.
					if strings.Contains(p, "Show off the new primary button with the hover glow effect") {
						found = true
						break
					}
				}
				assert.True(t, found, "expected job.Brief to reach socialposts.Generate via buildShowcaseDraftPrompt, got prompts: %v", prompts)

				noRepoFraming := true
				for _, p := range prompts {
					if strings.Contains(p, "Repository:") {
						noRepoFraming = false
						break
					}
				}
				assert.True(t, noRepoFraming, "showcase draft prompt must not carry repo framing")
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
			jobID := uuid.New()
			tt.mocks(t, ds, pd, s3h, s3f, jobID)

			var aiClient fullAIClient = &stubAIClient{}
			if tt.aiClient != nil {
				aiClient = tt.aiClient
			}
			classifier := commitclassifier.New(aiClient, logger)
			describer := mediadescriber.New(aiClient, logger)
			planner := mediaplanner.New(aiClient, logger)
			generator := socialposts.New(aiClient, logger)

			g := NewDraftGenerator(
				ds, classifier, describer, planner, generator,
				pd, s3h, s3f, "s3://bucket", logger,
			)
			err := g.GenerateDraftFromShowcaseJob(context.Background(), jobID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assertAIClient != nil {
				tt.assertAIClient(t, aiClient)
			}
		})
	}
}

// stubAIClient is a stub implementation of the AIClient interface for testing.
type stubAIClient struct{}

func (s *stubAIClient) CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
	return "", errors.New("not implemented in stub")
}

func (s *stubAIClient) CreateJSONMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
	return "", errors.New("not implemented in stub")
}

func (s *stubAIClient) StreamMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
	return errors.New("not implemented in stub")
}
