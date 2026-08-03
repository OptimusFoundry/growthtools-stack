import type { Meta, StoryObj } from "@storybook/react-vite";
import { Info, Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";
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
		<Popover {...args} trigger={<Button>Share link</Button>}>
			<p>
				Anyone with this link can view the document. Revoke access anytime from
				sharing settings.
			</p>
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
			trigger={<Button>What's new</Button>}
			title="Release notes — v2.4"
			showClose
		>
			<p>Added bulk export, faster search, and a redesigned billing page.</p>
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
				<p>Appears above the trigger.</p>
			</Popover>
			<div />

			<Popover trigger={<Button>Left</Button>} placement="left">
				<p>Appears to the left of the trigger.</p>
			</Popover>
			<div />
			<Popover trigger={<Button>Right</Button>} placement="right">
				<p>Appears to the right of the trigger.</p>
			</Popover>

			<div />
			<Popover trigger={<Button>Bottom</Button>} placement="bottom">
				<p>Appears below the trigger.</p>
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
					<p>Aligned to the start edge of the trigger.</p>
				</Popover>
				<Popover
					trigger={<Button>Center</Button>}
					placement="bottom"
					align="center"
				>
					<p>Aligned to the center of the trigger.</p>
				</Popover>
				<Popover trigger={<Button>End</Button>} placement="bottom" align="end">
					<p>Aligned to the end edge of the trigger.</p>
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
					trigger={<Button>Invite teammate</Button>}
					open={open}
					onOpenChange={setOpen}
					title="Invite by email"
					showClose
				>
					<p>Send an invite to join this workspace.</p>
					<Button
						size="sm"
						onClick={() => setOpen(false)}
						style={{ marginTop: "0.5rem" }}
					>
						Send invite
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
					Notifications
				</Button>
			}
			title="Notification preferences"
			showClose
		>
			<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
				<label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<input type="checkbox" defaultChecked />
					Email me about comments
				</label>
				<label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<input type="checkbox" />
					Email me about mentions
				</label>
				<label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<input type="checkbox" defaultChecked />
					Weekly digest
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
					aria-label="About this metric"
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
			<p>
				Monthly recurring revenue is calculated net of refunds and failed
				payments as of the first day of the billing cycle.
			</p>
		</Popover>
	),
};

export const WithoutFocusTrap: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "1rem" }}>
			<Popover trigger={<Button>Quick tips</Button>} trapFocus={false}>
				<p>
					This popover does not trap focus, so you can tab past it to reach the
					next control on the page.
				</p>
			</Popover>
			<Button variant="outline">Skip to next field</Button>
		</div>
	),
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	render: () => {
		const [open, setOpen] = useState(false);

		return (
			<Popover
				trigger={
					<Button variant="outline" leftIcon={<Settings />}>
						Column settings
					</Button>
				}
				open={open}
				onOpenChange={setOpen}
				title="Visible columns"
				showClose
			>
				<div
					style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
				>
					{["Name", "Status", "Owner", "Last updated"].map((column) => (
						<label
							key={column}
							style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
						>
							<input type="checkbox" defaultChecked />
							{column}
						</label>
					))}
					<Button
						size="sm"
						variant="outline"
						onClick={() => setOpen(false)}
						style={{ marginTop: "0.25rem" }}
					>
						Done
					</Button>
				</div>
			</Popover>
		);
	},
};
