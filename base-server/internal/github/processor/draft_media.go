package processor

import (
	"path"
	"sort"
	"strings"
)

// Media extensions we recognize. Anything else in capture_output.uploaded is
// ignored (png/jpg/jpeg accepted as images; mp4/mov/webm as video).
var (
	imageExts = map[string]struct{}{
		".jpg":  {},
		".jpeg": {},
		".png":  {},
	}
	videoExts = map[string]struct{}{
		".mp4":  {},
		".mov":  {},
		".webm": {},
	}
)

// contentTypeFor maps known extensions to a sensible MIME type. Used when
// HeadObject fails or returns an empty content-type.
func contentTypeFor(key string) string {
	switch strings.ToLower(path.Ext(key)) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".mp4":
		return "video/mp4"
	case ".mov":
		return "video/quicktime"
	case ".webm":
		return "video/webm"
	}
	return "application/octet-stream"
}

// storybookComponentNames scans uploaded artifacts for Storybook screenshot
// keys (containing "/storybook/"), takes each basename up to its first "--"
// as the component name (matches capture-worker's <component>--<storyId>.png
// encoding), dedupes, and returns a sorted non-nil slice (empty when no
// Storybook screenshots are present).
func storybookComponentNames(uploaded []captureUpload) []string {
	seen := make(map[string]struct{})
	for _, u := range uploaded {
		if !strings.Contains(u.Key, "/storybook/") {
			continue
		}
		basename := path.Base(u.Key)
		var component string
		if parts := strings.SplitN(basename, "--", 2); len(parts) == 2 {
			component = parts[0]
		} else {
			component = strings.TrimSuffix(basename, path.Ext(basename))
		}
		seen[component] = struct{}{}
	}

	names := make([]string, 0, len(seen))
	for name := range seen {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

// bucketArtifacts splits uploaded items by extension. Returns the first
// recognized video key (or "" if none) and every recognized image key.
func bucketArtifacts(uploaded []captureUpload) (string, []string) {
	var video string
	images := make([]string, 0, len(uploaded))
	for _, u := range uploaded {
		ext := strings.ToLower(path.Ext(u.Key))
		if _, ok := videoExts[ext]; ok {
			if video == "" {
				video = u.Key
			}
			continue
		}
		if _, ok := imageExts[ext]; ok {
			images = append(images, u.Key)
		}
	}
	return video, images
}
