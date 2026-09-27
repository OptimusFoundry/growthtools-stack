-- All capture artifacts (screenshots + video) materialized as media rows for a
-- commit-generated draft. media_ids stays "selected / will publish"; this is
-- the pool the post editor lets the user pick from and regenerate with.
ALTER TABLE posts
    ADD COLUMN capture_media_ids UUID[] NOT NULL DEFAULT '{}';
