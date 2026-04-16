/**
 * PlatformConnectionsTab Component
 * Connect and disconnect social media platforms
 */

import { memo, useCallback, useState } from "react";
import { useConnectBluesky } from "@/hooks/useConnectBluesky";
import { useConnectPlatform } from "@/hooks/useConnectPlatform";
import { useConnectWithToken } from "@/hooks/useConnectWithToken";
import { useDisconnectPlatform } from "@/hooks/useDisconnectPlatform";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Card, CardBody } from "@/proto-design-system/components/layout/Card";
import { Container } from "@/proto-design-system/components/layout/Container";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Modal } from "@/proto-design-system/components/overlays/Modal";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Tag } from "@/proto-design-system/components/primitives/Tag";
import { Text } from "@/proto-design-system/components/primitives/Text";
import {
	PLATFORM_DISPLAY_NAMES,
	type PlatformConnection,
	type PlatformType,
} from "@/types/platform";
import styles from "./PlatformConnectionsTab.module.scss";

// ============================================================================
// Constants
// ============================================================================

const ENABLED_PLATFORMS: PlatformType[] = ["x", "bluesky", "threads"];
const TOKEN_PLATFORMS = new Set<PlatformType>(["threads"]);

const PLATFORM_INFO: Record<
	string,
	{ description: string; icon: React.ReactNode }
> = {
	x: {
		description: "Post tweets and threads to your audience",
		icon: (
			<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
				<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
			</svg>
		),
	},
	bluesky: {
		description: "Share posts on the decentralized network",
		icon: (
			<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
				<path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.643 3.593 3.519 6.173 3.175-.044-.01-.089-.02-.133-.028 2.365.397 4.098 1.361 4.098 1.361-.063-.042-.126-.08-.189-.115C8.21 15.88 5.34 17.4 2.25 20.29c-.736.688-.066 1.9.825 2.148 1.26.35 4.002-.258 6.17-2.306-.076.175-.15.352-.22.532-.508 1.3-.087 2.087.395 2.337.727.376 2.396-.07 3.587-1.595-.33.867-.35 1.78.063 2.079.35.254 1.013.06 1.66-.343a9.6 9.6 0 0 0 1.353-1.093c.285-.28.55-.567.796-.86.246.293.511.58.796.86a9.6 9.6 0 0 0 1.353 1.093c.647.403 1.31.597 1.66.343.413-.299.393-1.212.063-2.079 1.191 1.525 2.86 1.971 3.587 1.595.482-.25.903-1.036.395-2.337-.07-.18-.144-.357-.22-.532 2.168 2.048 4.91 2.656 6.17 2.306.891-.248 1.561-1.46.825-2.148-3.09-2.89-5.96-4.41-8.323-5.63-.063.035-.126.073-.189.115 0 0 1.733-.964 4.098-1.361-.044.009-.089.018-.133.028 2.58.344 5.388-.532 6.173-3.175C23.622 9.418 24 4.458 24 3.768c0-.69-.139-1.861-.902-2.203-.659-.299-1.664-.62-4.3 1.24C16.046 4.747 13.087 8.686 12 10.8" />
			</svg>
		),
	},
	threads: {
		description: "Publish content to Meta's text platform",
		icon: (
			<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
				<path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.042 1.647-1.613 1.617-3.593 1.09-4.798-.343-.783-.97-1.416-1.81-1.835a8.8 8.8 0 0 1-.153.698c-.206.758-.555 1.394-1.036 1.889a4.41 4.41 0 0 1-3.196 1.327c-2.126 0-3.934-1.16-4.428-2.843-.29-1 -.243-2.04.137-3.007.503-1.28 1.53-2.229 2.89-2.672.944-.307 1.993-.385 3.105-.23-.073-.94-.317-1.674-.727-2.183-.546-.678-1.394-1.022-2.522-1.022l-.083.002c-.987.02-1.785.324-2.373.908l-1.426-1.436C8.838 3.15 10.102 2.605 11.63 2.572l.12-.001c1.667 0 2.99.52 3.93 1.548.819.896 1.303 2.126 1.441 3.656.571.103 1.104.26 1.594.473 1.29.56 2.296 1.486 2.91 2.677.78 1.512.905 4.225-1.227 6.316-1.77 1.736-3.96 2.594-7.04 2.616ZM12.09 14.6c.6 0 1.04-.183 1.382-.576.29-.332.49-.795.595-1.378a5 5 0 0 0 .08-.756c-.483-.042-.98-.05-1.49-.023-1.378.075-2.442.658-2.717 1.49-.131.39-.12.8.026 1.15.256.616.939.993 1.778 1.028.118.043.233.057.346.065Z" />
			</svg>
		),
	},
};

const STATUS_BADGE_VARIANT: Record<
	PlatformConnection["status"],
	"success" | "warning" | "error" | "secondary"
> = {
	active: "success",
	expired: "warning",
	revoked: "secondary",
	error: "error",
};

function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatScope(scope: string): string {
	return scope.replace(/[._]/g, " ");
}

// ============================================================================
// Connected Platform Card (rich bento)
// ============================================================================

interface ConnectedCardProps {
	connection: PlatformConnection;
	onDisconnect: (connectionId: string) => void;
	disconnecting: boolean;
}

const ConnectedCard = memo(function ConnectedCard({
	connection,
	onDisconnect,
	disconnecting,
}: ConnectedCardProps) {
	return (
		<Card variant="outlined">
			<CardBody>
				<div className={styles.connectedCard}>
					<div className={styles.connectedCardHeader}>
						<Stack direction="row" gap="sm" align="center">
							<div className={styles.connectedCardIcon}>
								{PLATFORM_INFO[connection.platform]?.icon}
							</div>
							<Stack gap="xs">
								<Text size="lg" weight="semibold">
									{PLATFORM_DISPLAY_NAMES[connection.platform as PlatformType]}
								</Text>
								{connection.displayName && (
									<Text size="sm" color="secondary">
										{connection.displayName}
									</Text>
								)}
							</Stack>
						</Stack>
						<Badge variant={STATUS_BADGE_VARIANT[connection.status]} size="sm">
							{connection.status}
						</Badge>
					</div>

					<div className={styles.connectedCardMeta}>
						<div className={styles.metaItem}>
							<Text size="xs" color="secondary">
								Username
							</Text>
							<Text size="sm" weight="medium">
								@{connection.platformUserId}
							</Text>
						</div>
						<div className={styles.metaItem}>
							<Text size="xs" color="secondary">
								Connected
							</Text>
							<Text size="sm" weight="medium">
								{formatDate(connection.connectedAt)}
							</Text>
						</div>
						{connection.scopes?.length > 0 && (
							<div className={`${styles.metaItem} ${styles.metaItemFullRow}`}>
								<Text size="xs" color="secondary">
									Permissions
								</Text>
								<div className={styles.scopeTags}>
									{connection.scopes.map((scope) => (
										<Tag key={scope} size="sm" variant="secondary">
											{formatScope(scope)}
										</Tag>
									))}
								</div>
							</div>
						)}
					</div>

					<div className={styles.connectedCardFooter}>
						<Button
							variant="destructive"
							size="sm"
							onClick={() => onDisconnect(connection.id)}
							disabled={disconnecting}
						>
							{disconnecting ? "Disconnecting..." : "Disconnect"}
						</Button>
					</div>
				</div>
			</CardBody>
		</Card>
	);
});

ConnectedCard.displayName = "ConnectedCard";

// ============================================================================
// Available Platform Card (compact)
// ============================================================================

interface AvailableCardProps {
	platform: PlatformType;
	onConnect: (platform: PlatformType) => void;
	connecting: boolean;
}

const AvailableCard = memo(function AvailableCard({
	platform,
	onConnect,
	connecting,
}: AvailableCardProps) {
	const info = PLATFORM_INFO[platform];

	return (
		<Card variant="outlined">
			<CardBody>
				<div className={styles.availableCard}>
					<div className={styles.availableCardIcon}>{info?.icon}</div>
					<Stack gap="xs" className={styles.availableCardContent}>
						<Text weight="medium">{PLATFORM_DISPLAY_NAMES[platform]}</Text>
						{info?.description && (
							<Text size="xs" color="secondary">
								{info.description}
							</Text>
						)}
					</Stack>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => onConnect(platform)}
						disabled={connecting}
					>
						{connecting ? "Connecting..." : "Connect"}
					</Button>
				</div>
			</CardBody>
		</Card>
	);
});

AvailableCard.displayName = "AvailableCard";

// ============================================================================
// BlueSky Modal
// ============================================================================

interface BlueskyModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	onError: (message: string) => void;
}

const BlueskyModal = memo(function BlueskyModal({
	isOpen,
	onClose,
	onSuccess,
	onError,
}: BlueskyModalProps) {
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

BlueskyModal.displayName = "BlueskyModal";

// ============================================================================
// Main Component
// ============================================================================

export const PlatformConnectionsTab = memo(function PlatformConnectionsTab() {
	const { connections, loading, error, refetch } = usePlatformConnections();
	const { connectPlatform, loading: connectLoading } = useConnectPlatform();
	const { connectWithToken, loading: tokenLoading } = useConnectWithToken();
	const { disconnectPlatform, loading: disconnectLoading } =
		useDisconnectPlatform();
	const [actionError, setActionError] = useState<string | null>(null);
	const [connectingPlatform, setConnectingPlatform] =
		useState<PlatformType | null>(null);
	const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
	const [blueskyModalOpen, setBlueskyModalOpen] = useState(false);

	const connectionMap = new Map(connections.map((c) => [c.platform, c]));
	const connectedPlatforms = ENABLED_PLATFORMS.filter((p) =>
		connectionMap.has(p),
	);
	const availablePlatforms = ENABLED_PLATFORMS.filter(
		(p) => !connectionMap.has(p),
	);

	const handleConnect = useCallback(
		async (platform: PlatformType) => {
			setActionError(null);

			if (platform === "bluesky") {
				setBlueskyModalOpen(true);
				return;
			}

			setConnectingPlatform(platform);
			try {
				if (TOKEN_PLATFORMS.has(platform)) {
					await connectWithToken(platform);
					setConnectingPlatform(null);
					refetch();
				} else {
					const response = await connectPlatform(platform);
					window.location.href = response.auth_url;
				}
			} catch (err: unknown) {
				const message =
					err instanceof Error && err.message.includes("already connected")
						? `${PLATFORM_DISPLAY_NAMES[platform]} is already connected.`
						: `Failed to connect ${PLATFORM_DISPLAY_NAMES[platform]}. Please try again.`;
				setActionError(message);
				setConnectingPlatform(null);
			}
		},
		[connectPlatform, connectWithToken, refetch],
	);

	const handleDisconnect = useCallback(
		async (connectionId: string) => {
			setActionError(null);
			setDisconnectingId(connectionId);
			try {
				await disconnectPlatform(connectionId);
				refetch();
			} catch {
				setActionError("Failed to disconnect platform. Please try again.");
			} finally {
				setDisconnectingId(null);
			}
		},
		[disconnectPlatform, refetch],
	);

	if (loading) {
		return (
			<Container size="lg" padded={false} className={styles.container}>
				<Stack align="center" justify="center" className={styles.loadingState}>
					<Spinner size="lg" />
				</Stack>
			</Container>
		);
	}

	const isNotFoundError =
		error?.toLowerCase().includes("not found") ||
		error?.toLowerCase().includes("404");

	if (error && !isNotFoundError) {
		return (
			<Container size="lg" padded={false} className={styles.container}>
				<Alert variant="error" title="Error">
					{error}
				</Alert>
			</Container>
		);
	}

	return (
		<Container size="lg" padded={false} className={styles.container}>
			<Stack gap="xl">
				{actionError && (
					<Alert
						variant="error"
						dismissible
						onDismiss={() => setActionError(null)}
					>
						{actionError}
					</Alert>
				)}

				{/* Connected Platforms */}
				{connectedPlatforms.length > 0 && (
					<Stack gap="md">
						<Stack gap="xs">
							<Text as="h2" size="xl" weight="semibold">
								Connected Platforms
							</Text>
							<Text size="md" color="secondary">
								Manage your active platform connections
							</Text>
						</Stack>
						<div className={styles.connectedGrid}>
							{connectedPlatforms.map((platform) => {
								const conn = connectionMap.get(platform)!;
								return (
									<ConnectedCard
										key={platform}
										connection={conn}
										onDisconnect={handleDisconnect}
										disconnecting={
											disconnectLoading && disconnectingId === conn.id
										}
									/>
								);
							})}
						</div>
					</Stack>
				)}

				{/* Available Platforms */}
				{availablePlatforms.length > 0 && (
					<Stack gap="md">
						<Stack gap="xs">
							<Text as="h2" size="xl" weight="semibold">
								Add a Platform
							</Text>
							<Text size="md" color="secondary">
								Connect more accounts to expand your reach
							</Text>
						</Stack>
						<div className={styles.availableGrid}>
							{availablePlatforms.map((platform) => (
								<AvailableCard
									key={platform}
									platform={platform}
									onConnect={handleConnect}
									connecting={
										(connectLoading || tokenLoading) &&
										connectingPlatform === platform
									}
								/>
							))}
						</div>
					</Stack>
				)}

				{connectedPlatforms.length === 0 && availablePlatforms.length === 0 && (
					<Text color="secondary">No platforms available.</Text>
				)}
			</Stack>

			<BlueskyModal
				isOpen={blueskyModalOpen}
				onClose={() => setBlueskyModalOpen(false)}
				onSuccess={refetch}
				onError={setActionError}
			/>
		</Container>
	);
});

PlatformConnectionsTab.displayName = "PlatformConnectionsTab";
