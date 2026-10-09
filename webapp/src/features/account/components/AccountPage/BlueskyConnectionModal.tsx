import {
	Alert,
	Button,
	Dialog,
	Stack,
	Text,
	TextField,
} from "@optimusfoundry/quiet";
import { memo, useCallback, useState } from "react";
import { useConnectBluesky } from "@/hooks/useConnectBluesky";

const CONNECT_ERROR =
	"Failed to connect BlueSky. Check your handle and app password.";

interface BlueskyConnectionModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

// Failure stays inline: an open Dialog makes the Toaster inert, so a toast would never be reachable.
export const BlueskyConnectionModal = memo(function BlueskyConnectionModal({
	isOpen,
	onClose,
	onSuccess,
}: BlueskyConnectionModalProps) {
	const { connectBluesky, loading } = useConnectBluesky();
	const [handle, setHandle] = useState("");
	const [appPassword, setAppPassword] = useState("");
	const [failed, setFailed] = useState(false);

	const handleClose = useCallback(() => {
		setFailed(false);
		onClose();
	}, [onClose]);

	const handleSubmit = useCallback(async () => {
		if (!handle.trim() || !appPassword.trim()) return;

		setFailed(false);
		try {
			await connectBluesky(handle.trim(), appPassword.trim());
			setHandle("");
			setAppPassword("");
			handleClose();
			onSuccess();
		} catch {
			setFailed(true);
		}
	}, [handle, appPassword, connectBluesky, handleClose, onSuccess]);

	return (
		<Dialog
			open={isOpen}
			onClose={handleClose}
			title="Connect BlueSky"
			size="sm"
			actions={
				<>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleClose}
						disabled={loading}
					>
						Cancel
					</Button>
					<Button
						variant="primary"
						size="sm"
						onClick={handleSubmit}
						loading={loading}
						disabled={!handle.trim() || !appPassword.trim()}
					>
						Connect
					</Button>
				</>
			}
		>
			<Stack gap="md">
				{failed && <Alert variant="error">{CONNECT_ERROR}</Alert>}
				<Text color="muted">
					Enter your BlueSky handle and app password to connect your account.
				</Text>
				<TextField
					size="sm"
					label="Handle"
					value={handle}
					onChange={(e) => setHandle(e.target.value)}
					placeholder="yourname.bsky.social"
				/>
				<TextField
					size="sm"
					label="App Password"
					type="password"
					value={appPassword}
					onChange={(e) => setAppPassword(e.target.value)}
					placeholder="xxxx-xxxx-xxxx-xxxx"
					helperText="Generate an app password at Settings > App Passwords on bsky.app"
				/>
			</Stack>
		</Dialog>
	);
});

BlueskyConnectionModal.displayName = "BlueskyConnectionModal";
