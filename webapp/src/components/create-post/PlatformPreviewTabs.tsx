import type { ThreadSegment } from "@/hooks/useSSEContentGenerate";
import {
	Tab,
	TabList,
	TabPanel,
	TabPanels,
	Tabs,
} from "@/proto-design-system/components/navigation/Tabs/Tabs";
import type { MediaItem } from "@/types/media";
import { PLATFORM_DISPLAY_NAMES, type PlatformType } from "@/types/platform";
import styles from "./CreatePostWizard.module.scss";
import { PlatformPreviewCard } from "./PlatformPreviewCard";

export interface PlatformPreviewTabsProps {
	selectedPlatforms: PlatformType[];
	platformContent: Partial<Record<PlatformType, string>>;
	threadContent: Partial<Record<PlatformType, ThreadSegment[]>>;
	contentType: "text" | "thread";
	uploadedMedia: MediaItem[];
	readOnly?: boolean;
	/** Scale the preview cards down to reclaim rail space. Default 0.9. */
	compact?: boolean;
	onUpdateContent?: (platform: PlatformType, content: string) => void;
	onUpdateThreadSegment?: (
		platform: PlatformType,
		index: number,
		content: string,
	) => void;
}

/**
 * Tabbed preview of what will / did ship to each platform. Shared by the
 * compose-review flow and the published-post panel so both views stay visually
 * identical.
 */
export function PlatformPreviewTabs({
	selectedPlatforms,
	platformContent,
	threadContent,
	contentType,
	uploadedMedia,
	readOnly = false,
	compact = true,
	onUpdateContent,
	onUpdateThreadSegment,
}: PlatformPreviewTabsProps) {
	const isThread = contentType === "thread";

	return (
		<Tabs defaultTab={selectedPlatforms[0]}>
			<TabList aria-label="Platform previews">
				{selectedPlatforms.map((platform) => (
					<Tab key={platform} id={platform}>
						{PLATFORM_DISPLAY_NAMES[platform]}
					</Tab>
				))}
			</TabList>
			<TabPanels>
				{selectedPlatforms.map((platform) => (
					<TabPanel key={platform} id={platform}>
						<div className={styles.tabPanelContent}>
							<div className={compact ? styles.previewScale : undefined}>
								<PlatformPreviewCard
									platform={platform}
									content={platformContent[platform] ?? ""}
									threadSegments={threadContent[platform]}
									isThread={isThread}
									uploadedMedia={uploadedMedia}
									readOnly={readOnly}
									onContentChange={(content) =>
										onUpdateContent?.(platform, content)
									}
									onThreadSegmentChange={(index, content) =>
										onUpdateThreadSegment?.(platform, index, content)
									}
								/>
							</div>
						</div>
					</TabPanel>
				))}
			</TabPanels>
		</Tabs>
	);
}
