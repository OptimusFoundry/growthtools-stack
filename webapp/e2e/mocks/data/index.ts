/**
 * Mock data for E2E tests
 *
 * Uses snake_case to match API response format (Go JSON tags).
 * Hooks transform API responses to camelCase domain types.
 */

import type {
	ApiAnalyticsOverview,
	ApiPlatformBreakdown,
	ApiPlatformPostAnalytics,
	ApiPostAnalytics,
	ApiTimeSeriesDataPoint,
} from "../../../src/api/types/analytics";
import type { ApiPrice, ApiSubscription } from "../../../src/api/types/billing";
import type { ApiBlogPostListItem } from "../../../src/api/types/blog";
import type { ApiMediaItem } from "../../../src/api/types/media";
import type { ApiPlatformConnection } from "../../../src/api/types/platform";
import type { ApiPost, ApiPostListItem } from "../../../src/api/types/post";
import type { ApiSitePublishTarget } from "../../../src/api/types/sitePublishTarget";
import type { ApiTierInfo, ApiTierName } from "../../../src/api/types/tier";
import type { ApiUser } from "../../../src/api/types/user";
import type { ApiVoiceProfile } from "../../../src/api/types/voiceProfile";
import type {
	GitHubCommit,
	GitHubCommitSummary,
} from "../../../src/hooks/useGitHubCommits";
import type { GitHubConnection } from "../../../src/hooks/useGitHubConnection";
import type { GitHubAvailableRepo } from "../../../src/hooks/useGitHubRepos";

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

export const posts: ApiPost[] = [
	{
		id: "post_1",
		account_id: "acc_123",
		title: "Announcing our new feature launch",
		content:
			"We just shipped an amazing new feature that will change the way you manage social media.",
		content_type: "text",
		status: "published",
		published_at: "2025-12-15T10:00:00Z",
		media_ids: [],
		tags: ["announcement", "product"],
		ai_generated: false,
		source: "manual",
		platforms: ["x", "linkedin"],
		created_at: now,
		updated_at: now,
	},
	{
		id: "post_2",
		account_id: "acc_123",
		title: "AI-generated tips for developers",
		content:
			"Here are 5 tips every developer should know when building social media integrations.",
		content_type: "thread",
		status: "draft",
		media_ids: [],
		tags: ["tips", "development"],
		ai_generated: true,
		source: "ai_generated",
		platforms: [],
		created_at: now,
		updated_at: now,
	},
	{
		id: "post_3",
		account_id: "acc_123",
		title: "Weekly community update",
		content:
			"This week's community highlights including top contributors and trending topics.",
		content_type: "image",
		status: "scheduled",
		scheduled_at: "2026-04-01T14:00:00Z",
		media_ids: ["media_1"],
		tags: ["community", "weekly"],
		ai_generated: false,
		source: "manual",
		platforms: ["bluesky"],
		created_at: now,
		updated_at: now,
	},
];

export const getPostById = (id: string): ApiPost | undefined =>
	posts.find((p) => p.id === id);

/**
 * Slim list items — mirrors the GET /api/protected/posts response shape.
 * Does NOT include `content` or `base_content`.
 * post_4 intentionally has no title to test the "Untitled post" fallback.
 */
function toListItem({
	content: _content,
	base_content: _baseContent,
	...rest
}: ApiPost): ApiPostListItem {
	return rest;
}

export const postListItems: ApiPostListItem[] = [
	toListItem(posts[0]),
	toListItem(posts[1]),
	toListItem(posts[2]),
	// Untitled post — simulates a pre-migration post with no title
	{
		id: "post_4",
		account_id: "acc_123",
		content_type: "text",
		status: "draft",
		media_ids: [],
		tags: [],
		ai_generated: false,
		source: "manual",
		platforms: [],
		created_at: now,
		updated_at: now,
	},
];

// ============================================================================
// Platform Connection Data
// ============================================================================

export const platformConnections: ApiPlatformConnection[] = [
	{
		id: "conn_1",
		account_id: "acc_123",
		platform: "x",
		platform_user_id: "x_user_123",
		display_name: "@testuser",
		status: "active",
		scopes: ["read", "write"],
		connected_at: "2025-06-01T00:00:00Z",
		created_at: now,
		updated_at: now,
	},
	{
		id: "conn_2",
		account_id: "acc_123",
		platform: "linkedin",
		platform_user_id: "li_user_456",
		display_name: "Test User",
		status: "active",
		scopes: ["r_liteprofile", "w_member_social"],
		connected_at: "2025-06-15T00:00:00Z",
		created_at: now,
		updated_at: now,
	},
	{
		id: "conn_3",
		account_id: "acc_123",
		platform: "bluesky",
		platform_user_id: "bs_user_789",
		display_name: "testuser.bsky.social",
		status: "expired",
		scopes: [],
		connected_at: "2025-05-01T00:00:00Z",
		created_at: now,
		updated_at: now,
	},
];

// ============================================================================
// GitHub Data
// ============================================================================

export const githubConnection: GitHubConnection = {
	id: "ghc_1",
	user_id: "user_123",
	github_user_id: 4242,
	github_username: "octo-tester",
	scope: "repo,read:user",
	created_at: now,
	updated_at: now,
};

export const githubRepos: GitHubAvailableRepo[] = [
	{
		id: 1001,
		name: "growth-app",
		full_name: "octo-tester/growth-app",
		owner: { login: "octo-tester" },
		default_branch: "main",
		private: false,
		connected: false,
	},
	{
		id: 1002,
		name: "internal-tools",
		full_name: "octo-tester/internal-tools",
		owner: { login: "octo-tester" },
		default_branch: "develop",
		private: true,
		connected: true,
	},
];

export const githubCommitSummaries: GitHubCommitSummary[] = [
	{
		id: "gh_commit_1",
		repo_id: "repo_1",
		sha: "a1b2c3d4e5f6a7b8c9d0",
		author_name: "Octo Tester",
		message: "feat: add capture pipeline\n\nAdds the worker.",
		branch: "main",
		pushed_at: now,
		created_at: now,
		repo_owner: "octo-tester",
		repo_name: "growth-app",
		capture_requested_at: now,
		processed_at: now,
		capture_artifact_count: 3,
	},
	{
		id: "gh_commit_2",
		repo_id: "repo_1",
		sha: "b2c3d4e5f6a7b8c9d0e1",
		author_name: "Octo Tester",
		message: "fix: crash on empty queue",
		branch: "main",
		pushed_at: now,
		created_at: now,
		repo_owner: "octo-tester",
		repo_name: "growth-app",
		capture_requested_at: now,
		processed_at: now,
		capture_artifact_count: 0,
		capture_error: "browser crashed",
	},
	{
		id: "gh_commit_3",
		repo_id: "repo_1",
		sha: "c3d4e5f6a7b8c9d0e1f2",
		author_name: "Octo Tester",
		message: "chore: bump deps",
		branch: "main",
		pushed_at: now,
		created_at: now,
		repo_owner: "octo-tester",
		repo_name: "growth-app",
		capture_artifact_count: 0,
	},
	{
		id: "gh_commit_4",
		repo_id: "repo_1",
		sha: "d4e5f6a7b8c9d0e1f2a3",
		author_name: "Octo Tester",
		message: "feat: launch post generator",
		branch: "main",
		pushed_at: now,
		created_at: now,
		repo_owner: "octo-tester",
		repo_name: "growth-app",
		capture_requested_at: now,
		processed_at: now,
		capture_artifact_count: 2,
		post_id: "post_1",
	},
];

export const githubCommit: GitHubCommit = {
	id: "gh_commit_1",
	repo_id: "repo_1",
	sha: "a1b2c3d4e5f6a7b8c9d0",
	author_name: "Octo Tester",
	message: "feat: add capture pipeline\n\nAdds the worker.",
	branch: "main",
	commit_url:
		"https://github.com/octo-tester/growth-app/commit/a1b2c3d4e5f6a7b8c9d0",
	pushed_at: now,
	created_at: now,
	repo_owner: "octo-tester",
	repo_name: "growth-app",
	capture_requested_at: now,
	processed_at: now,
	capture_output: {
		uploaded: [
			{
				key: "captures/a1b2/shot-1.png",
				url: "https://cdn.example.com/shot-1.png",
			},
			{
				key: "captures/a1b2/demo.mp4",
				url: "https://cdn.example.com/demo.mp4",
			},
			{
				key: "captures/a1b2/steps.json",
				url: "https://cdn.example.com/steps.json",
			},
		],
	},
};

// ============================================================================
// Media Data
// ============================================================================

export const mediaItems: ApiMediaItem[] = [
	{
		id: "media_1",
		account_id: "acc_123",
		filename: "product-screenshot.png",
		content_type: "image/png",
		s3_url: "https://cdn.example.com/media/product-screenshot.png",
		size_bytes: 524288,
		width: 1920,
		height: 1080,
		alt_text: "Product screenshot",
		source: "upload",
		created_at: now,
		updated_at: now,
	},
	{
		id: "media_2",
		account_id: "acc_123",
		filename: "demo-video.mp4",
		content_type: "video/mp4",
		s3_url: "https://cdn.example.com/media/demo-video.mp4",
		size_bytes: 10485760,
		source: "upload",
		created_at: now,
		updated_at: now,
	},
	{
		id: "media_3",
		account_id: "acc_123",
		filename: "ai-generated-banner.jpg",
		content_type: "image/jpeg",
		s3_url: "https://cdn.example.com/media/ai-generated-banner.jpg",
		size_bytes: 204800,
		width: 1200,
		height: 630,
		alt_text: "AI-generated social media banner",
		source: "ai_generated",
		created_at: now,
		updated_at: now,
	},
];

// ============================================================================
// Blog Data
// ============================================================================

export const blogPosts: ApiBlogPostListItem[] = [
	{
		id: "blog_1",
		title: "Getting Started with Growth Tools",
		status: "published",
		published_at: "2025-11-01T12:00:00Z",
		created_at: now,
		updated_at: now,
	},
	{
		id: "blog_2",
		title: "Top 10 Social Media Tips for Developers",
		status: "draft",
		created_at: now,
		updated_at: now,
	},
	{
		id: "blog_3",
		title: "Old Announcement Post",
		status: "archived",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-06-01T00:00:00Z",
	},
];

// ============================================================================
// Analytics Data
// ============================================================================

export const analyticsOverview: ApiAnalyticsOverview = {
	total_impressions: 125400,
	total_likes: 8920,
	total_comments: 1456,
	total_shares: 3210,
	total_clicks: 6780,
	engagement_rate: 4.2,
};

export const analyticsTimeseries: ApiTimeSeriesDataPoint[] = [
	{
		date: "2025-12-01",
		impressions: 4200,
		likes: 310,
		comments: 45,
		shares: 120,
		clicks: 230,
	},
	{
		date: "2025-12-02",
		impressions: 3800,
		likes: 290,
		comments: 52,
		shares: 98,
		clicks: 210,
	},
	{
		date: "2025-12-03",
		impressions: 5100,
		likes: 420,
		comments: 67,
		shares: 145,
		clicks: 310,
	},
	{
		date: "2025-12-04",
		impressions: 4600,
		likes: 380,
		comments: 41,
		shares: 110,
		clicks: 260,
	},
	{
		date: "2025-12-05",
		impressions: 6200,
		likes: 510,
		comments: 78,
		shares: 190,
		clicks: 380,
	},
	{
		date: "2025-12-06",
		impressions: 3900,
		likes: 270,
		comments: 33,
		shares: 85,
		clicks: 190,
	},
	{
		date: "2025-12-07",
		impressions: 4500,
		likes: 350,
		comments: 55,
		shares: 130,
		clicks: 250,
	},
];

export const platformBreakdown: ApiPlatformBreakdown[] = [
	{
		platform: "x",
		impressions: 45000,
		likes: 3200,
		comments: 540,
		shares: 1200,
		clicks: 2100,
	},
	{
		platform: "linkedin",
		impressions: 38000,
		likes: 2800,
		comments: 620,
		shares: 1500,
		clicks: 2800,
	},
	{
		platform: "bluesky",
		impressions: 22000,
		likes: 1600,
		comments: 180,
		shares: 350,
		clicks: 980,
	},
	{
		platform: "facebook",
		impressions: 20400,
		likes: 1320,
		comments: 116,
		shares: 160,
		clicks: 900,
	},
];

// ============================================================================
// Post Analytics Data
// ============================================================================

const snapshot = (impressions: number, likes: number, collectedAt: string) => ({
	impressions,
	likes,
	comments: Math.floor(likes / 5),
	shares: Math.floor(likes / 10),
	clicks: Math.floor(likes / 3),
	collected_at: collectedAt,
});

const xPlatformPost: ApiPlatformPostAnalytics = {
	platform_post_id: "pp_x_1",
	platform: "x",
	status: "published",
	published_at: "2025-12-15T10:00:00Z",
	post_url: "https://x.com/testuser/status/123456",
	analytics_unavailable_at: null,
	latest: snapshot(4200, 310, "2025-12-20T08:00:00Z"),
	history: [
		snapshot(1000, 80, "2025-12-16T08:00:00Z"),
		snapshot(2500, 190, "2025-12-17T08:00:00Z"),
		snapshot(3800, 280, "2025-12-18T08:00:00Z"),
		snapshot(4200, 310, "2025-12-20T08:00:00Z"),
	],
};

const threadsPlatformPost: ApiPlatformPostAnalytics = {
	platform_post_id: "pp_threads_1",
	platform: "threads",
	status: "published",
	published_at: "2025-12-15T10:00:00Z",
	post_url: "https://www.threads.net/@testuser/post/abc123",
	analytics_unavailable_at: null,
	latest: snapshot(1800, 140, "2025-12-20T08:00:00Z"),
	history: [
		snapshot(500, 40, "2025-12-16T08:00:00Z"),
		snapshot(1200, 90, "2025-12-18T08:00:00Z"),
		snapshot(1800, 140, "2025-12-20T08:00:00Z"),
	],
};

/** Happy-path fixture: two platforms with full analytics. */
export const postAnalyticsWithTwoPlatforms: ApiPostAnalytics = {
	platform_posts: [xPlatformPost, threadsPlatformPost],
};

/** Empty fixture: published post, no platform posts collected yet. */
export const postAnalyticsEmpty: ApiPostAnalytics = {
	platform_posts: [],
};

/** Fixture with one platform where analytics became unavailable. */
export const postAnalyticsUnavailable: ApiPostAnalytics = {
	platform_posts: [
		{
			...xPlatformPost,
			analytics_unavailable_at: "2025-12-18T00:00:00Z",
		},
	],
};

// ============================================================================
// Voice Profile Data
// ============================================================================

// ============================================================================
// Site Publish Target Data
// ============================================================================

export const sitePublishTarget: ApiSitePublishTarget = {
	id: "site_publish_1",
	account_id: "acc_123",
	repo_owner: "shubhanshu-dev",
	repo_name: "site",
	base_branch: "main",
	content_path: "src/content/blog",
	created_at: now,
	updated_at: now,
};

export const voiceProfile: ApiVoiceProfile &
	Required<Pick<ApiVoiceProfile, "industry" | "target_audience">> = {
	id: "voice_1",
	account_id: "acc_123",
	tone: "professional",
	style: "concise",
	example_posts: [
		"We just shipped a major update. Here's what's new...",
		"5 tips for developers building in public.",
	],
	industry: "technology",
	target_audience: "developers and founders",
	created_at: now,
	updated_at: now,
};
