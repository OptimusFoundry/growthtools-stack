package processor

import (
	"encoding/json"
	"fmt"
	"strings"

	"base-server/internal/ai/socialposts"
	"base-server/internal/infra/store"
	postsProc "base-server/internal/posts/processor"
)

// assemblePlatformDrafts converts socialposts.PlatformResult values (SinglePost or Thread)
// into postsProc.PlatformDraftContent rows. For SinglePost, creates a single ThreadSegment
// with no media. For Thread, iterates segments; for MediaSegment, uses ImageIndex directly;
// for TextSegment, ImageIndex is nil.
func assemblePlatformDrafts(
	perPlatform map[string]socialposts.PlatformResult,
	targets []string,
	mediaIDs store.UUIDArray,
) []postsProc.PlatformDraftContent {
	drafts := make([]postsProc.PlatformDraftContent, 0, len(targets))

	for _, platform := range targets {
		result, ok := perPlatform[platform]
		if !ok {
			continue
		}

		// Type switch on socialposts.PlatformResult sum type
		switch r := result.(type) {
		case socialposts.SinglePost:
			// Single post: wrap in a single ThreadSegment with no media
			segments := []interface{}{
				map[string]interface{}{"content": r.Content},
			}
			raw, err := json.Marshal(segments)
			if err != nil {
				continue
			}
			rawMsg := json.RawMessage(raw)
			drafts = append(drafts, postsProc.PlatformDraftContent{
				Platform:       platform,
				Content:        &r.Content,
				ThreadSegments: &rawMsg,
			})

		case socialposts.Thread:
			// Thread: iterate segments and build segment objects
			segments := make([]interface{}, 0, len(r.Segments))
			for _, seg := range r.Segments {
				switch s := seg.(type) {
				case socialposts.MediaSegment:
					// MediaSegment: include ImageIndex (1-based)
					obj := map[string]interface{}{
						"content":    s.Content,
						"imageIndex": s.ImageIndex,
					}
					segments = append(segments, obj)
				case socialposts.TextSegment:
					// TextSegment: no media
					obj := map[string]interface{}{
						"content": s.Content,
					}
					segments = append(segments, obj)
				}
			}
			raw, err := json.Marshal(segments)
			if err != nil {
				continue
			}
			rawMsg := json.RawMessage(raw)
			// Use the first segment's content as the summary
			var content string
			if len(r.Segments) > 0 {
				switch s := r.Segments[0].(type) {
				case socialposts.MediaSegment:
					content = s.Content
				case socialposts.TextSegment:
					content = s.Content
				}
			}
			drafts = append(drafts, postsProc.PlatformDraftContent{
				Platform:       platform,
				Content:        &content,
				ThreadSegments: &rawMsg,
			})
		}
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

// buildComponentDraftPrompt produces a prompt framed around the given
// component name(s) (comma-joined) and commit.Message — same repo/commit
// framing buildDraftPrompt uses, but leading with "this is a UI/component
// update to <names>" rather than a generic shipped-change blurb, so the
// generated copy references the component explicitly.
func buildComponentDraftPrompt(commit store.GitHubCommitForDraft, componentNames []string) string {
	var sb strings.Builder
	fmt.Fprintf(&sb, "This is a UI/component update to %s — write social posts announcing the change.\n\n", strings.Join(componentNames, ", "))
	fmt.Fprintf(&sb, "Repository: %s/%s\n", commit.RepoOwner, commit.RepoName)
	sb.WriteString("Commit message:\n")
	sb.WriteString(commit.Message)
	sb.WriteString("\n\nTurn this into a thread that reads like the builder talking to peers — what changed about the component, why it matters, how it feels to use. Do not reference commit shas, branch names, or internal repo mechanics.")
	return sb.String()
}
