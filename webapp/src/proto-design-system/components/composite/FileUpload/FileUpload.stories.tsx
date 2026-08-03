import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { FileUpload, type UploadedFile } from "./FileUpload";

const meta: Meta<typeof FileUpload> = {
	title: "Composite/FileUpload",
	component: FileUpload,
	parameters: {
		layout: "padded",
	},
	argTypes: {
		variant: {
			control: "select",
			options: ["dropzone", "button"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof FileUpload>;

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	render: (args) => {
		const [files, setFiles] = useState<UploadedFile[]>([]);
		return <FileUpload {...args} files={files} onFilesChange={setFiles} />;
	},
	args: {
		label: "Drag & drop files here",
		description: "or click to browse",
	},
};

export const ButtonVariant: Story = {
	render: () => {
		const [files, setFiles] = useState<UploadedFile[]>([]);
		return (
			<FileUpload
				variant="button"
				files={files}
				onFilesChange={setFiles}
				multiple
			/>
		);
	},
};

// =============================================================================
// ACCEPTED TYPES
// =============================================================================

export const ImagesOnly: Story = {
	render: () => {
		const [files, setFiles] = useState<UploadedFile[]>([]);
		return (
			<FileUpload
				accept="image/*"
				files={files}
				onFilesChange={setFiles}
				multiple
				label="Drop your logo or brand assets here"
				description="PNG, JPG, or SVG up to 10MB"
			/>
		);
	},
};

export const DocumentsOnly: Story = {
	render: () => {
		const [files, setFiles] = useState<UploadedFile[]>([]);
		return (
			<FileUpload
				accept=".pdf,.doc,.docx,.txt"
				files={files}
				onFilesChange={setFiles}
				multiple
				label="Drop your contract or W-9 here"
				description="PDF, DOC, DOCX, or TXT"
			/>
		);
	},
};

// =============================================================================
// CONSTRAINTS
// =============================================================================

export const WithMaxSize: Story = {
	render: () => {
		const [files, setFiles] = useState<UploadedFile[]>([]);
		return (
			<FileUpload
				files={files}
				onFilesChange={setFiles}
				maxSize={1024 * 1024}
				multiple
				label="Drop your CSV here"
				description="Maximum file size: 1MB"
			/>
		);
	},
};

export const SingleFile: Story = {
	render: () => {
		const [files, setFiles] = useState<UploadedFile[]>([]);
		return (
			<FileUpload
				files={files}
				onFilesChange={setFiles}
				multiple={false}
				label="Drop your resume here"
				description="Only one file allowed — PDF preferred"
			/>
		);
	},
};

export const WithMaxFiles: Story = {
	render: () => {
		const [files, setFiles] = useState<UploadedFile[]>([]);
		return (
			<FileUpload
				files={files}
				onFilesChange={setFiles}
				multiple
				maxFiles={3}
				label="Drop screenshots here"
				description="Up to 3 files, attached to this support ticket"
			/>
		);
	},
};

// =============================================================================
// STATES
// =============================================================================

export const Disabled: Story = {
	render: () => {
		return (
			<FileUpload
				disabled
				label="Uploads paused"
				description="Finish verifying your account to attach files"
			/>
		);
	},
};

export const WithPreloadedFiles: Story = {
	render: () => {
		const [files, setFiles] = useState<UploadedFile[]>([
			{
				id: "1",
				file: new File([""], "master-services-agreement.pdf", {
					type: "application/pdf",
				}),
				progress: 100,
			},
			{
				id: "2",
				file: new File([""], "q3-logo-lockup.png", { type: "image/png" }),
				progress: 100,
			},
			{
				id: "3",
				file: new File([""], "onboarding-deck.pptx", {
					type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
				}),
				error: "File exceeds the 10MB limit",
			},
		]);
		return (
			<FileUpload
				files={files}
				onFilesChange={setFiles}
				multiple
				label="Deal room attachments"
				description="Shared with everyone on this deal"
			/>
		);
	},
};

export const Uploading: Story = {
	render: () => {
		const [files, setFiles] = useState<UploadedFile[]>([
			{
				id: "1",
				file: new File([""], "customer-export.csv", { type: "text/csv" }),
				progress: 62,
			},
			{
				id: "2",
				file: new File([""], "invoice-batch.zip", {
					type: "application/zip",
				}),
				progress: 100,
			},
		]);
		return (
			<FileUpload
				files={files}
				onFilesChange={setFiles}
				multiple
				label="Importing customer records"
				description="Files are validated as they finish uploading"
			/>
		);
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	render: () => {
		const [files, setFiles] = useState<UploadedFile[]>([
			{
				id: "1",
				file: new File([""], "identity-verification.pdf", {
					type: "application/pdf",
				}),
				progress: 100,
			},
			{
				id: "2",
				file: new File([""], "proof-of-address.jpg", { type: "image/jpeg" }),
				error: "Image is too blurry to verify — please retake it",
			},
		]);
		return (
			<div style={{ maxWidth: "480px" }}>
				<FileUpload
					accept="image/*,.pdf"
					files={files}
					onFilesChange={setFiles}
					multiple
					maxFiles={5}
					maxSize={8 * 1024 * 1024}
					label="Drag & drop your verification documents"
					description="Government ID and a recent utility bill, up to 8MB each"
				/>
			</div>
		);
	},
};
