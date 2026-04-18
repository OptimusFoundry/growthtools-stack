package workers

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/platform/adapters"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMediaUploadWorker_Handle(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()

	accountID := uuid.New()
	postID := uuid.New()
	ppID := uuid.New()

	defaultConn := store.PlatformConnection{
		Platform:       "x",
		AccessToken:    "token123",
		AccountID:      accountID,
		PlatformUserID: "user1",
	}

	defaultPP := store.PlatformPost{
		ID:           ppID,
		PostID:       postID,
		Platform:     "x",
		Status:       store.PlatformPostStatusQueued,
		MaxAttempts:  3,
		AttemptCount: 0,
	}

	makeEvent := func() []byte {
		b, _ := json.Marshal(asyncEvent{
			PlatformPostID: ppID,
			PostID:         postID,
			AccountID:      accountID,
		})
		return b
	}

	tests := []struct {
		name     string
		setup    func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter)
		assertFn func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error)
	}{
		{
			name: "async adapter readyNow=true emits platform.publish.ready and marks media_ready",
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
							return store.Post{ID: postID, AccountID: accountID}, nil
						},
						listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
							return []store.PlatformConnection{defaultConn}, nil
						},
					},
					getPlatformPostByID: func(_ context.Context, _ uuid.UUID) (store.PlatformPost, error) {
						return defaultPP, nil
					},
				}
				adapter := &mockAsyncAdapter{
					startPublishFn: func(_ context.Context, _ adapters.PostSpec, _ store.PlatformConnection) (json.RawMessage, bool, error) {
						return json.RawMessage(`{"items":[]}`), true, nil
					},
				}
				return s, &mockEventPublisher{}, adapter
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error) {
				t.Helper()
				require.NoError(t, err)
				assert.Len(t, s.setPlatformPostMediaReadyCalls, 1)
				assert.Equal(t, ppID, s.setPlatformPostMediaReadyCalls[0])
				require.Len(t, pub.publishCalls, 1)
				assert.Equal(t, TopicPlatformPublishReady, pub.publishCalls[0].Topic)
			},
		},
		{
			name: "async adapter readyNow=false parks row in awaiting_media",
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
							return store.Post{ID: postID, AccountID: accountID}, nil
						},
						listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
							return []store.PlatformConnection{defaultConn}, nil
						},
					},
					getPlatformPostByID: func(_ context.Context, _ uuid.UUID) (store.PlatformPost, error) {
						return defaultPP, nil
					},
				}
				adapter := &mockAsyncAdapter{
					startPublishFn: func(_ context.Context, _ adapters.PostSpec, _ store.PlatformConnection) (json.RawMessage, bool, error) {
						return json.RawMessage(`{"items":[]}`), false, nil
					},
				}
				return s, &mockEventPublisher{}, adapter
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error) {
				t.Helper()
				require.NoError(t, err)
				assert.Len(t, s.setPlatformPostAwaitingMediaCalls, 1)
				assert.Len(t, pub.publishCalls, 0) // no event emitted
			},
		},
		{
			name: "StartPublish failure marks platform post failed",
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
							return store.Post{ID: postID, AccountID: accountID}, nil
						},
						listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
							return []store.PlatformConnection{defaultConn}, nil
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{defaultPP}, nil
						},
					},
					getPlatformPostByID: func(_ context.Context, _ uuid.UUID) (store.PlatformPost, error) {
						return defaultPP, nil
					},
				}
				adapter := &mockAsyncAdapter{
					startPublishFn: func(_ context.Context, _ adapters.PostSpec, _ store.PlatformConnection) (json.RawMessage, bool, error) {
						return nil, false, errors.New("upload failed")
					},
				}
				return s, &mockEventPublisher{}, adapter
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error) {
				t.Helper()
				require.NoError(t, err) // markFailed logs, does not return error
				require.Len(t, s.updatePlatformPostStatusCalls, 1)
				call := s.updatePlatformPostStatusCalls[0]
				assert.Equal(t, store.PlatformPostStatusFailed, call.Status)
				require.NotNil(t, call.ErrMessage)
				assert.Contains(t, *call.ErrMessage, "StartPublish")
				assert.NotNil(t, call.NextRetryAt)
			},
		},
		{
			name: "non-async adapter falls back to synchronous publish",
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
							return store.Post{ID: postID, AccountID: accountID}, nil
						},
						listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
							return []store.PlatformConnection{defaultConn}, nil
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{defaultPP}, nil
						},
					},
					getPlatformPostByID: func(_ context.Context, _ uuid.UUID) (store.PlatformPost, error) {
						return defaultPP, nil
					},
				}
				// mockAdapter does NOT implement AsyncPlatformAdapter
				adapter := &mockAdapter{}
				return s, &mockEventPublisher{}, adapter
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error) {
				t.Helper()
				require.NoError(t, err)
				// Should have called UpdatePlatformPostStatus with published
				require.Len(t, s.updatePlatformPostStatusCalls, 1)
				assert.Equal(t, store.PlatformPostStatusPublished, s.updatePlatformPostStatusCalls[0].Status)
			},
		},
		{
			name: "synchronous publish failure marks failed with retry",
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
							return store.Post{ID: postID, AccountID: accountID}, nil
						},
						listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
							return []store.PlatformConnection{defaultConn}, nil
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{defaultPP}, nil
						},
					},
					getPlatformPostByID: func(_ context.Context, _ uuid.UUID) (store.PlatformPost, error) {
						return defaultPP, nil
					},
				}
				adapter := &mockAdapter{
					publishFn: func(_ context.Context, _ string, _ []string, _ store.PlatformConnection) (adapters.PlatformPostResult, error) {
						return adapters.PlatformPostResult{}, errors.New("api error")
					},
				}
				return s, &mockEventPublisher{}, adapter
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error) {
				t.Helper()
				require.NoError(t, err)
				require.Len(t, s.updatePlatformPostStatusCalls, 1)
				call := s.updatePlatformPostStatusCalls[0]
				assert.Equal(t, store.PlatformPostStatusFailed, call.Status)
				assert.NotNil(t, call.NextRetryAt)
			},
		},
		{
			name: "platform post not in queued state is skipped",
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				publishingPP := defaultPP
				publishingPP.Status = store.PlatformPostStatusPublishing
				s := &mockAsyncStore{
					getPlatformPostByID: func(_ context.Context, _ uuid.UUID) (store.PlatformPost, error) {
						return publishingPP, nil
					},
				}
				return s, &mockEventPublisher{}, &mockAsyncAdapter{}
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error) {
				t.Helper()
				require.NoError(t, err)
				assert.Len(t, s.updatePlatformPostStatusCalls, 0)
				assert.Len(t, pub.publishCalls, 0)
			},
		},
		{
			name: "connection not found marks failed",
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
							return store.Post{ID: postID, AccountID: accountID}, nil
						},
						listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
							return []store.PlatformConnection{}, nil // no connections
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{defaultPP}, nil
						},
					},
					getPlatformPostByID: func(_ context.Context, _ uuid.UUID) (store.PlatformPost, error) {
						return defaultPP, nil
					},
				}
				return s, &mockEventPublisher{}, &mockAsyncAdapter{}
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error) {
				t.Helper()
				require.NoError(t, err)
				require.Len(t, s.updatePlatformPostStatusCalls, 1)
				call := s.updatePlatformPostStatusCalls[0]
				assert.Equal(t, store.PlatformPostStatusFailed, call.Status)
				require.NotNil(t, call.ErrMessage)
				assert.Contains(t, *call.ErrMessage, "connection")
			},
		},
		{
			name: "token refresh failure marks failed",
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
							return store.Post{ID: postID, AccountID: accountID}, nil
						},
						listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
							return []store.PlatformConnection{defaultConn}, nil
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{defaultPP}, nil
						},
					},
					getPlatformPostByID: func(_ context.Context, _ uuid.UUID) (store.PlatformPost, error) {
						return defaultPP, nil
					},
				}
				return s, &mockEventPublisher{}, &mockAsyncAdapter{}
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error) {
				// This is checked via the refresher injected below in the worker setup
				t.Helper()
				require.NoError(t, err)
				require.Len(t, s.updatePlatformPostStatusCalls, 1)
				call := s.updatePlatformPostStatusCalls[0]
				assert.Equal(t, store.PlatformPostStatusFailed, call.Status)
				require.NotNil(t, call.ErrMessage)
				assert.Contains(t, *call.ErrMessage, "refresh")
			},
		},
		{
			name: "invalid event JSON returns error",
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				return &mockAsyncStore{}, &mockEventPublisher{}, nil
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error) {
				t.Helper()
				require.Error(t, err)
				assert.Contains(t, err.Error(), "unmarshal")
			},
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			s, pub, adapter := tc.setup()

			var registry *adapters.AdapterRegistry
			if adapter != nil {
				registry = adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{
					"x": adapter,
				})
			} else {
				registry = adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{})
			}

			var refresher TokenRefresher
			if tc.name == "token refresh failure marks failed" {
				refresher = &mockTokenRefresher{
					ensureFreshFn: func(_ context.Context, _ store.PlatformConnection) (store.PlatformConnection, error) {
						return store.PlatformConnection{}, errors.New("refresh failed")
					},
				}
			} else {
				refresher = &mockTokenRefresher{}
			}

			w := &MediaUploadWorker{
				publisher:      pub,
				store:          s,
				registry:       registry,
				tokenRefresher: refresher,
				logger:         logger,
			}

			var payload []byte
			if tc.name == "invalid event JSON returns error" {
				payload = []byte("not json")
			} else {
				payload = makeEvent()
			}

			err := w.handle(context.Background(), nil, payload)
			tc.assertFn(t, s, pub, err)
		})
	}
}

// Compile-time check: mockAsyncStore satisfies AsyncPublishStore
var _ AsyncPublishStore = (*mockAsyncStore)(nil)

// Ensure the time import is used
var _ = time.Now
