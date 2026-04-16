-- Add partially_published status to post_status enum
ALTER TYPE post_status ADD VALUE 'partially_published';

-- Add retry tracking columns to platform_posts
ALTER TABLE platform_posts ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_posts ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 3;
ALTER TABLE platform_posts ADD COLUMN next_retry_at TIMESTAMPTZ;
ALTER TABLE platform_posts ADD COLUMN last_attempt_at TIMESTAMPTZ;

-- Index for retry worker: find failed posts ready for retry
CREATE INDEX idx_platform_posts_retry
    ON platform_posts (next_retry_at)
    WHERE status = 'failed' AND next_retry_at IS NOT NULL;

-- Index for stuck detection: find posts stuck in publishing state
CREATE INDEX idx_platform_posts_stuck
    ON platform_posts (updated_at)
    WHERE status = 'publishing';
