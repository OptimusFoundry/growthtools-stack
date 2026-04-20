package workers

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	githubProcessor "base-server/internal/github/processor"
	"base-server/internal/infra/observability"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockDraftGenerator is a minimal hand-rolled stub for the DraftGenerator
// interface used by DraftGeneratorWorker. We use a function field so each test
// case can supply its own behaviour without sharing state between parallel
// sub-tests.
type mockDraftGenerator struct {
	generateFn func(ctx context.Context, commitID uuid.UUID) error
}

func (m *mockDraftGenerator) GenerateDraftFromCommit(ctx context.Context, commitID uuid.UUID) error {
	if m.generateFn != nil {
		return m.generateFn(ctx, commitID)
	}
	return nil
}

func TestDraftGeneratorWorker_Handle(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	commitID := uuid.New()

	validEvent := func(id uuid.UUID) []byte {
		b, _ := json.Marshal(DraftGenerateEvent{CommitID: id})
		return b
	}

	tests := []struct {
		name      string
		value     []byte
		generator DraftGenerator
		wantErr   bool
	}{
		{
			name:  "happy path returns nil",
			value: validEvent(commitID),
			generator: &mockDraftGenerator{
				generateFn: func(_ context.Context, id uuid.UUID) error {
					assert.Equal(t, commitID, id)
					return nil
				},
			},
			wantErr: false,
		},
		{
			name:      "invalid JSON returns an error",
			value:     []byte("not json at all"),
			generator: &mockDraftGenerator{},
			wantErr:   true,
		},
		{
			name:  "ErrDraftGuardTripped is swallowed — returns nil",
			value: validEvent(commitID),
			generator: &mockDraftGenerator{
				generateFn: func(_ context.Context, _ uuid.UUID) error {
					return githubProcessor.ErrDraftGuardTripped
				},
			},
			wantErr: false,
		},
		{
			name:  "other generator error is also swallowed — returns nil",
			value: validEvent(commitID),
			generator: &mockDraftGenerator{
				generateFn: func(_ context.Context, _ uuid.UUID) error {
					return githubProcessor.ErrDraftGenerationFailed
				},
			},
			wantErr: false,
		},
		{
			name:  "arbitrary non-sentinel error is swallowed — returns nil",
			value: validEvent(commitID),
			generator: &mockDraftGenerator{
				generateFn: func(_ context.Context, _ uuid.UUID) error {
					return errors.New("unexpected failure")
				},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			w := &DraftGeneratorWorker{
				generator: tt.generator,
				logger:    logger,
			}
			err := w.handle(context.Background(), nil, tt.value)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
		})
	}
}
