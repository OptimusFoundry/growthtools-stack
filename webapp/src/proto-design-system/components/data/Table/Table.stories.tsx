import type { Meta, StoryObj } from "@storybook/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "../../forms/Checkbox";
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
} from "./Table";

const meta: Meta<typeof Table> = {
	title: "Data/Table",
	component: Table,
	parameters: {
		layout: "padded",
	},
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
		variant: {
			control: "select",
			options: ["default", "striped", "bordered"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Table>;

const sampleData = [
	{
		id: 1,
		name: "John Doe",
		email: "john@example.com",
		role: "Admin",
		status: "Active",
	},
	{
		id: 2,
		name: "Jane Smith",
		email: "jane@example.com",
		role: "Editor",
		status: "Active",
	},
	{
		id: 3,
		name: "Bob Johnson",
		email: "bob@example.com",
		role: "Viewer",
		status: "Inactive",
	},
	{
		id: 4,
		name: "Alice Brown",
		email: "alice@example.com",
		role: "Editor",
		status: "Active",
	},
	{
		id: 5,
		name: "Charlie Wilson",
		email: "charlie@example.com",
		role: "Viewer",
		status: "Active",
	},
];

export const Default: Story = {
	render: (args) => (
		<Table {...args}>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Email</TableHead>
					<TableHead>Role</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{sampleData.map((row) => (
					<TableRow key={row.id}>
						<TableCell>{row.name}</TableCell>
						<TableCell>{row.email}</TableCell>
						<TableCell>{row.role}</TableCell>
						<TableCell>{row.status}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
};

export const Striped: Story = {
	render: () => (
		<Table variant="striped">
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Email</TableHead>
					<TableHead>Role</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{sampleData.map((row) => (
					<TableRow key={row.id}>
						<TableCell>{row.name}</TableCell>
						<TableCell>{row.email}</TableCell>
						<TableCell>{row.role}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
};

export const Bordered: Story = {
	render: () => (
		<Table variant="bordered">
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Email</TableHead>
					<TableHead>Role</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{sampleData.map((row) => (
					<TableRow key={row.id}>
						<TableCell>{row.name}</TableCell>
						<TableCell>{row.email}</TableCell>
						<TableCell>{row.role}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
};

export const WithSorting: Story = {
	render: () => {
		const [sortColumn, setSortColumn] = useState<string | null>("name");
		const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

		const handleSort = (column: string) => {
			if (sortColumn === column) {
				setSortDirection(
					sortDirection === "asc"
						? "desc"
						: sortDirection === "desc"
							? null
							: "asc",
				);
				if (sortDirection === "desc") setSortColumn(null);
			} else {
				setSortColumn(column);
				setSortDirection("asc");
			}
		};

		const sortedData = [...sampleData].sort((a, b) => {
			if (!sortColumn || !sortDirection) return 0;
			const aVal = a[sortColumn as keyof typeof a];
			const bVal = b[sortColumn as keyof typeof b];
			const comparison = String(aVal).localeCompare(String(bVal));
			return sortDirection === "asc" ? comparison : -comparison;
		});

		return (
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead
							sortDirection={sortColumn === "name" ? sortDirection : null}
							onSort={() => handleSort("name")}
						>
							Name
						</TableHead>
						<TableHead
							sortDirection={sortColumn === "email" ? sortDirection : null}
							onSort={() => handleSort("email")}
						>
							Email
						</TableHead>
						<TableHead
							sortDirection={sortColumn === "role" ? sortDirection : null}
							onSort={() => handleSort("role")}
						>
							Role
						</TableHead>
						<TableHead>Status</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sortedData.map((row) => (
						<TableRow key={row.id}>
							<TableCell>{row.name}</TableCell>
							<TableCell>{row.email}</TableCell>
							<TableCell>{row.role}</TableCell>
							<TableCell>{row.status}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	},
};

export const WithSelection: Story = {
	render: () => {
		const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

		const toggleSelection = (id: number) => {
			const newSelection = new Set(selectedIds);
			if (newSelection.has(id)) {
				newSelection.delete(id);
			} else {
				newSelection.add(id);
			}
			setSelectedIds(newSelection);
		};

		const allSelected = selectedIds.size === sampleData.length;
		const someSelected = selectedIds.size > 0 && !allSelected;

		return (
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead narrow>
							<Checkbox
								size="sm"
								checked={allSelected}
								indeterminate={someSelected}
								onChange={() => {
									if (allSelected) {
										setSelectedIds(new Set());
									} else {
										setSelectedIds(new Set(sampleData.map((r) => r.id)));
									}
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
					{sampleData.map((row) => (
						<TableRow
							key={row.id}
							selected={selectedIds.has(row.id)}
							onClick={() => toggleSelection(row.id)}
						>
							<TableCell>
								<Checkbox
									size="sm"
									checked={selectedIds.has(row.id)}
									onChange={() => toggleSelection(row.id)}
									onClick={(e) => e.stopPropagation()}
									aria-label={`Select ${row.name}`}
								/>
							</TableCell>
							<TableCell>{row.name}</TableCell>
							<TableCell>{row.email}</TableCell>
							<TableCell>{row.role}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	},
};

export const WithCaption: Story = {
	render: () => (
		<Table>
			<TableCaption>A list of users in your organization</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Email</TableHead>
					<TableHead>Role</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{sampleData.slice(0, 3).map((row) => (
					<TableRow key={row.id}>
						<TableCell>{row.name}</TableCell>
						<TableCell>{row.email}</TableCell>
						<TableCell>{row.role}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
			<div>
				<h3 style={{ marginBottom: "0.5rem" }}>Small</h3>
				<Table size="sm">
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Email</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sampleData.slice(0, 2).map((row) => (
							<TableRow key={row.id}>
								<TableCell>{row.name}</TableCell>
								<TableCell>{row.email}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
			<div>
				<h3 style={{ marginBottom: "0.5rem" }}>Medium (default)</h3>
				<Table size="md">
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Email</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sampleData.slice(0, 2).map((row) => (
							<TableRow key={row.id}>
								<TableCell>{row.name}</TableCell>
								<TableCell>{row.email}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
			<div>
				<h3 style={{ marginBottom: "0.5rem" }}>Large</h3>
				<Table size="lg">
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Email</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sampleData.slice(0, 2).map((row) => (
							<TableRow key={row.id}>
								<TableCell>{row.name}</TableCell>
								<TableCell>{row.email}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	),
};

export const WithAlignment: Story = {
	render: () => (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Product</TableHead>
					<TableHead align="center">Quantity</TableHead>
					<TableHead align="right">Price</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell>Widget A</TableCell>
					<TableCell align="center">10</TableCell>
					<TableCell align="right">$99.00</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>Widget B</TableCell>
					<TableCell align="center">25</TableCell>
					<TableCell align="right">$149.00</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>Widget C</TableCell>
					<TableCell align="center">5</TableCell>
					<TableCell align="right">$299.00</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	),
};

export const Loading: Story = {
	render: () => (
		<Table loading loadingMessage="Fetching data...">
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Email</TableHead>
					<TableHead>Role</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{sampleData.map((row) => (
					<TableRow key={row.id}>
						<TableCell>{row.name}</TableCell>
						<TableCell>{row.email}</TableCell>
						<TableCell>{row.role}</TableCell>
						<TableCell>{row.status}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
};

export const WithExpandableRows: Story = {
	render: () => {
		const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

		const toggleExpanded = (id: number) => {
			const newExpanded = new Set(expandedIds);
			if (newExpanded.has(id)) {
				newExpanded.delete(id);
			} else {
				newExpanded.add(id);
			}
			setExpandedIds(newExpanded);
		};

		return (
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
					{sampleData.map((row) => {
						const isExpanded = expandedIds.has(row.id);
						return (
							<>
								<TableRow
									key={row.id}
									expandable
									expanded={isExpanded}
									onClick={() => toggleExpanded(row.id)}
								>
									<TableCell>
										{isExpanded ? (
											<ChevronDown size={16} />
										) : (
											<ChevronRight size={16} />
										)}
									</TableCell>
									<TableCell>{row.name}</TableCell>
									<TableCell>{row.email}</TableCell>
									<TableCell>{row.role}</TableCell>
								</TableRow>
								<TableExpandedRow
									key={`${row.id}-expanded`}
									colSpan={4}
									expanded={isExpanded}
								>
									<div style={{ padding: "0.5rem 0" }}>
										<p style={{ margin: 0, marginBottom: "0.5rem" }}>
											<strong>Additional Details for {row.name}</strong>
										</p>
										<p style={{ margin: 0, color: "var(--color-muted)" }}>
											Status: {row.status} • Role: {row.role}
										</p>
										<p
											style={{
												margin: 0,
												marginTop: "0.5rem",
												color: "var(--color-muted)",
											}}
										>
											This is the expanded content area where you can display
											additional information about the row item.
										</p>
									</div>
								</TableExpandedRow>
							</>
						);
					})}
				</TableBody>
			</Table>
		);
	},
};

export const WithNarrowColumns: Story = {
	render: () => {
		const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

		const toggleSelection = (id: number) => {
			const newSelection = new Set(selectedIds);
			if (newSelection.has(id)) {
				newSelection.delete(id);
			} else {
				newSelection.add(id);
			}
			setSelectedIds(newSelection);
		};

		const allSelected = selectedIds.size === sampleData.length;
		const someSelected = selectedIds.size > 0 && !allSelected;

		return (
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead narrow>
							<Checkbox
								size="sm"
								checked={allSelected}
								indeterminate={someSelected}
								onChange={() => {
									if (allSelected) {
										setSelectedIds(new Set());
									} else {
										setSelectedIds(new Set(sampleData.map((r) => r.id)));
									}
								}}
								aria-label="Select all rows"
							/>
						</TableHead>
						<TableHead narrow>#</TableHead>
						<TableHead>Name</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Role</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sampleData.map((row) => (
						<TableRow key={row.id} selected={selectedIds.has(row.id)}>
							<TableCell>
								<Checkbox
									size="sm"
									checked={selectedIds.has(row.id)}
									onChange={() => toggleSelection(row.id)}
									aria-label={`Select ${row.name}`}
								/>
							</TableCell>
							<TableCell>{row.id}</TableCell>
							<TableCell>{row.name}</TableCell>
							<TableCell>{row.email}</TableCell>
							<TableCell>{row.role}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	},
};

export const WithMinWidth: Story = {
	render: () => (
		<div style={{ maxWidth: "400px", overflow: "auto" }}>
			<Table minWidth="800px">
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Role</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Department</TableHead>
						<TableHead>Location</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sampleData.slice(0, 3).map((row) => (
						<TableRow key={row.id}>
							<TableCell>{row.name}</TableCell>
							<TableCell>{row.email}</TableCell>
							<TableCell>{row.role}</TableCell>
							<TableCell>{row.status}</TableCell>
							<TableCell>Engineering</TableCell>
							<TableCell>San Francisco</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	),
};
