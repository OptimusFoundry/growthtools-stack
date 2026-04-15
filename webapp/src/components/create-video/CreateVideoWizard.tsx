import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCreateRenderJob } from "@/hooks/useCreateRenderJob";
import { useGenerateVideoConfig } from "@/hooks/useGenerateVideoConfig";
import { useGetVideoConfig } from "@/hooks/useGetVideoConfig";
import { useDebouncedConfigSave } from "@/hooks/useUpdateVideoConfig";
import { useVideoJobsForConfig } from "@/hooks/useVideoJobForConfig";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { StepIndicator } from "@/proto-design-system/components/navigation/StepIndicator";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { MediaItem } from "@/types/media";
import type {
	VideoAspectRatio,
	VideoConfig,
	VideoConfigData,
} from "@/types/video";
import { ComposeStep } from "./ComposeStep";
import styles from "./CreateVideoWizard.module.scss";
import { MediaPickerModal } from "./MediaPickerModal";
import { ConfigPanel, RendersPanel } from "./PreviewStep";
import { StylePicker } from "./StylePicker";
import { detectStyleFromPrompt } from "./styleDetection";
import { VideoChat } from "./VideoChat";

const STEPS = [
	{ id: "style", label: "Style", clickable: true },
	{ id: "compose", label: "Compose", clickable: true },
	{ id: "refine", label: "Refine", clickable: true },
];

interface CreateVideoWizardProps {
	editConfigId?: string;
}

export function CreateVideoWizard({ editConfigId }: CreateVideoWizardProps) {
	const isEditMode = Boolean(editConfigId);
	const [currentStep, setCurrentStep] = useState(isEditMode ? 2 : 0);
	const [title, setTitle] = useState("");
	const [prompt, setPrompt] = useState("");
	const [style, setStyle] = useState<string | null>(null);
	const [duration, setDuration] = useState<number | null>(null);
	const [config, setConfig] = useState<VideoConfig | null>(null);
	const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
	const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
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
	const { saveConfig } = useDebouncedConfigSave();

	useEffect(() => {
		if (loadedConfig && !initialized) {
			setTitle(loadedConfig.title);
			setPrompt(loadedConfig.prompt ?? "");
			setConfig(loadedConfig);
			setInitialized(true);
		}
	}, [loadedConfig, initialized]);

	const detectedStyle = useMemo(() => detectStyleFromPrompt(prompt), [prompt]);

	const handleStyleSelect = useCallback((selectedStyle: string) => {
		setStyle(selectedStyle);
		setCurrentStep(1);
	}, []);

	const handleGenerate = useCallback(async () => {
		if (!title.trim() || !prompt.trim()) return;
		try {
			const result = await generateConfig({
				title,
				prompt,
				style: style ?? detectedStyle ?? undefined,
				duration: duration ?? undefined,
				media_ids: selectedMedia.length > 0 ? selectedMedia.map((m) => m.id) : undefined,
			});
			setConfig(result);
			setCurrentStep(2);
		} catch {
			// error handled by hook
		}
	}, [title, prompt, style, detectedStyle, duration, selectedMedia, generateConfig]);

	const handleAddMedia = useCallback(() => {
		setMediaPickerOpen(true);
	}, []);

	const handleRemoveMedia = useCallback((id: string) => {
		setSelectedMedia((prev) => prev.filter((m) => m.id !== id));
	}, []);

	const handleMediaConfirm = useCallback((items: MediaItem[]) => {
		setSelectedMedia(items);
		setMediaPickerOpen(false);
	}, []);

	const handleConfigUpdate = useCallback(
		(updatedConfigData: VideoConfigData) => {
			if (!config) return;
			const newConfig = { ...config, config: updatedConfigData };
			setConfig(newConfig);
			saveConfig(config.id, updatedConfigData);
		},
		[config, saveConfig],
	);

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

	const handleStepClick = useCallback(
		(stepIndex: number) => {
			// Allow going back, or forward only if conditions met
			if (stepIndex < currentStep) {
				setCurrentStep(stepIndex);
			} else if (stepIndex === 1 && style) {
				setCurrentStep(1);
			} else if (stepIndex === 2 && config) {
				setCurrentStep(2);
			}
		},
		[currentStep, style, config],
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
			</Stack>

			<StepIndicator
				steps={STEPS}
				currentStep={currentStep}
				onStepClick={handleStepClick}
				size="sm"
			/>

			{/* Step 0: Style Selection */}
			{currentStep === 0 && (
				<div className={styles.styleStep}>
					<Text size="lg" weight="medium">
						Choose a visual style
					</Text>
					<Text color="secondary" size="sm">
						Pick a style that matches your brand or content mood
					</Text>
					<StylePicker
						selectedStyle={style}
						onStyleChange={handleStyleSelect}
					/>
				</div>
			)}

			{/* Step 1: Compose */}
			{currentStep === 1 && (
				<div className={styles.composeStep}>
					<ComposeStep
						title={title}
						prompt={prompt}
						duration={duration}
						generating={generating}
						configExists={config !== null}
						generateError={generateError}
						selectedMedia={selectedMedia}
						onTitleChange={setTitle}
						onPromptChange={setPrompt}
						onDurationChange={setDuration}
						onAddMedia={handleAddMedia}
						onRemoveMedia={handleRemoveMedia}
						onGenerate={handleGenerate}
					/>
				</div>
			)}

			{/* Step 2: Chat + Preview */}
			{currentStep === 2 && config && (
				<>
					<div className={styles.refineLayout}>
						<Card className={styles.chatPanel}>
							<VideoChat
								configId={config.id}
								onConfigUpdate={handleConfigUpdate}
							/>
						</Card>
						<div className={styles.previewPanel}>
							<ConfigPanel config={config} generating={generating} />
						</div>
					</div>

					<RendersPanel
						config={config}
						jobs={jobs}
						rendering={rendering}
						renderError={renderError}
						onRender={handleRender}
					/>
				</>
			)}

			<MediaPickerModal
				isOpen={mediaPickerOpen}
				onClose={() => setMediaPickerOpen(false)}
				selectedIds={new Set(selectedMedia.map((m) => m.id))}
				onConfirm={handleMediaConfirm}
			/>
		</div>
	);
}
