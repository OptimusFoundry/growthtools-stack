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
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function VideoPage() {
	const { jobs, loading, error } = useVideoJobs();

	if (loading) {
		return (
			<div className={styles.container}>
				<Stack gap="md" align="center" justify="center">
					<Spinner />
				</Stack>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<Stack gap="xl">
				<Stack direction="row" justify="between" align="center">
					<Stack gap="xs">
						<Text as="h1" size="3xl" weight="semibold">
							Video
						</Text>
						<Text color="secondary">
							Create AI-powered short videos from your content
						</Text>
					</Stack>
					<Link to="/video/new">
						<Button>
							<Plus size={16} />
							Create Video
						</Button>
					</Link>
				</Stack>

				{error && (
					<Text color="error" size="sm">
						{error}
					</Text>
				)}

				{jobs.length === 0 ? (
					<EmptyState
						title="No videos yet"
						description="Create your first AI-powered video from your posts or custom content."
						icon={<Film size={40} />}
						action={
							<Link to="/video/new">
								<Button>
									<Plus size={16} />
									Create Video
								</Button>
							</Link>
						}
					/>
				) : (
					<Stack gap="sm">
						{jobs.map((job, index) => (
							<motion.div
								key={job.id}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: index * 0.05 }}
							>
								<Card className={styles.card}>
									<Stack direction="row" justify="between" align="center">
										<Stack gap="xs">
											<Stack direction="row" gap="sm" align="center">
												<Film size={16} />
												<Text weight="medium">Video Job</Text>
												<Badge variant={STATUS_BADGE_VARIANT[job.status]}>
													{STATUS_LABELS[job.status]}
												</Badge>
											</Stack>
											<Text size="sm" color="secondary">
												{job.aspectRatio} &middot; Created{" "}
												{formatDate(job.createdAt)}
											</Text>
											{job.errorMessage && (
												<Text size="sm" color="error">
													{job.errorMessage}
												</Text>
											)}
										</Stack>
									</Stack>
								</Card>
							</motion.div>
						))}
					</Stack>
				)}
			</Stack>
		</div>
	);
}
