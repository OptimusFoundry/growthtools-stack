/**
 * Site Publish Target API Types
 *
 * API response types for site publish target (snake_case, matches Go JSON tags)
 */

export interface ApiSitePublishTarget {
	id: string;
	account_id: string;
	repo_owner: string;
	repo_name: string;
	base_branch: string;
	content_path: string;
	created_at: string;
	updated_at: string;
}
