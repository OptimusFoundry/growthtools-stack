package posttitler

import (
	"context"
	"errors"
	"strings"
	"testing"

	"base-server/internal/infra/observability"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

func TestTitler_GenerateTitle(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	tests := []struct {
		name       string
		content    string
		mockReturn string
		mockErr    error
		wantTitle  string
		wantErr    bool
	}{
		{
			name:       "returns trimmed title from AI",
			content:    "some post content",
			mockReturn: "  My Title  ",
			mockErr:    nil,
			wantTitle:  "My Title",
			wantErr:    false,
		},
		{
			name:       "truncates to 60 chars",
			content:    "some post content",
			mockReturn: strings.Repeat("a", 70),
			mockErr:    nil,
			wantTitle:  strings.Repeat("a", 60),
			wantErr:    false,
		},
		{
			name:       "returns error on AI failure",
			content:    "some post content",
			mockReturn: "",
			mockErr:    errors.New("rpc error"),
			wantTitle:  "",
			wantErr:    true,
		},
		{
			name:       "returns error on empty AI response",
			content:    "some post content",
			mockReturn: "",
			mockErr:    nil,
			wantTitle:  "",
			wantErr:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			mockAI := NewMockAIClient(ctrl)
			mockAI.EXPECT().CreateMessage(gomock.Any(), systemPrompt, gomock.Any(), 80).
				Return(tt.mockReturn, tt.mockErr)

			titler := New(mockAI, logger)
			got, err := titler.GenerateTitle(context.Background(), tt.content)

			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.wantTitle, got)
			}
		})
	}
}
