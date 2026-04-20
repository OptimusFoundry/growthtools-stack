import { CheckCircle, Loader } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ThreadSegment } from "@/hooks/useSSEContentGenerate";
import { Accordion } from "@/proto-design-system/components/composite/Accordion";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { PageTransition } from "@/proto-design-system/components/layout/PageTransition";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { MediaItem } from "@/types/media";
import { PLATFORM_DISPLAY_NAMES, type PlatformType } from "@/types/platform";
import styles from "./CreatePostWizard.module.scss";
import { PlatformPreviewTabs } from "./PlatformPreviewTabs";
/* PlatformPreviewTabs owns the tab + card rendering; PreviewStep stays focused
 * on generation lifecycle (empty → streaming → adapting → review). */
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

/**
 * Renders the base content in an accordion panel.
 *
 * Lifecycle note: This component is rendered in two distinct JSX positions
 * (streaming phase and review phase). Because React reconciles by position,
 * each position gets an independent instance with its own expanded state.
 * The streaming instance auto-expands; the review instance defaults collapsed.
 * This is intentional — do not unify into a single conditional render without
 * verifying the accordion state reset behavior.
 */
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

				{/* Base content streaming — shown during generation only */}
				{baseContent && generating && (
					<BaseAccordion
						content={baseContent}
						isStreaming={ssePhase === "generating"}
					/>
				)}

				{/* Loading state before content starts streaming */}
				{generating && !baseContent && ssePhase !== "describing" && (
					<EmptyState
						title="Generating content"
						description="Your AI-adapted content will appear here shortly"
						icon={<Spinner size="lg" />}
					/>
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

							{baseContent && (
								<BaseAccordion
									content={baseContent}
									isStreaming={ssePhase === "generating"}
								/>
							)}

							<PlatformPreviewTabs
								selectedPlatforms={selectedPlatforms}
								platformContent={platformContent}
								threadContent={threadContent}
								contentType={contentType}
								uploadedMedia={uploadedMedia}
								readOnly={readOnly}
								onUpdateContent={onUpdateContent}
								onUpdateThreadSegment={onUpdateThreadSegment}
							/>
						</Stack>
					)}
				</PageTransition>
			</Stack>
		</div>
	);
}
