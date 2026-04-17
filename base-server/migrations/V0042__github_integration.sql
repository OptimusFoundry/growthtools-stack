CREATE TABLE github_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  github_user_id BIGINT NOT NULL,
  github_username VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (user_id)
);
CREATE INDEX idx_github_connections_user ON github_connections(user_id) WHERE deleted_at IS NULL;

CREATE TABLE github_repos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES github_connections(id),
  github_repo_id BIGINT NOT NULL,
  owner VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  default_branch VARCHAR(255),
  webhook_id BIGINT,
  webhook_secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (connection_id, owner, name)
);
CREATE INDEX idx_github_repos_connection ON github_repos(connection_id) WHERE deleted_at IS NULL;

CREATE TABLE github_commits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES github_repos(id),
  sha VARCHAR(40) NOT NULL,
  author_name VARCHAR(255),
  author_email VARCHAR(255),
  message TEXT NOT NULL,
  branch VARCHAR(255),
  commit_url TEXT,
  pushed_at TIMESTAMPTZ NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (repo_id, sha)
);
CREATE INDEX idx_github_commits_repo_pushed ON github_commits(repo_id, pushed_at DESC);
