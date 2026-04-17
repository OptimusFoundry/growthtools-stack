package processor

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"testing"
	"time"

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
		assert  func(t *testing.T, commits []store.GitHubCommit)
	}{
		{
			name: "happy path",
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: connID}, nil)
				s.EXPECT().ListGitHubCommitsByConnection(gomock.Any(), connID, 10, 0).
					Return([]store.GitHubCommit{{ID: uuid.New(), SHA: "abc123"}}, nil)
			},
			assert: func(t *testing.T, commits []store.GitHubCommit) {
				require.Len(t, commits, 1)
				assert.Equal(t, "abc123", commits[0].SHA)
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
			name: "list commits store error returns ErrFailedDisconnect",
			mocks: func(s *MockGitHubStore) {
				s.EXPECT().GetGitHubConnectionByUserID(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: connID}, nil)
				s.EXPECT().ListGitHubCommitsByConnection(gomock.Any(), connID, 10, 0).
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
			commits, err := proc.ListRecentCommits(context.Background(), userID, 10)

			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assert != nil {
				tt.assert(t, commits)
			}
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
			name:  "invalid state returns ErrInvalidOAuthState",
			state: "nonexistent-state",
			code:  "somecode",
			setup: func(proc *GitHubProcessor) {},
			mocks: func(s *MockGitHubStore, c *MockGitHubClient) {},
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
