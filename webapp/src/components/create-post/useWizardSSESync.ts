import { useEffect } from "react";
import type { PlatformType } from "@/types/platform";
import type { GenerationStatus, WizardState } from "./useCreatePostWizard";

/**
 * Syncs SSE content generation state into wizard state.
 * Manages platform content updates, thread completions, and generation progress.
 *
 * Individual function references are passed as separate parameters (rather than
 * a single wizard object) so each useEffect dependency array tracks a specific
 * stable function reference instead of the container object, which would cause
 * every effect to fire on every render.
 */
export function useWizardSSESync(
	sse: {
		platformContent: Partial<Record<PlatformType, string>>;
		threadContent: Partial<
			Record<PlatformType, { content: string; imageIndex?: number }[]>
		>;
		phase: "idle" | "describing" | "generating" | "adapting";
		loading: boolean;
		error: string | null;
		baseContent: string | null;
	},
	state: WizardState,
	setPlatformContent: (platform: PlatformType, content: string) => void,
	setPlatformProgress: (
		platform: PlatformType,
		status: GenerationStatus,
	) => void,
	setThreadContent: (
		platform: PlatformType,
		segments: { content: string; imageIndex?: number }[],
	) => void,
	generationComplete: () => void,
	generationFailed: () => void,
	setError: (error: string | null) => void,
) {
	// Sync SSE platform completions into wizard state
	useEffect(() => {
		for (const [platform, content] of Object.entries(sse.platformContent)) {
			if (content) {
				setPlatformContent(platform as PlatformType, content);
				setPlatformProgress(platform as PlatformType, "done");
			}
		}
	}, [sse.platformContent, setPlatformContent, setPlatformProgress]);

	// When SSE phase changes, update platform progress accordingly
	useEffect(() => {
		if (sse.phase === "describing" || sse.phase === "generating") {
			for (const platform of state.selectedPlatforms) {
				setPlatformProgress(platform, "generating");
			}
		} else if (sse.phase === "adapting") {
			for (const platform of state.selectedPlatforms) {
				if (state.generationProgress[platform] !== "done") {
					setPlatformProgress(platform, "generating");
				}
			}
		}
	}, [
		sse.phase,
		state.selectedPlatforms,
		state.generationProgress,
		setPlatformProgress,
	]);

	// Sync SSE thread completions into wizard state
	useEffect(() => {
		for (const [platform, segments] of Object.entries(sse.threadContent)) {
			if (segments && segments.length > 0) {
				setThreadContent(platform as PlatformType, segments);
			}
		}
	}, [sse.threadContent, setThreadContent]);

	// When SSE finishes, mark generation complete
	useEffect(() => {
		if (
			!sse.loading &&
			sse.phase === "idle" &&
			Object.keys(sse.platformContent).length > 0
		) {
			generationComplete();
		}
	}, [sse.loading, sse.phase, sse.platformContent, generationComplete]);

	// Sync SSE errors to wizard
	useEffect(() => {
		if (sse.error) {
			setError(sse.error);
			generationFailed();
		}
	}, [sse.error, setError, generationFailed]);
}
