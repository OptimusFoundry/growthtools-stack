// Server bodies are raw JSON error payloads, so the user-facing copy is keyed by status only.
const UPLOAD_ERROR_MESSAGES: Record<number, string> = {
	400: "This file couldn't be uploaded. Check its type and size.",
	401: "Your session expired. Sign in again to upload.",
	403: "You don't have permission to upload media.",
	404: "Upload isn't available right now. Try again later.",
	409: "This file has already been uploaded.",
	413: "This file is too large to upload.",
};

const DEFAULT_UPLOAD_ERROR_MESSAGE = "Upload failed. Try again.";

export const UPLOAD_TRANSPORT_ERROR_MESSAGE =
	"Couldn't reach the server. Check your connection and try again.";

export const getUploadErrorMessage = (status: number): string =>
	UPLOAD_ERROR_MESSAGES[status] ?? DEFAULT_UPLOAD_ERROR_MESSAGE;
