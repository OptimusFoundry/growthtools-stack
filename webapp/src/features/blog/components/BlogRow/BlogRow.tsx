import { Link } from "@tanstack/react-router";
import { ChevronRight, Trash2 } from "lucide-react";
import styles from "@/routes/blog.module.scss";
import { BLOG_STATUS_META, type BlogPostListItem } from "@/types/blog";
import { timeAgo, truncate } from "@/utils/format";

export interface BlogRowProps {
	post: BlogPostListItem;
	index: number;
	onDelete: (id: string) => void;
}

export function BlogRow({ post, index, onDelete }: BlogRowProps) {
	const meta = BLOG_STATUS_META[post.status];
	return (
		<Link to="/blog/$id" params={{ id: post.id }} className={styles.postLink}>
			<div className={styles.postRow}>
				<div className={styles.titleRow}>
					<span className={styles.idx}>
						№ {String(index + 1).padStart(2, "0")}
					</span>
					<div className={styles.postBody}>
						<div className={styles.postTitleText}>
							{truncate(post.title, 80)}
						</div>
						<div className={styles.postMetaText}>
							{post.publishedAt
								? `Published · ${timeAgo(post.publishedAt)}`
								: `Draft · edited ${timeAgo(post.createdAt)}`}
						</div>
					</div>
				</div>
				<div className={styles.metaRow}>
					<span className={`${styles.statusBadge} ${styles[meta.className]}`}>
						{meta.label}
					</span>
					{post.status === "draft" && (
						<button
							type="button"
							className={styles.deleteBtn}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onDelete(post.id);
							}}
							aria-label={`Delete blog post "${post.title || "untitled"}"`}
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
