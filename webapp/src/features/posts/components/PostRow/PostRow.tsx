import { Badge, Button } from "@optimusfoundry/quiet";
import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { POST_STATUS_META, type PostListItem } from "@/types/post";
import { timeAgo, truncate } from "@/utils/format";
import { getPlatformIcon } from "@/utils/platformIcons";
import styles from "./PostRow.module.scss";

export interface PostRowProps {
	post: PostListItem;
	index: number;
	onDelete: (id: string) => void;
}

export function PostRow({ post, index, onDelete }: PostRowProps) {
	const isPublished =
		post.status === "published" || post.status === "partially_published";
	const canDelete = post.status === "draft" || post.status === "scheduled";
	const meta = POST_STATUS_META[post.status];

	return (
		<div className={styles.row}>
			<Link
				to={isPublished ? "/posts/$id/analytics" : "/posts/$id"}
				params={{ id: post.id }}
				className={styles.link}
			>
				<span className={styles.idx}>
					№ {String(index + 1).padStart(2, "0")}
				</span>
				<span className={styles.body}>
					<span className={styles.title}>
						{truncate(post.title ?? "Untitled post", 80)}
					</span>
					<span className={styles.meta}>{statusLine(post)}</span>
				</span>
				{post.platforms.length > 0 && (
					<span className={styles.chips}>
						{post.platforms.slice(0, 3).map((p) => (
							<span key={p} className={styles.chip} title={p}>
								{getPlatformIcon(p, 14)}
							</span>
						))}
					</span>
				)}
				<Badge variant={meta.badgeVariant} size="sm" dot={meta.badgeDot}>
					{meta.label}
				</Badge>
			</Link>
			{canDelete && (
				<Button
					variant="ghost"
					size="sm"
					icon={<AppIcon icon={Trash2} size="md" />}
					aria-label={`Delete post "${truncate(post.title ?? "Untitled post", 40)}"`}
					onClick={() => onDelete(post.id)}
				/>
			)}
		</div>
	);
}

export function statusLine(post: PostListItem): string {
	const when = post.publishedAt ?? post.scheduledAt ?? post.createdAt;
	const ago = timeAgo(when);
	if (post.status === "published") return `Published · ${ago}`;
	if (post.status === "scheduled") return `Queued · ${ago}`;
	if (post.status === "failed") return `Failed · needs retry`;
	if (post.status === "publishing") return `Publishing · ${ago}`;
	if (post.status === "partially_published") return `Partial · ${ago}`;
	return `Draft · edited ${ago}`;
}
