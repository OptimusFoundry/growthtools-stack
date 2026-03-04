export type MediaSource = "upload" | "ai_generated" | "url_import";

export interface MediaItem {
	id: string;
	accountId: string;
	filename: string;
	contentType: string;
	s3Url: string;
	sizeBytes: number;
	width?: number;
	height?: number;
	altText?: string;
	source: MediaSource;
	createdAt: string;
	updatedAt: string;
}

export function isImageType(contentType: string): boolean {
	return contentType.startsWith("image/");
}

export function isVideoType(contentType: string): boolean {
	return contentType.startsWith("video/");
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
