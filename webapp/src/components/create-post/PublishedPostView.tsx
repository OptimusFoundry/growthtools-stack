import type { ReactNode } from "react";
import { Topbar } from "@/components/Layout/Topbar";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Text } from "@/proto-design-system/components/primitives/Text";
import pageStyles from "@/routes/page.module.scss";
import type { MediaItem } from "@/types/media";
import type { PlatformType } from "@/types/platform";
import type { PlatformPost } from "@/types/post";
import { InlinePostAnalytics } from "./InlinePostAnalytics";
import { PlatformPreviewTabs } from "./PlatformPreviewTabs";
import { PostPublishStatus } from "./PostPublishStatus";
import styles from "./PublishedPostView.module.scss";
import type { WizardState } from "./useCreatePostWizard";

interface PublishedPostViewProps {
	postId: string;
	status: "published" | "partially_published";
	blurb: string;
	contentType: WizardState["contentType"];
	selectedPlatforms: PlatformType[];
	platformContent: Partial<Record<PlatformType, string>>;
	threadContent: WizardState["threadContent"];
	uploadedMedia: MediaItem[];
	platformPosts: PlatformPost[];
}

function truncate(text: string, max: number): string {
	const trimmed = text.trim();
	if (trimmed.length <= max) return trimmed;
	return `${trimmed.slice(0, max).trimEnd()}…`;
}

/**
 * Post detail view for `published` and `partially_published` posts.
 *
 * Two-column split mirroring the Editor archetype (docs/design-docs
 * 14-composition.md C-3.4): content on the left (Publish status +
 * Analytics), preview pinned on the right (What shipped). Nothing is
 * editable — there's nothing to edit once a post has shipped.
 */
export function PublishedPostView({
	postId,
	status,
	blurb,
	contentType,
	selectedPlatforms,
	platformContent,
	threadContent,
	uploadedMedia,
	platformPosts,
}: PublishedPostViewProps) {
	const platformCount = selectedPlatforms.length;
	const eyebrow = `${status === "partially_published" ? "Partially published" : "Published"} · ${platformCount} ${platformCount === 1 ? "platform" : "platforms"}`;

	const title: ReactNode =
		status === "partially_published" ? (
			<>
				Partial ship — <em>some needed retries</em>.
			</>
		) : (
			<>
				Out the door. <em>Now we watch.</em>
			</>
		);

	const excerpt = truncate(blurb, 140) || "Published post";

	const breadcrumbs = [
		{ label: "Posts", href: "/posts" as const },
		{ label: "Analytics" as const },
	];

	return (
		<>
			<Topbar breadcrumbs={breadcrumbs} />
			<Stack gap="xl" className={styles.page} animate>
				<header className={pageStyles.pageHero}>
					<div className={pageStyles.pageHeroText}>
						<div className={pageStyles.pageEyebrow}>{eyebrow}</div>
						<h1 className={pageStyles.pageHeroTitle}>{title}</h1>
						<p className={pageStyles.pageHeroSub}>{excerpt}</p>
					</div>
				</header>

				<div className={styles.twoColumn}>
					<Stack gap="xl">
						<Section title="Publish status">
							<PostPublishStatus platformPosts={platformPosts} />
						</Section>

						<Section title="Analytics">
							<InlinePostAnalytics postId={postId} />
						</Section>
					</Stack>

					<div className={styles.shippedColumn}>
						<Section title="What shipped">
							<PlatformPreviewTabs
								selectedPlatforms={selectedPlatforms}
								platformContent={platformContent}
								threadContent={threadContent}
								contentType={contentType}
								uploadedMedia={uploadedMedia}
								readOnly
							/>
						</Section>
					</div>
				</div>
			</Stack>
		</>
	);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section>
			<Stack gap="md">
				<Text as="h2" size="xl" weight="semibold">
					{title}
				</Text>
				{children}
			</Stack>
		</section>
	);
}
