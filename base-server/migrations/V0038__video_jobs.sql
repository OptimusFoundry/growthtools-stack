-- Video generation: configs (AI-generated video specifications) and jobs (render tracking)

CREATE TYPE video_job_status AS ENUM (
    'pending',
    'generating_config',
    'rendering',
    'uploading',
    'completed',
    'failed'
);

CREATE TYPE video_aspect_ratio AS ENUM (
    '9:16',
    '1:1',
    '16:9'
);

-- Stores AI-generated video configuration JSON
CREATE TABLE video_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    config JSONB NOT NULL DEFAULT '{}',
    template TEXT NOT NULL DEFAULT 'text_on_gradient',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_video_configs_account ON video_configs(account_id) WHERE deleted_at IS NULL;

-- Tracks render jobs
CREATE TABLE video_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    video_config_id UUID NOT NULL REFERENCES video_configs(id) ON DELETE CASCADE,
    status video_job_status NOT NULL DEFAULT 'pending',
    aspect_ratio video_aspect_ratio NOT NULL DEFAULT '9:16',
    media_id UUID REFERENCES media(id) ON DELETE SET NULL,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_video_jobs_account ON video_jobs(account_id);
CREATE INDEX idx_video_jobs_status ON video_jobs(status) WHERE status IN ('pending', 'rendering', 'uploading');
CREATE INDEX idx_video_jobs_config ON video_jobs(video_config_id);
