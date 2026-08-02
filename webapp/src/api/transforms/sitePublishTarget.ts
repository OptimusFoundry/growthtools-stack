/**
 * Site Publish Target Transformers
 *
 * Transform between API (snake_case) and UI (camelCase) site publish target types
 */

import type { SitePublishTarget } from "@/types/sitePublishTarget";
import type { ApiSitePublishTarget } from "../types/sitePublishTarget";

export function toSitePublishTarget(
	api: ApiSitePublishTarget,
): SitePublishTarget {
	return {
		id: api.id,
		accountId: api.account_id,
		repoOwner: api.repo_owner,
		repoName: api.repo_name,
		baseBranch: api.base_branch,
		contentPath: api.content_path,
		createdAt: api.created_at,
		updatedAt: api.updated_at,
	};
}
