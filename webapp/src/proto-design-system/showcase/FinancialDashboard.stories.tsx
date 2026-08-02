// Showcase-only "in context" composition: a believable financial-product
// dashboard assembled from real design-system components, proving the kit
// holds up as an actual product surface (not an isolated component story).
// Imported solely by Storybook — never from src/routes or the real app.
// Structural precedent: LayoutShowcase.stories.tsx's `FullAppLayout` export.

import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	ArrowRight,
	BarChart3,
	Bell,
	Command,
	Copy,
	CreditCard,
	Download,
	FileText,
	Home,
	LayoutDashboard,
	LogOut,
	MoreVertical,
	Plus,
	Receipt,
	Search,
	Settings,
	Trash2,
	Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Accordion } from "@/proto-design-system/components/composite/Accordion/Accordion";
import { DatePicker } from "@/proto-design-system/components/composite/DatePicker/DatePicker";
import { MultiSelect } from "@/proto-design-system/components/composite/MultiSelect/MultiSelect";
import { DataGrid } from "@/proto-design-system/components/data/DataGrid/DataGrid";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState/EmptyState";
import { FilterTabs } from "@/proto-design-system/components/data/FilterTabs/FilterTabs";
import {
	BannerCenterProvider,
	useBannerCenter,
} from "@/proto-design-system/components/feedback/BannerCenter/BannerCenter";
import { Progress } from "@/proto-design-system/components/feedback/Progress/Progress";
import { Checkbox } from "@/proto-design-system/components/forms/Checkbox/Checkbox";
import { Radio } from "@/proto-design-system/components/forms/Radio/Radio";
import { Select } from "@/proto-design-system/components/forms/Select/Select";
import { Switch } from "@/proto-design-system/components/forms/Switch/Switch";
import { TextArea } from "@/proto-design-system/components/forms/TextArea/TextArea";
import { TextField } from "@/proto-design-system/components/forms/TextField/TextField";
import {
	Card,
	CardBody,
	CardHeader,
} from "@/proto-design-system/components/layout/Card/Card";
import { Divider } from "@/proto-design-system/components/layout/Divider/Divider";
import { Grid } from "@/proto-design-system/components/layout/Grid/Grid";
import { PageHero } from "@/proto-design-system/components/layout/PageHero/PageHero";
import { PageShell } from "@/proto-design-system/components/layout/PageShell/PageShell";
import { SectionHeader } from "@/proto-design-system/components/layout/SectionHeader/SectionHeader";
import { Stack } from "@/proto-design-system/components/layout/Stack/Stack";
import { Breadcrumb } from "@/proto-design-system/components/navigation/Breadcrumb/Breadcrumb";
import { CommandPalette } from "@/proto-design-system/components/navigation/CommandPalette/CommandPalette";
import {
	Sidebar,
	SidebarDivider,
	SidebarHeader,
	SidebarItem,
	SidebarLogo,
	SidebarMobileTrigger,
	SidebarProvider,
	SidebarSection,
	SidebarToggle,
	useSidebarContext,
} from "@/proto-design-system/components/navigation/Sidebar/Sidebar";
import { Drawer } from "@/proto-design-system/components/overlays/Drawer/Drawer";
import { DropdownMenu } from "@/proto-design-system/components/overlays/DropdownMenu/DropdownMenu";
import { Modal } from "@/proto-design-system/components/overlays/Modal/Modal";
import { Popover } from "@/proto-design-system/components/overlays/Popover/Popover";
import { Tooltip } from "@/proto-design-system/components/overlays/Tooltip/Tooltip";
import { Avatar } from "@/proto-design-system/components/primitives/Avatar/Avatar";
import { Badge } from "@/proto-design-system/components/primitives/Badge/Badge";
import type { BadgeVariant } from "@/proto-design-system/components/primitives/Badge/Badge.types";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";
import { Skeleton } from "@/proto-design-system/components/primitives/Skeleton/Skeleton";
import { Text } from "@/proto-design-system/components/primitives/Text/Text";
import styles from "./FinancialDashboard.module.scss";

const meta: Meta = {
	title: "Showcase/Financial Dashboard",
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Mock ledger data — Ledgerline, a fictional B2B finance/ledger product
// ============================================================================

type TransactionStatus = "completed" | "pending" | "failed";
type TransactionCategory =
	| "Payroll"
	| "Software"
	| "Marketing"
	| "Revenue"
	| "Travel"
	| "Office";

interface Transaction {
	id: string;
	date: string;
	description: string;
	category: TransactionCategory;
	account: string;
	amount: number;
	status: TransactionStatus;
}

const TRANSACTION_STATUS_META: Record<
	TransactionStatus,
	{ label: string; variant: BadgeVariant }
> = {
	completed: { label: "Completed", variant: "success" },
	pending: { label: "Pending", variant: "warning" },
	failed: { label: "Failed", variant: "error" },
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 2,
});

function formatAmount(amount: number): string {
	const formatted = currencyFormatter.format(Math.abs(amount));
	return amount < 0 ? `-${formatted}` : `+${formatted}`;
}

const TRANSACTIONS: Transaction[] = [
	{
		id: "TXN-4821",
		date: "2026-07-31",
		description: "Payroll run — July, 14 employees",
		category: "Payroll",
		account: "Operating · 4821",
		amount: -48210.0,
		status: "completed",
	},
	{
		id: "TXN-4820",
		date: "2026-07-31",
		description: "Acme Manufacturing — invoice INV-1092",
		category: "Revenue",
		account: "Operating · 4821",
		amount: 18500.0,
		status: "completed",
	},
	{
		id: "TXN-4819",
		date: "2026-07-30",
		description: "Linear — annual seat renewal",
		category: "Software",
		amount: -1188.0,
		account: "Corporate card · 2210",
		status: "completed",
	},
	{
		id: "TXN-4818",
		date: "2026-07-30",
		description: "Meta Ads — Q3 acquisition campaign",
		category: "Marketing",
		account: "Corporate card · 2210",
		amount: -6420.5,
		status: "pending",
	},
	{
		id: "TXN-4817",
		date: "2026-07-29",
		description: "Northgate Logistics — invoice INV-1087",
		category: "Revenue",
		account: "Operating · 4821",
		amount: 9760.0,
		status: "completed",
	},
	{
		id: "TXN-4816",
		date: "2026-07-29",
		description: "WeWork — August coworking",
		category: "Office",
		account: "Operating · 4821",
		amount: -3200.0,
		status: "completed",
	},
	{
		id: "TXN-4815",
		date: "2026-07-28",
		description: "United — SFO/JFK, sales offsite",
		category: "Travel",
		account: "Corporate card · 2210",
		amount: -842.15,
		status: "failed",
	},
	{
		id: "TXN-4814",
		date: "2026-07-28",
		description: "Datadog — usage overage, June",
		category: "Software",
		account: "Corporate card · 2210",
		amount: -1904.32,
		status: "completed",
	},
	{
		id: "TXN-4813",
		date: "2026-07-27",
		description: "Fenwick Partners — invoice INV-1081",
		category: "Revenue",
		account: "Operating · 4821",
		amount: 24000.0,
		status: "completed",
	},
	{
		id: "TXN-4812",
		date: "2026-07-26",
		description: "Google Workspace — 22 seats",
		category: "Software",
		account: "Corporate card · 2210",
		amount: -308.0,
		status: "completed",
	},
	{
		id: "TXN-4811",
		date: "2026-07-25",
		description: "LinkedIn Ads — hiring campaign",
		category: "Marketing",
		account: "Corporate card · 2210",
		amount: -2150.0,
		status: "pending",
	},
	{
		id: "TXN-4810",
		date: "2026-07-24",
		description: "Riverbend Foods — invoice INV-1074",
		category: "Revenue",
		account: "Operating · 4821",
		amount: 6100.0,
		status: "completed",
	},
	{
		id: "TXN-4809",
		date: "2026-07-23",
		description: "Staples — office supplies",
		category: "Office",
		account: "Corporate card · 2210",
		amount: -184.6,
		status: "completed",
	},
	{
		id: "TXN-4808",
		date: "2026-07-22",
		description: "Payroll correction — contractor stipend",
		category: "Payroll",
		account: "Operating · 4821",
		amount: -2400.0,
		status: "failed",
	},
	{
		id: "TXN-4807",
		date: "2026-07-21",
		description: "Slack — Business+ plan renewal",
		category: "Software",
		account: "Corporate card · 2210",
		amount: -960.0,
		status: "completed",
	},
	{
		id: "TXN-4806",
		date: "2026-07-20",
		description: "Cascade Analytics — invoice INV-1069",
		category: "Revenue",
		account: "Operating · 4821",
		amount: 14250.0,
		status: "completed",
	},
	{
		id: "TXN-4805",
		date: "2026-07-19",
		description: "Delta — client onsite, Chicago",
		category: "Travel",
		account: "Corporate card · 2210",
		amount: -611.4,
		status: "completed",
	},
	{
		id: "TXN-4804",
		date: "2026-07-18",
		description: "HubSpot — marketing hub upgrade",
		category: "Marketing",
		account: "Corporate card · 2210",
		amount: -890.0,
		status: "completed",
	},
	{
		id: "TXN-4803",
		date: "2026-07-17",
		description: "Bright Path Clinics — invoice INV-1063",
		category: "Revenue",
		account: "Operating · 4821",
		amount: 3200.0,
		status: "pending",
	},
	{
		id: "TXN-4802",
		date: "2026-07-16",
		description: "Regus — meeting room, board offsite",
		category: "Office",
		account: "Corporate card · 2210",
		amount: -540.0,
		status: "completed",
	},
];

const CATEGORY_OPTIONS = [
	{ value: "all", label: "All categories" },
	{ value: "Payroll", label: "Payroll" },
	{ value: "Software", label: "Software" },
	{ value: "Marketing", label: "Marketing" },
	{ value: "Revenue", label: "Revenue" },
	{ value: "Travel", label: "Travel" },
	{ value: "Office", label: "Office" },
];

const ACCOUNT_ITEMS = [
	{ id: "operating", label: "Operating · 4821" },
	{ id: "card", label: "Corporate card · 2210" },
	{ id: "reserve", label: "Cash reserve · 7745" },
];

const FAQ_ITEMS = [
	{
		id: "statements",
		title: "When are monthly statements generated?",
		content:
			"Statements post on the 2nd business day of the following month, covering the full prior calendar month across every connected account.",
	},
	{
		id: "export",
		title: "How do I export a reconciliation CSV?",
		content:
			"Use Export on the Transactions panel. The CSV includes every filtered row with account, category, and status columns, matched to your current filter selection.",
	},
	{
		id: "cutoff",
		title: "What is the reconciliation cutoff?",
		content:
			"Transactions settle by 6:00 PM ET. Anything initiated after cutoff posts as pending and reconciles the next business day.",
	},
];

const NAV_COMMANDS_LABEL = "Command palette";

// ============================================================================
// Sub-components
// ============================================================================

function SidebarUserMenu() {
	const { collapsed } = useSidebarContext();
	const [menuOpen, setMenuOpen] = useState(false);

	const trigger = collapsed ? (
		<button
			type="button"
			className={styles.userMenuTrigger}
			aria-label="Account menu"
		>
			<Avatar initials="MR" size="sm" />
		</button>
	) : (
		<button
			type="button"
			className={styles.userMenuTrigger}
			aria-label="Account menu"
		>
			<Avatar initials="MR" size="sm" />
			<Stack gap="0" className={styles.userMenuText}>
				<Text size="sm" weight="medium" truncate>
					Mara Reyes
				</Text>
				<Text size="xs" color="muted" truncate>
					mara@ledgerline.co
				</Text>
			</Stack>
		</button>
	);

	return (
		<Stack
			direction="row"
			align="center"
			justify={collapsed ? "center" : "start"}
			gap="0"
			className={
				collapsed
					? `${styles.userFooter} ${styles.userFooterCollapsed}`
					: styles.userFooter
			}
		>
			<Popover
				trigger={trigger}
				open={menuOpen}
				onOpenChange={setMenuOpen}
				placement="top"
				align="start"
				unstyled
			>
				<DropdownMenu
					size="sm"
					items={[
						{
							id: "settings",
							label: "Account settings",
							leftIcon: <Settings />,
						},
						{ id: "billing", label: "Billing", leftIcon: <CreditCard /> },
						{ type: "divider" },
						{ id: "logout", label: "Log out", leftIcon: <LogOut /> },
					]}
					onItemClick={() => setMenuOpen(false)}
				/>
			</Popover>
		</Stack>
	);
}

interface TransactionRowActionsProps {
	transaction: Transaction;
	onDuplicate: (transaction: Transaction) => void;
	onDelete: (transaction: Transaction) => void;
}

function TransactionRowActions({
	transaction,
	onDuplicate,
	onDelete,
}: TransactionRowActionsProps) {
	const [open, setOpen] = useState(false);

	return (
		<Popover
			trigger={
				<Button
					variant="ghost"
					size="sm"
					isIconOnly
					aria-label={`More actions for ${transaction.id}`}
				>
					<MoreVertical size={16} />
				</Button>
			}
			open={open}
			onOpenChange={setOpen}
			placement="bottom"
			align="end"
			unstyled
		>
			<DropdownMenu
				size="sm"
				items={[
					{
						id: "duplicate",
						label: "Duplicate",
						leftIcon: <Copy />,
						onClick: () => onDuplicate(transaction),
					},
					{
						id: "delete",
						label: "Delete",
						leftIcon: <Trash2 />,
						onClick: () => onDelete(transaction),
					},
				]}
				onItemClick={() => setOpen(false)}
			/>
		</Popover>
	);
}

interface AddTransactionDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: () => void;
}

function AddTransactionDrawer({
	isOpen,
	onClose,
	onSubmit,
}: AddTransactionDrawerProps) {
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState("Software");
	const [account, setAccount] = useState("operating");
	const [date, setDate] = useState<Date | null>(new Date());
	const [amount, setAmount] = useState("");
	const [recurring, setRecurring] = useState(false);
	const [notes, setNotes] = useState("");

	return (
		<Drawer
			isOpen={isOpen}
			onClose={onClose}
			title="Add transaction"
			description="Record a manual ledger entry for reconciliation."
			size="sm"
			footer={
				<Stack direction="row" gap="sm" justify="end">
					<Button variant="ghost" size="sm" onClick={onClose}>
						Cancel
					</Button>
					<Button size="sm" onClick={onSubmit}>
						Save transaction
					</Button>
				</Stack>
			}
		>
			<Stack gap="md">
				<TextField
					label="Description"
					placeholder="e.g. Adobe Creative Cloud renewal"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					size="sm"
					isFullWidth
				/>
				<Select
					label="Category"
					options={CATEGORY_OPTIONS.slice(1)}
					value={category}
					onChange={(e) => setCategory(e.target.value)}
					size="sm"
					fullWidth
				/>
				<Select
					label="Account"
					options={ACCOUNT_ITEMS.map((item) => ({
						value: item.id,
						label: item.label,
					}))}
					value={account}
					onChange={(e) => setAccount(e.target.value)}
					size="sm"
					fullWidth
				/>
				<DatePicker
					value={date}
					onChange={setDate}
					placeholder="Select date"
					size="sm"
				/>
				<TextField
					label="Amount"
					placeholder="-1,200.00"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					size="sm"
					isFullWidth
				/>
				<Switch
					size="sm"
					label="Recurring monthly"
					description="Auto-create this entry on the same day next month"
					checked={recurring}
					onChange={(e) => setRecurring(e.target.checked)}
				/>
				<TextArea
					label="Notes"
					placeholder="Optional reconciliation notes"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					rows={3}
					size="sm"
					fullWidth
				/>
			</Stack>
		</Drawer>
	);
}

interface NewInvoiceModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: () => void;
}

function NewInvoiceModal({ isOpen, onClose, onSubmit }: NewInvoiceModalProps) {
	const [client, setClient] = useState("");
	const [amount, setAmount] = useState("");
	const [dueDate, setDueDate] = useState<Date | null>(null);
	const [terms, setTerms] = useState("net30");
	const [sendReminder, setSendReminder] = useState(true);

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="New invoice"
			description="Draft an invoice and send it once it looks right."
			icon={<Receipt />}
			size="sm"
			footer={
				<Stack direction="row" gap="sm" justify="end">
					<Button variant="ghost" size="sm" onClick={onClose}>
						Cancel
					</Button>
					<Button size="sm" onClick={onSubmit}>
						Create invoice
					</Button>
				</Stack>
			}
		>
			<Stack gap="md">
				<TextField
					label="Client name"
					placeholder="e.g. Northgate Logistics"
					value={client}
					onChange={(e) => setClient(e.target.value)}
					size="sm"
					isFullWidth
				/>
				<TextField
					label="Amount"
					placeholder="12,500.00"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					size="sm"
					isFullWidth
				/>
				<DatePicker
					value={dueDate}
					onChange={setDueDate}
					placeholder="Due date"
					size="sm"
				/>
				<Stack gap="sm">
					<Text size="sm" weight="medium">
						Payment terms
					</Text>
					<Stack direction="row" gap="md" wrap>
						<Radio
							name="terms"
							value="net15"
							label="Net 15"
							checked={terms === "net15"}
							onChange={() => setTerms("net15")}
							size="sm"
						/>
						<Radio
							name="terms"
							value="net30"
							label="Net 30"
							checked={terms === "net30"}
							onChange={() => setTerms("net30")}
							size="sm"
						/>
						<Radio
							name="terms"
							value="net60"
							label="Net 60"
							checked={terms === "net60"}
							onChange={() => setTerms("net60")}
							size="sm"
						/>
					</Stack>
				</Stack>
				<Checkbox
					label="Send reminder email 3 days before due date"
					checked={sendReminder}
					onChange={(e) => setSendReminder(e.target.checked)}
					size="sm"
				/>
			</Stack>
		</Modal>
	);
}

function SyncStatusPanel() {
	const [showLoading, setShowLoading] = useState(false);

	return (
		<Card variant="outlined" padding="none">
			<CardHeader>
				<Stack
					direction="row"
					justify="between"
					align="center"
					style={{ width: "100%" }}
				>
					<Text as="h3" size="lg" weight="semibold">
						Account sync
					</Text>
					<Switch
						size="sm"
						label="Simulate loading"
						checked={showLoading}
						onChange={(e) => setShowLoading(e.target.checked)}
						labelPosition="left"
					/>
				</Stack>
			</CardHeader>
			<CardBody>
				{showLoading ? (
					<Stack gap="sm">
						{[0, 1, 2].map((i) => (
							<Stack key={i} direction="row" gap="sm" align="center">
								<Skeleton variant="circular" width={32} height={32} />
								<Stack gap="xs" style={{ flex: 1 }}>
									<Skeleton variant="text" width="60%" />
									<Skeleton variant="text" width="35%" />
								</Stack>
							</Stack>
						))}
					</Stack>
				) : (
					<Stack gap="sm">
						<Stack direction="row" justify="between" align="center">
							<Text size="sm">Operating · 4821</Text>
							<Badge variant="success" size="sm" dot>
								Synced 2m ago
							</Badge>
						</Stack>
						<Stack direction="row" justify="between" align="center">
							<Text size="sm">Corporate card · 2210</Text>
							<Badge variant="success" size="sm" dot>
								Synced 2m ago
							</Badge>
						</Stack>
						<Stack direction="row" justify="between" align="center">
							<Text size="sm">Cash reserve · 7745</Text>
							<Badge variant="warning" size="sm" dot>
								Syncing
							</Badge>
						</Stack>
					</Stack>
				)}
			</CardBody>
		</Card>
	);
}

// ============================================================================
// Main composition
// ============================================================================

function DashboardContent() {
	const { addBanner } = useBannerCenter();
	const [statusFilter, setStatusFilter] = useState("all");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [accountFilter, setAccountFilter] = useState<Set<string>>(new Set());
	const [dateFrom, setDateFrom] = useState<Date | null>(null);
	const [addTransactionOpen, setAddTransactionOpen] = useState(false);
	const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const [transactions, setTransactions] = useState(TRANSACTIONS);

	const selectedAccountLabels = useMemo(() => {
		return new Set(
			ACCOUNT_ITEMS.filter((item) => accountFilter.has(item.id)).map(
				(item) => item.label,
			),
		);
	}, [accountFilter]);

	const filteredTransactions = useMemo(() => {
		return transactions.filter((txn) => {
			if (statusFilter !== "all" && txn.status !== statusFilter) return false;
			if (categoryFilter !== "all" && txn.category !== categoryFilter)
				return false;
			if (
				selectedAccountLabels.size > 0 &&
				!selectedAccountLabels.has(txn.account)
			) {
				return false;
			}
			if (dateFrom && new Date(txn.date) < dateFrom) return false;
			return true;
		});
	}, [
		transactions,
		statusFilter,
		categoryFilter,
		selectedAccountLabels,
		dateFrom,
	]);

	const statusCounts = useMemo(() => {
		const counts: Record<string, number> = { all: transactions.length };
		for (const txn of transactions) {
			counts[txn.status] = (counts[txn.status] ?? 0) + 1;
		}
		return counts;
	}, [transactions]);

	const clearFilters = () => {
		setStatusFilter("all");
		setCategoryFilter("all");
		setAccountFilter(new Set());
		setDateFrom(null);
	};

	const handleDuplicate = (txn: Transaction) => {
		addBanner({
			type: "info",
			variant: "filled",
			title: "Transaction duplicated",
			description: `A copy of ${txn.id} was added as a draft entry.`,
			dismissible: true,
		});
	};

	const handleDelete = (txn: Transaction) => {
		setTransactions((prev) => prev.filter((t) => t.id !== txn.id));
		addBanner({
			type: "warning",
			variant: "filled",
			title: "Transaction removed",
			description: `${txn.id} was deleted from the ledger.`,
			dismissible: true,
		});
	};

	const handleAddTransaction = () => {
		setAddTransactionOpen(false);
		addBanner({
			type: "success",
			variant: "filled",
			title: "Transaction saved",
			description: "The new entry is posted and awaiting reconciliation.",
			dismissible: true,
		});
	};

	const handleCreateInvoice = () => {
		setNewInvoiceOpen(false);
		addBanner({
			type: "success",
			variant: "filled",
			title: "Invoice created",
			description: "The draft invoice is ready to review and send.",
			dismissible: true,
		});
	};

	return (
		<SidebarProvider responsive>
			<Stack direction="row" gap="0" className={styles.appShell}>
				<Sidebar>
					<SidebarHeader>
						<SidebarLogo>Ledgerline</SidebarLogo>
						<SidebarToggle />
					</SidebarHeader>

					<SidebarSection>
						<SidebarItem icon={<Home />} href="#" active>
							Overview
						</SidebarItem>
						<SidebarItem icon={<Receipt />} href="#">
							Transactions
						</SidebarItem>
						<SidebarItem icon={<FileText />} href="#">
							Invoices
						</SidebarItem>
						<SidebarItem icon={<BarChart3 />} href="#">
							Reports
						</SidebarItem>
					</SidebarSection>

					<SidebarDivider />

					<SidebarSection title="Workspace">
						<SidebarItem icon={<Wallet />} href="#">
							Accounts
						</SidebarItem>
						<SidebarItem icon={<Settings />} href="#">
							Settings
						</SidebarItem>
					</SidebarSection>

					<div className={styles.spacer} />

					<SidebarUserMenu />
				</Sidebar>

				<Stack direction="column" gap="0" className={styles.mainColumn}>
					<header className={styles.topbar}>
						<Stack
							direction="row"
							justify="between"
							align="center"
							gap="sm"
							wrap
						>
							<Stack direction="row" gap="sm" align="center" wrap>
								<SidebarMobileTrigger />
								<Breadcrumb
									items={[
										{
											label: "Ledgerline",
											icon: <LayoutDashboard size={14} />,
										},
										{ label: "Overview" },
									]}
									size="sm"
								/>
							</Stack>
							<Stack direction="row" gap="sm" align="center">
								<TextField
									placeholder="Search transactions"
									aria-label="Search transactions"
									leftElement={<Search size={16} />}
									size="sm"
								/>
								<Tooltip content={`${NAV_COMMANDS_LABEL} (Cmd+K)`}>
									<Button
										variant="outline"
										size="sm"
										leftIcon={<Command size={14} />}
										onClick={() => setCommandPaletteOpen(true)}
										aria-label={NAV_COMMANDS_LABEL}
									>
										<Text as="span" size="xs" color="muted">
											⌘K
										</Text>
									</Button>
								</Tooltip>
								<Tooltip content="3 unread alerts">
									<Button
										variant="ghost"
										size="sm"
										isIconOnly
										aria-label="Notifications"
									>
										<Bell size={16} />
									</Button>
								</Tooltip>
							</Stack>
						</Stack>
					</header>

					<main className={styles.scrollArea}>
						<div className={styles.contentPadding}>
							<PageShell variant="default" animate>
								<PageHero
									eyebrow="Ledgerline · Finance workspace"
									title="Overview"
									description="Cash position and activity across every connected account, updated as transactions settle."
									actions={
										<Stack direction="row" gap="sm">
											<Button
												variant="outline"
												size="sm"
												leftIcon={<FileText size={16} />}
												onClick={() => setNewInvoiceOpen(true)}
											>
												New invoice
											</Button>
											<Button
												size="sm"
												leftIcon={<Plus size={16} />}
												onClick={() => setAddTransactionOpen(true)}
											>
												Add transaction
											</Button>
										</Stack>
									}
								/>

								<Grid.Item
									span={{ base: 12, lg: 6 }}
									as="section"
									aria-label="Budget tracking"
								>
									<Card variant="outlined" padding="none">
										<CardHeader>
											<Text as="h3" size="lg" weight="semibold">
												Marketing budget
											</Text>
										</CardHeader>
										<CardBody>
											<Stack gap="xs">
												<Stack direction="row" justify="between">
													<Text size="sm" color="muted">
														$12,960 of $18,000 monthly budget
													</Text>
													<Text size="sm" weight="medium">
														72%
													</Text>
												</Stack>
												<Progress
													value={72}
													size="sm"
													variant="default"
													aria-label="Marketing spend, 72 percent of monthly budget"
												/>
											</Stack>
										</CardBody>
									</Card>
								</Grid.Item>

								<Grid.Item
									span={{ base: 12, lg: 6 }}
									as="section"
									aria-label="Account sync status"
								>
									<SyncStatusPanel />
								</Grid.Item>

								<Divider />

								<Grid.Item
									span={{ base: 12 }}
									as="section"
									aria-label="Transactions"
								>
									<Stack gap="md">
										<SectionHeader
											eyebrow="Ledger"
											title="Transactions"
											description={`${filteredTransactions.length} of ${transactions.length} transactions in the last 30 days`}
											size="sm"
											actions={
												<Button
													variant="outline"
													size="sm"
													leftIcon={<Download size={16} />}
												>
													Export
												</Button>
											}
										/>

										<Stack direction="row" gap="sm" wrap align="center">
											<FilterTabs
												aria-label="Filter by status"
												value={statusFilter}
												onChange={setStatusFilter}
												size="sm"
												items={[
													{ id: "all", label: "All", count: statusCounts.all },
													{
														id: "completed",
														label: "Completed",
														count: statusCounts.completed ?? 0,
													},
													{
														id: "pending",
														label: "Pending",
														count: statusCounts.pending ?? 0,
													},
													{
														id: "failed",
														label: "Failed",
														count: statusCounts.failed ?? 0,
													},
												]}
											/>
										</Stack>

										<Stack direction="row" gap="sm" wrap align="center">
											<Select
												aria-label="Filter by category"
												options={CATEGORY_OPTIONS}
												value={categoryFilter}
												onChange={(e) => setCategoryFilter(e.target.value)}
												size="sm"
											/>
											<MultiSelect
												items={ACCOUNT_ITEMS}
												value={accountFilter}
												onChange={setAccountFilter}
												placeholder="All accounts"
												size="sm"
											/>
											<DatePicker
												value={dateFrom}
												onChange={setDateFrom}
												placeholder="From date"
												size="sm"
											/>
											{(statusFilter !== "all" ||
												categoryFilter !== "all" ||
												accountFilter.size > 0 ||
												dateFrom) && (
												<Button
													variant="ghost"
													size="sm"
													onClick={clearFilters}
												>
													Clear filters
												</Button>
											)}
										</Stack>

										<DataGrid<Transaction>
											data={filteredTransactions}
											getRowId={(row) => row.id}
											pagination
											pageSize={8}
											emptyState={
												<EmptyState
													icon={<Search size={32} />}
													title="No transactions match these filters"
													description="Try a different status, category, or date range."
													size="sm"
													action={
														<Button
															variant="ghost"
															size="sm"
															onClick={clearFilters}
														>
															Clear filters
														</Button>
													}
												/>
											}
											columns={[
												{
													id: "date",
													header: "Date",
													cell: (row) =>
														new Date(row.date).toLocaleDateString("en-US", {
															month: "short",
															day: "numeric",
														}),
													width: "100px",
													sortable: true,
													sortFn: (a, b) => a.date.localeCompare(b.date),
												},
												{
													id: "description",
													header: "Description",
													cell: (row) => (
														<Tooltip content={row.description}>
															<Text size="sm" truncate>
																{row.description}
															</Text>
														</Tooltip>
													),
													width: "minmax(220px, 3fr)",
												},
												{
													id: "category",
													header: "Category",
													cell: (row) => (
														<Badge variant="outline" size="sm">
															{row.category}
														</Badge>
													),
													width: "140px",
													sortable: true,
													sortFn: (a, b) =>
														a.category.localeCompare(b.category),
												},
												{
													id: "account",
													header: "Account",
													cell: (row) => (
														<Text size="sm" color="muted">
															{row.account}
														</Text>
													),
													width: "minmax(160px, 1.5fr)",
												},
												{
													id: "amount",
													header: "Amount",
													cell: (row) => (
														<Text
															size="sm"
															weight="medium"
															color={row.amount < 0 ? "default" : "success"}
															className={styles.amountCell}
														>
															{formatAmount(row.amount)}
														</Text>
													),
													width: "130px",
													align: "right",
													sortable: true,
													sortFn: (a, b) => a.amount - b.amount,
												},
												{
													id: "status",
													header: "Status",
													cell: (row) => (
														<Badge
															variant={
																TRANSACTION_STATUS_META[row.status].variant
															}
															size="sm"
														>
															{TRANSACTION_STATUS_META[row.status].label}
														</Badge>
													),
													width: "120px",
												},
												{
													id: "actions",
													header: "",
													cell: (row) => (
														<TransactionRowActions
															transaction={row}
															onDuplicate={handleDuplicate}
															onDelete={handleDelete}
														/>
													),
													width: "56px",
													align: "right",
												},
											]}
										/>
									</Stack>
								</Grid.Item>

								<Divider />

								<Grid.Item
									span={{ base: 12 }}
									as="section"
									aria-label="Reports"
								>
									<Stack gap="md">
										<SectionHeader
											eyebrow="Reports"
											title="Statements and exports"
											description="Answers to the questions finance teams ask most often."
											size="sm"
										/>
										<Accordion items={FAQ_ITEMS} />
									</Stack>
								</Grid.Item>
							</PageShell>
						</div>
					</main>
				</Stack>
			</Stack>

			<AddTransactionDrawer
				isOpen={addTransactionOpen}
				onClose={() => setAddTransactionOpen(false)}
				onSubmit={handleAddTransaction}
			/>
			<NewInvoiceModal
				isOpen={newInvoiceOpen}
				onClose={() => setNewInvoiceOpen(false)}
				onSubmit={handleCreateInvoice}
			/>
			<CommandPalette
				isOpen={commandPaletteOpen}
				onClose={() => setCommandPaletteOpen(false)}
				placeholder="Jump to a page or action"
				items={[
					{
						id: "overview",
						label: "Go to Overview",
						icon: <Home size={16} />,
						group: "Navigate",
					},
					{
						id: "transactions",
						label: "Go to Transactions",
						icon: <Receipt size={16} />,
						group: "Navigate",
					},
					{
						id: "invoices",
						label: "Go to Invoices",
						icon: <FileText size={16} />,
						group: "Navigate",
					},
					{
						id: "reports",
						label: "Go to Reports",
						icon: <BarChart3 size={16} />,
						group: "Navigate",
					},
					{
						id: "add-transaction",
						label: "Add transaction",
						icon: <Plus size={16} />,
						group: "Actions",
						onSelect: () => {
							setCommandPaletteOpen(false);
							setAddTransactionOpen(true);
						},
					},
					{
						id: "new-invoice",
						label: "New invoice",
						icon: <ArrowRight size={16} />,
						group: "Actions",
						onSelect: () => {
							setCommandPaletteOpen(false);
							setNewInvoiceOpen(true);
						},
					},
				]}
			/>
		</SidebarProvider>
	);
}

export const Dashboard: Story = {
	name: "Financial Dashboard",
	render: () => (
		<BannerCenterProvider>
			<DashboardContent />
		</BannerCenterProvider>
	),
};
