import {
	Alert,
	Button,
	Col,
	EmptyState,
	Grid,
	PageHero,
	SectionHeader,
	Spinner,
	Stack,
	Tabs,
	Text,
	TextArea,
	TextField,
} from "@optimusfoundry/quiet";
import { BookOpen, RefreshCw, Send, Sparkles, Trash2 } from "lucide-react";
import "highlight.js/styles/github.css";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { toBlogPost } from "@/api/transforms/blog";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { MediaUploadSection } from "@/components/create-post/compose/MediaUploadSection";
import { Topbar } from "@/components/Layout/Topbar";
import { ConfirmDeleteModal } from "@/components/patterns/ConfirmDeleteModal/ConfirmDeleteModal";
import { useConfirmableDelete } from "@/hooks/useConfirmableDelete";
import { useCreateBlogPost } from "@/hooks/useCreateBlogPost";
import { useDeleteBlog } from "@/hooks/useDeleteBlog";
import { useManagedMediaUpload } from "@/hooks/useManagedMediaUpload";
import { useNotify } from "@/hooks/useNotify";
import { usePublishBlog } from "@/hooks/usePublishBlog";
import { useSSEBlogGenerate } from "@/hooks/useSSEBlogGenerate";
import { useUpdateBlogPost } from "@/hooks/useUpdateBlogPost";
import type {
	BlogPost,
	BlogPublishResult,
	DeleteBlogResult,
} from "@/types/blog";
import type { MediaItem } from "@/types/media";
import styles from "./blog-wizard.module.scss";

export interface BlogWizardProps {
	initialBlogPost?: BlogPost;
	initialMedia?: MediaItem[];
	onDone: () => void;
	onCancel?: () => void;
	// Edit mode: publish succeeded and the post already has a detail page —
	// stay put and let the caller update its tracked post/status row.
	onPublished?: (result: BlogPublishResult) => void;
	// Create mode: the post didn't exist before this action, so there's no
	// page to "stay on" — send the caller to the newly created post instead.
	onPublishedNavigate?: (postId: string) => void;
	// Site-publish status (PR link / error / retry), rendered right below the
	// page header — above the fold, not after the whole two-column form.
	statusSlot?: ReactNode;
}

const slugify = (text: string): string =>
	text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");

const PREVIEW_TABS = [
	{ value: "preview", label: "Preview" },
	{ value: "markdown", label: "Markdown" },
];

interface HeroCopy {
	eyebrow: string;
	title: string;
	accent?: string;
	description: string;
}

function heroCopy(
	isEditMode: boolean,
	status: BlogPost["status"] | undefined,
): HeroCopy {
	if (!isEditMode) {
		return {
			eyebrow: "Editor · new post",
			title: "One idea, a full post",
			description:
				"Write a topic — AI drafts a full post in your voice, complete with SEO metadata and an excerpt.",
		};
	}
	if (status === "published") {
		return {
			eyebrow: "Editor · published",
			title: "Published. Edit with care",
			description:
				"Changes save when you publish again, and your live post updates in place.",
		};
	}
	const eyebrow =
		status === "draft" ? "Editor · edit draft" : `Editor · ${status ?? "edit"}`;
	return {
		eyebrow,
		title: "Refine the",
		accent: "story",
		description:
			"Update content, media, and SEO. Save as draft or publish when it's ready.",
	};
}

export function BlogWizard({
	initialBlogPost,
	initialMedia,
	onDone,
	onPublished,
	onPublishedNavigate,
	statusSlot,
}: BlogWizardProps) {
	const isEditMode = Boolean(initialBlogPost);
	const postStatus = initialBlogPost?.status;

	const [instruction, setInstruction] = useState(
		initialBlogPost?.sourceInstruction ?? initialBlogPost?.title ?? "",
	);
	const [keywords, setKeywords] = useState(
		initialBlogPost ? initialBlogPost.keywords.join(", ") : "",
	);
	const [title, setTitle] = useState(initialBlogPost?.title ?? "");
	const [slug, setSlug] = useState(initialBlogPost?.slug ?? "");
	const [content, setContent] = useState(initialBlogPost?.content ?? "");
	const [excerpt, setExcerpt] = useState(initialBlogPost?.excerpt ?? "");
	const [seoTitle, setSeoTitle] = useState(initialBlogPost?.seoTitle ?? "");
	const [metaDescription, setMetaDescription] = useState(
		initialBlogPost?.metaDescription ?? "",
	);
	const [ogTitle, setOgTitle] = useState(initialBlogPost?.ogTitle ?? "");
	const [ogDescription, setOgDescription] = useState(
		initialBlogPost?.ogDescription ?? "",
	);
	// Published date as YYYY-MM-DD (what an <input type="date"> reads/writes) —
	// the API returns a full timestamp, so slice to just the date part.
	const [publishedAt, setPublishedAt] = useState(
		initialBlogPost?.publishedAt?.slice(0, 10) ?? "",
	);
	const [existingMedia, setExistingMedia] = useState<MediaItem[]>(
		initialMedia ?? [],
	);
	const [featuredImageId, setFeaturedImageId] = useState<string | undefined>(
		initialBlogPost?.featuredImageId,
	);
	const managedMedia = useManagedMediaUpload({
		onUploaded: (media) => setExistingMedia((prev) => [...prev, media]),
	});
	const [error, setError] = useState<string | null>(null);

	const {
		generate,
		reset: resetSSE,
		phase,
		streamingContent,
		blogPost: generatedPost,
		loading: generating,
		error: generateError,
	} = useSSEBlogGenerate();
	const { createBlogPost, loading: creating } = useCreateBlogPost();
	const { updateBlogPost, loading: updating } = useUpdateBlogPost();
	const { publishBlog, loading: publishing } = usePublishBlog();
	const { deleteBlog, loading: deleting } = useDeleteBlog();
	const { notify } = useNotify();

	const saving = creating || updating || publishing;
	const busy = saving || generating || managedMedia.isUploading;

	// Populate form fields when the SSE done payload arrives. The done event
	// carries the persisted post (with media_ids only). Media metadata is not
	// round-tripped — the user attached media before clicking Generate, so we
	// already have the full MediaItem[] in `existingMedia` state locally.
	useEffect(() => {
		if (!generatedPost) return;
		const post = toBlogPost(generatedPost);
		setTitle(post.title);
		setContent(post.content);
		setSlug(post.slug);
		if (post.excerpt) setExcerpt(post.excerpt);
		if (post.seoTitle) setSeoTitle(post.seoTitle);
		if (post.metaDescription) setMetaDescription(post.metaDescription);
		if (post.ogTitle) setOgTitle(post.ogTitle);
		if (post.ogDescription) setOgDescription(post.ogDescription);
	}, [generatedPost]);

	// During streaming, show accumulated chunks. After done, show persisted content.
	const previewContent = streamingContent || content;
	const isStreaming = phase === "generating";
	const hasPreview = Boolean(streamingContent || content);

	const existingMediaIds = useMemo(
		() => existingMedia.map((m) => m.id),
		[existingMedia],
	);

	const handleRemoveMedia = useCallback((id: string) => {
		setExistingMedia((prev) => prev.filter((m) => m.id !== id));
		setFeaturedImageId((prev) => (prev === id ? undefined : prev));
	}, []);

	const handleSetFeatured = useCallback((id: string) => {
		setFeaturedImageId((prev) => (prev === id ? undefined : id));
	}, []);

	const handleTitleBlur = useCallback(() => {
		if (title && !slug) {
			setSlug(slugify(title));
		}
	}, [title, slug]);

	const handleRegenerate = useCallback(async () => {
		if (!instruction.trim()) {
			setError("Please provide a topic or instructions.");
			return;
		}
		setError(null);
		const parsedKeywords = keywords
			.split(",")
			.map((k) => k.trim())
			.filter(Boolean);
		await generate(instruction, parsedKeywords, existingMediaIds);
	}, [instruction, keywords, existingMediaIds, generate]);

	const validate = useCallback((): boolean => {
		if (!title.trim()) {
			setError("Title is required.");
			return false;
		}
		if (!content.trim()) {
			setError("Content is required.");
			return false;
		}
		return true;
	}, [title, content]);

	const buildRequest = useCallback(
		() => ({
			title,
			slug: slug || slugify(title),
			content,
			excerpt: excerpt || undefined,
			seo_title: seoTitle || undefined,
			meta_description: metaDescription || undefined,
			keywords: keywords
				? keywords
						.split(",")
						.map((k) => k.trim())
						.filter(Boolean)
				: undefined,
			og_title: ogTitle || undefined,
			og_description: ogDescription || undefined,
			source_instruction: instruction || undefined,
			media_ids: existingMediaIds,
			published_at: publishedAt || undefined,
			featured_image_id: featuredImageId || undefined,
		}),
		[
			title,
			slug,
			content,
			excerpt,
			seoTitle,
			metaDescription,
			keywords,
			ogTitle,
			ogDescription,
			instruction,
			publishedAt,
			existingMediaIds,
			featuredImageId,
		],
	);

	const handleSaveDraft = useCallback(async () => {
		if (!validate()) return;
		setError(null);
		try {
			if (isEditMode && initialBlogPost) {
				await updateBlogPost(initialBlogPost.id, buildRequest());
			} else {
				await createBlogPost({ ...buildRequest(), status: "draft" });
			}
			notify({
				status: "success",
				title: isEditMode ? "Draft updated" : "Draft saved",
			});
			onDone();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save draft.");
		}
	}, [
		validate,
		isEditMode,
		initialBlogPost,
		updateBlogPost,
		createBlogPost,
		buildRequest,
		notify,
		onDone,
	]);

	const handlePublish = useCallback(async () => {
		if (!validate()) return;
		setError(null);
		try {
			let postId = initialBlogPost?.id;
			if (isEditMode && postId) {
				await updateBlogPost(postId, buildRequest());
			} else {
				const created = await createBlogPost({
					...buildRequest(),
					status: "draft",
				});
				postId = created.id;
			}
			const result = await publishBlog(postId as string);
			if (result.sitePublishError) {
				notify({
					status: "warning",
					title: "Blog post published, but the GitHub push failed",
					description: result.sitePublishError,
				});
			} else {
				notify({
					status: "success",
					title: "Blog post published",
				});
			}
			// Edit mode has a detail page to stay on and reflect the outcome
			// (site-publish status row); create mode has no prior page for
			// that post, so send the user to its freshly created detail page.
			if (isEditMode) {
				onPublished?.(result);
			} else {
				onPublishedNavigate?.(postId as string);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to publish.");
		}
	}, [
		validate,
		isEditMode,
		initialBlogPost,
		updateBlogPost,
		createBlogPost,
		publishBlog,
		buildRequest,
		notify,
		onPublished,
		onPublishedNavigate,
	]);

	// Suppress unused warning — reset is available for future use (e.g. cancel button)
	void resetSSE;

	const copy = heroCopy(isEditMode, postStatus);
	const generateIcon = content ? RefreshCw : Sparkles;

	const breadcrumbs = [
		{ label: "Blog", href: "/blog" as const },
		{ label: isEditMode ? "Edit" : "New" },
	];

	const canDelete = isEditMode && !!initialBlogPost;

	const deleteFlow = useConfirmableDelete<DeleteBlogResult>({
		mutate: deleteBlog,
		mutating: deleting,
		onSuccess: () => onDone(),
		getWarning: (result) => result.siteDeleteError,
		copy: {
			resource: "blog post",
			modalTitle: "Delete blog post",
			confirmBody: initialBlogPost?.sitePrUrl
				? "This post is live on shubhanshu.dev — deleting it will also open a PR to remove it from the site."
				: "Are you sure you want to delete this blog post? This action cannot be undone.",
		},
	});

	const topbarActions = (
		<>
			{canDelete && (
				<Button
					variant="ghost"
					size="sm"
					onClick={() => deleteFlow.request(initialBlogPost!.id)}
					disabled={busy || deleting}
					aria-label="Delete blog post"
					leftIcon={<AppIcon icon={Trash2} size="md" />}
				>
					Delete
				</Button>
			)}
			<Button
				variant="ghost"
				size="sm"
				onClick={handleSaveDraft}
				loading={creating || updating}
				disabled={busy}
			>
				Save draft
			</Button>
			<Button
				variant="primary"
				size="sm"
				onClick={handlePublish}
				loading={publishing}
				disabled={busy}
				leftIcon={<AppIcon icon={Send} size="md" />}
			>
				Publish
			</Button>
		</>
	);

	return (
		<>
			<Topbar breadcrumbs={breadcrumbs} actions={topbarActions} />
			<Stack gap="lg">
				<PageHero
					size="md"
					ruled={false}
					className={styles.hero}
					eyebrow={copy.eyebrow}
					title={copy.title}
					accent={copy.accent}
					description={copy.description}
				/>

				{statusSlot}

				{error && <Alert variant="error">{error}</Alert>}
				{generateError && <Alert variant="error">{generateError}</Alert>}

				<Grid columns={12} gap="lg">
					<Col span={6} spanMd={12}>
						<Stack gap="lg">
							<Stack gap="md">
								<SectionHeader size="sm" as="h2" title="Idea or instructions" />
								<TextArea
									size="sm"
									label="Instructions"
									hideLabel
									placeholder="What should this blog post be about? Give the AI a topic or detailed instructions..."
									rows={5}
									value={instruction}
									onChange={(e) => setInstruction(e.target.value)}
								/>
								<TextField
									size="sm"
									label="Keywords"
									placeholder="Comma-separated keywords"
									value={keywords}
									onChange={(e) => setKeywords(e.target.value)}
									helperText="Used to guide AI generation"
								/>
								<Stack direction="row" gap="sm" justify="flex-end">
									<Button
										variant={content ? "secondary" : "primary"}
										size="sm"
										onClick={handleRegenerate}
										loading={generating}
										disabled={busy}
										leftIcon={<AppIcon icon={generateIcon} size="md" />}
									>
										{content ? "Regenerate" : "Generate"}
									</Button>
								</Stack>
							</Stack>

							<MediaUploadSection
								pendingFiles={managedMedia.uploadingFiles}
								existingMedia={existingMedia}
								onFilesChange={managedMedia.onFilesChange}
								onRemoveExisting={handleRemoveMedia}
								featuredImageId={featuredImageId}
								onSetFeatured={handleSetFeatured}
							/>

							<Stack gap="md">
								<SectionHeader size="sm" as="h2" title="Details" />
								<TextField
									size="sm"
									label="Title"
									placeholder="Blog post title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									onBlur={handleTitleBlur}
									required
								/>
								<TextField
									size="sm"
									label="Slug"
									placeholder="url-friendly-slug"
									value={slug}
									onChange={(e) => setSlug(e.target.value)}
									helperText="URL path for this post"
								/>
								<TextArea
									size="sm"
									label="Excerpt"
									placeholder="Brief summary of the post..."
									rows={3}
									value={excerpt}
									onChange={(e) => setExcerpt(e.target.value)}
								/>
								<TextField
									size="sm"
									label="Published date"
									type="date"
									value={publishedAt}
									onChange={(e) => setPublishedAt(e.target.value)}
									helperText="Backdate the post's public date, e.g. to match when the work actually happened. Leave blank to use today's date when you publish."
								/>
							</Stack>

							<Stack gap="md">
								<SectionHeader size="sm" as="h2" title="SEO" />
								<TextField
									size="sm"
									label="SEO title"
									placeholder="SEO title"
									value={seoTitle}
									onChange={(e) => setSeoTitle(e.target.value)}
								/>
								<TextArea
									size="sm"
									label="Meta description"
									placeholder="Meta description for search engines..."
									rows={3}
									value={metaDescription}
									onChange={(e) => setMetaDescription(e.target.value)}
								/>
								<TextField
									size="sm"
									label="OG title"
									placeholder="Open Graph title"
									value={ogTitle}
									onChange={(e) => setOgTitle(e.target.value)}
								/>
								<TextArea
									size="sm"
									label="OG description"
									placeholder="Open Graph description..."
									rows={3}
									value={ogDescription}
									onChange={(e) => setOgDescription(e.target.value)}
								/>
							</Stack>
						</Stack>
					</Col>

					<Col span={6} spanMd={12}>
						<div className={styles.previewPanel}>
							{generating && !streamingContent && (
								<Stack gap="sm" align="center">
									<Spinner size="lg" />
									<Text size="sm" color="muted" weight="medium">
										Generating your blog post...
									</Text>
								</Stack>
							)}

							{hasPreview && (
								<Tabs
									size="sm"
									tabs={PREVIEW_TABS}
									defaultValue="preview"
									label="Blog post view"
									panels={{
										preview: (
											<div className={styles.markdown}>
												<ReactMarkdown
													remarkPlugins={[remarkGfm]}
													rehypePlugins={[rehypeHighlight]}
												>
													{previewContent}
												</ReactMarkdown>
												{isStreaming && (
													<span className={styles.streamingCursor} />
												)}
											</div>
										),
										markdown: (
											<TextArea
												size="sm"
												label="Markdown content"
												hideLabel
												placeholder="Blog post content will appear here after generation, or type directly..."
												rows={30}
												value={isStreaming ? streamingContent : content}
												onChange={(e) =>
													!isStreaming && setContent(e.target.value)
												}
											/>
										),
									}}
								/>
							)}

							{!generating && !hasPreview && (
								<EmptyState
									bordered
									size="sm"
									icon={<AppIcon icon={BookOpen} size="xl" />}
									description="Enter a topic and click Generate to draft your blog post."
								/>
							)}
						</div>
					</Col>
				</Grid>
			</Stack>

			<ConfirmDeleteModal flow={deleteFlow} />
		</>
	);
}

BlogWizard.displayName = "BlogWizard";
