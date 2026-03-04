/**
 * Settings Page Component
 * Tabbed container for account settings and billing management
 */

import { CreditCard } from "lucide-react";
import { memo } from "react";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import {
	Tab,
	TabList,
	TabPanel,
	TabPanels,
	Tabs,
} from "@/proto-design-system/components/navigation/Tabs";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { BillingTab } from "./BillingTab";
import styles from "./component.module.scss";

// ============================================================================
// Component
// ============================================================================

/**
 * AccountPage displays settings with tabbed navigation
 */
export const AccountPage = memo(function AccountPage() {
	return (
		<div className={styles.page}>
			<Stack gap="lg">
				<Stack gap="xs">
					<Text as="h1" size="2xl" weight="semibold">
						Settings
					</Text>
					<Text color="secondary">
						Manage your account settings and billing
					</Text>
				</Stack>

				<Tabs defaultTab="billing" variant="line">
					<TabList aria-label="Settings tabs">
						<Tab id="billing" icon={<CreditCard size={16} />}>
							Billing
						</Tab>
					</TabList>
					<TabPanels>
						<TabPanel id="billing">
							<BillingTab />
						</TabPanel>
					</TabPanels>
				</Tabs>
			</Stack>
		</div>
	);
});

AccountPage.displayName = "AccountPage";
