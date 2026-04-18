-- Partial index for the ReadyReconciler's poll: it only cares about
-- rows still waiting on media, and only needs them ordered so the
-- LIMIT in each tick hits oldest-first. Split out of V0047 because
-- Postgres forbids using a new enum value (declared in V0047) inside
-- the same transaction it was added in.

CREATE INDEX IF NOT EXISTS idx_platform_posts_awaiting_media
    ON platform_posts (updated_at)
    WHERE status = 'awaiting_media';
