package workers

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"base-server/internal/infra/observability"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockCaptureStore is a minimal hand-rolled stub for CaptureResultStore.
type mockCaptureStore struct {
	updateFn func(ctx context.Context, commitID uuid.UUID, captureOutput json.RawMessage) error
}

func (m *mockCaptureStore) UpdateGitHubCommitCapture(ctx context.Context, commitID uuid.UUID, captureOutput json.RawMessage) error {
	if m.updateFn != nil {
		return m.updateFn(ctx, commitID, captureOutput)
	}
	return nil
}

// mockDraftPublisher is a minimal hand-rolled stub for DraftEventPublisher.
type mockDraftPublisher struct {
	publishFn     func(ctx context.Context, topic, key string, payload any) error
	publishCalled int
}

func (m *mockDraftPublisher) Publish(ctx context.Context, topic, key string, payload any) error {
	m.publishCalled++
	if m.publishFn != nil {
		return m.publishFn(ctx, topic, key, payload)
	}
	return nil
}

func TestCaptureResultWorker_Handle(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	commitID := uuid.New()

	successMsg := func() []byte {
		b, _ := json.Marshal(CaptureResultMessage{
			CommitID:   commitID,
			SHA:        "abc123",
			Success:    true,
			StepCount:  3,
			CaptureDir: "captures/abc",
			Uploaded: []CaptureUpload{
				{Key: "captures/abc/demo.mp4", URL: "https://s3.example.com/demo.mp4"},
			},
		})
		return b
	}

	failMsg := func() []byte {
		b, _ := json.Marshal(CaptureResultMessage{
			CommitID: commitID,
			SHA:      "abc123",
			Success:  false,
			Error:    "headless chrome crashed",
		})
		return b
	}

	tests := []struct {
		name          string
		value         []byte
		store         CaptureResultStore
		publisher     DraftEventPublisher
		wantErr       bool
		assertPublish func(t *testing.T, pub *mockDraftPublisher)
	}{
		{
			name:  "happy path success=true persists and publishes both draft and blog events",
			value: successMsg(),
			store: &mockCaptureStore{},
			publisher: &mockDraftPublisher{
				publishFn: func(_ context.Context, topic, key string, payload any) error {
					assert.Contains(t, []string{TopicDraftGenerate, TopicBlogGenerate}, topic)
					assert.Equal(t, commitID.String(), key)
					switch topic {
					case TopicDraftGenerate:
						evt, ok := payload.(DraftGenerateEvent)
						require.True(t, ok)
						assert.Equal(t, commitID, evt.CommitID)
					case TopicBlogGenerate:
						evt, ok := payload.(BlogGenerateEvent)
						require.True(t, ok)
						assert.Equal(t, commitID, evt.CommitID)
					}
					return nil
				},
			},
			assertPublish: func(t *testing.T, pub *mockDraftPublisher) {
				t.Helper()
				assert.Equal(t, 2, pub.publishCalled)
			},
		},
		{
			name:      "success=false does NOT publish",
			value:     failMsg(),
			store:     &mockCaptureStore{},
			publisher: &mockDraftPublisher{},
			assertPublish: func(t *testing.T, pub *mockDraftPublisher) {
				t.Helper()
				assert.Equal(t, 0, pub.publishCalled)
			},
		},
		{
			name:      "nil publisher is tolerated — persists without publish",
			value:     successMsg(),
			store:     &mockCaptureStore{},
			publisher: nil,
		},
		{
			name:  "publish failure does not surface as error — persistence succeeded",
			value: successMsg(),
			store: &mockCaptureStore{},
			publisher: &mockDraftPublisher{
				publishFn: func(_ context.Context, _, _ string, _ any) error {
					return errors.New("kafka unavailable")
				},
			},
			wantErr: false, // persistence already done; both publish failures are swallowed
			assertPublish: func(t *testing.T, pub *mockDraftPublisher) {
				t.Helper()
				assert.Equal(t, 2, pub.publishCalled)
			},
		},
		{
			name:    "invalid JSON returns error",
			value:   []byte("not json"),
			store:   &mockCaptureStore{},
			wantErr: true,
		},
		{
			name:  "store persistence failure returns error",
			value: successMsg(),
			store: &mockCaptureStore{
				updateFn: func(_ context.Context, _ uuid.UUID, _ json.RawMessage) error {
					return errors.New("db down")
				},
			},
			publisher: &mockDraftPublisher{},
			wantErr:   true,
			assertPublish: func(t *testing.T, pub *mockDraftPublisher) {
				t.Helper()
				// Publish must NOT be called when persistence fails.
				assert.Equal(t, 0, pub.publishCalled)
			},
		},
		{
			name: "failure message without error text uses default",
			value: func() []byte {
				b, _ := json.Marshal(CaptureResultMessage{
					CommitID: commitID,
					SHA:      "abc123",
					Success:  false,
					Error:    "", // empty error field
				})
				return b
			}(),
			store: &mockCaptureStore{
				updateFn: func(_ context.Context, _ uuid.UUID, payload json.RawMessage) error {
					var m map[string]any
					require.NoError(t, json.Unmarshal(payload, &m))
					errMsg, _ := m["error"].(string)
					assert.Contains(t, errMsg, "capture-worker reported failure without detail")
					return nil
				},
			},
			publisher: &mockDraftPublisher{},
		},
		{
			name:  "success message contains correct payload fields",
			value: successMsg(),
			store: &mockCaptureStore{
				updateFn: func(_ context.Context, _ uuid.UUID, payload json.RawMessage) error {
					var m map[string]any
					require.NoError(t, json.Unmarshal(payload, &m))
					// Must have the uploaded field (from the success message shape).
					_, hasUploaded := m["uploaded"]
					assert.True(t, hasUploaded)
					return nil
				},
			},
			publisher: &mockDraftPublisher{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			var pub *mockDraftPublisher
			if tt.publisher != nil {
				pub = tt.publisher.(*mockDraftPublisher)
			}

			w := &CaptureResultWorker{
				store:     tt.store,
				publisher: tt.publisher,
				logger:    logger,
			}

			err := w.handle(context.Background(), nil, tt.value)
			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}

			if tt.assertPublish != nil && pub != nil {
				tt.assertPublish(t, pub)
			}
		})
	}
}
