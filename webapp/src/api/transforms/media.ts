/**
 * Media Transformers
 *
 * Transform between API (snake_case) and UI (camelCase) media types
 */

import type { MediaItem } from "@/types/media";
import type { ApiMediaItem } from "../types/media";

export function toMediaItem(api: ApiMediaItem): MediaItem {
	return {
		id: api.id,
		accountId: api.account_id,
		filename: api.filename,
		contentType: api.content_type,
		url: `${import.meta.env.VITE_API_URL}/api/protected/media/${api.id}/file`,
		sizeBytes: api.size_bytes,
		width: api.width,
		height: api.height,
		altText: api.alt_text,
		source: api.source,
		createdAt: api.created_at,
		updatedAt: api.updated_at,
	};
}

export function toMediaItems(apiItems: ApiMediaItem[]): MediaItem[] {
	return apiItems.map(toMediaItem);
}
