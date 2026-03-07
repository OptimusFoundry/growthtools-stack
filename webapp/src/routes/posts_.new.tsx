import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { useCreatePost } from "@/hooks/useCreatePost";
import { useGenerateContent } from "@/hooks/useGenerateContent";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import { usePublishPost } from "@/hooks/usePublishPost";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Checkbox } from "@/proto-design-system/components/forms/Checkbox";
import { Select } from "@/proto-design-system/components/forms/Select";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { PLATFORM_DISPLAY_NAMES } from "@/types/platform";
import type { ContentType } from "@/types/post";
import styles from "./editor.module.scss";

export const Route = createFileRoute("/posts_/new")({
	component: NewPostPage,
});

const CONTENT_TYPE_OPTIONS = [
	{ value: "text", label: "Text" },
	{ value: "image", label: "Image" },
	{ value: "video", label: "Video" },
	{ value: "carousel", label: "Carousel" },
	{ value: "thread", label: "Thread" },
];

function NewPostPage() {
	const navigate = useNavigate();
	const { createPost, loading: creating } = useCreatePost();
	const { publishPost, loading: publishing } = usePublishPost();
	const { generateContent, loading: generating } = useGenerateContent();
	const { connections } = usePlatformConnections();

	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [contentType, setContentType] = useState<ContentType>("text");
	const [tags, setTags] = useState("");
	const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
	const [scheduledAt, setScheduledAt] = useState("");
	const [error, setError] = useState<string | null>(null);

	const activeConnections = connections.filter((c) => c.status === "active");

	const togglePlatform = useCallback((platform: string) => {
		setSelectedPlatforms((prev) =>
			prev.includes(platform)
				? prev.filter((p) => p !== platform)
				: [...prev, platform],
		);
	}, []);

	const handleGenerate = useCallback(async () => {
		try {
			const result = await generateContent(
				title || "Create a social media post",
				selectedPlatforms,
			);
			setContent(result.content);
		} catch {
			// error surfaced via hook
		}
	}, [generateContent, title, selectedPlatforms]);

	const handleSaveDraft = useCallback(async () => {
		setError(null);
		if (!content.trim()) {
			setError("Content is required.");
			return;
		}
		try {
			const parsedTags = tags
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);
			await createPost({
				title: title || undefined,
				content,
				content_type: contentType,
				status: "draft",
				scheduled_at: scheduledAt || undefined,
				tags: parsedTags.length > 0 ? parsedTags : undefined,
				platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
			});
			navigate({ to: "/posts" });
		} catch {
			// error surfaced via hook
		}
	}, [
		content,
		title,
		contentType,
		tags,
		scheduledAt,
		selectedPlatforms,
		createPost,
		navigate,
	]);

	const handlePublish = useCallback(async () => {
		setError(null);
		if (!content.trim()) {
			setError("Content is required.");
			return;
		}
		if (selectedPlatforms.length === 0) {
			setError("Select at least one platform to publish.");
			return;
		}
		try {
			const parsedTags = tags
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);
			const post = await createPost({
				title: title || undefined,
				content,
				content_type: contentType,
				status: "draft",
				tags: parsedTags.length > 0 ? parsedTags : undefined,
				platforms: selectedPlatforms,
			});
			await publishPost(post.id, selectedPlatforms);
			navigate({ to: "/posts" });
		} catch {
			// error surfaced via hook
		}
	}, [
		content,
		title,
		contentType,
		tags,
		selectedPlatforms,
		createPost,
		publishPost,
		navigate,
	]);

	const saving = creating || publishing;

	return (
		<motion.div
			className={styles.editor}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.6 }}
		>
			<div className={styles.editorHeader}>
				<Link to="/posts">
					<Button variant="ghost" size="sm">
						<ArrowLeft size={16} /> Back to Posts
					</Button>
				</Link>
				<div className={styles.editorActions}>
					<Button
						variant="secondary"
						onClick={handleSaveDraft}
						isLoading={creating}
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

			<div className={styles.editorBody}>
				<TextField
					label="Title"
					placeholder="Post title (optional)"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
				/>

				<Select
					label="Content Type"
					options={CONTENT_TYPE_OPTIONS}
					value={contentType}
					onChange={(e) => setContentType(e.target.value as ContentType)}
				/>

				<TextArea
					label="Content"
					placeholder="Write your post content..."
					rows={12}
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

				<TextField
					label="Tags"
					placeholder="Comma-separated tags"
					value={tags}
					onChange={(e) => setTags(e.target.value)}
					helperText="Separate tags with commas"
				/>

				{activeConnections.length > 0 && (
					<Card padding="md">
						<Stack gap="sm">
							<p className={styles.sectionLabel}>Publish To</p>
							<div className={styles.platformGrid}>
								{activeConnections.map((conn) => (
									<Checkbox
										key={conn.id}
										label={PLATFORM_DISPLAY_NAMES[conn.platform]}
										checked={selectedPlatforms.includes(conn.platform)}
										onChange={() => togglePlatform(conn.platform)}
									/>
								))}
							</div>
						</Stack>
					</Card>
				)}

				<Card padding="md">
					<Stack gap="sm">
						<p className={styles.sectionLabel}>Schedule</p>
						<TextField
							type="datetime-local"
							label="Publish Date"
							value={scheduledAt}
							onChange={(e) => setScheduledAt(e.target.value)}
							helperText="Leave empty to publish immediately"
						/>
					</Stack>
				</Card>
			</div>
		</motion.div>
	);
}
