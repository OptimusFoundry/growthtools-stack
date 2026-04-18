import { useNavigate } from "@tanstack/react-router";
import { CalendarClock, Send } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { Topbar } from "@/components/Layout/Topbar";
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
import { DatePicker } from "@/proto-design-system/components/composite/DatePicker";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { useBannerCenter } from "@/proto-design-system/components/feedback/BannerCenter";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Drawer } from "@/proto-design-system/components/overlays/Drawer";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { PlatformContentInput, PlatformPost } from "@/types/post";
import styles from "./CreatePostWizard.module.scss";
import { ComposeStep } from "./compose/ComposeStep";
import { PostPublishStatus } from "./PostPublishStatus";
import { PreviewStep } from "./PreviewStep";
import type { WizardState } from "./useCreatePostWizard";
import { useCreatePostWizard } from "./useCreatePostWizard";
import { useWizardSSESync } from "./useWizardSSESync";

export interface WizardInnerProps {
	editPostId?: string;
	initialOverrides?: Partial<WizardState>;
	initialBaseContent?: string;
	readOnly?: boolean;
	platformPosts?: PlatformPost[];
	postStatus?: string;
}

export function WizardInner({
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

	// Sync SSE content into wizard state
	useWizardSSESync(sse, state, {
		setPlatformContent: wizard.setPlatformContent,
		setPlatformProgress: wizard.setPlatformProgress,
		setThreadContent: wizard.setThreadContent,
		generationComplete: wizard.generationComplete,
		generationFailed: wizard.generationFailed,
		setError: wizard.setError,
	});

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
		[editPostId, unlinkMedia, wizard],
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

		wizard.startGeneration();

		// Upload pending files + convert to base64 for AI, then start SSE generation
		const uploadAndGenerate = async () => {
			// IDs already persisted from initialOverrides (e.g. GitHub-capture draft).
			// Captured before the upload loop so closure staleness is not an issue.
			const alreadyPersistedIDs = state.uploadedMedia.map((m) => m.id);

			const validFiles = state.pendingFiles
				.filter((f) => !f.error)
				.map((f) => f.file);

			// Collect IDs from newly uploaded files (uploaded in parallel with base64).
			const newlyUploadedIDs: string[] = [];

			// S3 upload (for publishing) and base64 (for AI) run in parallel
			const [imagePayloads] = await Promise.all([
				validFiles.length > 0 ? filesToBase64(validFiles) : Promise.resolve([]),
				(async () => {
					for (const pendingFile of state.pendingFiles) {
						if (!pendingFile.error) {
							try {
								const media = await uploadMedia(pendingFile.file);
								wizard.addUploadedMedia(media);
								newlyUploadedIDs.push(media.id);
							} catch {
								// continue with remaining files
							}
						}
					}
				})(),
			]);

			// Combine persisted IDs with any newly-uploaded IDs.
			const allMediaIDs = [...alreadyPersistedIDs, ...newlyUploadedIDs];

			sse.generate(
				state.blurb,
				state.selectedPlatforms,
				state.contentType,
				imagePayloads.length > 0 ? imagePayloads : undefined,
				state.contentType === "thread" ? state.maxThreadParts : undefined,
				allMediaIDs.length > 0 ? allMediaIDs : undefined,
			);
		};

		uploadAndGenerate();
	}, [
		state.blurb,
		state.selectedPlatforms,
		state.pendingFiles,
		state.contentType,
		state.maxThreadParts,
		state.uploadedMedia,
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
		sse.baseContent,
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

	const handleSchedule = useCallback(
		async (whenOverride?: string) => {
			const when = whenOverride ?? state.scheduledAt;
			if (!when) {
				addBanner({
					type: "error",
					title: "Please pick a date and time",
					dismissible: true,
				});
				return;
			}

			wizard.setSubmitting(true);
			wizard.setError(null);

			try {
				const postId = await persistDraft();
				await schedulePost(postId, when);
				addBanner({
					type: "success",
					title: "Post scheduled",
					description: `It'll go out on ${new Date(when).toLocaleString()}.`,
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
		},
		[
			state.scheduledAt,
			wizard,
			persistDraft,
			schedulePost,
			navigate,
			addBanner,
		],
	);

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

	const eyebrowLabel = !isEditMode
		? "Composer · new post"
		: postStatus === "draft"
			? "Composer · edit draft"
			: `Composer · ${postStatus}`;

	const titleFragment: ReactNode = !isEditMode ? (
		<>
			A new <em>thought</em>, five platforms.
		</>
	) : postStatus === "draft" ? (
		<>
			Sharpen the <em>draft</em> before it ships.
		</>
	) : (
		<>
			<em>Shipped.</em> Here's how it landed.
		</>
	);

	const subLine = !isEditMode
		? "Write the idea once — AI adapts it for each platform and keeps the voice consistent."
		: postStatus === "draft"
			? "Update your post content and platform adaptations. Changes save automatically as you type."
			: "View your published post and see how each platform rendered it.";

	const [scheduleOpen, setScheduleOpen] = useState(false);
	const [scheduleDate, setScheduleDate] = useState<Date | null>(() =>
		state.scheduledAt ? new Date(state.scheduledAt) : null,
	);
	const [scheduleTime, setScheduleTime] = useState<string>(() => {
		if (state.scheduledAt) {
			const d = new Date(state.scheduledAt);
			return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
		}
		return "09:00";
	});

	const scheduledLabel = scheduleDate
		? `Scheduled for ${scheduleDate.toLocaleDateString(undefined, {
				weekday: "long",
				month: "long",
				day: "numeric",
			})} at ${scheduleTime}`
		: "Pick a date and time below.";

	const handleConfirmSchedule = useCallback(async () => {
		if (!scheduleDate) {
			addBanner({
				type: "error",
				title: "Please pick a date",
				dismissible: true,
			});
			return;
		}
		const [h, m] = scheduleTime.split(":").map(Number);
		const combined = new Date(scheduleDate);
		combined.setHours(h ?? 9, m ?? 0, 0, 0);
		const iso = combined.toISOString();
		wizard.setScheduledAt(iso);
		setScheduleOpen(false);
		await handleSchedule(iso);
	}, [scheduleDate, scheduleTime, wizard, handleSchedule, addBanner]);

	const busy = state.submitting || savingDraft || updatingDraft;
	const canAct = state.generated && !readOnly;

	const breadcrumbs = [
		{ label: "Posts", href: "/posts" as const },
		{ label: isEditMode ? "Edit" : "New" },
	];

	const topbarActions = readOnly ? undefined : (
		<>
			<Button
				variant="ghost"
				size="sm"
				onClick={handleSaveDraft}
				isLoading={savingDraft || updatingDraft}
				disabled={busy}
			>
				Save draft
			</Button>
			<Button
				variant="secondary"
				size="sm"
				onClick={() => setScheduleOpen(true)}
				disabled={busy || !canAct}
			>
				<CalendarClock size={14} /> Schedule
			</Button>
			<Button
				variant="primary"
				size="sm"
				onClick={handlePublish}
				isLoading={state.submitting}
				disabled={busy || !canAct}
			>
				<Send size={14} /> Publish
			</Button>
		</>
	);

	return (
		<>
			<Topbar breadcrumbs={breadcrumbs} actions={topbarActions} />
			<div className={styles.page}>
				<header className={styles.header}>
					<div className={styles.headerInner}>
						<div>
							<div className={styles.eyebrow}>{eyebrowLabel}</div>
							<h1 className={styles.title}>{titleFragment}</h1>
							<p className={styles.sub}>{subLine}</p>
						</div>
					</div>
				</header>

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
							readOnly={readOnly}
							onBlurbChange={wizard.setBlurb}
							maxThreadParts={state.maxThreadParts}
							onContentTypeChange={wizard.setContentType}
							onMaxThreadPartsChange={wizard.setMaxThreadParts}
							onTogglePlatform={wizard.togglePlatform}
							onFilesChange={wizard.setPendingFiles}
							onGenerate={handleGenerate}
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

			<Drawer
				isOpen={scheduleOpen}
				onClose={() => setScheduleOpen(false)}
				title="Schedule post"
				description={scheduledLabel}
				size="md"
				footer={
					<Stack direction="row" gap="sm" justify="end">
						<Button variant="ghost" onClick={() => setScheduleOpen(false)}>
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={handleConfirmSchedule}
							isLoading={state.submitting}
							disabled={!scheduleDate}
						>
							Schedule
						</Button>
					</Stack>
				}
			>
				<Stack gap="md">
					<DatePicker
						value={scheduleDate}
						onChange={setScheduleDate}
						minDate={new Date()}
						inline
					/>
					<Stack gap="xs">
						<Text size="sm">Time</Text>
						<TextField
							type="time"
							value={scheduleTime}
							onChange={(e) => setScheduleTime(e.target.value)}
						/>
					</Stack>
				</Stack>
			</Drawer>
		</>
	);
}
