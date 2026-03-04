/**
 * Mock data for E2E tests
 *
 * Uses snake_case to match API response format
 */

import type { ApiAPIKey } from "../../../src/api/types/apikey";
import type { ApiPrice, ApiSubscription } from "../../../src/api/types/billing";
import type { ApiCampaign } from "../../../src/api/types/campaign";
import type { ApiSegment } from "../../../src/api/types/segment";
import type { ApiTierInfo, ApiTierName } from "../../../src/api/types/tier";
import type { ApiUser } from "../../../src/api/types/user";
import type { ApiWebhook } from "../../../src/api/types/webhook";

// ============================================================================
// Tier Configurations
// ============================================================================

export const tiers: Record<ApiTierName, ApiTierInfo> = {
	free: {
		tier_name: "free",
		display_name: "Free",
		price_description: "$0/month",
		features: {
			campaigns: true,
			referrals: false,
			webhooks: false,
			api_access: false,
			custom_branding: false,
			analytics: false,
			integrations: false,
		},
		limits: {
			campaigns: 1,
			signups_per_campaign: 100,
			team_members: 1,
			email_sends: 0,
		},
	},
	pro: {
		tier_name: "pro",
		display_name: "Pro",
		price_description: "$29/month",
		features: {
			campaigns: true,
			referrals: true,
			webhooks: true,
			api_access: true,
			custom_branding: true,
			analytics: true,
			integrations: false,
		},
		limits: {
			campaigns: 10,
			signups_per_campaign: 10000,
			team_members: 3,
			email_sends: 5000,
		},
	},
	team: {
		tier_name: "team",
		display_name: "Team",
		price_description: "$99/month",
		features: {
			campaigns: true,
			referrals: true,
			webhooks: true,
			api_access: true,
			custom_branding: true,
			analytics: true,
			integrations: true,
		},
		limits: {
			campaigns: null, // unlimited
			signups_per_campaign: null,
			team_members: null,
			email_sends: null,
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
	persona: "marketing",
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
// Campaign Data
// ============================================================================

const now = new Date().toISOString();

export const campaigns: ApiCampaign[] = [
	{
		id: "camp_1",
		account_id: "acc_123",
		name: "Product Launch Waitlist",
		slug: "product-launch",
		description: "Beta access waitlist for our new product",
		status: "active",
		type: "waitlist",
		launch_date: "2025-01-15T00:00:00Z",
		total_signups: 1234,
		total_verified: 1100,
		total_referrals: 456,
		created_at: now,
		updated_at: now,
		email_settings: {
			id: "email_1",
			campaign_id: "camp_1",
			from_name: "Product Team",
			from_email: "hello@example.com",
			verification_required: true,
			send_welcome_email: true,
			created_at: now,
			updated_at: now,
		},
		form_fields: [
			{
				id: "field_1",
				campaign_id: "camp_1",
				name: "email",
				field_type: "email",
				label: "Email Address",
				placeholder: "you@example.com",
				required: true,
				display_order: 0,
				created_at: now,
				updated_at: now,
			},
		],
	},
	{
		id: "camp_2",
		account_id: "acc_123",
		name: "Referral Contest",
		slug: "referral-contest",
		description: "Win prizes by referring friends",
		status: "draft",
		type: "referral",
		total_signups: 0,
		total_verified: 0,
		total_referrals: 0,
		created_at: now,
		updated_at: now,
	},
	{
		id: "camp_3",
		account_id: "acc_123",
		name: "Early Access",
		slug: "early-access",
		status: "paused",
		type: "waitlist",
		total_signups: 567,
		total_verified: 500,
		total_referrals: 123,
		created_at: now,
		updated_at: now,
	},
];

export const getCampaignById = (id: string): ApiCampaign | undefined =>
	campaigns.find((c) => c.id === id);

// ============================================================================
// Webhook Data
// ============================================================================

export const webhooks: ApiWebhook[] = [
	{
		id: "wh_1",
		account_id: "acc_123",
		url: "https://api.example.com/webhooks/waitlist",
		events: ["user.created", "user.verified"],
		status: "active",
		retry_enabled: true,
		max_retries: 3,
		total_sent: 1234,
		total_failed: 12,
		last_success_at: now,
		created_at: now,
		updated_at: now,
	},
	{
		id: "wh_2",
		account_id: "acc_123",
		campaign_id: "camp_1",
		url: "https://hooks.zapier.com/hooks/catch/123/abc",
		events: ["referral.created", "referral.verified"],
		status: "active",
		retry_enabled: true,
		max_retries: 5,
		total_sent: 456,
		total_failed: 0,
		created_at: now,
		updated_at: now,
	},
];

// ============================================================================
// API Key Data
// ============================================================================

export const apiKeys: ApiAPIKey[] = [
	{
		id: "key_1",
		name: "Production API Key",
		key_prefix: "wl_live_abc",
		scopes: ["read", "write"],
		status: "active",
		last_used_at: now,
		total_requests: 5678,
		created_at: now,
	},
	{
		id: "key_2",
		name: "Zapier Integration",
		key_prefix: "wl_live_xyz",
		scopes: ["zapier"],
		status: "active",
		total_requests: 123,
		created_at: now,
	},
];

export const apiKeyScopes = ["zapier", "webhooks", "read", "write", "all"];

// ============================================================================
// Segment Data
// ============================================================================

export const segments: ApiSegment[] = [
	{
		id: "seg_1",
		campaign_id: "camp_1",
		name: "Verified Users",
		description: "All verified email users",
		filter_criteria: {
			email_verified: true,
		},
		cached_user_count: 1100,
		cached_at: now,
		status: "active",
		created_at: now,
		updated_at: now,
	},
	{
		id: "seg_2",
		campaign_id: "camp_1",
		name: "Top Referrers",
		description: "Users with 5+ referrals",
		filter_criteria: {
			min_referrals: 5,
			email_verified: true,
		},
		cached_user_count: 45,
		cached_at: now,
		status: "active",
		created_at: now,
		updated_at: now,
	},
];
