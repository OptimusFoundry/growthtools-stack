import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { useCreateRenderJob } from "@/hooks/useCreateRenderJob";
import { useGenerateVideoConfig } from "@/hooks/useGenerateVideoConfig";
import { useVideoJob } from "@/hooks/useVideoJob";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import type { VideoAspectRatio, VideoConfig } from "@/types/video";
import styles from "./page.module.scss";

export const Route = createFileRoute("/video_/new")({
	component: NewVideoPage,
});

type WizardStep = "content" | "preview" | "render";

const ASPECT_RATIO_OPTIONS: { value: VideoAspectRatio; label: string }[] = [
	{ value: "9:16", label: "9:16 (Vertical)" },
	{ value: "1:1", label: "1:1 (Square)" },
	{ value: "16:9", label: "16:9 (Landscape)" },
];

function NewVideoPage() {
	const [step, setStep] = useState<WizardStep>("content");
	const [title, setTitle] = useState("");
	const [prompt, setPrompt] = useState("");
	const [config, setConfig] = useState<VideoConfig | null>(null);
	const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("9:16");
	const [activeJobId, setActiveJobId] = useState<string | null>(null);

	const {
		generateConfig,
		loading: generating,
		error: generateError,
	} = useGenerateVideoConfig();
	const {
		createRenderJob,
		loading: rendering,
		error: renderError,
	} = useCreateRenderJob();
	const { job } = useVideoJob(activeJobId);

	const handleGenerate = useCallback(async () => {
		if (!title.trim() || !prompt.trim()) return;
		try {
			const result = await generateConfig({ title, prompt });
			setConfig(result);
			setStep("preview");
		} catch {
			// error handled by hook
		}
	}, [title, prompt, generateConfig]);

	const handleRender = useCallback(async () => {
		if (!config) return;
		try {
			const result = await createRenderJob(config.id, aspectRatio);
			setActiveJobId(result.id);
			setStep("render");
		} catch {
			// error handled by hook
		}
	}, [config, aspectRatio, createRenderJob]);

	const scenes = config?.config
		? ((config.config as Record<string, unknown>).scenes as
				| Array<{
						id: string;
						text: string;
						subtext?: string;
						duration_frames: number;
				  }>
				| undefined) ?? []
		: [];

	const theme = config?.config
		? ((config.config as Record<string, unknown>).theme as
				| {
						background_colors?: string[];
						text_color?: string;
						accent_color?: string;
				  }
				| undefined)
		: undefined;

	return (
		<motion.div
			className={styles.page}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.6 }}
		>
			<Stack direction="row" justify="between" align="center">
				<div className={styles.pageHeader}>
					<Stack direction="row" gap="sm" align="center">
						<Link to="/video">
							<Button variant="ghost" size="sm">
								<ArrowLeft size={16} />
							</Button>
						</Link>
						<h1 className={styles.pageTitle}>Create Video</h1>
					</Stack>
					<p className={styles.pageDescription}>
						Generate an AI-powered video from your content
					</p>
				</div>
			</Stack>

			{/* Step indicator */}
			<Stack direction="row" gap="sm">
				<Badge variant={step === "content" ? "primary" : "default"}>
					1. Content
				</Badge>
				<Badge variant={step === "preview" ? "primary" : "default"}>
					2. Preview
				</Badge>
				<Badge variant={step === "render" ? "primary" : "default"}>
					3. Render
				</Badge>
			</Stack>

			<div className={styles.pageContent}>
				{/* Step 1: Content Input */}
				{step === "content" && (
					<Card padding="md">
						<Stack gap="md">
							<Text as="h2" size="lg" weight="medium">
								What should your video be about?
							</Text>
							<TextField
								label="Title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="e.g. Product Launch Announcement"
							/>
							<TextArea
								label="Content / Prompt"
								value={prompt}
								onChange={(e) => setPrompt(e.target.value)}
								placeholder="Describe your video content or paste text from an existing post..."
								rows={6}
							/>
							{generateError && (
								<Text color="error" size="sm">
									{generateError}
								</Text>
							)}
							<Stack direction="row" justify="end">
								<Button
									variant="primary"
									onClick={handleGenerate}
									disabled={generating || !title.trim() || !prompt.trim()}
									isLoading={generating}
								>
									Generate Config
									<ArrowRight size={16} />
								</Button>
							</Stack>
						</Stack>
					</Card>
				)}

				{/* Step 2: Config Preview */}
				{step === "preview" && config && (
					<Stack gap="sm">
						<Card padding="md">
							<Stack gap="sm">
								<Text as="h2" size="lg" weight="medium">
									Video Configuration
								</Text>
								<Text size="sm" color="secondary">
									{config.template} &middot; {scenes.length} scenes
								</Text>
								{theme && (
									<Stack direction="row" gap="sm" align="center">
										<Text size="sm" weight="medium">
											Theme:
										</Text>
										{theme.background_colors?.map((color) => (
											<div
												key={color}
												style={{
													width: 24,
													height: 24,
													borderRadius: "var(--radius-sm)",
													backgroundColor: color,
													border: "1px solid var(--color-border)",
												}}
											/>
										))}
									</Stack>
								)}
							</Stack>
						</Card>

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

						<Stack direction="row" justify="between">
							<Button variant="ghost" onClick={() => setStep("content")}>
								<ArrowLeft size={16} /> Back
							</Button>
							<Button variant="primary" onClick={() => setStep("render")}>
								Continue to Render <ArrowRight size={16} />
							</Button>
						</Stack>
					</Stack>
				)}

				{/* Step 3: Render */}
				{step === "render" && (
					<Card padding="md">
						<Stack gap="md">
							<Text as="h2" size="lg" weight="medium">
								Render Video
							</Text>

							{!activeJobId && (
								<>
									<Stack gap="sm">
										<Text size="sm" weight="medium">
											Aspect Ratio
										</Text>
										<Stack direction="row" gap="sm">
											{ASPECT_RATIO_OPTIONS.map((option) => (
												<Button
													key={option.value}
													variant={
														aspectRatio === option.value
															? "primary"
															: "secondary"
													}
													size="sm"
													onClick={() => setAspectRatio(option.value)}
												>
													{option.label}
												</Button>
											))}
										</Stack>
									</Stack>

									{renderError && (
										<Text color="error" size="sm">
											{renderError}
										</Text>
									)}

									<Stack direction="row" justify="between">
										<Button
											variant="ghost"
											onClick={() => setStep("preview")}
										>
											<ArrowLeft size={16} /> Back
										</Button>
										<Button
											variant="primary"
											onClick={handleRender}
											disabled={rendering}
											isLoading={rendering}
										>
											<Play size={16} /> Start Render
										</Button>
									</Stack>
								</>
							)}

							{activeJobId && job && (
								<Stack gap="sm">
									<Stack direction="row" gap="sm" align="center">
										<Text weight="medium">Status:</Text>
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
										<Stack gap="sm">
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
											<Button
												variant="secondary"
												onClick={() => setActiveJobId(null)}
											>
												Try Again
											</Button>
										</Stack>
									)}
								</Stack>
							)}
						</Stack>
					</Card>
				)}
			</div>
		</motion.div>
	);
}
