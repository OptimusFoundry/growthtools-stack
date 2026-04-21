import { Link } from "@tanstack/react-router";
import { ChevronRight, Trash2 } from "lucide-react";
import styles from "@/routes/posts.module.scss";
import { POST_STATUS_META, type PostListItem } from "@/types/post";
import { timeAgo, truncate } from "@/utils/format";
import { getPlatformIcon } from "@/utils/platformIcons";

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
		<Link
			to={isPublished ? "/posts/$id/analytics" : "/posts/$id"}
			params={{ id: post.id }}
			className={styles.postLink}
		>
			<div className={styles.postRow}>
				<div className={styles.titleRow}>
					<span className={styles.idx}>
						№ {String(index + 1).padStart(2, "0")}
					</span>
					<div className={styles.postBody}>
						<div className={styles.postTitleText}>
							{truncate(post.title ?? "Untitled post", 80)}
						</div>
						<div className={styles.postMetaText}>{statusLine(post)}</div>
					</div>
				</div>
				<div className={styles.metaRow}>
					{post.platforms.length > 0 && (
						<span className={styles.platformChips}>
							{post.platforms.slice(0, 3).map((p) => (
								<span key={p} className={styles.platformChip} title={p}>
									{getPlatformIcon(p, 14)}
								</span>
							))}
						</span>
					)}
					<span className={`${styles.statusBadge} ${styles[meta.className]}`}>
						{meta.label}
					</span>
					{canDelete && (
						<button
							type="button"
							className={styles.deleteBtn}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onDelete(post.id);
							}}
							aria-label={`Delete post "${truncate(post.title ?? "Untitled post", 40)}"`}
						>
							<Trash2 size={16} />
						</button>
					)}
					<span className={styles.chevronBtn} aria-hidden>
						<ChevronRight size={16} />
					</span>
				</div>
			</div>
		</Link>
	);
}

function statusLine(post: PostListItem): string {
	const when = post.publishedAt ?? post.scheduledAt ?? post.createdAt;
	const ago = timeAgo(when);
	if (post.status === "published") return `Published · ${ago}`;
	if (post.status === "scheduled") return `Queued · ${ago}`;
	if (post.status === "failed") return `Failed · needs retry`;
	if (post.status === "publishing") return `Publishing · ${ago}`;
	if (post.status === "partially_published") return `Partial · ${ago}`;
	return `Draft · edited ${ago}`;
}
