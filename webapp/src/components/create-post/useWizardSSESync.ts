import { useEffect } from "react";
import type { PlatformType } from "@/types/platform";
import type { GenerationStatus, WizardState } from "./useCreatePostWizard";

/**
 * Syncs SSE content generation state into wizard state.
 * Manages platform content updates, thread completions, and generation progress.
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
	wizard: {
		setPlatformContent: (platform: PlatformType, content: string) => void;
		setPlatformProgress: (
			platform: PlatformType,
			status: GenerationStatus,
		) => void;
		setThreadContent: (
			platform: PlatformType,
			segments: { content: string; imageIndex?: number }[],
		) => void;
		generationComplete: () => void;
		generationFailed: () => void;
		setError: (error: string | null) => void;
	},
) {
	// Sync SSE platform completions into wizard state
	useEffect(() => {
		for (const [platform, content] of Object.entries(sse.platformContent)) {
			if (content) {
				wizard.setPlatformContent(platform as PlatformType, content);
				wizard.setPlatformProgress(platform as PlatformType, "done");
			}
		}
	}, [sse.platformContent, wizard]);

	// When SSE phase changes, update platform progress accordingly
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
	}, [sse.phase, state.selectedPlatforms, state.generationProgress, wizard]);

	// Sync SSE thread completions into wizard state
	useEffect(() => {
		for (const [platform, segments] of Object.entries(sse.threadContent)) {
			if (segments && segments.length > 0) {
				wizard.setThreadContent(platform as PlatformType, segments);
			}
		}
	}, [sse.threadContent, wizard]);

	// When SSE finishes, mark generation complete
	useEffect(() => {
		if (
			!sse.loading &&
			sse.phase === "idle" &&
			Object.keys(sse.platformContent).length > 0
		) {
			wizard.generationComplete();
		}
	}, [sse.loading, sse.phase, sse.platformContent, wizard]);

	// Sync SSE errors to wizard
	useEffect(() => {
		if (sse.error) {
			wizard.setError(sse.error);
			wizard.generationFailed();
		}
	}, [sse.error, wizard]);
}
