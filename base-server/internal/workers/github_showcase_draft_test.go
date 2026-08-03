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

// mockShowcaseDraftGenerator is a minimal hand-rolled stub for the
// ShowcaseDraftGenerator interface used by ShowcaseDraftGeneratorWorker. We
// use a function field so each test case can supply its own behaviour
// without sharing state between parallel sub-tests.
type mockShowcaseDraftGenerator struct {
	generateFn func(ctx context.Context, jobID uuid.UUID) error
}

func (m *mockShowcaseDraftGenerator) GenerateDraftFromShowcaseJob(ctx context.Context, jobID uuid.UUID) error {
	if m.generateFn != nil {
		return m.generateFn(ctx, jobID)
	}
	return nil
}

func TestShowcaseDraftGeneratorWorker_Handle(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	jobID := uuid.New()

	validEvent := func(id uuid.UUID) []byte {
		b, _ := json.Marshal(ShowcaseDraftGenerateEvent{JobID: id})
		return b
	}

	tests := []struct {
		name      string
		value     []byte
		generator ShowcaseDraftGenerator
		wantErr   bool
	}{
		{
			name:  "calls generator.GenerateDraftFromShowcaseJob with the unmarshaled job id and returns nil on success",
			value: validEvent(jobID),
			generator: &mockShowcaseDraftGenerator{
				generateFn: func(_ context.Context, id uuid.UUID) error {
					assert.Equal(t, jobID, id)
					return nil
				},
			},
			wantErr: false,
		},
		{
			name:  "logs and returns nil (no error) when the generator returns an error",
			value: validEvent(jobID),
			generator: &mockShowcaseDraftGenerator{
				generateFn: func(_ context.Context, _ uuid.UUID) error {
					return errors.New("draft generation failed")
				},
			},
			wantErr: false,
		},
		{
			name:      "returns an error when the event payload fails to unmarshal",
			value:     []byte("not json at all"),
			generator: &mockShowcaseDraftGenerator{},
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			w := &ShowcaseDraftGeneratorWorker{
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
