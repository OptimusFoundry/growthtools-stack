package prompts

import (
	"encoding/json"
	"strings"
)

// PlatformConfig holds content constraints for a single platform.
type PlatformConfig struct {
	Name            string `json:"name"`
	ID              string `json:"id"`
	CharLimit       int    `json:"char_limit"`
	SupportsThreads bool   `json:"supports_threads"`
	ThreadCharLimit int    `json:"thread_char_limit,omitempty"`
	MaxThreadParts  int    `json:"max_thread_parts,omitempty"`
	MediaRequired   bool   `json:"media_required"`
	HashtagStyle    string `json:"hashtag_style"`
	ToneHint        string `json:"tone_hint"`
}

// PlatformInput extends PlatformConfig with a generation mode for the unified prompt.
type PlatformInput struct {
	PlatformConfig
	Mode string `json:"mode"` // "single" or "thread"
}

// Platforms maps platform ID → config. Source of truth for all platform limits.
var Platforms = map[string]PlatformConfig{
	"x": {
		Name:            "X (Twitter)",
		ID:              "x",
		CharLimit:       280,
		SupportsThreads: true,
		ThreadCharLimit: 280,
		MaxThreadParts:  25,
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
		SupportsThreads: true,
		ThreadCharLimit: 300,
		MaxThreadParts:  20,
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
		SupportsThreads: true,
		ThreadCharLimit: 500,
		MaxThreadParts:  15,
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

// GetPlatform returns the config for a platform, falling back to a default.
func GetPlatform(id string) PlatformConfig {
	if p, ok := Platforms[strings.ToLower(id)]; ok {
		return p
	}
	return PlatformConfig{
		Name:      id,
		ID:        id,
		CharLimit: 280,
		ToneHint:  "engaging and professional",
	}
}

// PlatformConstraintsJSON builds a JSON string describing limits for the given platforms.
// Pass this into system prompts so the AI knows exact constraints.
func PlatformConstraintsJSON(platformIDs []string) string {
	configs := make([]PlatformConfig, 0, len(platformIDs))
	for _, id := range platformIDs {
		configs = append(configs, GetPlatform(id))
	}
	b, _ := json.MarshalIndent(configs, "", "  ")
	return string(b)
}

// BuildPlatformInputs creates PlatformInput entries for the unified prompt.
func BuildPlatformInputs(platformIDs []string, contentType string) []PlatformInput {
	inputs := make([]PlatformInput, 0, len(platformIDs))
	for _, id := range platformIDs {
		cfg := GetPlatform(id)
		mode := "single"
		if contentType == "thread" && cfg.SupportsThreads {
			mode = "thread"
		}
		inputs = append(inputs, PlatformInput{
			PlatformConfig: cfg,
			Mode:           mode,
		})
	}
	return inputs
}
