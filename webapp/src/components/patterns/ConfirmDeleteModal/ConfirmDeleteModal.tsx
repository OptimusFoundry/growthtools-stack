import type { ConfirmableDeleteFlow } from "@/hooks/useConfirmableDelete";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Modal } from "@/proto-design-system/components/overlays/Modal";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";

/**
 * Presentation half of useConfirmableDelete. Accepts the flow object directly
 * — callers render `<ConfirmDeleteModal flow={deleteFlow} />`.
 */
export function ConfirmDeleteModal({ flow }: { flow: ConfirmableDeleteFlow }) {
	return (
		<Modal
			isOpen={flow.isOpen}
			onClose={flow.cancel}
			title={flow.modalTitle}
			size="sm"
			footer={
				<Stack direction="row" gap="sm" justify="end">
					<Button variant="ghost" onClick={flow.cancel}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={flow.confirm}
						isLoading={flow.isLoading}
					>
						Delete
					</Button>
				</Stack>
			}
		>
			<Text color="secondary">{flow.confirmBody}</Text>
		</Modal>
	);
}
