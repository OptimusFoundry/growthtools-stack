-- Add source_instruction and media_ids columns to blog_posts.
-- source_instruction stores the user-supplied generation prompt so it can
-- be pre-filled when the wizard is opened again.
-- media_ids stores the UUIDs of attached media items as a PostgreSQL UUID
-- array so the frontend can reconstruct thumbnails without a join.

ALTER TABLE blog_posts
    ADD COLUMN IF NOT EXISTS source_instruction TEXT,
    ADD COLUMN IF NOT EXISTS media_ids          UUID[] NOT NULL DEFAULT '{}';
