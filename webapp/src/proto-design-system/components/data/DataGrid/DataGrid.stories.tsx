import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DataGrid, type DataGridColumn } from "./DataGrid";

interface User {
	id: number;
	name: string;
	email: string;
	role: string;
	status: "active" | "inactive";
	lastLogin: string;
}

const sampleData: User[] = Array.from({ length: 50 }, (_, i) => ({
	id: i + 1,
	name: `User ${i + 1}`,
	email: `user${i + 1}@example.com`,
	role: ["Admin", "Editor", "Viewer"][i % 3] as string,
	status: i % 4 === 0 ? "inactive" : "active",
	lastLogin: new Date(
		Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
	).toLocaleDateString(),
}));

const columns: DataGridColumn<User>[] = [
	{ id: "name", header: "Name", cell: (row) => row.name, sortable: true },
	{ id: "email", header: "Email", cell: (row) => row.email, sortable: true },
	{ id: "role", header: "Role", cell: (row) => row.role, sortable: true },
	{
		id: "status",
		header: "Status",
		cell: (row) => (
			<span
				style={{
					padding: "0.25rem 0.5rem",
					borderRadius: "var(--radius-full)",
					fontSize: "var(--font-size-xs)",
					fontWeight: 500,
					background:
						row.status === "active"
							? "var(--color-success-100)"
							: "var(--color-base-100)",
					color:
						row.status === "active"
							? "var(--color-success)"
							: "var(--color-muted)",
				}}
			>
				{row.status}
			</span>
		),
		sortable: true,
		sortFn: (a, b) => a.status.localeCompare(b.status),
	},
	{
		id: "lastLogin",
		header: "Last Login",
		cell: (row) => row.lastLogin,
		align: "right",
	},
];

const meta: Meta<typeof DataGrid<User>> = {
	title: "Data/DataGrid",
	component: DataGrid,
	parameters: {
		layout: "padded",
	},
};

export default meta;
type Story = StoryObj<typeof DataGrid<User>>;

export const Default: Story = {
	render: () => (
		<DataGrid
			data={sampleData.slice(0, 5)}
			columns={columns}
			getRowId={(row) => row.id}
		/>
	),
};

export const WithPagination: Story = {
	render: () => (
		<DataGrid
			data={sampleData}
			columns={columns}
			getRowId={(row) => row.id}
			pagination
			pageSize={10}
		/>
	),
};

export const WithSelection: Story = {
	render: () => {
		const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
			new Set(),
		);

		return (
			<div>
				<p style={{ marginBottom: "1rem", color: "var(--color-muted)" }}>
					Selected: {selectedIds.size} items
				</p>
				<DataGrid
					data={sampleData.slice(0, 10)}
					columns={columns}
					getRowId={(row) => row.id}
					selectable
					selectedIds={selectedIds}
					onSelectionChange={setSelectedIds}
				/>
			</div>
		);
	},
};

export const ClickableRows: Story = {
	render: () => (
		<DataGrid
			data={sampleData.slice(0, 5)}
			columns={columns}
			getRowId={(row) => row.id}
			onRowClick={(row) => alert(`Clicked: ${row.name}`)}
		/>
	),
};

export const Loading: Story = {
	render: () => (
		<DataGrid
			data={sampleData.slice(0, 5)}
			columns={columns}
			getRowId={(row) => row.id}
			loading
			loadingMessage="Fetching users..."
		/>
	),
};

export const EmptyState: Story = {
	render: () => (
		<DataGrid
			data={[]}
			columns={columns}
			getRowId={(row) => row.id}
			emptyState={
				<div style={{ padding: "2rem", textAlign: "center" }}>
					<p
						style={{
							fontSize: "var(--font-size-lg)",
							fontWeight: 500,
							marginBottom: "0.5rem",
						}}
					>
						No users found
					</p>
					<p style={{ color: "var(--color-muted)" }}>
						Try adjusting your search or filters.
					</p>
				</div>
			}
		/>
	),
};

export const FullFeatured: Story = {
	render: () => {
		const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
			new Set(),
		);

		return (
			<div>
				<div
					style={{
						marginBottom: "1rem",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<h2 style={{ margin: 0 }}>Users</h2>
					<span
						style={{
							color: "var(--color-muted)",
							fontSize: "var(--font-size-sm)",
						}}
					>
						{selectedIds.size > 0
							? `${selectedIds.size} selected`
							: `${sampleData.length} total`}
					</span>
				</div>
				<DataGrid
					data={sampleData}
					columns={columns}
					getRowId={(row) => row.id}
					pagination
					pageSize={10}
					selectable
					selectedIds={selectedIds}
					onSelectionChange={setSelectedIds}
					onRowClick={(row) => console.log("Clicked:", row)}
				/>
			</div>
		);
	},
};

export const CustomColumns: Story = {
	render: () => {
		const customColumns: DataGridColumn<User>[] = [
			{
				id: "user",
				header: "User",
				cell: (row) => (
					<div
						style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
					>
						<div
							style={{
								width: "32px",
								height: "32px",
								borderRadius: "var(--radius-full)",
								background: "var(--color-primary)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "var(--color-primary-content)",
								fontSize: "var(--font-size-sm)",
								fontWeight: 500,
							}}
						>
							{row.name.charAt(0)}
						</div>
						<div>
							<div style={{ fontWeight: 500 }}>{row.name}</div>
							<div
								style={{
									fontSize: "var(--font-size-xs)",
									color: "var(--color-muted)",
								}}
							>
								{row.email}
							</div>
						</div>
					</div>
				),
				sortable: true,
				sortFn: (a, b) => a.name.localeCompare(b.name),
			},
			{ id: "role", header: "Role", cell: (row) => row.role, width: 120 },
			{
				id: "status",
				header: "Status",
				cell: (row) => (
					<span
						style={{
							padding: "0.25rem 0.5rem",
							borderRadius: "var(--radius-full)",
							fontSize: "var(--font-size-xs)",
							fontWeight: 500,
							background:
								row.status === "active"
									? "var(--color-success-100)"
									: "var(--color-base-100)",
							color:
								row.status === "active"
									? "var(--color-success)"
									: "var(--color-muted)",
						}}
					>
						{row.status}
					</span>
				),
				width: 100,
				align: "center",
			},
			{
				id: "actions",
				header: "",
				cell: () => (
					<button
						type="button"
						style={{
							background: "none",
							border: "none",
							color: "var(--color-primary)",
							cursor: "pointer",
							fontSize: "var(--font-size-sm)",
						}}
					>
						Edit
					</button>
				),
				width: 60,
				align: "right",
			},
		];

		return (
			<DataGrid
				data={sampleData.slice(0, 5)}
				columns={customColumns}
				getRowId={(row) => row.id}
			/>
		);
	},
};
