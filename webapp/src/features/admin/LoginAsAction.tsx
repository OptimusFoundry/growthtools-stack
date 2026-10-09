import { Alert, Button, Dialog, Text } from "@optimusfoundry/quiet";
import { useState } from "react";
import type { AdminUser } from "@/hooks/useAdminUsers";
import { useStartImpersonation } from "@/hooks/useStartImpersonation";

export function LoginAsAction({ user }: { user: AdminUser }) {
	const [isOpen, setIsOpen] = useState(false);
	const { start, isLoading, error } = useStartImpersonation();

	const close = () => setIsOpen(false);

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setIsOpen(true)}
				aria-label={`Login as ${user.email}`}
			>
				Login as
			</Button>
			<Dialog
				open={isOpen}
				onClose={close}
				title="Confirm impersonation"
				icon="warning"
				size="sm"
				actions={
					<>
						<Button variant="ghost" onClick={close} disabled={isLoading}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => start(user.id)}
							loading={isLoading}
						>
							Continue
						</Button>
					</>
				}
			>
				{/* Inline, not a toast: the open Dialog makes the Toaster inert. */}
				{error && <Alert variant="error">{error}</Alert>}
				<Text color="muted">
					{`You will act as ${user.email}. All actions will affect their account.`}
				</Text>
			</Dialog>
		</>
	);
}
