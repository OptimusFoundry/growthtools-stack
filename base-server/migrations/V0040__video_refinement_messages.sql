CREATE TABLE video_refinement_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_config_id UUID NOT NULL REFERENCES video_configs(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_video_refinement_messages_config ON video_refinement_messages(video_config_id);
