/**
 * Platforms handlers (GitHub lives in github.handlers.ts)
 */
import { HttpResponse, http } from "msw";
import { setupEndpoint } from "../helpers/endpoint";
import { platformConnections } from "../mocks/data";

// Same-origin so the post-init `window.location.href` navigation stays in the app.
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

export const platformsHandlers = [...Object.values(platformsEndpoints)].map(
	(e) => e[200](),
);

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
};
