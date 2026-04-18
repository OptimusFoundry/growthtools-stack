package processor

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// GetCommit returns a single commit scoped to the requesting user's connection.
// The store query filters on user_id so a mismatched owner reads as not-found.
func (p *GitHubProcessor) GetCommit(ctx context.Context, userID, commitID uuid.UUID) (store.GitHubCommit, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "commit_id", Value: commitID.String()},
		observability.Field{Key: "operation", Value: "get_commit"},
	)

	commit, err := p.store.GetGitHubCommitByIDForUser(ctx, userID, commitID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return store.GitHubCommit{}, ErrCommitNotFound
		}
		p.logger.Error(ctx, "failed to get github commit", err)
		return store.GitHubCommit{}, ErrFailedGetCommit
	}
	p.rewriteCaptureURLs(ctx, &commit)
	return commit, nil
}

// ListRecentCommits returns a page of commits across all repos for a user's
// connection along with the total row count so the UI can render full page
// navigation.
func (p *GitHubProcessor) ListRecentCommits(ctx context.Context, userID uuid.UUID, limit, offset int) ([]store.GitHubCommitSummary, int, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "operation", Value: "list_recent_commits"},
	)

	conn, err := p.store.GetGitHubConnectionByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, 0, ErrConnectionNotFound
		}
		p.logger.Error(ctx, "failed to get github connection", err)
		return nil, 0, ErrConnectionNotFound
	}

	total, err := p.store.CountGitHubCommitsByConnection(ctx, conn.ID)
	if err != nil {
		p.logger.Error(ctx, "failed to count github commits", err)
		return nil, 0, ErrFailedDisconnect
	}

	commits, err := p.store.ListGitHubCommitsByConnection(ctx, conn.ID, limit, offset)
	if err != nil {
		p.logger.Error(ctx, "failed to list github commits", err)
		return nil, 0, ErrFailedDisconnect
	}

	// Summaries carry only a capture_artifact_count + capture_error; the full
	// capture_output (and therefore url rewriting) is GetCommit's job.
	return commits, total, nil
}

// captureOutputForRewrite mirrors the subset of capture_output we touch when
// rewriting URLs. We read into this shape, swap the urls, and marshal back.
type captureOutputForRewrite struct {
	Commit     string                `json:"commit,omitempty"`
	CaptureDir string                `json:"captureDir,omitempty"`
	StepCount  int                   `json:"stepCount,omitempty"`
	Uploaded   []captureUploadedItem `json:"uploaded,omitempty"`
	Error      string                `json:"error,omitempty"`
}

type captureUploadedItem struct {
	Key string `json:"key"`
	URL string `json:"url,omitempty"`
}

// rewriteCaptureURLs replaces `s3://bucket/key` entries in the commit's
// capture_output with presigned HTTPS URLs so the browser can fetch the
// artefacts directly. Any failure to parse or presign is logged and the
// original URL is left intact — a stale s3:// URL is no worse than dropping
// the commit entirely.
func (p *GitHubProcessor) rewriteCaptureURLs(ctx context.Context, commit *store.GitHubCommit) {
	if p.urlSigner == nil || commit == nil || commit.CaptureOutput == nil {
		return
	}

	var output captureOutputForRewrite
	if err := json.Unmarshal(*commit.CaptureOutput, &output); err != nil {
		p.logger.Error(ctx, "failed to decode capture_output for url rewrite", err)
		return
	}

	changed := false
	for i := range output.Uploaded {
		item := &output.Uploaded[i]
		if !strings.HasPrefix(item.URL, "s3://") {
			continue
		}
		// s3://bucket/key → split on first "/" after the scheme prefix.
		rest := strings.TrimPrefix(item.URL, "s3://")
		_, key, ok := strings.Cut(rest, "/")
		if !ok {
			continue
		}
		if key == "" {
			continue
		}
		signed, err := p.urlSigner.PresignGetURL(ctx, key, presignTTL)
		if err != nil {
			p.logger.Error(ctx, "failed to presign capture url", err)
			continue
		}
		item.URL = signed
		changed = true
	}

	if !changed {
		return
	}

	raw, err := json.Marshal(output)
	if err != nil {
		p.logger.Error(ctx, "failed to re-encode capture_output after url rewrite", err)
		return
	}
	rawMsg := json.RawMessage(raw)
	commit.CaptureOutput = &rawMsg
}
