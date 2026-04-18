import { useNavigate } from "@tanstack/react-router";
import { PenSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useGetPostDetails } from "@/hooks/useGetPostDetails";
import { usePublishPost } from "@/hooks/usePublishPost";
import { useSaveDraft } from "@/hooks/useSaveDraft";
import { useSchedulePost } from "@/hooks/useSchedulePost";
import {
	filesToBase64,
	useSSEContentGenerate,
} from "@/hooks/useSSEContentGenerate";
import { useUnlinkMedia } from "@/hooks/useUnlinkMedia";
import { useUpdateDraft } from "@/hooks/useUpdateDraft";
import { useUploadMedia } from "@/hooks/useUploadMedia";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { useBannerCenter } from "@/proto-design-system/components/feedback/BannerCenter";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Breadcrumb } from "@/proto-design-system/components/navigation/Breadcrumb";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { MediaItem } from "@/types/media";
import type { PlatformType } from "@/types/platform";
import type { PlatformContentInput, PlatformPost } from "@/types/post";
import { ComposeStep } from "./ComposeStep";
import styles from "./CreatePostWizard.module.scss";
import { PostPublishStatus } from "./PostPublishStatus";
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
	media: MediaItem[],
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
		uploadedMedia: media,
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
	const { post, platformPosts, media, loading, error } =
		useGetPostDetails(editPostId);

	if (loading) return <Spinner />;
	if (error) return <Alert variant="error">{error}</Alert>;
	if (!post) return <Alert variant="error">Post not found</Alert>;

	const overrides = buildInitialOverrides(
		post.content,
		post.contentType,
		platformPosts,
		media,
	);

	const hasBeenPublished =
		post.status === "publishing" ||
		post.status === "published" ||
		post.status === "partially_published" ||
		post.status === "failed";

	return (
		<WizardInner
			editPostId={editPostId}
			initialOverrides={overrides}
			initialBaseContent={post.baseContent}
			readOnly={hasBeenPublished}
			platformPosts={hasBeenPublished ? platformPosts : undefined}
			postStatus={post.status}
		/>
	);
}

interface WizardInnerProps {
	editPostId?: string;
	initialOverrides?: Partial<WizardState>;
	initialBaseContent?: string;
	readOnly?: boolean;
	platformPosts?: PlatformPost[];
	postStatus?: string;
}

function WizardInner({
	editPostId,
	initialOverrides,
	initialBaseContent,
	readOnly = false,
	platformPosts,
	postStatus,
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
	const { unlinkMedia } = useUnlinkMedia();
	const { addBanner } = useBannerCenter();

	// Removing a media item from an already-persisted post must unlink it
	// server-side first; otherwise Save Draft and Publish would still see
	// the original media_ids array. For unsaved drafts there's no post row
	// yet, so the removal is local-only.
	const handleRemoveUploadedMedia = useCallback(
		async (mediaID: string) => {
			if (editPostId) {
				try {
					await unlinkMedia(editPostId, mediaID);
				} catch (err) {
					wizard.setError(
						err instanceof Error
							? err.message
							: "Failed to remove media from post",
					);
					return;
				}
			}
			wizard.removeUploadedMedia(mediaID);
		},
		[editPostId, unlinkMedia, wizard.setError, wizard.removeUploadedMedia],
	);

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

			// S3 upload (for publishing) and base64 (for AI) run in parallel.
			// We only need base64 for the fresh-compose path (no uploaded media yet).
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

			// Media-aware path: when the post already has persisted media (edit-post
			// draft or github-capture draft), send their IDs so the backend fetches
			// them from S3 and runs the media-aware pipeline.  Do NOT also send the
			// base64 blobs — the backend prefers media_ids and they would be wasted
			// bytes.  Any newly-dropped pending files are uploaded above (so they'll
			// be present in the next Save Draft call), but we skip them here because
			// the server-side IDs are authoritative for AI generation.
			const uploadedMediaIDs =
				state.uploadedMedia.length > 0
					? state.uploadedMedia.map((m) => m.id)
					: undefined;

			sse.generate(
				state.blurb,
				state.selectedPlatforms,
				state.contentType,
				// Pass base64 images only for fresh-compose (no persisted media).
				uploadedMediaIDs
					? undefined
					: imagePayloads.length > 0
						? imagePayloads
						: undefined,
				state.contentType === "thread" ? state.maxThreadParts : undefined,
				uploadedMediaIDs,
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

	// Persist the wizard's current state as a draft and return the post id
	// we should act on. In edit mode we update the draft the user opened —
	// doing this any other way creates a brand-new row and leaves the
	// original draft orphaned (see the github-draft "published as new
	// post" regression). In create mode we POST a fresh draft.
	const persistDraft = useCallback(async (): Promise<string> => {
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
			return editPostId;
		}
		const created = await saveDraft(draftData);
		return created.id;
	}, [
		state.selectedPlatforms,
		state.platformContent,
		state.threadContent,
		state.blurb,
		state.contentType,
		state.generated,
		state.uploadedMedia,
		sse,
		initialBaseContent,
		isEditMode,
		editPostId,
		saveDraft,
		updateDraft,
	]);

	const handlePublish = useCallback(async () => {
		wizard.setSubmitting(true);
		wizard.setError(null);

		try {
			const postId = await persistDraft();
			await publishPost(postId, [...state.selectedPlatforms]);
			addBanner({
				type: "success",
				title: "Post published",
				description: "We're pushing it out to your selected platforms.",
				dismissible: true,
			});
			navigate({ to: "/posts" });
		} catch {
			addBanner({
				type: "error",
				title: "Couldn't publish post",
				description: "Please try again.",
				dismissible: true,
			});
		} finally {
			wizard.setSubmitting(false);
		}
	}, [
		state.selectedPlatforms,
		wizard,
		persistDraft,
		publishPost,
		navigate,
		addBanner,
	]);

	const handleSchedule = useCallback(async () => {
		if (!state.scheduledAt) {
			wizard.setError("Please select a date and time.");
			return;
		}

		wizard.setSubmitting(true);
		wizard.setError(null);

		try {
			const postId = await persistDraft();
			await schedulePost(postId, state.scheduledAt);
			addBanner({
				type: "success",
				title: "Post scheduled",
				description: `It'll go out on ${new Date(state.scheduledAt).toLocaleString()}.`,
				dismissible: true,
			});
			navigate({ to: "/posts" });
		} catch {
			addBanner({
				type: "error",
				title: "Couldn't schedule post",
				description: "Please try again.",
				dismissible: true,
			});
		} finally {
			wizard.setSubmitting(false);
		}
	}, [
		state.scheduledAt,
		wizard,
		persistDraft,
		schedulePost,
		navigate,
		addBanner,
	]);

	const handleSaveDraft = useCallback(async () => {
		wizard.setSubmitting(true);
		wizard.setError(null);

		try {
			await persistDraft();
			addBanner({
				type: "success",
				title: isEditMode ? "Draft updated" : "Draft saved",
				dismissible: true,
			});
			navigate({ to: "/posts" });
		} catch {
			addBanner({
				type: "error",
				title: "Couldn't save draft",
				description: "Please try again.",
				dismissible: true,
			});
		} finally {
			wizard.setSubmitting(false);
		}
	}, [wizard, persistDraft, isEditMode, navigate, addBanner]);

	const [retrying, setRetrying] = useState(false);
	const hasFailed =
		postStatus === "failed" || postStatus === "partially_published";

	const handleRetry = useCallback(async () => {
		if (!editPostId) return;
		setRetrying(true);
		try {
			const url = `${import.meta.env.VITE_API_URL}/api/protected/posts/${editPostId}/retry`;
			await fetch(url, { method: "POST", credentials: "include" });
			addBanner({
				type: "success",
				title: "Retrying failed platforms",
				dismissible: true,
			});
			navigate({ to: "/posts" });
		} catch {
			addBanner({
				type: "error",
				title: "Couldn't retry post",
				description: "Please try again.",
				dismissible: true,
			});
		} finally {
			setRetrying(false);
		}
	}, [editPostId, navigate, addBanner]);

	return (
		<div className={styles.page}>
			<Breadcrumb
				size="lg"
				items={[
					{ label: "Posts", href: "/posts", icon: <PenSquare size={18} /> },
					{
						label: !isEditMode
							? "New Post"
							: postStatus === "draft"
								? "Edit Post"
								: "Post Details",
					},
				]}
			/>
			<Divider />
			<Stack gap="xs">
				<Text as="h1" size="xl" weight="semibold">
					{!isEditMode
						? "Create Post"
						: postStatus === "draft"
							? "Edit Post"
							: "Post Details"}
				</Text>
				<Text size="sm" color="secondary">
					{!isEditMode
						? "Write a blurb and let AI adapt it for each platform"
						: postStatus === "draft"
							? "Update your post content and platform adaptations"
							: "View your published post and platform statuses"}
				</Text>
			</Stack>

			{state.error && <Alert variant="error">{state.error}</Alert>}

			<div className={styles.twoColumn}>
				<Stack gap="lg">
					<ComposeStep
						blurb={state.blurb}
						contentType={state.contentType}
						selectedPlatforms={state.selectedPlatforms}
						platformContent={state.platformContent}
						pendingFiles={state.pendingFiles}
						existingMedia={state.uploadedMedia.map((m) => ({
							id: m.id,
							name: m.filename,
							size: m.sizeBytes,
							contentType: m.contentType,
							url: m.url,
						}))}
						onRemoveExistingMedia={handleRemoveUploadedMedia}
						mediaChanged={state.mediaChangedSinceGeneration}
						generating={state.generating}
						generated={state.generated}
						publishMode={state.publishMode}
						scheduledAt={state.scheduledAt}
						submitting={state.submitting}
						savingDraft={savingDraft || updatingDraft}
						readOnly={readOnly}
						onBlurbChange={wizard.setBlurb}
						maxThreadParts={state.maxThreadParts}
						onContentTypeChange={wizard.setContentType}
						onMaxThreadPartsChange={wizard.setMaxThreadParts}
						onTogglePlatform={wizard.togglePlatform}
						onFilesChange={wizard.setPendingFiles}
						onGenerate={handleGenerate}
						onSetPublishMode={wizard.setPublishMode}
						onSetScheduledAt={wizard.setScheduledAt}
						onPublish={handlePublish}
						onSchedule={handleSchedule}
						onSaveDraft={handleSaveDraft}
					/>
					{platformPosts && platformPosts.length > 0 && (
						<PostPublishStatus
							platformPosts={platformPosts}
							onRetry={hasFailed ? handleRetry : undefined}
							retrying={retrying}
						/>
					)}
				</Stack>
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
					onUpdateContent={wizard.updatePlatformContent}
					onUpdateThreadSegment={wizard.updateThreadSegment}
				/>
			</div>
		</div>
	);
}
