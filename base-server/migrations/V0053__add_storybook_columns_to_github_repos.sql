-- Adds storybook integration columns to github_repos table for Growth Tools.
-- Stores the URL to the Storybook deployment and component globs for discovery.
ALTER TABLE github_repos
    ADD COLUMN storybook_url TEXT NULL;

ALTER TABLE github_repos
    ADD COLUMN component_globs TEXT[] NULL;

-- Seed existing repos with Growth Tools defaults
UPDATE github_repos
SET storybook_url = 'https://ui.protoapp.xyz',
    component_globs = ARRAY['webapp/src/proto-design-system/components/**/*.tsx']
WHERE deleted_at IS NULL;
