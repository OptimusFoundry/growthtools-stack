import { CheckCircle, Loader } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ThreadSegment } from "@/hooks/useSSEContentGenerate";
import { Accordion } from "@/proto-design-system/components/composite/Accordion";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Divider } from "@/proto-design-system/components/layout/Divider";
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
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { MediaItem } from "@/types/media";
import { PLATFORM_DISPLAY_NAMES, type PlatformType } from "@/types/platform";
import styles from "./CreatePostWizard.module.scss";
import { PlatformPreviewCard } from "./PlatformPreviewCard";
import type {
	GenerationStatus,
	PublishMode,
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
	publishMode: PublishMode;
	scheduledAt: string;
	submitting: boolean;
	uploadedMedia: MediaItem[];
	onUpdateContent: (platform: PlatformType, content: string) => void;
	onUpdateThreadSegment: (
		platform: PlatformType,
		index: number,
		content: string,
	) => void;
	onSetPublishMode: (mode: PublishMode) => void;
	onSetScheduledAt: (scheduledAt: string) => void;
	onPublish: () => void;
	onSchedule: () => void;
	onSaveDraft: () => void;
	savingDraft: boolean;
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
	publishMode,
	scheduledAt,
	submitting,
	uploadedMedia,
	onUpdateContent,
	onUpdateThreadSegment,
	onSetPublishMode,
	onSetScheduledAt,
	onPublish,
	onSchedule,
	onSaveDraft,
	savingDraft,
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

				<BaseAccordion
					content={baseContent}
					isStreaming={ssePhase === "generating"}
				/>

				<PageTransition pageKey={belowKey} type="slideUp" duration={0.25}>
					{/* Adapting progress */}
					{generating && ssePhase === "adapting" && (
						<AdaptingProgress
							selectedPlatforms={selectedPlatforms}
							generationProgress={generationProgress}
						/>
					)}

					{/* Review + publish */}
					{generated && (
						<Stack gap="md">
							<Text as="h3" size="lg" weight="medium">
								Review Content
							</Text>

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

							<Divider />

							<div className={styles.publishOptions}>
								<label
									className={`${styles.publishOption} ${publishMode === "now" ? styles.publishOptionActive : ""}`}
								>
									<input
										type="radio"
										name="publishMode"
										value="now"
										checked={publishMode === "now"}
										onChange={() => onSetPublishMode("now")}
										disabled={submitting}
									/>
									<div className={styles.publishOptionContent}>
										<Text size="sm" weight="medium">
											Send immediately
										</Text>
										<Text size="xs" color="muted">
											Publish to all selected platforms right now
										</Text>
									</div>
								</label>
								<label
									className={`${styles.publishOption} ${publishMode === "schedule" ? styles.publishOptionActive : ""}`}
								>
									<input
										type="radio"
										name="publishMode"
										value="schedule"
										checked={publishMode === "schedule"}
										onChange={() => onSetPublishMode("schedule")}
										disabled={submitting}
									/>
									<div className={styles.publishOptionContent}>
										<Text size="sm" weight="medium">
											Schedule for later
										</Text>
										<Text size="xs" color="muted">
											Choose a date and time
										</Text>
									</div>
								</label>
							</div>

							{publishMode === "schedule" && (
								<TextField
									type="datetime-local"
									label="Date & Time"
									value={scheduledAt}
									onChange={(e) => onSetScheduledAt(e.target.value)}
								/>
							)}

							<Stack gap="sm">
								{publishMode === "now" && (
									<Button
										variant="primary"
										onClick={onPublish}
										isLoading={submitting}
										disabled={submitting}
									>
										Publish to {selectedPlatforms.length} Platform
										{selectedPlatforms.length !== 1 ? "s" : ""}
									</Button>
								)}
								{publishMode === "schedule" && scheduledAt && (
									<Button
										variant="primary"
										onClick={onSchedule}
										isLoading={submitting}
										disabled={submitting}
									>
										Schedule Post
									</Button>
								)}
								{!publishMode && (
									<Text size="sm" color="secondary">
										Choose how you want to publish above
									</Text>
								)}
								<Button
									variant="ghost"
									onClick={onSaveDraft}
									isLoading={savingDraft}
									disabled={savingDraft || submitting}
								>
									Save as Draft
								</Button>
							</Stack>
						</Stack>
					)}
				</PageTransition>
			</Stack>
		</div>
	);
}
