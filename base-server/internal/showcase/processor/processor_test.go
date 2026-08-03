package processor

import (
	"context"
	"errors"
	"testing"

	"base-server/internal/ai/componentmatcher"
	"base-server/internal/infra/clients/aiclient"
	storybookclient "base-server/internal/infra/clients/storybook"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

// stubAIClient is a local componentmatcher.AIClient implementation used to
// drive componentmatcher.Matcher deterministically from within a
// ShowcaseProcessor test, without reaching across package boundaries into
// componentmatcher's own (test-only, unexported) mocks_test.go.
type stubAIClient struct {
	response string
	err      error
}

func (s *stubAIClient) CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
	return s.response, s.err
}

// storybookIndexWithButton returns a Storybook index containing a single
// "Button" story, matching what distinctComponentNames/storyIDsForComponent
// expect to derive from it.
func storybookIndexWithButton() storybookclient.Index {
	return storybookclient.Index{
		Entries: map[string]storybookclient.IndexEntry{
			"components-button--default": {
				ID:         "components-button--default",
				ImportPath: "./src/Button.stories.tsx",
				Type:       "story",
			},
		},
	}
}

func TestShowcaseProcessor_CreateShowcaseJob(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()
	brief := "a showcase brief about a form component"
	accountID := uuid.New()
	ownerUserID := uuid.New()
	connectionID := uuid.New()
	repoID := uuid.New()
	jobID := uuid.New()
	storybookURL := "https://storybook.example.com"

	tests := []struct {
		name       string
		aiClient   componentmatcher.AIClient
		setupMocks func(ms *MockShowcaseStore, msc *MockStorybookClient, mp *MockEventPublisher)
		wantJobID  uuid.UUID
		wantErr    error
		checkErr   func(t *testing.T, err error)
	}{
		{
			name:     "resolves component, creates job, publishes capture request, returns job id",
			aiClient: &stubAIClient{response: "Button"},
			setupMocks: func(ms *MockShowcaseStore, msc *MockStorybookClient, mp *MockEventPublisher) {
				ms.EXPECT().GetAccountByID(gomock.Any(), accountID).
					Return(store.Account{ID: accountID, OwnerUserID: ownerUserID}, nil)
				ms.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), ownerUserID).
					Return(store.GitHubConnection{ID: connectionID}, nil)
				ms.EXPECT().ListGitHubReposByConnection(gomock.Any(), connectionID).
					Return([]store.GitHubRepo{{ID: repoID, StorybookURL: &storybookURL}}, nil)
				msc.EXPECT().FetchIndex(gomock.Any(), storybookURL).
					Return(storybookIndexWithButton(), nil)
				ms.EXPECT().CreateShowcaseJob(gomock.Any(), store.CreateShowcaseJobParams{
					AccountID:     accountID,
					Brief:         brief,
					ComponentName: "Button",
					StoryIDs:      []string{"components-button--default"},
				}).Return(store.ShowcaseJob{ID: jobID}, nil)
				mp.EXPECT().Publish(gomock.Any(), "github.capture.requests", jobID.String(), gomock.Any()).
					Return(nil)
				ms.EXPECT().UpdateShowcaseJobStatus(gomock.Any(), jobID, "capturing").
					Return(nil)
			},
			wantJobID: jobID,
		},
		{
			name:     "returns ErrStorybookNotConfigured when account has no repo with storybook configured",
			aiClient: &stubAIClient{response: "Button"},
			setupMocks: func(ms *MockShowcaseStore, msc *MockStorybookClient, mp *MockEventPublisher) {
				ms.EXPECT().GetAccountByID(gomock.Any(), accountID).
					Return(store.Account{ID: accountID, OwnerUserID: ownerUserID}, nil)
				ms.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), ownerUserID).
					Return(store.GitHubConnection{ID: connectionID}, nil)
				ms.EXPECT().ListGitHubReposByConnection(gomock.Any(), connectionID).
					Return([]store.GitHubRepo{{ID: repoID, StorybookURL: nil}}, nil)
			},
			wantErr: ErrStorybookNotConfigured,
		},
		{
			name:     "returns ErrNoComponentMatch when AI resolver returns no confident match",
			aiClient: &stubAIClient{response: "NONE"},
			setupMocks: func(ms *MockShowcaseStore, msc *MockStorybookClient, mp *MockEventPublisher) {
				ms.EXPECT().GetAccountByID(gomock.Any(), accountID).
					Return(store.Account{ID: accountID, OwnerUserID: ownerUserID}, nil)
				ms.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), ownerUserID).
					Return(store.GitHubConnection{ID: connectionID}, nil)
				ms.EXPECT().ListGitHubReposByConnection(gomock.Any(), connectionID).
					Return([]store.GitHubRepo{{ID: repoID, StorybookURL: &storybookURL}}, nil)
				msc.EXPECT().FetchIndex(gomock.Any(), storybookURL).
					Return(storybookIndexWithButton(), nil)
				// No CreateShowcaseJob / Publish expectations: gomock will fail
				// the test if either is unexpectedly called.
			},
			wantErr: ErrNoComponentMatch,
		},
		{
			name:     "propagates AI transport error unwrapped, not ErrNoComponentMatch",
			aiClient: &stubAIClient{err: errors.New("ai transport error")},
			setupMocks: func(ms *MockShowcaseStore, msc *MockStorybookClient, mp *MockEventPublisher) {
				ms.EXPECT().GetAccountByID(gomock.Any(), accountID).
					Return(store.Account{ID: accountID, OwnerUserID: ownerUserID}, nil)
				ms.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), ownerUserID).
					Return(store.GitHubConnection{ID: connectionID}, nil)
				ms.EXPECT().ListGitHubReposByConnection(gomock.Any(), connectionID).
					Return([]store.GitHubRepo{{ID: repoID, StorybookURL: &storybookURL}}, nil)
				msc.EXPECT().FetchIndex(gomock.Any(), storybookURL).
					Return(storybookIndexWithButton(), nil)
			},
			checkErr: func(t *testing.T, err error) {
				t.Helper()
				require.Error(t, err)
				assert.NotErrorIs(t, err, ErrNoComponentMatch)
				assert.Contains(t, err.Error(), "ai transport error")
			},
		},
		{
			name:     "returns ErrPublishFailed and marks job failed when Kafka publish fails after job created",
			aiClient: &stubAIClient{response: "Button"},
			setupMocks: func(ms *MockShowcaseStore, msc *MockStorybookClient, mp *MockEventPublisher) {
				ms.EXPECT().GetAccountByID(gomock.Any(), accountID).
					Return(store.Account{ID: accountID, OwnerUserID: ownerUserID}, nil)
				ms.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), ownerUserID).
					Return(store.GitHubConnection{ID: connectionID}, nil)
				ms.EXPECT().ListGitHubReposByConnection(gomock.Any(), connectionID).
					Return([]store.GitHubRepo{{ID: repoID, StorybookURL: &storybookURL}}, nil)
				msc.EXPECT().FetchIndex(gomock.Any(), storybookURL).
					Return(storybookIndexWithButton(), nil)
				ms.EXPECT().CreateShowcaseJob(gomock.Any(), store.CreateShowcaseJobParams{
					AccountID:     accountID,
					Brief:         brief,
					ComponentName: "Button",
					StoryIDs:      []string{"components-button--default"},
				}).Return(store.ShowcaseJob{ID: jobID}, nil)
				mp.EXPECT().Publish(gomock.Any(), "github.capture.requests", jobID.String(), gomock.Any()).
					Return(errors.New("kafka publish error"))
				ms.EXPECT().UpdateShowcaseJobFailed(gomock.Any(), jobID, "kafka publish error").
					Return(nil)
			},
			wantErr: ErrPublishFailed,
		},
		{
			name:     "propagates an unexpected store error from GetAccountByID",
			aiClient: &stubAIClient{response: "Button"},
			setupMocks: func(ms *MockShowcaseStore, msc *MockStorybookClient, mp *MockEventPublisher) {
				ms.EXPECT().GetAccountByID(gomock.Any(), accountID).
					Return(store.Account{}, errors.New("db unavailable"))
			},
			checkErr: func(t *testing.T, err error) {
				t.Helper()
				require.Error(t, err)
				assert.NotErrorIs(t, err, ErrStorybookNotConfigured)
				assert.NotErrorIs(t, err, ErrNoComponentMatch)
				assert.NotErrorIs(t, err, ErrPublishFailed)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			ms := NewMockShowcaseStore(ctrl)
			msc := NewMockStorybookClient(ctrl)
			mp := NewMockEventPublisher(ctrl)
			tt.setupMocks(ms, msc, mp)

			matcher := componentmatcher.New(tt.aiClient, logger)
			proc := New(ms, msc, matcher, mp, logger)

			gotJobID, err := proc.CreateShowcaseJob(context.Background(), accountID, brief)

			if tt.checkErr != nil {
				tt.checkErr(t, err)
				return
			}
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.wantJobID, gotJobID)
		})
	}
}
