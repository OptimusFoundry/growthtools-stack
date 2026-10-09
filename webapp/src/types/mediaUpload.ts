export interface PendingUpload {
	id: string;
	file: File;
	progress?: number;
	error?: string;
}
