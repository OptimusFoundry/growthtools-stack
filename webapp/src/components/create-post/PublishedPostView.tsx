import { Topbar } from "@/components/Layout/Topbar";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { MediaItem } from "@/types/media";
import type { PlatformType } from "@/types/platform";
import type { PlatformPost } from "@/types/post";
import styles from "./CreatePostWizard.module.scss";
import { InlinePostAnalytics } from "./InlinePostAnalytics";
import { PlatformPreviewTabs } from "./PlatformPreviewTabs";
import { PostPublishStatus } from "./PostPublishStatus";
import type { WizardState } from "./useCreatePostWizard";

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
 * Read-only detail page for published / partially_published posts. Literal
 * strip of the edit wizard page: same shell, same hero rhythm, same two-col
 * split, same right-pane "Review Content" heading over PlatformPreviewTabs.
 * Omits idea input, platform toggle, post config, base-content accordion, and
 * the edit/save/schedule/publish topbar actions — none of those apply once a
 * post has shipped. Adds InlinePostAnalytics below the publish status in the
 * left column.
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
			<div className={styles.page}>
				<header className={styles.header}>
					<div className={styles.headerInner}>
						<Stack direction="column" gap="0">
							<div className={styles.eyebrow}>{eyebrowLabel}</div>
							<h1 className={styles.title}>
								<em>Shipped.</em> Here's how it landed.
							</h1>
							<p className={styles.sub}>
								View your published post and see how each platform rendered it.
							</p>
						</Stack>
					</div>
				</header>

				<div className={styles.twoColumn}>
					<Stack gap="lg">
						<PostPublishStatus platformPosts={platformPosts} />
						<Stack gap="md">
							<Text as="h3" size="lg" weight="medium">
								Analytics
							</Text>
							<InlinePostAnalytics postId={postId} />
						</Stack>
					</Stack>

					<Stack gap="md">
						<Text as="h3" size="lg" weight="medium">
							Review Content
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
			</div>
		</>
	);
}
