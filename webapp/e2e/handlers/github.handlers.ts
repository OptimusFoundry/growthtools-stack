/**
 * GitHub handlers: connection, repos (account → platforms tab) and the
 * commits list / detail / retry-capture used by /github and /github/:id.
 */
import { HttpResponse, http } from "msw";
import type { GitHubCommit } from "../../src/hooks/useGitHubCommits";
import { setupEndpoint } from "../helpers/endpoint";
import {
	githubCommit,
	githubCommitSummaries,
	githubConnection,
	githubRepos,
} from "../mocks/data";

// Same-origin so the post-init `window.location.href` navigation stays in the app.
export const githubOAuthUrl = "/account?tab=platforms&github=oauth-stub";

export const GITHUB_PAGE_SIZE = 25;
export const GITHUB_PAGINATED_TOTAL = 60;

const commitsList = {
	commits: githubCommitSummaries,
	total: githubCommitSummaries.length,
	limit: GITHUB_PAGE_SIZE,
	offset: 0,
};

export const githubEndpoints = {
	connection: setupEndpoint(
		"GET",
		"*/api/protected/github/connection",
		githubConnection,
	),
	disconnect: setupEndpoint(
		"DELETE",
		"*/api/protected/github/connection",
		null,
	),
	oauthInit: setupEndpoint("GET", "*/api/protected/github/oauth/init", {
		authorize_url: githubOAuthUrl,
	}),
	commits: setupEndpoint("GET", "*/api/protected/github/commits", commitsList),
	commit: setupEndpoint(
		"GET",
		"*/api/protected/github/commits/:id",
		githubCommit,
	),
	retryCapture: setupEndpoint(
		"POST",
		"*/api/protected/github/commits/:id/retry-capture",
		{ status: "queued" },
		{ successStatus: 200 },
	),
};

export const githubReposEndpoints = {
	list: setupEndpoint("GET", "*/api/protected/github/repos", githubRepos),
	connect: setupEndpoint(
		"POST",
		"*/api/protected/github/repos/:owner/:repo/connect",
		{},
		{ successStatus: 200 },
	),
	disconnect: setupEndpoint(
		"DELETE",
		"*/api/protected/github/repos/:owner/:repo",
		null,
	),
};

export const githubHandlers = [
	...Object.values(githubEndpoints),
	...Object.values(githubReposEndpoints),
].map((e) => e[200]());

/** Detail handler for the default commit with fields overridden. */
const commitDetail = (overrides: Partial<GitHubCommit>) =>
	http.get("*/api/protected/github/commits/:id", () =>
		HttpResponse.json({ ...githubCommit, ...overrides }),
	);

const failedOutput = { error: "browser crashed" };

export const githubScenarios = {
	/** Commits list 200 with no rows. */
	commitsEmpty: () =>
		http.get("*/api/protected/github/commits", () =>
			HttpResponse.json({
				commits: [],
				total: 0,
				limit: GITHUB_PAGE_SIZE,
				offset: 0,
			}),
		),

	/** Total above one page; rows are titled "Commit number N" and follow the requested offset. */
	commitsPaginated: () =>
		http.get("*/api/protected/github/commits", ({ request }) => {
			const offset = Number(new URL(request.url).searchParams.get("offset"));
			const count = Math.min(GITHUB_PAGE_SIZE, GITHUB_PAGINATED_TOTAL - offset);
			const template = githubCommitSummaries[0];
			return HttpResponse.json({
				commits: Array.from({ length: count }, (_, i) => ({
					...template,
					id: `gh_paged_${offset + i + 1}`,
					sha: String(offset + i + 1).padStart(7, "0"),
					message: `Commit number ${offset + i + 1}`,
				})),
				total: GITHUB_PAGINATED_TOTAL,
				limit: GITHUB_PAGE_SIZE,
				offset,
			});
		}),

	/** Captured commit with image, video and metadata artifacts (the default). */
	commitCaptured: () => commitDetail({}),
	commitImagesOnly: () =>
		commitDetail({
			capture_output: {
				uploaded: (githubCommit.capture_output?.uploaded ?? []).slice(0, 1),
			},
		}),
	commitVideoOnly: () =>
		commitDetail({
			capture_output: {
				uploaded: (githubCommit.capture_output?.uploaded ?? []).slice(1, 2),
			},
		}),
	commitMetadataOnly: () =>
		commitDetail({
			capture_output: {
				uploaded: (githubCommit.capture_output?.uploaded ?? []).slice(2),
			},
		}),
	commitNoArtifacts: () => commitDetail({ capture_output: { uploaded: [] } }),
	commitSkipped: (reason = "Docs-only change") =>
		commitDetail({
			skipped_reason: reason,
			capture_requested_at: undefined,
			processed_at: undefined,
			capture_output: undefined,
		}),
	commitFailed: () =>
		commitDetail({ capture_output: failedOutput, processed_at: undefined }),
	commitWaiting: () =>
		commitDetail({
			capture_requested_at: undefined,
			processed_at: undefined,
			capture_output: undefined,
		}),
	commitInProgress: () =>
		commitDetail({ processed_at: undefined, capture_output: undefined }),
	commitWithPost: () => commitDetail({ post_id: "post_1" }),
	commitPostDeleted: () =>
		commitDetail({ post_id: "post_1", post_deleted: true }),
	commitWithBlog: () => commitDetail({ blog_post_id: "blog_1" }),
	commitBlogDeleted: () =>
		commitDetail({ blog_post_id: "blog_1", blog_deleted: true }),

	/** Stateful repos: POST connect / DELETE disconnect flip what the next GET returns. */
	reposStateful: () => {
		const connected = new Map(
			githubRepos.map((r) => [`${r.owner.login}/${r.name}`, r.connected]),
		);
		return [
			http.get("*/api/protected/github/repos", () =>
				HttpResponse.json(
					githubRepos.map((r) => ({
						...r,
						connected: connected.get(`${r.owner.login}/${r.name}`) ?? false,
					})),
				),
			),
			http.post(
				"*/api/protected/github/repos/:owner/:repo/connect",
				({ params }) => {
					connected.set(`${params.owner}/${params.repo}`, true);
					return HttpResponse.json({});
				},
			),
			http.delete("*/api/protected/github/repos/:owner/:repo", ({ params }) => {
				connected.set(`${params.owner}/${params.repo}`, false);
				return new HttpResponse(null, { status: 204 });
			}),
		];
	},
};
