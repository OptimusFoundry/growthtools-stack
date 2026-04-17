-- Capture should only fire after the commit has successfully deployed, which
-- we detect via GitHub's workflow_run:completed:success webhook. Track the
-- enqueue moment separately from processed_at so the UI can distinguish
-- "waiting for CI" from "processing" and so repeat workflow_run deliveries
-- don't re-trigger the Playwright run.

ALTER TABLE github_commits
  ADD COLUMN capture_requested_at TIMESTAMPTZ;

-- Backfill: commits we already kicked off under the old push-triggered path
-- have processed_at set. Pretend they were "requested" when they were
-- processed so the UI renders them as captured/media-generated rather than
-- stuck on "Waiting for CI".
UPDATE github_commits
SET capture_requested_at = processed_at
WHERE processed_at IS NOT NULL AND capture_requested_at IS NULL;

-- head_sha lookup from workflow_run payloads. Composite with repo_id would be
-- stricter, but (repo_id, sha) is already UNIQUE so a sha-only index is fine
-- and avoids a second scan when we join across users later.
CREATE INDEX idx_github_commits_sha ON github_commits(sha);
