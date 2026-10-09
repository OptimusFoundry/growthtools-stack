/**
 * Platforms + GitHub connection handlers
 *
 * The githubRepos* handlers move to github.handlers.ts when F13 creates it.
 */
import { HttpResponse, http } from "msw";
import { setupEndpoint } from "../helpers/endpoint";
import {
	githubConnection,
	githubRepos,
	platformConnections,
} from "../mocks/data";

// Same-origin so the post-init `window.location.href` navigation stays in the app.
export const githubOAuthUrl = "/account?tab=platforms&github=oauth-stub";
export const platformOAuthUrl = "/account?tab=platforms&oauth=stub";

const blueskyConnection = platformConnections.find(
	(c) => c.platform === "bluesky",
);
const activeBluesky = blueskyConnection && {
	...blueskyConnection,
	status: "active" as const,
};
export const connectionsWithoutBluesky = platformConnections.filter(
	(c) => c.platform !== "bluesky",
);

export const platformsEndpoints = {
	list: setupEndpoint("GET", "*/api/protected/platforms", platformConnections),
	bluesky: setupEndpoint(
		"POST",
		"*/api/protected/platforms/bluesky",
		activeBluesky,
		{ successStatus: 200 },
	),
	token: setupEndpoint(
		"POST",
		"*/api/protected/platforms/token",
		platformConnections[0],
		{ successStatus: 200 },
	),
	oauthInit: setupEndpoint(
		"POST",
		"*/api/protected/platforms/oauth/init",
		{ auth_url: platformOAuthUrl },
		{ successStatus: 200 },
	),
	disconnect: setupEndpoint("DELETE", "*/api/protected/platforms/:id", null),
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

export const platformsHandlers = [
	...Object.values(platformsEndpoints),
	...Object.values(githubEndpoints),
	...Object.values(githubReposEndpoints),
].map((e) => e[200]());

export const platformsScenarios = {
	/** 200 with empty connections list */
	empty: () =>
		http.get("*/api/protected/platforms", () => HttpResponse.json([])),

	/**
	 * List without BlueSky until the connect POST succeeds, then BlueSky active.
	 * Fresh closure per call so state never leaks between tests.
	 */
	blueskyConnectFlow: () => {
		let connected = false;
		return [
			http.get("*/api/protected/platforms", () =>
				HttpResponse.json(
					connected
						? [...connectionsWithoutBluesky, activeBluesky]
						: connectionsWithoutBluesky,
				),
			),
			http.post("*/api/protected/platforms/bluesky", () => {
				connected = true;
				return HttpResponse.json(activeBluesky);
			}),
		];
	},

	/** List without BlueSky, static — for the failing-connect cases. */
	withoutBluesky: () =>
		http.get("*/api/protected/platforms", () =>
			HttpResponse.json(connectionsWithoutBluesky),
		),

	/** Stateful repos: POST connect / DELETE disconnect flip what the next GET returns. */
	githubReposStateful: () => {
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
