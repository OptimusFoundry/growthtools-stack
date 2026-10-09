import { Alert, Button, Dialog, Text } from "@optimusfoundry/quiet";
import type { ConfirmableDeleteFlow } from "@/hooks/useConfirmableDelete";

/**
 * Presentation half of useConfirmableDelete. Accepts the flow object directly
 * — callers render `<ConfirmDeleteModal flow={deleteFlow} />`.
 */
export function ConfirmDeleteModal({ flow }: { flow: ConfirmableDeleteFlow }) {
	return (
		<Dialog
			open={flow.isOpen}
			onClose={flow.cancel}
			title={flow.modalTitle}
			size="sm"
			actions={
				<>
					<Button variant="ghost" size="sm" onClick={flow.cancel}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						size="sm"
						onClick={flow.confirm}
						loading={flow.isLoading}
					>
						Delete
					</Button>
				</>
			}
		>
			{flow.error && (
				<Alert variant="error" title={flow.error}>
					Please try again.
				</Alert>
			)}
			<Text color="muted">{flow.confirmBody}</Text>
		</Dialog>
	);
}
