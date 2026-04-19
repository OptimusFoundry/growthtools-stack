import { Search } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { Topbar } from "@/components/Layout/Topbar";
import { useAuth } from "@/contexts/auth";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { Input } from "@/proto-design-system/components/forms/Input/Input";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import pageStyles from "@/routes/page.module.scss";
import styles from "./AdminPage.module.scss";
import { UserRow } from "./UserRow";

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
			<div className={pageStyles.page}>
				<Stack gap="lg">
					{/* Stop impersonation button — shown when actively impersonating */}
					{user?.isImpersonated && (
						<div className={styles.stopBar} data-testid="admin-stop-bar">
							<Text color="secondary" size="sm">
								You are currently impersonating another user.
							</Text>
							<Button
								variant="destructive"
								size="sm"
								onClick={handleStopImpersonation}
								isLoading={isStopping}
								data-testid="admin-stop-button"
							>
								Stop impersonating
							</Button>
						</div>
					)}

					{/* User search */}
					<Card>
						<div className={styles.searchHeader}>
							<Text as="h2" size="lg" weight="semibold">
								Users
							</Text>
							<div className={styles.searchInput}>
								<Input
									placeholder="Search by email…"
									value={searchValue}
									onChange={handleSearchChange}
									leftElement={<Search size={15} />}
									aria-label="Search users by email"
									data-testid="admin-search-input"
								/>
							</div>
						</div>

						<div className={styles.results} data-testid="admin-user-list">
							{isLoading && (
								<div className={styles.loadingState}>
									<Spinner size="md" />
								</div>
							)}

							{!isLoading && error && (
								<div className={styles.emptyState}>
									<Text color="secondary" size="sm">
										{error}
									</Text>
								</div>
							)}

							{!isLoading && !error && users.length === 0 && (
								<div className={styles.emptyState}>
									<Text color="secondary" size="sm">
										No users found.
									</Text>
								</div>
							)}

							{!isLoading &&
								!error &&
								users.map((u) => <UserRow key={u.id} user={u} />)}
						</div>
					</Card>
				</Stack>
			</div>
		</>
	);
});
