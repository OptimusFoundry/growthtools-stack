/**
 * User Transformers
 *
 * Transform between API (snake_case) and UI (camelCase) user types
 */

import type { User, WaitlistUser } from "@/types/user";
import type { ApiUser, ApiWaitlistUser } from "../types/user";
import { parseDate } from "./base";
import { toUiTierInfo } from "./tier";

// ============================================================================
// API → UI Transformers
// ============================================================================

export function toUiUser(api: ApiUser): User {
	return {
		firstName: api.first_name,
		lastName: api.last_name,
		externalId: api.external_id,
		persona: api.persona,
		tier: api.tier ? toUiTierInfo(api.tier) : undefined,
	};
}

export function toUiWaitlistUser(api: ApiWaitlistUser): WaitlistUser {
	return {
		id: api.id,
		campaignId: api.campaign_id,
		email: api.email,
		emailVerified: api.email_verified,
		status: api.status,
		position: api.position,
		originalPosition: api.original_position,
		referralCode: api.referral_code,
		referredById: api.referred_by_id,
		referralCount: api.referral_count,
		verifiedReferralCount: api.verified_referral_count,
		shareCount: api.share_count,
		points: api.points,
		source: api.source,
		termsAccepted: api.terms_accepted,
		marketingConsent: api.marketing_consent,
		customFields: api.metadata ?? api.custom_fields,
		utmSource: api.utm_source,
		utmMedium: api.utm_medium,
		utmCampaign: api.utm_campaign,
		utmContent: api.utm_content,
		utmTerm: api.utm_term,
		createdAt: parseDate(api.created_at)!,
		updatedAt: parseDate(api.updated_at)!,
	};
}

export function toUiWaitlistUsers(users: ApiWaitlistUser[]): WaitlistUser[] {
	return users.map(toUiWaitlistUser);
}
