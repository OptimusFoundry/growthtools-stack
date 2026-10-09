import { toast } from "@optimusfoundry/quiet";

export type NotifyStatus = "info" | "success" | "warning" | "error";

export interface NotifyOptions {
	status: NotifyStatus;
	title: string;
	description?: string;
	duration?: number;
}

export interface UseNotifyResult {
	notify(options: NotifyOptions): string;
	dismiss(id?: string): void;
}

// warning and error stay until dismissed; info and success fall back to the Toaster default.
function defaultDuration(status: NotifyStatus): number | undefined {
	return status === "warning" || status === "error" ? 0 : undefined;
}

function notify({
	status,
	title,
	description,
	duration,
}: NotifyOptions): string {
	return toast({
		status,
		title,
		description,
		duration: duration ?? defaultDuration(status),
	});
}

function dismiss(id?: string): void {
	toast.dismiss(id);
}

const result: UseNotifyResult = { notify, dismiss };

export function useNotify(): UseNotifyResult {
	return result;
}
