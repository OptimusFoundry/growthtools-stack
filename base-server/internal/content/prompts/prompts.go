// Package prompts holds AI prompt templates and platform configuration
// for content generation. All platform limits and prompt structures are
// centralized here so they can be reused by the content processor.
package prompts

import (
	"encoding/json"
	"fmt"
	"strings"
)

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
	sb.WriteString("- Open with a very short mention of which product the post is for — one short phrase or clause, not a full sentence (e.g. \"Shipping in <Product>:\" or \"<Product> now \"). Then flow straight into the content. If the product name is not clear from the voice profile, industry, or blurb, skip this and open with the content.\n")
	sb.WriteString("- Return ONLY the generated content, no commentary or labels.\n")
	sb.WriteString("- Do not include platform-specific formatting (no hashtags, no @mentions).\n")
	sb.WriteString("- Preserve the user's voice and intent.\n")
	sb.WriteString("- If the blurb is vague, make the content informative and engaging.\n")

	return sb.String()
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
	sb.WriteString("- Preserve the product mention at the very start of the post (a short phrase naming the product, then the content). If the base content already opens this way, keep it; do not strip it.\n")
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

// SystemSingleWithMediaPlan builds a single-post adapt prompt that tells the
// AI what media is attached to the one post. Unlike thread mode, there is no
// per-segment layout to describe — the copy just needs to reference the
// media naturally and not duplicate what the visuals already show.
func SystemSingleWithMediaPlan(platformID string, voice *VoiceContext, plan *MediaPlan, imageDescriptions []ImageDescription) string {
	base := SystemAdapt(platformID, voice, imageDescriptions)
	if plan == nil || (plan.VideoIndex == 0 && len(plan.ImageIndexes) == 0) {
		return base
	}

	var sb strings.Builder
	sb.WriteString(base)
	sb.WriteString("\n## Attached Media (pre-assigned, do NOT emit [IMAGE:N] markers)\n")
	sb.WriteString("The following media is attached to this single post by the caller. Reference it naturally — don't describe it literally, don't list it, don't repeat what the visuals already show. Let the copy complement the media.\n")
	if plan.VideoIndex > 0 {
		sb.WriteString("- A short video clip demonstrating the change. Open with a hook that makes the viewer want to watch.\n")
	}
	if len(plan.ImageIndexes) > 0 {
		if len(plan.ImageIndexes) == 1 {
			sb.WriteString("- A screenshot of the change. Point at what matters in it without narrating the pixels.\n")
		} else {
			fmt.Fprintf(&sb, "- %d screenshots of the change. Call out what matters across them without narrating each one.\n", len(plan.ImageIndexes))
		}
	}
	return sb.String()
}

// SystemThreadWithMediaPlan builds a thread prompt that is aware of attached
// media. The video (if any) is pinned to segment 1 by prose instruction — the
// AI is told not to emit a marker for it. Still images are assigned by the AI
// via [IMAGE:N] markers based on topical fit with each segment's copy. Images
// that don't fit any segment are dropped.
func SystemThreadWithMediaPlan(platformID string, maxThreadParts int, plan *MediaPlan, imageDescriptions []ImageDescription) string {
	base := SystemThread(platformID, maxThreadParts, nil)
	if plan == nil || (plan.VideoIndex == 0 && len(imageDescriptions) == 0) {
		return base
	}

	var sb strings.Builder
	sb.WriteString(base)
	sb.WriteString("\n## Media Placement\n")
	if plan.VideoIndex > 0 {
		sb.WriteString("Segment 1 has a short video clip demonstrating the change. Open segment 1 with a hook that references what the viewer is about to see. Do NOT emit an [IMAGE:N] marker for the video — it is pinned to segment 1 by the caller.\n")
	}
	if len(imageDescriptions) > 0 {
		if plan.VideoIndex > 0 {
			fmt.Fprintf(&sb, "You have %d still image(s) to assign across the remaining thread segments (not segment 1 — the video lives there).\n", len(imageDescriptions))
		} else {
			fmt.Fprintf(&sb, "You have %d still image(s) to assign across the thread segments.\n", len(imageDescriptions))
		}
		sb.WriteString("To assign an image, add `[IMAGE:N]` on its own line at the end of the thread part, where N is the image number from the list below.\n")
		sb.WriteString("Each image may be assigned to at most one segment. Do NOT assign an image to a segment whose copy is not topically related to it. If an image does not fit any segment, omit it — do not force it.\n")
		sb.WriteString("Available images:\n")
		for _, d := range imageDescriptions {
			fmt.Fprintf(&sb, "- Image %d: %s\n", d.Index, d.Description)
		}
	}
	return sb.String()
}

// SystemThread builds the system prompt for generating a thread from content.
// If maxThreadParts > 0, it overrides the platform's default.
func SystemThread(platformID string, maxThreadParts int, imageDescriptions []ImageDescription) string {
	p := GetPlatform(platformID)
	if maxThreadParts > 0 {
		p.MaxThreadParts = maxThreadParts
	}
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
	sb.WriteString("- This is THREAD mode. Each post should cover ONE idea, fact, or point. NEVER combine multiple distinct ideas into a single post.\n")
	sb.WriteString("- If the content contains a list (e.g., \"10 facts\", \"5 tips\"), each item MUST be its own thread post. Do NOT merge items.\n")
	fmt.Fprintf(&sb, "- HARD LIMIT: Each individual post maximum %d characters. Aim for %d to leave a safety margin.\n", charLimit, int(float64(charLimit)*0.9))
	fmt.Fprintf(&sb, "- EXACT COUNT: Produce EXACTLY %d thread parts. Not %d, not %d. Exactly %d. The user explicitly requested this number.\n", maxParts, maxParts-1, maxParts+1, maxParts)
	sb.WriteString("- First post must open with a very short mention of which product the thread is about (one short phrase or clause, e.g. \"In <Product>: \" or \"<Product> just \") and then flow straight into the hook. No long preamble, no \"In this thread...\".\n")
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
   - "thread": Produce a multi-part thread. Only allowed when supports_threads is true. Each part must fit within thread_char_limit. Number of parts MUST equal max_thread_parts exactly.

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
- In "thread" mode: Every individual part's char_count MUST be ≤ thread_char_limit. The total number of parts MUST equal max_thread_parts exactly.
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
- Produce EXACTLY max_thread_parts posts. This is a strict requirement set by the user, not a suggestion or maximum.

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
