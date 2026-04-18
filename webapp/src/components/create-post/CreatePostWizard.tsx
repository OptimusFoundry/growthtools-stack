import { EditPostWizard } from "./EditPostWizard";
import { WizardInner } from "./WizardInner";

interface CreatePostWizardProps {
	editPostId?: string;
}

/**
 * Main entry point for the create/edit post wizard.
 * Routes to EditPostWizard if editing, otherwise renders WizardInner directly.
 */
export function CreatePostWizard({ editPostId }: CreatePostWizardProps = {}) {
	if (editPostId) {
		return <EditPostWizard editPostId={editPostId} />;
	}
	return <WizardInner />;
}
