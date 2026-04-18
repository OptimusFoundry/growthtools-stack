-- Adds a link from a captured commit to the long-form blog post generated
-- from it. Mirrors the existing post_id column which links to the social
-- media draft. Nullable — a commit may never have a blog post generated
-- (capture failed, user not using blog feature, worker down, etc.).
ALTER TABLE github_commits
    ADD COLUMN blog_post_id UUID NULL REFERENCES blog_posts(id);

-- Partial index to quickly find commits that still need a blog post.
-- Excludes rows where blog_post_id IS NOT NULL so the index stays small.
CREATE INDEX IF NOT EXISTS idx_github_commits_blog_post_id_null
    ON github_commits (id)
    WHERE blog_post_id IS NULL;
