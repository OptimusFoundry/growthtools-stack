-- Site publish targets (blog site configuration)

CREATE TABLE site_publish_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    base_branch TEXT NOT NULL,
    content_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id)
);
