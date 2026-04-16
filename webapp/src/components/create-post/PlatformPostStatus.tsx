import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { PLATFORM_DISPLAY_NAMES, type PlatformType } from "@/types/platform";
import type { PlatformPost } from "@/types/post";

interface PlatformPostStatusProps {
	platformPost: PlatformPost;
}

function formatTimestamp(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function friendlyError(raw?: string): string {
	if (!raw) return "Something went wrong. Please try again.";
	if (raw.includes("401") || raw.includes("Unauthorized"))
		return "Authentication expired. Please reconnect this platform.";
	if (raw.includes("403") || raw.includes("Forbidden"))
		return "Permission denied. Check your platform app settings.";
	if (raw.includes("429") || raw.includes("rate"))
		return "Rate limit reached. Will retry automatically.";
	if (raw.includes("500") || raw.includes("characters"))
		return "Content exceeds the platform's character limit.";
	if (raw.includes("timeout") || raw.includes("Timeout"))
		return "Request timed out. Will retry automatically.";
	return "Something went wrong. Please try again.";
}

export function PlatformPostStatus({ platformPost }: PlatformPostStatusProps) {
	const pp = platformPost;
	const platformName =
		PLATFORM_DISPLAY_NAMES[pp.platform as PlatformType] ?? pp.platform;

	if (pp.status === "published" && pp.publishedAt) {
		return (
			<Alert variant="success" title={`Published to ${platformName}`}>
				{formatTimestamp(pp.publishedAt)}
			</Alert>
		);
	}

	if (pp.status === "failed") {
		const isAutoRetrying =
			pp.attemptCount < pp.maxAttempts && pp.nextRetryAt;
		return (
			<Alert
				variant="error"
				title={
					isAutoRetrying
						? `Retrying (${pp.attemptCount}/${pp.maxAttempts})`
						: "Publishing failed"
				}
			>
				{friendlyError(pp.errorMessage)}
			</Alert>
		);
	}

	if (pp.status === "publishing") {
		return (
			<Alert variant="info" title={`Publishing to ${platformName}`}>
				This may take a few moments.
			</Alert>
		);
	}

	if (pp.status === "pending") {
		return (
			<Alert variant="info" title="Queued">
				Waiting to publish to {platformName}.
			</Alert>
		);
	}

	return null;
}
