import { useCallback, useState } from "react";
import { useBannerCenter } from "@/proto-design-system/components/feedback/BannerCenter";

export interface ConfirmableDeleteCopy {
	/** Resource noun, e.g. "post", "blog post". Used in banner titles. */
	resource: string;
	/** Body text shown inside the confirmation modal. */
	confirmBody: string;
	/** Title shown in the modal header. Defaults to `Delete ${resource}`. */
	modalTitle?: string;
}

export interface UseConfirmableDeleteOptions {
	mutate: (id: string) => Promise<unknown>;
	mutating: boolean;
	onSuccess?: () => void;
	copy: ConfirmableDeleteCopy;
}

export interface ConfirmableDeleteFlow {
	targetId: string | null;
	isOpen: boolean;
	isLoading: boolean;
	modalTitle: string;
	confirmBody: string;
	request: (id: string) => void;
	cancel: () => void;
	confirm: () => Promise<void>;
}

/**
 * Binds together the state + toast + refetch dance every CRUD list page
 * repeats around a delete mutation. Pair with <ConfirmDeleteModal> for the
 * full UI wiring.
 */
export function useConfirmableDelete({
	mutate,
	mutating,
	onSuccess,
	copy,
}: UseConfirmableDeleteOptions): ConfirmableDeleteFlow {
	const { addBanner } = useBannerCenter();
	const [targetId, setTargetId] = useState<string | null>(null);

	const request = useCallback((id: string) => setTargetId(id), []);
	const cancel = useCallback(() => setTargetId(null), []);

	const confirm = useCallback(async () => {
		if (!targetId) return;
		try {
			await mutate(targetId);
			setTargetId(null);
			addBanner({
				type: "success",
				title: `${capitalize(copy.resource)} deleted`,
				dismissible: true,
			});
			onSuccess?.();
		} catch {
			addBanner({
				type: "error",
				title: `Couldn't delete ${copy.resource}`,
				description: "Please try again.",
				dismissible: true,
			});
		}
	}, [targetId, mutate, onSuccess, addBanner, copy.resource]);

	return {
		targetId,
		isOpen: targetId !== null,
		isLoading: mutating,
		modalTitle: copy.modalTitle ?? `Delete ${copy.resource}`,
		confirmBody: copy.confirmBody,
		request,
		cancel,
		confirm,
	};
}

function capitalize(s: string): string {
	return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}
