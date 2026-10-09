import {
	Col,
	Grid,
	PageHero,
	SectionHeader,
	Stack,
} from "@optimusfoundry/quiet";
import { PlatformPreviewTabs } from "@/components/create-post/PlatformPreviewTabs";
import { PostPublishStatus } from "@/components/create-post/PostPublishStatus";
import type { WizardState } from "@/components/create-post/useCreatePostWizard";
import { Topbar } from "@/components/Layout/Topbar";
import { InlinePostAnalytics } from "@/features/posts/components/InlinePostAnalytics/component";
import type { MediaItem } from "@/types/media";
import type { PlatformType } from "@/types/platform";
import type { PlatformPost } from "@/types/post";
import { trimTrailingPeriod } from "@/utils/trimTrailingPeriod";
import styles from "./component.module.scss";

interface PublishedPostViewProps {
	postId: string;
	status: "published" | "partially_published";
	contentType: WizardState["contentType"];
	selectedPlatforms: PlatformType[];
	platformContent: Partial<Record<PlatformType, string>>;
	threadContent: WizardState["threadContent"];
	uploadedMedia: MediaItem[];
	platformPosts: PlatformPost[];
}

/**
 * Read-only detail page for published / partially_published posts: the edit
 * wizard's two-column split without its inputs or topbar actions, plus
 * InlinePostAnalytics below the publish status.
 */
export function PublishedPostView({
	postId,
	status,
	contentType,
	selectedPlatforms,
	platformContent,
	threadContent,
	uploadedMedia,
	platformPosts,
}: PublishedPostViewProps) {
	const breadcrumbs = [
		{ label: "Posts", href: "/posts" as const },
		{ label: "View" },
	];

	const eyebrowLabel = `Composer · ${status === "partially_published" ? "partially published" : "published"}`;

	return (
		<>
			<Topbar breadcrumbs={breadcrumbs} />
			<Stack gap="xl">
				<PageHero
					size="md"
					ruled={false}
					className={styles.hero}
					eyebrow={eyebrowLabel}
					title={trimTrailingPeriod("Shipped. Here's how it landed.")}
					description="View your published post and see how each platform rendered it."
				/>

				<Grid columns={12} gap="lg">
					<Col span={6}>
						<Stack gap="lg">
							<PostPublishStatus platformPosts={platformPosts} />
							<Stack gap="sm">
								<SectionHeader size="sm" as="h2" title="Analytics" />
								<InlinePostAnalytics postId={postId} />
							</Stack>
						</Stack>
					</Col>

					<Col span={6}>
						<Stack gap="sm">
							<SectionHeader size="sm" as="h2" title="Review Content" />
							<PlatformPreviewTabs
								selectedPlatforms={selectedPlatforms}
								platformContent={platformContent}
								threadContent={threadContent}
								contentType={contentType}
								uploadedMedia={uploadedMedia}
								readOnly
							/>
						</Stack>
					</Col>
				</Grid>
			</Stack>
		</>
	);
}
