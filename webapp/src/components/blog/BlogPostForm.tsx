import { ArrowLeft, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useGenerateBlog } from "@/hooks/useGenerateBlog";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import styles from "./blog-form.module.scss";

// ============================================================================
// Types
// ============================================================================

export interface BlogPostFormData {
	title: string;
	slug: string;
	content: string;
	excerpt: string;
	seoTitle: string;
	metaDescription: string;
	ogTitle: string;
	ogDescription: string;
	keywords: string;
}

export interface BlogPostFormProps {
	initialData?: BlogPostFormData;
	onSaveDraft: (data: BlogPostFormData) => Promise<void>;
	onPublish: (data: BlogPostFormData) => Promise<void>;
	loading?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const slugify = (text: string): string =>
	text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");

const validateForm = (
	title: string,
	content: string,
): { isValid: boolean; error: string | null } => {
	if (!title.trim()) {
		return { isValid: false, error: "Title is required." };
	}
	if (!content.trim()) {
		return { isValid: false, error: "Content is required." };
	}
	return { isValid: true, error: null };
};

const collectFormData = (
	title: string,
	slug: string,
	content: string,
	excerpt: string,
	seoTitle: string,
	metaDescription: string,
	ogTitle: string,
	ogDescription: string,
	keywords: string,
): BlogPostFormData => {
	const parsedKeywords = keywords
		.split(",")
		.map((k) => k.trim())
		.filter(Boolean);
	return {
		title,
		slug: slug || slugify(title),
		content,
		excerpt: excerpt || "",
		seoTitle: seoTitle || "",
		metaDescription: metaDescription || "",
		ogTitle: ogTitle || "",
		ogDescription: ogDescription || "",
		keywords: parsedKeywords.join(", "),
	};
};

// ============================================================================
// Component
// ============================================================================

export function BlogPostForm({
	initialData,
	onSaveDraft,
	onPublish,
	loading = false,
}: BlogPostFormProps) {
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
	const [initialized, setInitialized] = useState(!initialData);
	const { generateBlog, loading: generating } = useGenerateBlog();

	useEffect(() => {
		if (initialData && !initialized) {
			setTitle(initialData.title);
			setSlug(initialData.slug);
			setContent(initialData.content);
			setExcerpt(initialData.excerpt);
			setSeoTitle(initialData.seoTitle);
			setMetaDescription(initialData.metaDescription);
			setOgTitle(initialData.ogTitle);
			setOgDescription(initialData.ogDescription);
			setKeywords(initialData.keywords);
			setInitialized(true);
		}
	}, [initialData, initialized]);

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
		const validation = validateForm(title, content);
		if (!validation.isValid) {
			setError(validation.error);
			return;
		}
		try {
			await onSaveDraft(
				collectFormData(
					title,
					slug,
					content,
					excerpt,
					seoTitle,
					metaDescription,
					ogTitle,
					ogDescription,
					keywords,
				),
			);
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
		onSaveDraft,
	]);

	const handlePublish = useCallback(async () => {
		const validation = validateForm(title, content);
		if (!validation.isValid) {
			setError(validation.error);
			return;
		}
		try {
			await onPublish(
				collectFormData(
					title,
					slug,
					content,
					excerpt,
					seoTitle,
					metaDescription,
					ogTitle,
					ogDescription,
					keywords,
				),
			);
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
		onPublish,
	]);

	const saving = loading || generating;

	return (
		<div className={styles.editor}>
			<Stack direction="row" align="center" justify="between" gap="md">
				<Button variant="ghost" size="sm" disabled={saving}>
					<ArrowLeft size={16} /> Back to Blog
				</Button>
				<Stack direction="row" gap="sm">
					<Button
						variant="secondary"
						onClick={handleSaveDraft}
						isLoading={loading}
						disabled={saving}
					>
						Save Draft
					</Button>
					<Button
						variant="primary"
						onClick={handlePublish}
						isLoading={loading}
						disabled={saving}
					>
						Publish
					</Button>
				</Stack>
			</Stack>

			{error && <Alert variant="error">{error}</Alert>}

			<div className={styles.blogLayout}>
				<Stack gap="lg">
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
				</Stack>

				<Stack gap="md">
					<Card padding="md">
						<Stack gap="sm">
							<p className={styles.sectionLabel}>SEO Settings</p>
							<Stack gap="sm">
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
							</Stack>
						</Stack>
					</Card>
				</Stack>
			</div>
		</div>
	);
}

BlogPostForm.displayName = "BlogPostForm";
