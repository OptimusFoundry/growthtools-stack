/**
 * SitePublishTab Component
 * Configure the GitHub repo target blog posts publish to
 */

import { Check } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { useSitePublishTarget } from "@/hooks/useSitePublishTarget";
import { Alert } from "@/proto-design-system/components/feedback/Alert/Alert";
import { TextField } from "@/proto-design-system/components/forms/TextField/TextField";
import { Divider } from "@/proto-design-system/components/layout/Divider/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text/Text";
import type { UpdateSitePublishTargetRequest } from "@/types/sitePublishTarget";
import { getErrorMessage } from "@/utils/errorHandler";
import styles from "./SitePublishTab.module.scss";

// ============================================================================
// Hooks
// ============================================================================

function useSitePublishForm() {
	const { sitePublishTarget, loading, error, updateSitePublishTarget } =
		useSitePublishTarget();

	const [repoOwner, setRepoOwner] = useState("");
	const [repoName, setRepoName] = useState("");
	const [baseBranch, setBaseBranch] = useState("");
	const [contentPath, setContentPath] = useState("");
	const [saving, setSaving] = useState(false);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [saveError, setSaveError] = useState<string | null>(null);

	useEffect(() => {
		if (sitePublishTarget) {
			setRepoOwner(sitePublishTarget.repoOwner || "");
			setRepoName(sitePublishTarget.repoName || "");
			setBaseBranch(sitePublishTarget.baseBranch || "");
			setContentPath(sitePublishTarget.contentPath || "");
		}
	}, [sitePublishTarget]);

	const handleSave = useCallback(async () => {
		setSaving(true);
		setSaveError(null);
		setSuccessMessage(null);

		const data: UpdateSitePublishTargetRequest = {
			repo_owner: repoOwner,
			repo_name: repoName,
			base_branch: baseBranch,
			content_path: contentPath,
		};

		try {
			await updateSitePublishTarget(data);
			setSuccessMessage("Site publish settings saved successfully.");
		} catch (err) {
			setSaveError(getErrorMessage(err));
		} finally {
			setSaving(false);
		}
	}, [repoOwner, repoName, baseBranch, contentPath, updateSitePublishTarget]);

	return {
		loading,
		error,
		saving,
		successMessage,
		saveError,
		repoOwner,
		setRepoOwner,
		repoName,
		setRepoName,
		baseBranch,
		setBaseBranch,
		contentPath,
		setContentPath,
		handleSave,
		setSuccessMessage,
		setSaveError,
	};
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Section — title + optional description + body content. Mirrors
 * VoiceProfileTab's rhythm so every settings tab reads the same.
 */
function Section({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<Stack gap="md">
			<Stack gap="xs">
				<Text as="h3" size="lg">
					{title}
				</Text>
				{description ? (
					<Text size="sm" color="secondary">
						{description}
					</Text>
				) : null}
			</Stack>
			{children}
		</Stack>
	);
}

// ============================================================================
// Component
// ============================================================================

export const SitePublishTab = memo(function SitePublishTab() {
	const {
		loading,
		error,
		saving,
		successMessage,
		saveError,
		repoOwner,
		setRepoOwner,
		repoName,
		setRepoName,
		baseBranch,
		setBaseBranch,
		contentPath,
		setContentPath,
		handleSave,
		setSuccessMessage,
		setSaveError,
	} = useSitePublishForm();

	if (loading && !repoOwner) {
		return (
			<Stack
				align="center"
				justify="center"
				className={`${styles.settings} ${styles.loadingState}`}
			>
				<Spinner size="lg" />
			</Stack>
		);
	}

	const isNotFoundError =
		error?.toLowerCase().includes("not found") ||
		error?.toLowerCase().includes("404");

	if (error && !repoOwner && !isNotFoundError) {
		return (
			<Stack className={styles.settings}>
				<Alert variant="error" title="Error">
					{error}
				</Alert>
			</Stack>
		);
	}

	return (
		<Stack gap="xl" className={styles.settings}>
			{/* Page Header */}
			<Stack gap="xs">
				<Text as="h2" size="xl">
					Site Publish
				</Text>
				<Text size="md" color="secondary">
					Configure the GitHub repository your blog posts publish to
				</Text>
			</Stack>

			{successMessage ? (
				<Alert
					variant="success"
					dismissible
					onDismiss={() => setSuccessMessage(null)}
				>
					{successMessage}
				</Alert>
			) : null}

			{saveError ? (
				<Alert variant="error" dismissible onDismiss={() => setSaveError(null)}>
					{saveError}
				</Alert>
			) : null}

			<Section
				title="Repository"
				description="The GitHub repository that receives published blog posts"
			>
				<TextField
					label="Repository Owner"
					value={repoOwner}
					onChange={(e) => setRepoOwner(e.target.value)}
					placeholder="e.g. shubhanshu-dev"
					isFullWidth
				/>

				<TextField
					label="Repository Name"
					value={repoName}
					onChange={(e) => setRepoName(e.target.value)}
					placeholder="e.g. site"
					isFullWidth
				/>
			</Section>

			<Divider />

			<Section
				title="Publish Target"
				description="Where in the repository new posts are committed"
			>
				<TextField
					label="Base Branch"
					value={baseBranch}
					onChange={(e) => setBaseBranch(e.target.value)}
					placeholder="e.g. main"
					isFullWidth
				/>

				<TextField
					label="Content Path"
					value={contentPath}
					onChange={(e) => setContentPath(e.target.value)}
					placeholder="e.g. src/content/blog"
					isFullWidth
				/>
			</Section>

			<Divider />

			<Stack direction="row" justify="end">
				<Button
					onClick={handleSave}
					isLoading={saving}
					leftIcon={<Check size={16} />}
				>
					{saving ? "Saving..." : "Save"}
				</Button>
			</Stack>
		</Stack>
	);
});

SitePublishTab.displayName = "SitePublishTab";
