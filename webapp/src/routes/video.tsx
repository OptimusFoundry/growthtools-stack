import { createFileRoute, Link } from "@tanstack/react-router";
import { Film, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useVideoJobs } from "@/hooks/useVideoJobs";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { VideoJobStatus } from "@/types/video";
import styles from "./page.module.scss";

export const Route = createFileRoute("/video")({
	component: VideoPage,
});

const STATUS_BADGE_VARIANT: Record<
	VideoJobStatus,
	"success" | "warning" | "error" | "default" | "primary"
> = {
	pending: "default",
	generating_config: "primary",
	rendering: "warning",
	uploading: "warning",
	completed: "success",
	failed: "error",
};

const STATUS_LABELS: Record<VideoJobStatus, string> = {
	pending: "Pending",
	generating_config: "Generating",
	rendering: "Rendering",
	uploading: "Uploading",
	completed: "Completed",
	failed: "Failed",
};

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
	const { jobs, loading, error } = useVideoJobs();

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
				) : jobs.length === 0 ? (
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
						{jobs.map((job) => (
							<Card key={job.id} padding="md">
								<Stack direction="row" justify="between" align="center">
									<Stack gap="md">
										<Stack direction="row" gap="sm" align="center">
											<Text size="sm" weight="semibold">
												Video Job
											</Text>
											<Badge
												variant={STATUS_BADGE_VARIANT[job.status]}
												size="sm"
											>
												{STATUS_LABELS[job.status]}
											</Badge>
										</Stack>
										<Stack direction="row" gap="md" align="center">
											<Text size="xs" color="muted">
												<Text
													as="span"
													size="xs"
													color="secondary"
													weight="medium"
												>
													Ratio:{" "}
												</Text>
												{job.aspectRatio}
											</Text>
											<Text size="xs" color="muted">
												<Text
													as="span"
													size="xs"
													color="secondary"
													weight="medium"
												>
													Created:{" "}
												</Text>
												{formatDate(job.createdAt)}
											</Text>
										</Stack>
										{job.errorMessage && (
											<Text size="xs" color="error">
												{job.errorMessage}
											</Text>
										)}
									</Stack>
								</Stack>
							</Card>
						))}
					</Stack>
				)}
			</div>
		</motion.div>
	);
}
