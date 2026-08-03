package processor

import (
	stdpath "path"
	"sort"
	"strings"

	storybookclient "base-server/internal/infra/clients/storybook"
)

// storyNameSuffixes are the Storybook file-naming conventions trimmed off an
// entry's import path to recover the underlying component name.
var storyNameSuffixes = []string{".stories.tsx", ".stories.ts", ".stories.jsx"}

// deriveComponentName resolves the component name for a single Storybook
// index entry, mirroring the suffix-trimming logic in
// internal/github/processor/storybook.go's resolveStoryIDs, but driven off
// the entry's own import path rather than a diff-changed path.
func deriveComponentName(entry storybookclient.IndexEntry) string {
	name := stdpath.Base(strings.TrimPrefix(entry.ImportPath, "./"))
	for _, suffix := range storyNameSuffixes {
		if strings.HasSuffix(name, suffix) {
			return strings.TrimSuffix(name, suffix)
		}
	}
	return name
}

// distinctComponentNames scans a Storybook index for all "story" entries and
// returns the deduplicated, sorted set of component names derived from their
// import paths.
func distinctComponentNames(index storybookclient.Index) []string {
	seen := make(map[string]struct{})
	for _, entry := range index.Entries {
		if entry.Type != "story" {
			continue
		}
		seen[deriveComponentName(entry)] = struct{}{}
	}

	names := make([]string, 0, len(seen))
	for name := range seen {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

// storyIDsForComponent returns every story ID in the index whose derived
// component name matches componentName, plus an id->componentName map
// covering exactly those ids.
func storyIDsForComponent(index storybookclient.Index, componentName string) (storyIDs []string, storyComponents map[string]string) {
	storyComponents = make(map[string]string)
	for _, entry := range index.Entries {
		if entry.Type != "story" {
			continue
		}
		if deriveComponentName(entry) != componentName {
			continue
		}
		storyIDs = append(storyIDs, entry.ID)
		storyComponents[entry.ID] = componentName
	}

	sort.Strings(storyIDs)
	if storyIDs == nil {
		storyIDs = make([]string, 0)
	}
	return storyIDs, storyComponents
}
