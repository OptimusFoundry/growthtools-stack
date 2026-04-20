package workers

import (
	"context"
	"errors"
	"testing"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAnalyticsProducerWorker_ProcessAnalytics(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()

	tests := []struct {
		name                 string
		storeSetup           func() AnalyticsProducerStore
		publisherSetup       func() *mockEventPublisher
		expectedPublishCount int
		wantErr              bool
		assertFn             func(t *testing.T, pub *mockEventPublisher)
	}{
		{
			name: "happy_path_two_posts",
			storeSetup: func() AnalyticsProducerStore {
				accountID1 := uuid.New()
				accountID2 := uuid.New()
				platformPostID1 := uuid.New()
				platformPostID2 := uuid.New()

				return &mockAnalyticsProducerStore{
					getPublishedPlatformPostsForAnalytics: func(_ context.Context, _ time.Time) ([]store.RetryablePlatformPost, error) {
						return []store.RetryablePlatformPost{
							{
								PlatformPost: store.PlatformPost{
									ID:       platformPostID1,
									Platform: "x",
								},
								AccountID: accountID1,
							},
							{
								PlatformPost: store.PlatformPost{
									ID:       platformPostID2,
									Platform: "bluesky",
								},
								AccountID: accountID2,
							},
						}, nil
					},
				}
			},
			publisherSetup: func() *mockEventPublisher {
				return &mockEventPublisher{}
			},
			expectedPublishCount: 2,
			wantErr:              false,
			assertFn: func(t *testing.T, pub *mockEventPublisher) {
				t.Helper()
				require.Len(t, pub.publishCalls, 2)

				// Check first call
				assert.Equal(t, "analytics.collect", pub.publishCalls[0].Topic)
				event0, ok := pub.publishCalls[0].Payload.(AnalyticsCollectEvent)
				require.True(t, ok, "payload should be AnalyticsCollectEvent")
				assert.Equal(t, "x", event0.Platform)
				assert.NotEqual(t, uuid.Nil, event0.AccountID)
				assert.NotEqual(t, uuid.Nil, event0.PlatformPostID)

				// Check second call
				assert.Equal(t, "analytics.collect", pub.publishCalls[1].Topic)
				event1, ok := pub.publishCalls[1].Payload.(AnalyticsCollectEvent)
				require.True(t, ok, "payload should be AnalyticsCollectEvent")
				assert.Equal(t, "bluesky", event1.Platform)
				assert.NotEqual(t, uuid.Nil, event1.AccountID)
				assert.NotEqual(t, uuid.Nil, event1.PlatformPostID)
			},
		},
		{
			name: "store_error",
			storeSetup: func() AnalyticsProducerStore {
				return &mockAnalyticsProducerStore{
					getPublishedPlatformPostsForAnalytics: func(_ context.Context, _ time.Time) ([]store.RetryablePlatformPost, error) {
						return nil, errors.New("db down")
					},
				}
			},
			publisherSetup: func() *mockEventPublisher {
				return &mockEventPublisher{}
			},
			expectedPublishCount: 0,
			wantErr:              true,
			assertFn: func(t *testing.T, pub *mockEventPublisher) {
				t.Helper()
				assert.Len(t, pub.publishCalls, 0)
			},
		},
		{
			name: "producer_error_first_row_continues",
			storeSetup: func() AnalyticsProducerStore {
				accountID1 := uuid.New()
				accountID2 := uuid.New()
				platformPostID1 := uuid.New()
				platformPostID2 := uuid.New()

				return &mockAnalyticsProducerStore{
					getPublishedPlatformPostsForAnalytics: func(_ context.Context, _ time.Time) ([]store.RetryablePlatformPost, error) {
						return []store.RetryablePlatformPost{
							{
								PlatformPost: store.PlatformPost{
									ID:       platformPostID1,
									Platform: "x",
								},
								AccountID: accountID1,
							},
							{
								PlatformPost: store.PlatformPost{
									ID:       platformPostID2,
									Platform: "threads",
								},
								AccountID: accountID2,
							},
						}, nil
					},
				}
			},
			publisherSetup: func() *mockEventPublisher {
				callCount := 0
				return &mockEventPublisher{
					publishFn: func(_ context.Context, _, _ string, _ any) error {
						callCount++
						// First call fails, second succeeds
						if callCount == 1 {
							return errors.New("kafka error")
						}
						return nil
					},
				}
			},
			expectedPublishCount: 0, // We track successful publishes via the mock
			wantErr:              false,
			assertFn: func(t *testing.T, pub *mockEventPublisher) {
				t.Helper()
				// Both Publish calls should have been attempted
				require.Len(t, pub.publishCalls, 2)

				// First call failed but was logged, second succeeded
				assert.Equal(t, "analytics.collect", pub.publishCalls[0].Topic)
				assert.Equal(t, "analytics.collect", pub.publishCalls[1].Topic)
			},
		},
		{
			name: "empty_result",
			storeSetup: func() AnalyticsProducerStore {
				return &mockAnalyticsProducerStore{
					getPublishedPlatformPostsForAnalytics: func(_ context.Context, _ time.Time) ([]store.RetryablePlatformPost, error) {
						return make([]store.RetryablePlatformPost, 0), nil
					},
				}
			},
			publisherSetup: func() *mockEventPublisher {
				return &mockEventPublisher{}
			},
			expectedPublishCount: 0,
			wantErr:              false,
			assertFn: func(t *testing.T, pub *mockEventPublisher) {
				t.Helper()
				assert.Len(t, pub.publishCalls, 0)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			ctx := context.Background()
			storeMock := tt.storeSetup()
			pubMock := tt.publisherSetup()

			worker := &AnalyticsProducerWorker{
				store:    storeMock,
				producer: pubMock,
				logger:   logger,
				interval: time.Hour,
			}

			err := worker.processAnalytics(ctx)

			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}

			tt.assertFn(t, pubMock)
		})
	}
}

// mockAnalyticsProducerStore implements AnalyticsProducerStore for testing
type mockAnalyticsProducerStore struct {
	getPublishedPlatformPostsForAnalytics func(ctx context.Context, cutoff time.Time) ([]store.RetryablePlatformPost, error)
}

func (m *mockAnalyticsProducerStore) GetPublishedPlatformPostsForAnalytics(ctx context.Context, cutoff time.Time) ([]store.RetryablePlatformPost, error) {
	if m.getPublishedPlatformPostsForAnalytics != nil {
		return m.getPublishedPlatformPostsForAnalytics(ctx, cutoff)
	}
	return make([]store.RetryablePlatformPost, 0), nil
}

var _ AnalyticsProducerStore = (*mockAnalyticsProducerStore)(nil)
