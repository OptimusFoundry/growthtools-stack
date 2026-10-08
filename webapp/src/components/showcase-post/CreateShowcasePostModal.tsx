import { TextArea } from "@/proto-design-system/components/forms/TextArea/TextArea";
import { Stack } from "@/proto-design-system/components/layout/Stack/Stack";
import { Modal } from "@/proto-design-system/components/overlays/Modal/Modal";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";
import { SHOWCASE_POST_COPY } from "./copy";
import type { CreateShowcasePostFlow } from "./useCreateShowcasePostFlow";

/**
 * Presentation half of useCreateShowcasePostFlow. Accepts the flow object
 * directly — callers render `<CreateShowcasePostModal flow={flow} />`.
 */
export function CreateShowcasePostModal({
	flow,
}: {
	flow: CreateShowcasePostFlow;
}) {
	return (
		<Modal
			isOpen={flow.isOpen}
			onClose={flow.cancel}
			title={SHOWCASE_POST_COPY.modalTitle}
			size="sm"
			footer={
				<Stack direction="row" gap="sm" justify="end">
					<Button variant="ghost" onClick={flow.cancel}>
						{SHOWCASE_POST_COPY.cancelLabel}
					</Button>
					<Button
						variant="primary"
						onClick={flow.submit}
						isLoading={flow.isLoading}
						disabled={flow.brief.trim() === ""}
					>
						{SHOWCASE_POST_COPY.submitLabel}
					</Button>
				</Stack>
			}
		>
			<TextArea
				label={SHOWCASE_POST_COPY.briefLabel}
				value={flow.brief}
				onChange={(e) => flow.setBrief(e.target.value)}
				errorMessage={flow.errorMessage ?? undefined}
			/>
		</Modal>
	);
}
