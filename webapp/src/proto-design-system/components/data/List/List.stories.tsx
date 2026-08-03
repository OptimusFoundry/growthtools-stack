import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	ChevronRight,
	File,
	Folder,
	Mail,
	Settings,
	Star,
	User,
	Users,
} from "lucide-react";
import { useState } from "react";
import { List, ListGroup, ListItem } from "./List";

const meta: Meta<typeof List> = {
	title: "Data/List",
	component: List,
	parameters: {
		layout: "padded",
	},
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "divided", "bordered"],
		},
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
		animate: {
			control: "boolean",
			description: "Enable stagger animation for list items",
		},
	},
};

export default meta;
type Story = StoryObj<typeof List>;

export const Default: Story = {
	render: (args) => (
		<List {...args}>
			<ListItem>Invoices</ListItem>
			<ListItem>Payment Methods</ListItem>
			<ListItem>Billing History</ListItem>
		</List>
	),
};

export const Animated: Story = {
	render: () => (
		<List animate variant="bordered">
			<ListItem leading={<Mail />}>Messages</ListItem>
			<ListItem leading={<User />}>Profile</ListItem>
			<ListItem leading={<Settings />}>Settings</ListItem>
			<ListItem leading={<Star />}>Favorites</ListItem>
			<ListItem leading={<File />}>Documents</ListItem>
		</List>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Items animate in with a stagger effect on mount. Refresh the page to see the animation.",
			},
		},
	},
};

export const WithLeadingIcons: Story = {
	render: () => (
		<List>
			<ListItem leading={<Mail />}>Messages</ListItem>
			<ListItem leading={<User />}>Profile</ListItem>
			<ListItem leading={<Settings />}>Settings</ListItem>
		</List>
	),
};

export const WithSecondaryText: Story = {
	render: () => (
		<List variant="divided">
			<ListItem leading={<User />} secondary="john@tickuptoks.com">
				John Doe
			</ListItem>
			<ListItem leading={<User />} secondary="jane@tickuptoks.com">
				Jane Smith
			</ListItem>
			<ListItem leading={<User />} secondary="bob@tickuptoks.com">
				Bob Johnson
			</ListItem>
		</List>
	),
};

export const WithTrailingElements: Story = {
	render: () => (
		<List variant="bordered">
			<ListItem leading={<File />} trailing={<ChevronRight />}>
				Document.pdf
			</ListItem>
			<ListItem leading={<Folder />} trailing={<ChevronRight />}>
				Projects
			</ListItem>
			<ListItem leading={<File />} trailing={<ChevronRight />}>
				Notes.txt
			</ListItem>
		</List>
	),
};

export const Interactive: Story = {
	render: () => {
		const [selected, setSelected] = useState<string | null>("item-1");

		return (
			<List variant="bordered">
				<ListItem
					leading={<Mail />}
					selected={selected === "item-1"}
					onClick={() => setSelected("item-1")}
				>
					Inbox
				</ListItem>
				<ListItem
					leading={<Star />}
					selected={selected === "item-2"}
					onClick={() => setSelected("item-2")}
				>
					Starred
				</ListItem>
				<ListItem
					leading={<File />}
					selected={selected === "item-3"}
					onClick={() => setSelected("item-3")}
				>
					Drafts
				</ListItem>
				<ListItem
					leading={<Settings />}
					disabled
					onClick={() => setSelected("item-4")}
				>
					Disabled Item
				</ListItem>
			</List>
		);
	},
};

export const WithGroups: Story = {
	render: () => (
		<List variant="divided">
			<ListGroup label="Favorites">
				<ListItem leading={<Star />}>Project Alpha</ListItem>
				<ListItem leading={<Star />}>Design System</ListItem>
			</ListGroup>
			<ListGroup label="Recent">
				<ListItem leading={<File />}>Document.pdf</ListItem>
				<ListItem leading={<File />}>Presentation.pptx</ListItem>
				<ListItem leading={<File />}>Spreadsheet.xlsx</ListItem>
			</ListGroup>
		</List>
	),
};

export const Divided: Story = {
	render: () => (
		<List variant="divided">
			<ListItem>General</ListItem>
			<ListItem>Notifications</ListItem>
			<ListItem>Security</ListItem>
			<ListItem>Integrations</ListItem>
		</List>
	),
};

export const Bordered: Story = {
	render: () => (
		<List variant="bordered">
			<ListItem>Weekly digest email</ListItem>
			<ListItem>Product updates</ListItem>
			<ListItem>Security alerts</ListItem>
		</List>
	),
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
			<div>
				<h3 style={{ marginBottom: "0.5rem" }}>Small</h3>
				<List size="sm" variant="bordered">
					<ListItem leading={<File />}>Q3-roadmap.pdf</ListItem>
					<ListItem leading={<File />}>brand-guidelines.fig</ListItem>
				</List>
			</div>
			<div>
				<h3 style={{ marginBottom: "0.5rem" }}>Medium</h3>
				<List size="md" variant="bordered">
					<ListItem leading={<File />}>Q3-roadmap.pdf</ListItem>
					<ListItem leading={<File />}>brand-guidelines.fig</ListItem>
				</List>
			</div>
			<div>
				<h3 style={{ marginBottom: "0.5rem" }}>Large</h3>
				<List size="lg" variant="bordered">
					<ListItem leading={<File />}>Q3-roadmap.pdf</ListItem>
					<ListItem leading={<File />}>brand-guidelines.fig</ListItem>
				</List>
			</div>
		</div>
	),
};

export const ComplexItems: Story = {
	render: () => (
		<List variant="divided">
			<ListItem
				leading={
					<div
						style={{
							width: "40px",
							height: "40px",
							borderRadius: "var(--radius-full)",
							background: "var(--color-primary)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "var(--color-primary-content)",
						}}
					>
						JD
					</div>
				}
				secondary="Product Designer • Online"
				trailing={
					<span
						style={{
							fontSize: "var(--font-size-xs)",
							color: "var(--color-muted)",
						}}
					>
						2m ago
					</span>
				}
			>
				John Doe
			</ListItem>
			<ListItem
				leading={
					<div
						style={{
							width: "40px",
							height: "40px",
							borderRadius: "var(--radius-full)",
							background: "var(--color-success)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "white",
						}}
					>
						JS
					</div>
				}
				secondary="Software Engineer • Away"
				trailing={
					<span
						style={{
							fontSize: "var(--font-size-xs)",
							color: "var(--color-muted)",
						}}
					>
						1h ago
					</span>
				}
			>
				Jane Smith
			</ListItem>
		</List>
	),
};

export const Showcase: Story = {
	render: () => (
		<div style={{ maxWidth: "360px" }}>
			<List variant="bordered">
				<ListGroup label="Today">
					<ListItem
						leading={<Mail />}
						secondary="Your invoice #4821 is ready to download"
						trailing={
							<span
								style={{
									fontSize: "var(--font-size-xs)",
									color: "var(--color-muted)",
								}}
							>
								9:14 AM
							</span>
						}
					>
						Invoice generated
					</ListItem>
					<ListItem
						leading={<Users />}
						secondary="Marcus Webb requested access to Design System"
						trailing={
							<span
								style={{
									fontSize: "var(--font-size-xs)",
									color: "var(--color-muted)",
								}}
							>
								7:02 AM
							</span>
						}
					>
						Access request
					</ListItem>
				</ListGroup>
				<ListGroup label="Earlier">
					<ListItem
						leading={<Settings />}
						secondary="API key 'Production' was rotated"
						trailing={
							<span
								style={{
									fontSize: "var(--font-size-xs)",
									color: "var(--color-muted)",
								}}
							>
								Yesterday
							</span>
						}
					>
						Security update
					</ListItem>
					<ListItem
						leading={<Star />}
						secondary="Your plan upgrade to Team is complete"
						trailing={
							<span
								style={{
									fontSize: "var(--font-size-xs)",
									color: "var(--color-muted)",
								}}
							>
								2 days ago
							</span>
						}
					>
						Plan upgraded
					</ListItem>
				</ListGroup>
			</List>
		</div>
	),
};
