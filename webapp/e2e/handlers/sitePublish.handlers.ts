/**
 * Site Publish settings API handlers
 *
 * Canonical surface: `sitePublishEndpoints` — one `setupEndpoint(...)` per
 * route. `sitePublishHandlers` is the default 2xx happy-path array (the
 * "configured" state). `sitePublishScenarios` exposes the `notConfigured`
 * variant — a 404 on GET, which is a normal (not error) first-load state.
 */
import { HttpResponse, http } from "msw";
import { setupEndpoint } from "../helpers/endpoint";
import { sitePublishTarget } from "../mocks/data";

export const sitePublishEndpoints = {
	get: setupEndpoint(
		"GET",
		"*/api/protected/settings/site-publish",
		sitePublishTarget,
		{
			overrides: {
				404: { error: "Site publish target not configured", code: "NOT_FOUND" },
			},
		},
	),
	update: setupEndpoint(
		"PUT",
		"*/api/protected/settings/site-publish",
		sitePublishTarget,
		{
			overrides: {
				400: { error: "Validation failed", code: "INVALID_INPUT" },
			},
		},
	),
};

export const sitePublishHandlers = Object.values(sitePublishEndpoints).map(
	(e) => e[200](),
);

export const sitePublishScenarios = {
	/** 404: no site publish target configured yet — normal first-load state. */
	notConfigured: () => sitePublishEndpoints.get[404](),
};
