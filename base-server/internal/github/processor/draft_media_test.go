package processor

import (
	"sort"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStorybookComponentNames(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		uploaded []captureUpload
		want     []string
	}{
		{
			name: "no storybook keys returns empty non-nil slice",
			uploaded: []captureUpload{
				{Key: "captures/abc/demo.mp4"},
				{Key: "captures/abc/step-1.png"},
			},
			want: []string{},
		},
		{
			name: "single storybook key yields single component",
			uploaded: []captureUpload{
				{Key: "captures/abc/storybook/Button--primitives-button--default.png"},
			},
			want: []string{"Button"},
		},
		{
			name: "multiple storybook keys for the same component dedupe to one entry",
			uploaded: []captureUpload{
				{Key: "captures/abc/storybook/Button--primitives-button--default.png"},
				{Key: "captures/abc/storybook/Button--primitives-button--disabled.png"},
			},
			want: []string{"Button"},
		},
		{
			name: "multiple storybook keys for different components sort alphabetically",
			uploaded: []captureUpload{
				{Key: "captures/abc/storybook/Modal--overlays-modal--default.png"},
				{Key: "captures/abc/storybook/Button--primitives-button--default.png"},
			},
			want: []string{"Button", "Modal"},
		},
		{
			name: "storybook key with no -- separator falls back to basename minus extension",
			uploaded: []captureUpload{
				{Key: "captures/abc/storybook/Avatar.png"},
			},
			want: []string{"Avatar"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := storybookComponentNames(tt.uploaded)

			require.NotNil(t, got, "storybookComponentNames must return a non-nil slice")
			sort.Strings(got)
			assert.Equal(t, tt.want, got)
		})
	}
}
