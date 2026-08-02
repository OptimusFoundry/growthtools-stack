import { useCallback, useState } from "react";
import { usePublishBlog } from "@/hooks/usePublishBlog";
import type { BlogPost, BlogPublishResult } from "@/types/blog";

export interface UseBlogSitePublishStatusResult {
	post: BlogPost;
	sitePublishError?: string;
	retrying: boolean;
	handleRetry: () => Promise<void>;
	applyPublishResult: (result: BlogPublishResult) => void;
}

/**
 * Owns the "current post + last site-publish attempt result" state for the
 * blog detail page, shared between BlogWizard (triggers publish) and
 * BlogSitePublishStatus (renders the outcome) via their parent.
 */
export function useBlogSitePublishStatus(
	initialPost: BlogPost,
): UseBlogSitePublishStatusResult {
	const [post, setPost] = useState<BlogPost>(initialPost);
	const [sitePublishError, setSitePublishError] = useState<string | undefined>(
		undefined,
	);
	const { retryPublish, retrying } = usePublishBlog();

	const applyPublishResult = useCallback((result: BlogPublishResult) => {
		setPost(result.post);
		setSitePublishError(result.sitePublishError);
	}, []);

	const handleRetry = useCallback(async () => {
		try {
			const result = await retryPublish(post.id);
			applyPublishResult(result);
		} catch (err) {
			setSitePublishError(err instanceof Error ? err.message : "Retry failed.");
		}
	}, [retryPublish, post.id, applyPublishResult]);

	return { post, sitePublishError, retrying, handleRetry, applyPublishResult };
}
