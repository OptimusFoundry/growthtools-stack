export interface VoiceProfile {
	id: string;
	accountId: string;
	tone: string;
	style: string;
	examplePosts: string[];
	industry?: string;
	targetAudience?: string;
	customInstructions?: string;
	createdAt: string;
	updatedAt: string;
}

export interface UpdateVoiceProfileRequest {
	tone?: string;
	style?: string;
	example_posts?: string[];
	industry?: string;
	target_audience?: string;
	custom_instructions?: string;
}

export const TONE_OPTIONS = [
	"professional",
	"casual",
	"witty",
	"inspirational",
	"educational",
	"conversational",
] as const;

export const STYLE_OPTIONS = [
	"concise",
	"detailed",
	"storytelling",
	"data-driven",
	"question-based",
	"listicle",
] as const;
