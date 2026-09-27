package adapters

import (
	"bytes"
	"image"

	// Register decoders for image.DecodeConfig.
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
)

// imageDimensions reads width/height from an image's header without decoding
// pixels. Returns 0, 0 when the format isn't recognised.
func imageDimensions(data []byte) (int, int) {
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return 0, 0
	}
	return cfg.Width, cfg.Height
}

// blueskyImageEntry builds one app.bsky.embed.images#image. aspectRatio lets
// clients size the card to the image; without it Bluesky boxes every image
// as a square with letterbox bands.
func blueskyImageEntry(blob map[string]any, width, height int) map[string]any {
	entry := map[string]any{"alt": "", "image": blob}
	if width > 0 && height > 0 {
		entry["aspectRatio"] = map[string]int{"width": width, "height": height}
	}
	return entry
}
