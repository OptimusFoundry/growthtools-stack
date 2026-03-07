/**
 * VoiceProfileTab Component
 * Configure AI writing personality: tone, style, examples, and instructions
 */

import { memo, useCallback, useEffect, useState } from "react";
import { useVoiceProfile } from "@/hooks/useVoiceProfile";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Select } from "@/proto-design-system/components/forms/Select";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Card, CardBody } from "@/proto-design-system/components/layout/Card";
import { Container } from "@/proto-design-system/components/layout/Container";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import {
	STYLE_OPTIONS,
	TONE_OPTIONS,
	type UpdateVoiceProfileRequest,
} from "@/types/voiceProfile";

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

const toneSelectOptions = TONE_OPTIONS.map((t) => ({
	value: t,
	label: t.charAt(0).toUpperCase() + t.slice(1),
}));

const styleSelectOptions = STYLE_OPTIONS.map((s) => ({
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
			<Container size="md" padded={false}>
				<Stack align="center" justify="center" style={{ minHeight: "200px" }}>
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
			<Container size="md" padded={false}>
				<Alert variant="error" title="Error">
					{error}
				</Alert>
			</Container>
		);
	}

	return (
		<Container
			size="md"
			padded={false}
			style={{ paddingTop: "var(--space-6)" }}
		>
			<Card variant="outlined">
				<CardBody>
					<Stack gap="lg">
						<Text as="h3" size="lg" weight="medium">
							Voice Profile
						</Text>

						{successMessage && (
							<Alert
								variant="success"
								dismissible
								onDismiss={() => setSuccessMessage(null)}
							>
								{successMessage}
							</Alert>
						)}

						{saveError && (
							<Alert
								variant="error"
								dismissible
								onDismiss={() => setSaveError(null)}
							>
								{saveError}
							</Alert>
						)}

						<Stack gap="md">
							<Select
								label="Tone"
								options={toneSelectOptions}
								value={tone}
								onChange={(e) => setTone(e.target.value)}
								placeholder="Select a tone"
								fullWidth
							/>

							<Select
								label="Style"
								options={styleSelectOptions}
								value={style}
								onChange={(e) => setStyle(e.target.value)}
								placeholder="Select a style"
								fullWidth
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

							<TextArea
								label="Example Posts"
								value={examplePosts}
								onChange={(e) => setExamplePosts(e.target.value)}
								placeholder="Paste example posts, one per line"
								rows={4}
								helperText="Add example posts that reflect your writing voice, one per line"
								fullWidth
							/>

							<TextArea
								label="Custom Instructions"
								value={customInstructions}
								onChange={(e) => setCustomInstructions(e.target.value)}
								placeholder="Any additional instructions for AI content generation"
								rows={4}
								fullWidth
							/>
						</Stack>

						<Stack direction="row" justify="end">
							<Button onClick={handleSave} disabled={saving}>
								{saving ? "Saving..." : "Save"}
							</Button>
						</Stack>
					</Stack>
				</CardBody>
			</Card>
		</Container>
	);
});

VoiceProfileTab.displayName = "VoiceProfileTab";
