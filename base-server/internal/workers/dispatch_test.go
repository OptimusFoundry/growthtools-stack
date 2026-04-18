package workers

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDispatchWorker_Handle(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()

	accountID := uuid.New()
	postID := uuid.New()
	pp1ID := uuid.New()
	pp2ID := uuid.New()
	pp3ID := uuid.New()

	makeEvent := func(pID uuid.UUID) []byte {
		b, _ := json.Marshal(PublishEvent{PostID: pID, AccountID: accountID})
		return b
	}

	tests := []struct {
		name       string
		setup      func() (*mockAsyncStore, *mockEventPublisher, []byte)
		assertFn   func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error)
		wantErr    bool
		errContains string
	}{
		{
			name: "happy path fans out to all pending platform posts",
			setup: func() (*mockAsyncStore, *mockEventPublisher, []byte) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
							return store.Post{ID: postID, AccountID: accountID}, nil
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{
								{ID: pp1ID, PostID: postID, Platform: "x", Status: store.PlatformPostStatusPending},
								{ID: pp2ID, PostID: postID, Platform: "linkedin", Status: store.PlatformPostStatusPending},
							}, nil
						},
					},
				}
				return s, &mockEventPublisher{}, makeEvent(postID)
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error) {
				t.Helper()
				require.NoError(t, err)
				assert.Len(t, s.setPlatformPostQueuedCalls, 2)
				assert.Len(t, pub.publishCalls, 2)
				for _, call := range pub.publishCalls {
					assert.Equal(t, TopicPlatformPublishRequested, call.Topic)
				}
			},
		},
		{
			name: "already queued or published posts are skipped",
			setup: func() (*mockAsyncStore, *mockEventPublisher, []byte) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
							return store.Post{ID: postID, AccountID: accountID}, nil
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{
								{ID: pp1ID, PostID: postID, Platform: "x", Status: store.PlatformPostStatusPending},
								{ID: pp2ID, PostID: postID, Platform: "linkedin", Status: store.PlatformPostStatusQueued},
								{ID: pp3ID, PostID: postID, Platform: "bluesky", Status: store.PlatformPostStatusPublished},
							}, nil
						},
					},
				}
				return s, &mockEventPublisher{}, makeEvent(postID)
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error) {
				t.Helper()
				require.NoError(t, err)
				// Only the pending one gets queued + event
				assert.Len(t, s.setPlatformPostQueuedCalls, 1)
				assert.Equal(t, pp1ID, s.setPlatformPostQueuedCalls[0])
				assert.Len(t, pub.publishCalls, 1)
			},
		},
		{
			name: "post not found returns error",
			setup: func() (*mockAsyncStore, *mockEventPublisher, []byte) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
							return store.Post{}, errors.New("not found")
						},
					},
				}
				return s, &mockEventPublisher{}, makeEvent(postID)
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error) {
				t.Helper()
				require.Error(t, err)
				assert.Len(t, pub.publishCalls, 0)
			},
		},
		{
			name: "platform posts load error returns error",
			setup: func() (*mockAsyncStore, *mockEventPublisher, []byte) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
							return store.Post{ID: postID, AccountID: accountID}, nil
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return nil, errors.New("db error")
						},
					},
				}
				return s, &mockEventPublisher{}, makeEvent(postID)
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error) {
				t.Helper()
				require.Error(t, err)
				assert.Len(t, pub.publishCalls, 0)
			},
		},
		{
			name: "SetPlatformPostQueued failure logs and continues to next platform post",
			setup: func() (*mockAsyncStore, *mockEventPublisher, []byte) {
				callCount := 0
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
							return store.Post{ID: postID, AccountID: accountID}, nil
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{
								{ID: pp1ID, PostID: postID, Platform: "x", Status: store.PlatformPostStatusPending},
								{ID: pp2ID, PostID: postID, Platform: "linkedin", Status: store.PlatformPostStatusPending},
							}, nil
						},
					},
					setPlatformPostQueued: func(_ context.Context, id uuid.UUID) error {
						callCount++
						if id == pp1ID {
							return errors.New("db write failed")
						}
						return nil
					},
				}
				return s, &mockEventPublisher{}, makeEvent(postID)
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error) {
				t.Helper()
				require.NoError(t, err)
				// pp1 failed queue, no event; pp2 should still get event
				assert.Len(t, pub.publishCalls, 1)
				assert.Equal(t, pp2ID.String(), pub.publishCalls[0].Key)
			},
		},
		{
			name: "publisher failure logs and continues to next platform post",
			setup: func() (*mockAsyncStore, *mockEventPublisher, []byte) {
				s := &mockAsyncStore{
					mockPublishStore: mockPublishStore{
						getPostByID: func(_ context.Context, _, _ uuid.UUID) (store.Post, error) {
							return store.Post{ID: postID, AccountID: accountID}, nil
						},
						getPlatformPostsByPostID: func(_ context.Context, _ uuid.UUID) ([]store.PlatformPost, error) {
							return []store.PlatformPost{
								{ID: pp1ID, PostID: postID, Platform: "x", Status: store.PlatformPostStatusPending},
								{ID: pp2ID, PostID: postID, Platform: "linkedin", Status: store.PlatformPostStatusPending},
							}, nil
						},
					},
				}
				callCount := 0
				pub := &mockEventPublisher{
					publishFn: func(_ context.Context, _, _ string, _ any) error {
						callCount++
						if callCount == 1 {
							return errors.New("kafka unavailable")
						}
						return nil
					},
				}
				return s, pub, makeEvent(postID)
			},
			assertFn: func(t *testing.T, s *mockAsyncStore, pub *mockEventPublisher, err error) {
				t.Helper()
				require.NoError(t, err)
				// Both publish attempts were made despite first failure
				assert.Len(t, pub.publishCalls, 2)
			},
		},
		{
			name:        "invalid event JSON returns error",
			setup: func() (*mockAsyncStore, *mockEventPublisher, []byte) {
				return &mockAsyncStore{}, &mockEventPublisher{}, []byte("not json")
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
			s, pub, payload := tc.setup()
			w := &DispatchWorker{
				publisher: pub,
				store:     s,
				logger:    logger,
			}
			err := w.handle(context.Background(), nil, payload)
			tc.assertFn(t, s, pub, err)
		})
	}
}
