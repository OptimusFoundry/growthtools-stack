// Package prompts holds AI prompt templates and platform configuration
// for content generation. All platform limits and prompt structures are
// centralized here so they can be reused by the content processor.
package prompts

import (
	"encoding/json"
	"fmt"
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

// VoiceContext holds optional voice profile fields for prompt injection.
type VoiceContext struct {
	Tone               string   `json:"tone,omitempty"`
	Style              string   `json:"style,omitempty"`
	Industry           string   `json:"industry,omitempty"`
	TargetAudience     string   `json:"target_audience,omitempty"`
	CustomInstructions string   `json:"custom_instructions,omitempty"`
	ExamplePosts       []string `json:"example_posts,omitempty"`
}

// --- System Prompt Builders ---

// SystemGenerate builds the system prompt for initial content generation.
func SystemGenerate(platformIDs []string, voice *VoiceContext) string {
	var sb strings.Builder

	sb.WriteString("You are a social media content expert for a solo founder / indie hacker.\n\n")

	sb.WriteString("## Task\n")
	sb.WriteString("The user will give you a blurb — a rough idea, achievement, or topic. ")
	sb.WriteString("Generate ONE piece of base content that captures the core message. ")
	sb.WriteString("This base content will be adapted per-platform in a later step, so write it in a ")
	sb.WriteString("platform-agnostic way but keep it under 3000 characters.\n\n")

	if voice != nil {
		sb.WriteString("## Voice Profile\n")
		b, _ := json.MarshalIndent(voice, "", "  ")
		sb.WriteString(string(b))
		sb.WriteString("\n\n")
	}

	sb.WriteString("## Target Platforms\n")
	sb.WriteString(PlatformConstraintsJSON(platformIDs))
	sb.WriteString("\n\n")

	sb.WriteString("## Rules\n")
	sb.WriteString("- Return ONLY the generated content, no commentary or labels.\n")
	sb.WriteString("- Do not include platform-specific formatting (no hashtags, no @mentions).\n")
	sb.WriteString("- Preserve the user's voice and intent.\n")
	sb.WriteString("- If the blurb is vague, make the content informative and engaging.\n")

	return sb.String()
}

// ImageDescription holds info about an attached image for prompt injection.
type ImageDescription struct {
	Index       int
	Description string
}

// SystemAdapt builds the system prompt for adapting base content to one platform.
func SystemAdapt(platformID string, voice *VoiceContext, imageDescriptions []ImageDescription) string {
	p := GetPlatform(platformID)
	var sb strings.Builder

	sb.WriteString("You are a social media content specialist.\n\n")

	sb.WriteString("## Task\n")
	fmt.Fprintf(&sb, "Adapt the provided content for **%s**.\n\n", p.Name)

	sb.WriteString("## Platform Constraints\n")
	b, _ := json.MarshalIndent(p, "", "  ")
	sb.WriteString(string(b))
	sb.WriteString("\n\n")

	if voice != nil && voice.Tone != "" {
		sb.WriteString("## Voice\n")
		fmt.Fprintf(&sb, "Tone: %s. Style: %s.\n\n", voice.Tone, voice.Style)
	}

	sb.WriteString("## Rules\n")
	fmt.Fprintf(&sb, "- HARD LIMIT: Maximum %d characters. This is a strict technical limit — content exceeding this will be rejected. Aim for %d characters to leave a safety margin.\n", p.CharLimit, int(float64(p.CharLimit)*0.9))
	sb.WriteString("- This is SINGLE POST mode. All content MUST fit in one post. Condense, summarize, or cut less important details to stay within the character limit. Do NOT suggest splitting into multiple posts.\n")
	fmt.Fprintf(&sb, "- Tone hint: %s.\n", p.ToneHint)

	sb.WriteString("- Do NOT use hashtags anywhere in the content.\n")
	sb.WriteString("- Do NOT use @mentions.\n")

	sb.WriteString("- Return ONLY the adapted content, no commentary.\n")

	if len(imageDescriptions) > 0 {
		sb.WriteString("\n## Attached Images\n")
		sb.WriteString("The user's post includes the following images. ALL images MUST be referenced in the content.\n")
		sb.WriteString("Write content that naturally complements these visuals:\n")
		for _, d := range imageDescriptions {
			fmt.Fprintf(&sb, "- Image %d: %s\n", d.Index, d.Description)
		}
		sb.WriteString("- Reference every image naturally in the text, but do NOT describe them literally.\n")
	}

	return sb.String()
}

// SystemThread builds the system prompt for generating a thread from content.
func SystemThread(platformID string, imageDescriptions []ImageDescription) string {
	p := GetPlatform(platformID)
	var sb strings.Builder

	sb.WriteString("You are a social media thread specialist.\n\n")

	sb.WriteString("## Task\n")
	fmt.Fprintf(&sb, "Break the provided content into a thread for **%s**.\n\n", p.Name)

	sb.WriteString("## Platform Constraints\n")
	b, _ := json.MarshalIndent(p, "", "  ")
	sb.WriteString(string(b))
	sb.WriteString("\n\n")

	charLimit := p.ThreadCharLimit
	if charLimit == 0 {
		charLimit = p.CharLimit
	}
	maxParts := p.MaxThreadParts
	if maxParts == 0 {
		maxParts = 10
	}

	sb.WriteString("## Rules\n")
	sb.WriteString("- This is THREAD mode. You MUST spread the content across MANY posts. Each post should cover ONE idea, fact, or point. NEVER combine multiple distinct ideas into a single post.\n")
	sb.WriteString("- If the content contains a list (e.g., \"10 facts\", \"5 tips\"), each item MUST be its own thread post. Do NOT merge items.\n")
	fmt.Fprintf(&sb, "- HARD LIMIT: Each individual post maximum %d characters. Aim for %d to leave a safety margin.\n", charLimit, int(float64(charLimit)*0.9))
	fmt.Fprintf(&sb, "- Use at minimum 3 parts and at maximum %d parts. More parts is better — prefer 5-10+ parts over 2-3 dense ones.\n", maxParts)
	sb.WriteString("- First post must hook the reader — no preamble.\n")
	sb.WriteString("- Last post should have a clear conclusion or CTA.\n")
	sb.WriteString("- Do NOT number the parts (no 1/, 2/, 3/ prefixes). Each part should read naturally on its own.\n")
	sb.WriteString("- Do NOT use hashtags anywhere in the thread.\n")
	sb.WriteString("- Separate each post with the delimiter: ---THREAD_BREAK---\n")
	sb.WriteString("- Return ONLY the thread posts separated by the delimiter.\n")

	if len(imageDescriptions) > 0 {
		sb.WriteString("\n## Image Placement\n")
		if len(imageDescriptions) == 1 {
			sb.WriteString("The user has attached ONE image. Place it on the FIRST thread part to hook the reader visually.\n")
			sb.WriteString("Add `[IMAGE:1]` on its own line at the end of the first part.\n")
		} else {
			sb.WriteString("The user has attached images to this post. You MUST use ALL images — every image must be assigned to exactly one thread part.\n")
			sb.WriteString("To assign an image, add `[IMAGE:N]` on its own line at the end of the thread part (where N is the image number).\n")
			sb.WriteString("Each image may be used at most once. Spread them across different parts for visual variety, but prefer placing Image 1 on the first part.\n")
		}
		sb.WriteString("Available images:\n")
		for _, d := range imageDescriptions {
			fmt.Fprintf(&sb, "- Image %d: %s\n", d.Index, d.Description)
		}
	}

	return sb.String()
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

// SystemUnified returns the system prompt for unified multi-platform content generation.
// It generates structured JSON for all platforms in a single AI call.
func SystemUnified() string {
	return `You are a social media content engine. You receive a user's raw idea or blurb and produce platform-ready posts as structured JSON.

## INPUT YOU WILL RECEIVE

1. **Blurb**: The user's rough idea, achievement, topic, or content to turn into social posts.
2. **Platforms**: A JSON array of platform configurations, each specifying name, id, char_limit, supports_threads, thread_char_limit, max_thread_parts, media_required, tone_hint, and hashtag_style.
3. **Voice Profile** (optional): A JSON object with tone, style, industry, target_audience, custom_instructions, and example_posts. If provided, you MUST match this voice. If absent, default to: engaging, clear, founder-friendly.
4. **Mode per platform**: Each platform entry will include a "mode" field — either "single" or "thread".
   - "single": Produce exactly ONE post that fits within the platform's char_limit.
   - "thread": Produce a multi-part thread. Only allowed when supports_threads is true. Each part must fit within thread_char_limit. Maximum number of parts is max_thread_parts.

## OUTPUT FORMAT

Return a single JSON object. No markdown fences, no commentary, no preamble — raw JSON only.

{
  "posts": [
    {
      "platform_id": "<id from platform config>",
      "mode": "single",
      "content": "<the full post text>",
      "char_count": <integer>,
      "thread_parts": null
    },
    {
      "platform_id": "<id from platform config>",
      "mode": "thread",
      "content": null,
      "char_count": null,
      "thread_parts": [
        {
          "part_number": 1,
          "content": "<post text for part 1>",
          "char_count": <integer>
        },
        {
          "part_number": 2,
          "content": "<post text for part 2>",
          "char_count": <integer>
        }
      ]
    }
  ]
}

## STRICT RULES — VIOLATIONS CAUSE REJECTION

### Character limits are hard technical limits
- In "single" mode: char_count MUST be ≤ the platform's char_limit. Aim for 90% of the limit to leave a safety margin. If the blurb is long, condense ruthlessly — cut secondary details, merge sentences, remove filler. Never exceed the limit.
- In "thread" mode: Every individual part's char_count MUST be ≤ thread_char_limit. The total number of parts MUST be ≤ max_thread_parts.
- char_count must be the exact character count of content (Unicode-aware, including spaces and punctuation). Count carefully. If in doubt, shorten.

### Content rules
- Do NOT use hashtags in any post regardless of platform or voice profile.
- Do NOT use @mentions unless the blurb explicitly references a specific account to tag.
- Preserve the user's core message and intent. Do not invent facts, stats, or claims not present or clearly implied in the blurb.
- If the blurb is vague or thin, make the post informative and engaging — expand the angle, not the facts.
- Each platform's output must be independently adapted. Do NOT copy-paste the same text across platforms. Rewrite for each platform's tone and constraints.

### Tone and platform adaptation
- Respect the tone_hint field for each platform. A post for X (Twitter) should feel punchy and concise. A post for LinkedIn should feel professional and insightful. A post for TikTok should lead with a hook. And so on.
- If a voice profile is provided, it takes priority over the platform tone_hint. Blend both: use the platform's natural cadence but filtered through the voice profile's personality.

### Thread-specific rules (mode = "thread")
- Expand the content fully — threads are for developing ideas across posts. Include all details, examples, and nuance from the blurb. Do not condense the way you would for single-post mode.
- Part 1 must hook the reader immediately. No "In this thread I'll discuss..." preamble.
- The final part must close with a conclusion, takeaway, or call to action.
- Do NOT number the parts (no "1/", "2/", "3/" prefixes). Each part should read naturally on its own.
- Use at minimum 3 parts and at maximum max_thread_parts.

### Single-post rules (mode = "single")
- Everything fits in one post. Do not suggest "continued in comments" or "see thread." Do not reference a follow-up.
- If the blurb contains more material than fits, prioritize the most compelling angle and cut the rest.

### What to NEVER include in output
- No labels like "Here's your post:" or "LinkedIn version:"
- No meta-commentary about the content
- No hashtags
- No markdown formatting inside post content (no **bold**, no bullet points with "-" unless natural to the platform)
- No emoji overuse — one or two emoji max per post unless the voice profile or platform tone calls for more

## VOICE PROFILE APPLICATION

When a voice profile is present:
- tone: This is the emotional register. "witty and dry" means different output than "warm and encouraging." Match it precisely.
- style: This governs structure. "short sentences, lots of line breaks" means do that. "long-form storytelling" means write paragraphs.
- industry: Use this for context and jargon calibration. A fintech founder sounds different from a wellness coach.
- target_audience: Write for these people. A post targeting VCs differs from one targeting indie hackers or consumers.
- custom_instructions: These override any conflicting default rules. Follow them exactly.
- example_posts: Study these for cadence, vocabulary, sentence length, emoji usage, and structure. Mirror the patterns — do not copy the content.

## EXECUTION CHECKLIST (follow this internally before returning output)

1. Read the blurb. Identify the core message in one sentence.
2. For each platform in the input:
   a. Check mode (single vs thread).
   b. Note char_limit (or thread_char_limit for threads).
   c. Note tone_hint.
   d. Draft content adapted for this platform.
   e. Count characters. If over limit, cut and recount. Repeat until compliant.
   f. Verify no hashtags, no meta-commentary, no labels.
3. Assemble the JSON output.
4. Validate the JSON structure matches the schema above exactly.
5. Return only the JSON. Nothing else.`
}

// BuildUnifiedUserMessage constructs the user message for the unified prompt.
func BuildUnifiedUserMessage(blurb string, platforms []PlatformInput, voice *VoiceContext) string {
	var sb strings.Builder

	sb.WriteString("## Blurb\n")
	sb.WriteString(blurb)
	sb.WriteString("\n\n## Platforms\n")

	b, _ := json.MarshalIndent(platforms, "", "  ")
	sb.WriteString(string(b))

	sb.WriteString("\n\n## Voice Profile\n")
	if voice != nil {
		v, _ := json.MarshalIndent(voice, "", "  ")
		sb.WriteString(string(v))
	} else {
		sb.WriteString("Not provided — use default voice.")
	}

	return sb.String()
}
