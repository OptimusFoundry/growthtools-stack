import type { Meta, StoryObj } from "@storybook/react";
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

export const ImagesOnly: Story = {
	render: () => {
		const [files, setFiles] = useState<UploadedFile[]>([]);
		return (
			<FileUpload
				accept="image/*"
				files={files}
				onFilesChange={setFiles}
				multiple
				label="Drop images here"
				description="PNG, JPG, GIF up to 10MB"
			/>
		);
	},
};

export const WithMaxSize: Story = {
	render: () => {
		const [files, setFiles] = useState<UploadedFile[]>([]);
		return (
			<FileUpload
				files={files}
				onFilesChange={setFiles}
				maxSize={1024 * 1024} // 1MB
				multiple
				label="Drop files here"
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
				label="Drop a file here"
				description="Only one file allowed"
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
				label="Drop files here"
				description="Maximum 3 files"
			/>
		);
	},
};

export const Disabled: Story = {
	render: () => {
		return (
			<FileUpload
				disabled
				label="Upload disabled"
				description="Cannot upload files"
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
				label="Drop documents here"
				description="PDF, DOC, DOCX, TXT"
			/>
		);
	},
};

export const WithPreloadedFiles: Story = {
	render: () => {
		const [files, setFiles] = useState<UploadedFile[]>([
			{
				id: "1",
				file: new File([""], "example.pdf", { type: "application/pdf" }),
				progress: 100,
			},
			{
				id: "2",
				file: new File([""], "image.png", { type: "image/png" }),
				progress: 100,
			},
			{
				id: "3",
				file: new File([""], "document.docx", {
					type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				}),
				error: "File too large",
			},
		]);
		return <FileUpload files={files} onFilesChange={setFiles} multiple />;
	},
};
