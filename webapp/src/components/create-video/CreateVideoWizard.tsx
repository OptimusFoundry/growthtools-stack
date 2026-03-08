import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCallback, useState } from "react";
import { useCreateRenderJob } from "@/hooks/useCreateRenderJob";
import { useGenerateVideoConfig } from "@/hooks/useGenerateVideoConfig";
import { useVideoJob } from "@/hooks/useVideoJob";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { VideoAspectRatio, VideoConfig } from "@/types/video";
import { ComposeStep } from "./ComposeStep";
import styles from "./CreateVideoWizard.module.scss";
import { PreviewStep } from "./PreviewStep";

export function CreateVideoWizard() {
	const [title, setTitle] = useState("");
	const [prompt, setPrompt] = useState("");
	const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("9:16");
	const [config, setConfig] = useState<VideoConfig | null>(null);
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
			setActiveJobId(null);
		} catch {
			// error handled by hook
		}
	}, [title, prompt, generateConfig]);

	const handleRender = useCallback(async () => {
		if (!config) return;
		try {
			const result = await createRenderJob(config.id, aspectRatio);
			setActiveJobId(result.id);
		} catch {
			// error handled by hook
		}
	}, [config, aspectRatio, createRenderJob]);

	const handleRetry = useCallback(() => {
		setActiveJobId(null);
	}, []);

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
						Create Video
					</Text>
				</Stack>
				<Text color="secondary">
					Generate an AI-powered video from your content
				</Text>
			</Stack>

			<div className={styles.twoColumn}>
				<ComposeStep
					title={title}
					prompt={prompt}
					aspectRatio={aspectRatio}
					generating={generating}
					configExists={config !== null}
					rendering={rendering}
					activeJobId={activeJobId}
					generateError={generateError}
					renderError={renderError}
					onTitleChange={setTitle}
					onPromptChange={setPrompt}
					onAspectRatioChange={setAspectRatio}
					onGenerate={handleGenerate}
					onRender={handleRender}
				/>
				<PreviewStep
					config={config}
					generating={generating}
					job={job}
					onRetry={handleRetry}
				/>
			</div>
		</div>
	);
}
