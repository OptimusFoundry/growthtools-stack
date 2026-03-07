/**
 * Voice Profile Transformers
 *
 * Transform between API (snake_case) and UI (camelCase) voice profile types
 */

import type { VoiceProfile } from "@/types/voiceProfile";
import type { ApiVoiceProfile } from "../types/voiceProfile";

export function toVoiceProfile(api: ApiVoiceProfile): VoiceProfile {
	return {
		id: api.id,
		accountId: api.account_id,
		tone: api.tone,
		style: api.style,
		examplePosts: api.example_posts ?? [],
		industry: api.industry,
		targetAudience: api.target_audience,
		customInstructions: api.custom_instructions,
		createdAt: api.created_at,
		updatedAt: api.updated_at,
	};
}
