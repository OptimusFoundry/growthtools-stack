import { useNavigate } from "@tanstack/react-router";
import { CalendarClock, Save, Send, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { fetcher } from "@/api/client";
import { MobileActionBar } from "@/components/Layout/MobileActionBar";
import { Topbar } from "@/components/Layout/Topbar";
import { useDeletePost } from "@/hooks/useDeletePost";
import { useManagedMediaUpload } from "@/hooks/useManagedMediaUpload";
import { usePublishPost } from "@/hooks/usePublishPost";
import { useSaveDraft } from "@/hooks/useSaveDraft";
import { useSchedulePost } from "@/hooks/useSchedulePost";
import { useSSEContentGenerate } from "@/hooks/useSSEContentGenerate";
import { useUnlinkMedia } from "@/hooks/useUnlinkMedia";
import { useUpdateDraft } from "@/hooks/useUpdateDraft";
import { DatePicker } from "@/proto-design-system/components/composite/DatePicker";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { useBannerCenter } from "@/proto-design-system/components/feedback/BannerCenter";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Drawer } from "@/proto-design-system/components/overlays/Drawer";
import { Modal } from "@/proto-design-system/components/overlays/Modal";
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
	addBanner: ReturnType<typeof useBannerCenter>["addBanner"],
) {
	const [scheduleOpen, setScheduleOpen] = useState(false);
	const [scheduleDate, setScheduleDate] = useState<Date | null>(() =>
		initialScheduledAt ? new Date(initialScheduledAt) : null,
	);
	const [scheduleTime, setScheduleTime] = useState<string>(() => {
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

	const handleConfirmSchedule = async () => {
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
		if (combined.getTime() <= Date.now()) {
			addBanner({
				type: "error",
				title: "Pick a time in the future",
				dismissible: true,
			});
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
	addBanner: ReturnType<typeof useBannerCenter>["addBanner"];
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
	addBanner,
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
	};

	const handleSchedule = async (whenOverride?: string) => {
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
	};

	const handleSaveDraft = async () => {
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
	};

	const handleRetry = async () => {
		if (!editPostId) return;
		setRetrying(true);
		try {
			await fetcher<void>(
				`${import.meta.env.VITE_API_URL}/api/protected/posts/${editPostId}/retry`,
				{ method: "POST" },
			);
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
	const { deletePost, loading: deleting } = useDeletePost();
	const [deleteOpen, setDeleteOpen] = useState(false);
	const { saveDraft, loading: savingDraft } = useSaveDraft();
	const { updateDraft, loading: updatingDraft } = useUpdateDraft();
	const { schedulePost } = useSchedulePost();
	const { unlinkMedia } = useUnlinkMedia();
	const { addBanner } = useBannerCenter();

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
		addBanner,
		navigate,
	});

	const scheduleDrawer = useScheduleDrawer(
		state.scheduledAt,
		wizard.setScheduledAt,
		actions.handleSchedule,
		addBanner,
	);

	const hasFailed =
		postStatus === "failed" || postStatus === "partially_published";

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
	) : postStatus === "scheduled" ? (
		<>
			<em>Scheduled.</em> Queued for liftoff.
		</>
	) : (
		<>
			<em>Shipped.</em> Here's how it landed.
		</>
	);

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

	const subLine: ReactNode = !isEditMode ? (
		"Write the idea once — AI adapts it for each platform and keeps the voice consistent."
	) : postStatus === "draft" ? (
		"Update your post content and platform adaptations. Changes save automatically as you type."
	) : isScheduled ? (
		formattedScheduledAt ? (
			<>
				Going live on{" "}
				<strong className={styles.subEmphasis}>{formattedScheduledAt}</strong>.
				Review or reschedule before it ships.
			</>
		) : (
			"Review the post and platform adaptations before it goes live at the scheduled time."
		)
	) : (
		"View your published post and see how each platform rendered it."
	);

	const busy = state.submitting || savingDraft || updatingDraft;
	const canAct = state.generated && !readOnly;
	const canDelete =
		isEditMode &&
		!!editPostId &&
		(postStatus === "draft" || postStatus === "scheduled");

	const handleConfirmDelete = async () => {
		if (!editPostId) return;
		try {
			await deletePost(editPostId);
			setDeleteOpen(false);
			addBanner({
				type: "success",
				title: "Post deleted",
				dismissible: true,
			});
			navigate({ to: "/posts" });
		} catch {
			addBanner({
				type: "error",
				title: "Couldn't delete post",
				description: "Please try again.",
				dismissible: true,
			});
		}
	};

	const breadcrumbs = [
		{ label: "Posts", href: "/posts" as const },
		{ label: isEditMode ? "Edit" : "New" },
	];

	const topbarActions = readOnly ? undefined : (
		<Stack direction="row" gap="sm" align="center">
			{canDelete && (
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setDeleteOpen(true)}
					disabled={busy || deleting}
					aria-label="Delete post"
				>
					<Trash2 size={14} /> Delete
				</Button>
			)}
			<Button
				variant="ghost"
				size="sm"
				onClick={actions.handleSaveDraft}
				isLoading={savingDraft || updatingDraft}
				disabled={busy}
			>
				Save draft
			</Button>
			<Button
				variant="secondary"
				size="sm"
				onClick={() => scheduleDrawer.setScheduleOpen(true)}
				disabled={busy || !canAct}
			>
				<CalendarClock size={14} /> {isScheduled ? "Reschedule" : "Schedule"}
			</Button>
			<Button
				variant="primary"
				size="sm"
				onClick={actions.handlePublish}
				isLoading={state.submitting}
				disabled={busy || !canAct}
			>
				<Send size={14} /> Publish
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
									onClick={() => setDeleteOpen(true)}
									disabled={busy || deleting}
									aria-label="Delete post"
								>
									<Trash2 size={18} aria-hidden="true" />
								</Button>
							)}
							<Button
								variant="ghost"
								size="sm"
								onClick={actions.handleSaveDraft}
								isLoading={savingDraft || updatingDraft}
								disabled={busy}
								aria-label="Save draft"
							>
								<Save size={18} aria-hidden="true" />
							</Button>
						</>
					}
					end={
						<>
							<Button
								variant="secondary"
								size="sm"
								onClick={() => scheduleDrawer.setScheduleOpen(true)}
								disabled={busy || !canAct}
								aria-label={isScheduled ? "Reschedule post" : "Schedule post"}
							>
								<CalendarClock size={18} aria-hidden="true" />
							</Button>
							<Button
								variant="primary"
								size="sm"
								onClick={actions.handlePublish}
								isLoading={state.submitting}
								disabled={busy || !canAct}
								aria-label="Publish post"
							>
								<Send size={18} aria-hidden="true" />
							</Button>
						</>
					}
				/>
			)}
			<div className={styles.page}>
				<header className={styles.header}>
					<div className={styles.headerInner}>
						<Stack direction="column" gap="0">
							<div className={styles.eyebrow}>{eyebrowLabel}</div>
							<h1 className={styles.title}>{titleFragment}</h1>
							<p className={styles.sub}>{subLine}</p>
						</Stack>
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
							pendingFiles={managedMedia.uploadingFiles}
							uploading={managedMedia.isUploading}
							existingMedia={state.uploadedMedia.map((m) => ({
								id: m.id,
								name: m.filename,
								size: m.sizeBytes,
								contentType: m.contentType,
								url: m.url,
							}))}
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
				isOpen={scheduleDrawer.scheduleOpen}
				onClose={() => scheduleDrawer.setScheduleOpen(false)}
				title={isScheduled ? "Reschedule post" : "Schedule post"}
				description={scheduleDrawer.scheduledLabel}
				size="md"
				footer={
					<Stack direction="row" gap="sm" justify="end">
						<Button
							variant="ghost"
							onClick={() => scheduleDrawer.setScheduleOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={scheduleDrawer.handleConfirmSchedule}
							isLoading={state.submitting}
							disabled={!scheduleDrawer.scheduleDate}
						>
							{isScheduled ? "Reschedule" : "Schedule"}
						</Button>
					</Stack>
				}
			>
				<Stack gap="md">
					<DatePicker
						value={scheduleDrawer.scheduleDate}
						onChange={scheduleDrawer.setScheduleDate}
						minDate={startOfToday()}
						inline
					/>
					<Stack gap="xs">
						<Text size="sm">Time</Text>
						<TextField
							type="time"
							value={scheduleDrawer.scheduleTime}
							onChange={(e) => scheduleDrawer.setScheduleTime(e.target.value)}
							min={timeMinForDate(scheduleDrawer.scheduleDate)}
						/>
					</Stack>
				</Stack>
			</Drawer>

			<Modal
				isOpen={deleteOpen}
				onClose={() => setDeleteOpen(false)}
				title="Delete post"
				size="sm"
				footer={
					<Stack direction="row" gap="sm" justify="end">
						<Button variant="ghost" onClick={() => setDeleteOpen(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleConfirmDelete}
							isLoading={deleting}
						>
							Delete
						</Button>
					</Stack>
				}
			>
				<Text color="secondary">
					Are you sure you want to delete this post? This action cannot be
					undone.
				</Text>
			</Modal>
		</>
	);
}
