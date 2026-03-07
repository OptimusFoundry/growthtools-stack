/**
 * Voice Profile API Types
 *
 * API response types for voice profile (snake_case, matches Go JSON tags)
 */

export interface ApiVoiceProfile {
	id: string;
	account_id: string;
	tone: string;
	style: string;
	example_posts: string[];
	industry?: string;
	target_audience?: string;
	custom_instructions?: string;
	created_at: string;
	updated_at: string;
}
