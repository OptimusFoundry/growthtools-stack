import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { toPlatformPost, toPost } from "@/api/transforms/post";
import type { ApiPlatformPost, ApiPost } from "@/api/types/post";
import type { PlatformPost, Post } from "@/types/post";
import { getErrorMessage } from "@/utils";

interface PostDetailsResponse {
	post: ApiPost;
	platform_posts: ApiPlatformPost[];
}

export const useGetPostDetails = (postId: string) => {
	const [post, setPost] = useState<Post | null>(null);
	const [platformPosts, setPlatformPosts] = useState<PlatformPost[]>([]);
	const [loading, setLoading] = useState(Boolean(postId));
	const [error, setError] = useState<string | null>(null);

	const fetchDetails = useCallback(async () => {
		if (!postId) return;

		setLoading(true);
		setError(null);

		try {
			const response = await fetcher<PostDetailsResponse>(
				`${import.meta.env.VITE_API_URL}/api/protected/posts/${postId}/details`,
			);
			setPost(toPost(response.post));
			setPlatformPosts((response.platform_posts ?? []).map(toPlatformPost));
		} catch (err: unknown) {
			setError(getErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}, [postId]);

	useEffect(() => {
		fetchDetails();
	}, [fetchDetails]);

	return { post, platformPosts, loading, error, refetch: fetchDetails };
};
