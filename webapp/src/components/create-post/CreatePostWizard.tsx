import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { useAdaptContent } from "@/hooks/useAdaptContent";
import { useCreatePost } from "@/hooks/useCreatePost";
import { useGenerateContent } from "@/hooks/useGenerateContent";
import { useGenerateThread } from "@/hooks/useGenerateThread";
import { usePublishPost } from "@/hooks/usePublishPost";
import { useSchedulePost } from "@/hooks/useSchedulePost";
import { useUploadMedia } from "@/hooks/useUploadMedia";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { PLATFORM_SUPPORTS_THREADS, type PlatformType } from "@/types/platform";
import { ComposeStep } from "./ComposeStep";
import styles from "./CreatePostWizard.module.scss";
import { PreviewStep } from "./PreviewStep";
import { useCreatePostWizard } from "./useCreatePostWizard";

export function CreatePostWizard() {
	const navigate = useNavigate();
	const wizard = useCreatePostWizard();
	const { state } = wizard;

	const { generateContent } = useGenerateContent();
	const { adaptContent } = useAdaptContent();
	const { generateThread } = useGenerateThread();
	const { createPost } = useCreatePost();
	const { publishPost } = usePublishPost();
	const { schedulePost } = useSchedulePost();
	const { uploadMedia } = useUploadMedia();

	const runGeneration = useCallback(
		async (platforms?: PlatformType[]) => {
			const targetPlatforms = platforms ?? state.selectedPlatforms;
			wizard.startGeneration();

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

			try {
				const baseResult = await generateContent(state.blurb, targetPlatforms);
				const baseContent = baseResult.content;

				const adaptPromises = targetPlatforms.map(async (platform) => {
					wizard.setPlatformProgress(platform, "generating");
					try {
						const adapted = await adaptContent(baseContent, platform);
						wizard.setPlatformContent(platform, adapted.content);

						if (
							state.contentType === "thread" &&
							PLATFORM_SUPPORTS_THREADS[platform]
						) {
							const threadResult = await generateThread(baseContent, platform);
							wizard.setThreadContent(platform, threadResult.thread);
						}

						wizard.setPlatformProgress(platform, "done");
					} catch {
						wizard.setPlatformProgress(platform, "error");
					}
				});

				await Promise.allSettled(adaptPromises);
				wizard.generationComplete();
			} catch {
				wizard.setError("Failed to generate base content. Please try again.");
				for (const p of targetPlatforms) {
					wizard.setPlatformProgress(p, "error");
				}
				wizard.generationFailed();
			}
		},
		[
			state.selectedPlatforms,
			state.pendingFiles,
			state.blurb,
			state.contentType,
			wizard,
			generateContent,
			adaptContent,
			generateThread,
			uploadMedia,
		],
	);

	const handleGenerate = useCallback(() => {
		if (!state.blurb.trim()) {
			wizard.setError("Please write something to share.");
			return;
		}
		if (state.selectedPlatforms.length === 0) {
			wizard.setError("Select at least one platform.");
			return;
		}
		runGeneration();
	}, [state.blurb, state.selectedPlatforms, wizard, runGeneration]);

	const handleRetryFailed = useCallback(() => {
		const failedPlatforms = state.selectedPlatforms.filter(
			(p) => state.generationProgress[p] === "error",
		);
		if (failedPlatforms.length > 0) {
			runGeneration(failedPlatforms);
		}
	}, [state.selectedPlatforms, state.generationProgress, runGeneration]);

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
					publishMode={state.publishMode}
					scheduledAt={state.scheduledAt}
					submitting={state.submitting}
					onUpdateContent={wizard.updatePlatformContent}
					onUpdateThreadSegment={wizard.updateThreadSegment}
					onSetPublishMode={wizard.setPublishMode}
					onSetScheduledAt={wizard.setScheduledAt}
					onPublish={handlePublish}
					onSchedule={handleSchedule}
					onRetryFailed={handleRetryFailed}
				/>
			</div>
		</div>
	);
}
