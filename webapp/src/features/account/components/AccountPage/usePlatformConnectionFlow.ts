/**
 * usePlatformConnectionFlow Hook
 * Handles OAuth initialization, token-based connection, and disconnection flows
 */

import { useCallback, useState } from "react";
import { useConnectPlatform } from "@/hooks/useConnectPlatform";
import { useConnectWithToken } from "@/hooks/useConnectWithToken";
import { useDisconnectPlatform } from "@/hooks/useDisconnectPlatform";
import { useNotify } from "@/hooks/useNotify";
import { PLATFORM_DISPLAY_NAMES, type PlatformType } from "@/types/platform";

// ============================================================================
// Types
// ============================================================================

export interface PlatformConnectionFlowState {
	connectingPlatform: PlatformType | null;
	disconnectingId: string | null;
	blueskyModalOpen: boolean;
}

export interface PlatformConnectionFlowHandlers {
	handleConnect: (platform: PlatformType) => Promise<void>;
	handleDisconnect: (connectionId: string) => Promise<void>;
	setBlueskyModalOpen: (open: boolean) => void;
	setConnectingPlatform: (platform: PlatformType | null) => void;
	setDisconnectingId: (id: string | null) => void;
}

// ============================================================================
// Constants
// ============================================================================

const TOKEN_PLATFORMS = new Set<PlatformType>(["threads"]);

// ============================================================================
// Hook
// ============================================================================

interface UsePlatformConnectionFlowParams {
	onRefetch: () => void;
}

export function usePlatformConnectionFlow({
	onRefetch,
}: UsePlatformConnectionFlowParams): {
	state: PlatformConnectionFlowState;
	handlers: PlatformConnectionFlowHandlers;
} {
	const { connectPlatform } = useConnectPlatform();
	const { connectWithToken } = useConnectWithToken();
	const { disconnectPlatform } = useDisconnectPlatform();
	const { notify } = useNotify();

	const [connectingPlatform, setConnectingPlatform] =
		useState<PlatformType | null>(null);
	const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
	const [blueskyModalOpen, setBlueskyModalOpen] = useState(false);

	const handleConnect = useCallback(
		async (platform: PlatformType) => {
			if (platform === "bluesky") {
				setBlueskyModalOpen(true);
				return;
			}

			setConnectingPlatform(platform);
			try {
				if (TOKEN_PLATFORMS.has(platform)) {
					await connectWithToken(platform);
					setConnectingPlatform(null);
					onRefetch();
					notify({
						status: "success",
						title: `Connected ${PLATFORM_DISPLAY_NAMES[platform]}`,
					});
				} else {
					const response = await connectPlatform(platform);
					window.location.href = response.auth_url;
				}
			} catch (err: unknown) {
				const description =
					err instanceof Error && err.message.includes("already connected")
						? `${PLATFORM_DISPLAY_NAMES[platform]} is already connected.`
						: "Please try again.";
				notify({
					status: "error",
					title: `Couldn't connect ${PLATFORM_DISPLAY_NAMES[platform]}`,
					description,
				});
				setConnectingPlatform(null);
			}
		},
		[connectPlatform, connectWithToken, notify, onRefetch],
	);

	const handleDisconnect = useCallback(
		async (connectionId: string) => {
			setDisconnectingId(connectionId);
			try {
				await disconnectPlatform(connectionId);
				onRefetch();
				notify({ status: "success", title: "Platform disconnected" });
			} catch {
				notify({
					status: "error",
					title: "Couldn't disconnect platform",
					description: "Please try again.",
				});
			} finally {
				setDisconnectingId(null);
			}
		},
		[disconnectPlatform, notify, onRefetch],
	);

	return {
		state: {
			connectingPlatform,
			disconnectingId,
			blueskyModalOpen,
		},
		handlers: {
			handleConnect,
			handleDisconnect,
			setBlueskyModalOpen,
			setConnectingPlatform,
			setDisconnectingId,
		},
	};
}
