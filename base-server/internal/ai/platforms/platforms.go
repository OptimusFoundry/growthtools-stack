// Package platforms holds platform configuration data for the eight supported
// social media platforms. This is the authoritative source of platform
// constraints for all AI packages.
package platforms

import "strings"

// Config holds content constraints for a single social platform.
type Config struct {
	// Name is the display name shown in prompts and logs.
	Name string
	// ID is the lowercase identifier used as a map key and in requests.
	ID string
	// CharLimit is the maximum character count for a single post.
	CharLimit int
	// ThreadCharLimit is the per-segment character limit when posting a thread.
	// Zero means same as CharLimit.
	ThreadCharLimit int
	// MaxThreadParts is the maximum number of thread segments supported.
	MaxThreadParts int
	// SupportsThreads is true when the platform natively supports threaded posts.
	SupportsThreads bool
	// MediaRequired is true when the platform requires at least one media attachment.
	MediaRequired bool
	// HashtagStyle describes the platform's hashtag convention ("none", "trailing", etc.)
	HashtagStyle string
	// ToneHint is a short editorial hint for the AI on how to write for this platform.
	ToneHint string
}

var all = map[string]Config{
	"x": {
		Name:            "X (Twitter)",
		ID:              "x",
		CharLimit:       280,
		ThreadCharLimit: 280,
		MaxThreadParts:  25,
		SupportsThreads: true,
		MediaRequired:   false,
		HashtagStyle:    "none",
		ToneHint:        "concise, punchy, conversational",
	},
	"linkedin": {
		Name:            "LinkedIn",
		ID:              "linkedin",
		CharLimit:       3000,
		SupportsThreads: false,
		MediaRequired:   false,
		HashtagStyle:    "none",
		ToneHint:        "professional, insightful, value-driven",
	},
	"bluesky": {
		Name:            "BlueSky",
		ID:              "bluesky",
		CharLimit:       300,
		ThreadCharLimit: 300,
		MaxThreadParts:  20,
		SupportsThreads: true,
		MediaRequired:   false,
		HashtagStyle:    "none",
		ToneHint:        "casual, authentic, community-oriented",
	},
	"facebook": {
		Name:            "Facebook",
		ID:              "facebook",
		CharLimit:       63206,
		SupportsThreads: false,
		MediaRequired:   false,
		HashtagStyle:    "none",
		ToneHint:        "friendly, relatable, storytelling",
	},
	"instagram": {
		Name:            "Instagram",
		ID:              "instagram",
		CharLimit:       2200,
		SupportsThreads: false,
		MediaRequired:   true,
		HashtagStyle:    "none",
		ToneHint:        "visual-first caption, lifestyle-oriented, emoji-friendly",
	},
	"threads": {
		Name:            "Threads",
		ID:              "threads",
		CharLimit:       500,
		ThreadCharLimit: 500,
		MaxThreadParts:  15,
		SupportsThreads: true,
		MediaRequired:   false,
		HashtagStyle:    "none",
		ToneHint:        "conversational, casual, opinion-driven",
	},
	"tiktok": {
		Name:            "TikTok",
		ID:              "tiktok",
		CharLimit:       2200,
		SupportsThreads: false,
		MediaRequired:   true,
		HashtagStyle:    "none",
		ToneHint:        "trendy, Gen-Z friendly, hook-first",
	},
	"pinterest": {
		Name:            "Pinterest",
		ID:              "pinterest",
		CharLimit:       500,
		SupportsThreads: false,
		MediaRequired:   true,
		HashtagStyle:    "none",
		ToneHint:        "inspirational, keyword-rich, actionable",
	},
}

// Get returns the Config for the given platform ID (case-insensitive).
// If the platform is unknown, a sensible default is returned so callers
// can always proceed — the unknown platform falls back to X-style limits.
func Get(platform string) Config {
	if c, ok := all[strings.ToLower(platform)]; ok {
		return c
	}
	return Config{
		Name:      platform,
		ID:        strings.ToLower(platform),
		CharLimit: 280,
		ToneHint:  "engaging and professional",
	}
}

// All returns a slice of all known platform configs in deterministic order.
func All() []Config {
	order := []string{"x", "linkedin", "bluesky", "facebook", "instagram", "threads", "tiktok", "pinterest"}
	out := make([]Config, 0, len(order))
	for _, id := range order {
		out = append(out, all[id])
	}
	return out
}
