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
--
-- This migration intentionally stops at "enum values added + column
-- added". Postgres refuses to USE a new enum value inside the same
-- transaction that declares it ("unsafe use of new value ... New
-- enum values must be committed before they can be used"), so the
-- partial index that references 'awaiting_media' lives in V0048.

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
