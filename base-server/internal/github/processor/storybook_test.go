package processor

import (
	"context"
	"errors"
	"sort"
	"testing"

	storybookclient "base-server/internal/infra/clients/storybook"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

// makeStorybookRepo builds a store.GitHubRepo with Storybook fields set, for
// resolveStoryIDs / matchesComponentGlob / changedFilePaths tests. Distinct
// from makeRepo (processor_test.go), which deliberately leaves these unset.
func makeStorybookRepo(storybookURL string, globs ...string) store.GitHubRepo {
	url := storybookURL
	return store.GitHubRepo{
		Owner:          "alice",
		Name:           "myrepo",
		StorybookURL:   &url,
		ComponentGlobs: store.StringArray(globs),
	}
}

func TestChangedFilePaths(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		diff string
		want []string
	}{
		{
			name: "multi-file diff returns all deduplicated paths",
			diff: "diff --git a/webapp/src/App.tsx b/webapp/src/App.tsx\n" +
				"+added line\n" +
				"diff --git a/base-server/main.go b/base-server/main.go\n" +
				"+another line\n",
			want: []string{"webapp/src/App.tsx", "base-server/main.go"},
		},
		{
			name: "single-file diff",
			diff: "diff --git a/webapp/src/App.tsx b/webapp/src/App.tsx\n+added line\n",
			want: []string{"webapp/src/App.tsx"},
		},
		{
			name: "empty diff returns empty non-nil slice",
			diff: "",
			want: []string{},
		},
		{
			name: "diff with duplicate headers for the same path is deduped",
			diff: "diff --git a/webapp/src/App.tsx b/webapp/src/App.tsx\n" +
				"+added line\n" +
				"diff --git a/webapp/src/App.tsx b/webapp/src/App.tsx\n" +
				"+another hunk on the same file\n",
			want: []string{"webapp/src/App.tsx"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := changedFilePaths(tt.diff)
			require.NotNil(t, got)
			assert.ElementsMatch(t, tt.want, got)
		})
	}
}

func TestMatchesComponentGlob(t *testing.T) {
	t.Parallel()

	defaultGlob := "webapp/src/proto-design-system/components/**/*.tsx"

	tests := []struct {
		name  string
		path  string
		globs []string
		want  bool
	}{
		{
			name:  "matches default glob against a real nested component path",
			path:  "webapp/src/proto-design-system/components/primitives/Button/Button.tsx",
			globs: []string{defaultGlob},
			want:  true,
		},
		{
			name:  "sibling story file is excluded even though it doublestar-matches",
			path:  "webapp/src/proto-design-system/components/primitives/Button/Button.stories.tsx",
			globs: []string{defaultGlob},
			want:  false,
		},
		{
			name:  "path outside any glob",
			path:  "base-server/internal/github/processor/storybook.go",
			globs: []string{defaultGlob},
			want:  false,
		},
		{
			name:  "empty globs slice",
			path:  "webapp/src/proto-design-system/components/primitives/Button/Button.tsx",
			globs: []string{},
			want:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := matchesComponentGlob(tt.path, tt.globs)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestGitHubProcessor_ResolveStoryIDs(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()
	const storybookURL = "https://sb.example.com"
	const componentGlob = "webapp/src/proto-design-system/components/**/*.tsx"

	buttonDiff := "diff --git a/webapp/src/proto-design-system/components/primitives/Button/Button.tsx " +
		"b/webapp/src/proto-design-system/components/primitives/Button/Button.tsx\n+added line\n"

	tests := []struct {
		name string
		repo store.GitHubRepo
		diff string
		// setup wires storybookClient expectations.
		setup          func(sc *MockStorybookClient)
		wantStoryIDs   []string
		wantComponents map[string]string
		wantErr        bool
	}{
		{
			name:  "StorybookURL unset returns nil, FetchIndex never called",
			repo:  makeStorybookRepo("", componentGlob),
			diff:  buttonDiff,
			setup: func(sc *MockStorybookClient) {},
		},
		{
			name: "ComponentGlobs empty returns nil, FetchIndex never called",
			repo: func() store.GitHubRepo {
				r := makeStorybookRepo(storybookURL)
				r.ComponentGlobs = store.StringArray{}
				return r
			}(),
			diff:  buttonDiff,
			setup: func(sc *MockStorybookClient) {},
		},
		{
			name:  "no matching changed path returns nil, FetchIndex never called",
			repo:  makeStorybookRepo(storybookURL, componentGlob),
			diff:  "diff --git a/base-server/main.go b/base-server/main.go\n+backend only\n",
			setup: func(sc *MockStorybookClient) {},
		},
		{
			name: "matching changed component resolves to its story ID",
			repo: makeStorybookRepo(storybookURL, componentGlob),
			diff: buttonDiff,
			setup: func(sc *MockStorybookClient) {
				sc.EXPECT().FetchIndex(gomock.Any(), storybookURL).Return(storybookclient.Index{
					Entries: map[string]storybookclient.IndexEntry{
						"primitives-button--default": {
							ID:         "primitives-button--default",
							ImportPath: "./src/proto-design-system/components/primitives/Button/Button.stories.tsx",
							Type:       "story",
						},
					},
				}, nil)
			},
			wantStoryIDs:   []string{"primitives-button--default"},
			wantComponents: map[string]string{"primitives-button--default": "Button"},
		},
		{
			name: "docs-type entry with matching import path is excluded",
			repo: makeStorybookRepo(storybookURL, componentGlob),
			diff: buttonDiff,
			setup: func(sc *MockStorybookClient) {
				sc.EXPECT().FetchIndex(gomock.Any(), storybookURL).Return(storybookclient.Index{
					Entries: map[string]storybookclient.IndexEntry{
						"primitives-button--docs": {
							ID:         "primitives-button--docs",
							ImportPath: "./src/proto-design-system/components/primitives/Button/Button.stories.tsx",
							Type:       "docs",
						},
					},
				}, nil)
			},
			wantStoryIDs:   nil,
			wantComponents: nil,
		},
		{
			name: "no index entry matches the candidate import path; component skipped",
			repo: makeStorybookRepo(storybookURL, componentGlob),
			diff: buttonDiff,
			setup: func(sc *MockStorybookClient) {
				sc.EXPECT().FetchIndex(gomock.Any(), storybookURL).Return(storybookclient.Index{
					Entries: map[string]storybookclient.IndexEntry{
						"primitives-input--default": {
							ID:         "primitives-input--default",
							ImportPath: "./src/proto-design-system/components/primitives/Input/Input.stories.tsx",
							Type:       "story",
						},
					},
				}, nil)
			},
			wantStoryIDs:   nil,
			wantComponents: nil,
		},
		{
			name: "FetchIndex error is logged and returned",
			repo: makeStorybookRepo(storybookURL, componentGlob),
			diff: buttonDiff,
			setup: func(sc *MockStorybookClient) {
				sc.EXPECT().FetchIndex(gomock.Any(), storybookURL).
					Return(storybookclient.Index{}, errors.New("storybook unreachable"))
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			ctrl := gomock.NewController(t)
			mockStore := NewMockGitHubStore(ctrl)
			proc := New(mockStore, testWebhookSecret, logger)

			mockStorybook := NewMockStorybookClient(ctrl)
			tt.setup(mockStorybook)
			proc.SetStorybookClient(mockStorybook)

			storyIDs, storyComponents, err := proc.resolveStoryIDs(context.Background(), tt.repo, tt.diff)

			if tt.wantErr {
				require.Error(t, err)
				assert.Nil(t, storyIDs)
				assert.Nil(t, storyComponents)
				return
			}
			require.NoError(t, err)

			sort.Strings(storyIDs)
			sort.Strings(tt.wantStoryIDs)
			assert.Equal(t, tt.wantStoryIDs, storyIDs)
			assert.Equal(t, tt.wantComponents, storyComponents)
		})
	}
}

func TestGitHubProcessor_ResolveStoryIDs_ClientNeverWired(t *testing.T) {
	t.Parallel()

	logger := observability.NewLogger()
	mockStore := NewMockGitHubStore(gomock.NewController(t))
	// Fresh processor: SetStorybookClient is deliberately never called, to
	// exercise the "processor without a storybook client wired" branch.
	proc := New(mockStore, testWebhookSecret, logger)

	repo := makeStorybookRepo("https://sb.example.com", "webapp/src/proto-design-system/components/**/*.tsx")
	diff := "diff --git a/webapp/src/proto-design-system/components/primitives/Button/Button.tsx " +
		"b/webapp/src/proto-design-system/components/primitives/Button/Button.tsx\n+added line\n"

	storyIDs, storyComponents, err := proc.resolveStoryIDs(context.Background(), repo, diff)

	require.NoError(t, err)
	assert.Nil(t, storyIDs)
	assert.Nil(t, storyComponents)
}
