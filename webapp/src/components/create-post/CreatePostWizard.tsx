import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { useCreatePost } from "@/hooks/useCreatePost";
import { usePublishPost } from "@/hooks/usePublishPost";
import { useSchedulePost } from "@/hooks/useSchedulePost";
import {
	filesToBase64,
	useSSEContentGenerate,
} from "@/hooks/useSSEContentGenerate";
import { useUploadMedia } from "@/hooks/useUploadMedia";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { PlatformType } from "@/types/platform";
import { ComposeStep } from "./ComposeStep";
import styles from "./CreatePostWizard.module.scss";
import { PreviewStep } from "./PreviewStep";
import { useCreatePostWizard } from "./useCreatePostWizard";

export function CreatePostWizard() {
	const navigate = useNavigate();
	const wizard = useCreatePostWizard();
	const { state } = wizard;

	const sse = useSSEContentGenerate();
	const { createPost } = useCreatePost();
	const { publishPost } = usePublishPost();
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
	}, [sse.phase, state.selectedPlatforms, state.generationProgress]);

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
			const firstPlatform = state.selectedPlatforms[0];
			const content = state.platformContent[firstPlatform] ?? state.blurb;

			const post = await createPost({
				content,
				content_type: state.contentType,
				status: "draft",
				media_ids:
					state.uploadedMedia.length > 0
						? state.uploadedMedia.map((m) => m.id)
						: undefined,
				platforms: [...state.selectedPlatforms],
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
		state.blurb,
		state.contentType,
		state.uploadedMedia,
		wizard,
		createPost,
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
			const firstPlatform = state.selectedPlatforms[0];
			const content = state.platformContent[firstPlatform] ?? state.blurb;

			const post = await createPost({
				content,
				content_type: state.contentType,
				status: "draft",
				scheduled_at: state.scheduledAt,
				media_ids:
					state.uploadedMedia.length > 0
						? state.uploadedMedia.map((m) => m.id)
						: undefined,
				platforms: [...state.selectedPlatforms],
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
		state.blurb,
		state.contentType,
		state.uploadedMedia,
		wizard,
		createPost,
		schedulePost,
		navigate,
	]);

	return (
		<div className={styles.page}>
			<Stack gap="xs">
				<Text as="h1" size="2xl" weight="bold">
					Create Post
				</Text>
				<Text color="secondary">
					Write a blurb and let AI adapt it for each platform
				</Text>
			</Stack>

			{state.error && <Alert variant="error">{state.error}</Alert>}

			<div className={styles.twoColumn}>
				<ComposeStep
					blurb={state.blurb}
					contentType={state.contentType}
					selectedPlatforms={state.selectedPlatforms}
					pendingFiles={state.pendingFiles}
					generating={state.generating}
					generated={state.generated}
					onBlurbChange={wizard.setBlurb}
					onContentTypeChange={wizard.setContentType}
					onTogglePlatform={wizard.togglePlatform}
					onFilesChange={wizard.setPendingFiles}
					onGenerate={handleGenerate}
				/>
				<PreviewStep
					selectedPlatforms={state.selectedPlatforms}
					platformContent={state.platformContent}
					threadContent={state.threadContent}
					contentType={state.contentType}
					generationProgress={state.generationProgress}
					generating={state.generating}
					generated={state.generated}
					baseContent={sse.baseContent}
					ssePhase={sse.phase}
					publishMode={state.publishMode}
					scheduledAt={state.scheduledAt}
					submitting={state.submitting}
					uploadedMedia={state.uploadedMedia}
					onUpdateContent={wizard.updatePlatformContent}
					onUpdateThreadSegment={wizard.updateThreadSegment}
					onSetPublishMode={wizard.setPublishMode}
					onSetScheduledAt={wizard.setScheduledAt}
					onPublish={handlePublish}
					onSchedule={handleSchedule}
				/>
			</div>
		</div>
	);
}
