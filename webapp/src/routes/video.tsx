import { createFileRoute, Link } from "@tanstack/react-router";
import { Film, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useCallback } from "react";
import { useDeleteVideoConfig } from "@/hooks/useDeleteVideoConfig";
import { useVideoConfigs } from "@/hooks/useVideoConfigs";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import styles from "./page.module.scss";

export const Route = createFileRoute("/video")({
	component: VideoPage,
});

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function VideoPage() {
	const { configs, loading, error, refetch } = useVideoConfigs();
	const { deleteConfig, loading: deleting } = useDeleteVideoConfig();

	const handleDelete = useCallback(
		async (e: React.MouseEvent, id: string) => {
			e.preventDefault();
			e.stopPropagation();
			try {
				await deleteConfig(id);
				refetch();
			} catch {
				// error handled by hook
			}
		},
		[deleteConfig, refetch],
	);

	return (
		<motion.div
			className={styles.page}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.6 }}
		>
			<Stack direction="row" justify="between" align="center">
				<div className={styles.pageHeader}>
					<h1 className={styles.pageTitle}>Video</h1>
					<p className={styles.pageDescription}>
						Create AI-powered short videos from your content
					</p>
				</div>
				<Link to="/video/new">
					<Button variant="primary">
						<Plus size={16} /> Create Video
					</Button>
				</Link>
			</Stack>

			<div className={styles.pageContent}>
				{loading ? (
					<Spinner />
				) : error ? (
					<Text color="error" size="sm">
						{error}
					</Text>
				) : configs.length === 0 ? (
					<EmptyState
						title="No videos yet"
						description="Create your first AI-powered video from your posts or custom content."
						icon={<Film size={48} />}
						action={
							<Link to="/video/new">
								<Button variant="primary">
									<Plus size={16} /> Create Video
								</Button>
							</Link>
						}
					/>
				) : (
					<Stack gap="sm">
						{configs.map((config) => (
							<Link
								key={config.id}
								to="/video/$id"
								params={{ id: config.id }}
								style={{ textDecoration: "none" }}
							>
								<Card padding="md">
									<Stack direction="row" justify="between" align="center">
										<Stack gap="md">
											<Stack direction="row" gap="sm" align="center">
												<Text size="sm" weight="semibold">
													{config.title}
												</Text>
												<Badge variant="default" size="sm">
													{config.template}
												</Badge>
											</Stack>
											<Text size="xs" color="muted">
												{formatDate(config.createdAt)}
											</Text>
										</Stack>
										<Button
											variant="ghost"
											size="sm"
											disabled={deleting}
											onClick={(e) =>
												handleDelete(e as React.MouseEvent, config.id)
											}
										>
											<Trash2 size={14} />
										</Button>
									</Stack>
								</Card>
							</Link>
						))}
					</Stack>
				)}
			</div>
		</motion.div>
	);
}
