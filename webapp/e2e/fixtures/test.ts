/**
 * Extended Playwright test with MSW network fixture
 *
 * Usage:
 *   import { test, expect } from '../fixtures/test';
 *
 *   test('example', async ({ network, page }) => {
 *     // Override handlers for this specific test
 *     network.use(
 *       http.get('/api/user', () => {
 *         return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *       })
 *     );
 *     await page.goto('/dashboard');
 *   });
 */

import { createNetworkFixture, type NetworkFixture } from "@msw/playwright";
import { test as base } from "@playwright/test";
import { handlers } from "../handlers";

interface Fixtures {
	network: NetworkFixture;
}

export const test = base.extend<Fixtures>({
	network: createNetworkFixture({
		initialHandlers: handlers,
	}),
});

export { expect } from "@playwright/test";
