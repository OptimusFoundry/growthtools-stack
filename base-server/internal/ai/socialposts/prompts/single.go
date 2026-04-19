// Package prompts contains prompt builders for the socialposts package.
package prompts

import (
	"encoding/json"
	"fmt"
	"strings"

	"base-server/internal/ai/mediadescriber"
	"base-server/internal/ai/platforms"
)

// VoiceContext holds optional voice profile fields for prompt injection.
type VoiceContext struct {
	Tone               string   `json:"tone,omitempty"`
	Style              string   `json:"style,omitempty"`
	Industry           string   `json:"industry,omitempty"`
	TargetAudience     string   `json:"target_audience,omitempty"`
	CustomInstructions string   `json:"custom_instructions,omitempty"`
	ExamplePosts       []string `json:"example_posts,omitempty"`
}

// SystemGenerate builds the system prompt for initial base content generation.
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
	configs := make([]platforms.Config, 0, len(platformIDs))
	for _, id := range platformIDs {
		configs = append(configs, platforms.Get(id))
	}
	b, _ := json.MarshalIndent(configs, "", "  ")
	sb.WriteString(string(b))
	sb.WriteString("\n\n")

	sb.WriteString("## Rules\n")
	sb.WriteString("- Open with a very short mention of which product the post is for — one short phrase or clause, not a full sentence. If the product name is not clear from the voice profile, skip this.\n")
	sb.WriteString("- Return ONLY the generated content, no commentary or labels.\n")
	sb.WriteString("- Do not include platform-specific formatting (no hashtags, no @mentions).\n")
	sb.WriteString("- Preserve the user's voice and intent.\n")

	return sb.String()
}

// SystemAdapt builds the system prompt for adapting base content to one platform.
func SystemAdapt(platformID string, media []mediadescriber.Description, voice *VoiceContext) string {
	p := platforms.Get(platformID)
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
	fmt.Fprintf(&sb, "- HARD LIMIT: Maximum %d characters. Aim for %d characters to leave a safety margin.\n", p.CharLimit, int(float64(p.CharLimit)*0.9))
	sb.WriteString("- SINGLE POST mode. All content MUST fit in one post.\n")
	sb.WriteString("- Preserve the product mention at the very start.\n")
	fmt.Fprintf(&sb, "- Tone hint: %s.\n", p.ToneHint)
	sb.WriteString("- Do NOT use hashtags anywhere in the content.\n")
	sb.WriteString("- Do NOT use @mentions.\n")
	sb.WriteString("- Return ONLY the adapted content, no commentary.\n")

	appendMediaSection(&sb, media)
	return sb.String()
}

func appendMediaSection(sb *strings.Builder, media []mediadescriber.Description) {
	usable := make([]mediadescriber.Description, 0, len(media))
	for _, d := range media {
		if d.Usable {
			usable = append(usable, d)
		}
	}
	if len(usable) == 0 {
		return
	}
	sb.WriteString("\n## Attached Media\n")
	sb.WriteString("The user's post includes the following media. Reference every item naturally in the text:\n")
	for _, d := range usable {
		fmt.Fprintf(sb, "- Media %d (%s): %s\n", d.Index, d.Kind, d.Description)
	}
}
