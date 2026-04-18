package processor

import (
	"encoding/json"
	"fmt"
	"strings"

	"base-server/internal/content/prompts"
	contentProc "base-server/internal/content/processor"
	"base-server/internal/infra/store"
	postsProc "base-server/internal/posts/processor"
)

// assemblePlatformDrafts walks each platform's generated segments and assigns
// ImageIndex values from the media plan — segment 0 gets the video (if any)
// or the first image, subsequent segments get subsequent images, remaining
// segments carry no media.
//
// ThreadSegment.ImageIndex is 1-based into post.media_ids. The adapter layer
// (see internal/platform/adapters/adapter.go: mediaURLForSegment) subtracts
// 1 before indexing; storing 0-based values here would make mediaURLForSegment
// miss the first media entry entirely — which is why the video used to never
// actually attach to the first post in the thread.
func assemblePlatformDrafts(
	perPlatform map[string]contentProc.ThreadWithMediaPlanResult,
	targets []string,
	mediaIDs store.UUIDArray,
	plan *prompts.MediaPlan,
) []postsProc.PlatformDraftContent {
	// Build the 1-based index list for the post.media_ids array, in the
	// order the plan assigns media to thread segments.
	oneBasedIndexes := make([]int, 0, 1+len(plan.ImageIndexes))
	if plan.VideoIndex > 0 {
		oneBasedIndexes = append(oneBasedIndexes, 1)
	}
	for i := range plan.ImageIndexes {
		offset := i
		if plan.VideoIndex > 0 {
			offset = i + 1
		}
		if offset < len(mediaIDs) {
			oneBasedIndexes = append(oneBasedIndexes, offset+1)
		}
	}

	drafts := make([]postsProc.PlatformDraftContent, 0, len(targets))
	for _, platform := range targets {
		result, ok := perPlatform[platform]
		if !ok {
			continue
		}
		segments := make([]contentProc.ThreadSegment, len(result.Segments))
		for i, seg := range result.Segments {
			segments[i] = seg
			if i < len(oneBasedIndexes) {
				idx := oneBasedIndexes[i]
				segments[i].ImageIndex = &idx
			}
		}
		raw, err := json.Marshal(segments)
		if err != nil {
			// Extremely unlikely — []ThreadSegment is plain JSON.
			continue
		}
		rawMsg := json.RawMessage(raw)
		content := result.Content
		drafts = append(drafts, postsProc.PlatformDraftContent{
			Platform:       platform,
			Content:        &content,
			ThreadSegments: &rawMsg,
		})
	}
	return drafts
}

// buildDraftPrompt turns the commit into a blurb the content generator can
// expand on. We keep the framing concrete so the AI has real material to
// work with even when capture media is missing.
func buildDraftPrompt(commit store.GitHubCommitForDraft) string {
	var sb strings.Builder
	sb.WriteString("Write social posts announcing a shipped change in a product.\n\n")
	fmt.Fprintf(&sb, "Repository: %s/%s\n", commit.RepoOwner, commit.RepoName)
	sb.WriteString("Commit message:\n")
	sb.WriteString(commit.Message)
	sb.WriteString("\n\nTurn this into a thread that reads like the builder talking to peers — what changed, why it matters, how it feels to use. Do not reference commit shas, branch names, or internal repo mechanics.")
	return sb.String()
}
