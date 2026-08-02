export interface SitePublishTarget {
	id: string;
	accountId: string;
	repoOwner: string;
	repoName: string;
	baseBranch: string;
	contentPath: string;
	createdAt: string;
	updatedAt: string;
}

export interface UpdateSitePublishTargetRequest {
	repo_owner: string;
	repo_name: string;
	base_branch: string;
	content_path: string;
}
