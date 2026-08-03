package componentmatcher

import (
	"context"
	"errors"
	"testing"

	"base-server/internal/infra/observability"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

func newLogger() *observability.Logger { return observability.NewLogger() }

func TestMatcher_Resolve(t *testing.T) {
	t.Parallel()

	brief := "a showcase brief about a form component"
	componentNames := []string{"Button", "Card", "Modal"}

	tests := []struct {
		name         string
		mock         func(m *MockAIClient)
		wantMatch    *string
		wantErr      error
		wantErrCheck func(t *testing.T, err error)
	}{
		{
			name: "returns matched component on exact verbatim match",
			mock: func(m *MockAIClient) {
				m.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("Button", nil)
			},
			wantMatch: strPtr("Button"),
		},
		{
			name: "returns matched component on case-insensitive match, canonicalized to input-list casing",
			mock: func(m *MockAIClient) {
				m.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("button", nil)
			},
			wantMatch: strPtr("Button"),
		},
		{
			name: "returns nil,nil on literal NONE token",
			mock: func(m *MockAIClient) {
				m.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("NONE", nil)
			},
			wantMatch: nil,
		},
		{
			name: "returns nil,nil on empty response",
			mock: func(m *MockAIClient) {
				m.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("   ", nil)
			},
			wantMatch: nil,
		},
		{
			name: "returns nil,nil on a string not present in componentNames",
			mock: func(m *MockAIClient) {
				m.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("Dropdown", nil)
			},
			wantMatch: nil,
		},
		{
			name: "returns nil,nil on multiple tokens in response",
			mock: func(m *MockAIClient) {
				m.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("Button Card", nil)
			},
			wantMatch: nil,
		},
		{
			name: "propagates a transport/API error as a real error, not a confident no-match",
			mock: func(m *MockAIClient) {
				m.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("", errors.New("transport error"))
			},
			wantMatch: nil,
			wantErrCheck: func(t *testing.T, err error) {
				t.Helper()
				require.Error(t, err)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockAIClient(ctrl)
			tt.mock(m)

			matcher := New(m, newLogger())
			got, err := matcher.Resolve(context.Background(), brief, componentNames)

			if tt.wantErrCheck != nil {
				tt.wantErrCheck(t, err)
				assert.Nil(t, got)
				return
			}

			require.NoError(t, err)
			if tt.wantMatch == nil {
				assert.Nil(t, got)
				return
			}
			require.NotNil(t, got)
			assert.Equal(t, *tt.wantMatch, *got)
		})
	}
}

func strPtr(s string) *string { return &s }
