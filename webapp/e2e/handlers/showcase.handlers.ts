/**
 * Showcase Post API handlers (EP-005 "Showcase Post from Brief")
 *
 * Canonical surface: `showcaseEndpoints` — one `setupEndpoint(...)` for the
 * single POST route. `showcaseHandlers` is the default 2xx happy-path array,
 * built from the `[200]()` factory. `showcaseScenarios` retains the one
 * semantic variant that can't be expressed via the shared numeric-status
 * dict alone — the `SHOWCASE_NO_COMPONENT_MATCH` 400 sub-case, since
 * `setupEndpoint`'s `400` key can only hold one canned body per endpoint and
 * this endpoint has three distinct 400 sub-cases (see contract).
 */
import { HttpResponse, http } from "msw";
import { setupEndpoint } from "../helpers/endpoint";

const acceptedJob = {
	job_id: "job_showcase_1",
	status: "capturing",
};

export const showcaseEndpoints = {
	create: setupEndpoint("POST", "*/api/protected/showcase-posts", acceptedJob, {
		successStatus: 202,
		overrides: {
			400: {
				error: "Storybook is not configured for this account",
				code: "STORYBOOK_NOT_CONFIGURED",
			},
			503: {
				error: "Failed to enqueue showcase capture job",
				code: "SHOWCASE_ENQUEUE_FAILED",
			},
		},
	}),
};

export const showcaseHandlers = Object.values(showcaseEndpoints).map((e) =>
	e[200](),
);

export const showcaseScenarios = {
	/** 400: brief didn't resolve to a known component (SHOWCASE_NO_COMPONENT_MATCH). */
	noComponentMatch: () =>
		http.post("*/api/protected/showcase-posts", () =>
			HttpResponse.json(
				{
					error: "Couldn't match the brief to a component in Storybook",
					code: "SHOWCASE_NO_COMPONENT_MATCH",
				},
				{ status: 400 },
			),
		),

	/** 400: generic validation failure (e.g. empty/too-short brief). */
	validationFailure: () =>
		http.post("*/api/protected/showcase-posts", () =>
			HttpResponse.json(
				{ error: "Brief is required", code: "INVALID_INPUT" },
				{ status: 400 },
			),
		),
};
