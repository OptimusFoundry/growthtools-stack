import { Alert, Button, Link } from "@optimusfoundry/quiet";
import type { FC } from "react";
import type { BlogPost } from "@/types/blog";

export interface BlogSitePublishStatusProps {
	post: BlogPost;
	sitePublishError?: string;
	onRetry: () => void;
	retrying: boolean;
}

/**
 * Presentational status row for the shubhanshu.dev site-publish outcome.
 * Error takes precedence over a stale PR link — a fresh failed retry means
 * the row should reflect the current failure, not a prior success.
 */
export const BlogSitePublishStatus: FC<BlogSitePublishStatusProps> = ({
	post,
	sitePublishError,
	onRetry,
	retrying,
}) => {
	if (sitePublishError) {
		return (
			<section aria-label="Site publish status">
				<Alert
					variant="error"
					action={
						<Button
							variant="secondary"
							size="sm"
							onClick={onRetry}
							loading={retrying}
						>
							Retry
						</Button>
					}
				>
					{sitePublishError}
				</Alert>
			</section>
		);
	}

	if (post.sitePrUrl) {
		return (
			<section aria-label="Site publish status">
				<Link href={post.sitePrUrl} external>
					Pushed to GitHub → PR #{post.sitePrNumber ?? post.sitePrUrl}
				</Link>
			</section>
		);
	}

	return null;
};
