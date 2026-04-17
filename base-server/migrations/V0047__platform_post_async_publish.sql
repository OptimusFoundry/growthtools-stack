-- Async publish pipeline schema: each platform_post now carries a
-- platform-specific media handle (container_id for Threads, media_id +
-- processing_info for X, blob ref / jobId for Bluesky) and walks a
-- longer state machine so the publish worker can stop blocking on
-- multi-minute transcodes. The reconciler + finalizer consult
-- media_handle to resume whatever the platform handed back during
-- upload.
--
-- Handle shape is adapter-owned JSON; the workers pass it through
-- without cracking it open.

ALTER TABLE platform_posts
    ADD COLUMN media_handle JSONB;

-- Extend the status enum. 'queued' is set by the dispatcher right
-- after post.publish fans out. 'awaiting_media' is set by the uploader
-- once it has a handle the platform returned. 'media_ready' is set by
-- the reconciler when the platform reports processing complete;
-- finalizer picks it up, moves through 'publishing', and either
-- 'published' or 'failed'.
ALTER TYPE platform_post_status ADD VALUE IF NOT EXISTS 'queued';
ALTER TYPE platform_post_status ADD VALUE IF NOT EXISTS 'awaiting_media';
ALTER TYPE platform_post_status ADD VALUE IF NOT EXISTS 'media_ready';

-- Partial index for the reconciler's poll: it only cares about rows
-- still awaiting media, and only so it can LIMIT to a batch at a time.
CREATE INDEX idx_platform_posts_awaiting_media
    ON platform_posts (updated_at)
    WHERE status = 'awaiting_media';
