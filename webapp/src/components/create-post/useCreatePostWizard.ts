import { useCallback, useReducer } from "react";
import type { ThreadSegment } from "@/hooks/useSSEContentGenerate";
import type { UploadedFile } from "@/proto-design-system/components/composite/FileUpload";
import type { MediaItem } from "@/types/media";
import type { PlatformType } from "@/types/platform";

export type WizardContentType = "text" | "thread";
export type GenerationStatus = "pending" | "generating" | "done" | "error";
export type PublishMode = "now" | "schedule" | null;

export interface WizardState {
	blurb: string;
	contentType: WizardContentType;
	selectedPlatforms: PlatformType[];
	pendingFiles: UploadedFile[];
	uploadedMedia: MediaItem[];
	generating: boolean;
	generated: boolean;
	generationProgress: Partial<Record<PlatformType, GenerationStatus>>;
	platformContent: Partial<Record<PlatformType, string>>;
	threadContent: Partial<Record<PlatformType, ThreadSegment[]>>;
	publishMode: PublishMode;
	scheduledAt: string;
	error: string | null;
	submitting: boolean;
}

type WizardAction =
	| { type: "SET_BLURB"; blurb: string }
	| { type: "SET_CONTENT_TYPE"; contentType: WizardContentType }
	| { type: "TOGGLE_PLATFORM"; platform: PlatformType }
	| { type: "SET_PENDING_FILES"; files: UploadedFile[] }
	| { type: "ADD_UPLOADED_MEDIA"; media: MediaItem }
	| { type: "START_GENERATION" }
	| {
			type: "SET_PLATFORM_PROGRESS";
			platform: PlatformType;
			status: GenerationStatus;
	  }
	| { type: "SET_PLATFORM_CONTENT"; platform: PlatformType; content: string }
	| {
			type: "SET_THREAD_CONTENT";
			platform: PlatformType;
			thread: ThreadSegment[];
	  }
	| { type: "GENERATION_COMPLETE" }
	| { type: "GENERATION_FAILED" }
	| { type: "SET_PUBLISH_MODE"; mode: PublishMode }
	| { type: "SET_SCHEDULED_AT"; scheduledAt: string }
	| { type: "SET_ERROR"; error: string | null }
	| { type: "SET_SUBMITTING"; submitting: boolean }
	| { type: "UPDATE_PLATFORM_CONTENT"; platform: PlatformType; content: string }
	| {
			type: "UPDATE_THREAD_SEGMENT";
			platform: PlatformType;
			index: number;
			content: string;
	  };

const initialState: WizardState = {
	blurb: "",
	contentType: "text",
	selectedPlatforms: [],
	pendingFiles: [],
	uploadedMedia: [],
	generating: false,
	generated: false,
	generationProgress: {},
	platformContent: {},
	threadContent: {},
	publishMode: null,
	scheduledAt: "",
	error: null,
	submitting: false,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
	switch (action.type) {
		case "SET_BLURB":
			return { ...state, blurb: action.blurb };
		case "SET_CONTENT_TYPE":
			return { ...state, contentType: action.contentType };
		case "TOGGLE_PLATFORM": {
			const exists = state.selectedPlatforms.includes(action.platform);
			return {
				...state,
				selectedPlatforms: exists
					? state.selectedPlatforms.filter((p) => p !== action.platform)
					: [...state.selectedPlatforms, action.platform],
			};
		}
		case "SET_PENDING_FILES":
			return { ...state, pendingFiles: action.files };
		case "ADD_UPLOADED_MEDIA":
			return {
				...state,
				uploadedMedia: [...state.uploadedMedia, action.media],
			};
		case "START_GENERATION": {
			const progress: Partial<Record<PlatformType, GenerationStatus>> = {};
			for (const p of state.selectedPlatforms) {
				progress[p] = "pending";
			}
			return {
				...state,
				generating: true,
				generated: false,
				generationProgress: progress,
				platformContent: {},
				threadContent: {},
				error: null,
			};
		}
		case "SET_PLATFORM_PROGRESS":
			return {
				...state,
				generationProgress: {
					...state.generationProgress,
					[action.platform]: action.status,
				},
			};
		case "SET_PLATFORM_CONTENT":
			return {
				...state,
				platformContent: {
					...state.platformContent,
					[action.platform]: action.content,
				},
			};
		case "SET_THREAD_CONTENT":
			return {
				...state,
				threadContent: {
					...state.threadContent,
					[action.platform]: action.thread,
				},
			};
		case "GENERATION_COMPLETE":
			return { ...state, generating: false, generated: true };
		case "GENERATION_FAILED":
			return { ...state, generating: false };
		case "SET_PUBLISH_MODE":
			return { ...state, publishMode: action.mode };
		case "SET_SCHEDULED_AT":
			return { ...state, scheduledAt: action.scheduledAt };
		case "SET_ERROR":
			return { ...state, error: action.error };
		case "SET_SUBMITTING":
			return { ...state, submitting: action.submitting };
		case "UPDATE_PLATFORM_CONTENT":
			return {
				...state,
				platformContent: {
					...state.platformContent,
					[action.platform]: action.content,
				},
			};
		case "UPDATE_THREAD_SEGMENT": {
			const current = state.threadContent[action.platform] ?? [];
			const updated = [...current];
			if (updated[action.index]) {
				updated[action.index] = {
					...updated[action.index],
					content: action.content,
				};
			}
			return {
				...state,
				threadContent: {
					...state.threadContent,
					[action.platform]: updated,
				},
			};
		}
		default:
			return state;
	}
}

export function useCreatePostWizard() {
	const [state, dispatch] = useReducer(wizardReducer, initialState);

	const setBlurb = useCallback(
		(blurb: string) => dispatch({ type: "SET_BLURB", blurb }),
		[],
	);
	const setContentType = useCallback(
		(contentType: WizardContentType) =>
			dispatch({ type: "SET_CONTENT_TYPE", contentType }),
		[],
	);
	const togglePlatform = useCallback(
		(platform: PlatformType) => dispatch({ type: "TOGGLE_PLATFORM", platform }),
		[],
	);
	const setPendingFiles = useCallback(
		(files: UploadedFile[]) => dispatch({ type: "SET_PENDING_FILES", files }),
		[],
	);
	const addUploadedMedia = useCallback(
		(media: MediaItem) => dispatch({ type: "ADD_UPLOADED_MEDIA", media }),
		[],
	);
	const startGeneration = useCallback(
		() => dispatch({ type: "START_GENERATION" }),
		[],
	);
	const setPlatformProgress = useCallback(
		(platform: PlatformType, status: GenerationStatus) =>
			dispatch({ type: "SET_PLATFORM_PROGRESS", platform, status }),
		[],
	);
	const setPlatformContent = useCallback(
		(platform: PlatformType, content: string) =>
			dispatch({ type: "SET_PLATFORM_CONTENT", platform, content }),
		[],
	);
	const setThreadContent = useCallback(
		(platform: PlatformType, thread: ThreadSegment[]) =>
			dispatch({ type: "SET_THREAD_CONTENT", platform, thread }),
		[],
	);
	const generationComplete = useCallback(
		() => dispatch({ type: "GENERATION_COMPLETE" }),
		[],
	);
	const generationFailed = useCallback(
		() => dispatch({ type: "GENERATION_FAILED" }),
		[],
	);
	const setPublishMode = useCallback(
		(mode: PublishMode) => dispatch({ type: "SET_PUBLISH_MODE", mode }),
		[],
	);
	const setScheduledAt = useCallback(
		(scheduledAt: string) =>
			dispatch({ type: "SET_SCHEDULED_AT", scheduledAt }),
		[],
	);
	const setError = useCallback(
		(error: string | null) => dispatch({ type: "SET_ERROR", error }),
		[],
	);
	const setSubmitting = useCallback(
		(submitting: boolean) => dispatch({ type: "SET_SUBMITTING", submitting }),
		[],
	);
	const updatePlatformContent = useCallback(
		(platform: PlatformType, content: string) =>
			dispatch({ type: "UPDATE_PLATFORM_CONTENT", platform, content }),
		[],
	);
	const updateThreadSegment = useCallback(
		(platform: PlatformType, index: number, content: string) =>
			dispatch({ type: "UPDATE_THREAD_SEGMENT", platform, index, content }),
		[],
	);

	return {
		state,
		setBlurb,
		setContentType,
		togglePlatform,
		setPendingFiles,
		addUploadedMedia,
		startGeneration,
		setPlatformProgress,
		setPlatformContent,
		setThreadContent,
		generationComplete,
		generationFailed,
		setPublishMode,
		setScheduledAt,
		setError,
		setSubmitting,
		updatePlatformContent,
		updateThreadSegment,
	};
}
