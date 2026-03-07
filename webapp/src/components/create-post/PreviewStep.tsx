import { CheckCircle, Loader } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ThreadSegment } from "@/hooks/useSSEContentGenerate";
import { Accordion } from "@/proto-design-system/components/composite/Accordion";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { PageTransition } from "@/proto-design-system/components/layout/PageTransition";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import {
	Tab,
	TabList,
	TabPanel,
	TabPanels,
	Tabs,
} from "@/proto-design-system/components/navigation/Tabs/Tabs";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { MediaItem } from "@/types/media";
import { PLATFORM_DISPLAY_NAMES, type PlatformType } from "@/types/platform";
import styles from "./CreatePostWizard.module.scss";
import { PlatformPreviewCard } from "./PlatformPreviewCard";
import type {
	GenerationStatus,
	WizardContentType,
} from "./useCreatePostWizard";

interface PreviewStepProps {
	selectedPlatforms: PlatformType[];
	platformContent: Partial<Record<PlatformType, string>>;
	threadContent: Partial<Record<PlatformType, ThreadSegment[]>>;
	contentType: WizardContentType;
	generationProgress: Partial<Record<PlatformType, GenerationStatus>>;
	generating: boolean;
	generated: boolean;
	baseContent: string;
	ssePhase: "idle" | "describing" | "generating" | "adapting";
	uploadedMedia: MediaItem[];
	readOnly?: boolean;
	onUpdateContent: (platform: PlatformType, content: string) => void;
	onUpdateThreadSegment: (
		platform: PlatformType,
		index: number,
		content: string,
	) => void;
}

function BaseContentBody({
	content,
	isStreaming,
}: {
	content: string;
	isStreaming: boolean;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: content triggers scroll on new chunks
	useEffect(() => {
		if (isStreaming && scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [content, isStreaming]);

	return (
		<div ref={scrollRef} className={styles.baseContentBody}>
			{content}
			{isStreaming && <span className={styles.streamingCursor} />}
		</div>
	);
}

function BaseAccordion({
	content,
	isStreaming,
}: {
	content: string;
	isStreaming: boolean;
}) {
	const [expanded, setExpanded] = useState<string[]>(
		isStreaming ? ["base"] : [],
	);

	useEffect(() => {
		setExpanded(isStreaming ? ["base"] : []);
	}, [isStreaming]);

	if (!content) return null;

	return (
		<Accordion
			items={[
				{
					id: "base",
					title: isStreaming ? "Generating base content..." : "Base content",
					icon: isStreaming ? (
						<Loader size={16} className={styles.statusGenerating} />
					) : (
						<CheckCircle size={16} className={styles.statusDone} />
					),
					content: (
						<BaseContentBody content={content} isStreaming={isStreaming} />
					),
				},
			]}
			expanded={expanded}
			onExpandedChange={setExpanded}
		/>
	);
}

function AdaptingProgress({
	selectedPlatforms,
	generationProgress,
}: {
	selectedPlatforms: PlatformType[];
	generationProgress: Partial<Record<PlatformType, GenerationStatus>>;
}) {
	return (
		<Stack gap="sm">
			<Stack gap="xs" direction="row" align="center">
				<Spinner size="sm" />
				<Text size="sm" weight="medium" color="secondary">
					Adapting content for {selectedPlatforms.length} platform
					{selectedPlatforms.length !== 1 ? "s" : ""}...
				</Text>
			</Stack>
			<div className={styles.progressList}>
				{selectedPlatforms.map((platform) => {
					const status = generationProgress[platform] ?? "pending";
					return (
						<div key={platform} className={styles.progressRow}>
							{status === "done" ? (
								<CheckCircle size={16} className={styles.statusDone} />
							) : (
								<Spinner size="xs" />
							)}
							<Text size="sm" className={styles.progressPlatform}>
								{PLATFORM_DISPLAY_NAMES[platform]}
							</Text>
							<Badge
								variant={status === "done" ? "success" : "default"}
								size="sm"
							>
								{status === "done" ? "Done" : "Adapting"}
							</Badge>
						</div>
					);
				})}
			</div>
		</Stack>
	);
}

export function PreviewStep({
	selectedPlatforms,
	platformContent,
	threadContent,
	contentType,
	generationProgress,
	generating,
	generated,
	baseContent,
	ssePhase,
	uploadedMedia,
	readOnly = false,
	onUpdateContent,
	onUpdateThreadSegment,
}: PreviewStepProps) {
	const isThread = contentType === "thread";

	const hasContent = generating || generated;

	// Transition key for the section below the base accordion
	const belowKey = generating ? "adapting" : "review";

	// State 1: Not yet generated
	if (!hasContent) {
		return (
			<div className={styles.previewPanel}>
				<EmptyState
					title="Preview"
					description="Generate content to see platform-adapted previews here"
				/>
			</div>
		);
	}

	// States 2 & 3: Base accordion stays persistent, content below animates
	return (
		<div className={styles.previewPanel}>
			<Stack gap="md">
				{ssePhase === "describing" && (
					<Stack gap="xs" direction="row" align="center">
						<Spinner size="sm" />
						<Text size="sm" weight="medium" color="secondary">
							Analyzing images...
						</Text>
					</Stack>
				)}

				<PageTransition pageKey={belowKey} type="slideUp" duration={0.25}>
					{/* Adapting progress */}
					{generating && ssePhase === "adapting" && (
						<AdaptingProgress
							selectedPlatforms={selectedPlatforms}
							generationProgress={generationProgress}
						/>
					)}

					{/* Review content (preview only) */}
					{generated && (
						<Stack gap="md">
							<Text as="h3" size="lg" weight="medium">
								Review Content
							</Text>

							<BaseAccordion
								content={baseContent}
								isStreaming={ssePhase === "generating"}
							/>

							<Tabs defaultTab={selectedPlatforms[0]}>
								<TabList aria-label="Platform previews">
									{selectedPlatforms.map((platform) => (
										<Tab key={platform} id={platform}>
											{PLATFORM_DISPLAY_NAMES[platform]}
										</Tab>
									))}
								</TabList>
								<TabPanels>
									{selectedPlatforms.map((platform) => (
										<TabPanel key={platform} id={platform}>
											<div className={styles.tabPanelContent}>
												<PlatformPreviewCard
													platform={platform}
													content={platformContent[platform] ?? ""}
													threadSegments={threadContent[platform]}
													isThread={isThread}
													uploadedMedia={uploadedMedia}
													readOnly={readOnly}
													onContentChange={(content) =>
														onUpdateContent(platform, content)
													}
													onThreadSegmentChange={(index, content) =>
														onUpdateThreadSegment(platform, index, content)
													}
												/>
											</div>
										</TabPanel>
									))}
								</TabPanels>
							</Tabs>
						</Stack>
					)}
				</PageTransition>
			</Stack>
		</div>
	);
}
