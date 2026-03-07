/**
 * Platform Transformers
 *
 * Transform between API (snake_case) and UI (camelCase) platform types
 */

import type { PlatformConnection } from "@/types/platform";
import type { ApiPlatformConnection } from "../types/platform";

export function toPlatformConnection(
	api: ApiPlatformConnection,
): PlatformConnection {
	return {
		id: api.id,
		accountId: api.account_id,
		platform: api.platform,
		platformUserId: api.platform_user_id,
		displayName: api.display_name,
		status: api.status,
		scopes: api.scopes ?? [],
		connectedAt: api.connected_at,
		createdAt: api.created_at,
		updatedAt: api.updated_at,
	};
}

export function toPlatformConnections(
	apiConnections: ApiPlatformConnection[],
): PlatformConnection[] {
	return apiConnections.map(toPlatformConnection);
}
