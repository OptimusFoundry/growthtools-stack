import {
	Alert,
	Button,
	DatePicker,
	Drawer,
	PageHero,
	Stack,
	TextField,
} from "@optimusfoundry/quiet";
import { useNavigate } from "@tanstack/react-router";
import { CalendarClock, Save, Send, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { fetcher } from "@/api/client";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { MobileActionBar } from "@/components/Layout/MobileActionBar";
import { Topbar } from "@/components/Layout/Topbar";
import { ConfirmDeleteModal } from "@/components/patterns/ConfirmDeleteModal/ConfirmDeleteModal";
import { useConfirmableDelete } from "@/hooks/useConfirmableDelete";
import { useDeletePost } from "@/hooks/useDeletePost";
import { useManagedMediaUpload } from "@/hooks/useManagedMediaUpload";
import { type UseNotifyResult, useNotify } from "@/hooks/useNotify";
import { usePublishPost } from "@/hooks/usePublishPost";
import { useRegenerateDraft } from "@/hooks/useRegenerateDraft";
import { useSaveDraft } from "@/hooks/useSaveDraft";
import { useSchedulePost } from "@/hooks/useSchedulePost";
import { useSSEContentGenerate } from "@/hooks/useSSEContentGenerate";
import { useUnlinkMedia } from "@/hooks/useUnlinkMedia";
import { useUpdateDraft } from "@/hooks/useUpdateDraft";
import type { MediaItem } from "@/types/media";
import type { PlatformContentInput, PlatformPost } from "@/types/post";
import styles from "./CreatePostWizard.module.scss";
import { CaptureMediaPicker } from "./compose/CaptureMediaPicker";
import { ComposeStep } from "./compose/ComposeStep";
import { PostPublishStatus } from "./PostPublishStatus";
import { PreviewStep } from "./PreviewStep";
import type { WizardState } from "./useCreatePostWizard";
import { useCreatePostWizard } from "./useCreatePostWizard";
import { useWizardSSESync } from "./useWizardSSESync";

function startOfToday(): Date {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d;
}

function isSameLocalDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

function timeMinForDate(date: Date | null): string | undefined {
	if (!date) return undefined;
	const now = new Date();
	if (!isSameLocalDay(date, now)) return undefined;
	return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// useScheduleDrawer
// Manages the schedule drawer's open state, date, time, and confirm logic.
// ---------------------------------------------------------------------------

function useScheduleDrawer(
	initialScheduledAt: string,
	setScheduledAt: (iso: string) => void,
	handleSchedule: (whenOverride?: string) => Promise<void>,
) {
	const [scheduleOpen, setScheduleOpenState] = useState(false);
	// Inline, not a toast: the open Drawer makes the Toaster inert.
	const [scheduleError, setScheduleError] = useState<string | null>(null);
	const [scheduleDate, setScheduleDateState] = useState<Date | null>(() =>
		initialScheduledAt ? new Date(initialScheduledAt) : null,
	);
	const [scheduleTime, setScheduleTimeState] = useState<string>(() => {
		if (initialScheduledAt) {
			const d = new Date(initialScheduledAt);
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

	const setScheduleOpen = (open: boolean) => {
		setScheduleError(null);
		setScheduleOpenState(open);
	};

	const setScheduleDate = (date: Date | null) => {
		setScheduleError(null);
		setScheduleDateState(date);
	};

	const setScheduleTime = (time: string) => {
		setScheduleError(null);
		setScheduleTimeState(time);
	};

	const handleConfirmSchedule = async () => {
		if (!scheduleDate) {
			setScheduleError("Please pick a date");
			return;
		}
		const [h, m] = scheduleTime.split(":").map(Number);
		const combined = new Date(scheduleDate);
		combined.setHours(h ?? 9, m ?? 0, 0, 0);
		if (combined.getTime() <= Date.now()) {
			setScheduleError("Pick a time in the future");
			return;
		}
		const iso = combined.toISOString();
		setScheduledAt(iso);
		setScheduleOpen(false);
		await handleSchedule(iso);
	};

	return {
		scheduleOpen,
		setScheduleOpen,
		scheduleDate,
		setScheduleDate,
		scheduleTime,
		setScheduleTime,
		scheduledLabel,
		scheduleError,
		handleConfirmSchedule,
	};
}

// ---------------------------------------------------------------------------
// useWizardActions
// Encapsulates all async post actions: generate, persist draft, publish,
// schedule, save draft, and retry. Keeps WizardInner's body readable.
// ---------------------------------------------------------------------------

interface UseWizardActionsParams {
	state: WizardState;
	wizard: ReturnType<typeof useCreatePostWizard>;
	sse: ReturnType<typeof useSSEContentGenerate>;
	initialBaseContent: string | undefined;
	editPostId: string | undefined;
	isEditMode: boolean;
	saveDraft: ReturnType<typeof useSaveDraft>["saveDraft"];
	savingDraft: boolean;
	updateDraft: ReturnType<typeof useUpdateDraft>["updateDraft"];
	updatingDraft: boolean;
	publishPost: ReturnType<typeof usePublishPost>["publishPost"];
	schedulePost: ReturnType<typeof useSchedulePost>["schedulePost"];
	unlinkMedia: ReturnType<typeof useUnlinkMedia>["unlinkMedia"];
	notify: UseNotifyResult["notify"];
	navigate: ReturnType<typeof useNavigate>;
}

function useWizardActions({
	state,
	wizard,
	sse,
	initialBaseContent,
	editPostId,
	isEditMode,
	saveDraft,
	updateDraft,
	publishPost,
	schedulePost,
	unlinkMedia,
	notify,
	navigate,
}: UseWizardActionsParams) {
	const [retrying, setRetrying] = useState(false);

	// Removing a media item from an already-persisted post must unlink it
	// server-side first; otherwise Save Draft and Publish would still see
	// the original media_ids array. For unsaved drafts there's no post row
	// yet, so the removal is local-only.
	const handleRemoveUploadedMedia = async (mediaID: string) => {
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
	};

	const handleGenerate = () => {
		if (!state.blurb.trim()) {
			wizard.setError("Please write something to share.");
			return;
		}
		if (state.selectedPlatforms.length === 0) {
			wizard.setError("Select at least one platform.");
			return;
		}

		wizard.startGeneration();

		const mediaIDs = state.uploadedMedia.map((m) => m.id);
		sse.generate(
			state.blurb,
			state.selectedPlatforms,
			state.contentType,
			undefined,
			state.contentType === "thread" ? state.maxThreadParts : undefined,
			mediaIDs.length > 0 ? mediaIDs : undefined,
		);
	};

	// Persist the wizard's current state as a draft and return the post id
	// we should act on. In edit mode we update the draft the user opened —
	// doing this any other way creates a brand-new row and leaves the
	// original draft orphaned (see the github-draft "published as new
	// post" regression). In create mode we POST a fresh draft.
	const persistDraft = async (): Promise<string> => {
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
	};

	const handlePublish = async () => {
		wizard.setSubmitting(true);
		wizard.setError(null);

		try {
			const postId = await persistDraft();
			await publishPost(postId, [...state.selectedPlatforms]);
			notify({
				status: "success",
				title: "Post published",
				description: "We're pushing it out to your selected platforms.",
			});
			navigate({ to: "/posts" });
		} catch {
			notify({
				status: "error",
				title: "Couldn't publish post",
				description: "Please try again.",
			});
		} finally {
			wizard.setSubmitting(false);
		}
	};

	const handleSchedule = async (whenOverride?: string) => {
		const when = whenOverride ?? state.scheduledAt;
		if (!when) {
			notify({ status: "error", title: "Please pick a date and time" });
			return;
		}

		wizard.setSubmitting(true);
		wizard.setError(null);

		try {
			const postId = await persistDraft();
			await schedulePost(postId, when);
			notify({
				status: "success",
				title: "Post scheduled",
				description: `It'll go out on ${new Date(when).toLocaleString()}.`,
			});
			navigate({ to: "/posts" });
		} catch {
			notify({
				status: "error",
				title: "Couldn't schedule post",
				description: "Please try again.",
			});
		} finally {
			wizard.setSubmitting(false);
		}
	};

	const handleSaveDraft = async () => {
		wizard.setSubmitting(true);
		wizard.setError(null);

		try {
			await persistDraft();
			notify({
				status: "success",
				title: isEditMode ? "Draft updated" : "Draft saved",
			});
			navigate({ to: "/posts" });
		} catch {
			notify({
				status: "error",
				title: "Couldn't save draft",
				description: "Please try again.",
			});
		} finally {
			wizard.setSubmitting(false);
		}
	};

	const handleRetry = async () => {
		if (!editPostId) return;
		setRetrying(true);
		try {
			await fetcher<void>(
				`${import.meta.env.VITE_API_URL}/api/protected/posts/${editPostId}/retry`,
				{ method: "POST" },
			);
			notify({ status: "success", title: "Retrying failed platforms" });
			navigate({ to: "/posts" });
		} catch {
			notify({
				status: "error",
				title: "Couldn't retry post",
				description: "Please try again.",
			});
		} finally {
			setRetrying(false);
		}
	};

	return {
		handleRemoveUploadedMedia,
		handleGenerate,
		handlePublish,
		handleSchedule,
		handleSaveDraft,
		handleRetry,
		retrying,
	};
}

interface HeroCopy {
	title: ReactNode;
	accent: ReactNode;
	after: ReactNode;
}

// Headline puts a space before `after` only when an accent exists, so each
// state reads as one sentence; `title` is required, hence null for the
// accent-led states.
function getHeroCopy(
	isEditMode: boolean,
	postStatus: string | undefined,
): HeroCopy {
	if (!isEditMode) {
		return {
			title: "A new",
			accent: "thought,",
			after: "five platforms",
		};
	}
	if (postStatus === "draft") {
		return {
			title: "Sharpen the",
			accent: "draft",
			after: "before it ships",
		};
	}
	if (postStatus === "scheduled") {
		return {
			title: null,
			accent: "Scheduled.",
			after: "Queued for liftoff",
		};
	}
	return {
		title: null,
		accent: "Shipped.",
		after: "Here's how it landed",
	};
}

function getSubLine(
	isEditMode: boolean,
	postStatus: string | undefined,
	formattedScheduledAt: string | null,
): ReactNode {
	if (!isEditMode) {
		return "Write the idea once — AI adapts it for each platform and keeps the voice consistent.";
	}
	if (postStatus === "draft") {
		return "Update your post content and platform adaptations. Changes save automatically as you type.";
	}
	if (postStatus !== "scheduled") {
		return "View your published post and see how each platform rendered it.";
	}
	if (!formattedScheduledAt) {
		return "Review the post and platform adaptations before it goes live at the scheduled time.";
	}
	return (
		<>
			Going live on <strong>{formattedScheduledAt}</strong>. Review or
			reschedule before it ships.
		</>
	);
}

// ---------------------------------------------------------------------------
// WizardInner
// ---------------------------------------------------------------------------

export interface WizardInnerProps {
	editPostId?: string;
	initialOverrides?: Partial<WizardState>;
	initialBaseContent?: string;
	readOnly?: boolean;
	platformPosts?: PlatformPost[];
	postStatus?: string;
	/** Every capture artifact of a commit-generated draft (empty otherwise). */
	captureMedia?: MediaItem[];
	/** Called after the server regenerated the draft, so the caller can reload it. */
	onRegenerated?: () => void;
}

export function WizardInner({
	editPostId,
	initialOverrides,
	initialBaseContent,
	readOnly = false,
	platformPosts,
	postStatus,
	captureMedia = [],
	onRegenerated,
}: WizardInnerProps = {}) {
	const isEditMode = Boolean(editPostId);
	const navigate = useNavigate();
	const wizard = useCreatePostWizard(initialOverrides);
	const { state } = wizard;

	const sse = useSSEContentGenerate();
	const { publishPost } = usePublishPost();
	const { deletePost, loading: deleting } = useDeletePost();
	const { saveDraft, loading: savingDraft } = useSaveDraft();
	const { updateDraft, loading: updatingDraft } = useUpdateDraft();
	const { schedulePost } = useSchedulePost();
	const { unlinkMedia } = useUnlinkMedia();
	const { notify } = useNotify();
	const { regenerateDraft, loading: regenerating } = useRegenerateDraft();
	// Media already attached server-side when the editor opened. Unticking one
	// of these must unlink it; anything ticked since is local until saved.
	const [persistedMediaIds] = useState(
		() => new Set((initialOverrides?.uploadedMedia ?? []).map((m) => m.id)),
	);

	const managedMedia = useManagedMediaUpload({
		onUploaded: wizard.addUploadedMedia,
	});

	// Sync SSE content into wizard state — pass individual stable references
	// so each useEffect dependency tracks a specific function, not the object.
	useWizardSSESync(
		sse,
		state,
		wizard.setPlatformContent,
		wizard.setPlatformProgress,
		wizard.setThreadContent,
		wizard.generationComplete,
		wizard.generationFailed,
		wizard.setError,
	);

	const actions = useWizardActions({
		state,
		wizard,
		sse,
		initialBaseContent,
		editPostId,
		isEditMode,
		saveDraft,
		savingDraft,
		updateDraft,
		updatingDraft,
		publishPost,
		schedulePost,
		unlinkMedia,
		notify,
		navigate,
	});

	const captureIds = new Set(captureMedia.map((m) => m.id));
	const selectedCaptureIds = state.uploadedMedia
		.map((m) => m.id)
		.filter((id) => captureIds.has(id));

	const handleToggleCapture = (item: MediaItem, selected: boolean) => {
		if (selected) {
			if (!state.uploadedMedia.some((m) => m.id === item.id)) {
				wizard.addUploadedMedia(item);
			}
			return;
		}
		if (persistedMediaIds.has(item.id)) {
			void actions.handleRemoveUploadedMedia(item.id);
		} else {
			wizard.removeUploadedMedia(item.id);
		}
	};

	const handleRegenerate = async () => {
		if (!editPostId || selectedCaptureIds.length === 0) return;
		try {
			await regenerateDraft(editPostId, selectedCaptureIds);
			notify({
				status: "success",
				title: "Post regenerated with your selected media",
			});
			onRegenerated?.();
		} catch (err) {
			wizard.setError(
				err instanceof Error ? err.message : "Failed to regenerate post",
			);
		}
	};

	const scheduleDrawer = useScheduleDrawer(
		state.scheduledAt,
		wizard.setScheduledAt,
		actions.handleSchedule,
	);

	const hasFailed =
		postStatus === "failed" || postStatus === "partially_published";

	const eyebrowLabel = !isEditMode
		? "Composer · new post"
		: postStatus === "draft"
			? "Composer · edit draft"
			: `Composer · ${postStatus}`;

	const heroCopy = getHeroCopy(isEditMode, postStatus);

	const isScheduled = postStatus === "scheduled";
	const formattedScheduledAt =
		isScheduled && state.scheduledAt
			? new Date(state.scheduledAt).toLocaleString(undefined, {
					weekday: "long",
					month: "long",
					day: "numeric",
					hour: "numeric",
					minute: "2-digit",
				})
			: null;

	const subLine = getSubLine(isEditMode, postStatus, formattedScheduledAt);

	const busy = state.submitting || savingDraft || updatingDraft;
	const canAct = state.generated && !readOnly;
	const canDelete =
		isEditMode &&
		!!editPostId &&
		(postStatus === "draft" || postStatus === "scheduled");

	const deleteFlow = useConfirmableDelete({
		mutate: deletePost,
		mutating: deleting,
		onSuccess: () => navigate({ to: "/posts" }),
		copy: {
			resource: "post",
			modalTitle: "Delete post",
			confirmBody:
				"Are you sure you want to delete this post? This action cannot be undone.",
		},
	});

	const requestDelete = () => {
		if (editPostId) deleteFlow.request(editPostId);
	};

	const breadcrumbs = [
		{ label: "Posts", href: "/posts" as const },
		{ label: isEditMode ? "Edit" : "New" },
	];

	const topbarActions = readOnly ? undefined : (
		<Stack direction="row" gap="xs" align="center">
			{canDelete && (
				<Button
					variant="ghost"
					size="sm"
					leftIcon={<AppIcon icon={Trash2} size="md" />}
					onClick={requestDelete}
					disabled={busy || deleting}
					aria-label="Delete post"
				>
					Delete
				</Button>
			)}
			<Button
				variant="ghost"
				size="sm"
				onClick={actions.handleSaveDraft}
				loading={savingDraft || updatingDraft}
				disabled={busy}
			>
				Save draft
			</Button>
			<Button
				variant="secondary"
				size="sm"
				leftIcon={<AppIcon icon={CalendarClock} size="md" />}
				onClick={() => scheduleDrawer.setScheduleOpen(true)}
				disabled={busy || !canAct}
			>
				{isScheduled ? "Reschedule" : "Schedule"}
			</Button>
			<Button
				variant="primary"
				size="sm"
				leftIcon={<AppIcon icon={Send} size="md" />}
				onClick={actions.handlePublish}
				loading={state.submitting}
				disabled={busy || !canAct}
			>
				Publish
			</Button>
		</Stack>
	);

	return (
		<>
			<Topbar
				breadcrumbs={breadcrumbs}
				actions={topbarActions}
				hideActionsOnMobile={!readOnly}
			/>
			{!readOnly && (
				<MobileActionBar
					start={
						<>
							{canDelete && (
								<Button
									variant="ghost"
									size="sm"
									icon={<AppIcon icon={Trash2} size="lg" />}
									onClick={requestDelete}
									disabled={busy || deleting}
									aria-label="Delete post"
								/>
							)}
							<Button
								variant="ghost"
								size="sm"
								icon={<AppIcon icon={Save} size="lg" />}
								onClick={actions.handleSaveDraft}
								loading={savingDraft || updatingDraft}
								disabled={busy}
								aria-label="Save draft"
							/>
						</>
					}
					end={
						<>
							<Button
								variant="secondary"
								size="sm"
								icon={<AppIcon icon={CalendarClock} size="lg" />}
								onClick={() => scheduleDrawer.setScheduleOpen(true)}
								disabled={busy || !canAct}
								aria-label={isScheduled ? "Reschedule post" : "Schedule post"}
							/>
							<Button
								variant="primary"
								size="sm"
								icon={<AppIcon icon={Send} size="lg" />}
								onClick={actions.handlePublish}
								loading={state.submitting}
								disabled={busy || !canAct}
								aria-label="Publish post"
							/>
						</>
					}
				/>
			)}
			<div className={styles.page}>
				<PageHero
					size="md"
					ruled={false}
					className={styles.hero}
					eyebrow={eyebrowLabel}
					title={heroCopy.title}
					accent={heroCopy.accent}
					after={heroCopy.after}
					description={subLine}
				/>

				{state.error && <Alert variant="error">{state.error}</Alert>}

				<div className={styles.twoColumn}>
					<Stack gap="lg" className={styles.composeColumn}>
						<ComposeStep
							blurb={state.blurb}
							contentType={state.contentType}
							selectedPlatforms={state.selectedPlatforms}
							platformContent={state.platformContent}
							pendingFiles={managedMedia.uploadingFiles}
							uploading={managedMedia.isUploading}
							existingMedia={state.uploadedMedia}
							onRemoveExistingMedia={actions.handleRemoveUploadedMedia}
							mediaChanged={state.mediaChangedSinceGeneration}
							generating={state.generating}
							generated={state.generated}
							readOnly={readOnly}
							onBlurbChange={wizard.setBlurb}
							maxThreadParts={state.maxThreadParts}
							onContentTypeChange={wizard.setContentType}
							onMaxThreadPartsChange={wizard.setMaxThreadParts}
							onTogglePlatform={wizard.togglePlatform}
							onFilesChange={managedMedia.onFilesChange}
							onGenerate={actions.handleGenerate}
						/>
						{editPostId && captureMedia.length > 0 && !readOnly && (
							<CaptureMediaPicker
								captureMedia={captureMedia}
								selectedIds={selectedCaptureIds}
								onToggle={handleToggleCapture}
								onRegenerate={handleRegenerate}
								regenerating={regenerating}
								disabled={state.generating}
							/>
						)}
						{platformPosts && platformPosts.length > 0 && (
							<PostPublishStatus
								platformPosts={platformPosts}
								onRetry={hasFailed ? actions.handleRetry : undefined}
								retrying={actions.retrying}
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
				open={scheduleDrawer.scheduleOpen}
				onClose={() => scheduleDrawer.setScheduleOpen(false)}
				title={isScheduled ? "Reschedule post" : "Schedule post"}
				description={scheduleDrawer.scheduledLabel}
				size="md"
				footer={
					<Stack direction="row" gap="xs" justify="flex-end">
						<Button
							variant="ghost"
							onClick={() => scheduleDrawer.setScheduleOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={scheduleDrawer.handleConfirmSchedule}
							loading={state.submitting}
							disabled={!scheduleDrawer.scheduleDate}
						>
							{isScheduled ? "Reschedule" : "Schedule"}
						</Button>
					</Stack>
				}
			>
				<Stack gap="sm">
					{scheduleDrawer.scheduleError && (
						<Alert variant="error">{scheduleDrawer.scheduleError}</Alert>
					)}
					<DatePicker
						label="Date"
						value={scheduleDrawer.scheduleDate}
						onChange={scheduleDrawer.setScheduleDate}
						min={startOfToday()}
					/>
					<TextField
						type="time"
						label="Time"
						value={scheduleDrawer.scheduleTime}
						onChange={(e) => scheduleDrawer.setScheduleTime(e.target.value)}
						min={timeMinForDate(scheduleDrawer.scheduleDate)}
					/>
				</Stack>
			</Drawer>

			<ConfirmDeleteModal flow={deleteFlow} />
		</>
	);
}
