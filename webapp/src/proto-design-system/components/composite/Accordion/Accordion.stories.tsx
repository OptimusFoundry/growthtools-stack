import type { Meta, StoryObj } from "@storybook/react-vite";
import { CreditCard, HelpCircle, Shield, Users } from "lucide-react";
import { Accordion } from "./Accordion";

const meta: Meta<typeof Accordion> = {
	title: "Composite/Accordion",
	component: Accordion,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	argTypes: {
		multiple: {
			control: "boolean",
			description: "Allow multiple items to be expanded at once",
		},
	},
};

export default meta;
type Story = StoryObj<typeof Accordion>;

// =============================================================================
// BASIC
// =============================================================================

const billingFaqItems = [
	{
		id: "1",
		title: "When am I billed?",
		content:
			"You're billed on the same day each month as when you started your subscription. If you upgrade or downgrade mid-cycle, we prorate the difference on your next invoice.",
	},
	{
		id: "2",
		title: "Can I cancel at any time?",
		content:
			"Yes. Cancel from Settings → Billing and you'll keep access until the end of your current billing period — no refunds for partial months, but no cancellation fees either.",
	},
	{
		id: "3",
		title: "Do you offer annual billing?",
		content:
			"Annual plans are billed once a year and save 20% compared to paying monthly. Switch to annual billing from Settings → Billing at any time.",
	},
];

export const Default: Story = {
	args: {
		items: billingFaqItems,
	},
};

export const Multiple: Story = {
	args: {
		items: billingFaqItems,
		multiple: true,
	},
};

export const WithDefaultExpanded: Story = {
	args: {
		items: billingFaqItems,
		defaultExpanded: ["1"],
	},
};

// =============================================================================
// WITH DESCRIPTIONS
// =============================================================================

export const WithDescriptions: Story = {
	args: {
		items: [
			{
				id: "1",
				title: "Two-factor authentication",
				description: "Require a second step at sign-in",
				content:
					"Once enabled, teammates will be prompted for a six-digit code from an authenticator app in addition to their password.",
			},
			{
				id: "2",
				title: "Single sign-on (SSO)",
				description: "Available on the Enterprise plan",
				content:
					"Connect Okta, Azure AD, or any SAML 2.0 identity provider so teammates sign in with their existing company credentials.",
			},
			{
				id: "3",
				title: "IP allowlisting",
				description: "Restrict access to approved networks",
				content:
					"Add CIDR ranges for your office or VPN — sign-in attempts from any other IP will be blocked.",
			},
		],
	},
};

// =============================================================================
// WITH ICONS
// =============================================================================

export const WithIcons: Story = {
	args: {
		items: [
			{
				id: "1",
				title: "Team members",
				description: "Invite and manage teammates",
				icon: <Users />,
				content:
					"Add teammates by email — they'll receive an invite link that expires after 7 days. Admins can resend or revoke pending invites at any time.",
			},
			{
				id: "2",
				title: "Billing & plans",
				description: "Manage your subscription",
				icon: <CreditCard />,
				content:
					"View your current plan, update your payment method, and download past invoices from the Billing tab.",
			},
			{
				id: "3",
				title: "Security",
				description: "Protect your workspace",
				icon: <Shield />,
				content:
					"Enable two-factor authentication and configure SSO to keep your workspace secure as your team grows.",
			},
			{
				id: "4",
				title: "Help & support",
				description: "Get answers fast",
				icon: <HelpCircle />,
				content:
					"Search our help center or reach the support team directly from the in-app chat, available Monday–Friday.",
			},
		],
		multiple: true,
	},
};

// =============================================================================
// STATES
// =============================================================================

export const WithDisabledItem: Story = {
	args: {
		items: [
			{
				id: "1",
				title: "Workspace settings",
				content: "Rename your workspace, update its URL, and set a logo.",
			},
			{
				id: "2",
				title: "Advanced permissions",
				content: "Requires the Enterprise plan.",
				disabled: true,
			},
			{
				id: "3",
				title: "Notification preferences",
				content: "Choose which events send you an email or Slack message.",
			},
		],
	},
};

export const LongContent: Story = {
	args: {
		items: [
			{
				id: "1",
				title: "Terms of Service",
				content: `By creating an account, you agree to use this service in compliance with all applicable laws and these Terms. We may suspend or terminate accounts that violate our Acceptable Use Policy, engage in abuse of the API, or attempt to circumvent usage limits.

Your subscription renews automatically at the end of each billing period unless cancelled beforehand. Refunds are issued at our discretion for billing errors, not for unused time on a cancelled plan.

We reserve the right to update these Terms with 30 days' notice for material changes. Continued use of the service after that period constitutes acceptance of the revised Terms.`,
			},
			{
				id: "2",
				title: "Privacy Policy",
				content: `We collect account information (name, email, billing details) and usage data (feature interactions, API calls, error logs) to operate and improve the service. We never sell customer data to third parties.

Data is encrypted at rest and in transit, and retained for the duration of your account plus 90 days after deletion for backup and legal purposes. You can request a full export or permanent deletion of your data at any time from Settings → Privacy.`,
			},
		],
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	render: () => (
		<div style={{ maxWidth: "640px" }}>
			<Accordion
				defaultExpanded={["1"]}
				items={[
					{
						id: "1",
						title: "How does the free trial work?",
						description: "14 days, no credit card required",
						icon: <HelpCircle />,
						content:
							"You get full access to every feature on the Team plan for 14 days. We'll email you three days before the trial ends, and nothing is charged unless you add a payment method.",
					},
					{
						id: "2",
						title: "What happens if I exceed my plan's usage limit?",
						description: "Applies to API calls and storage",
						icon: <CreditCard />,
						content:
							"We'll notify you at 80% and 100% of your limit. You can keep working past the limit for the rest of the billing cycle — overages are billed at the rate shown on your plan page.",
					},
					{
						id: "3",
						title: "Can I change plans later?",
						description: "Upgrades apply immediately",
						icon: <Users />,
						content:
							"Upgrade at any time and the new limits apply immediately, with a prorated charge for the rest of the cycle. Downgrades take effect at the start of your next billing period.",
					},
					{
						id: "4",
						title: "Is my data encrypted?",
						description: "SOC 2 Type II certified",
						icon: <Shield />,
						content:
							"All data is encrypted with AES-256 at rest and TLS 1.3 in transit. We complete an annual SOC 2 Type II audit — the report is available under Settings → Compliance.",
					},
				]}
			/>
		</div>
	),
};
