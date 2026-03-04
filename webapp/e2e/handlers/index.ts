/**
 * MSW Handler exports
 *
 * Default handlers provide a "happy path" Pro tier user experience.
 * Use scenario factories to override for specific test cases.
 */

import { apikeyHandlers, apikeyScenarios } from "./apikey.handlers";
import { authHandlers, authScenarios } from "./auth.handlers";
import {
	billingHandlers,
	billingScenarios,
	getBillingHandlersForTier,
} from "./billing.handlers";
import { campaignHandlers, campaignScenarios } from "./campaign.handlers";
import {
	integrationHandlers,
	integrationScenarios,
} from "./integration.handlers";
import { segmentHandlers, segmentScenarios } from "./segment.handlers";
import { webhookHandlers, webhookScenarios } from "./webhook.handlers";

/**
 * Default handlers - Pro tier user with full access
 */
export const handlers = [
	...authHandlers,
	...billingHandlers,
	...campaignHandlers,
	...webhookHandlers,
	...apikeyHandlers,
	...segmentHandlers,
	...integrationHandlers,
];

/**
 * Export individual handler groups for selective use
 */
export {
	authHandlers,
	billingHandlers,
	campaignHandlers,
	webhookHandlers,
	apikeyHandlers,
	segmentHandlers,
	integrationHandlers,
};

/**
 * Export scenarios for test overrides
 */
export const scenarios = {
	auth: authScenarios,
	billing: billingScenarios,
	campaign: campaignScenarios,
	webhook: webhookScenarios,
	apikey: apikeyScenarios,
	segment: segmentScenarios,
	integration: integrationScenarios,
};

/**
 * Utility to get all handlers for a specific user tier
 */
export { getBillingHandlersForTier };
