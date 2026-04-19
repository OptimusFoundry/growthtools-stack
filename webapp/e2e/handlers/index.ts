/**
 * MSW Handler exports
 *
 * Default handlers provide a "happy path" Pro tier user experience.
 * Use scenario factories to override for specific test cases.
 */

import { analyticsHandlers, analyticsScenarios } from "./analytics.handlers";
import { authHandlers, authScenarios } from "./auth.handlers";
import {
	billingHandlers,
	billingScenarios,
	getBillingHandlersForTier,
} from "./billing.handlers";
import { blogHandlers, blogScenarios } from "./blog.handlers";
import { chatHandlers, chatScenarios } from "./chat.handlers";
import { contentHandlers, contentScenarios } from "./content.handlers";
import { mediaHandlers, mediaScenarios } from "./media.handlers";
import { platformsHandlers, platformsScenarios } from "./platforms.handlers";
import { postsHandlers, postsScenarios } from "./posts.handlers";
import { settingsHandlers, settingsScenarios } from "./settings.handlers";

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
	...contentHandlers,
	...chatHandlers,
];

/**
 * Export individual handler groups for selective use
 */
export {
	analyticsHandlers,
	authHandlers,
	billingHandlers,
	blogHandlers,
	chatHandlers,
	contentHandlers,
	mediaHandlers,
	platformsHandlers,
	postsHandlers,
	settingsHandlers,
};

/**
 * Export scenarios for test overrides
 */
export const scenarios = {
	auth: authScenarios,
	billing: billingScenarios,
	chat: chatScenarios,
	posts: postsScenarios,
	platforms: platformsScenarios,
	media: mediaScenarios,
	blog: blogScenarios,
	analytics: analyticsScenarios,
	settings: settingsScenarios,
	content: contentScenarios,
};

/**
 * Utility to get all handlers for a specific user tier
 */
export { getBillingHandlersForTier };
