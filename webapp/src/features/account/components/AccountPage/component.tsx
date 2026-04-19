/**
 * Settings Page Component
 * Tabbed container for account settings and billing management
 */

import { useNavigate, useSearch } from "@tanstack/react-router";
import { CreditCard, Mic, Share2 } from "lucide-react";
import { memo, useCallback } from "react";
import { Topbar } from "@/components/Layout/Topbar";
import { PageTransition } from "@/proto-design-system/components/layout/PageTransition/PageTransition";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import {
	Tab,
	TabList,
	TabPanel,
	TabPanels,
	Tabs,
} from "@/proto-design-system/components/navigation/Tabs";
import { BillingTab } from "./BillingTab";
import styles from "./component.module.scss";
import { PlatformConnectionsTab } from "./PlatformConnectionsTab";
import { VoiceProfileTab } from "./VoiceProfileTab";

// ============================================================================
// Constants
// ============================================================================

const VALID_TABS = ["billing", "voice-profile", "platforms"] as const;
const DEFAULT_TAB = "billing";

// ============================================================================
// Component
// ============================================================================

/**
 * AccountPage displays settings with tabbed navigation
 */
export const AccountPage = memo(function AccountPage() {
	const search = useSearch({ from: "/account" });
	const navigate = useNavigate();

	const tab = (search as { tab?: string }).tab;
	const activeTab =
		tab && VALID_TABS.includes(tab as (typeof VALID_TABS)[number])
			? tab
			: DEFAULT_TAB;

	const handleTabChange = useCallback(
		(tabId: string) => {
			navigate({
				to: "/account",
				search: tabId === DEFAULT_TAB ? {} : { tab: tabId },
				replace: true,
			});
		},
		[navigate],
	);

	return (
		<>
			<Topbar title="Settings" />
			<Stack gap="lg" className={styles.page} animate>
				<Tabs
					activeTab={activeTab}
					onTabChange={handleTabChange}
					variant="line"
				>
					<TabList aria-label="Settings tabs">
						<Tab id="billing" icon={<CreditCard size={16} />}>
							Billing
						</Tab>
						<Tab id="voice-profile" icon={<Mic size={16} />}>
							Voice Profile
						</Tab>
						<Tab id="platforms" icon={<Share2 size={16} />}>
							Platforms
						</Tab>
					</TabList>
					<PageTransition pageKey={activeTab} type="slideUp">
						<TabPanels>
							<TabPanel id="billing">
								<BillingTab />
							</TabPanel>
							<TabPanel id="voice-profile">
								<VoiceProfileTab />
							</TabPanel>
							<TabPanel id="platforms">
								<PlatformConnectionsTab />
							</TabPanel>
						</TabPanels>
					</PageTransition>
				</Tabs>
			</Stack>
		</>
	);
});

AccountPage.displayName = "AccountPage";
