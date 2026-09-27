package adapters

import (
	"bytes"
	"image"
	"image/png"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func pngBytes(t *testing.T, w, h int) []byte {
	t.Helper()
	var buf bytes.Buffer
	require.NoError(t, png.Encode(&buf, image.NewRGBA(image.Rect(0, 0, w, h))))
	return buf.Bytes()
}

func TestBlueskyImageEntry(t *testing.T) {
	t.Parallel()
	blob := map[string]any{"$type": "blob"}

	tests := []struct {
		name       string
		data       []byte
		wantAspect map[string]int
	}{
		{
			// Without aspectRatio Bluesky renders images in a square box with
			// letterbox bands; 16:9 captures looked shrunk.
			name:       "png carries its aspect ratio",
			data:       pngBytes(t, 1200, 675),
			wantAspect: map[string]int{"width": 1200, "height": 675},
		},
		{
			name:       "undecodable bytes omit aspect ratio",
			data:       []byte("not an image"),
			wantAspect: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			w, h := imageDimensions(tt.data)
			entry := blueskyImageEntry(blob, w, h)
			assert.Equal(t, "", entry["alt"])
			assert.Equal(t, blob, entry["image"])
			if tt.wantAspect == nil {
				assert.NotContains(t, entry, "aspectRatio")
				return
			}
			assert.Equal(t, tt.wantAspect, entry["aspectRatio"])
		})
	}
}

func TestBuildBlueskyEmbed_IncludesAspectRatio(t *testing.T) {
	t.Parallel()
	items := []blueskyHandleItem{{Blob: map[string]any{"ref": "a"}, Width: 2400, Height: 1350}}

	embed := buildBlueskyEmbed(items, []int{0})

	images, ok := embed["images"].([]map[string]any)
	require.True(t, ok)
	require.Len(t, images, 1)
	assert.Equal(t, map[string]int{"width": 2400, "height": 1350}, images[0]["aspectRatio"])
}
