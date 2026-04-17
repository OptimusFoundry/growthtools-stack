-- Records why an AI classifier decided a pushed commit was not worth capturing
-- (e.g. "lockfile-only change", "CI config", "tests only"). Nullable — unset
-- means the commit either hasn't been evaluated yet or is genuinely in-flight.
-- Presence of skipped_reason is the authoritative "this commit was filtered"
-- signal; capture_output stays null for skipped rows.

ALTER TABLE github_commits
    ADD COLUMN skipped_reason TEXT;
