/**
 * BlueskyConnectionModal Component
 * Modal for connecting BlueSky account with handle and app password
 */

import { memo, useCallback, useState } from "react";
import { useConnectBluesky } from "@/hooks/useConnectBluesky";
import { TextField } from "@/proto-design-system/components/forms/TextField/TextField";
import { Stack } from "@/proto-design-system/components/layout/Stack/Stack";
import { Modal } from "@/proto-design-system/components/overlays/Modal/Modal";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";

// ============================================================================
// Component
// ============================================================================

interface BlueskyConnectionModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	onError: (message: string) => void;
}

export const BlueskyConnectionModal = memo(function BlueskyConnectionModal({
	isOpen,
	onClose,
	onSuccess,
	onError,
}: BlueskyConnectionModalProps) {
	const { connectBluesky, loading } = useConnectBluesky();
	const [handle, setHandle] = useState("");
	const [appPassword, setAppPassword] = useState("");

	const handleSubmit = useCallback(async () => {
		if (!handle.trim() || !appPassword.trim()) return;

		try {
			await connectBluesky(handle.trim(), appPassword.trim());
			setHandle("");
			setAppPassword("");
			onClose();
			onSuccess();
		} catch {
			onError("Failed to connect BlueSky. Check your handle and app password.");
		}
	}, [handle, appPassword, connectBluesky, onClose, onSuccess, onError]);

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Connect BlueSky"
			description="Enter your BlueSky handle and app password to connect your account."
			size="sm"
			footer={
				<Stack direction="row" gap="sm" justify="end">
					<Button variant="ghost" onClick={onClose} disabled={loading}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={loading || !handle.trim() || !appPassword.trim()}
					>
						{loading ? "Connecting..." : "Connect"}
					</Button>
				</Stack>
			}
		>
			<Stack gap="md">
				<TextField
					label="Handle"
					value={handle}
					onChange={(e) => setHandle(e.target.value)}
					placeholder="yourname.bsky.social"
				/>
				<TextField
					label="App Password"
					type="password"
					value={appPassword}
					onChange={(e) => setAppPassword(e.target.value)}
					placeholder="xxxx-xxxx-xxxx-xxxx"
					helperText="Generate an app password at Settings > App Passwords on bsky.app"
				/>
			</Stack>
		</Modal>
	);
});

BlueskyConnectionModal.displayName = "BlueskyConnectionModal";
