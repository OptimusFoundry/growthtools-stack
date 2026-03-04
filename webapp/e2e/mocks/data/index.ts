/**
 * Mock data for E2E tests
 *
 * Uses camelCase to match frontend type format (hooks transform API responses)
 */

import type { ApiPrice, ApiSubscription } from "../../../src/api/types/billing";
import type { ApiTierInfo, ApiTierName } from "../../../src/api/types/tier";
import type { ApiUser } from "../../../src/api/types/user";
import type { AnalyticsOverview, PlatformBreakdown, TimeSeriesDataPoint } from "../../../src/types/analytics";
import type { BlogPost } from "../../../src/types/blog";
import type { MediaItem } from "../../../src/types/media";
import type { PlatformConnection } from "../../../src/types/platform";
import type { Post } from "../../../src/types/post";
import type { VoiceProfile } from "../../../src/types/voiceProfile";

// ============================================================================
// Tier Configurations
// ============================================================================

export const tiers: Record<ApiTierName, ApiTierInfo> = {
	free: {
		tier_name: "free",
		display_name: "Free",
		price_description: "$0/month",
		features: {
			posts: true,
			platforms: true,
			ai_chat: false,
			media_library: false,
			blog: false,
			analytics: false,
			scheduling: false,
		},
		limits: {
			posts_per_month: 10,
			platforms: 2,
			media_storage_mb: 100,
			ai_generations: 0,
		},
	},
	pro: {
		tier_name: "pro",
		display_name: "Pro",
		price_description: "$29/month",
		features: {
			posts: true,
			platforms: true,
			ai_chat: true,
			media_library: true,
			blog: true,
			analytics: true,
			scheduling: true,
		},
		limits: {
			posts_per_month: 100,
			platforms: 8,
			media_storage_mb: 5000,
			ai_generations: 500,
		},
	},
	team: {
		tier_name: "team",
		display_name: "Team",
		price_description: "$99/month",
		features: {
			posts: true,
			platforms: true,
			ai_chat: true,
			media_library: true,
			blog: true,
			analytics: true,
			scheduling: true,
		},
		limits: {
			posts_per_month: null,
			platforms: null,
			media_storage_mb: null,
			ai_generations: null,
		},
	},
};

// ============================================================================
// User Data
// ============================================================================

export const createUser = (tier: ApiTierName = "pro"): ApiUser => ({
	first_name: "Test",
	last_name: "User",
	external_id: "user_test_123",
	persona: "content_creator",
	tier: tiers[tier],
});

export const users = {
	free: createUser("free"),
	pro: createUser("pro"),
	team: createUser("team"),
};

// ============================================================================
// Subscription Data
// ============================================================================

export const subscriptions: Record<"pro" | "team", ApiSubscription> = {
	pro: {
		id: "sub_pro_123",
		status: "active",
		price_id: "price_pro_monthly",
		start_date: "2025-01-01T00:00:00Z",
		end_date: "2026-01-01T00:00:00Z",
		next_billing_date: "2025-02-01T00:00:00Z",
	},
	team: {
		id: "sub_team_123",
		status: "active",
		price_id: "price_team_monthly",
		start_date: "2025-01-01T00:00:00Z",
		end_date: "2026-01-01T00:00:00Z",
		next_billing_date: "2025-02-01T00:00:00Z",
	},
};

export const prices: ApiPrice[] = [
	{
		product_id: "prod_free",
		price_id: "price_free",
		description: "free",
		unit_amount: 0,
		currency: "usd",
		interval: "month",
	},
	{
		product_id: "prod_pro",
		price_id: "price_pro_monthly",
		description: "pro",
		unit_amount: 2900,
		currency: "usd",
		interval: "month",
	},
	{
		product_id: "prod_team",
		price_id: "price_team_monthly",
		description: "team",
		unit_amount: 9900,
		currency: "usd",
		interval: "month",
	},
];

// ============================================================================
// Post Data
// ============================================================================

const now = new Date().toISOString();

export const posts: Post[] = [
	{
		id: "post_1",
		accountId: "acc_123",
		title: "Announcing our new feature launch",
		content: "We just shipped an amazing new feature that will change the way you manage social media.",
		contentType: "text",
		status: "published",
		publishedAt: "2025-12-15T10:00:00Z",
		mediaIds: [],
		tags: ["announcement", "product"],
		aiGenerated: false,
		source: "manual",
		createdAt: now,
		updatedAt: now,
	},
	{
		id: "post_2",
		accountId: "acc_123",
		title: "AI-generated tips for developers",
		content: "Here are 5 tips every developer should know when building social media integrations.",
		contentType: "thread",
		status: "draft",
		mediaIds: [],
		tags: ["tips", "development"],
		aiGenerated: true,
		source: "ai_generated",
		createdAt: now,
		updatedAt: now,
	},
	{
		id: "post_3",
		accountId: "acc_123",
		title: "Weekly community update",
		content: "This week's community highlights including top contributors and trending topics.",
		contentType: "image",
		status: "scheduled",
		scheduledAt: "2026-04-01T14:00:00Z",
		mediaIds: ["media_1"],
		tags: ["community", "weekly"],
		aiGenerated: false,
		source: "manual",
		createdAt: now,
		updatedAt: now,
	},
];

export const getPostById = (id: string): Post | undefined =>
	posts.find((p) => p.id === id);

// ============================================================================
// Platform Connection Data
// ============================================================================

export const platformConnections: PlatformConnection[] = [
	{
		id: "conn_1",
		accountId: "acc_123",
		platform: "x",
		platformUserId: "x_user_123",
		displayName: "@testuser",
		status: "active",
		connectedAt: "2025-06-01T00:00:00Z",
		createdAt: now,
		updatedAt: now,
	},
	{
		id: "conn_2",
		accountId: "acc_123",
		platform: "linkedin",
		platformUserId: "li_user_456",
		displayName: "Test User",
		status: "active",
		connectedAt: "2025-06-15T00:00:00Z",
		createdAt: now,
		updatedAt: now,
	},
	{
		id: "conn_3",
		accountId: "acc_123",
		platform: "bluesky",
		platformUserId: "bs_user_789",
		displayName: "testuser.bsky.social",
		status: "expired",
		connectedAt: "2025-05-01T00:00:00Z",
		createdAt: now,
		updatedAt: now,
	},
];

// ============================================================================
// Media Data
// ============================================================================

export const mediaItems: MediaItem[] = [
	{
		id: "media_1",
		accountId: "acc_123",
		filename: "product-screenshot.png",
		contentType: "image/png",
		s3Url: "https://cdn.example.com/media/product-screenshot.png",
		sizeBytes: 524288,
		width: 1920,
		height: 1080,
		altText: "Product screenshot",
		source: "upload",
		createdAt: now,
		updatedAt: now,
	},
	{
		id: "media_2",
		accountId: "acc_123",
		filename: "demo-video.mp4",
		contentType: "video/mp4",
		s3Url: "https://cdn.example.com/media/demo-video.mp4",
		sizeBytes: 10485760,
		source: "upload",
		createdAt: now,
		updatedAt: now,
	},
	{
		id: "media_3",
		accountId: "acc_123",
		filename: "ai-generated-banner.jpg",
		contentType: "image/jpeg",
		s3Url: "https://cdn.example.com/media/ai-generated-banner.jpg",
		sizeBytes: 204800,
		width: 1200,
		height: 630,
		altText: "AI-generated social media banner",
		source: "ai_generated",
		createdAt: now,
		updatedAt: now,
	},
];

// ============================================================================
// Blog Data
// ============================================================================

export const blogPosts: BlogPost[] = [
	{
		id: "blog_1",
		accountId: "acc_123",
		title: "Getting Started with Growth Tools",
		slug: "getting-started",
		content: "A comprehensive guide to setting up your social media automation.",
		excerpt: "Learn how to set up Growth Tools for your workflow.",
		status: "published",
		seoTitle: "Getting Started with Growth Tools | Guide",
		metaDescription: "Learn how to get started with Growth Tools for social media automation.",
		keywords: ["growth tools", "getting started", "social media"],
		publishedAt: "2025-11-01T12:00:00Z",
		createdAt: now,
		updatedAt: now,
	},
	{
		id: "blog_2",
		accountId: "acc_123",
		title: "Top 10 Social Media Tips for Developers",
		slug: "social-media-tips-developers",
		content: "Developer-focused tips for building an online presence.",
		excerpt: "Practical social media tips for software developers.",
		status: "draft",
		keywords: ["developers", "social media", "tips"],
		createdAt: now,
		updatedAt: now,
	},
	{
		id: "blog_3",
		accountId: "acc_123",
		title: "Old Announcement Post",
		slug: "old-announcement",
		content: "This post has been archived.",
		status: "archived",
		keywords: ["archive"],
		createdAt: "2025-01-01T00:00:00Z",
		updatedAt: "2025-06-01T00:00:00Z",
	},
];

// ============================================================================
// Analytics Data
// ============================================================================

export const analyticsOverview: AnalyticsOverview = {
	totalImpressions: 125400,
	totalLikes: 8920,
	totalComments: 1456,
	totalShares: 3210,
	totalClicks: 6780,
	engagementRate: 4.2,
};

export const analyticsTimeseries: TimeSeriesDataPoint[] = [
	{ date: "2025-12-01", impressions: 4200, likes: 310, comments: 45, shares: 120, clicks: 230 },
	{ date: "2025-12-02", impressions: 3800, likes: 290, comments: 52, shares: 98, clicks: 210 },
	{ date: "2025-12-03", impressions: 5100, likes: 420, comments: 67, shares: 145, clicks: 310 },
	{ date: "2025-12-04", impressions: 4600, likes: 380, comments: 41, shares: 110, clicks: 260 },
	{ date: "2025-12-05", impressions: 6200, likes: 510, comments: 78, shares: 190, clicks: 380 },
	{ date: "2025-12-06", impressions: 3900, likes: 270, comments: 33, shares: 85, clicks: 190 },
	{ date: "2025-12-07", impressions: 4500, likes: 350, comments: 55, shares: 130, clicks: 250 },
];

export const platformBreakdown: PlatformBreakdown[] = [
	{ platform: "x", impressions: 45000, likes: 3200, comments: 540, shares: 1200, clicks: 2100 },
	{ platform: "linkedin", impressions: 38000, likes: 2800, comments: 620, shares: 1500, clicks: 2800 },
	{ platform: "bluesky", impressions: 22000, likes: 1600, comments: 180, shares: 350, clicks: 980 },
	{ platform: "facebook", impressions: 20400, likes: 1320, comments: 116, shares: 160, clicks: 900 },
];

// ============================================================================
// Voice Profile Data
// ============================================================================

export const voiceProfile: VoiceProfile = {
	id: "voice_1",
	accountId: "acc_123",
	tone: "professional",
	style: "concise",
	examplePosts: [
		"We just shipped a major update. Here's what's new...",
		"5 tips for developers building in public.",
	],
	industry: "technology",
	targetAudience: "developers and founders",
	createdAt: now,
	updatedAt: now,
};
