-- Growth Tools core schema
-- Platform connections, posts, media, blog, analytics, voice profiles

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE platform_type AS ENUM (
    'x', 'linkedin', 'bluesky', 'facebook', 'instagram', 'threads', 'tiktok', 'pinterest'
);

CREATE TYPE platform_connection_status AS ENUM ('active', 'expired', 'revoked', 'error');

CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'publishing', 'published', 'failed');

CREATE TYPE content_type AS ENUM ('text', 'image', 'video', 'carousel', 'thread', 'story', 'reel');

CREATE TYPE post_source AS ENUM ('manual', 'ai_generated', 'github_event', 'bulk_import');

CREATE TYPE platform_post_status AS ENUM ('pending', 'publishing', 'published', 'failed');

CREATE TYPE media_source AS ENUM ('upload', 'ai_generated', 'url_import');

CREATE TYPE blog_status AS ENUM ('draft', 'published', 'archived');

-- ============================================================================
-- PLATFORM CONNECTIONS
-- ============================================================================

CREATE TABLE platform_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    platform_user_id TEXT NOT NULL,
    display_name TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[] DEFAULT '{}',
    status platform_connection_status NOT NULL DEFAULT 'active',
    connected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    UNIQUE(account_id, platform, platform_user_id)
);

CREATE INDEX idx_platform_connections_account ON platform_connections(account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_platform_connections_platform ON platform_connections(account_id, platform) WHERE deleted_at IS NULL;

-- ============================================================================
-- POSTS
-- ============================================================================

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    content_type content_type NOT NULL DEFAULT 'text',
    status post_status NOT NULL DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    media_ids UUID[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    ai_generated BOOLEAN NOT NULL DEFAULT false,
    source post_source NOT NULL DEFAULT 'manual',
    github_event_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_posts_account ON posts(account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_status ON posts(account_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_scheduled ON posts(scheduled_at) WHERE status = 'scheduled' AND deleted_at IS NULL;
CREATE INDEX idx_posts_published ON posts(published_at DESC) WHERE status = 'published' AND deleted_at IS NULL;

-- ============================================================================
-- PLATFORM POSTS (per-platform publish records)
-- ============================================================================

CREATE TABLE platform_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    platform_post_id TEXT,
    status platform_post_status NOT NULL DEFAULT 'pending',
    content TEXT,
    published_at TIMESTAMPTZ,
    error_message TEXT,
    engagement JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_platform_posts_post ON platform_posts(post_id);
CREATE INDEX idx_platform_posts_platform ON platform_posts(platform, platform_post_id);

-- ============================================================================
-- MEDIA
-- ============================================================================

CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    s3_url TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    width INT,
    height INT,
    alt_text TEXT,
    source media_source NOT NULL DEFAULT 'upload',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_media_account ON media(account_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- GITHUB EVENTS
-- ============================================================================

CREATE TABLE github_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    repo_name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    delivery_id TEXT NOT NULL UNIQUE,
    processed BOOLEAN NOT NULL DEFAULT false,
    post_id UUID REFERENCES posts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_github_events_account ON github_events(account_id);
CREATE INDEX idx_github_events_unprocessed ON github_events(processed) WHERE processed = false;

-- ============================================================================
-- BLOG POSTS
-- ============================================================================

CREATE TABLE blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    excerpt TEXT,
    status blog_status NOT NULL DEFAULT 'draft',
    seo_title TEXT,
    meta_description TEXT,
    keywords TEXT[] DEFAULT '{}',
    og_title TEXT,
    og_description TEXT,
    featured_image_id UUID REFERENCES media(id),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    UNIQUE(account_id, slug)
);

CREATE INDEX idx_blog_posts_account ON blog_posts(account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_blog_posts_status ON blog_posts(account_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_blog_posts_slug ON blog_posts(account_id, slug) WHERE deleted_at IS NULL;

-- ============================================================================
-- POST ANALYTICS
-- ============================================================================

CREATE TABLE post_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_post_id UUID NOT NULL REFERENCES platform_posts(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    impressions INT NOT NULL DEFAULT 0,
    likes INT NOT NULL DEFAULT 0,
    comments INT NOT NULL DEFAULT 0,
    shares INT NOT NULL DEFAULT 0,
    clicks INT NOT NULL DEFAULT 0,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_post_analytics_platform_post ON post_analytics(platform_post_id);
CREATE INDEX idx_post_analytics_collected ON post_analytics(collected_at DESC);

-- ============================================================================
-- VOICE PROFILES
-- ============================================================================

CREATE TABLE voice_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    tone TEXT NOT NULL DEFAULT 'professional',
    style TEXT NOT NULL DEFAULT 'concise',
    example_posts TEXT[] DEFAULT '{}',
    industry TEXT,
    target_audience TEXT,
    custom_instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id)
);

-- ============================================================================
-- CONVERSATIONS (AI Chat)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_conversations_account ON ai_conversations(account_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);
