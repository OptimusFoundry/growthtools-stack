import { useCallback, useState } from "react";
import { useNotify } from "@/hooks/useNotify";

export interface ConfirmableDeleteCopy {
	/** Resource noun, e.g. "post", "blog post". Used in banner titles. */
	resource: string;
	/** Body text shown inside the confirmation modal. May depend on the target id. */
	confirmBody: string | ((targetId: string) => string);
	/** Title shown in the modal header. Defaults to `Delete ${resource}`. */
	modalTitle?: string;
}

export interface UseConfirmableDeleteOptions<TResult = unknown> {
	mutate: (id: string) => Promise<TResult>;
	mutating: boolean;
	onSuccess?: (result: TResult) => void;
	/** Return a warning message to surface instead of the generic success banner. */
	getWarning?: (result: TResult) => string | undefined;
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
export function useConfirmableDelete<TResult = unknown>({
	mutate,
	mutating,
	onSuccess,
	getWarning,
	copy,
}: UseConfirmableDeleteOptions<TResult>): ConfirmableDeleteFlow {
	const { notify } = useNotify();
	const [targetId, setTargetId] = useState<string | null>(null);

	const request = useCallback((id: string) => setTargetId(id), []);
	const cancel = useCallback(() => setTargetId(null), []);

	const confirm = useCallback(async () => {
		if (!targetId) return;
		try {
			const result = await mutate(targetId);
			setTargetId(null);
			const warning = getWarning?.(result);
			if (warning) {
				notify({
					status: "warning",
					title: `${capitalize(copy.resource)} deleted, but site removal failed`,
					description: warning,
				});
			} else {
				notify({
					status: "success",
					title: `${capitalize(copy.resource)} deleted`,
				});
			}
			onSuccess?.(result);
		} catch {
			notify({
				status: "error",
				title: `Couldn't delete ${copy.resource}`,
				description: "Please try again.",
			});
		}
	}, [targetId, mutate, onSuccess, getWarning, notify, copy.resource]);

	// Resolved here, not inside confirm(), because the modal already shows
	// this copy before the user clicks confirm.
	const confirmBody =
		typeof copy.confirmBody === "function"
			? copy.confirmBody(targetId ?? "")
			: copy.confirmBody;

	return {
		targetId,
		isOpen: targetId !== null,
		isLoading: mutating,
		modalTitle: copy.modalTitle ?? `Delete ${copy.resource}`,
		confirmBody,
		request,
		cancel,
		confirm,
	};
}

function capitalize(s: string): string {
	return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}
