import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useCreateRenderJob } from "@/hooks/useCreateRenderJob";
import { useGenerateVideoConfig } from "@/hooks/useGenerateVideoConfig";
import { useGetVideoConfig } from "@/hooks/useGetVideoConfig";
import { useVideoJobsForConfig } from "@/hooks/useVideoJobForConfig";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { VideoAspectRatio, VideoConfig } from "@/types/video";
import { ComposeStep } from "./ComposeStep";
import styles from "./CreateVideoWizard.module.scss";
import { ConfigPanel, RendersPanel } from "./PreviewStep";

interface CreateVideoWizardProps {
	editConfigId?: string;
}

export function CreateVideoWizard({ editConfigId }: CreateVideoWizardProps) {
	const isEditMode = Boolean(editConfigId);
	const [title, setTitle] = useState("");
	const [prompt, setPrompt] = useState("");
	const [config, setConfig] = useState<VideoConfig | null>(null);
	const [initialized, setInitialized] = useState(!isEditMode);

	const {
		config: loadedConfig,
		loading: loadingConfig,
		error: loadError,
	} = useGetVideoConfig(editConfigId);

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

	const { jobs, startPolling } = useVideoJobsForConfig(config?.id);

	useEffect(() => {
		if (loadedConfig && !initialized) {
			setTitle(loadedConfig.title);
			setPrompt(loadedConfig.prompt ?? "");
			setConfig(loadedConfig);
			setInitialized(true);
		}
	}, [loadedConfig, initialized]);

	const handleGenerate = useCallback(async () => {
		if (!title.trim() || !prompt.trim()) return;
		try {
			const result = await generateConfig({ title, prompt });
			setConfig(result);
		} catch {
			// error handled by hook
		}
	}, [title, prompt, generateConfig]);

	const handleRender = useCallback(
		async (ratio: VideoAspectRatio) => {
			if (!config) return;
			try {
				await createRenderJob(config.id, ratio);
				startPolling();
			} catch {
				// error handled by hook
			}
		},
		[config, createRenderJob, startPolling],
	);

	if (isEditMode && loadingConfig) {
		return (
			<div className={styles.page}>
				<Spinner />
			</div>
		);
	}

	if (isEditMode && loadError) {
		return (
			<div className={styles.page}>
				<Text color="error">{loadError}</Text>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<Stack gap="xs">
				<Stack direction="row" gap="sm" align="center">
					<Link to="/video">
						<Button variant="ghost" size="sm">
							<ArrowLeft size={16} />
						</Button>
					</Link>
					<Text as="h1" size="2xl" weight="bold">
						{isEditMode ? "Edit Video" : "Create Video"}
					</Text>
				</Stack>
				<Text color="secondary">
					{isEditMode
						? "Edit your video configuration and re-render"
						: "Generate an AI-powered video from your content"}
				</Text>
			</Stack>

			{/* Top row: compose + config side by side */}
			<div className={styles.topRow}>
				<ComposeStep
					title={title}
					prompt={prompt}
					generating={generating}
					configExists={config !== null}
					generateError={generateError}
					onTitleChange={setTitle}
					onPromptChange={setPrompt}
					onGenerate={handleGenerate}
				/>
				<ConfigPanel config={config} generating={generating} />
			</div>

			{/* Bottom row: renders full width */}
			<Divider />
			<RendersPanel
				config={config}
				jobs={jobs}
				rendering={rendering}
				renderError={renderError}
				onRender={handleRender}
			/>
		</div>
	);
}
