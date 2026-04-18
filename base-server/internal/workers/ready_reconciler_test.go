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

func TestReadyReconciler_Advance(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()

	accountID := uuid.New()
	postID := uuid.New()
	ppID := uuid.New()

	defaultHandle := json.RawMessage(`{"items":[]}`)
	rawHandle := defaultHandle

	makeRow := func(updatedAt time.Time) store.RetryablePlatformPost {
		return store.RetryablePlatformPost{
			PlatformPost: store.PlatformPost{
				ID:           ppID,
				PostID:       postID,
				Platform:     "x",
				Status:       store.PlatformPostStatusAwaitingMedia,
				MaxAttempts:  3,
				AttemptCount: 0,
				MediaHandle:  &rawHandle,
				UpdatedAt:    updatedAt,
			},
			AccountID: accountID,
		}
	}

	freshRow := makeRow(time.Now())

	defaultConn := store.PlatformConnection{
		Platform:    "x",
		AccessToken: "tok",
		AccountID:   accountID,
	}

	tests := []struct {
		name     string
		row      store.RetryablePlatformPost
		setup    func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter)
		assertFn func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher)
	}{
		{
			name: "CheckReady returns ready=true marks media_ready and emits publish.ready",
			row:  freshRow,
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
							return []store.PlatformConnection{defaultConn}, nil
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{freshRow.PlatformPost}, nil
						},
					},
				}
				adapter := &mockAsyncAdapter{
					checkReadyFn: func(_ context.Context, h json.RawMessage, _ store.PlatformConnection) (bool, json.RawMessage, error) {
						return true, h, nil
					},
				}
				return s, &mockEventPublisher{}, adapter
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher) {
				t.Helper()
				assert.Len(t, s.setPlatformPostMediaReadyCalls, 1)
				require.Len(t, pub.publishCalls, 1)
				assert.Equal(t, TopicPlatformPublishReady, pub.publishCalls[0].Topic)
			},
		},
		{
			name: "CheckReady returns ready=false updates handle in db and waits",
			row:  freshRow,
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
							return []store.PlatformConnection{defaultConn}, nil
						},
					},
				}
				adapter := &mockAsyncAdapter{
					checkReadyFn: func(_ context.Context, h json.RawMessage, _ store.PlatformConnection) (bool, json.RawMessage, error) {
						return false, json.RawMessage(`{"updated":true}`), nil
					},
				}
				return s, &mockEventPublisher{}, adapter
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher) {
				t.Helper()
				assert.Len(t, s.setPlatformPostAwaitingMediaCalls, 1)
				assert.Len(t, pub.publishCalls, 0)
			},
		},
		{
			name: "CheckReady returns error marks platform post failed with retry",
			row:  freshRow,
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
							return []store.PlatformConnection{defaultConn}, nil
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{freshRow.PlatformPost}, nil
						},
					},
				}
				adapter := &mockAsyncAdapter{
					checkReadyFn: func(_ context.Context, h json.RawMessage, _ store.PlatformConnection) (bool, json.RawMessage, error) {
						return false, h, errors.New("media processing failed")
					},
				}
				return s, &mockEventPublisher{}, adapter
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher) {
				t.Helper()
				require.Len(t, s.updatePlatformPostStatusCalls, 1)
				call := s.updatePlatformPostStatusCalls[0]
				assert.Equal(t, store.PlatformPostStatusFailed, call.Status)
				require.NotNil(t, call.ErrMessage)
				assert.NotNil(t, call.NextRetryAt) // attempt 1 < maxAttempts 3
			},
		},
		{
			name: "row past stuckAfter is failed",
			row:  makeRow(time.Now().Add(-4 * time.Minute)),
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							pp := freshRow.PlatformPost
							pp.UpdatedAt = time.Now().Add(-4 * time.Minute)
							return []store.PlatformPost{pp}, nil
						},
					},
				}
				return s, &mockEventPublisher{}, &mockAsyncAdapter{}
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher) {
				t.Helper()
				require.Len(t, s.updatePlatformPostStatusCalls, 1)
				call := s.updatePlatformPostStatusCalls[0]
				assert.Equal(t, store.PlatformPostStatusFailed, call.Status)
				require.NotNil(t, call.ErrMessage)
				assert.Contains(t, *call.ErrMessage, "stuck-after")
			},
		},
		{
			name: "missing media_handle fails the row",
			row: store.RetryablePlatformPost{
				PlatformPost: store.PlatformPost{
					ID:           ppID,
					PostID:       postID,
					Platform:     "x",
					Status:       store.PlatformPostStatusAwaitingMedia,
					MaxAttempts:  3,
					AttemptCount: 0,
					MediaHandle:  nil, // no handle
					UpdatedAt:    time.Now(),
				},
				AccountID: accountID,
			},
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
							return []store.PlatformConnection{defaultConn}, nil
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{}, nil
						},
					},
				}
				return s, &mockEventPublisher{}, &mockAsyncAdapter{}
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher) {
				t.Helper()
				require.Len(t, s.updatePlatformPostStatusCalls, 1)
				call := s.updatePlatformPostStatusCalls[0]
				assert.Equal(t, store.PlatformPostStatusFailed, call.Status)
				require.NotNil(t, call.ErrMessage)
				assert.Contains(t, *call.ErrMessage, "missing media_handle")
			},
		},
		{
			name: "adapter not found fails the row",
			row:  freshRow,
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{}, nil
						},
					},
				}
				return s, &mockEventPublisher{}, nil // nil = no adapter registered
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher) {
				t.Helper()
				require.Len(t, s.updatePlatformPostStatusCalls, 1)
				call := s.updatePlatformPostStatusCalls[0]
				assert.Equal(t, store.PlatformPostStatusFailed, call.Status)
				require.NotNil(t, call.ErrMessage)
				assert.Contains(t, *call.ErrMessage, "no adapter")
			},
		},
		{
			name: "non-async adapter fails the row",
			row:  freshRow,
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{}, nil
						},
					},
				}
				// mockAdapter does not implement AsyncPlatformAdapter
				return s, &mockEventPublisher{}, &mockAdapter{}
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher) {
				t.Helper()
				require.Len(t, s.updatePlatformPostStatusCalls, 1)
				call := s.updatePlatformPostStatusCalls[0]
				assert.Equal(t, store.PlatformPostStatusFailed, call.Status)
				require.NotNil(t, call.ErrMessage)
				assert.Contains(t, *call.ErrMessage, "not async-capable")
			},
		},
		{
			name: "connection not found fails the row",
			row:  freshRow,
			setup: func() (*mockAsyncStore, *mockEventPublisher, adapters.PlatformAdapter) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						listPlatformConnectionsByAccount: func(_ context.Context, _ uuid.UUID) ([]store.PlatformConnection, error) {
							return []store.PlatformConnection{}, nil
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{}, nil
						},
					},
				}
				return s, &mockEventPublisher{}, &mockAsyncAdapter{}
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher) {
				t.Helper()
				require.Len(t, s.updatePlatformPostStatusCalls, 1)
				call := s.updatePlatformPostStatusCalls[0]
				assert.Equal(t, store.PlatformPostStatusFailed, call.Status)
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
				registry = adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{"x": adapter})
			} else {
				registry = adapters.NewAdapterRegistry(map[string]adapters.PlatformAdapter{})
			}

			reconciler := &ReadyReconciler{
				store:          s,
				publisher:      pub,
				registry:       registry,
				tokenRefresher: &mockTokenRefresher{},
				logger:         logger,
				interval:       time.Second,
				batchSize:      50,
				stuckAfter:     3 * time.Minute,
			}
			reconciler.advance(context.Background(), tc.row)
			tc.assertFn(t, s, pub)
		})
	}
}

func TestReadyReconciler_Tick(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()

	t.Run("tick with no awaiting_media rows is no-op", func(t *testing.T) {
		t.Parallel()
		s := &mockAsyncStore{
			listPlatformPostsAwaitingMedia: func(_ context.Context, _ int) ([]store.RetryablePlatformPost, error) {
				return nil, nil
			},
		}
		reconciler := &ReadyReconciler{
			store:          s,
			publisher:      &mockEventPublisher{},
			registry:       adapters.NewAdapterRegistry(nil),
			tokenRefresher: &mockTokenRefresher{},
			logger:         logger,
			interval:       time.Second,
			batchSize:      50,
			stuckAfter:     3 * time.Minute,
		}
		err := reconciler.tick(context.Background())
		require.NoError(t, err)
		assert.Len(t, s.updatePlatformPostStatusCalls, 0)
	})

	t.Run("tick store error returns wrapped error", func(t *testing.T) {
		t.Parallel()
		s := &mockAsyncStore{
			listPlatformPostsAwaitingMedia: func(_ context.Context, _ int) ([]store.RetryablePlatformPost, error) {
				return nil, errors.New("db error")
			},
		}
		reconciler := &ReadyReconciler{
			store:          s,
			publisher:      &mockEventPublisher{},
			registry:       adapters.NewAdapterRegistry(nil),
			tokenRefresher: &mockTokenRefresher{},
			logger:         logger,
			interval:       time.Second,
			batchSize:      50,
			stuckAfter:     3 * time.Minute,
		}
		err := reconciler.tick(context.Background())
		require.Error(t, err)
	})
}
