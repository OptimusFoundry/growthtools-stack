package prompts

import (
	"fmt"
	"strings"

	"base-server/internal/ai/mediadescriber"
	"base-server/internal/ai/platforms"
)

// SystemThread builds the system prompt for generating a thread from base content.
func SystemThread(platformID string, maxParts int, media []mediadescriber.Description, voice *VoiceContext) string {
	p := platforms.Get(platformID)
	if maxParts == 0 {
		maxParts = p.MaxThreadParts
	}
	if maxParts == 0 {
		maxParts = 3
	}

	charLimit := p.ThreadCharLimit
	if charLimit == 0 {
		charLimit = p.CharLimit
	}

	var sb strings.Builder
	sb.WriteString("You are a social media thread specialist.\n\n")
	sb.WriteString("## Task\n")
	fmt.Fprintf(&sb, "Break the provided content into a thread for **%s**.\n\n", p.Name)

	sb.WriteString("## Rules\n")
	sb.WriteString("- This is THREAD mode. Each post should cover ONE idea, fact, or point.\n")
	fmt.Fprintf(&sb, "- HARD LIMIT: Each individual post maximum %d characters. Aim for %d.\n", charLimit, int(float64(charLimit)*0.9))
	fmt.Fprintf(&sb, "- EXACT COUNT: Produce EXACTLY %d thread parts.\n", maxParts)
	sb.WriteString("- First post must open with a very short product mention, then the hook.\n")
	sb.WriteString("- Last post should have a clear conclusion or CTA.\n")
	sb.WriteString("- Do NOT number the parts (no 1/, 2/, 3/ prefixes).\n")
	sb.WriteString("- Do NOT use hashtags anywhere in the thread.\n")
	sb.WriteString("- Separate each post with the delimiter: ---THREAD_BREAK---\n")
	sb.WriteString("- Return ONLY the thread posts separated by the delimiter.\n")

	appendThreadMediaSection(&sb, media)
	return sb.String()
}

func appendThreadMediaSection(sb *strings.Builder, media []mediadescriber.Description) {
	usable := make([]mediadescriber.Description, 0, len(media))
	for _, d := range media {
		if d.Usable {
			usable = append(usable, d)
		}
	}
	if len(usable) == 0 {
		return
	}
	sb.WriteString("\n## Media Placement\n")
	if len(usable) == 1 {
		sb.WriteString("The user has attached ONE media item. Place it on the FIRST thread part.\n")
		fmt.Fprintf(sb, "Add `[IMAGE:%d]` on its own line at the end of the first part.\n", usable[0].Index)
	} else {
		sb.WriteString("The user has attached media. You MUST use ALL media items.\n")
		sb.WriteString("To assign media, add `[IMAGE:N]` on its own line at the end of the thread part (where N is the media index).\n")
		sb.WriteString("Each item may be used at most once. Prefer placing the first item on the first part.\n")
	}
	sb.WriteString("Available media:\n")
	for _, d := range usable {
		fmt.Fprintf(sb, "- Media %d (%s): %s\n", d.Index, d.Kind, d.Description)
	}
}
