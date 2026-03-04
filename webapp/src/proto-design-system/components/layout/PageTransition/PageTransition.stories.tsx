import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "../../primitives/Button";
import { Card } from "../Card";
import { Stack } from "../Stack";
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
		id: "home",
		title: "Home",
		content: "Welcome to the home page. This is where you start your journey.",
	},
	{
		id: "about",
		title: "About",
		content: "Learn more about us and what we do. We build great things.",
	},
	{
		id: "contact",
		title: "Contact",
		content: "Get in touch with our team. We'd love to hear from you.",
	},
];

export const Default: Story = {
	render: (args) => {
		const [activeTab, setActiveTab] = useState("home");
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
		const [activeTab, setActiveTab] = useState("home");
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
		const [activeTab, setActiveTab] = useState("home");
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
		const [activeTab, setActiveTab] = useState("home");
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
		const [activeTab, setActiveTab] = useState("home");
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
