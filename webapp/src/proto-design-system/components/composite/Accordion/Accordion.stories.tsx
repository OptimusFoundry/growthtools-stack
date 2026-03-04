import type { Meta, StoryObj } from "@storybook/react";
import { FileText, HelpCircle, Settings, Shield } from "lucide-react";
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

const basicItems = [
	{
		id: "1",
		title: "What is the Proto Design System?",
		content:
			"Proto Design System is a comprehensive, SCSS-based React design system with advanced theming capabilities.",
	},
	{
		id: "2",
		title: "How do I install it?",
		content:
			"You can install the design system via npm: npm install proto-design-system",
	},
	{
		id: "3",
		title: "Is it customizable?",
		content:
			"Yes! The design system uses CSS custom properties for theming, making it easy to customize colors, spacing, and typography.",
	},
];

export const Default: Story = {
	args: {
		items: basicItems,
	},
};

export const Multiple: Story = {
	args: {
		items: basicItems,
		multiple: true,
	},
};

export const WithDefaultExpanded: Story = {
	args: {
		items: basicItems,
		defaultExpanded: ["1"],
	},
};

export const WithDescriptions: Story = {
	args: {
		items: [
			{
				id: "1",
				title: "Getting Started",
				description: "Learn the basics of the design system",
				content:
					"Start by installing the package and importing the components you need.",
			},
			{
				id: "2",
				title: "Theming",
				description: "Customize colors, spacing, and more",
				content: "Use CSS custom properties to create your own themes.",
			},
			{
				id: "3",
				title: "Components",
				description: "Explore the component library",
				content: "Browse through our collection of ready-to-use components.",
			},
		],
	},
};

export const WithIcons: Story = {
	args: {
		items: [
			{
				id: "1",
				title: "Documentation",
				description: "Read the full documentation",
				icon: <FileText />,
				content:
					"Our comprehensive documentation covers everything from installation to advanced usage.",
			},
			{
				id: "2",
				title: "Settings",
				description: "Configure your preferences",
				icon: <Settings />,
				content: "Customize your experience with our flexible settings panel.",
			},
			{
				id: "3",
				title: "Security",
				description: "Learn about our security practices",
				icon: <Shield />,
				content:
					"We take security seriously and follow industry best practices.",
			},
			{
				id: "4",
				title: "FAQ",
				description: "Frequently asked questions",
				icon: <HelpCircle />,
				content: "Find answers to common questions about our design system.",
			},
		],
		multiple: true,
	},
};

export const WithDisabledItem: Story = {
	args: {
		items: [
			{
				id: "1",
				title: "Available Section",
				content: "This section can be expanded.",
			},
			{
				id: "2",
				title: "Disabled Section",
				content: "This content is hidden.",
				disabled: true,
			},
			{
				id: "3",
				title: "Another Available Section",
				content: "This section can also be expanded.",
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
				content: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.`,
			},
			{
				id: "2",
				title: "Privacy Policy",
				content: `Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.`,
			},
		],
	},
};
