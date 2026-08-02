// Overlays specimen — full variant matrices for the overlay components.
// These are interactive/portal components, so every demo wires a real Button
// trigger to local state (uncontrolled where the component allows it,
// controlled only where the prop requires it) instead of rendering dead
// placeholders. See specimens/Primitives.tsx for the framework conventions
// this file follows.

import {
	AlertTriangle,
	Bell,
	CheckCircle,
	ChevronRight,
	Copy,
	Download,
	Edit,
	ExternalLink,
	Filter,
	HelpCircle,
	Info,
	LogOut,
	Settings,
	Share,
	Trash2,
	User,
	XCircle,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import {
	Drawer,
	type DrawerProps,
} from "../../components/overlays/Drawer/Drawer";
import {
	Dropdown,
	type DropdownItem,
	type DropdownProps,
} from "../../components/overlays/Dropdown/Dropdown";
import {
	DropdownMenu,
	type MenuItem,
	type MenuItemSize,
} from "../../components/overlays/DropdownMenu/DropdownMenu";
import { Modal, type ModalProps } from "../../components/overlays/Modal/Modal";
import { Popover } from "../../components/overlays/Popover/Popover";
import { Tooltip } from "../../components/overlays/Tooltip/Tooltip";
import { Button } from "../../components/primitives/Button/Button";
import { Spec, SpecItem, SpecRow } from "../Spec";

// =============================================================================
// DEMO DATA
// =============================================================================

const dropdownPlainItems: DropdownItem[] = [
	{ id: "option1", label: "Option 1" },
	{ id: "option2", label: "Option 2" },
	{ id: "option3", label: "Option 3" },
];

const dropdownActionItems: DropdownItem[] = [
	{ id: "edit", label: "Edit", icon: <Edit /> },
	{ id: "copy", label: "Copy", icon: <Copy /> },
	{ id: "share", label: "Share", icon: <Share /> },
	{ id: "download", label: "Download", icon: <Download />, divider: true },
	{ id: "delete", label: "Delete", icon: <Trash2 />, danger: true },
];

const dropdownWorkspaceItems: DropdownItem[] = [
	{
		id: "personal",
		label: "Personal",
		description: "Your personal workspace",
		icon: <User />,
	},
	{
		id: "team",
		label: "Team",
		description: "Shared with your team members",
		icon: <Settings />,
	},
	{
		id: "public",
		label: "Public",
		description: "Anyone can view this",
		icon: <Share />,
	},
];

const dropdownDisabledItems: DropdownItem[] = [
	{ id: "edit", label: "Edit", icon: <Edit /> },
	{ id: "copy", label: "Copy", icon: <Copy />, disabled: true },
	{ id: "share", label: "Share", icon: <Share /> },
	{ id: "download", label: "Download", icon: <Download />, disabled: true },
];

const dropdownMenuSimpleItems: MenuItem[] = [
	{ id: "1", label: "Edit", leftIcon: <Edit /> },
	{ id: "2", label: "Copy", leftIcon: <Copy /> },
	{ id: "3", label: "Delete", leftIcon: <Trash2 />, state: "disabled" },
];

const viewMenuItems: MenuItem[] = [
	{ id: "1", label: "Show toolbar", checkbox: true, checked: true },
	{ id: "2", label: "Show sidebar", checkbox: true, checked: true },
	{ id: "3", label: "Show status bar", checkbox: true, checked: false },
];

const navMenuItems: MenuItem[] = [
	{ id: "1", label: "Dashboard", state: "active" },
	{ id: "2", label: "Projects" },
	{ id: "3", label: "Team" },
];

const accountMenuItems: MenuItem[] = [
	{
		id: "1",
		label: "John Doe",
		sublabel: "john@tickuptoks.com",
		leftIcon: <User />,
	},
	{
		id: "2",
		label: "Workspace",
		sublabel: "Switch active workspace",
		rightIcon: <ChevronRight />,
	},
	{ type: "divider", label: "More" },
	{ id: "3", label: "Log out", leftIcon: <LogOut /> },
];

const editMenuItems: MenuItem[] = [
	{ id: "1", label: "Undo", shortcut: "Ctrl+Z" },
	{ id: "2", label: "Redo", shortcut: "Ctrl+Y" },
	{ type: "divider" },
	{ id: "3", label: "Copy", shortcut: "Ctrl+C" },
];

const helpMenuItems: MenuItem[] = [
	{ id: "1", label: "Documentation", leftIcon: <ExternalLink /> },
	{ id: "2", label: "Contact support", leftIcon: <ExternalLink /> },
];

// =============================================================================
// DEMO HELPERS — wire real triggers to local state for interactive components
// =============================================================================

interface DropdownDemoProps extends Omit<DropdownProps, "value" | "onChange"> {
	defaultValue?: string;
}

/** Dropdown owns its own open/close state internally; only selection (value)
 * needs to be lifted, so each instance gets its own controlled value. */
function DropdownDemo({ defaultValue, ...props }: DropdownDemoProps) {
	const [value, setValue] = useState<string | undefined>(defaultValue);
	return <Dropdown {...props} value={value} onChange={setValue} />;
}

/** Popover defaults to uncontrolled; this demo lifts the open state to show
 * the controlled API (open/onOpenChange) actually working. */
function ControlledPopoverDemo() {
	const [open, setOpen] = useState(false);
	return (
		<Popover
			trigger={<Button>{open ? "Close Popover" : "Open Popover"}</Button>}
			open={open}
			onOpenChange={setOpen}
			title="Controlled"
			showClose
		>
			This popover&apos;s open state is lifted to the parent component.
		</Popover>
	);
}

interface DropdownMenuDemoProps {
	label: string;
	items: MenuItem[];
	size?: MenuItemSize;
	caption?: string;
}

/** DropdownMenu is a static panel with no trigger/positioning of its own, so
 * pairing it with Popover gives it a real, functional click-to-open trigger —
 * the composition a consumer would actually reach for. */
function DropdownMenuDemo({
	label,
	items,
	size,
	caption,
}: DropdownMenuDemoProps) {
	const [open, setOpen] = useState(false);
	return (
		<Popover
			trigger={<Button variant="outline">{label}</Button>}
			open={open}
			onOpenChange={setOpen}
			align="start"
			unstyled
		>
			<DropdownMenu
				items={items}
				size={size}
				caption={caption}
				onItemClick={() => setOpen(false)}
			/>
		</Popover>
	);
}

interface ModalDemoProps
	extends Omit<
		ModalProps,
		"isOpen" | "onClose" | "title" | "footer" | "children"
	> {
	label: string;
	title?: string;
	footer?: (close: () => void) => ReactNode;
	children?: ReactNode;
}

function ModalDemo({
	label,
	title = "Modal Title",
	footer,
	children,
	...rest
}: ModalDemoProps) {
	const [isOpen, setIsOpen] = useState(false);
	const close = () => setIsOpen(false);
	return (
		<>
			<Button onClick={() => setIsOpen(true)}>{label}</Button>
			<Modal
				isOpen={isOpen}
				onClose={close}
				title={title}
				footer={footer?.(close)}
				{...rest}
			>
				{children ?? "Modal body content goes here."}
			</Modal>
		</>
	);
}

interface DrawerDemoProps
	extends Omit<
		DrawerProps,
		"isOpen" | "onClose" | "title" | "footer" | "children"
	> {
	label: string;
	title?: string;
	triggerIcon?: ReactNode;
	footer?: (close: () => void) => ReactNode;
	children?: ReactNode;
}

function DrawerDemo({
	label,
	title = "Drawer Title",
	triggerIcon,
	footer,
	children,
	...rest
}: DrawerDemoProps) {
	const [isOpen, setIsOpen] = useState(false);
	const close = () => setIsOpen(false);
	return (
		<>
			<Button
				variant="outline"
				leftIcon={triggerIcon}
				onClick={() => setIsOpen(true)}
			>
				{label}
			</Button>
			<Drawer
				isOpen={isOpen}
				onClose={close}
				title={title}
				footer={footer?.(close)}
				{...rest}
			>
				{children ?? "Drawer body content goes here."}
			</Drawer>
		</>
	);
}

// =============================================================================
// SPECIMENS
// =============================================================================

export function OverlaysSpecimens() {
	return (
		<>
			<Spec
				name="Tooltip"
				description="CSS-only hover tooltip in four edge placements. No JS positioning, so it's always live."
			>
				<SpecRow label="Placements">
					<SpecItem label="top">
						<Tooltip content="Tooltip on top" position="top">
							<Button variant="outline">Top</Button>
						</Tooltip>
					</SpecItem>
					<SpecItem label="bottom">
						<Tooltip content="Tooltip on bottom" position="bottom">
							<Button variant="outline">Bottom</Button>
						</Tooltip>
					</SpecItem>
					<SpecItem label="left">
						<Tooltip content="Tooltip on left" position="left">
							<Button variant="outline">Left</Button>
						</Tooltip>
					</SpecItem>
					<SpecItem label="right">
						<Tooltip content="Tooltip on right" position="right">
							<Button variant="outline">Right</Button>
						</Tooltip>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="long content">
						<Tooltip content="This is a longer tooltip message that demonstrates how the tooltip handles multi-line content.">
							<Button variant="outline">Hover for details</Button>
						</Tooltip>
					</SpecItem>
					<SpecItem label="icon trigger">
						<Tooltip content="Get help with this feature">
							<Button variant="outline" isIconOnly aria-label="Help">
								<HelpCircle />
							</Button>
						</Tooltip>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Popover"
				description="Floating panel anchored to a trigger. Four placements, three alignments, optional header."
			>
				<SpecRow label="Placements">
					<SpecItem label="top">
						<Popover trigger={<Button>Top</Button>} placement="top">
							Placed above the trigger.
						</Popover>
					</SpecItem>
					<SpecItem label="bottom">
						<Popover trigger={<Button>Bottom</Button>} placement="bottom">
							Placed below the trigger.
						</Popover>
					</SpecItem>
					<SpecItem label="left">
						<Popover trigger={<Button>Left</Button>} placement="left">
							Placed to the left of the trigger.
						</Popover>
					</SpecItem>
					<SpecItem label="right">
						<Popover trigger={<Button>Right</Button>} placement="right">
							Placed to the right of the trigger.
						</Popover>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Alignments">
					<SpecItem label="start">
						<Popover trigger={<Button>Start</Button>} align="start">
							Aligned to the trigger&apos;s start edge.
						</Popover>
					</SpecItem>
					<SpecItem label="center">
						<Popover trigger={<Button>Center</Button>} align="center">
							Aligned to the trigger&apos;s center.
						</Popover>
					</SpecItem>
					<SpecItem label="end">
						<Popover trigger={<Button>End</Button>} align="end">
							Aligned to the trigger&apos;s end edge.
						</Popover>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="title + close">
						<Popover
							trigger={
								<Button variant="outline" leftIcon={<Settings />}>
									Settings
								</Button>
							}
							title="Preferences"
							showClose
						>
							Configure notification and workspace preferences.
						</Popover>
					</SpecItem>
					<SpecItem label="controlled">
						<ControlledPopoverDemo />
					</SpecItem>
					<SpecItem label="no focus trap">
						<Popover trigger={<Button>No Focus Trap</Button>} trapFocus={false}>
							Tab moves past this popover to nearby controls.
						</Popover>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Dropdown"
				description="Select-style trigger with a floating listbox. Three variants, three sizes, two placements."
			>
				<SpecRow label="Variants">
					<SpecItem label="default">
						<DropdownDemo items={dropdownPlainItems} placeholder="Default" />
					</SpecItem>
					<SpecItem label="outline">
						<DropdownDemo
							items={dropdownPlainItems}
							variant="outline"
							placeholder="Outline"
						/>
					</SpecItem>
					<SpecItem label="ghost">
						<DropdownDemo
							items={dropdownPlainItems}
							variant="ghost"
							placeholder="Ghost"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Sizes">
					<SpecItem label="sm">
						<DropdownDemo
							items={dropdownPlainItems}
							size="sm"
							placeholder="Small"
						/>
					</SpecItem>
					<SpecItem label="md">
						<DropdownDemo
							items={dropdownPlainItems}
							size="md"
							placeholder="Medium"
						/>
					</SpecItem>
					<SpecItem label="lg">
						<DropdownDemo
							items={dropdownPlainItems}
							size="lg"
							placeholder="Large"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Placement">
					<SpecItem label="bottom">
						<DropdownDemo
							items={dropdownPlainItems}
							placement="bottom"
							placeholder="Opens below"
						/>
					</SpecItem>
					<SpecItem label="top">
						<DropdownDemo
							items={dropdownPlainItems}
							placement="top"
							placeholder="Opens above"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="withIcons">
						<DropdownDemo
							items={dropdownActionItems}
							defaultValue="edit"
							placeholder="Select action..."
						/>
					</SpecItem>
					<SpecItem label="withDescriptions">
						<DropdownDemo
							items={dropdownWorkspaceItems}
							placeholder="Select workspace..."
						/>
					</SpecItem>
					<SpecItem label="disabledItems">
						<DropdownDemo
							items={dropdownDisabledItems}
							placeholder="Select action..."
						/>
					</SpecItem>
					<SpecItem label="alignEnd">
						<DropdownDemo
							items={dropdownPlainItems}
							align="end"
							placeholder="Actions"
						/>
					</SpecItem>
					<SpecItem label="disabled">
						<DropdownDemo
							items={dropdownPlainItems}
							placeholder="Disabled dropdown"
							disabled
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="DropdownMenu"
				description="Action list panel. Pairs with Popover for a real click-to-open trigger — it has no positioning of its own."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm">
						<DropdownMenuDemo
							label="Small Menu"
							items={dropdownMenuSimpleItems}
							size="sm"
						/>
					</SpecItem>
					<SpecItem label="md">
						<DropdownMenuDemo
							label="Medium Menu"
							items={dropdownMenuSimpleItems}
							size="md"
						/>
					</SpecItem>
					<SpecItem label="lg">
						<DropdownMenuDemo
							label="Large Menu"
							items={dropdownMenuSimpleItems}
							size="lg"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="checkboxes">
						<DropdownMenuDemo label="View" items={viewMenuItems} />
					</SpecItem>
					<SpecItem label="active state">
						<DropdownMenuDemo label="Navigate" items={navMenuItems} />
					</SpecItem>
					<SpecItem label="sublabels">
						<DropdownMenuDemo label="Account" items={accountMenuItems} />
					</SpecItem>
					<SpecItem label="shortcuts">
						<DropdownMenuDemo label="Edit" items={editMenuItems} />
					</SpecItem>
					<SpecItem label="caption">
						<DropdownMenuDemo
							label="Help"
							items={helpMenuItems}
							caption="Links open in a new tab"
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Modal"
				description="Native <dialog>-based modal. Five sizes, five status icon variants, dismissible and footer options."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm">
						<ModalDemo label="Open Small" title="Small Modal" size="sm" />
					</SpecItem>
					<SpecItem label="md">
						<ModalDemo label="Open Medium" title="Medium Modal" size="md" />
					</SpecItem>
					<SpecItem label="lg">
						<ModalDemo label="Open Large" title="Large Modal" size="lg" />
					</SpecItem>
					<SpecItem label="xl">
						<ModalDemo
							label="Open Extra Large"
							title="Extra Large Modal"
							size="xl"
						/>
					</SpecItem>
					<SpecItem label="full">
						<ModalDemo
							label="Open Full Screen"
							title="Full Screen Modal"
							size="full"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Icon variants">
					<SpecItem label="default">
						<ModalDemo
							label="Open Default"
							title="Notification"
							icon={<Bell />}
							iconVariant="default"
						/>
					</SpecItem>
					<SpecItem label="info">
						<ModalDemo
							label="Open Info"
							title="Information"
							description="This is an informational message for the user."
							icon={<Info />}
							iconVariant="info"
						/>
					</SpecItem>
					<SpecItem label="success">
						<ModalDemo
							label="Open Success"
							title="Success!"
							description="Your changes have been saved successfully."
							icon={<CheckCircle />}
							iconVariant="success"
							footer={(close) => <Button onClick={close}>Continue</Button>}
						/>
					</SpecItem>
					<SpecItem label="warning">
						<ModalDemo
							label="Open Warning"
							title="Warning"
							description="This action may have unintended consequences."
							icon={<AlertTriangle />}
							iconVariant="warning"
							footer={(close) => (
								<>
									<Button variant="outline" onClick={close}>
										Cancel
									</Button>
									<Button onClick={close}>Proceed Anyway</Button>
								</>
							)}
						/>
					</SpecItem>
					<SpecItem label="error">
						<ModalDemo
							label="Open Error"
							title="Error"
							description="Something went wrong. Please try again."
							icon={<XCircle />}
							iconVariant="error"
							footer={(close) => <Button onClick={close}>Try Again</Button>}
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="footer">
						<ModalDemo
							label="Open With Footer"
							footer={(close) => (
								<>
									<Button variant="outline" onClick={close}>
										Cancel
									</Button>
									<Button onClick={close}>Confirm</Button>
								</>
							)}
						/>
					</SpecItem>
					<SpecItem label="noCloseButton">
						<ModalDemo label="Open No Close Button" showCloseButton={false} />
					</SpecItem>
					<SpecItem label="nonDismissible">
						<ModalDemo
							label="Open Non-Dismissible"
							title="Required Action"
							description="This modal cannot be dismissed by clicking outside or pressing Escape."
							icon={<AlertTriangle />}
							iconVariant="warning"
							dismissible={false}
							size="sm"
							footer={(close) => (
								<>
									<Button variant="outline" onClick={close}>
										Cancel
									</Button>
									<Button onClick={close}>Confirm</Button>
								</>
							)}
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Drawer"
				description="Side panel on desktop, bottom sheet on mobile. Three widths, dismissible and footer options."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm">
						<DrawerDemo label="Open Small" title="Small Drawer" size="sm" />
					</SpecItem>
					<SpecItem label="md">
						<DrawerDemo label="Open Medium" title="Medium Drawer" size="md" />
					</SpecItem>
					<SpecItem label="lg">
						<DrawerDemo label="Open Large" title="Large Drawer" size="lg" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="description">
						<DrawerDemo
							label="Open Settings"
							title="Settings"
							description="Adjust your preferences for this campaign."
							triggerIcon={<Settings />}
						/>
					</SpecItem>
					<SpecItem label="footer">
						<DrawerDemo
							label="Open Schedule"
							title="Schedule Post"
							footer={(close) => (
								<>
									<Button variant="outline" onClick={close}>
										Cancel
									</Button>
									<Button onClick={close}>Confirm</Button>
								</>
							)}
						>
							Choose a date and time to schedule your post.
						</DrawerDemo>
					</SpecItem>
					<SpecItem label="noCloseButton">
						<DrawerDemo
							label="Open No Close Button"
							title="Quiet Panel"
							showCloseButton={false}
						/>
					</SpecItem>
					<SpecItem label="nonDismissible">
						<DrawerDemo
							label="Open Non-Dismissible"
							title="Required Review"
							description="This drawer will not close on backdrop click or Escape."
							dismissible={false}
							footer={(close) => (
								<>
									<Button variant="outline" onClick={close}>
										Cancel
									</Button>
									<Button onClick={close}>Submit</Button>
								</>
							)}
						/>
					</SpecItem>
					<SpecItem label="filter panel">
						<DrawerDemo
							label="Open Filters"
							title="Filter Results"
							description="Narrow down the list by applying filters."
							triggerIcon={<Filter />}
							size="sm"
							footer={(close) => (
								<>
									<Button variant="outline" onClick={close}>
										Reset
									</Button>
									<Button onClick={close}>Apply</Button>
								</>
							)}
						/>
					</SpecItem>
				</SpecRow>
			</Spec>
		</>
	);
}
