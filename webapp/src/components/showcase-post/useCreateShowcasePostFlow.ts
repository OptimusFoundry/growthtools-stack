import { useCallback, useState } from "react";
import { useCreateShowcasePost } from "@/hooks/useCreateShowcasePost";
import { useBannerCenter } from "@/proto-design-system/components/feedback/BannerCenter";
import { getErrorMessage } from "@/utils/errorHandler";
import { SHOWCASE_POST_COPY } from "./copy";

export interface CreateShowcasePostFlow {
	isOpen: boolean;
	brief: string;
	setBrief: (v: string) => void;
	isLoading: boolean;
	errorMessage: string | null;
	open: () => void;
	cancel: () => void;
	submit: () => Promise<void>;
}

/**
 * Fire-and-forget by design (PRD non-goal: no job-status UI). Success closes
 * the modal and shows a one-time toast; failure keeps the modal open with an
 * inline error so the user can revise the brief — no toast on that path.
 */
export function useCreateShowcasePostFlow(): CreateShowcasePostFlow {
	const { addBanner } = useBannerCenter();
	const { createShowcasePost, loading } = useCreateShowcasePost();
	const [isOpen, setIsOpen] = useState(false);
	const [brief, setBrief] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const open = useCallback(() => {
		setErrorMessage(null);
		setIsOpen(true);
	}, []);

	const cancel = useCallback(() => {
		setIsOpen(false);
		setErrorMessage(null);
		setBrief("");
	}, []);

	const submit = useCallback(async () => {
		if (brief.trim() === "") return;
		try {
			await createShowcasePost(brief);
			addBanner({
				type: "success",
				title: SHOWCASE_POST_COPY.successBannerTitle,
				dismissible: true,
			});
			setIsOpen(false);
			setBrief("");
		} catch (err: unknown) {
			setErrorMessage(getErrorMessage(err));
		}
	}, [brief, createShowcasePost, addBanner]);

	return {
		isOpen,
		brief,
		setBrief,
		isLoading: loading,
		errorMessage,
		open,
		cancel,
		submit,
	};
}
