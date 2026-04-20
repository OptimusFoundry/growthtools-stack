import type { ThreadSegment } from "@/hooks/useSSEContentGenerate";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { MediaItem } from "@/types/media";
import type { PlatformType } from "@/types/platform";
import styles from "./CreatePostWizard.module.scss";
import { InlinePostAnalytics } from "./InlinePostAnalytics";
import { PlatformPreviewTabs } from "./PlatformPreviewTabs";

export interface PublishedPostPanelProps {
	postId: string;
	selectedPlatforms: PlatformType[];
	platformContent: Partial<Record<PlatformType, string>>;
	threadContent: Partial<Record<PlatformType, ThreadSegment[]>>;
	contentType: "text" | "thread";
	uploadedMedia: MediaItem[];
}

/**
 * Right-pane content shown when a post is in `published` or
 * `partially_published` state. Replaces base content (no longer useful once
 * shipped) with per-platform analytics, and renders the platform previews
 * read-only beneath so the user can still see what was posted.
 */
export function PublishedPostPanel({
	postId,
	selectedPlatforms,
	platformContent,
	threadContent,
	contentType,
	uploadedMedia,
}: PublishedPostPanelProps) {
	return (
		<div className={styles.previewPanel}>
			<Stack gap="md">
				<Text as="h3" size="lg" weight="medium">
					Analytics
				</Text>
				<InlinePostAnalytics postId={postId} />

				<Text as="h3" size="lg" weight="medium">
					What shipped
				</Text>
				<PlatformPreviewTabs
					selectedPlatforms={selectedPlatforms}
					platformContent={platformContent}
					threadContent={threadContent}
					contentType={contentType}
					uploadedMedia={uploadedMedia}
					readOnly
				/>
			</Stack>
		</div>
	);
}
