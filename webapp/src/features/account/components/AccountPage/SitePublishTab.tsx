/**
 * SitePublishTab Component
 * Configure the GitHub repo target blog posts publish to
 */

import {
	Alert,
	Button,
	Container,
	SectionHeader,
	Spinner,
	Stack,
	TextField,
} from "@optimusfoundry/quiet";
import { Check } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { useSitePublishTarget } from "@/hooks/useSitePublishTarget";
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
			<Container size="sm" padded={false} className={styles.container}>
				<Stack align="center" justify="center" className={styles.loadingState}>
					<Spinner size="lg" />
				</Stack>
			</Container>
		);
	}

	const isNotFoundError =
		error?.toLowerCase().includes("not found") ||
		error?.toLowerCase().includes("404");

	if (error && !repoOwner && !isNotFoundError) {
		return (
			<Container size="sm" padded={false} className={styles.container}>
				<Alert variant="error" title="Error">
					{error}
				</Alert>
			</Container>
		);
	}

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		handleSave();
	};

	return (
		<Container size="sm" padded={false} className={styles.container}>
			<form noValidate onSubmit={handleSubmit}>
				<Stack gap="xl">
					<SectionHeader
						size="sm"
						as="h2"
						title="Site Publish"
						description="Configure the GitHub repository your blog posts publish to"
					/>

					{successMessage ? (
						<Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
							{successMessage}
						</Alert>
					) : null}

					{saveError ? (
						<Alert variant="error" onDismiss={() => setSaveError(null)}>
							{saveError}
						</Alert>
					) : null}

					<section aria-label="Repository">
						<Stack gap="lg">
							<SectionHeader
								size="sm"
								as="h3"
								title="Repository"
								description="The GitHub repository that receives published blog posts"
							/>
							<TextField
								size="sm"
								label="Repository Owner"
								value={repoOwner}
								onChange={(e) => setRepoOwner(e.target.value)}
								placeholder="e.g. shubhanshu-dev"
							/>
							<TextField
								size="sm"
								label="Repository Name"
								value={repoName}
								onChange={(e) => setRepoName(e.target.value)}
								placeholder="e.g. site"
							/>
						</Stack>
					</section>

					<section aria-label="Publish Target">
						<Stack gap="lg">
							<SectionHeader
								size="sm"
								as="h3"
								title="Publish Target"
								description="Where in the repository new posts are committed"
							/>
							<TextField
								size="sm"
								label="Base Branch"
								value={baseBranch}
								onChange={(e) => setBaseBranch(e.target.value)}
								placeholder="e.g. main"
							/>
							<TextField
								size="sm"
								label="Content Path"
								value={contentPath}
								onChange={(e) => setContentPath(e.target.value)}
								placeholder="e.g. src/content/blog"
							/>
						</Stack>
					</section>

					<Stack direction="row" justify="flex-end">
						<Button
							type="submit"
							variant="primary"
							size="sm"
							loading={saving}
							leftIcon={<AppIcon icon={Check} />}
						>
							{saving ? "Saving..." : "Save"}
						</Button>
					</Stack>
				</Stack>
			</form>
		</Container>
	);
});

SitePublishTab.displayName = "SitePublishTab";
