/**
 * useGitHubConnectionFlow Hook
 * Handles GitHub OAuth initialization and disconnection flows
 */

import { useCallback, useEffect } from "react";
import { useDisconnectGitHub } from "@/hooks/useDisconnectGitHub";
import {
	type GitHubConnection,
	useGitHubConnection,
} from "@/hooks/useGitHubConnection";
import { useInitGitHubOAuth } from "@/hooks/useInitGitHubOAuth";
import { useNotify } from "@/hooks/useNotify";

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
	const { initOAuth } = useInitGitHubOAuth();
	const { disconnect } = useDisconnectGitHub();
	const { notify } = useNotify();

	useEffect(() => {
		if (!callbackStatus) return;
		if (callbackStatus === "connected") {
			notify({
				status: "success",
				title: "GitHub connected",
				description: "We'll watch your selected repos for new commits.",
			});
		} else {
			notify({
				status: "error",
				title: "GitHub connection failed",
				description: "Please try again.",
			});
		}
		onClearCallbackStatus?.();
	}, [callbackStatus, notify, onClearCallbackStatus]);

	const handleConnect = useCallback(async () => {
		try {
			const url = await initOAuth();
			window.location.href = url;
		} catch {
			notify({
				status: "error",
				title: "Couldn't start GitHub OAuth",
				description: "Please try again.",
			});
		}
	}, [initOAuth, notify]);

	const handleDisconnect = useCallback(async () => {
		try {
			await disconnect();
			refetch();
			notify({ status: "success", title: "GitHub disconnected" });
		} catch {
			notify({
				status: "error",
				title: "Couldn't disconnect GitHub",
				description: "Please try again.",
			});
		}
	}, [disconnect, refetch, notify]);

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
