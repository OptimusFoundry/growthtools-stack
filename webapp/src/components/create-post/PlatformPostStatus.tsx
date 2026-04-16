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

export function PlatformPostStatus({ platformPost }: PlatformPostStatusProps) {
	const pp = platformPost;
	const platformName =
		PLATFORM_DISPLAY_NAMES[pp.platform as PlatformType] ?? pp.platform;

	if (pp.status === "published" && pp.publishedAt) {
		return (
			<Alert variant="success" title="Published successfully">
				This post was published to {platformName} on{" "}
				{formatTimestamp(pp.publishedAt)}.
			</Alert>
		);
	}

	if (pp.status === "failed") {
		const isRetrying = pp.attemptCount < pp.maxAttempts && pp.nextRetryAt;
		return (
			<Alert
				variant="error"
				title={isRetrying ? "Publishing failed — retrying" : "Publishing failed"}
			>
				{pp.errorMessage
					? pp.errorMessage
					: `Failed to publish to ${platformName}.`}
				{isRetrying &&
					` Attempt ${pp.attemptCount} of ${pp.maxAttempts}. Will retry automatically.`}
			</Alert>
		);
	}

	if (pp.status === "publishing") {
		return (
			<Alert variant="info" title="Publishing in progress">
				Your post is being published to {platformName}. This may take a few
				moments.
			</Alert>
		);
	}

	if (pp.status === "pending") {
		return (
			<Alert variant="info" title="Pending">
				This post is queued for publishing to {platformName}.
			</Alert>
		);
	}

	return null;
}
