/**
 * VoiceProfileTab Component
 * Configure AI writing personality: tone, style, examples, and instructions
 */

import {
	Alert,
	Button,
	Container,
	SectionHeader,
	Select,
	Spinner,
	Stack,
	TextArea,
	TextField,
} from "@optimusfoundry/quiet";
import { Check } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { useVoiceProfile } from "@/hooks/useVoiceProfile";
import {
	STYLE_OPTIONS,
	TONE_OPTIONS,
	type UpdateVoiceProfileRequest,
} from "@/types/voiceProfile";
import styles from "./VoiceProfileTab.module.scss";

// ============================================================================
// Hooks
// ============================================================================

function useVoiceProfileForm() {
	const { voiceProfile, loading, error, updateVoiceProfile } =
		useVoiceProfile();

	const [tone, setTone] = useState("");
	const [style, setStyle] = useState("");
	const [industry, setIndustry] = useState("");
	const [targetAudience, setTargetAudience] = useState("");
	const [examplePosts, setExamplePosts] = useState("");
	const [customInstructions, setCustomInstructions] = useState("");
	const [saving, setSaving] = useState(false);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [saveError, setSaveError] = useState<string | null>(null);

	useEffect(() => {
		if (voiceProfile) {
			setTone(voiceProfile.tone || "");
			setStyle(voiceProfile.style || "");
			setIndustry(voiceProfile.industry || "");
			setTargetAudience(voiceProfile.targetAudience || "");
			setExamplePosts(voiceProfile.examplePosts?.join("\n") || "");
			setCustomInstructions(voiceProfile.customInstructions || "");
		}
	}, [voiceProfile]);

	const handleSave = useCallback(async () => {
		setSaving(true);
		setSaveError(null);
		setSuccessMessage(null);

		const data: UpdateVoiceProfileRequest = {
			tone,
			style,
			industry: industry || undefined,
			target_audience: targetAudience || undefined,
			example_posts: examplePosts
				? examplePosts.split("\n").filter((line) => line.trim())
				: undefined,
			custom_instructions: customInstructions || undefined,
		};

		try {
			await updateVoiceProfile(data);
			setSuccessMessage("Voice profile saved successfully.");
		} catch {
			setSaveError("Failed to save voice profile. Please try again.");
		} finally {
			setSaving(false);
		}
	}, [
		tone,
		style,
		industry,
		targetAudience,
		examplePosts,
		customInstructions,
		updateVoiceProfile,
	]);

	return {
		loading,
		error,
		saving,
		successMessage,
		saveError,
		tone,
		setTone,
		style,
		setStyle,
		industry,
		setIndustry,
		targetAudience,
		setTargetAudience,
		examplePosts,
		setExamplePosts,
		customInstructions,
		setCustomInstructions,
		handleSave,
		setSuccessMessage,
		setSaveError,
	};
}

// ============================================================================
// Constants
// ============================================================================

const toneOptions = TONE_OPTIONS.map((t) => ({
	value: t,
	label: t.charAt(0).toUpperCase() + t.slice(1),
}));

const styleOptions = STYLE_OPTIONS.map((s) => ({
	value: s,
	label: s.charAt(0).toUpperCase() + s.slice(1),
}));

// ============================================================================
// Component
// ============================================================================

export const VoiceProfileTab = memo(function VoiceProfileTab() {
	const {
		loading,
		error,
		saving,
		successMessage,
		saveError,
		tone,
		setTone,
		style,
		setStyle,
		industry,
		setIndustry,
		targetAudience,
		setTargetAudience,
		examplePosts,
		setExamplePosts,
		customInstructions,
		setCustomInstructions,
		handleSave,
		setSuccessMessage,
		setSaveError,
	} = useVoiceProfileForm();

	if (loading && !tone) {
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

	if (error && !tone && !isNotFoundError) {
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
						title="Voice Profile"
						description="Configure your AI writing tone, style, and personality"
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

					<section aria-label="Writing voice">
						<Stack gap="lg">
							<SectionHeader
								size="sm"
								as="h3"
								title="Tone & Style"
								description="Set the overall voice for AI-generated content"
							/>
							<Select
								label="Tone"
								options={toneOptions}
								placeholder="Select a tone"
								value={tone}
								onChange={(e) => setTone(e.target.value)}
							/>
							<Select
								label="Style"
								options={styleOptions}
								placeholder="Select a style"
								value={style}
								onChange={(e) => setStyle(e.target.value)}
							/>
						</Stack>
					</section>

					<section aria-label="Reader context">
						<Stack gap="lg">
							<SectionHeader
								size="sm"
								as="h3"
								title="Audience"
								description="Help AI tailor content to your industry and audience"
							/>
							<TextField
								label="Industry"
								value={industry}
								onChange={(e) => setIndustry(e.target.value)}
								placeholder="e.g. SaaS, E-commerce, FinTech"
							/>
							<TextField
								label="Target Audience"
								value={targetAudience}
								onChange={(e) => setTargetAudience(e.target.value)}
								placeholder="e.g. Startup founders, developers"
							/>
						</Stack>
					</section>

					<section aria-label="Reference material">
						<Stack gap="lg">
							<SectionHeader
								size="sm"
								as="h3"
								title="Examples & Instructions"
								description="Provide reference posts and custom guidance for the AI"
							/>
							<TextArea
								label="Example Posts"
								value={examplePosts}
								onChange={(e) => setExamplePosts(e.target.value)}
								placeholder="Paste example posts, one per line"
								rows={4}
								helperText="Add example posts that reflect your writing voice, one per line"
							/>
							<TextArea
								label="Custom Instructions"
								value={customInstructions}
								onChange={(e) => setCustomInstructions(e.target.value)}
								placeholder="Any additional instructions for AI content generation"
								rows={4}
							/>
						</Stack>
					</section>

					<Stack direction="row" justify="flex-end">
						<Button
							type="submit"
							variant="primary"
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

VoiceProfileTab.displayName = "VoiceProfileTab";
