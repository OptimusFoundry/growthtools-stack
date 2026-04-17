-- Media rows materialized from a capture-worker artifact (video + screenshots
-- attached to a drafted post). Distinct from 'upload' so the UI can label the
-- provenance and downstream consumers can filter.
ALTER TYPE media_source ADD VALUE IF NOT EXISTS 'github_capture';
