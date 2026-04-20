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

func TestFinalizerWorker_Handle(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()

	accountID := uuid.New()
	postID := uuid.New()
	ppID := uuid.New()

	defaultHandle := json.RawMessage(`{"items":[]}`)

	defaultPP := store.PlatformPost{
		ID:           ppID,
		PostID:       postID,
		Platform:     "x",
		Status:       store.PlatformPostStatusMediaReady,
		MaxAttempts:  3,
		AttemptCount: 0,
		MediaHandle:  &defaultHandle,
	}

	defaultConn := store.PlatformConnection{
		Platform:    "x",
		AccessToken: "tok",
		AccountID:   accountID,
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
		name      string
		pp        store.PlatformPost
		adapter   adapters.PlatformAdapter
		refresher TokenRefresher
		storeFn   func() *mockAsyncStore
		assertFn  func(t *testing.T, s *mockAsyncStore, err error)
		payload   []byte
	}{
		{
			name: "happy path: Finalize succeeds, platform post marked published",
			pp:   defaultPP,
			adapter: &mockAsyncAdapter{
				finalizeFn: func(_ context.Context, _ adapters.PostSpec, _ json.RawMessage, _ store.PlatformConnection) (adapters.PlatformPostResult, error) {
					return adapters.PlatformPostResult{PlatformPostID: "tweet-123", URL: "https://x.com/status/123"}, nil
				},
			},
			storeFn: func() *mockAsyncStore {
				return &mockAsyncStore{
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
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, err error) {
				t.Helper()
				require.NoError(t, err)
				// First call is publishing flip, second is published
				published := false
				for _, c := range s.updatePlatformPostStatusCalls {
					if c.Status == store.PlatformPostStatusPublished {
						published = true
						pidStr := "tweet-123"
						assert.Equal(t, &pidStr, c.PlatformID)
						assert.NotNil(t, c.PublishedAt)
					}
				}
				assert.True(t, published, "expected at least one call with published status")
			},
		},
		{
			name: "platform post not in media_ready state is skipped",
			pp: store.PlatformPost{
				ID:       ppID,
				PostID:   postID,
				Status:   store.PlatformPostStatusPublished,
				Platform: "x",
			},
			adapter: &mockAsyncAdapter{},
			storeFn: func() *mockAsyncStore {
				pp := defaultPP
				pp.Status = store.PlatformPostStatusPublished
				return &mockAsyncStore{
					getPlatformPostByID: func(_ context.Context, _ uuid.UUID) (store.PlatformPost, error) {
						return pp, nil
					},
				}
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, err error) {
				t.Helper()
				require.NoError(t, err)
				assert.Len(t, s.updatePlatformPostStatusCalls, 0)
			},
		},
		{
			name: "Finalize failure marks platform post failed with exponential backoff",
			pp: store.PlatformPost{
				ID:           ppID,
				PostID:       postID,
				Platform:     "x",
				Status:       store.PlatformPostStatusMediaReady,
				MaxAttempts:  3,
				AttemptCount: 1, // attempt 2 out of 3
				MediaHandle:  &defaultHandle,
			},
			adapter: &mockAsyncAdapter{
				finalizeFn: func(_ context.Context, _ adapters.PostSpec, _ json.RawMessage, _ store.PlatformConnection) (adapters.PlatformPostResult, error) {
					return adapters.PlatformPostResult{}, errors.New("api error")
				},
			},
			storeFn: func() *mockAsyncStore {
				pp := defaultPP
				pp.AttemptCount = 1
				return &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
							return store.Post{ID: postID, AccountID: accountID}, nil
						},
						listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
							return []store.PlatformConnection{defaultConn}, nil
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{pp}, nil
						},
					},
					getPlatformPostByID: func(_ context.Context, _ uuid.UUID) (store.PlatformPost, error) {
						return pp, nil
					},
				}
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, err error) {
				t.Helper()
				require.NoError(t, err)
				// Find the failed status call
				var failCall *updatePlatformPostStatusCall
				for i := range s.updatePlatformPostStatusCalls {
					if s.updatePlatformPostStatusCalls[i].Status == store.PlatformPostStatusFailed {
						failCall = &s.updatePlatformPostStatusCalls[i]
						break
					}
				}
				require.NotNil(t, failCall, "expected failed status update")
				require.NotNil(t, failCall.NextRetryAt, "attempt 2 < maxAttempts 3 should schedule retry")
				// Exponential backoff: attempt 2 -> ~5 minutes
				expectedRetry := time.Now().Add(5 * time.Minute)
				assert.WithinDuration(t, expectedRetry, *failCall.NextRetryAt, 10*time.Second)
			},
		},
		{
			name: "Finalize failure at max attempts does NOT schedule next retry",
			pp: store.PlatformPost{
				ID:           ppID,
				PostID:       postID,
				Platform:     "x",
				Status:       store.PlatformPostStatusMediaReady,
				MaxAttempts:  3,
				AttemptCount: 2, // this is the last attempt
				MediaHandle:  &defaultHandle,
			},
			adapter: &mockAsyncAdapter{
				finalizeFn: func(_ context.Context, _ adapters.PostSpec, _ json.RawMessage, _ store.PlatformConnection) (adapters.PlatformPostResult, error) {
					return adapters.PlatformPostResult{}, errors.New("still broken")
				},
			},
			storeFn: func() *mockAsyncStore {
				pp := defaultPP
				pp.AttemptCount = 2
				return &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
							return store.Post{ID: postID, AccountID: accountID}, nil
						},
						listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
							return []store.PlatformConnection{defaultConn}, nil
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{pp}, nil
						},
					},
					getPlatformPostByID: func(_ context.Context, _ uuid.UUID) (store.PlatformPost, error) {
						return pp, nil
					},
				}
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, err error) {
				t.Helper()
				require.NoError(t, err)
				var failCall *updatePlatformPostStatusCall
				for i := range s.updatePlatformPostStatusCalls {
					if s.updatePlatformPostStatusCalls[i].Status == store.PlatformPostStatusFailed {
						failCall = &s.updatePlatformPostStatusCalls[i]
						break
					}
				}
				require.NotNil(t, failCall)
				assert.Nil(t, failCall.NextRetryAt, "at max attempts, no retry should be scheduled")
			},
		},
		{
			name:    "connection not found marks failed",
			pp:      defaultPP,
			adapter: &mockAsyncAdapter{},
			storeFn: func() *mockAsyncStore {
				return &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
							return store.Post{ID: postID, AccountID: accountID}, nil
						},
						listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
							return []store.PlatformConnection{}, nil
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{defaultPP}, nil
						},
					},
					getPlatformPostByID: func(_ context.Context, _ uuid.UUID) (store.PlatformPost, error) {
						return defaultPP, nil
					},
				}
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, err error) {
				t.Helper()
				require.NoError(t, err)
				var failCall *updatePlatformPostStatusCall
				for i := range s.updatePlatformPostStatusCalls {
					if s.updatePlatformPostStatusCalls[i].Status == store.PlatformPostStatusFailed {
						failCall = &s.updatePlatformPostStatusCalls[i]
						break
					}
				}
				require.NotNil(t, failCall)
				require.NotNil(t, failCall.ErrMessage)
				assert.Contains(t, *failCall.ErrMessage, "connection")
			},
		},
		{
			name:    "non-async adapter marks failed",
			pp:      defaultPP,
			adapter: &mockAdapter{}, // does not implement AsyncPlatformAdapter
			storeFn: func() *mockAsyncStore {
				return &mockAsyncStore{
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
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, err error) {
				t.Helper()
				require.NoError(t, err)
				var failCall *updatePlatformPostStatusCall
				for i := range s.updatePlatformPostStatusCalls {
					if s.updatePlatformPostStatusCalls[i].Status == store.PlatformPostStatusFailed {
						failCall = &s.updatePlatformPostStatusCalls[i]
						break
					}
				}
				require.NotNil(t, failCall)
				require.NotNil(t, failCall.ErrMessage)
				assert.Contains(t, *failCall.ErrMessage, "not async-capable")
			},
		},
		{
			name: "invalid event JSON returns error",
			storeFn: func() *mockAsyncStore {
				return &mockAsyncStore{}
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, err error) {
				t.Helper()
				require.Error(t, err)
				assert.Contains(t, err.Error(), "unmarshal")
			},
			payload: []byte("not json"),
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			s := tc.storeFn()

			var registry *adapters.AdapterRegistry
			if tc.adapter != nil {
				registry = adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{"x": tc.adapter})
			} else {
				registry = adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{})
			}

			refresher := tc.refresher
			if refresher == nil {
				refresher = &mockTokenRefresher{}
			}

			w := &FinalizerWorker{
				store:          s,
				registry:       registry,
				tokenRefresher: refresher,
				logger:         logger,
			}

			payload := tc.payload
			if payload == nil {
				payload = makeEvent()
			}

			err := w.handle(context.Background(), nil, payload)
			tc.assertFn(t, s, err)
		})
	}
}
