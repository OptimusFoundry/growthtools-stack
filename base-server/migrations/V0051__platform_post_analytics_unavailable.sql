ALTER TABLE platform_posts
    ADD COLUMN analytics_unavailable_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN platform_posts.analytics_unavailable_at IS
    'Set when the platform returns not-found for this post (e.g. user deleted it). Excluded from future analytics collection.';
