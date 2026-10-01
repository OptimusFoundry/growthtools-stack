package processor

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseBlogJSON(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		raw         string
		wantTitle   string
		wantContent string
		wantErr     bool
	}{
		{
			name:        "valid json",
			raw:         `{"title":"T","content":"line one\nline two"}`,
			wantTitle:   "T",
			wantContent: "line one\nline two",
		},
		{
			// Gemini sometimes emits raw tabs/newlines inside string literals
			// (seen 2026-09-27: "invalid character '\t' in string literal").
			name:        "raw control characters inside strings are repaired",
			raw:         "{\n\t\"title\": \"Badge\tpulse\",\n\t\"content\": \"# H\n\n```go\n\tx := 1\n```\"\n}",
			wantTitle:   "Badge\tpulse",
			wantContent: "# H\n\n```go\n\tx := 1\n```",
		},
		{
			name:        "fenced json with prose around it",
			raw:         "Here you go:\n```json\n{\"title\":\"T\",\"content\":\"C\"}\n```",
			wantTitle:   "T",
			wantContent: "C",
		},
		{
			name:    "structurally broken json still errors",
			raw:     `{"title": "T", "content": `,
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := parseBlogJSON(tt.raw)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.wantTitle, got.Title)
			assert.Equal(t, tt.wantContent, got.Content)
		})
	}
}
