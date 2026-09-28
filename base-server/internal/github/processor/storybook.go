package processor

import (
	"context"
	stdpath "path"
	"sort"
	"strings"

	"base-server/internal/infra/store"

	"github.com/bmatcuk/doublestar/v4"
)

// resolveStoryIDs resolves the Storybook story IDs affected by a commit's diff.
//
// WHEN repo.StorybookURL is nil/empty, OR repo.ComponentGlobs is empty, OR
// p.storybookClient is nil, returns (nil, nil, nil). Otherwise resolves
// changed component paths (via matchesComponentGlob) against the Storybook
// story index (via p.storybookClient.FetchIndex) and returns the sorted
// deduplicated story ID list plus an id->componentName map. A fetch error is
// logged and returned as the third value; callers treat that identically to
// an empty result.
func (p *GitHubProcessor) resolveStoryIDs(ctx context.Context, repo store.GitHubRepo, diff string) (storyIDs []string, storyComponents map[string]string, err error) {
	if repo.StorybookURL == nil || *repo.StorybookURL == "" || len(repo.ComponentGlobs) == 0 || p.storybookClient == nil {
		return nil, nil, nil
	}

	changed := changedFilePaths(diff)
	matched := make([]string, 0, len(changed))
	seenSource := make(map[string]struct{}, len(changed))
	for _, path := range changed {
		// Sidecar files (styles, types) count as a change to their
		// component, so restyles still resolve to its stories.
		source := componentSourcePath(path)
		if _, dup := seenSource[source]; dup {
			continue
		}
		if matchesComponentGlob(source, repo.ComponentGlobs) {
			seenSource[source] = struct{}{}
			matched = append(matched, source)
		}
	}
	if len(matched) == 0 {
		return nil, nil, nil
	}

	index, fetchErr := p.storybookClient.FetchIndex(ctx, *repo.StorybookURL)
	if fetchErr != nil {
		p.logger.Error(ctx, "failed to fetch storybook index", fetchErr)
		return nil, nil, fetchErr
	}

	ids := make(map[string]struct{})
	components := make(map[string]string)
	suffixes := []string{".stories.tsx", ".stories.ts", ".stories.jsx"}
	for _, changedPath := range matched {
		trimmed := strings.TrimPrefix(changedPath, "webapp/")
		base := trimmed[:len(trimmed)-len(stdpath.Ext(trimmed))]
		componentName := strings.TrimSuffix(stdpath.Base(changedPath), stdpath.Ext(changedPath))

		for _, suffix := range suffixes {
			candidate := base + suffix
			for _, entry := range index.Entries {
				if entry.Type != "story" {
					continue
				}
				if strings.TrimPrefix(entry.ImportPath, "./") == candidate {
					ids[entry.ID] = struct{}{}
					components[entry.ID] = componentName
				}
			}
		}
	}

	if len(ids) == 0 {
		return nil, nil, nil
	}

	storyIDs = make([]string, 0, len(ids))
	for id := range ids {
		storyIDs = append(storyIDs, id)
	}
	sort.Strings(storyIDs)
	return storyIDs, components, nil
}

// componentSidecarSuffixes are files that belong to the component whose
// basename they share: Badge.module.scss / Badge.scss / Badge.types.ts all
// belong to Badge.tsx.
var componentSidecarSuffixes = []string{".module.scss", ".scss", ".types.ts"}

// componentSourcePath maps a changed sidecar file to its component's .tsx
// path; any other path is returned unchanged.
func componentSourcePath(path string) string {
	for _, suffix := range componentSidecarSuffixes {
		if strings.HasSuffix(path, suffix) {
			return strings.TrimSuffix(path, suffix) + ".tsx"
		}
	}
	return path
}

// matchesComponentGlob reports whether a changed file path is a component
// source file relevant to Storybook capture.
//
// Returns true iff path doublestar-matches at least one glob in globs AND
// path's basename does not end in .stories.tsx/.stories.ts/.stories.jsx.
func matchesComponentGlob(path string, globs []string) bool {
	base := stdpath.Base(path)
	if strings.HasSuffix(base, ".stories.tsx") || strings.HasSuffix(base, ".stories.ts") || strings.HasSuffix(base, ".stories.jsx") {
		return false
	}
	for _, glob := range globs {
		if ok, _ := doublestar.Match(glob, path); ok {
			return true
		}
	}
	return false
}

// changedFilePaths extracts the set of file paths touched by a unified diff.
//
// Parses `diff --git a/<path> b/<path>` headers (same format
// diffTouchesFrontend parses in webhook.go) and returns the deduplicated b/
// paths. Unlike diffTouchesFrontend's "unknown diff -> true" fallback, an
// empty/unparseable diff returns an empty non-nil slice.
func changedFilePaths(diff string) []string {
	seen := make(map[string]struct{})
	paths := make([]string, 0)
	for _, line := range strings.Split(diff, "\n") {
		if !strings.HasPrefix(line, "diff --git ") {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) < 4 {
			continue
		}
		b := strings.TrimPrefix(parts[3], "b/")
		if _, ok := seen[b]; ok {
			continue
		}
		seen[b] = struct{}{}
		paths = append(paths, b)
	}
	return paths
}

// DefaultComponentGlobs is used when a repo's component_globs column is NULL.
// Matches the V0053 seed so repos connected after that migration behave the
// same as the ones it backfilled.
var DefaultComponentGlobs = []string{"webapp/src/proto-design-system/components/**/*.tsx"}

// storybookURLFromReadme extracts the Storybook deployment URL advertised in
// a README, using the same convention as appURLFromReadme: the first
// non-badge URL on a line that mentions "Storybook" (case-insensitive).
// Returns "" when no such line exists.
func storybookURLFromReadme(readme string) string {
	for _, line := range strings.Split(readme, "\n") {
		if !strings.Contains(strings.ToLower(line), "storybook") {
			continue
		}
		for _, candidate := range readmeURLRE.FindAllString(line, -1) {
			candidate = strings.TrimRight(candidate, ".,;:)")
			if isNonTargetURL(candidate) {
				continue
			}
			return candidate
		}
	}
	return ""
}

// withStorybookDefaults returns a copy of repo with Storybook config filled
// in where the DB columns are NULL: storybook_url from the README's
// "Storybook" line, component_globs from DefaultComponentGlobs. DB values
// always win. Nothing on the connect path writes these columns, so without
// this fallback every repo connected after the V0053 seed silently loses
// Storybook capture.
func withStorybookDefaults(repo store.GitHubRepo, readme string) store.GitHubRepo {
	if repo.StorybookURL == nil || *repo.StorybookURL == "" {
		if u := storybookURLFromReadme(readme); u != "" {
			repo.StorybookURL = &u
		}
	}
	if len(repo.ComponentGlobs) == 0 {
		repo.ComponentGlobs = store.StringArray(append([]string(nil), DefaultComponentGlobs...))
	}
	return repo
}
