package processor

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"path"
	"strings"
	"time"

	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// PublishBlogToSite opens a PR against the account's configured site repo
// with the blog post rendered as markdown. Returns ("", nil) when the
// account has no site-publish target configured — that's a silent no-op,
// not an error.
func (p *GitHubProcessor) PublishBlogToSite(ctx context.Context, accountID uuid.UUID, post store.BlogPost) (string, error) {
	target, err := p.store.GetSitePublishTargetByAccount(ctx, accountID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return "", nil
		}
		p.logger.Error(ctx, "failed to get site publish target", err)
		return "", ErrSitePublishFailed
	}

	account, err := p.store.GetAccountByID(ctx, accountID)
	if err != nil {
		p.logger.Error(ctx, "failed to get account for site publish", err)
		return "", ErrGitHubNotConnected
	}

	conn, err := p.store.GetGitHubConnectionByUserID(ctx, account.OwnerUserID)
	if err != nil {
		p.logger.Error(ctx, "failed to get github connection for site publish", err)
		return "", ErrGitHubNotConnected
	}

	var media []store.Media
	if len(post.MediaIDs) > 0 {
		media, err = p.store.GetMediaByIDs(ctx, []uuid.UUID(post.MediaIDs))
		if err != nil {
			p.logger.Error(ctx, "failed to get media for site publish", err)
			return "", ErrSitePublishFailed
		}
	}

	markdown := buildBlogMarkdown(post, media, p.publicURLBase)

	suffix, err := randomHexSuffix(8)
	if err != nil {
		p.logger.Error(ctx, "failed to generate branch suffix for site publish", err)
		return "", ErrSitePublishFailed
	}
	branchName := fmt.Sprintf("blog/%s-%s", post.Slug, suffix)

	token := conn.AccessToken

	if err := p.githubClient.CreateBranch(ctx, token, target.RepoOwner, target.RepoName, target.BaseBranch, branchName); err != nil {
		p.logger.Error(ctx, "failed to create branch for site publish", err)
		return "", ErrSitePublishFailed
	}

	filePath := path.Join(target.ContentPath, post.Slug+".md")
	commitMessage := fmt.Sprintf("blog: publish %q", post.Title)
	if err := p.githubClient.CreateOrUpdateFileContents(ctx, token, target.RepoOwner, target.RepoName, filePath, branchName, markdown, commitMessage); err != nil {
		p.logger.Error(ctx, "failed to write blog file for site publish", err)
		return "", ErrSitePublishFailed
	}

	prURL, err := p.githubClient.CreatePullRequest(ctx, token, target.RepoOwner, target.RepoName, branchName, target.BaseBranch,
		fmt.Sprintf("Publish: %s", post.Title), "Automated PR publishing a blog post to the site.")
	if err != nil {
		p.logger.Error(ctx, "failed to create pull request for site publish", err)
		return "", ErrSitePublishFailed
	}

	return prURL, nil
}

// buildBlogMarkdown renders the post as YAML frontmatter + markdown body,
// rewriting any private s3 media URLs embedded in the content to their
// permanent public equivalents.
func buildBlogMarkdown(post store.BlogPost, media []store.Media, publicURLBase string) []byte {
	pubDate := time.Now()
	if post.PublishedAt != nil {
		pubDate = *post.PublishedAt
	}

	description := ""
	if post.Excerpt != nil {
		description = *post.Excerpt
	} else if post.MetaDescription != nil {
		description = *post.MetaDescription
	}

	tags := make([]string, 0, len(post.Keywords))
	for _, kw := range post.Keywords {
		tags = append(tags, fmt.Sprintf("%q", kw))
	}

	content := post.Content
	for _, m := range media {
		publicURL := fmt.Sprintf("%s/public/media/file/%s", publicURLBase, m.S3Key)
		content = strings.ReplaceAll(content, m.S3URL, publicURL)
	}

	var b strings.Builder
	b.WriteString("---\n")
	fmt.Fprintf(&b, "title: %q\n", post.Title)
	fmt.Fprintf(&b, "pubDate: %q\n", pubDate.Format("2006-01-02"))
	fmt.Fprintf(&b, "description: %q\n", description)
	fmt.Fprintf(&b, "tags: [%s]\n", strings.Join(tags, ", "))
	fmt.Fprintf(&b, "readingTime: %q\n", computeReadingTime(post.Content))
	b.WriteString("---\n\n")
	b.WriteString(content)

	return []byte(b.String())
}

// computeReadingTime estimates reading time at 200 words per minute,
// rounding up and clamping to a minimum of 1 minute.
func computeReadingTime(content string) string {
	wordCount := len(strings.Fields(content))
	n := int(math.Ceil(float64(wordCount) / 200.0))
	if n < 1 {
		n = 1
	}
	return fmt.Sprintf("%d min read", n)
}

// randomHexSuffix returns a random hex string of exactly n characters,
// sized independently from generateSecret (which is fixed at 32 bytes).
func randomHexSuffix(n int) (string, error) {
	b := make([]byte, n/2+1)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b)[:n], nil
}
