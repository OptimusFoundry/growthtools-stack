import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Select } from "@/proto-design-system/components/forms/Select";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { BlogStatus } from "@/types/blog";
import styles from "./page.module.scss";

export const Route = createFileRoute("/blog")({
	component: BlogPage,
});

const STATUS_OPTIONS = [
	{ value: "", label: "All Statuses" },
	{ value: "draft", label: "Draft" },
	{ value: "published", label: "Published" },
	{ value: "archived", label: "Archived" },
];

const STATUS_BADGE_VARIANT: Record<
	BlogStatus,
	"default" | "success" | "secondary"
> = {
	draft: "default",
	published: "success",
	archived: "secondary",
};

function BlogPage() {
	const [statusFilter, setStatusFilter] = useState<string>("");

	const filters = useMemo(
		() => ({
			status: (statusFilter || undefined) as BlogStatus | undefined,
		}),
		[statusFilter],
	);

	const { blogPosts, loading } = useBlogPosts(filters);

	return (
		<Stack gap="lg" className={styles.page} animate>
			<Stack direction="row" justify="between" align="start" wrap>
				<Stack gap="xs">
					<Text as="h1" size="2xl" weight="bold">
						Blog
					</Text>
					<Text color="muted">Write and manage your blog posts</Text>
				</Stack>
				<Link to="/blog/new">
					<Button variant="primary">
						<Plus size={16} /> New Post
					</Button>
				</Link>
			</Stack>

			<Stack direction="row" gap="sm">
				<Select
					options={STATUS_OPTIONS}
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					placeholder="Filter by status"
				/>
			</Stack>

			<Stack gap="md">
				{loading ? (
					<Spinner />
				) : blogPosts.length === 0 ? (
					<EmptyState
						title="No blog posts yet"
						description="Create your first blog post to share long-form content."
						icon={<FileText size={48} />}
						action={
							<Link to="/blog/new">
								<Button variant="primary">
									<Plus size={16} /> New Post
								</Button>
							</Link>
						}
					/>
				) : (
					<Stack gap="sm">
						{blogPosts.map((post) => (
							<Link key={post.id} to="/blog/$id" params={{ id: post.id }}>
								<Card padding="md" interactive>
									<Stack gap="xs">
										<Stack direction="row" gap="xs" align="center">
											<Text weight="semibold">{post.title}</Text>
											<Badge variant={STATUS_BADGE_VARIANT[post.status]}>
												{post.status}
											</Badge>
										</Stack>
										{post.excerpt && (
											<Text size="sm" color="muted">
												{post.excerpt}
											</Text>
										)}
										<Stack direction="row" gap="sm" align="center">
											<Text size="xs" color="muted">
												{new Date(post.createdAt).toLocaleDateString()}
											</Text>
											{post.keywords.length > 0 && (
												<Stack direction="row" gap="xs" wrap>
													{post.keywords.slice(0, 3).map((keyword) => (
														<Badge key={keyword} variant="outline" size="sm">
															{keyword}
														</Badge>
													))}
												</Stack>
											)}
										</Stack>
									</Stack>
								</Card>
							</Link>
						))}
					</Stack>
				)}
			</Stack>
		</Stack>
	);
}
