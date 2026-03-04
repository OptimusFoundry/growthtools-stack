import type { Meta, StoryObj } from "@storybook/react";
import { Info, Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "../../primitives/Button";
import { Popover } from "./Popover";

const meta: Meta<typeof Popover> = {
	title: "Composite/Popover",
	component: Popover,
	parameters: {
		layout: "centered",
	},
	argTypes: {
		placement: {
			control: "select",
			options: ["top", "bottom", "left", "right"],
		},
		align: {
			control: "select",
			options: ["start", "center", "end"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
	render: (args) => (
		<Popover {...args} trigger={<Button>Open Popover</Button>}>
			<p>This is some popover content. It can contain any React elements.</p>
		</Popover>
	),
	args: {
		placement: "bottom",
		align: "center",
	},
};

export const WithTitle: Story = {
	render: () => (
		<Popover
			trigger={<Button>Open Popover</Button>}
			title="Popover Title"
			showClose
		>
			<p>This popover has a title and a close button.</p>
		</Popover>
	),
};

export const Placements: Story = {
	render: () => (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(3, 1fr)",
				gap: "4rem",
				padding: "4rem",
			}}
		>
			<div />
			<Popover trigger={<Button>Top</Button>} placement="top">
				<p>Top placement</p>
			</Popover>
			<div />

			<Popover trigger={<Button>Left</Button>} placement="left">
				<p>Left placement</p>
			</Popover>
			<div />
			<Popover trigger={<Button>Right</Button>} placement="right">
				<p>Right placement</p>
			</Popover>

			<div />
			<Popover trigger={<Button>Bottom</Button>} placement="bottom">
				<p>Bottom placement</p>
			</Popover>
			<div />
		</div>
	),
};

export const Alignments: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "2rem",
				alignItems: "center",
			}}
		>
			<div style={{ display: "flex", gap: "2rem" }}>
				<Popover
					trigger={<Button>Start</Button>}
					placement="bottom"
					align="start"
				>
					<p>Aligned to start</p>
				</Popover>
				<Popover
					trigger={<Button>Center</Button>}
					placement="bottom"
					align="center"
				>
					<p>Aligned to center</p>
				</Popover>
				<Popover trigger={<Button>End</Button>} placement="bottom" align="end">
					<p>Aligned to end</p>
				</Popover>
			</div>
		</div>
	),
};

export const Controlled: Story = {
	render: () => {
		const [open, setOpen] = useState(false);

		return (
			<div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
				<Popover
					trigger={<Button>Controlled Popover</Button>}
					open={open}
					onOpenChange={setOpen}
					title="Controlled"
					showClose
				>
					<p>This popover is controlled externally.</p>
					<Button
						size="sm"
						onClick={() => setOpen(false)}
						style={{ marginTop: "0.5rem" }}
					>
						Close from inside
					</Button>
				</Popover>
				<span>Open: {open ? "Yes" : "No"}</span>
			</div>
		);
	},
};

export const RichContent: Story = {
	render: () => (
		<Popover
			trigger={
				<Button variant="outline" leftIcon={<Settings />}>
					Settings
				</Button>
			}
			title="Preferences"
			showClose
		>
			<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
				<label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<input type="checkbox" defaultChecked />
					Enable notifications
				</label>
				<label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<input type="checkbox" />
					Dark mode
				</label>
				<label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<input type="checkbox" defaultChecked />
					Auto-save
				</label>
			</div>
		</Popover>
	),
};

export const IconTrigger: Story = {
	render: () => (
		<Popover
			trigger={
				<button
					type="button"
					style={{
						background: "none",
						border: "none",
						cursor: "pointer",
						padding: "0.5rem",
						borderRadius: "50%",
						display: "flex",
					}}
				>
					<Info size={20} />
				</button>
			}
			placement="right"
		>
			<p>Click the info icon to see more details about this feature.</p>
		</Popover>
	),
};

export const WithoutFocusTrap: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "1rem" }}>
			<Popover trigger={<Button>No Focus Trap</Button>} trapFocus={false}>
				<p>
					This popover does not trap focus. You can tab to elements outside.
				</p>
			</Popover>
			<Button variant="outline">Another button</Button>
		</div>
	),
};
