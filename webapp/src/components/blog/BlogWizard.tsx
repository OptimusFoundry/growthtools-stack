import { BookOpen, RefreshCw, Send, Sparkles, Trash2 } from "lucide-react";
import "highlight.js/styles/github.css";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { toBlogPost } from "@/api/transforms/blog";
import { MediaUploadSection } from "@/components/create-post/compose/MediaUploadSection";
import { Topbar } from "@/components/Layout/Topbar";
import { useCreateBlogPost } from "@/hooks/useCreateBlogPost";
import { useDeleteBlog } from "@/hooks/useDeleteBlog";
import { usePublishBlog } from "@/hooks/usePublishBlog";
import { useSSEBlogGenerate } from "@/hooks/useSSEBlogGenerate";
import { useUpdateBlogPost } from "@/hooks/useUpdateBlogPost";
import type {
	ExistingFile,
	UploadedFile,
} from "@/proto-design-system/components/composite/FileUpload";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { useBannerCenter } from "@/proto-design-system/components/feedback/BannerCenter";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import {
	Tab,
	TabList,
	TabPanel,
	TabPanels,
	Tabs,
} from "@/proto-design-system/components/navigation/Tabs/Tabs";
import { Modal } from "@/proto-design-system/components/overlays/Modal";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { BlogPost } from "@/types/blog";
import type { MediaItem } from "@/types/media";
import styles from "./blog-wizard.module.scss";

export interface BlogWizardProps {
	initialBlogPost?: BlogPost;
	initialMedia?: MediaItem[];
	onDone: () => void;
	onCancel?: () => void;
}

const slugify = (text: string): string =>
	text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");

export function BlogWizard({
	initialBlogPost,
	initialMedia,
	onDone,
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
	const [existingMedia, setExistingMedia] = useState<MediaItem[]>(
		initialMedia ?? [],
	);
	const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);
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
	const [deleteOpen, setDeleteOpen] = useState(false);
	const { addBanner } = useBannerCenter();

	const saving = creating || updating || publishing;
	const busy = saving || generating;

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

	const existingMediaFiles = useMemo<ExistingFile[]>(
		() =>
			existingMedia.map((m) => ({
				id: m.id,
				name: m.filename,
				size: m.sizeBytes,
				contentType: m.contentType,
				url: m.url ?? undefined,
			})),
		[existingMedia],
	);
	const existingMediaIds = useMemo(
		() => existingMedia.map((m) => m.id),
		[existingMedia],
	);

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
			existingMediaIds,
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
			addBanner({
				type: "success",
				title: isEditMode ? "Draft updated" : "Draft saved",
				dismissible: true,
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
		addBanner,
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
			await publishBlog(postId as string);
			addBanner({
				type: "success",
				title: "Blog post published",
				dismissible: true,
			});
			onDone();
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
		addBanner,
		onDone,
	]);

	// Suppress unused warning — reset is available for future use (e.g. cancel button)
	void resetSSE;

	const eyebrowLabel = !isEditMode
		? "Editor · new post"
		: postStatus === "draft"
			? "Editor · edit draft"
			: `Editor · ${postStatus ?? "edit"}`;

	const titleFragment: ReactNode = !isEditMode ? (
		<>
			One <em>idea</em>, a full post.
		</>
	) : postStatus === "published" ? (
		<>
			<em>Published.</em> Edit with care.
		</>
	) : (
		<>
			Refine the <em>story</em>.
		</>
	);

	const subLine = !isEditMode
		? "Write a topic — AI drafts a full post in your voice, complete with SEO metadata and an excerpt."
		: postStatus === "published"
			? "Changes save when you publish again, and your live post updates in place."
			: "Update content, media, and SEO. Save as draft or publish when it's ready.";

	const breadcrumbs = [
		{ label: "Blog", href: "/blog" as const },
		{ label: isEditMode ? "Edit" : "New" },
	];

	const canDelete = isEditMode && postStatus === "draft" && !!initialBlogPost;

	const handleConfirmDelete = async () => {
		if (!initialBlogPost) return;
		try {
			await deleteBlog(initialBlogPost.id);
			setDeleteOpen(false);
			addBanner({
				type: "success",
				title: "Blog post deleted",
				dismissible: true,
			});
			onDone();
		} catch {
			addBanner({
				type: "error",
				title: "Couldn't delete blog post",
				description: "Please try again.",
				dismissible: true,
			});
		}
	};

	const topbarActions = (
		<>
			{canDelete && (
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setDeleteOpen(true)}
					disabled={busy || deleting}
					aria-label="Delete blog post"
				>
					<Trash2 size={14} /> Delete
				</Button>
			)}
			<Button
				variant="ghost"
				size="sm"
				onClick={handleSaveDraft}
				isLoading={creating || updating}
				disabled={busy}
			>
				Save draft
			</Button>
			<Button
				variant="primary"
				size="sm"
				onClick={handlePublish}
				isLoading={publishing}
				disabled={busy}
			>
				<Send size={14} /> Publish
			</Button>
		</>
	);

	return (
		<>
			<Topbar breadcrumbs={breadcrumbs} actions={topbarActions} />
			<div className={styles.page}>
				<header className={styles.header}>
					<div className={styles.headerInner}>
						<div>
							<div className={styles.eyebrow}>{eyebrowLabel}</div>
							<h1 className={styles.title}>{titleFragment}</h1>
							<p className={styles.sub}>{subLine}</p>
						</div>
					</div>
				</header>

				{error && <Alert variant="error">{error}</Alert>}
				{generateError && <Alert variant="error">{generateError}</Alert>}

				<div className={styles.twoColumn}>
					{/* ── Left: compose ──────────────────────────────────────────── */}
					<Stack gap="lg">
						<Stack gap="sm">
							<Text size="md" weight="semibold">
								Idea or instructions
							</Text>
							<TextArea
								placeholder="What should this blog post be about? Give the AI a topic or detailed instructions..."
								rows={5}
								value={instruction}
								onChange={(e) => setInstruction(e.target.value)}
								fullWidth
							/>
							<TextField
								label="Keywords"
								placeholder="Comma-separated keywords"
								value={keywords}
								onChange={(e) => setKeywords(e.target.value)}
								helperText="Used to guide AI generation"
							/>
							<Stack direction="row" gap="sm" justify="end">
								<Button
									variant={content ? "secondary" : "primary"}
									onClick={handleRegenerate}
									isLoading={generating}
									disabled={busy}
								>
									{content ? (
										<>
											<RefreshCw size={16} /> Regenerate
										</>
									) : (
										<>
											<Sparkles size={16} /> Generate
										</>
									)}
								</Button>
							</Stack>
						</Stack>

						<Divider />

						<MediaUploadSection
							pendingFiles={pendingFiles}
							existingMedia={existingMediaFiles}
							onFilesChange={setPendingFiles}
							onRemoveExisting={(id) =>
								setExistingMedia((prev) => prev.filter((m) => m.id !== id))
							}
						/>

						<Divider />

						<Stack gap="sm">
							<Text size="md" weight="semibold">
								Details
							</Text>
							<TextField
								label="Title"
								placeholder="Blog post title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								onBlur={handleTitleBlur}
								required
							/>
							<TextField
								label="Slug"
								placeholder="url-friendly-slug"
								value={slug}
								onChange={(e) => setSlug(e.target.value)}
								helperText="URL path for this post"
							/>
							<TextArea
								label="Excerpt"
								placeholder="Brief summary of the post..."
								rows={3}
								value={excerpt}
								onChange={(e) => setExcerpt(e.target.value)}
							/>
						</Stack>

						<Divider />

						<Stack gap="sm">
							<Text size="md" weight="semibold">
								SEO
							</Text>
							<TextField
								label="SEO title"
								placeholder="SEO title"
								value={seoTitle}
								onChange={(e) => setSeoTitle(e.target.value)}
							/>
							<TextArea
								label="Meta description"
								placeholder="Meta description for search engines..."
								rows={3}
								value={metaDescription}
								onChange={(e) => setMetaDescription(e.target.value)}
							/>
							<TextField
								label="OG title"
								placeholder="Open Graph title"
								value={ogTitle}
								onChange={(e) => setOgTitle(e.target.value)}
							/>
							<TextArea
								label="OG description"
								placeholder="Open Graph description..."
								rows={3}
								value={ogDescription}
								onChange={(e) => setOgDescription(e.target.value)}
							/>
						</Stack>
					</Stack>

					{/* ── Right: preview ──────────────────────────────────────────── */}
					<div className={styles.previewPanel}>
						{generating && !streamingContent && (
							<Stack
								gap="sm"
								align="center"
								className={styles.generatingLoader}
							>
								<Spinner size="lg" />
								<Text size="sm" color="secondary" weight="medium">
									Generating your blog post...
								</Text>
							</Stack>
						)}

						{hasPreview && (
							<Tabs defaultTab="preview">
								<TabList>
									<Tab id="preview">Preview</Tab>
									<Tab id="markdown">Markdown</Tab>
								</TabList>
								<TabPanels>
									<TabPanel id="preview">
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
									</TabPanel>
									<TabPanel id="markdown">
										<TextArea
											placeholder="Blog post content will appear here after generation, or type directly..."
											rows={30}
											value={isStreaming ? streamingContent : content}
											onChange={(e) =>
												!isStreaming && setContent(e.target.value)
											}
											fullWidth
										/>
									</TabPanel>
								</TabPanels>
							</Tabs>
						)}

						{!generating && !hasPreview && (
							<div className={styles.emptyPreview}>
								<BookOpen size={40} className={styles.emptyPreviewIcon} />
								<Text size="sm" color="muted">
									Enter a topic and click Generate to draft your blog post.
								</Text>
							</div>
						)}
					</div>
				</div>
			</div>

			<Modal
				isOpen={deleteOpen}
				onClose={() => setDeleteOpen(false)}
				title="Delete blog post"
				size="sm"
				footer={
					<Stack direction="row" gap="sm" justify="end">
						<Button variant="ghost" onClick={() => setDeleteOpen(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleConfirmDelete}
							isLoading={deleting}
						>
							Delete
						</Button>
					</Stack>
				}
			>
				<Text color="secondary">
					Are you sure you want to delete this blog post? This action cannot be
					undone.
				</Text>
			</Modal>
		</>
	);
}

BlogWizard.displayName = "BlogWizard";
