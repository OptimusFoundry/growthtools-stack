export type PlatformType =
	| "x"
	| "linkedin"
	| "bluesky"
	| "facebook"
	| "instagram"
	| "threads"
	| "tiktok"
	| "pinterest";

export interface PlatformConnection {
	id: string;
	accountId: string;
	platform: PlatformType;
	platformUserId: string;
	displayName?: string;
	status: "active" | "expired" | "revoked" | "error";
	scopes: string[];
	connectedAt: string;
	createdAt: string;
	updatedAt: string;
}

export interface OAuthState {
	platform: PlatformType;
	authUrl: string;
}

export interface PlatformInfo {
	description: string;
	icon: React.ReactNode | null;
}

export const PLATFORM_DISPLAY_NAMES: Record<PlatformType, string> = {
	x: "X (Twitter)",
	linkedin: "LinkedIn",
	bluesky: "BlueSky",
	facebook: "Facebook",
	instagram: "Instagram",
	threads: "Threads",
	tiktok: "TikTok",
	pinterest: "Pinterest",
};

export const PLATFORM_CHAR_LIMITS: Record<PlatformType, number> = {
	x: 280,
	linkedin: 3000,
	bluesky: 300,
	facebook: 63206,
	instagram: 2200,
	threads: 500,
	tiktok: 2200,
	pinterest: 500,
};

export const PLATFORM_MEDIA_REQUIRED: Record<PlatformType, boolean> = {
	x: false,
	linkedin: false,
	bluesky: false,
	facebook: false,
	instagram: true,
	threads: false,
	tiktok: true,
	pinterest: true,
};

export const PLATFORM_SUPPORTS_THREADS: Record<PlatformType, boolean> = {
	x: true,
	linkedin: false,
	bluesky: true,
	facebook: false,
	instagram: false,
	threads: true,
	tiktok: false,
	pinterest: false,
};

export const PLATFORM_INFO: Record<PlatformType, PlatformInfo> = {
	x: {
		description: "Post tweets and threads to your audience",
		icon: null,
	},
	bluesky: {
		description: "Share posts on the decentralized network",
		icon: null,
	},
	threads: {
		description: "Publish content to Meta's text platform",
		icon: null,
	},
	linkedin: {
		description: "Share posts to your professional network",
		icon: null,
	},
	facebook: {
		description: "Share posts to your Facebook audience",
		icon: null,
	},
	instagram: {
		description: "Share posts to Instagram",
		icon: null,
	},
	tiktok: {
		description: "Share videos to TikTok",
		icon: null,
	},
	pinterest: {
		description: "Share pins to Pinterest",
		icon: null,
	},
};
