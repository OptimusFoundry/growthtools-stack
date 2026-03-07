/**
 * Platform API Types
 *
 * API response types for platform connections (snake_case, matches Go JSON tags)
 */

import type { PlatformType } from "@/types/platform";

export interface ApiPlatformConnection {
	id: string;
	account_id: string;
	platform: PlatformType;
	platform_user_id: string;
	display_name?: string;
	scopes: string[];
	status: "active" | "expired" | "revoked" | "error";
	connected_at: string;
	created_at: string;
	updated_at: string;
}
