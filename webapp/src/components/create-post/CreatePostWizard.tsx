import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { useGetPostDetails } from "@/hooks/useGetPostDetails";
import { usePublishPost } from "@/hooks/usePublishPost";
import { useSaveDraft } from "@/hooks/useSaveDraft";
import { useSchedulePost } from "@/hooks/useSchedulePost";
import {
	filesToBase64,
	useSSEContentGenerate,
} from "@/hooks/useSSEContentGenerate";
import { useUpdateDraft } from "@/hooks/useUpdateDraft";
import { useUploadMedia } from "@/hooks/useUploadMedia";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { PlatformType } from "@/types/platform";
import type { PlatformContentInput, PlatformPost } from "@/types/post";
import { ComposeStep } from "./ComposeStep";
import styles from "./CreatePostWizard.module.scss";
import { PreviewStep } from "./PreviewStep";
import type { WizardContentType, WizardState } from "./useCreatePostWizard";
import { useCreatePostWizard } from "./useCreatePostWizard";

interface CreatePostWizardProps {
	editPostId?: string;
}

function buildInitialOverrides(
	content: string,
	contentType: string,
	platformPosts: PlatformPost[],
): Partial<WizardState> {
	const selectedPlatforms = platformPosts.map(
		(pp) => pp.platform as PlatformType,
	);
	const platformContent: Partial<Record<PlatformType, string>> = {};
	const threadContent: Partial<
		Record<PlatformType, { content: string; imageIndex?: number }[]>
	> = {};

	for (const pp of platformPosts) {
		const platform = pp.platform as PlatformType;
		if (pp.content) {
			platformContent[platform] = pp.content;
		}
		if (pp.threadSegments && pp.threadSegments.length > 0) {
			threadContent[platform] = pp.threadSegments;
		}
	}

	return {
		blurb: content,
		contentType: (contentType === "thread"
			? "thread"
			: "text") as WizardContentType,
		selectedPlatforms,
		platformContent,
		threadContent,
		generated: selectedPlatforms.length > 0,
	};
}

export function CreatePostWizard({ editPostId }: CreatePostWizardProps = {}) {
	if (editPostId) {
		return <EditPostWizard editPostId={editPostId} />;
	}
	return <WizardInner />;
}

function EditPostWizard({ editPostId }: { editPostId: string }) {
	const { post, platformPosts, loading, error } = useGetPostDetails(editPostId);

	if (loading) return <Spinner />;
	if (error) return <Alert variant="error">{error}</Alert>;
	if (!post) return <Alert variant="error">Post not found</Alert>;

	const overrides = buildInitialOverrides(
		post.content,
		post.contentType,
		platformPosts,
	);

	const isPublishing =
		post.status === "publishing" ||
		post.status === "published" ||
		post.status === "partially_published";

	return (
		<WizardInner
			editPostId={editPostId}
			initialOverrides={overrides}
			initialBaseContent={post.baseContent}
			readOnly={isPublishing}
			platformPosts={isPublishing ? platformPosts : undefined}
		/>
	);
}

interface WizardInnerProps {
	editPostId?: string;
	initialOverrides?: Partial<WizardState>;
	initialBaseContent?: string;
	readOnly?: boolean;
	platformPosts?: PlatformPost[];
}

function WizardInner({
	editPostId,
	initialOverrides,
	initialBaseContent,
	readOnly = false,
	platformPosts,
}: WizardInnerProps = {}) {
	const isEditMode = Boolean(editPostId);
	const navigate = useNavigate();
	const wizard = useCreatePostWizard(initialOverrides);
	const { state } = wizard;

	const sse = useSSEContentGenerate();
	const { publishPost } = usePublishPost();
	const { saveDraft, loading: savingDraft } = useSaveDraft();
	const { updateDraft, loading: updatingDraft } = useUpdateDraft();
	const { schedulePost } = useSchedulePost();
	const { uploadMedia } = useUploadMedia();

	// Sync SSE platform completions into wizard state
	// biome-ignore lint/correctness/useExhaustiveDependencies: wizard callbacks are stable reducer dispatches
	useEffect(() => {
		for (const [platform, content] of Object.entries(sse.platformContent)) {
			if (content) {
				wizard.setPlatformContent(platform as PlatformType, content);
				wizard.setPlatformProgress(platform as PlatformType, "done");
			}
		}
	}, [sse.platformContent]);

	// When SSE phase changes, update platform progress accordingly
	// biome-ignore lint/correctness/useExhaustiveDependencies: wizard callbacks are stable reducer dispatches
	useEffect(() => {
		if (sse.phase === "describing" || sse.phase === "generating") {
			for (const platform of state.selectedPlatforms) {
				wizard.setPlatformProgress(platform, "generating");
			}
		} else if (sse.phase === "adapting") {
			for (const platform of state.selectedPlatforms) {
				if (state.generationProgress[platform] !== "done") {
					wizard.setPlatformProgress(platform, "generating");
				}
			}
		}
	}, [sse.phase, state.selectedPlatforms]);

	// Sync SSE thread completions into wizard state
	// biome-ignore lint/correctness/useExhaustiveDependencies: wizard callbacks are stable reducer dispatches
	useEffect(() => {
		for (const [platform, segments] of Object.entries(sse.threadContent)) {
			if (segments && segments.length > 0) {
				wizard.setThreadContent(platform as PlatformType, segments);
			}
		}
	}, [sse.threadContent]);

	// When SSE finishes, mark generation complete
	// biome-ignore lint/correctness/useExhaustiveDependencies: wizard callbacks are stable reducer dispatches
	useEffect(() => {
		if (
			!sse.loading &&
			sse.phase === "idle" &&
			Object.keys(sse.platformContent).length > 0
		) {
			wizard.generationComplete();
		}
	}, [sse.loading, sse.phase, sse.platformContent]);

	// Sync SSE errors to wizard
	// biome-ignore lint/correctness/useExhaustiveDependencies: wizard callbacks are stable reducer dispatches
	useEffect(() => {
		if (sse.error) {
			wizard.setError(sse.error);
			wizard.generationFailed();
		}
	}, [sse.error]);

	const handleGenerate = useCallback(() => {
		if (!state.blurb.trim()) {
			wizard.setError("Please write something to share.");
			return;
		}
		if (state.selectedPlatforms.length === 0) {
			wizard.setError("Select at least one platform.");
			return;
		}

		wizard.startGeneration();

		// Upload pending files + convert to base64 for AI, then start SSE generation
		const uploadAndGenerate = async () => {
			const validFiles = state.pendingFiles
				.filter((f) => !f.error)
				.map((f) => f.file);

			// S3 upload (for publishing) and base64 (for AI) run in parallel
			const [imagePayloads] = await Promise.all([
				validFiles.length > 0 ? filesToBase64(validFiles) : Promise.resolve([]),
				(async () => {
					for (const pendingFile of state.pendingFiles) {
						if (!pendingFile.error) {
							try {
								const media = await uploadMedia(pendingFile.file);
								wizard.addUploadedMedia(media);
							} catch {
								// continue with remaining files
							}
						}
					}
				})(),
			]);

			sse.generate(
				state.blurb,
				state.selectedPlatforms,
				state.contentType,
				imagePayloads.length > 0 ? imagePayloads : undefined,
			);
		};

		uploadAndGenerate();
	}, [
		state.blurb,
		state.selectedPlatforms,
		state.pendingFiles,
		state.contentType,
		wizard,
		sse,
		uploadMedia,
	]);

	const handlePublish = useCallback(async () => {
		wizard.setSubmitting(true);
		wizard.setError(null);

		try {
			const platforms: PlatformContentInput[] = state.selectedPlatforms.map(
				(platform) => {
					const entry: PlatformContentInput = {
						platform,
						content: state.platformContent[platform],
					};
					const segments = state.threadContent[platform];
					if (segments && segments.length > 0) {
						entry.thread_segments = segments;
					}
					return entry;
				},
			);

			const baseContentValue = sse.baseContent || initialBaseContent;
			const post = await saveDraft({
				content: state.blurb,
				content_type: state.contentType,
				ai_generated: state.generated,
				base_content: baseContentValue || undefined,
				media_ids:
					state.uploadedMedia.length > 0
						? state.uploadedMedia.map((m) => m.id)
						: undefined,
				platforms,
			});

			await publishPost(post.id, [...state.selectedPlatforms]);
			navigate({ to: "/posts" });
		} catch {
			wizard.setError("Failed to publish. Please try again.");
		} finally {
			wizard.setSubmitting(false);
		}
	}, [
		state.selectedPlatforms,
		state.platformContent,
		state.threadContent,
		state.blurb,
		state.contentType,
		state.generated,
		state.uploadedMedia,
		wizard,
		sse,
		initialBaseContent,
		saveDraft,
		publishPost,
		navigate,
	]);

	const handleSchedule = useCallback(async () => {
		if (!state.scheduledAt) {
			wizard.setError("Please select a date and time.");
			return;
		}

		wizard.setSubmitting(true);
		wizard.setError(null);

		try {
			const platforms: PlatformContentInput[] = state.selectedPlatforms.map(
				(platform) => {
					const entry: PlatformContentInput = {
						platform,
						content: state.platformContent[platform],
					};
					const segments = state.threadContent[platform];
					if (segments && segments.length > 0) {
						entry.thread_segments = segments;
					}
					return entry;
				},
			);

			const baseContentValue = sse.baseContent || initialBaseContent;
			const post = await saveDraft({
				content: state.blurb,
				content_type: state.contentType,
				ai_generated: state.generated,
				base_content: baseContentValue || undefined,
				media_ids:
					state.uploadedMedia.length > 0
						? state.uploadedMedia.map((m) => m.id)
						: undefined,
				platforms,
			});

			await schedulePost(post.id, state.scheduledAt);
			navigate({ to: "/posts" });
		} catch {
			wizard.setError("Failed to schedule. Please try again.");
		} finally {
			wizard.setSubmitting(false);
		}
	}, [
		state.scheduledAt,
		state.selectedPlatforms,
		state.platformContent,
		state.threadContent,
		state.blurb,
		state.contentType,
		state.generated,
		state.uploadedMedia,
		wizard,
		sse,
		initialBaseContent,
		saveDraft,
		schedulePost,
		navigate,
	]);

	const handleSaveDraft = useCallback(async () => {
		wizard.setSubmitting(true);
		wizard.setError(null);

		try {
			const platforms: PlatformContentInput[] = state.selectedPlatforms.map(
				(platform) => {
					const entry: PlatformContentInput = {
						platform,
						content: state.platformContent[platform],
					};
					const segments = state.threadContent[platform];
					if (segments && segments.length > 0) {
						entry.thread_segments = segments;
					}
					return entry;
				},
			);

			const baseContentValue = sse.baseContent || initialBaseContent;
			const draftData = {
				content: state.blurb,
				content_type: state.contentType,
				ai_generated: state.generated,
				base_content: baseContentValue || undefined,
				media_ids:
					state.uploadedMedia.length > 0
						? state.uploadedMedia.map((m) => m.id)
						: undefined,
				platforms,
			};

			if (isEditMode && editPostId) {
				await updateDraft(editPostId, draftData);
			} else {
				await saveDraft(draftData);
			}
			navigate({ to: "/posts" });
		} catch {
			wizard.setError("Failed to save draft. Please try again.");
		} finally {
			wizard.setSubmitting(false);
		}
	}, [
		state.selectedPlatforms,
		state.platformContent,
		state.threadContent,
		state.blurb,
		state.contentType,
		state.generated,
		state.uploadedMedia,
		wizard,
		sse,
		initialBaseContent,
		saveDraft,
		updateDraft,
		isEditMode,
		editPostId,
		navigate,
	]);

	return (
		<div className={styles.page}>
			<Stack gap="xs">
				<Text as="h1" size="2xl" weight="bold">
					{isEditMode ? "Edit Post" : "Create Post"}
				</Text>
				<Text color="secondary">
					{isEditMode
						? "Update your post content and platform adaptations"
						: "Write a blurb and let AI adapt it for each platform"}
				</Text>
			</Stack>

			{state.error && <Alert variant="error">{state.error}</Alert>}

			<div className={styles.twoColumn}>
				<ComposeStep
					blurb={state.blurb}
					contentType={state.contentType}
					selectedPlatforms={state.selectedPlatforms}
					platformContent={state.platformContent}
					pendingFiles={state.pendingFiles}
					generating={state.generating}
					generated={state.generated}
					publishMode={state.publishMode}
					scheduledAt={state.scheduledAt}
					submitting={state.submitting}
					savingDraft={savingDraft || updatingDraft}
					readOnly={readOnly}
					onBlurbChange={wizard.setBlurb}
					onContentTypeChange={wizard.setContentType}
					onTogglePlatform={wizard.togglePlatform}
					onFilesChange={wizard.setPendingFiles}
					onGenerate={handleGenerate}
					onSetPublishMode={wizard.setPublishMode}
					onSetScheduledAt={wizard.setScheduledAt}
					onPublish={handlePublish}
					onSchedule={handleSchedule}
					onSaveDraft={handleSaveDraft}
				/>
				<PreviewStep
					selectedPlatforms={state.selectedPlatforms}
					platformContent={state.platformContent}
					threadContent={state.threadContent}
					contentType={state.contentType}
					generationProgress={state.generationProgress}
					generating={state.generating}
					generated={state.generated}
					baseContent={sse.baseContent || initialBaseContent || ""}
					ssePhase={sse.phase}
					uploadedMedia={state.uploadedMedia}
					readOnly={readOnly}
					platformPosts={platformPosts}
					onUpdateContent={wizard.updatePlatformContent}
					onUpdateThreadSegment={wizard.updateThreadSegment}
				/>
			</div>
		</div>
	);
}
