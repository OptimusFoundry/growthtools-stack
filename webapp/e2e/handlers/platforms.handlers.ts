/**
 * Platforms API handlers
 */
import { HttpResponse, http } from "msw";
import { setupEndpoint } from "../helpers/endpoint";
import { platformConnections } from "../mocks/data";

export const platformsEndpoints = {
	list: setupEndpoint("GET", "*/api/protected/platforms", platformConnections),
};

export const platformsHandlers = Object.values(platformsEndpoints).map((e) =>
	e[200](),
);

export const platformsScenarios = {
	/** 200 with empty connections list */
	empty: () =>
		http.get("*/api/protected/platforms", () => HttpResponse.json([])),
};
