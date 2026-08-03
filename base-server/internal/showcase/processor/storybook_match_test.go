package processor

import (
	"testing"

	storybookclient "base-server/internal/infra/clients/storybook"

	"github.com/stretchr/testify/assert"
)

func TestDistinctComponentNames(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		index storybookclient.Index
		want  []string
	}{
		{
			name: "dedupes multiple stories of the same component",
			index: storybookclient.Index{
				Entries: map[string]storybookclient.IndexEntry{
					"button--default": {ID: "button--default", ImportPath: "./src/Button.stories.tsx", Type: "story"},
					"button--large":   {ID: "button--large", ImportPath: "./src/Button.stories.tsx", Type: "story"},
				},
			},
			want: []string{"Button"},
		},
		{
			name: "sorts distinct component names",
			index: storybookclient.Index{
				Entries: map[string]storybookclient.IndexEntry{
					"modal--default": {ID: "modal--default", ImportPath: "./src/Modal.stories.tsx", Type: "story"},
					"card--default":  {ID: "card--default", ImportPath: "./src/Card.stories.tsx", Type: "story"},
					"badge--default": {ID: "badge--default", ImportPath: "./src/Badge.stories.tsx", Type: "story"},
				},
			},
			want: []string{"Badge", "Card", "Modal"},
		},
		{
			name: "trims .stories.tsx/.stories.ts/.stories.jsx suffixes",
			index: storybookclient.Index{
				Entries: map[string]storybookclient.IndexEntry{
					"a--default": {ID: "a--default", ImportPath: "./src/Alpha.stories.tsx", Type: "story"},
					"b--default": {ID: "b--default", ImportPath: "./src/Beta.stories.ts", Type: "story"},
					"c--default": {ID: "c--default", ImportPath: "./src/Gamma.stories.jsx", Type: "story"},
				},
			},
			want: []string{"Alpha", "Beta", "Gamma"},
		},
		{
			name: "ignores non-story entries such as docs pages",
			index: storybookclient.Index{
				Entries: map[string]storybookclient.IndexEntry{
					"button--default": {ID: "button--default", ImportPath: "./src/Button.stories.tsx", Type: "story"},
					"intro--docs":     {ID: "intro--docs", ImportPath: "./src/Intro.mdx", Type: "docs"},
				},
			},
			want: []string{"Button"},
		},
		{
			name:  "returns a non-nil empty slice when there are no story entries",
			index: storybookclient.Index{Entries: map[string]storybookclient.IndexEntry{}},
			want:  []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := distinctComponentNames(tt.index)
			assert.NotNil(t, got)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestStoryIDsForComponent(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name          string
		index         storybookclient.Index
		componentName string
		wantIDs       []string
		wantMap       map[string]string
	}{
		{
			name: "returns every matching entry's id and the id->componentName map",
			index: storybookclient.Index{
				Entries: map[string]storybookclient.IndexEntry{
					"button--default": {ID: "button--default", ImportPath: "./src/Button.stories.tsx", Type: "story"},
					"button--large":   {ID: "button--large", ImportPath: "./src/Button.stories.tsx", Type: "story"},
					"card--default":   {ID: "card--default", ImportPath: "./src/Card.stories.tsx", Type: "story"},
				},
			},
			componentName: "Button",
			wantIDs:       []string{"button--default", "button--large"},
			wantMap: map[string]string{
				"button--default": "Button",
				"button--large":   "Button",
			},
		},
		{
			name: "returns empty results for no match",
			index: storybookclient.Index{
				Entries: map[string]storybookclient.IndexEntry{
					"card--default": {ID: "card--default", ImportPath: "./src/Card.stories.tsx", Type: "story"},
				},
			},
			componentName: "Button",
			wantIDs:       []string{},
			wantMap:       map[string]string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			gotIDs, gotMap := storyIDsForComponent(tt.index, tt.componentName)
			assert.ElementsMatch(t, tt.wantIDs, gotIDs)
			assert.Equal(t, tt.wantMap, gotMap)
		})
	}
}
