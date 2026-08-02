import type { FC } from "react";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Link } from "@/proto-design-system/components/primitives/Button/Link";
import type { BlogPost } from "@/types/blog";
import styles from "./blog-site-publish-status.module.scss";

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
			<section aria-label="Site publish status" className={styles.row}>
				<Alert variant="error">
					<span>{sitePublishError}</span>
					<Button
						variant="ghost"
						size="sm"
						onClick={onRetry}
						isLoading={retrying}
					>
						Retry
					</Button>
				</Alert>
			</section>
		);
	}

	if (post.sitePrUrl) {
		return (
			<section aria-label="Site publish status" className={styles.row}>
				<Link href={post.sitePrUrl} target="_blank">
					Pushed to GitHub &rarr; PR #{post.sitePrNumber ?? post.sitePrUrl}
				</Link>
			</section>
		);
	}

	return null;
};
