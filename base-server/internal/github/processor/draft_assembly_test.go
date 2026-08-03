package processor

import (
	"strings"
	"testing"

	"base-server/internal/infra/store"

	"github.com/stretchr/testify/assert"
)

func TestBuildShowcaseDraftPrompt(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		job  store.ShowcaseJobForDraft
	}{
		{
			name: "single-line brief",
			job: store.ShowcaseJobForDraft{
				ComponentName: "Button",
				Brief:         "Show off the new primary button with the hover glow effect",
			},
		},
		{
			name: "multi-line brief",
			job: store.ShowcaseJobForDraft{
				ComponentName: "Modal",
				Brief:         "Show off the new modal.\nIt now supports nested confirm dialogs.",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := buildShowcaseDraftPrompt(tt.job)

			assert.Contains(t, got, tt.job.Brief, "prompt must contain the brief")
			assert.Contains(t, got, tt.job.ComponentName, "prompt must reference the component name")
			assert.NotContains(t, got, "Repository:", "showcase jobs have no repo context and must not reference one")
			assert.False(t, strings.Contains(strings.ToLower(got), "repository"), "prompt must not use repo-owner/name framing")
			// Mirrors the sibling functions' closing instruction — the prompt
			// tells the AI not to reference commit shas/branch names (there is
			// no such data on a showcase job to leak in the first place).
			assert.Contains(t, strings.ToLower(got), "commit shas", "prompt must carry the same closing guardrail as the sibling functions")
			assert.Contains(t, strings.ToLower(got), "branch names", "prompt must carry the same closing guardrail as the sibling functions")
		})
	}
}

func TestBuildComponentDraftPrompt(t *testing.T) {
	t.Parallel()

	commit := store.GitHubCommitForDraft{
		RepoOwner: "acme",
		RepoName:  "widget",
		Message:   "feat: restyle the primary button",
	}

	tests := []struct {
		name           string
		componentNames []string
	}{
		{
			name:           "single component name",
			componentNames: []string{"Button"},
		},
		{
			name:           "multiple component names",
			componentNames: []string{"Button", "Modal"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := buildComponentDraftPrompt(commit, tt.componentNames)

			for _, name := range tt.componentNames {
				assert.Contains(t, got, name, "prompt must mention component name %q", name)
			}
			assert.Contains(t, got, commit.Message, "prompt must contain the commit message")
			assert.True(t, strings.Contains(strings.ToLower(got), "component"), "prompt must mention 'component'")
		})
	}
}
