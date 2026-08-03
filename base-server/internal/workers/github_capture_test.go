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

// mockCaptureStore is a minimal hand-rolled stub for CaptureResultStore.
type mockCaptureStore struct {
	updateFn                func(ctx context.Context, commitID uuid.UUID, captureOutput json.RawMessage) error
	updateShowcaseCaptureFn func(ctx context.Context, jobID uuid.UUID, captureOutput json.RawMessage) error
	updateShowcaseFailedFn  func(ctx context.Context, jobID uuid.UUID, errMsg string) error

	showcaseFailedCalledWith struct {
		jobID  uuid.UUID
		errMsg string
	}
	showcaseFailedCalled int
}

func (m *mockCaptureStore) UpdateGitHubCommitCapture(ctx context.Context, commitID uuid.UUID, captureOutput json.RawMessage) error {
	if m.updateFn != nil {
		return m.updateFn(ctx, commitID, captureOutput)
	}
	return nil
}

func (m *mockCaptureStore) UpdateShowcaseJobCapture(ctx context.Context, jobID uuid.UUID, captureOutput json.RawMessage) error {
	if m.updateShowcaseCaptureFn != nil {
		return m.updateShowcaseCaptureFn(ctx, jobID, captureOutput)
	}
	return nil
}

func (m *mockCaptureStore) UpdateShowcaseJobFailed(ctx context.Context, jobID uuid.UUID, errMsg string) error {
	m.showcaseFailedCalled++
	m.showcaseFailedCalledWith.jobID = jobID
	m.showcaseFailedCalledWith.errMsg = errMsg
	if m.updateShowcaseFailedFn != nil {
		return m.updateShowcaseFailedFn(ctx, jobID, errMsg)
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

func TestCaptureResultWorker_Handle_ShowcaseRouting(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	jobID := uuid.New()

	successMsg := func() []byte {
		b, _ := json.Marshal(CaptureResultMessage{
			CommitID:   jobID,
			SHA:        "abc123",
			Success:    true,
			StepCount:  1,
			CaptureDir: "captures/showcase",
		})
		return b
	}

	failMsg := func() []byte {
		b, _ := json.Marshal(CaptureResultMessage{
			CommitID: jobID,
			SHA:      "abc123",
			Success:  false,
			Error:    "screenshot step failed",
		})
		return b
	}

	notFoundErr := store.ErrNotFound

	tests := []struct {
		name          string
		value         []byte
		store         *mockCaptureStore
		publisher     *mockDraftPublisher
		wantErr       bool
		assertOutcome func(t *testing.T, s *mockCaptureStore, pub *mockDraftPublisher)
	}{
		{
			name:  "falls through to showcase store on ErrNotFound from github store, success case",
			value: successMsg(),
			store: &mockCaptureStore{
				updateFn: func(_ context.Context, _ uuid.UUID, _ json.RawMessage) error {
					return notFoundErr
				},
				updateShowcaseCaptureFn: func(_ context.Context, _ uuid.UUID, _ json.RawMessage) error {
					return nil
				},
			},
			publisher: &mockDraftPublisher{
				publishFn: func(_ context.Context, topic, key string, payload any) error {
					assert.Equal(t, TopicShowcaseDraftGenerate, topic)
					assert.Equal(t, jobID.String(), key)
					evt, ok := payload.(ShowcaseDraftGenerateEvent)
					require.True(t, ok)
					assert.Equal(t, jobID, evt.JobID)
					return nil
				},
			},
			assertOutcome: func(t *testing.T, s *mockCaptureStore, pub *mockDraftPublisher) {
				t.Helper()
				assert.Equal(t, 1, pub.publishCalled)
				assert.Equal(t, 0, s.showcaseFailedCalled)
			},
		},
		{
			name:  "falls through to showcase store on ErrNotFound, failure case calls UpdateShowcaseJobFailed and does not publish",
			value: failMsg(),
			store: &mockCaptureStore{
				updateFn: func(_ context.Context, _ uuid.UUID, _ json.RawMessage) error {
					return notFoundErr
				},
				updateShowcaseCaptureFn: func(_ context.Context, _ uuid.UUID, _ json.RawMessage) error {
					return nil
				},
			},
			publisher: &mockDraftPublisher{},
			assertOutcome: func(t *testing.T, s *mockCaptureStore, pub *mockDraftPublisher) {
				t.Helper()
				assert.Equal(t, 0, pub.publishCalled)
				require.Equal(t, 1, s.showcaseFailedCalled)
				assert.Equal(t, jobID, s.showcaseFailedCalledWith.jobID)
				assert.Equal(t, "screenshot step failed", s.showcaseFailedCalledWith.errMsg)
			},
		},
		{
			name:  "drops the message when both github and showcase stores return ErrNotFound",
			value: successMsg(),
			store: &mockCaptureStore{
				updateFn: func(_ context.Context, _ uuid.UUID, _ json.RawMessage) error {
					return notFoundErr
				},
				updateShowcaseCaptureFn: func(_ context.Context, _ uuid.UUID, _ json.RawMessage) error {
					return notFoundErr
				},
			},
			publisher: &mockDraftPublisher{},
			wantErr:   false,
			assertOutcome: func(t *testing.T, s *mockCaptureStore, pub *mockDraftPublisher) {
				t.Helper()
				assert.Equal(t, 0, pub.publishCalled)
				assert.Equal(t, 0, s.showcaseFailedCalled)
			},
		},
		{
			name:  "github branch unchanged: success still publishes both DraftGenerateEvent and BlogGenerateEvent",
			value: successMsg(),
			store: &mockCaptureStore{
				updateFn: func(_ context.Context, _ uuid.UUID, _ json.RawMessage) error {
					return nil
				},
			},
			publisher: &mockDraftPublisher{
				publishFn: func(_ context.Context, topic, key string, payload any) error {
					assert.Contains(t, []string{TopicDraftGenerate, TopicBlogGenerate}, topic)
					assert.Equal(t, jobID.String(), key)
					return nil
				},
			},
			assertOutcome: func(t *testing.T, s *mockCaptureStore, pub *mockDraftPublisher) {
				t.Helper()
				assert.Equal(t, 2, pub.publishCalled)
				assert.Equal(t, 0, s.showcaseFailedCalled)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

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

			if tt.assertOutcome != nil {
				tt.assertOutcome(t, tt.store, tt.publisher)
			}
		})
	}
}
