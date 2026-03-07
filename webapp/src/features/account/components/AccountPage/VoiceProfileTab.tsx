/**
 * VoiceProfileTab Component
 * Configure AI writing personality: tone, style, examples, and instructions
 */

import { Check } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { useVoiceProfile } from "@/hooks/useVoiceProfile";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Label } from "@/proto-design-system/components/forms/Label";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Container } from "@/proto-design-system/components/layout/Container";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Dropdown } from "@/proto-design-system/components/overlays/Dropdown";
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

const toneDropdownItems = TONE_OPTIONS.map((t) => ({
	id: t,
	label: t.charAt(0).toUpperCase() + t.slice(1),
}));

const styleDropdownItems = STYLE_OPTIONS.map((s) => ({
	id: s,
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
				<Stack align="center" justify="center" style={{ minHeight: 200 }}>
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
		<Container size="md" padded={false}>
			<Stack gap="lg">
				{/* Page Header */}
				<Stack gap="xs">
					<Text as="h2" size="xl" weight="semibold">
						Voice Profile
					</Text>
					<Text size="md" color="secondary">
						Configure your AI writing tone, style, and personality
					</Text>
				</Stack>

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

				{/* Tone & Style Section */}
				<Stack gap="md">
					<Stack gap="xs">
						<Text as="h3" size="lg" weight="semibold">
							Tone & Style
						</Text>
						<Text color="muted" size="sm">
							Set the overall voice for AI-generated content
						</Text>
					</Stack>

					<Stack gap="xs">
						<Label>Tone</Label>
						<Dropdown
							items={toneDropdownItems}
							value={tone}
							onChange={setTone}
							placeholder="Select a tone"
							size="md"
							fullWidth
						/>
					</Stack>

					<Stack gap="xs">
						<Label>Style</Label>
						<Dropdown
							items={styleDropdownItems}
							value={style}
							onChange={setStyle}
							placeholder="Select a style"
							size="md"
							fullWidth
						/>
					</Stack>
				</Stack>

				<Divider />

				{/* Audience Section */}
				<Stack gap="md">
					<Stack gap="xs">
						<Text as="h3" size="lg" weight="semibold">
							Audience
						</Text>
						<Text color="muted" size="sm">
							Help AI tailor content to your industry and audience
						</Text>
					</Stack>

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

				<Divider />

				{/* Examples & Instructions Section */}
				<Stack gap="md">
					<Stack gap="xs">
						<Text as="h3" size="lg" weight="semibold">
							Examples & Instructions
						</Text>
						<Text color="muted" size="sm">
							Provide reference posts and custom guidance for the AI
						</Text>
					</Stack>

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

				<Divider />

				{/* Save */}
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
		</Container>
	);
});

VoiceProfileTab.displayName = "VoiceProfileTab";
