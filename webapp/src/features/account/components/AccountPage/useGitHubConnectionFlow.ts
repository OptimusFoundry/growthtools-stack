/**
 * useGitHubConnectionFlow Hook
 * Handles GitHub OAuth initialization and disconnection flows
 */

import { useCallback, useEffect } from "react";
import {
	type GitHubConnection,
	useGitHubConnection,
} from "@/hooks/useGitHubConnection";
import { useDisconnectGitHub } from "@/hooks/useDisconnectGitHub";
import { useInitGitHubOAuth } from "@/hooks/useInitGitHubOAuth";
import { useBannerCenter } from "@/proto-design-system/components/feedback/BannerCenter";

// ============================================================================
// Types
// ============================================================================

export interface GitHubConnectionFlowState {
	connection: GitHubConnection | null;
	loading: boolean;
	error: string | null;
}

export interface GitHubConnectionFlowHandlers {
	handleConnect: () => Promise<void>;
	handleDisconnect: () => Promise<void>;
	refetch: () => void;
}

// ============================================================================
// Hook
// ============================================================================

interface UseGitHubConnectionFlowParams {
	callbackStatus?: "connected" | "error" | null;
	onClearCallbackStatus?: () => void;
}

export function useGitHubConnectionFlow({
	callbackStatus,
	onClearCallbackStatus,
}: UseGitHubConnectionFlowParams): {
	state: GitHubConnectionFlowState;
	handlers: GitHubConnectionFlowHandlers;
} {
	const { connection, loading, refetch } = useGitHubConnection();
	const { initOAuth, loading: initLoading } = useInitGitHubOAuth();
	const { disconnect, loading: disconnectLoading } = useDisconnectGitHub();
	const { addBanner } = useBannerCenter();

	// One-shot banner after OAuth callback
	useEffect(() => {
		if (!callbackStatus) return;
		if (callbackStatus === "connected") {
			addBanner({
				type: "success",
				title: "GitHub connected",
				description: "We'll watch your selected repos for new commits.",
				dismissible: true,
			});
		} else {
			addBanner({
				type: "error",
				title: "GitHub connection failed",
				description: "Please try again.",
				dismissible: true,
			});
		}
		onClearCallbackStatus?.();
	}, [callbackStatus, addBanner, onClearCallbackStatus]);

	const handleConnect = useCallback(async () => {
		try {
			const url = await initOAuth();
			window.location.href = url;
		} catch {
			addBanner({
				type: "error",
				title: "Couldn't start GitHub OAuth",
				description: "Please try again.",
				dismissible: true,
			});
		}
	}, [initOAuth, addBanner]);

	const handleDisconnect = useCallback(async () => {
		try {
			await disconnect();
			refetch();
			addBanner({
				type: "success",
				title: "GitHub disconnected",
				dismissible: true,
			});
		} catch {
			addBanner({
				type: "error",
				title: "Couldn't disconnect GitHub",
				description: "Please try again.",
				dismissible: true,
			});
		}
	}, [disconnect, refetch, addBanner]);

	return {
		state: {
			connection,
			loading,
			error: null,
		},
		handlers: {
			handleConnect,
			handleDisconnect,
			refetch,
		},
	};
}
