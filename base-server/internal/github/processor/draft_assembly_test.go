package processor

import (
	"strings"
	"testing"

	"base-server/internal/infra/store"

	"github.com/stretchr/testify/assert"
)

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
