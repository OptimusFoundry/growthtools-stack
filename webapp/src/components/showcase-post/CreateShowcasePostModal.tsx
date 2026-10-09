import { Button, Dialog, TextArea } from "@optimusfoundry/quiet";
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
		<Dialog
			open={flow.isOpen}
			onClose={flow.cancel}
			title={SHOWCASE_POST_COPY.modalTitle}
			size="sm"
			actions={
				<>
					<Button variant="ghost" onClick={flow.cancel}>
						{SHOWCASE_POST_COPY.cancelLabel}
					</Button>
					<Button
						variant="primary"
						onClick={flow.submit}
						loading={flow.isLoading}
						disabled={flow.brief.trim() === ""}
					>
						{SHOWCASE_POST_COPY.submitLabel}
					</Button>
				</>
			}
		>
			<TextArea
				label={SHOWCASE_POST_COPY.briefLabel}
				value={flow.brief}
				onChange={(e) => flow.setBrief(e.target.value)}
				error={flow.errorMessage ?? undefined}
			/>
		</Dialog>
	);
}
