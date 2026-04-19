import { AlertTriangle } from "lucide-react";
import { useCallback, useState } from "react";
import type { AdminUser } from "@/hooks/useAdminUsers";
import { useStartImpersonation } from "@/hooks/useStartImpersonation";
import { Modal } from "@/proto-design-system/components/overlays/Modal/Modal";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";
import styles from "./UserRow.module.scss";

interface UserRowProps {
	user: AdminUser;
}

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

/**
 * Renders a single user row in the admin search results list.
 * "Login as" opens a confirm dialog before starting the impersonation session.
 */
export function UserRow({ user }: UserRowProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const { start, isLoading, error } = useStartImpersonation();

	const handleConfirm = useCallback(async () => {
		await start(user.id);
		// If start() throws, isDialogOpen stays true so the error is shown.
		// If it succeeds, the page reloads before we need to close the dialog.
	}, [start, user.id]);

	const handleOpen = useCallback(() => {
		setIsDialogOpen(true);
	}, []);

	const handleClose = useCallback(() => {
		setIsDialogOpen(false);
	}, []);

	const fullName = `${user.firstName} ${user.lastName}`.trim();

	return (
		<>
			<div className={styles.row} data-testid="admin-user-row">
				<div className={styles.userInfo}>
					<span className={styles.email}>{user.email}</span>
					{fullName && <span className={styles.name}>{fullName}</span>}
					<span
						className={styles.date}
						aria-label={`Joined ${formatDate(user.createdAt)}`}
					>
						{formatDate(user.createdAt)}
					</span>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleOpen}
					aria-label={`Login as ${user.email}`}
				>
					Login as
				</Button>
			</div>

			<Modal
				isOpen={isDialogOpen}
				onClose={handleClose}
				title="Confirm impersonation"
				description={`You will act as ${user.email}. All actions will affect their account.`}
				icon={<AlertTriangle size={20} />}
				iconVariant="warning"
				size="sm"
				footer={
					<div className={styles.dialogFooter}>
						<Button variant="ghost" onClick={handleClose} disabled={isLoading}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleConfirm}
							isLoading={isLoading}
						>
							Continue
						</Button>
					</div>
				}
			>
				{error && (
					<p className={styles.error} role="alert">
						{error}
					</p>
				)}
			</Modal>
		</>
	);
}
