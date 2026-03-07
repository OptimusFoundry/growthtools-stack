/**
 * Media API Types
 *
 * API response types for media (snake_case, matches Go JSON tags)
 */

import type { MediaSource } from "@/types/media";

export interface ApiMediaItem {
	id: string;
	account_id: string;
	filename: string;
	content_type: string;
	s3_url: string;
	size_bytes: number;
	width?: number;
	height?: number;
	alt_text?: string;
	source: MediaSource;
	created_at: string;
	updated_at: string;
}
