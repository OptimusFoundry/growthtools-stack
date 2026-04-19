package processor

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"base-server/internal/ai/commitclassifier"
	"base-server/internal/ai/mediadescriber"
	"base-server/internal/ai/mediaplanner"
	"base-server/internal/ai/socialposts"
	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

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
		mocks   func(t *testing.T, s *MockDraftStore, p *MockPostsDrafter, h *MockS3HeadClient, f *MockS3Fetcher)
		wantErr error
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

			// Create minimal AI package instances for constructor
			stub := &stubAIClient{}
			classifier := commitclassifier.New(stub, logger)
			describer := mediadescriber.New(stub, logger)
			planner := mediaplanner.New(stub, logger)
			generator := socialposts.New(stub, logger)

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
		})
	}
}

// stubAIClient is a stub implementation of the AIClient interface for testing.
type stubAIClient struct{}

func (s *stubAIClient) CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
	return "", errors.New("not implemented in stub")
}

func (s *stubAIClient) StreamMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
	return errors.New("not implemented in stub")
}
