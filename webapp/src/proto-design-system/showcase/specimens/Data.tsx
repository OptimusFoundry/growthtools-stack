// Data specimen — full variant matrices for the DATA category components.
// Mirrors specimens/Primitives.tsx: shared <Spec>/<SpecRow>/<SpecItem> framework,
// rows driven off each component's real props (read from its .types.ts /
// .tsx), sample data shaped after each component's .stories.tsx. Wide demos
// (tables, grids, lists) use SpecRow's `column` prop and SpecItem's `grow`
// prop so they take the full row width instead of wrapping like chips.

import {
	Archive,
	ChevronDown,
	ChevronRight,
	DollarSign,
	File,
	FileQuestion,
	FileText,
	Folder,
	Inbox,
	Mail,
	Pause,
	Play,
	Plus,
	Search,
	Settings,
	ShoppingCart,
	Star,
	TrendingUp,
	Upload,
	User,
	Users,
} from "lucide-react";
import { Fragment, useState } from "react";
import {
	DataGrid,
	type DataGridColumn,
} from "../../components/data/DataGrid/DataGrid";
import {
	DataTable,
	type DataTableColumn,
} from "../../components/data/DataTable/DataTable";
import { EmptyState } from "../../components/data/EmptyState/EmptyState";
import {
	type FilterTabItem,
	FilterTabs,
} from "../../components/data/FilterTabs/FilterTabs";
import { List, ListGroup, ListItem } from "../../components/data/List/List";
import { StatCard } from "../../components/data/StatCard/StatCard";
import {
	type SortDirection,
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableExpandedRow,
	TableHead,
	TableHeader,
	TableRow,
} from "../../components/data/Table/Table";
import { Checkbox } from "../../components/forms/Checkbox/Checkbox";
import { Stack } from "../../components/layout/Stack/Stack";
import { Avatar } from "../../components/primitives/Avatar/Avatar";
import { Badge } from "../../components/primitives/Badge/Badge";
import type { BadgeVariant } from "../../components/primitives/Badge/Badge.types";
import { Button } from "../../components/primitives/Button/Button";
import { Text } from "../../components/primitives/Text/Text";
import { Spec, SpecItem, SpecRow } from "../Spec";

// ============================================================================
// Shared sample data
// ============================================================================

type PersonStatus = "active" | "pending" | "inactive";

interface Person {
	id: number;
	name: string;
	email: string;
	role: string;
	status: PersonStatus;
}

const STATUS_BADGE_VARIANT: Record<PersonStatus, BadgeVariant> = {
	active: "success",
	pending: "warning",
	inactive: "outline",
};

const PEOPLE: Person[] = [
	{
		id: 1,
		name: "Alice Chen",
		email: "alice@acme.io",
		role: "Admin",
		status: "active",
	},
	{
		id: 2,
		name: "Bilal Okafor",
		email: "bilal@acme.io",
		role: "Editor",
		status: "active",
	},
	{
		id: 3,
		name: "Carmen Reyes",
		email: "carmen@acme.io",
		role: "Viewer",
		status: "pending",
	},
	{
		id: 4,
		name: "Derek Novak",
		email: "derek@acme.io",
		role: "Viewer",
		status: "inactive",
	},
	{
		id: 5,
		name: "Elena Larsen",
		email: "elena@acme.io",
		role: "Editor",
		status: "active",
	},
];

// A larger directory for pagination demos — generated from rotating name
// pools so it reads as real data instead of "User 1, User 2, ...".
const FIRST_NAMES = [
	"Alice",
	"Bilal",
	"Carmen",
	"Derek",
	"Elena",
	"Farid",
	"Grace",
	"Hiro",
	"Inés",
	"Jamal",
	"Keiko",
	"Liam",
	"Maya",
	"Noah",
	"Olu",
	"Priya",
];
const LAST_NAMES = [
	"Chen",
	"Okafor",
	"Reyes",
	"Novak",
	"Larsen",
	"Haddad",
	"Petrov",
	"Singh",
];
const ROLE_CYCLE = ["Admin", "Editor", "Viewer"];
const STATUS_CYCLE: PersonStatus[] = [
	"active",
	"active",
	"active",
	"pending",
	"inactive",
];

const TEAM_DIRECTORY: Person[] = Array.from({ length: 24 }, (_, i) => {
	const first = FIRST_NAMES[i % FIRST_NAMES.length];
	const last = LAST_NAMES[(i * 5) % LAST_NAMES.length];
	return {
		id: 100 + i,
		name: `${first} ${last}`,
		email: `${first.toLowerCase()}.${last.toLowerCase()}@acme.io`,
		role: ROLE_CYCLE[i % ROLE_CYCLE.length],
		status: STATUS_CYCLE[i % STATUS_CYCLE.length],
	};
});

interface Campaign {
	id: number;
	name: string;
	status: PersonStatus;
}

const CAMPAIGNS: Campaign[] = [
	{ id: 1, name: "Early Access Beta", status: "active" },
	{ id: 2, name: "Product Hunt Launch", status: "pending" },
	{ id: 3, name: "Summer Waitlist", status: "inactive" },
	{ id: 4, name: "Newsletter Signups", status: "active" },
];

function statusBadge(status: PersonStatus) {
	return (
		<Badge variant={STATUS_BADGE_VARIANT[status]} size="sm">
			{status}
		</Badge>
	);
}

function initialsOf(name: string): string {
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

// ── Table helpers ────────────────────────────────────────────────────────

function peopleTableHeader() {
	return (
		<TableRow>
			<TableHead>Name</TableHead>
			<TableHead>Email</TableHead>
			<TableHead>Role</TableHead>
			<TableHead align="right">Status</TableHead>
		</TableRow>
	);
}

function peopleTableHeaderCompact() {
	return (
		<TableRow>
			<TableHead>Name</TableHead>
			<TableHead>Email</TableHead>
		</TableRow>
	);
}

function peopleRows(people: Person[]) {
	return people.map((p) => (
		<TableRow key={p.id}>
			<TableCell>{p.name}</TableCell>
			<TableCell>{p.email}</TableCell>
			<TableCell>{p.role}</TableCell>
			<TableCell align="right">{statusBadge(p.status)}</TableCell>
		</TableRow>
	));
}

function peopleRowsCompact(people: Person[]) {
	return people.map((p) => (
		<TableRow key={p.id}>
			<TableCell>{p.name}</TableCell>
			<TableCell>{p.email}</TableCell>
		</TableRow>
	));
}

// ── DataGrid columns ─────────────────────────────────────────────────────

const dataGridColumns: DataGridColumn<Person>[] = [
	{
		id: "name",
		header: "Member",
		cell: (row) => (
			<Stack direction="row" align="center" gap="sm">
				<Avatar initials={initialsOf(row.name)} size="sm" />
				<Stack direction="column" gap="0">
					<Text as="span" size="sm" weight="medium">
						{row.name}
					</Text>
					<Text as="span" size="xs" color="muted">
						{row.email}
					</Text>
				</Stack>
			</Stack>
		),
		sortable: true,
		sortFn: (a, b) => a.name.localeCompare(b.name),
	},
	{
		id: "role",
		header: "Role",
		cell: (row) => row.role,
		sortable: true,
		width: 110,
	},
	{
		id: "status",
		header: "Status",
		cell: (row) => statusBadge(row.status),
		sortable: true,
		sortFn: (a, b) => a.status.localeCompare(b.status),
		align: "center",
		width: 110,
	},
];

// ── DataTable columns ────────────────────────────────────────────────────

const dataTableColumns: DataTableColumn<Person>[] = [
	{
		id: "name",
		header: "Name",
		cell: (row) => row.name,
		width: "minmax(0, 2fr)",
	},
	{
		id: "email",
		header: "Email",
		cell: (row) => row.email,
		width: "minmax(0, 2fr)",
	},
	{
		id: "role",
		header: "Role",
		cell: (row) => row.role,
		width: "minmax(0, 1fr)",
	},
	{
		id: "status",
		header: "Status",
		cell: (row) => statusBadge(row.status),
		width: "100px",
		align: "right",
	},
];

// ── FilterTabs item sets ─────────────────────────────────────────────────

const STATUS_FILTER_ITEMS: FilterTabItem[] = [
	{ id: "all", label: "All", count: PEOPLE.length },
	{
		id: "active",
		label: "Active",
		count: PEOPLE.filter((p) => p.status === "active").length,
	},
	{
		id: "pending",
		label: "Pending",
		count: PEOPLE.filter((p) => p.status === "pending").length,
	},
	{
		id: "inactive",
		label: "Inactive",
		count: PEOPLE.filter((p) => p.status === "inactive").length,
	},
];

const FILTER_ITEMS_NO_COUNT: FilterTabItem[] = STATUS_FILTER_ITEMS.map(
	({ id, label }) => ({ id, label }),
);

const FILTER_ICON_ITEMS: FilterTabItem[] = [
	{ id: "all", label: "All", count: 12, icon: <FileText size={14} /> },
	{ id: "active", label: "Active", count: 4, icon: <Play size={14} /> },
	{ id: "pending", label: "Paused", count: 3, icon: <Pause size={14} /> },
	{ id: "inactive", label: "Archived", count: 5, icon: <Archive size={14} /> },
];

export function DataSpecimens() {
	// Table — sortable headers
	const [sortCol, setSortCol] = useState<"name" | "email" | "role">("name");
	const [sortDir, setSortDir] = useState<SortDirection>("asc");
	const toggleSort = (column: "name" | "email" | "role") => {
		if (sortCol === column) {
			setSortDir(sortDir === "asc" ? "desc" : "asc");
		} else {
			setSortCol(column);
			setSortDir("asc");
		}
	};
	const sortedPeople = [...PEOPLE].sort((a, b) => {
		const cmp = String(a[sortCol]).localeCompare(String(b[sortCol]));
		return sortDir === "asc" ? cmp : -cmp;
	});

	// Table — selectable rows
	const [tableSelected, setTableSelected] = useState<Set<number>>(new Set());
	const toggleTableRow = (id: number) => {
		setTableSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};
	const allTableSelected = tableSelected.size === PEOPLE.length;
	const someTableSelected = tableSelected.size > 0 && !allTableSelected;

	// Table — expandable rows
	const [tableExpanded, setTableExpanded] = useState<number | null>(
		PEOPLE[0].id,
	);
	const toggleExpand = (id: number) =>
		setTableExpanded((cur) => (cur === id ? null : id));

	// DataGrid — selectable rows
	const [dataGridSelected, setDataGridSelected] = useState<
		Set<string | number>
	>(new Set());

	// FilterTabs — controlled instances
	const [filterSm, setFilterSm] = useState("all");
	const [filterMd, setFilterMd] = useState("all");
	const [filterLg, setFilterLg] = useState("all");
	const [filterIcons, setFilterIcons] = useState("all");
	const [filterNoCounts, setFilterNoCounts] = useState("all");
	const [filterShowcase, setFilterShowcase] = useState("all");

	// List — interactive selection
	const [listSelected, setListSelected] = useState("inbox");

	return (
		<>
			<Spec
				name="DataGrid"
				description="Column-config table with sortable headers, pagination, row selection, and click handling. Generic over row type T."
			>
				<SpecRow label="Features" column>
					<SpecItem label="default" grow>
						<DataGrid
							data={PEOPLE}
							columns={dataGridColumns}
							getRowId={(row) => row.id}
						/>
					</SpecItem>
					<SpecItem label="pagination (pageSize=8)" grow>
						<DataGrid
							data={TEAM_DIRECTORY}
							columns={dataGridColumns}
							getRowId={(row) => row.id}
							pagination
							pageSize={8}
						/>
					</SpecItem>
					<SpecItem label="selectable" grow>
						<Stack direction="column" gap="sm">
							<Text as="span" size="sm" color="muted">
								{dataGridSelected.size} of {PEOPLE.length} selected
							</Text>
							<DataGrid
								data={PEOPLE}
								columns={dataGridColumns}
								getRowId={(row) => row.id}
								selectable
								selectedIds={dataGridSelected}
								onSelectionChange={setDataGridSelected}
							/>
						</Stack>
					</SpecItem>
				</SpecRow>
				<SpecRow label="States" column>
					<SpecItem label="loading" grow>
						<DataGrid
							data={PEOPLE}
							columns={dataGridColumns}
							getRowId={(row) => row.id}
							loading
							loadingMessage="Fetching members…"
						/>
					</SpecItem>
					<SpecItem label="empty" grow>
						<DataGrid
							data={[]}
							columns={dataGridColumns}
							getRowId={(row) => row.id}
							emptyState={
								<EmptyState
									size="sm"
									title="No members found"
									description="Try a different filter, or invite your first teammate."
									icon={<Users />}
									action={
										<Button size="sm" variant="primary" leftIcon={<Plus />}>
											Invite member
										</Button>
									}
								/>
							}
						/>
					</SpecItem>
					<SpecItem label="clickable rows" grow>
						<DataGrid
							data={PEOPLE}
							columns={dataGridColumns}
							getRowId={(row) => row.id}
							onRowClick={(row) => console.log("Row clicked", row.name)}
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="DataTable"
				description="Div-based CSS grid table for hairline row lists. Comfortable/compact density, skeleton loading, empty state, optional clickable rows."
			>
				<SpecRow label="Density" column>
					<SpecItem label="comfortable" grow>
						<DataTable
							columns={dataTableColumns}
							data={PEOPLE}
							getRowKey={(row) => String(row.id)}
							density="comfortable"
						/>
					</SpecItem>
					<SpecItem label="compact" grow>
						<DataTable
							columns={dataTableColumns}
							data={PEOPLE}
							getRowKey={(row) => String(row.id)}
							density="compact"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="States" column>
					<SpecItem label="loading" grow>
						<DataTable
							columns={dataTableColumns}
							data={PEOPLE}
							getRowKey={(row) => String(row.id)}
							loading
							loadingRowCount={4}
						/>
					</SpecItem>
					<SpecItem label="empty" grow>
						<DataTable
							columns={dataTableColumns}
							data={[]}
							getRowKey={(row) => String(row.id)}
							emptyState={
								<EmptyState
									size="sm"
									title="No team members yet"
									description="Invite your first member to get started."
									icon={<Inbox />}
								/>
							}
						/>
					</SpecItem>
					<SpecItem label="clickable rows" grow>
						<DataTable
							columns={dataTableColumns}
							data={PEOPLE}
							getRowKey={(row) => String(row.id)}
							onRowClick={(row) => console.log("Row clicked", row.name)}
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="EmptyState"
				description="No-data placeholder with icon, title, description, and up to two actions. Three sizes."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm">
						<EmptyState
							size="sm"
							title="No items"
							description="Add items to get started."
							icon={<Inbox />}
						/>
					</SpecItem>
					<SpecItem label="md">
						<EmptyState
							size="md"
							title="No messages"
							description="You don't have any messages yet."
							icon={<Inbox />}
						/>
					</SpecItem>
					<SpecItem label="lg">
						<EmptyState
							size="lg"
							title="Welcome to your dashboard"
							description="This is where you'll see all your important data and insights."
							icon={<FileQuestion />}
							action={<Button variant="primary">Get started</Button>}
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Actions">
					<SpecItem label="primary action">
						<EmptyState
							title="No projects"
							description="Get started by creating your first project."
							icon={<FileQuestion />}
							action={
								<Button variant="primary" leftIcon={<Plus />}>
									Create project
								</Button>
							}
						/>
					</SpecItem>
					<SpecItem label="primary + secondary">
						<EmptyState
							title="No team members"
							description="Invite your colleagues to collaborate on this project."
							icon={<Users />}
							action={<Button variant="primary">Invite members</Button>}
							secondaryAction={<Button variant="outline">Learn more</Button>}
						/>
					</SpecItem>
					<SpecItem label="no icon">
						<EmptyState
							title="Simple empty state"
							description="Sometimes you just need text without an icon."
							icon={null}
							action={<Button variant="primary">Take action</Button>}
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Use cases">
					<SpecItem label="search no results">
						<EmptyState
							title="No results found"
							description="Try adjusting your search or filter to find what you're looking for."
							icon={<Search />}
							action={<Button variant="outline">Clear filters</Button>}
						/>
					</SpecItem>
					<SpecItem label="file upload">
						<EmptyState
							title="No files uploaded"
							description="Drag and drop files here, or click to browse."
							icon={<Upload />}
							action={<Button variant="primary">Browse files</Button>}
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="FilterTabs"
				description="Controlled pill-tab filter — the active tab renders primary, idle tabs render outlined ghosts. Optional counts and leading icons."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm">
						<FilterTabs
							items={STATUS_FILTER_ITEMS}
							value={filterSm}
							onChange={setFilterSm}
							size="sm"
							aria-label="Filter by status (small)"
						/>
					</SpecItem>
					<SpecItem label="md">
						<FilterTabs
							items={STATUS_FILTER_ITEMS}
							value={filterMd}
							onChange={setFilterMd}
							size="md"
							aria-label="Filter by status (medium)"
						/>
					</SpecItem>
					<SpecItem label="lg">
						<FilterTabs
							items={STATUS_FILTER_ITEMS}
							value={filterLg}
							onChange={setFilterLg}
							size="lg"
							aria-label="Filter by status (large)"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="leading icons">
						<FilterTabs
							items={FILTER_ICON_ITEMS}
							value={filterIcons}
							onChange={setFilterIcons}
							aria-label="Filter by status with icons"
						/>
					</SpecItem>
					<SpecItem label="without counts">
						<FilterTabs
							items={FILTER_ITEMS_NO_COUNT}
							value={filterNoCounts}
							onChange={setFilterNoCounts}
							aria-label="Filter by status without counts"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Showcase" column>
					<SpecItem label="controlled filter driving a list" grow>
						<Stack direction="column" gap="md">
							<FilterTabs
								items={STATUS_FILTER_ITEMS}
								value={filterShowcase}
								onChange={setFilterShowcase}
								aria-label="Filter campaigns by status"
							/>
							<List variant="divided">
								{CAMPAIGNS.filter(
									(c) =>
										filterShowcase === "all" || c.status === filterShowcase,
								).map((c) => (
									<ListItem key={c.id} trailing={statusBadge(c.status)}>
										{c.name}
									</ListItem>
								))}
							</List>
						</Stack>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="List"
				description="Vertical item collections — ListItem/ListGroup compound parts. Three variants, three sizes, leading/trailing content, grouped sections."
			>
				<SpecRow label="Variants">
					<SpecItem label="default" grow>
						<List>
							<ListItem leading={<Mail />}>Messages</ListItem>
							<ListItem leading={<User />}>Profile</ListItem>
							<ListItem leading={<Settings />}>Settings</ListItem>
						</List>
					</SpecItem>
					<SpecItem label="divided" grow>
						<List variant="divided">
							<ListItem leading={<Mail />}>Messages</ListItem>
							<ListItem leading={<User />}>Profile</ListItem>
							<ListItem leading={<Settings />}>Settings</ListItem>
						</List>
					</SpecItem>
					<SpecItem label="bordered" grow>
						<List variant="bordered">
							<ListItem leading={<Mail />}>Messages</ListItem>
							<ListItem leading={<User />}>Profile</ListItem>
							<ListItem leading={<Settings />}>Settings</ListItem>
						</List>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Sizes">
					<SpecItem label="sm" grow>
						<List size="sm" variant="bordered">
							<ListItem leading={<File />}>Small item</ListItem>
							<ListItem leading={<File />}>Another item</ListItem>
						</List>
					</SpecItem>
					<SpecItem label="md" grow>
						<List size="md" variant="bordered">
							<ListItem leading={<File />}>Medium item</ListItem>
							<ListItem leading={<File />}>Another item</ListItem>
						</List>
					</SpecItem>
					<SpecItem label="lg" grow>
						<List size="lg" variant="bordered">
							<ListItem leading={<File />}>Large item</ListItem>
							<ListItem leading={<File />}>Another item</ListItem>
						</List>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Content">
					<SpecItem label="leading + trailing" grow>
						<List variant="bordered">
							<ListItem
								leading={<File />}
								trailing={<ChevronRight size={16} />}
							>
								Document.pdf
							</ListItem>
							<ListItem
								leading={<Folder />}
								trailing={<ChevronRight size={16} />}
							>
								Projects
							</ListItem>
						</List>
					</SpecItem>
					<SpecItem label="secondary text" grow>
						<List variant="divided">
							{PEOPLE.slice(0, 3).map((p) => (
								<ListItem
									key={p.id}
									leading={<Avatar initials={initialsOf(p.name)} size="sm" />}
									secondary={p.email}
								>
									{p.name}
								</ListItem>
							))}
						</List>
					</SpecItem>
					<SpecItem label="groups" grow>
						<List variant="divided">
							<ListGroup label="Favorites">
								<ListItem leading={<Star />}>Project Alpha</ListItem>
								<ListItem leading={<Star />}>Design System</ListItem>
							</ListGroup>
							<ListGroup label="Recent">
								<ListItem leading={<File />}>Quarterly report</ListItem>
							</ListGroup>
						</List>
					</SpecItem>
				</SpecRow>
				<SpecRow label="States">
					<SpecItem label="selected + disabled" grow>
						<List variant="bordered">
							<ListItem
								leading={<Mail />}
								selected={listSelected === "inbox"}
								onClick={() => setListSelected("inbox")}
							>
								Inbox
							</ListItem>
							<ListItem
								leading={<Star />}
								selected={listSelected === "starred"}
								onClick={() => setListSelected("starred")}
							>
								Starred
							</ListItem>
							<ListItem
								leading={<Settings />}
								disabled
								onClick={() => setListSelected("settings")}
							>
								Disabled item
							</ListItem>
						</List>
					</SpecItem>
					<SpecItem label="animate" grow>
						<List animate variant="bordered">
							<ListItem leading={<Mail />}>Messages</ListItem>
							<ListItem leading={<User />}>Profile</ListItem>
							<ListItem leading={<Star />}>Favorites</ListItem>
						</List>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="StatCard"
				description="Metric display cards — three visual variants, trend indicators, optional icon, previous-value comparison, and animated count-up."
			>
				<SpecRow label="Variants">
					<SpecItem label="default" grow>
						<StatCard
							variant="default"
							label="Total Revenue"
							value="$45,231.89"
							trend="up"
							trendValue="+12.5%"
							description="vs last month"
							icon={<DollarSign />}
						/>
					</SpecItem>
					<SpecItem label="outlined" grow>
						<StatCard
							variant="outlined"
							label="Orders"
							value="456"
							trend="up"
							trendValue="+23"
							description="this week"
							icon={<ShoppingCart />}
						/>
					</SpecItem>
					<SpecItem label="filled" grow>
						<StatCard
							variant="filled"
							label="Conversion Rate"
							value="3.24%"
							trend="up"
							trendValue="+0.5%"
							description="vs last quarter"
							icon={<TrendingUp />}
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Trend">
					<SpecItem label="up" grow>
						<StatCard
							label="Active Users"
							value="2,350"
							trend="up"
							trendValue="+180"
							description="new this week"
							icon={<Users />}
						/>
					</SpecItem>
					<SpecItem label="down" grow>
						<StatCard
							label="Bounce Rate"
							value="42.5%"
							trend="down"
							trendValue="-4.3%"
							description="vs last week"
						/>
					</SpecItem>
					<SpecItem label="neutral" grow>
						<StatCard
							label="Active Sessions"
							value="1,234"
							trend="neutral"
							trendValue="0%"
							description="no change"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="previousValue" grow>
						<StatCard
							label="Monthly Sales"
							value="$12,450"
							previousValue="$11,200"
							trend="up"
							trendValue="+11.2%"
						/>
					</SpecItem>
					<SpecItem label="numericValue + formatValue" grow>
						<StatCard
							label="Total Revenue"
							value="$45,231"
							numericValue={45231}
							formatValue={(v) => `$${v.toLocaleString()}`}
							trend="up"
							trendValue="+20.1%"
							description="count-up on mount"
							icon={<DollarSign />}
						/>
					</SpecItem>
					<SpecItem label="clickable" grow>
						<StatCard
							label="Revenue"
							value="$89,432"
							trend="up"
							trendValue="+8.2%"
							description="Click for details"
							icon={<DollarSign />}
							onClick={() => console.log("StatCard clicked")}
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Table"
				description="Compound table primitive — compose TableHeader/TableBody/TableRow/TableHead/TableCell directly. Three sizes, three variants, sortable headers, selectable and expandable rows."
			>
				<SpecRow label="Variants" column>
					<SpecItem label="default" grow>
						<Table>
							<TableHeader>{peopleTableHeader()}</TableHeader>
							<TableBody>{peopleRows(PEOPLE)}</TableBody>
						</Table>
					</SpecItem>
					<SpecItem label="striped" grow>
						<Table variant="striped">
							<TableHeader>{peopleTableHeader()}</TableHeader>
							<TableBody>{peopleRows(PEOPLE)}</TableBody>
						</Table>
					</SpecItem>
					<SpecItem label="bordered" grow>
						<Table variant="bordered">
							<TableHeader>{peopleTableHeader()}</TableHeader>
							<TableBody>{peopleRows(PEOPLE)}</TableBody>
						</Table>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Sizes" column>
					<SpecItem label="sm" grow>
						<Table size="sm">
							<TableHeader>{peopleTableHeaderCompact()}</TableHeader>
							<TableBody>{peopleRowsCompact(PEOPLE.slice(0, 3))}</TableBody>
						</Table>
					</SpecItem>
					<SpecItem label="md" grow>
						<Table size="md">
							<TableHeader>{peopleTableHeaderCompact()}</TableHeader>
							<TableBody>{peopleRowsCompact(PEOPLE.slice(0, 3))}</TableBody>
						</Table>
					</SpecItem>
					<SpecItem label="lg" grow>
						<Table size="lg">
							<TableHeader>{peopleTableHeaderCompact()}</TableHeader>
							<TableBody>{peopleRowsCompact(PEOPLE.slice(0, 3))}</TableBody>
						</Table>
					</SpecItem>
				</SpecRow>
				<SpecRow label="States" column>
					<SpecItem label="sortable" grow>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead
										sortDirection={sortCol === "name" ? sortDir : null}
										onSort={() => toggleSort("name")}
									>
										Name
									</TableHead>
									<TableHead
										sortDirection={sortCol === "email" ? sortDir : null}
										onSort={() => toggleSort("email")}
									>
										Email
									</TableHead>
									<TableHead
										sortDirection={sortCol === "role" ? sortDir : null}
										onSort={() => toggleSort("role")}
									>
										Role
									</TableHead>
									<TableHead align="right">Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>{peopleRows(sortedPeople)}</TableBody>
						</Table>
					</SpecItem>
					<SpecItem label="selectable" grow>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead narrow>
										<Checkbox
											size="sm"
											checked={allTableSelected}
											indeterminate={someTableSelected}
											onChange={() => {
												setTableSelected(
													allTableSelected
														? new Set()
														: new Set(PEOPLE.map((p) => p.id)),
												);
											}}
											aria-label="Select all rows"
										/>
									</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Role</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{PEOPLE.map((p) => (
									<TableRow
										key={p.id}
										selected={tableSelected.has(p.id)}
										onClick={() => toggleTableRow(p.id)}
									>
										<TableCell>
											<Checkbox
												size="sm"
												checked={tableSelected.has(p.id)}
												onChange={() => toggleTableRow(p.id)}
												onClick={(e) => e.stopPropagation()}
												aria-label={`Select ${p.name}`}
											/>
										</TableCell>
										<TableCell>{p.name}</TableCell>
										<TableCell>{p.email}</TableCell>
										<TableCell>{p.role}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</SpecItem>
					<SpecItem label="expandable" grow>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead narrow />
									<TableHead>Name</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Role</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{PEOPLE.map((p) => {
									const isExpanded = tableExpanded === p.id;
									return (
										<Fragment key={p.id}>
											<TableRow
												expandable
												expanded={isExpanded}
												onClick={() => toggleExpand(p.id)}
											>
												<TableCell>
													{isExpanded ? (
														<ChevronDown size={16} />
													) : (
														<ChevronRight size={16} />
													)}
												</TableCell>
												<TableCell>{p.name}</TableCell>
												<TableCell>{p.email}</TableCell>
												<TableCell>{p.role}</TableCell>
											</TableRow>
											<TableExpandedRow colSpan={4} expanded={isExpanded}>
												<Text as="p" size="sm" color="muted">
													{p.role} • {p.status} — has access to billing and team
													settings in the Acme workspace.
												</Text>
											</TableExpandedRow>
										</Fragment>
									);
								})}
							</TableBody>
						</Table>
					</SpecItem>
					<SpecItem label="loading" grow>
						<Table loading loadingMessage="Loading team…">
							<TableHeader>{peopleTableHeader()}</TableHeader>
							<TableBody>{peopleRows(PEOPLE.slice(0, 3))}</TableBody>
						</Table>
					</SpecItem>
					<SpecItem label="with caption" grow>
						<Table>
							<TableCaption>
								A list of members in your organization
							</TableCaption>
							<TableHeader>{peopleTableHeaderCompact()}</TableHeader>
							<TableBody>{peopleRowsCompact(PEOPLE.slice(0, 3))}</TableBody>
						</Table>
					</SpecItem>
				</SpecRow>
			</Spec>
		</>
	);
}
