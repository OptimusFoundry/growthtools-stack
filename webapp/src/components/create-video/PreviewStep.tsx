import { Link } from "@tanstack/react-router";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { VideoConfig, VideoJob } from "@/types/video";
import styles from "./CreateVideoWizard.module.scss";

interface PreviewStepProps {
	config: VideoConfig | null;
	generating: boolean;
	job: VideoJob | null;
	onRetry: () => void;
}

function extractScenes(
	config: VideoConfig,
): { id: string; text: string; subtext?: string; duration_frames: number }[] {
	const data = config.config as Record<string, unknown>;
	return (
		(data.scenes as {
			id: string;
			text: string;
			subtext?: string;
			duration_frames: number;
		}[]) ?? []
	);
}

function extractTheme(config: VideoConfig):
	| {
			background_colors?: string[];
			text_color?: string;
			accent_color?: string;
	  }
	| undefined {
	const data = config.config as Record<string, unknown>;
	return data.theme as
		| {
				background_colors?: string[];
				text_color?: string;
				accent_color?: string;
		  }
		| undefined;
}

export function PreviewStep({
	config,
	generating,
	job,
	onRetry,
}: PreviewStepProps) {
	// State 1: Empty
	if (!config && !generating) {
		return (
			<div className={styles.previewPanel}>
				<EmptyState
					title="Preview"
					description="Fill in your title and prompt, then generate a config to see a preview"
				/>
			</div>
		);
	}

	// State 2: Generating
	if (generating) {
		return (
			<div className={styles.previewPanel}>
				<EmptyState
					title="Generating configuration..."
					description="AI is creating your video scenes and theme"
					icon={<Spinner size="lg" />}
				/>
			</div>
		);
	}

	// States 3-5: Config exists
	if (!config) return null;

	const scenes = extractScenes(config);
	const theme = extractTheme(config);

	return (
		<div className={styles.previewPanel}>
			<Stack gap="md">
				{/* Config summary */}
				<Card padding="md">
					<Stack gap="sm">
						<Stack direction="row" gap="sm" align="center">
							<Text as="h3" size="lg" weight="medium">
								Configuration
							</Text>
							<Badge variant="primary">{config.template}</Badge>
						</Stack>

						<Text size="sm" color="secondary">
							{scenes.length} scene{scenes.length !== 1 ? "s" : ""}
						</Text>

						{theme?.background_colors && theme.background_colors.length > 0 && (
							<Stack direction="row" gap="sm" align="center">
								<Text size="sm" weight="medium">
									Theme:
								</Text>
								{theme.background_colors.map((color) => (
									<div
										key={color}
										className={styles.colorSwatch}
										style={{ backgroundColor: color }}
									/>
								))}
							</Stack>
						)}
					</Stack>
				</Card>

				{/* Scene cards */}
				{scenes.map((scene, index) => (
					<Card key={scene.id} padding="md">
						<Stack gap="xs">
							<Stack direction="row" justify="between" align="center">
								<Badge variant="default" size="sm">
									Scene {index + 1}
								</Badge>
								<Text size="xs" color="secondary">
									{Math.round(scene.duration_frames / 30)}s
								</Text>
							</Stack>
							<Text weight="medium">{scene.text}</Text>
							{scene.subtext && (
								<Text size="sm" color="secondary">
									{scene.subtext}
								</Text>
							)}
						</Stack>
					</Card>
				))}

				{/* Job status */}
				{job && (
					<Card padding="md">
						<Stack gap="sm">
							<Stack direction="row" gap="sm" align="center">
								<Text weight="medium">Render Status:</Text>
								<Badge
									variant={
										job.status === "completed"
											? "success"
											: job.status === "failed"
												? "error"
												: "warning"
									}
								>
									{job.status}
								</Badge>
							</Stack>

							{(job.status === "rendering" ||
								job.status === "uploading" ||
								job.status === "pending") && (
								<Stack direction="row" gap="sm" align="center">
									<Spinner size="sm" />
									<Text size="sm" color="secondary">
										Your video is being rendered...
									</Text>
								</Stack>
							)}

							{job.status === "completed" && (
								<Stack gap="md">
									<video
										className={styles.videoPlayer}
										src={`${import.meta.env.VITE_API_URL}/api/protected/video/jobs/${job.id}/file`}
										controls
										preload="metadata"
										crossOrigin="use-credentials"
									/>
									<Text color="success" weight="medium">
										Video rendered successfully!
									</Text>
									<Link to="/video">
										<Button variant="secondary">View All Videos</Button>
									</Link>
								</Stack>
							)}

							{job.status === "failed" && (
								<Stack gap="sm">
									<Text color="error" size="sm">
										{job.errorMessage || "Render failed"}
									</Text>
									<Button variant="secondary" onClick={onRetry}>
										Try Again
									</Button>
								</Stack>
							)}
						</Stack>
					</Card>
				)}
			</Stack>
		</div>
	);
}
