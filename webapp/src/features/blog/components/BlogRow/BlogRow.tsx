import { Badge, Button, Col, Grid } from "@optimusfoundry/quiet";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Trash2 } from "lucide-react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { BLOG_STATUS_META, type BlogPostListItem } from "@/types/blog";
import { timeAgo, truncate } from "@/utils/format";
import styles from "./BlogRow.module.scss";

export interface BlogRowProps {
	post: BlogPostListItem;
	index: number;
	onDelete: (id: string) => void;
}

export function BlogRow({ post, index, onDelete }: BlogRowProps) {
	const meta = BLOG_STATUS_META[post.status];
	return (
		<Link to="/blog/$id" params={{ id: post.id }} className={styles.link}>
			<Grid columns={12} gap="sm" align="center" className={styles.row}>
				<Col span={1} spanMd={1} spanSm={2}>
					<span className={styles.idx}>
						№ {String(index + 1).padStart(2, "0")}
					</span>
				</Col>
				<Col span={7} spanMd={7} spanSm={10}>
					<div className={styles.title}>{truncate(post.title, 80)}</div>
					<div className={styles.meta}>
						{post.publishedAt
							? `Published · ${timeAgo(post.publishedAt)}`
							: `Draft · edited ${timeAgo(post.createdAt)}`}
					</div>
				</Col>
				<Col span={2} spanMd={2} spanSm={8}>
					<Badge variant={meta.badgeVariant}>{meta.label}</Badge>
				</Col>
				<Col span={2} spanMd={2} spanSm={4}>
					<div className={styles.actions}>
						<Button
							variant="ghost"
							size="sm"
							icon={<AppIcon icon={Trash2} size="md" />}
							aria-label={`Delete blog post "${post.title || "untitled"}"`}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onDelete(post.id);
							}}
						/>
						<span className={styles.chevron} aria-hidden>
							<AppIcon icon={ChevronRight} size="md" />
						</span>
					</div>
				</Col>
			</Grid>
		</Link>
	);
}
