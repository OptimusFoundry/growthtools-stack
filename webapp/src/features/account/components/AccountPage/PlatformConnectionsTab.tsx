import {
	Badge,
	type BadgeProps,
	Button,
	Container,
	List,
	type ListProps,
	SectionHeader,
	Spinner,
	Stack,
	Tag,
	Text,
} from "@optimusfoundry/quiet";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { memo, useCallback, useEffect } from "react";
import { useNotify } from "@/hooks/useNotify";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import {
	PLATFORM_DISPLAY_NAMES,
	type PlatformConnection,
	type PlatformType,
} from "@/types/platform";
import { BlueskyConnectionModal } from "./BlueskyConnectionModal";
import { GitHubConnectionSection } from "./GitHubConnectionSection";
import styles from "./PlatformConnectionsTab.module.scss";
import { usePlatformConnectionFlow } from "./usePlatformConnectionFlow";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;
type ListItems = NonNullable<ListProps["items"]>;

const ENABLED_PLATFORMS: PlatformType[] = ["x", "bluesky", "threads"];

const PLATFORM_INFO: Record<
	string,
	{ description: string; icon: React.ReactNode }
> = {
	x: {
		description: "Post tweets and threads to your audience",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
				<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
			</svg>
		),
	},
	bluesky: {
		description: "Share posts on the decentralized network",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
				<path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.643 3.593 3.519 6.173 3.175-.044-.01-.089-.02-.133-.028 2.365.397 4.098 1.361 4.098 1.361-.063-.042-.126-.08-.189-.115C8.21 15.88 5.34 17.4 2.25 20.29c-.736.688-.066 1.9.825 2.148 1.26.35 4.002-.258 6.17-2.306-.076.175-.15.352-.22.532-.508 1.3-.087 2.087.395 2.337.727.376 2.396-.07 3.587-1.595-.33.867-.35 1.78.063 2.079.35.254 1.013.06 1.66-.343a9.6 9.6 0 0 0 1.353-1.093c.285-.28.55-.567.796-.86.246.293.511.58.796.86a9.6 9.6 0 0 0 1.353 1.093c.647.403 1.31.597 1.66.343.413-.299.393-1.212.063-2.079 1.191 1.525 2.86 1.971 3.587 1.595.482-.25.903-1.036.395-2.337-.07-.18-.144-.357-.22-.532 2.168 2.048 4.91 2.656 6.17 2.306.891-.248 1.561-1.46.825-2.148-3.09-2.89-5.96-4.41-8.323-5.63-.063.035-.126.073-.189.115 0 0 1.733-.964 4.098-1.361-.044.009-.089.018-.133.028 2.58.344 5.388-.532 6.173-3.175C23.622 9.418 24 4.458 24 3.768c0-.69-.139-1.861-.902-2.203-.659-.299-1.664-.62-4.3 1.24C16.046 4.747 13.087 8.686 12 10.8" />
			</svg>
		),
	},
	threads: {
		description: "Publish content to Meta's text platform",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
				<path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.042 1.647-1.613 1.617-3.593 1.09-4.798-.343-.783-.97-1.416-1.81-1.835a8.8 8.8 0 0 1-.153.698c-.206.758-.555 1.394-1.036 1.889a4.41 4.41 0 0 1-3.196 1.327c-2.126 0-3.934-1.16-4.428-2.843-.29-1 -.243-2.04.137-3.007.503-1.28 1.53-2.229 2.89-2.672.944-.307 1.993-.385 3.105-.23-.073-.94-.317-1.674-.727-2.183-.546-.678-1.394-1.022-2.522-1.022l-.083.002c-.987.02-1.785.324-2.373.908l-1.426-1.436C8.838 3.15 10.102 2.605 11.63 2.572l.12-.001c1.667 0 2.99.52 3.93 1.548.819.896 1.303 2.126 1.441 3.656.571.103 1.104.26 1.594.473 1.29.56 2.296 1.486 2.91 2.677.78 1.512.905 4.225-1.227 6.316-1.77 1.736-3.96 2.594-7.04 2.616ZM12.09 14.6c.6 0 1.04-.183 1.382-.576.29-.332.49-.795.595-1.378a5 5 0 0 0 .08-.756c-.483-.042-.98-.05-1.49-.023-1.378.075-2.442.658-2.717 1.49-.131.39-.12.8.026 1.15.256.616.939.993 1.778 1.028.118.043.233.057.346.065Z" />
			</svg>
		),
	},
};

const STATUS_BADGE: Record<
	PlatformConnection["status"],
	{ variant: BadgeVariant; label: string }
> = {
	active: { variant: "success", label: "Connected" },
	expired: { variant: "warning", label: "Expired" },
	revoked: { variant: "secondary", label: "Revoked" },
	error: { variant: "error", label: "Error" },
};

const NEEDS_RECONNECT = new Set<PlatformConnection["status"]>([
	"expired",
	"error",
]);

function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

interface PlatformItemParams {
	platform: PlatformType;
	connection: PlatformConnection | null;
	connecting: boolean;
	disconnecting: boolean;
	onConnect: (platform: PlatformType) => void;
	onDisconnect: (connectionId: string) => void;
}

function buildPlatformItem({
	platform,
	connection,
	connecting,
	disconnecting,
	onConnect,
	onDisconnect,
}: PlatformItemParams): ListItems[number] {
	const info = PLATFORM_INFO[platform];
	const name = PLATFORM_DISPLAY_NAMES[platform];
	const badge = connection ? STATUS_BADGE[connection.status] : null;
	const needsReconnect = connection
		? NEEDS_RECONNECT.has(connection.status)
		: false;
	const scopes = connection?.scopes ?? [];
	const meta = connection
		? `@${connection.platformUserId} · Connected ${formatDate(connection.connectedAt)}`
		: info?.description;

	return {
		id: platform,
		leading: <span className={styles.platformIcon}>{info?.icon}</span>,
		primary: (
			<span className={styles.nameLine}>
				<Text weight="semibold" as="span">
					{name}
				</Text>
				{badge && (
					<Badge variant={badge.variant} size="sm">
						{badge.label}
					</Badge>
				)}
			</span>
		),
		secondary: (
			<span className={styles.meta}>
				{meta && <span>{meta}</span>}
				{scopes.length > 0 && (
					<span className={styles.scopes}>
						{scopes.map((scope) => (
							<Tag key={scope} size="sm">
								{scope}
							</Tag>
						))}
					</span>
				)}
			</span>
		),
		trailing: (
			<span className={styles.actions}>
				{connection ? (
					<>
						{needsReconnect && (
							<Button
								variant="primary"
								size="sm"
								aria-label={`Reconnect ${name}`}
								onClick={() => onConnect(platform)}
								loading={connecting}
							>
								Reconnect
							</Button>
						)}
						<Button
							variant="ghost"
							size="sm"
							aria-label={`Disconnect ${name}`}
							onClick={() => onDisconnect(connection.id)}
							loading={disconnecting}
						>
							Disconnect
						</Button>
					</>
				) : (
					<Button
						variant="secondary"
						size="sm"
						aria-label={`Connect ${name}`}
						onClick={() => onConnect(platform)}
						loading={connecting}
					>
						Connect
					</Button>
				)}
			</span>
		),
	};
}

export const PlatformConnectionsTab = memo(function PlatformConnectionsTab() {
	const { connections, loading, error, refetch } = usePlatformConnections();
	const { notify } = useNotify();
	const { state, handlers } = usePlatformConnectionFlow({ onRefetch: refetch });
	const { connectingPlatform, disconnectingId, blueskyModalOpen } = state;
	const { handleConnect, handleDisconnect, setBlueskyModalOpen } = handlers;

	const search = useSearch({ from: "/account" });
	const navigate = useNavigate();
	const githubCallbackStatus =
		(search as { github?: "connected" | "error" }).github ?? null;

	const clearGitHubCallback = useCallback(() => {
		navigate({
			to: "/account",
			search: { tab: "platforms" },
			replace: true,
		});
	}, [navigate]);

	const isNotFoundError =
		error?.toLowerCase().includes("not found") ||
		error?.toLowerCase().includes("404");

	useEffect(() => {
		if (error && !isNotFoundError) {
			notify({
				status: "error",
				title: "Couldn't load platform connections",
				description: error,
			});
		}
	}, [error, isNotFoundError, notify]);

	const connectionMap = new Map(connections.map((c) => [c.platform, c]));
	const connectedCount = ENABLED_PLATFORMS.filter((p) =>
		connectionMap.has(p),
	).length;

	if (loading) {
		return (
			<Container size="md" padded={false} className={styles.container}>
				<Stack align="center" justify="center" className={styles.loadingState}>
					<Spinner size="lg" />
				</Stack>
			</Container>
		);
	}

	const items = ENABLED_PLATFORMS.map((platform) => {
		const connection = connectionMap.get(platform) ?? null;
		return buildPlatformItem({
			platform,
			connection,
			connecting: connectingPlatform === platform,
			disconnecting: connection !== null && disconnectingId === connection.id,
			onConnect: handleConnect,
			onDisconnect: handleDisconnect,
		});
	});

	return (
		<Container size="md" padded={false} className={styles.container}>
			<Stack gap="xl">
				<section aria-label="Outbound">
					<Stack gap="lg">
						<SectionHeader
							size="sm"
							as="h2"
							eyebrow={`${connectedCount} of ${ENABLED_PLATFORMS.length} CONNECTED`}
							title="Platforms"
						/>
						<List size="sm" divided items={items} />
					</Stack>
				</section>

				<section aria-label="Inbound">
					<Stack gap="lg">
						<SectionHeader
							size="sm"
							as="h2"
							eyebrow="CONTENT ORIGIN"
							title="Sources"
						/>
						<GitHubConnectionSection
							callbackStatus={githubCallbackStatus}
							onClearCallbackStatus={clearGitHubCallback}
						/>
					</Stack>
				</section>
			</Stack>

			<BlueskyConnectionModal
				isOpen={blueskyModalOpen}
				onClose={() => setBlueskyModalOpen(false)}
				onSuccess={refetch}
			/>
		</Container>
	);
});

PlatformConnectionsTab.displayName = "PlatformConnectionsTab";
