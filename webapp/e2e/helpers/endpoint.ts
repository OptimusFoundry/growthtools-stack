/**
 * setupEndpoint — MSW handler factory for backend endpoints.
 *
 * The Go backend emits every API error as `{ error, code? }` via `apierrors`
 * with a fixed set of status codes (400/401/403/404/409/500/503). This helper
 * takes (method, path, goodBody) and returns a dict of handler factories keyed
 * by status. Tests iterate the dict to table-drive coverage.
 *
 * Example:
 *   const posts = setupEndpoint("GET", "*​/api/protected/posts", mockPosts);
 *   network.use(posts[401]());   // registers a 401 handler for this test
 */

import {
	type DefaultBodyType,
	type HttpHandler,
	HttpResponse,
	http,
} from "msw";

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 500 | 503;
export type StatusKey = 200 | ErrorStatus | "transport";

/** Canonical backend error shape (see base-server/internal/infra/apierrors). */
export interface ApiErrorBody {
	error: string;
	code?: string;
}

export interface SetupEndpointOptions {
	/** Override the success status. Defaults: GET→200, POST→201, PUT/PATCH→200, DELETE→204. */
	successStatus?: number;
	/** Replace the canned error body for one or more statuses. Shape stays `{error, code}`. */
	overrides?: Partial<Record<ErrorStatus, ApiErrorBody>>;
}

export type EndpointHandlers = Record<StatusKey, () => HttpHandler>;

// ── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_SUCCESS_STATUS: Record<Method, number> = {
	GET: 200,
	POST: 201,
	PUT: 200,
	PATCH: 200,
	DELETE: 204,
};

const DEFAULT_ERROR_BODIES: Record<ErrorStatus, ApiErrorBody> = {
	400: { error: "invalid input", code: "INVALID_INPUT" },
	401: { error: "Unauthorized", code: "UNAUTHORIZED" },
	403: { error: "Forbidden", code: "FORBIDDEN" },
	404: { error: "not found", code: "NOT_FOUND" },
	409: { error: "conflict", code: "CONFLICT" },
	500: {
		error: "An internal error occurred. Please try again later.",
		code: "INTERNAL_ERROR",
	},
	503: { error: "service unavailable", code: "SERVICE_UNAVAILABLE" },
};

const ERROR_STATUSES: ErrorStatus[] = [400, 401, 403, 404, 409, 500, 503];

// ── Builder ────────────────────────────────────────────────────────────────

function pickMswMethod(method: Method) {
	switch (method) {
		case "GET":
			return http.get;
		case "POST":
			return http.post;
		case "PUT":
			return http.put;
		case "PATCH":
			return http.patch;
		case "DELETE":
			return http.delete;
	}
}

/**
 * Builds a dict of MSW handler factories for every status the backend can
 * return for a given endpoint, plus a transport-failure handler.
 *
 * The dict key is always `200` for the success handler regardless of the
 * wire status (POST→201, DELETE→204, …). This keeps iteration uniform
 * across methods — tests don't need to know per-method conventions.
 */
export function setupEndpoint<TGood extends DefaultBodyType = DefaultBodyType>(
	method: Method,
	path: string,
	goodBody: TGood,
	options: SetupEndpointOptions = {},
): EndpointHandlers {
	const mswMethod = pickMswMethod(method);
	const successStatus = options.successStatus ?? DEFAULT_SUCCESS_STATUS[method];
	const errorBodies: Record<ErrorStatus, ApiErrorBody> = {
		...DEFAULT_ERROR_BODIES,
		...(options.overrides ?? {}),
	};

	const successFactory = (): HttpHandler =>
		mswMethod(path, () => {
			// 204 has no body; other 2xx statuses serialize goodBody as JSON.
			if (successStatus === 204) {
				return new HttpResponse(null, { status: 204 });
			}
			return HttpResponse.json(goodBody, { status: successStatus });
		});

	const errorFactoryFor = (status: ErrorStatus) => (): HttpHandler =>
		mswMethod(path, () => HttpResponse.json(errorBodies[status], { status }));

	const transportFactory = (): HttpHandler =>
		mswMethod(path, () => HttpResponse.error());

	const handlers = {
		200: successFactory,
		transport: transportFactory,
	} as EndpointHandlers;
	for (const status of ERROR_STATUSES) {
		handlers[status] = errorFactoryFor(status);
	}
	return handlers;
}
