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

type mockBlogGenerator struct {
	generateFn func(ctx context.Context, commitID uuid.UUID) error
}

func (m *mockBlogGenerator) GenerateBlogFromCommit(ctx context.Context, commitID uuid.UUID) error {
	if m.generateFn != nil {
		return m.generateFn(ctx, commitID)
	}
	return nil
}

func TestBlogGeneratorWorker_Handle(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	commitID := uuid.New()

	validEvent := func(id uuid.UUID) []byte {
		b, _ := json.Marshal(BlogGenerateEvent{CommitID: id})
		return b
	}

	tests := []struct {
		name      string
		value     []byte
		generator BlogGenerator
		wantErr   bool
	}{
		{
			name:  "happy path returns nil",
			value: validEvent(commitID),
			generator: &mockBlogGenerator{
				generateFn: func(_ context.Context, id uuid.UUID) error {
					assert.Equal(t, commitID, id)
					return nil
				},
			},
		},
		{
			name:      "invalid JSON returns an error",
			value:     []byte("not json"),
			generator: &mockBlogGenerator{},
			wantErr:   true,
		},
		{
			name:  "ErrBlogGuardTripped is swallowed — returns nil",
			value: validEvent(commitID),
			generator: &mockBlogGenerator{
				generateFn: func(context.Context, uuid.UUID) error {
					return githubProcessor.ErrBlogGuardTripped
				},
			},
		},
		{
			name:  "ErrBlogGenerationFailed is swallowed — returns nil",
			value: validEvent(commitID),
			generator: &mockBlogGenerator{
				generateFn: func(context.Context, uuid.UUID) error {
					return githubProcessor.ErrBlogGenerationFailed
				},
			},
		},
		{
			name:  "unknown error is swallowed — returns nil",
			value: validEvent(commitID),
			generator: &mockBlogGenerator{
				generateFn: func(context.Context, uuid.UUID) error {
					return errors.New("boom")
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			w := &BlogGeneratorWorker{generator: tt.generator, logger: logger}
			err := w.handle(context.Background(), nil, tt.value)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
		})
	}
}
