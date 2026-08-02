import type { Meta, StoryObj } from "@storybook/react-vite";
import { DataTable } from "./DataTable";

// ============================================================================
// Sample data
// ============================================================================

interface Person {
	id: string;
	name: string;
	email: string;
	role: string;
	status: "active" | "pending" | "revoked";
}

const PEOPLE: Person[] = [
	{
		id: "1",
		name: "Alice Chen",
		email: "alice@tickuptoks.com",
		role: "Admin",
		status: "active",
	},
	{
		id: "2",
		name: "Bob Smith",
		email: "bob@tickuptoks.com",
		role: "Editor",
		status: "active",
	},
	{
		id: "3",
		name: "carol@tickuptoks.com",
		email: "carol@tickuptoks.com",
		role: "Viewer",
		status: "pending",
	},
	{
		id: "4",
		name: "Dave Johnson",
		email: "dave@tickuptoks.com",
		role: "Viewer",
		status: "revoked",
	},
];

const STATUS_COLORS: Record<Person["status"], string> = {
	active: "var(--color-success)",
	pending: "var(--color-warning)",
	revoked: "var(--color-base-content-secondary)",
};

// ============================================================================
// Meta
// ============================================================================

const meta = {
	title: "Design System/Data/DataTable",
	component: DataTable<Person>,
	parameters: {
		layout: "padded",
	},
} satisfies Meta<typeof DataTable<Person>>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Stories
// ============================================================================

export const Default: Story = {
	args: {
		columns: [
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
				cell: (row) => (
					<span style={{ color: STATUS_COLORS[row.status] }}>{row.status}</span>
				),
				width: "100px",
			},
		],
		data: PEOPLE,
		getRowKey: (row) => row.id,
	},
};

export const Compact: Story = {
	args: {
		...Default.args,
		density: "compact",
	},
};

export const Clickable: Story = {
	args: {
		...Default.args,
		onRowClick: (row) => alert(`Clicked: ${row.name}`),
	},
};

export const Loading: Story = {
	args: {
		...Default.args,
		loading: true,
		loadingRowCount: 4,
	},
};

export const Empty: Story = {
	args: {
		...Default.args,
		data: [],
		emptyState: (
			<span
				style={{
					fontSize: "var(--font-size-sm)",
					color: "var(--color-base-content-secondary)",
				}}
			>
				No team members yet. Invite your first member to get started.
			</span>
		),
	},
};
