import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Card } from "@/proto-design-system/components/layout/Card/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";
import { PageTransition } from "./PageTransition";

const meta: Meta<typeof PageTransition> = {
	title: "Layout/PageTransition",
	component: PageTransition,
	parameters: {
		layout: "padded",
	},
	argTypes: {
		type: {
			control: "select",
			options: ["fade", "slide", "slideUp", "scale"],
		},
		duration: {
			control: { type: "range", min: 0.1, max: 1, step: 0.1 },
		},
	},
};

export default meta;
type Story = StoryObj<typeof PageTransition>;

const pages = [
	{
		id: "overview",
		title: "Overview",
		content: "You're on the Pro plan with 3 of 10 team seats used.",
	},
	{
		id: "members",
		title: "Members",
		content: "8 active members, 1 pending invite awaiting acceptance.",
	},
	{
		id: "billing",
		title: "Billing",
		content: "Next invoice of $49.00 charges to your Visa on Sep 12, 2026.",
	},
];

export const Default: Story = {
	render: (args) => {
		const [activeTab, setActiveTab] = useState("overview");
		const currentPage = pages.find((p) => p.id === activeTab)!;

		return (
			<Stack gap="lg">
				<Stack direction="row" gap="sm">
					{pages.map((page) => (
						<Button
							key={page.id}
							variant={activeTab === page.id ? "primary" : "outline"}
							onClick={() => setActiveTab(page.id)}
						>
							{page.title}
						</Button>
					))}
				</Stack>

				<PageTransition
					pageKey={activeTab}
					type={args.type}
					duration={args.duration}
				>
					<Card variant="outlined" padding="lg">
						<Stack gap="md">
							<h2 style={{ margin: 0 }}>{currentPage.title}</h2>
							<p style={{ margin: 0, color: "var(--color-muted)" }}>
								{currentPage.content}
							</p>
						</Stack>
					</Card>
				</PageTransition>
			</Stack>
		);
	},
	args: {
		type: "fade",
		duration: 0.2,
	},
};

export const Fade: Story = {
	render: () => {
		const [activeTab, setActiveTab] = useState("overview");
		const currentPage = pages.find((p) => p.id === activeTab)!;

		return (
			<Stack gap="lg">
				<Stack direction="row" gap="sm">
					{pages.map((page) => (
						<Button
							key={page.id}
							variant={activeTab === page.id ? "primary" : "outline"}
							onClick={() => setActiveTab(page.id)}
						>
							{page.title}
						</Button>
					))}
				</Stack>

				<PageTransition pageKey={activeTab} type="fade">
					<Card variant="outlined" padding="lg">
						<Stack gap="md">
							<h2 style={{ margin: 0 }}>{currentPage.title}</h2>
							<p style={{ margin: 0, color: "var(--color-muted)" }}>
								{currentPage.content}
							</p>
						</Stack>
					</Card>
				</PageTransition>
			</Stack>
		);
	},
};

export const Slide: Story = {
	render: () => {
		const [activeTab, setActiveTab] = useState("overview");
		const currentPage = pages.find((p) => p.id === activeTab)!;

		return (
			<Stack gap="lg">
				<Stack direction="row" gap="sm">
					{pages.map((page) => (
						<Button
							key={page.id}
							variant={activeTab === page.id ? "primary" : "outline"}
							onClick={() => setActiveTab(page.id)}
						>
							{page.title}
						</Button>
					))}
				</Stack>

				<PageTransition pageKey={activeTab} type="slide">
					<Card variant="outlined" padding="lg">
						<Stack gap="md">
							<h2 style={{ margin: 0 }}>{currentPage.title}</h2>
							<p style={{ margin: 0, color: "var(--color-muted)" }}>
								{currentPage.content}
							</p>
						</Stack>
					</Card>
				</PageTransition>
			</Stack>
		);
	},
};

export const SlideUp: Story = {
	render: () => {
		const [activeTab, setActiveTab] = useState("overview");
		const currentPage = pages.find((p) => p.id === activeTab)!;

		return (
			<Stack gap="lg">
				<Stack direction="row" gap="sm">
					{pages.map((page) => (
						<Button
							key={page.id}
							variant={activeTab === page.id ? "primary" : "outline"}
							onClick={() => setActiveTab(page.id)}
						>
							{page.title}
						</Button>
					))}
				</Stack>

				<PageTransition pageKey={activeTab} type="slideUp">
					<Card variant="outlined" padding="lg">
						<Stack gap="md">
							<h2 style={{ margin: 0 }}>{currentPage.title}</h2>
							<p style={{ margin: 0, color: "var(--color-muted)" }}>
								{currentPage.content}
							</p>
						</Stack>
					</Card>
				</PageTransition>
			</Stack>
		);
	},
};

export const Scale: Story = {
	render: () => {
		const [activeTab, setActiveTab] = useState("overview");
		const currentPage = pages.find((p) => p.id === activeTab)!;

		return (
			<Stack gap="lg">
				<Stack direction="row" gap="sm">
					{pages.map((page) => (
						<Button
							key={page.id}
							variant={activeTab === page.id ? "primary" : "outline"}
							onClick={() => setActiveTab(page.id)}
						>
							{page.title}
						</Button>
					))}
				</Stack>

				<PageTransition pageKey={activeTab} type="scale">
					<Card variant="outlined" padding="lg">
						<Stack gap="md">
							<h2 style={{ margin: 0 }}>{currentPage.title}</h2>
							<p style={{ margin: 0, color: "var(--color-muted)" }}>
								{currentPage.content}
							</p>
						</Stack>
					</Card>
				</PageTransition>
			</Stack>
		);
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const SettingsTabsShowcase: Story = {
	render: () => {
		const [activeTab, setActiveTab] = useState("overview");
		const currentPage = pages.find((p) => p.id === activeTab)!;

		return (
			<Stack gap="lg">
				<Stack direction="row" gap="sm">
					{pages.map((page) => (
						<Button
							key={page.id}
							variant={activeTab === page.id ? "primary" : "outline"}
							onClick={() => setActiveTab(page.id)}
						>
							{page.title}
						</Button>
					))}
				</Stack>

				<PageTransition pageKey={activeTab} type="slideUp" duration={0.25}>
					<Card variant="outlined" padding="lg">
						<Stack gap="md">
							<h2 style={{ margin: 0 }}>{currentPage.title}</h2>
							<p style={{ margin: 0, color: "var(--color-muted)" }}>
								{currentPage.content}
							</p>
						</Stack>
					</Card>
				</PageTransition>
			</Stack>
		);
	},
	parameters: {
		docs: {
			description: {
				story:
					"A team-settings tab switcher — each tab swaps its content pane with a slide-up transition, the pattern used for account/billing/members sub-navigation.",
			},
		},
	},
};
