package processor

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"base-server/internal/ai/commitclassifier"
	githubclient "base-server/internal/infra/clients/github"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

const testWebhookSecret = "test-secret-key"

func validSignature(payload []byte) string {
	mac := hmac.New(sha256.New, []byte(testWebhookSecret))
	mac.Write(payload)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func validSignatureWith(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func TestGitHubProcessor_HandleWebhookEvent(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	tests := []struct {
		name       string
		deliveryID string
		eventType  string
		payload    []byte
		sigFn      func([]byte) string
		mocks      func(s *MockGitHubStore)
		wantErr    error
	}{
		{
			name:       "happy path – ping event, no repo (event not persisted)",
			deliveryID: "delivery-001",
			eventType:  "ping",
			payload:    []byte(`{}`),
			sigFn:      validSignature,
			mocks: func(s *MockGitHubStore) {
				// No repo in the payload → no repo lookups, no CreateGitHubEvent.
				// The processor acknowledges (200) without persisting because
				// github_events.account_id is NOT NULL.
				s.EXPECT().GetGitHubEventByDeliveryID(gomock.Any(), "delivery-001").
					Return(store.GitHubEvent{}, store.ErrNotFound)
			},
		},
		{
			name:       "duplicate event returns ErrDuplicateEvent",
			deliveryID: "delivery-dup",
			eventType:  "push",
			payload:    []byte(`{"action":"push"}`),
			sigFn:      validSignature,
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubEventByDeliveryID(gomock.Any(), "delivery-dup").
					Return(store.GitHubEvent{ID: uuid.New()}, nil)
			},
			wantErr: ErrDuplicateEvent,
		},
		{
			name:       "dedupe store error is propagated",
			deliveryID: "delivery-err",
			eventType:  "push",
			payload:    []byte(`{"action":"push"}`),
			sigFn:      validSignature,
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubEventByDeliveryID(gomock.Any(), "delivery-err").
					Return(store.GitHubEvent{}, errors.New("db exploded"))
			},
			wantErr: errors.New("db exploded"),
		},
		{
			name:       "invalid signature returns ErrInvalidSignature",
			deliveryID: "delivery-sig",
			eventType:  "push",
			payload:    []byte(`{"action":"push"}`),
			sigFn:      func([]byte) string { return "sha256=badbad" },
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubEventByDeliveryID(gomock.Any(), "delivery-sig").
					Return(store.GitHubEvent{}, store.ErrNotFound)
				s.EXPECT().GetGitHubRepoByGitHubID(gomock.Any(), gomock.Any()).
					Return(store.GitHubRepo{}, store.ErrNotFound).AnyTimes()
				s.EXPECT().GetGitHubRepoByOwnerName(gomock.Any(), gomock.Any(), gomock.Any()).
					Return(store.GitHubRepo{}, store.ErrNotFound).AnyTimes()
			},
			wantErr: ErrInvalidSignature,
		},
		{
			name:       "missing sha256 prefix returns ErrInvalidSignature",
			deliveryID: "delivery-prefix",
			eventType:  "push",
			payload:    []byte(`{}`),
			sigFn:      func([]byte) string { return "invalidsig" },
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubEventByDeliveryID(gomock.Any(), "delivery-prefix").
					Return(store.GitHubEvent{}, store.ErrNotFound)
				s.EXPECT().GetGitHubRepoByGitHubID(gomock.Any(), gomock.Any()).
					Return(store.GitHubRepo{}, store.ErrNotFound).AnyTimes()
				s.EXPECT().GetGitHubRepoByOwnerName(gomock.Any(), gomock.Any(), gomock.Any()).
					Return(store.GitHubRepo{}, store.ErrNotFound).AnyTimes()
			},
			wantErr: ErrInvalidSignature,
		},
		{
			name:       "create event store error propagated",
			deliveryID: "delivery-create-err",
			eventType:  "ping",
			payload: func() []byte {
				b, _ := json.Marshal(map[string]any{
					"repository": map[string]any{
						"id":        int64(4242),
						"name":      "myrepo",
						"full_name": "user/myrepo",
						"owner":     map[string]string{"login": "user"},
					},
				})
				return b
			}(),
			sigFn: func(payload []byte) string { return validSignatureWith(payload, "per-repo-secret") },
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubEventByDeliveryID(gomock.Any(), "delivery-create-err").
					Return(store.GitHubEvent{}, store.ErrNotFound)
				s.EXPECT().GetGitHubRepoByGitHubID(gomock.Any(), int64(4242)).
					Return(store.GitHubRepo{
						ID:            uuid.New(),
						GitHubRepoID:  4242,
						AccountID:     uuid.New(),
						WebhookSecret: "per-repo-secret",
						Owner:         "user",
						Name:          "myrepo",
					}, nil)
				s.EXPECT().CreateGitHubEvent(gomock.Any(), gomock.Any()).
					Return(store.GitHubEvent{}, errors.New("create error"))
			},
			wantErr: errors.New("create error"),
		},
		{
			name:       "push event with per-repo secret",
			deliveryID: "delivery-push",
			eventType:  "push",
			payload: func() []byte {
				b, _ := json.Marshal(map[string]any{
					"ref": "refs/heads/main",
					"repository": map[string]any{
						"id":        int64(999),
						"name":      "myrepo",
						"full_name": "user/myrepo",
						"owner":     map[string]string{"login": "user"},
					},
					"commits": []any{},
				})
				return b
			}(),
			sigFn: func(payload []byte) string {
				return validSignatureWith(payload, "per-repo-secret")
			},
			mocks: func(s *MockGitHubStore) {
				repoID := uuid.New()
				s.EXPECT().GetGitHubEventByDeliveryID(gomock.Any(), "delivery-push").
					Return(store.GitHubEvent{}, store.ErrNotFound)
				s.EXPECT().GetGitHubRepoByGitHubID(gomock.Any(), int64(999)).
					Return(store.GitHubRepo{ID: repoID, GitHubRepoID: 999, WebhookSecret: "per-repo-secret"}, nil)
				s.EXPECT().CreateGitHubEvent(gomock.Any(), gomock.Any()).
					Return(store.GitHubEvent{ID: uuid.New()}, nil)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			mockStore := NewMockGitHubStore(ctrl)
			tt.mocks(mockStore)

			proc := New(mockStore, testWebhookSecret, logger)
			sig := tt.sigFn(tt.payload)
			err := proc.HandleWebhookEvent(context.Background(), tt.deliveryID, tt.eventType, tt.payload, sig)

			if tt.wantErr != nil {
				require.Error(t, err)
				if errors.Is(tt.wantErr, ErrDuplicateEvent) || errors.Is(tt.wantErr, ErrInvalidSignature) {
					assert.ErrorIs(t, err, tt.wantErr)
				}
				return
			}
			require.NoError(t, err)
		})
	}
}

func TestGitHubProcessor_GetConnection(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()
	connID := uuid.New()

	tests := []struct {
		name    string
		mocks   func(s *MockGitHubStore)
		wantErr error
		assert  func(t *testing.T, conn store.GitHubConnection)
	}{
		{
			name: "happy path – token stripped",
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: connID, UserID: userID, GitHubUsername: "alice", AccessToken: "secret-token"}, nil)
			},
			assert: func(t *testing.T, conn store.GitHubConnection) {
				assert.Equal(t, connID, conn.ID)
				assert.Equal(t, "alice", conn.GitHubUsername)
				assert.Empty(t, conn.AccessToken, "access token must be stripped")
			},
		},
		{
			name: "not found returns ErrConnectionNotFound",
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{}, store.ErrNotFound)
			},
			wantErr: ErrConnectionNotFound,
		},
		{
			name: "other store error returns ErrConnectionNotFound",
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{}, errors.New("db exploded"))
			},
			wantErr: ErrConnectionNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			mockStore := NewMockGitHubStore(ctrl)
			tt.mocks(mockStore)

			proc := New(mockStore, testWebhookSecret, logger)
			conn, err := proc.GetConnection(context.Background(), userID)

			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assert != nil {
				tt.assert(t, conn)
			}
		})
	}
}

func TestGitHubProcessor_Disconnect(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()
	connID := uuid.New()

	tests := []struct {
		name    string
		mocks   func(s *MockGitHubStore, c *MockGitHubClient)
		wantErr error
	}{
		{
			name: "happy path – no repos",
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				s.EXPECT().ListGitHubReposByConnection(gomock.Any(), connID).
					Return([]store.GitHubRepo{}, nil)
				s.EXPECT().SoftDeleteGitHubConnection(gomock.Any(), userID).Return(nil)
			},
		},
		{
			name: "not found returns ErrConnectionNotFound",
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{}, store.ErrNotFound)
			},
			wantErr: ErrConnectionNotFound,
		},
		{
			name: "other get-connection error returns ErrFailedDisconnect",
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{}, errors.New("db exploded"))
			},
			wantErr: ErrFailedDisconnect,
		},
		{
			name: "soft-delete error returns ErrFailedDisconnect",
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				s.EXPECT().ListGitHubReposByConnection(gomock.Any(), connID).
					Return([]store.GitHubRepo{}, nil)
				s.EXPECT().SoftDeleteGitHubConnection(gomock.Any(), userID).
					Return(errors.New("delete error"))
			},
			wantErr: ErrFailedDisconnect,
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
			err := proc.Disconnect(context.Background(), userID)

			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}

func TestGitHubProcessor_ListAvailableRepos(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()
	connID := uuid.New()

	tests := []struct {
		name    string
		mocks   func(s *MockGitHubStore, c *MockGitHubClient)
		wantErr error
		assert  func(t *testing.T, repos []AvailableRepo)
	}{
		{
			name: "happy path",
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				c.EXPECT().ListUserRepos(gomock.Any(), "tok", 1).
					Return([]githubclient.GitHubRepo{
						{Name: "repo1", Owner: githubclient.Owner{Login: "alice"}},
					}, nil)
				s.EXPECT().ListGitHubReposByConnection(gomock.Any(), connID).
					Return([]store.GitHubRepo{}, nil)
			},
			assert: func(t *testing.T, repos []AvailableRepo) {
				require.Len(t, repos, 1)
				assert.Equal(t, "repo1", repos[0].Name)
				assert.False(t, repos[0].Connected)
			},
		},
		{
			name: "connection not found returns ErrConnectionNotFound",
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{}, store.ErrNotFound)
			},
			wantErr: ErrConnectionNotFound,
		},
		{
			name: "GitHub API error returns ErrFailedDisconnect",
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				c.EXPECT().ListUserRepos(gomock.Any(), "tok", 1).
					Return(nil, errors.New("api error"))
			},
			wantErr: ErrFailedDisconnect,
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
			repos, err := proc.ListAvailableRepos(context.Background(), userID, 1)

			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assert != nil {
				tt.assert(t, repos)
			}
		})
	}
}

func TestGitHubProcessor_ConnectRepo(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()
	connID := uuid.New()

	tests := []struct {
		name    string
		mocks   func(s *MockGitHubStore, c *MockGitHubClient)
		wantErr error
	}{
		{
			name: "happy path",
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				c.EXPECT().CreateWebhook(gomock.Any(), "tok", "alice", "repo1", gomock.Any(), gomock.Any()).
					Return(int64(42), nil)
				s.EXPECT().CreateGitHubRepo(gomock.Any(), connID, int64(0), "alice", "repo1", gomock.Any(), gomock.Any(), gomock.Any()).
					Return(store.GitHubRepo{ID: uuid.New()}, nil)
			},
		},
		{
			name: "connection not found returns ErrConnectionNotFound",
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{}, store.ErrNotFound)
			},
			wantErr: ErrConnectionNotFound,
		},
		{
			name: "create webhook error returns ErrFailedDisconnect",
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				c.EXPECT().CreateWebhook(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(int64(0), errors.New("webhook error"))
			},
			wantErr: ErrFailedDisconnect,
		},
		{
			name: "create repo store error returns ErrFailedDisconnect",
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				c.EXPECT().CreateWebhook(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(int64(42), nil)
				s.EXPECT().CreateGitHubRepo(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(store.GitHubRepo{}, errors.New("db error"))
			},
			wantErr: ErrFailedDisconnect,
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
			_, err := proc.ConnectRepo(context.Background(), userID, "alice", "repo1")

			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}

func TestGitHubProcessor_DisconnectRepo(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()
	connID := uuid.New()
	repoID := uuid.New()

	tests := []struct {
		name    string
		mocks   func(s *MockGitHubStore, c *MockGitHubClient)
		wantErr error
	}{
		{
			name: "happy path – no webhook",
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				s.EXPECT().GetGitHubRepoByConnectionAndName(gomock.Any(), connID, "alice", "repo1").
					Return(store.GitHubRepo{ID: repoID}, nil)
				s.EXPECT().SoftDeleteGitHubRepo(gomock.Any(), repoID).Return(nil)
			},
		},
		{
			name: "connection not found returns ErrConnectionNotFound",
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{}, store.ErrNotFound)
			},
			wantErr: ErrConnectionNotFound,
		},
		{
			name: "repo not found returns ErrRepoNotFound",
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				s.EXPECT().GetGitHubRepoByConnectionAndName(gomock.Any(), connID, "alice", "repo1").
					Return(store.GitHubRepo{}, store.ErrNotFound)
			},
			wantErr: ErrRepoNotFound,
		},
		{
			name: "soft-delete error returns ErrFailedDisconnect",
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				s.EXPECT().GetGitHubRepoByConnectionAndName(gomock.Any(), connID, "alice", "repo1").
					Return(store.GitHubRepo{ID: repoID}, nil)
				s.EXPECT().SoftDeleteGitHubRepo(gomock.Any(), repoID).Return(errors.New("db error"))
			},
			wantErr: ErrFailedDisconnect,
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
			err := proc.DisconnectRepo(context.Background(), userID, "alice", "repo1")

			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}

func TestGitHubProcessor_ListRecentCommits(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()
	connID := uuid.New()

	tests := []struct {
		name    string
		mocks   func(s *MockGitHubStore)
		wantErr error
		assert  func(t *testing.T, commits []store.GitHubCommitSummary, total int)
	}{
		{
			name: "happy path returns commits with total",
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: connID}, nil)
				s.EXPECT().CountGitHubCommitsByConnection(gomock.Any(), connID).
					Return(42, nil)
				s.EXPECT().ListGitHubCommitsByConnection(gomock.Any(), connID, 10, 20).
					Return([]store.GitHubCommitSummary{{ID: uuid.New(), SHA: "abc123"}}, nil)
			},
			assert: func(t *testing.T, commits []store.GitHubCommitSummary, total int) {
				require.Len(t, commits, 1)
				assert.Equal(t, "abc123", commits[0].SHA)
				assert.Equal(t, 42, total)
			},
		},
		{
			name: "connection not found returns ErrConnectionNotFound",
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{}, store.ErrNotFound)
			},
			wantErr: ErrConnectionNotFound,
		},
		{
			name: "count store error returns ErrFailedDisconnect",
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: connID}, nil)
				s.EXPECT().CountGitHubCommitsByConnection(gomock.Any(), connID).
					Return(0, errors.New("db error"))
			},
			wantErr: ErrFailedDisconnect,
		},
		{
			name: "list commits store error returns ErrFailedDisconnect",
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: connID}, nil)
				s.EXPECT().CountGitHubCommitsByConnection(gomock.Any(), connID).
					Return(0, nil)
				s.EXPECT().ListGitHubCommitsByConnection(gomock.Any(), connID, 10, 20).
					Return(nil, errors.New("db error"))
			},
			wantErr: ErrFailedDisconnect,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			mockStore := NewMockGitHubStore(ctrl)
			tt.mocks(mockStore)

			proc := New(mockStore, testWebhookSecret, logger)
			commits, total, err := proc.ListRecentCommits(context.Background(), userID, 10, 20)

			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assert != nil {
				tt.assert(t, commits, total)
			}
		})
	}
}

func TestGitHubProcessor_GetCommit(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()
	commitID := uuid.New()

	tests := []struct {
		name    string
		mocks   func(s *MockGitHubStore)
		wantErr error
		assert  func(t *testing.T, commit store.GitHubCommit)
	}{
		{
			name: "happy path returns commit",
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubCommitByIDForUser(gomock.Any(), userID, commitID).
					Return(store.GitHubCommit{ID: commitID, SHA: "abc123"}, nil)
			},
			assert: func(t *testing.T, commit store.GitHubCommit) {
				assert.Equal(t, commitID, commit.ID)
				assert.Equal(t, "abc123", commit.SHA)
			},
		},
		{
			name: "not found maps to ErrCommitNotFound",
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubCommitByIDForUser(gomock.Any(), userID, commitID).
					Return(store.GitHubCommit{}, store.ErrNotFound)
			},
			wantErr: ErrCommitNotFound,
		},
		{
			name: "generic store error maps to ErrFailedGetCommit",
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubCommitByIDForUser(gomock.Any(), userID, commitID).
					Return(store.GitHubCommit{}, errors.New("db error"))
			},
			wantErr: ErrFailedGetCommit,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			mockStore := NewMockGitHubStore(ctrl)
			tt.mocks(mockStore)

			proc := New(mockStore, testWebhookSecret, logger)
			got, err := proc.GetCommit(context.Background(), userID, commitID)

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

func TestGitHubProcessor_GetCommit_RewritesCaptureURLs(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()
	commitID := uuid.New()

	captureOutput := func(t *testing.T, uploads []map[string]string) *json.RawMessage {
		payload := map[string]any{
			"commit":    "abc123",
			"stepCount": 2,
			"uploaded":  uploads,
		}
		raw, err := json.Marshal(payload)
		require.NoError(t, err)
		msg := json.RawMessage(raw)
		return &msg
	}

	type uploadedGot struct {
		Uploaded []struct {
			Key string `json:"key"`
			URL string `json:"url"`
		} `json:"uploaded"`
	}

	tests := []struct {
		name   string
		output func(t *testing.T) *json.RawMessage
		signer func(*MockURLSigner)
		assert func(t *testing.T, commit store.GitHubCommit)
	}{
		{
			name: "rewrites s3:// urls to presigned https urls",
			output: func(t *testing.T) *json.RawMessage {
				return captureOutput(t, []map[string]string{
					{"key": "captures/abc/demo/step-01.png", "url": "s3://my-bucket/captures/abc/demo/step-01.png"},
					{"key": "captures/abc/demo/recording.webm", "url": "s3://my-bucket/captures/abc/demo/recording.webm"},
				})
			},
			signer: func(m *MockURLSigner) {
				m.EXPECT().
					PresignGetURL(gomock.Any(), "captures/abc/demo/step-01.png", presignTTL).
					Return("https://presigned/step-01", nil)
				m.EXPECT().
					PresignGetURL(gomock.Any(), "captures/abc/demo/recording.webm", presignTTL).
					Return("https://presigned/recording", nil)
			},
			assert: func(t *testing.T, commit store.GitHubCommit) {
				require.NotNil(t, commit.CaptureOutput)
				var got uploadedGot
				require.NoError(t, json.Unmarshal(*commit.CaptureOutput, &got))
				require.Len(t, got.Uploaded, 2)
				assert.Equal(t, "https://presigned/step-01", got.Uploaded[0].URL)
				assert.Equal(t, "https://presigned/recording", got.Uploaded[1].URL)
			},
		},
		{
			name: "leaves non-s3 urls untouched",
			output: func(t *testing.T) *json.RawMessage {
				return captureOutput(t, []map[string]string{
					{"key": "captures/abc/demo/step-01.png", "url": "https://cdn.example.com/step-01.png"},
				})
			},
			signer: func(_ *MockURLSigner) {},
			assert: func(t *testing.T, commit store.GitHubCommit) {
				require.NotNil(t, commit.CaptureOutput)
				var got uploadedGot
				require.NoError(t, json.Unmarshal(*commit.CaptureOutput, &got))
				assert.Equal(t, "https://cdn.example.com/step-01.png", got.Uploaded[0].URL)
			},
		},
		{
			name: "presign error leaves original url intact",
			output: func(t *testing.T) *json.RawMessage {
				return captureOutput(t, []map[string]string{
					{"key": "captures/abc/demo/step-01.png", "url": "s3://my-bucket/captures/abc/demo/step-01.png"},
				})
			},
			signer: func(m *MockURLSigner) {
				m.EXPECT().
					PresignGetURL(gomock.Any(), "captures/abc/demo/step-01.png", presignTTL).
					Return("", errors.New("boom"))
			},
			assert: func(t *testing.T, commit store.GitHubCommit) {
				require.NotNil(t, commit.CaptureOutput)
				var got uploadedGot
				require.NoError(t, json.Unmarshal(*commit.CaptureOutput, &got))
				assert.Equal(t, "s3://my-bucket/captures/abc/demo/step-01.png", got.Uploaded[0].URL)
			},
		},
		{
			name:   "nil capture_output is a no-op",
			output: func(_ *testing.T) *json.RawMessage { return nil },
			signer: func(_ *MockURLSigner) {},
			assert: func(t *testing.T, commit store.GitHubCommit) {
				assert.Nil(t, commit.CaptureOutput)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			mockStore := NewMockGitHubStore(ctrl)
			mockSigner := NewMockURLSigner(ctrl)
			tt.signer(mockSigner)

			mockStore.EXPECT().GetGitHubCommitByIDForUser(gomock.Any(), userID, commitID).
				Return(store.GitHubCommit{ID: commitID, CaptureOutput: tt.output(t)}, nil)

			proc := New(mockStore, testWebhookSecret, logger)
			proc.SetURLSigner(mockSigner)

			got, err := proc.GetCommit(context.Background(), userID, commitID)
			require.NoError(t, err)
			tt.assert(t, got)
		})
	}
}

func TestGitHubProcessor_CompleteOAuth(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()

	tests := []struct {
		name    string
		state   string
		code    string
		setup   func(proc *GitHubProcessor)
		mocks   func(s *MockGitHubStore, c *MockGitHubClient)
		wantErr error
	}{
		{
			name:    "invalid state returns ErrInvalidOAuthState",
			state:   "nonexistent-state",
			code:    "somecode",
			setup:   func(proc *GitHubProcessor) {},
			mocks:   func(s *MockGitHubStore, c *MockGitHubClient) {},
			wantErr: ErrInvalidOAuthState,
		},
		{
			name:  "happy path",
			state: "valid-state-key",
			code:  "some-code",
			setup: func(proc *GitHubProcessor) {
				proc.oauthStates.Store("valid-state-key", oauthStateEntry{
					userID:    userID,
					expiresAt: expiresInFuture(),
				})
			},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				c.EXPECT().ExchangeOAuthCode(gomock.Any(), "some-code").
					Return(githubclient.OAuthTokenResponse{AccessToken: "access-tok", Scope: "repo"}, nil)
				c.EXPECT().GetAuthenticatedUser(gomock.Any(), "access-tok").
					Return(githubclient.GitHubUser{ID: 1234, Login: "alice"}, nil)
				s.EXPECT().CreateOrUpdateGitHubConnection(gomock.Any(), userID, int64(1234), "alice", "access-tok", "repo").
					Return(store.GitHubConnection{}, nil)
			},
		},
		{
			name:  "exchange code error returns ErrOAuthExchangeFailed",
			state: "exchange-err-state",
			code:  "bad-code",
			setup: func(proc *GitHubProcessor) {
				proc.oauthStates.Store("exchange-err-state", oauthStateEntry{
					userID:    userID,
					expiresAt: expiresInFuture(),
				})
			},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				c.EXPECT().ExchangeOAuthCode(gomock.Any(), "bad-code").
					Return(githubclient.OAuthTokenResponse{}, errors.New("exchange error"))
			},
			wantErr: ErrOAuthExchangeFailed,
		},
		{
			name:  "get user error returns ErrOAuthExchangeFailed",
			state: "user-err-state",
			code:  "code",
			setup: func(proc *GitHubProcessor) {
				proc.oauthStates.Store("user-err-state", oauthStateEntry{
					userID:    userID,
					expiresAt: expiresInFuture(),
				})
			},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				c.EXPECT().ExchangeOAuthCode(gomock.Any(), "code").
					Return(githubclient.OAuthTokenResponse{AccessToken: "tok"}, nil)
				c.EXPECT().GetAuthenticatedUser(gomock.Any(), "tok").
					Return(githubclient.GitHubUser{}, errors.New("user error"))
			},
			wantErr: ErrOAuthExchangeFailed,
		},
		{
			name:  "store connection error returns ErrOAuthExchangeFailed",
			state: "store-err-state",
			code:  "code",
			setup: func(proc *GitHubProcessor) {
				proc.oauthStates.Store("store-err-state", oauthStateEntry{
					userID:    userID,
					expiresAt: expiresInFuture(),
				})
			},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {
				c.EXPECT().ExchangeOAuthCode(gomock.Any(), "code").
					Return(githubclient.OAuthTokenResponse{AccessToken: "tok"}, nil)
				c.EXPECT().GetAuthenticatedUser(gomock.Any(), "tok").
					Return(githubclient.GitHubUser{ID: 1, Login: "bob"}, nil)
				s.EXPECT().CreateOrUpdateGitHubConnection(gomock.Any(), userID, int64(1), "bob", "tok", "").
					Return(store.GitHubConnection{}, errors.New("db error"))
			},
			wantErr: ErrOAuthExchangeFailed,
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
			tt.setup(&proc)

			_, err := proc.CompleteOAuth(context.Background(), tt.state, tt.code)

			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}

func TestGitHubProcessor_InitOAuth(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()

	tests := []struct {
		name    string
		wantErr error
		assert  func(t *testing.T, url string)
	}{
		{
			name: "happy path returns authorize URL",
			assert: func(t *testing.T, url string) {
				assert.Contains(t, url, "github.com/login/oauth/authorize")
				assert.Contains(t, url, "client_id=test-client-id")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			mockStore := NewMockGitHubStore(ctrl)

			proc := NewWithOAuth(mockStore, NewMockGitHubClient(ctrl), NewMockEventPublisher(ctrl), testWebhookSecret, "test-client-id", "http://localhost", logger)
			url, err := proc.InitOAuth(context.Background(), userID)

			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assert != nil {
				tt.assert(t, url)
			}
		})
	}
}

// expiresInFuture returns a time 10 minutes in the future for OAuth state entries.
func expiresInFuture() time.Time {
	return time.Now().Add(10 * time.Minute)
}

// makeRepo builds a minimal store.GitHubRepo for enqueueCaptureRequests tests.
func makeRepo(connID uuid.UUID) store.GitHubRepo {
	return store.GitHubRepo{
		ID:           uuid.New(),
		ConnectionID: connID,
		Owner:        "alice",
		Name:         "myrepo",
	}
}

// makeCommit builds a minimal store.GitHubCommit.
func makeCommit(sha, message string) store.GitHubCommit {
	return store.GitHubCommit{
		ID:      uuid.New(),
		SHA:     sha,
		Message: message,
	}
}

func TestGitHubProcessor_EnqueueCaptureRequests(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	tests := []struct {
		name    string
		commits func(repo store.GitHubRepo) []store.GitHubCommit
		mocks   func(s *MockGitHubStore, c *MockGitHubClient, p *MockEventPublisher, connID uuid.UUID, repo store.GitHubRepo)
		// classifierMocks, when non-nil, wires a MockCommitClassifier into
		// the processor with the given expectations. Leave nil to exercise
		// the unfiltered path.
		classifierMocks func(cl *MockCommitClassifier, s *MockGitHubStore)
		// assertPublished records the CaptureRequest values passed to Publish
		// for cases that need payload inspection. When nil, no payload
		// assertions are made (publisher.Publish expectations are set in mocks).
	}{
		{
			// Happy path: connection lookup succeeds, README returns an app URL,
			// diff is fetched; Publish is called once with fully-populated request.
			name: "happy path – publishes CaptureRequest with diff and app URL",
			commits: func(repo store.GitHubRepo) []store.GitHubCommit {
				return []store.GitHubCommit{makeCommit("abc123", "feat: add thing")}
			},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient, p *MockEventPublisher, connID uuid.UUID, repo store.GitHubRepo) {
				s.EXPECT().GetGitHubConnectionByID(gomock.Any(), connID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				c.EXPECT().GetRepoReadme(gomock.Any(), "tok", "alice", "myrepo").
					Return("# My App\n\nSee it live at https://myapp.example.com for details.", nil)
				c.EXPECT().GetCommitDiff(gomock.Any(), "tok", "alice", "myrepo", "abc123").
					Return("diff --git a/webapp/src/App.tsx b/webapp/src/App.tsx\n+added line", nil)
				p.EXPECT().Publish(gomock.Any(), TopicCaptureRequests, gomock.Any(), gomock.AssignableToTypeOf(CaptureRequest{})).
					DoAndReturn(func(_ context.Context, _ string, _ string, payload any) error {
						req := payload.(CaptureRequest)
						if req.Diff != "diff --git a/webapp/src/App.tsx b/webapp/src/App.tsx\n+added line" {
							t.Errorf("unexpected Diff: %q", req.Diff)
						}
						if req.AppURL != "https://myapp.example.com" {
							t.Errorf("unexpected AppURL: %q", req.AppURL)
						}
						if req.Message != "feat: add thing" {
							t.Errorf("unexpected Message: %q", req.Message)
						}
						if req.SHA != "abc123" {
							t.Errorf("unexpected SHA: %q", req.SHA)
						}
						if req.Owner != "alice" {
							t.Errorf("unexpected Owner: %q", req.Owner)
						}
						if req.Repo != "myrepo" {
							t.Errorf("unexpected Repo: %q", req.Repo)
						}
						return nil
					})
			},
		},
		{
			// Backend-only diff: the frontend gate kicks in before the LLM
			// classifier and before any Publish call. We expect exactly one
			// MarkGitHubCommitSkipped with a reason mentioning webapp.
			name: "backend-only diff – skipped by frontend gate, classifier never called",
			commits: func(repo store.GitHubRepo) []store.GitHubCommit {
				return []store.GitHubCommit{makeCommit("be0001", "chore: tweak backend logger")}
			},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient, p *MockEventPublisher, connID uuid.UUID, repo store.GitHubRepo) {
				s.EXPECT().GetGitHubConnectionByID(gomock.Any(), connID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				c.EXPECT().GetRepoReadme(gomock.Any(), "tok", "alice", "myrepo").
					Return("App: https://app.example.com", nil)
				c.EXPECT().GetCommitDiff(gomock.Any(), "tok", "alice", "myrepo", "be0001").
					Return("diff --git a/base-server/main.go b/base-server/main.go\n+foo", nil)
				s.EXPECT().
					MarkGitHubCommitSkipped(gomock.Any(), gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, _ uuid.UUID, reason string) error {
						if !strings.Contains(reason, "frontend") {
							t.Errorf("expected skip reason to mention frontend, got %q", reason)
						}
						return nil
					})
				// No Publish expectation → gomock fails if it's called.
			},
			classifierMocks: func(cl *MockCommitClassifier, _ *MockGitHubStore) {
				// Classifier should NOT be called — frontend gate short-circuits.
				// No EXPECT() here; any call would fail the test.
				_ = cl
			},
		},
		{
			// GetGitHubConnectionByID error → early return, publisher never called.
			// This is the key behavior change in commit 21861279: the function now
			// looks up by connection ID (not user ID) and returns early on error
			// rather than silently continuing per-commit.
			name: "connection lookup error – publisher never called",
			commits: func(repo store.GitHubRepo) []store.GitHubCommit {
				return []store.GitHubCommit{makeCommit("def456", "fix: bug")}
			},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient, p *MockEventPublisher, connID uuid.UUID, repo store.GitHubRepo) {
				s.EXPECT().GetGitHubConnectionByID(gomock.Any(), connID).
					Return(store.GitHubConnection{}, errors.New("db exploded"))
				// No GetRepoReadme, no GetCommitDiff, no Publish — strict controller
				// will fail the test if any of those are called.
			},
		},
		{
			// GetCommitDiff error → non-fatal: Publish is still called with Diff="".
			name: "diff error – publishes request with empty diff",
			commits: func(repo store.GitHubRepo) []store.GitHubCommit {
				return []store.GitHubCommit{makeCommit("ghi789", "chore: update deps")}
			},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient, p *MockEventPublisher, connID uuid.UUID, repo store.GitHubRepo) {
				s.EXPECT().GetGitHubConnectionByID(gomock.Any(), connID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				c.EXPECT().GetRepoReadme(gomock.Any(), "tok", "alice", "myrepo").
					Return("https://myapp.example.com", nil)
				c.EXPECT().GetCommitDiff(gomock.Any(), "tok", "alice", "myrepo", "ghi789").
					Return("", errors.New("diff API error"))
				p.EXPECT().Publish(gomock.Any(), TopicCaptureRequests, gomock.Any(), gomock.AssignableToTypeOf(CaptureRequest{})).
					DoAndReturn(func(_ context.Context, _ string, _ string, payload any) error {
						req := payload.(CaptureRequest)
						if req.Diff != "" {
							t.Errorf("expected empty Diff on diff error, got %q", req.Diff)
						}
						return nil
					})
			},
		},
		{
			// Multiple commits: diff error on first does not prevent second from publishing.
			name: "diff error on one commit does not block other commits",
			commits: func(repo store.GitHubRepo) []store.GitHubCommit {
				return []store.GitHubCommit{
					makeCommit("sha-first", "first commit"),
					makeCommit("sha-second", "second commit"),
				}
			},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient, p *MockEventPublisher, connID uuid.UUID, repo store.GitHubRepo) {
				s.EXPECT().GetGitHubConnectionByID(gomock.Any(), connID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				c.EXPECT().GetRepoReadme(gomock.Any(), "tok", "alice", "myrepo").
					Return("App: https://myapp.example.com", nil)
				c.EXPECT().GetCommitDiff(gomock.Any(), "tok", "alice", "myrepo", "sha-first").
					Return("", errors.New("timeout"))
				c.EXPECT().GetCommitDiff(gomock.Any(), "tok", "alice", "myrepo", "sha-second").
					Return("diff for second", nil)
				// Both commits must reach Publish.
				p.EXPECT().Publish(gomock.Any(), TopicCaptureRequests, gomock.Any(), gomock.AssignableToTypeOf(CaptureRequest{})).
					Times(2)
			},
		},
		{
			// Diff longer than 40_000 chars is truncated and the truncation
			// marker is appended before Publish is called.
			name: "long diff is truncated to 40_000 chars + marker",
			commits: func(repo store.GitHubRepo) []store.GitHubCommit {
				return []store.GitHubCommit{makeCommit("longsha", "big change")}
			},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient, p *MockEventPublisher, connID uuid.UUID, repo store.GitHubRepo) {
				longDiff := strings.Repeat("x", 50_000)
				s.EXPECT().GetGitHubConnectionByID(gomock.Any(), connID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				c.EXPECT().GetRepoReadme(gomock.Any(), "tok", "alice", "myrepo").
					Return("App: https://myapp.example.com", nil)
				c.EXPECT().GetCommitDiff(gomock.Any(), "tok", "alice", "myrepo", "longsha").
					Return(longDiff, nil)
				p.EXPECT().Publish(gomock.Any(), TopicCaptureRequests, gomock.Any(), gomock.AssignableToTypeOf(CaptureRequest{})).
					DoAndReturn(func(_ context.Context, _ string, _ string, payload any) error {
						req := payload.(CaptureRequest)
						const wantSuffix = "\n… [truncated]"
						const maxChars = 40_000
						want := strings.Repeat("x", maxChars) + wantSuffix
						if req.Diff != want {
							t.Errorf("truncated diff mismatch: len=%d, suffix=%q",
								len(req.Diff), req.Diff[len(req.Diff)-len(wantSuffix):])
						}
						return nil
					})
			},
		},
		{
			// Classifier flags commit as not worthwhile — should write
			// skipped_reason and never call Publish.
			name: "classifier skips commit — reason persisted, publisher never called",
			commits: func(repo store.GitHubRepo) []store.GitHubCommit {
				return []store.GitHubCommit{makeCommit("skipsha", "chore: bump lockfile")}
			},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient, p *MockEventPublisher, connID uuid.UUID, repo store.GitHubRepo) {
				s.EXPECT().GetGitHubConnectionByID(gomock.Any(), connID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				c.EXPECT().GetRepoReadme(gomock.Any(), "tok", "alice", "myrepo").Return("App: https://myapp.example.com", nil)
				c.EXPECT().GetCommitDiff(gomock.Any(), "tok", "alice", "myrepo", "skipsha").
					Return("lockfile diff", nil)
				// No Publish expectation — strict controller fails if called.
			},
			classifierMocks: func(cl *MockCommitClassifier, s *MockGitHubStore) {
				cl.EXPECT().
					Classify(gomock.Any(), "chore: bump lockfile", "lockfile diff").
					Return(commitclassifier.Verdict{Worthwhile: false, Reason: "lockfile-only change"}, nil)
				s.EXPECT().
					MarkGitHubCommitSkipped(gomock.Any(), gomock.Any(), "lockfile-only change").
					Return(nil)
			},
		},
		{
			// Classifier errors — fail-open: proceed with capture.
			name: "classifier error falls open — publish still happens",
			commits: func(repo store.GitHubRepo) []store.GitHubCommit {
				return []store.GitHubCommit{makeCommit("failopensha", "feat: add thing")}
			},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient, p *MockEventPublisher, connID uuid.UUID, repo store.GitHubRepo) {
				s.EXPECT().GetGitHubConnectionByID(gomock.Any(), connID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				c.EXPECT().GetRepoReadme(gomock.Any(), "tok", "alice", "myrepo").Return("App: https://myapp.example.com", nil)
				c.EXPECT().GetCommitDiff(gomock.Any(), "tok", "alice", "myrepo", "failopensha").
					Return("real diff", nil)
				p.EXPECT().Publish(gomock.Any(), TopicCaptureRequests, gomock.Any(), gomock.AssignableToTypeOf(CaptureRequest{})).
					Return(nil)
			},
			classifierMocks: func(cl *MockCommitClassifier, s *MockGitHubStore) {
				cl.EXPECT().Classify(gomock.Any(), "feat: add thing", "real diff").
					Return(commitclassifier.Verdict{}, errors.New("anthropic timeout"))
				// No MarkGitHubCommitSkipped — classifier failing must not
				// mark the commit as skipped.
			},
		},
		{
			// Classifier picks the commit — Publish happens, skip is not
			// persisted.
			name: "classifier picks commit — publishes, no skip recorded",
			commits: func(repo store.GitHubRepo) []store.GitHubCommit {
				return []store.GitHubCommit{makeCommit("keepsha", "feat: new pricing page")}
			},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient, p *MockEventPublisher, connID uuid.UUID, repo store.GitHubRepo) {
				s.EXPECT().GetGitHubConnectionByID(gomock.Any(), connID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				c.EXPECT().GetRepoReadme(gomock.Any(), "tok", "alice", "myrepo").Return("App: https://myapp.example.com", nil)
				c.EXPECT().GetCommitDiff(gomock.Any(), "tok", "alice", "myrepo", "keepsha").
					Return("pricing diff", nil)
				p.EXPECT().Publish(gomock.Any(), TopicCaptureRequests, gomock.Any(), gomock.AssignableToTypeOf(CaptureRequest{})).
					Return(nil)
			},
			classifierMocks: func(cl *MockCommitClassifier, s *MockGitHubStore) {
				cl.EXPECT().Classify(gomock.Any(), "feat: new pricing page", "pricing diff").
					Return(commitclassifier.Verdict{Worthwhile: true, Reason: "adds new /pricing page"}, nil)
				// No MarkGitHubCommitSkipped — worthwhile commits don't get
				// flagged in the DB.
			},
		},
		{
			// GetRepoReadme failure: we bail before fetching diffs or publishing —
			// without an app URL the capture worker has nothing to hit.
			name: "readme fetch error – bails, publisher never called",
			commits: func(repo store.GitHubRepo) []store.GitHubCommit {
				return []store.GitHubCommit{makeCommit("readme-err-sha", "add feature")}
			},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient, p *MockEventPublisher, connID uuid.UUID, repo store.GitHubRepo) {
				s.EXPECT().GetGitHubConnectionByID(gomock.Any(), connID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				c.EXPECT().GetRepoReadme(gomock.Any(), "tok", "alice", "myrepo").
					Return("", errors.New("readme not found"))
				// No GetCommitDiff, no Publish — strict controller fails if called.
			},
		},
		{
			// README present but no line mentions "App" — bail rather than
			// publish against a wrong/empty URL.
			name: "readme has no App line – bails, publisher never called",
			commits: func(repo store.GitHubRepo) []store.GitHubCommit {
				return []store.GitHubCommit{makeCommit("no-app-sha", "add feature")}
			},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient, p *MockEventPublisher, connID uuid.UUID, repo store.GitHubRepo) {
				s.EXPECT().GetGitHubConnectionByID(gomock.Any(), connID).
					Return(store.GitHubConnection{ID: connID, AccessToken: "tok"}, nil)
				c.EXPECT().GetRepoReadme(gomock.Any(), "tok", "alice", "myrepo").
					Return("# Project\n\nSee docs at https://docs.example.com for details.", nil)
				// No GetCommitDiff, no Publish — strict controller fails if called.
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			mockStore := NewMockGitHubStore(ctrl)
			mockClient := NewMockGitHubClient(ctrl)
			mockPublisher := NewMockEventPublisher(ctrl)

			connID := uuid.New()
			repo := makeRepo(connID)
			commits := tt.commits(repo)

			tt.mocks(mockStore, mockClient, mockPublisher, connID, repo)

			proc := NewWithOAuth(mockStore, mockClient, mockPublisher, testWebhookSecret, "client-id", "http://localhost", logger)
			if tt.classifierMocks != nil {
				mockClassifier := NewMockCommitClassifier(ctrl)
				tt.classifierMocks(mockClassifier, mockStore)
				proc.SetCommitClassifier(mockClassifier)
			}
			proc.enqueueCaptureRequests(context.Background(), repo, commits, false)
			// enqueueCaptureRequests returns nothing; correctness is verified
			// entirely through mock expectations and DoAndReturn assertions.
		})
	}
}

func TestDiffTouchesFrontend(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		diff string
		want bool
	}{
		{
			name: "webapp tsx file – frontend",
			diff: "diff --git a/webapp/src/App.tsx b/webapp/src/App.tsx\n+foo",
			want: true,
		},
		{
			name: "webapp scss file – frontend",
			diff: "diff --git a/webapp/src/styles/_theme.scss b/webapp/src/styles/_theme.scss\n",
			want: true,
		},
		{
			name: "backend only – not frontend",
			diff: "diff --git a/base-server/main.go b/base-server/main.go\n+foo",
			want: false,
		},
		{
			name: "capture-worker only – not frontend",
			diff: "diff --git a/capture-worker/kafka.ts b/capture-worker/kafka.ts\n+log",
			want: false,
		},
		{
			name: "docs only – not frontend",
			diff: "diff --git a/docs/PRD.md b/docs/PRD.md\n-old\n+new",
			want: false,
		},
		{
			name: "ci only – not frontend",
			diff: "diff --git a/.github/workflows/deploy.yml b/.github/workflows/deploy.yml\n",
			want: false,
		},
		{
			name: "mixed backend + webapp – frontend wins",
			diff: "diff --git a/base-server/handler.go b/base-server/handler.go\n+x\ndiff --git a/webapp/src/api.ts b/webapp/src/api.ts\n+y",
			want: true,
		},
		{
			name: "file rename into webapp – frontend",
			diff: "diff --git a/shared/foo.ts b/webapp/src/foo.ts\nsimilarity index 95%",
			want: true,
		},
		{
			name: "empty diff – unknown, defer to classifier",
			diff: "",
			want: true,
		},
		{
			name: "whitespace-only diff – unknown, defer to classifier",
			diff: "   \n\n",
			want: true,
		},
		{
			name: "no diff --git header at all – unknown, defer to classifier",
			diff: "some freeform commit summary without unified diff",
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := diffTouchesFrontend(tt.diff)
			if got != tt.want {
				t.Errorf("diffTouchesFrontend(%q) = %v, want %v", tt.diff, got, tt.want)
			}
		})
	}
}
