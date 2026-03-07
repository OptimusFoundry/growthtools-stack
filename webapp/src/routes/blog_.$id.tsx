import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useGenerateBlog } from "@/hooks/useGenerateBlog";
import { useGetBlogPost } from "@/hooks/useGetBlogPost";
import { usePublishBlog } from "@/hooks/usePublishBlog";
import { useUpdateBlogPost } from "@/hooks/useUpdateBlogPost";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import styles from "./editor.module.scss";

export const Route = createFileRoute("/blog_/$id")({
	component: EditBlogPostPage,
});

const slugify = (text: string): string =>
	text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");

function EditBlogPostPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { blogPost, loading: fetching, error: fetchError } = useGetBlogPost(id);
	const { updateBlogPost, loading: updating } = useUpdateBlogPost();
	const { publishBlog, loading: publishing } = usePublishBlog();
	const { generateBlog, loading: generating } = useGenerateBlog();

	const [title, setTitle] = useState("");
	const [slug, setSlug] = useState("");
	const [content, setContent] = useState("");
	const [excerpt, setExcerpt] = useState("");
	const [seoTitle, setSeoTitle] = useState("");
	const [metaDescription, setMetaDescription] = useState("");
	const [ogTitle, setOgTitle] = useState("");
	const [ogDescription, setOgDescription] = useState("");
	const [keywords, setKeywords] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [initialized, setInitialized] = useState(false);

	useEffect(() => {
		if (blogPost && !initialized) {
			setTitle(blogPost.title);
			setSlug(blogPost.slug);
			setContent(blogPost.content);
			setExcerpt(blogPost.excerpt || "");
			setSeoTitle(blogPost.seoTitle || "");
			setMetaDescription(blogPost.metaDescription || "");
			setOgTitle(blogPost.ogTitle || "");
			setOgDescription(blogPost.ogDescription || "");
			setKeywords(blogPost.keywords.join(", "));
			setInitialized(true);
		}
	}, [blogPost, initialized]);

	const handleTitleBlur = useCallback(() => {
		if (title && !slug) {
			setSlug(slugify(title));
		}
	}, [title, slug]);

	const handleGenerate = useCallback(async () => {
		const parsedKeywords = keywords
			.split(",")
			.map((k) => k.trim())
			.filter(Boolean);
		try {
			const result = await generateBlog(
				title || "Write a blog post",
				parsedKeywords,
			);
			setTitle(result.title);
			setContent(result.content);
			setSlug(result.slug);
		} catch {
			// error surfaced via hook
		}
	}, [generateBlog, title, keywords]);

	const handleSaveDraft = useCallback(async () => {
		setError(null);
		if (!title.trim()) {
			setError("Title is required.");
			return;
		}
		if (!content.trim()) {
			setError("Content is required.");
			return;
		}
		try {
			const parsedKeywords = keywords
				.split(",")
				.map((k) => k.trim())
				.filter(Boolean);
			await updateBlogPost(id, {
				title,
				slug: slug || slugify(title),
				content,
				excerpt: excerpt || undefined,
				status: "draft",
				seo_title: seoTitle || undefined,
				meta_description: metaDescription || undefined,
				keywords: parsedKeywords.length > 0 ? parsedKeywords : undefined,
				og_title: ogTitle || undefined,
				og_description: ogDescription || undefined,
			});
			navigate({ to: "/blog" });
		} catch {
			// error surfaced via hook
		}
	}, [
		title,
		slug,
		content,
		excerpt,
		seoTitle,
		metaDescription,
		keywords,
		ogTitle,
		ogDescription,
		id,
		updateBlogPost,
		navigate,
	]);

	const handlePublish = useCallback(async () => {
		setError(null);
		if (!title.trim()) {
			setError("Title is required.");
			return;
		}
		if (!content.trim()) {
			setError("Content is required.");
			return;
		}
		try {
			const parsedKeywords = keywords
				.split(",")
				.map((k) => k.trim())
				.filter(Boolean);
			await updateBlogPost(id, {
				title,
				slug: slug || slugify(title),
				content,
				excerpt: excerpt || undefined,
				seo_title: seoTitle || undefined,
				meta_description: metaDescription || undefined,
				keywords: parsedKeywords.length > 0 ? parsedKeywords : undefined,
				og_title: ogTitle || undefined,
				og_description: ogDescription || undefined,
			});
			await publishBlog(id);
			navigate({ to: "/blog" });
		} catch {
			// error surfaced via hook
		}
	}, [
		title,
		slug,
		content,
		excerpt,
		seoTitle,
		metaDescription,
		keywords,
		ogTitle,
		ogDescription,
		id,
		updateBlogPost,
		publishBlog,
		navigate,
	]);

	if (fetching) return <Spinner />;
	if (fetchError) return <Alert variant="error">{fetchError}</Alert>;

	const saving = updating || publishing;

	return (
		<motion.div
			className={styles.editor}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.6 }}
		>
			<div className={styles.editorHeader}>
				<Link to="/blog">
					<Button variant="ghost" size="sm">
						<ArrowLeft size={16} /> Back to Blog
					</Button>
				</Link>
				<div className={styles.editorActions}>
					<Button
						variant="secondary"
						onClick={handleSaveDraft}
						isLoading={updating}
						disabled={saving}
					>
						Save Draft
					</Button>
					<Button
						variant="primary"
						onClick={handlePublish}
						isLoading={publishing}
						disabled={saving}
					>
						Publish
					</Button>
				</div>
			</div>

			{error && <Alert variant="error">{error}</Alert>}

			<div className={styles.blogLayout}>
				<div className={styles.blogMain}>
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
						label="Content"
						placeholder="Write your blog post..."
						rows={20}
						value={content}
						onChange={(e) => setContent(e.target.value)}
						required
					/>

					<Button
						variant="ghost"
						size="sm"
						onClick={handleGenerate}
						isLoading={generating}
						disabled={generating}
					>
						<Sparkles size={16} /> Generate with AI
					</Button>

					<TextArea
						label="Excerpt"
						placeholder="Brief summary of the post..."
						rows={3}
						value={excerpt}
						onChange={(e) => setExcerpt(e.target.value)}
					/>
				</div>

				<div className={styles.blogSidebar}>
					<Card padding="md">
						<Stack gap="sm">
							<p className={styles.sectionLabel}>SEO Settings</p>
							<div className={styles.sidebarSection}>
								<TextField
									label="SEO Title"
									placeholder="SEO title"
									value={seoTitle}
									onChange={(e) => setSeoTitle(e.target.value)}
								/>
								<TextArea
									label="Meta Description"
									placeholder="Meta description for search engines..."
									rows={3}
									value={metaDescription}
									onChange={(e) => setMetaDescription(e.target.value)}
								/>
								<TextField
									label="OG Title"
									placeholder="Open Graph title"
									value={ogTitle}
									onChange={(e) => setOgTitle(e.target.value)}
								/>
								<TextArea
									label="OG Description"
									placeholder="Open Graph description..."
									rows={3}
									value={ogDescription}
									onChange={(e) => setOgDescription(e.target.value)}
								/>
								<TextField
									label="Keywords"
									placeholder="Comma-separated keywords"
									value={keywords}
									onChange={(e) => setKeywords(e.target.value)}
									helperText="Separate keywords with commas"
								/>
							</div>
						</Stack>
					</Card>
				</div>
			</div>
		</motion.div>
	);
}
