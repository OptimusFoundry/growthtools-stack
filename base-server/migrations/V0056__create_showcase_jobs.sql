-- Showcase jobs: AI-generated showcase component builder
-- Tracks jobs for generating showcase components from briefs and story snapshots

CREATE TABLE showcase_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    brief TEXT NOT NULL,
    component_name TEXT NOT NULL,
    story_ids TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'capturing', 'drafting', 'done', 'failed')),
    error TEXT,
    post_id UUID REFERENCES posts(id),
    capture_output JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_showcase_jobs_account ON showcase_jobs(account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_showcase_jobs_post ON showcase_jobs(post_id) WHERE post_id IS NOT NULL;
