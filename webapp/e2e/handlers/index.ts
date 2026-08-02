/**
 * MSW Handler exports
 *
 * Default handlers provide a "happy path" Pro tier user experience.
 * Use `endpoints` for numeric-status overrides (foo[401](), foo[500]()).
 * Use `scenarios` for semantic variants that can't be expressed as a status.
 */

import {
	adminEndpoints,
	adminHandlers,
	adminScenarios,
} from "./admin.handlers";
import {
	analyticsEndpoints,
	analyticsHandlers,
	analyticsScenarios,
} from "./analytics.handlers";
import { authEndpoints, authHandlers, authScenarios } from "./auth.handlers";
import {
	billingEndpoints,
	billingHandlers,
	billingScenarios,
	getBillingHandlersForTier,
} from "./billing.handlers";
import { blogEndpoints, blogHandlers, blogScenarios } from "./blog.handlers";
import { chatEndpoints, chatHandlers, chatScenarios } from "./chat.handlers";
import {
	contentEndpoints,
	contentHandlers,
	contentScenarios,
} from "./content.handlers";
import {
	mediaEndpoints,
	mediaHandlers,
	mediaScenarios,
} from "./media.handlers";
import {
	platformsEndpoints,
	platformsHandlers,
	platformsScenarios,
} from "./platforms.handlers";
import {
	postsEndpoints,
	postsHandlers,
	postsScenarios,
} from "./posts.handlers";
import { settingsEndpoints, settingsHandlers } from "./settings.handlers";
import {
	sitePublishEndpoints,
	sitePublishHandlers,
	sitePublishScenarios,
} from "./sitePublish.handlers";

/**
 * Default handlers - Pro tier user with full access
 */
export const handlers = [
	...authHandlers,
	...billingHandlers,
	...postsHandlers,
	...platformsHandlers,
	...mediaHandlers,
	...blogHandlers,
	...analyticsHandlers,
	...settingsHandlers,
	...sitePublishHandlers,
	...contentHandlers,
	...chatHandlers,
	...adminHandlers,
];

/**
 * Export individual handler groups for selective use
 */
export {
	adminEndpoints,
	adminHandlers,
	analyticsEndpoints,
	analyticsHandlers,
	authEndpoints,
	authHandlers,
	billingEndpoints,
	billingHandlers,
	blogEndpoints,
	blogHandlers,
	chatEndpoints,
	chatHandlers,
	contentEndpoints,
	contentHandlers,
	mediaEndpoints,
	mediaHandlers,
	platformsEndpoints,
	platformsHandlers,
	postsEndpoints,
	postsHandlers,
	settingsEndpoints,
	settingsHandlers,
	sitePublishEndpoints,
	sitePublishHandlers,
	sitePublishScenarios,
};

/**
 * Aggregate of per-domain endpoint tables. Use for numeric-status overrides:
 *   network.use(endpoints.posts.list[401]())
 */
export const endpoints = {
	admin: adminEndpoints,
	analytics: analyticsEndpoints,
	auth: authEndpoints,
	billing: billingEndpoints,
	blog: blogEndpoints,
	chat: chatEndpoints,
	content: contentEndpoints,
	media: mediaEndpoints,
	platforms: platformsEndpoints,
	posts: postsEndpoints,
	settings: settingsEndpoints,
	sitePublish: sitePublishEndpoints,
};

/**
 * Aggregate of per-domain semantic scenario variants. Use when a status code
 * is not enough — e.g. `scenarios.blog.empty()`, `scenarios.auth.sessionExpired()`.
 */
export const scenarios = {
	admin: adminScenarios,
	analytics: analyticsScenarios,
	auth: authScenarios,
	billing: billingScenarios,
	blog: blogScenarios,
	chat: chatScenarios,
	content: contentScenarios,
	media: mediaScenarios,
	platforms: platformsScenarios,
	posts: postsScenarios,
	sitePublish: sitePublishScenarios,
};

/**
 * Utility to get all handlers for a specific user tier
 */
export { getBillingHandlersForTier };
