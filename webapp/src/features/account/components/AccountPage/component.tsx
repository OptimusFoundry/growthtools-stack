import { PageTransition, Tabs } from "@optimusfoundry/quiet";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { CreditCard, GitBranch, Mic, Share2 } from "lucide-react";
import { memo, type ReactNode, useCallback } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { Topbar } from "@/components/Layout/Topbar";
import { BillingTab } from "./BillingTab";
import { PlatformConnectionsTab } from "./PlatformConnectionsTab";
import { SitePublishTab } from "./SitePublishTab";
import { VoiceProfileTab } from "./VoiceProfileTab";

const VALID_TABS = [
	"billing",
	"voice-profile",
	"platforms",
	"site-publish",
] as const;
type AccountTab = (typeof VALID_TABS)[number];
const DEFAULT_TAB: AccountTab = "billing";

const TABS = [
	{ value: "billing", label: "Billing", icon: <AppIcon icon={CreditCard} /> },
	{
		value: "voice-profile",
		label: "Voice Profile",
		icon: <AppIcon icon={Mic} />,
	},
	{ value: "platforms", label: "Platforms", icon: <AppIcon icon={Share2} /> },
	{
		value: "site-publish",
		label: "Site Publish",
		icon: <AppIcon icon={GitBranch} />,
	},
];

const PANELS: Record<AccountTab, ReactNode> = {
	billing: <BillingTab />,
	"voice-profile": <VoiceProfileTab />,
	platforms: <PlatformConnectionsTab />,
	"site-publish": <SitePublishTab />,
};

function isAccountTab(tab: string | undefined): tab is AccountTab {
	return VALID_TABS.includes(tab as AccountTab);
}

export const AccountPage = memo(function AccountPage() {
	const search = useSearch({ from: "/account" });
	const navigate = useNavigate();

	const tab = (search as { tab?: string }).tab;
	const activeTab = isAccountTab(tab) ? tab : DEFAULT_TAB;

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
			<Tabs
				variant="line"
				value={activeTab}
				onChange={handleTabChange}
				label="Settings tabs"
				tabs={TABS}
				panels={(value) => (
					<PageTransition transitionKey={value} variant="slideUp">
						{isAccountTab(value) ? PANELS[value] : null}
					</PageTransition>
				)}
			/>
		</>
	);
});

AccountPage.displayName = "AccountPage";
