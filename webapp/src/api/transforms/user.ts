/**
 * User Transformers
 *
 * Transform between API (snake_case) and UI (camelCase) user types
 */

import type { User } from "@/types/user";
import type { ApiUser } from "../types/user";
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
