-- Link github_commits to the post we generated from them + stash the raw
-- capture-worker response (S3 keys, step count, etc.) so the UI can show
-- "acted on / not acted on" without an extra table.

ALTER TABLE github_commits
  ADD COLUMN post_id UUID REFERENCES posts(id),
  ADD COLUMN capture_output JSONB,
  ADD COLUMN processed_at TIMESTAMPTZ;

CREATE INDEX idx_github_commits_post ON github_commits(post_id) WHERE post_id IS NOT NULL;
