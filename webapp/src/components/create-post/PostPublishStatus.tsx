import { AlertCircle, CheckCircle, Clock, Loader, RefreshCw } from "lucide-react";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { PLATFORM_DISPLAY_NAMES, type PlatformType } from "@/types/platform";
import type { PlatformPost } from "@/types/post";
import { getPlatformIcon } from "@/utils/platformIcons";
import styles from "./PostPublishStatus.module.scss";

interface PostPublishStatusProps {
	platformPosts: PlatformPost[];
	onRetry?: () => void;
	retrying?: boolean;
}

function formatTimestamp(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function friendlyError(raw?: string): string {
	if (!raw) return "Something went wrong";
	if (raw.includes("401") || raw.includes("Unauthorized"))
		return "Auth expired — reconnect platform";
	if (raw.includes("403") || raw.includes("Forbidden"))
		return "Permission denied";
	if (raw.includes("429") || raw.includes("rate"))
		return "Rate limited — will retry";
	if (raw.includes("500") || raw.includes("characters"))
		return "Content too long for platform";
	if (raw.includes("timeout") || raw.includes("Timeout"))
		return "Timed out — will retry";
	return "Something went wrong";
}

function StatusIcon({ status }: { status: string }) {
	switch (status) {
		case "published":
			return <CheckCircle size={16} className={styles.iconSuccess} />;
		case "failed":
			return <AlertCircle size={16} className={styles.iconError} />;
		case "publishing":
			return <Loader size={16} className={styles.iconSpinning} />;
		default:
			return <Clock size={16} className={styles.iconMuted} />;
	}
}

export function PostPublishStatus({
	platformPosts,
	onRetry,
	retrying,
}: PostPublishStatusProps) {
	if (platformPosts.length === 0) return null;

	const hasFailed = platformPosts.some(
		(pp) => pp.status === "failed" && pp.attemptCount >= pp.maxAttempts,
	);

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<Text size="sm" weight="medium">
					Publish Status
				</Text>
				{hasFailed && onRetry && (
					<Button
						variant="secondary"
						size="sm"
						onClick={onRetry}
						isLoading={retrying}
						leftIcon={<RefreshCw size={14} />}
					>
						Retry failed
					</Button>
				)}
			</div>
			<div className={styles.list}>
				{platformPosts.map((pp) => {
					const platformName =
						PLATFORM_DISPLAY_NAMES[pp.platform as PlatformType] ?? pp.platform;
					return (
						<div key={pp.id} className={styles.row}>
							<div className={styles.platform}>
								<span className={styles.platformIcon}>
									{getPlatformIcon(pp.platform, 16)}
								</span>
								<Text size="sm">{platformName}</Text>
							</div>
							<div className={styles.status}>
								<StatusIcon status={pp.status} />
								{pp.status === "published" && pp.publishedAt && (
									<Text size="xs" color="secondary">
										{formatTimestamp(pp.publishedAt)}
									</Text>
								)}
								{pp.status === "failed" && (
									<Text size="xs" color="secondary">
										{friendlyError(pp.errorMessage)}
									</Text>
								)}
								{pp.status === "publishing" && (
									<Text size="xs" color="secondary">
										Publishing...
									</Text>
								)}
								{pp.status === "pending" && (
									<Text size="xs" color="secondary">
										Queued
									</Text>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
