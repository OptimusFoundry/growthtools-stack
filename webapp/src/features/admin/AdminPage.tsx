import {
	Alert,
	Button,
	Col,
	Grid,
	PageHero,
	Stack,
	Table,
	type TableProps,
	TextField,
} from "@optimusfoundry/quiet";
import { Search } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { Topbar } from "@/components/Layout/Topbar";
import { useAuth } from "@/contexts/auth";
import { type AdminUser, useAdminUsers } from "@/hooks/useAdminUsers";
import styles from "./AdminPage.module.scss";
import { LoginAsAction } from "./LoginAsAction";

function formatDate(isoString: string): string {
	try {
		return new Date(isoString).toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	} catch {
		return isoString;
	}
}

const columns: TableProps<AdminUser>["columns"] = [
	{ key: "email", header: "Email", render: (row) => row.email },
	{
		key: "name",
		header: "Name",
		render: (row) => `${row.firstName} ${row.lastName}`.trim(),
	},
	{
		key: "createdAt",
		header: "Joined",
		nowrap: true,
		render: (row) => (
			<time dateTime={row.createdAt}>{formatDate(row.createdAt)}</time>
		),
	},
	{
		key: "actions",
		header: "Actions",
		align: "right",
		render: (row) => <LoginAsAction user={row} />,
	},
];

/**
 * Admin page — user search and impersonation control.
 * Only reachable by admin emails (enforced server-side; 403 redirects to /).
 */
export const AdminPage = memo(function AdminPage() {
	const { user } = useAuth();
	const { users, isLoading, error, search } = useAdminUsers();
	const [searchValue, setSearchValue] = useState("");
	const [isStopping, setIsStopping] = useState(false);

	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			setSearchValue(value);
			search(value);
		},
		[search],
	);

	const handleStopImpersonation = useCallback(async () => {
		setIsStopping(true);
		try {
			await fetcher(
				`${import.meta.env.VITE_API_URL}/api/protected/admin/impersonate`,
				{
					method: "DELETE",
				},
			);
		} finally {
			window.location.assign("/");
		}
	}, []);

	return (
		<>
			<Topbar title="Admin" />
			<Stack gap="lg">
				{user?.isImpersonated && (
					<Alert
						variant="warning"
						action={
							<Button
								variant="destructive"
								size="sm"
								onClick={handleStopImpersonation}
								loading={isStopping}
							>
								Stop impersonating
							</Button>
						}
					>
						You are currently impersonating another user.
					</Alert>
				)}

				<PageHero size="md" as="h2" title="Users" className={styles.hero} />

				<Grid columns={12}>
					<Col span={4} spanSm={12}>
						<TextField
							size="sm"
							label="Search users by email"
							hideLabel
							placeholder="Search by email…"
							leftIcon={<AppIcon icon={Search} />}
							value={searchValue}
							onChange={handleSearchChange}
						/>
					</Col>
				</Grid>

				{error ? (
					<Alert variant="error">{error}</Alert>
				) : (
					<Table<AdminUser>
						size="sm"
						label="Users"
						rowKey="id"
						columns={columns}
						data={users}
						loading={isLoading}
						emptyText="No users found."
					/>
				)}
			</Stack>
		</>
	);
});
