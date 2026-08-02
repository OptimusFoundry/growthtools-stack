// Composite specimen — full variant matrices for the composite components.
// Accordion, DatePicker, FileUpload, and MultiSelect are controlled
// components, so each demo is wired through a small local wrapper that owns
// the piece of state the real prop expects (string[], Date | null,
// UploadedFile[], Set<string>). See Primitives.tsx for the framework
// pattern this file follows.

import {
	Code,
	Database,
	FileText,
	Globe,
	Server,
	Settings,
	Shield,
} from "lucide-react";
import { useState } from "react";
import {
	Accordion,
	type AccordionItemData,
} from "../../components/composite/Accordion/Accordion";
import {
	DatePicker,
	type DatePickerProps,
} from "../../components/composite/DatePicker/DatePicker";
import {
	type ExistingFile,
	FileUpload,
	type FileUploadProps,
	type UploadedFile,
} from "../../components/composite/FileUpload/FileUpload";
import {
	MultiSelect,
	type MultiSelectItem,
	type MultiSelectProps,
} from "../../components/composite/MultiSelect/MultiSelect";
import { Spec, SpecItem, SpecRow } from "../Spec";

// ---------------------------------------------------------------------------
// Accordion fixtures
// ---------------------------------------------------------------------------

const faqItems: AccordionItemData[] = [
	{
		id: "1",
		title: "What is the Proto Design System?",
		content:
			"A token-driven React component library shared across the product.",
	},
	{
		id: "2",
		title: "How do I install it?",
		content:
			"Import components directly from their source files — there is no barrel export.",
	},
	{
		id: "3",
		title: "Is it themeable?",
		content:
			"Yes. Every token resolves through CSS custom properties, so themes swap without touching component code.",
	},
];

const iconItems: AccordionItemData[] = [
	{
		id: "1",
		title: "Documentation",
		description: "Read the full reference",
		icon: <FileText />,
		content: "Browse the component reference and usage guidelines.",
	},
	{
		id: "2",
		title: "Settings",
		description: "Configure preferences",
		icon: <Settings />,
		content: "Adjust theme, density, and motion preferences.",
	},
	{
		id: "3",
		title: "Security",
		description: "Review security practices",
		icon: <Shield />,
		content: "Learn how authentication and session data are handled.",
	},
];

const disabledAccordionItems: AccordionItemData[] = [
	{
		id: "1",
		title: "Available section",
		content: "This section can be expanded.",
	},
	{
		id: "2",
		title: "Disabled section",
		content: "This content is unavailable.",
		disabled: true,
	},
	{
		id: "3",
		title: "Another available section",
		content: "This section can also be expanded.",
	},
];

function AccordionControlledDemo({ items }: { items: AccordionItemData[] }) {
	const [expanded, setExpanded] = useState<string[]>(["1"]);
	return (
		<Accordion
			items={items}
			expanded={expanded}
			onExpandedChange={setExpanded}
		/>
	);
}

// ---------------------------------------------------------------------------
// DatePicker fixtures
// ---------------------------------------------------------------------------

const today = new Date();
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

function formatDateGB(date: Date): string {
	return date.toLocaleDateString("en-GB", {
		weekday: "short",
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function DatePickerDemo({
	initialDate = null,
	...props
}: Omit<DatePickerProps, "value" | "onChange"> & {
	initialDate?: Date | null;
}) {
	const [date, setDate] = useState<Date | null>(initialDate);
	return <DatePicker value={date} onChange={setDate} {...props} />;
}

// ---------------------------------------------------------------------------
// FileUpload fixtures
// ---------------------------------------------------------------------------

const preloadedFiles: UploadedFile[] = [
	{
		id: "1",
		file: new File([""], "brand-guidelines.pdf", { type: "application/pdf" }),
		progress: 100,
	},
	{
		id: "2",
		file: new File([""], "hero-image.png", { type: "image/png" }),
		progress: 100,
	},
	{
		id: "3",
		file: new File([""], "contract.docx", {
			type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		}),
		error: "File too large",
	},
];

const existingAssets: ExistingFile[] = [
	{ id: "e1", name: "logo-final.png", size: 482_000, contentType: "image/png" },
	{
		id: "e2",
		name: "press-kit.zip",
		size: 1_240_000,
		contentType: "application/zip",
	},
];

function FileUploadDemo({
	initialFiles = [],
	...props
}: Omit<FileUploadProps, "files" | "onFilesChange"> & {
	initialFiles?: UploadedFile[];
}) {
	const [files, setFiles] = useState<UploadedFile[]>(initialFiles);
	return <FileUpload files={files} onFilesChange={setFiles} {...props} />;
}

function FileUploadExistingDemo() {
	const [existing, setExisting] = useState<ExistingFile[]>(existingAssets);
	const [files, setFiles] = useState<UploadedFile[]>([]);
	return (
		<FileUpload
			existingFiles={existing}
			onRemoveExisting={(id) =>
				setExisting((prev) => prev.filter((asset) => asset.id !== id))
			}
			files={files}
			onFilesChange={setFiles}
			multiple
			label="Drop files here"
			description="Existing assets are listed above"
		/>
	);
}

// ---------------------------------------------------------------------------
// MultiSelect fixtures
// ---------------------------------------------------------------------------

const frameworkItems: MultiSelectItem[] = [
	{ id: "react", label: "React", icon: <Code /> },
	{ id: "vue", label: "Vue", icon: <Code /> },
	{ id: "angular", label: "Angular", icon: <Code /> },
	{ id: "svelte", label: "Svelte", icon: <Code /> },
];

const descriptionItems: MultiSelectItem[] = [
	{
		id: "frontend",
		label: "Frontend",
		description: "User interface development",
		icon: <Globe />,
	},
	{
		id: "backend",
		label: "Backend",
		description: "Server-side logic and APIs",
		icon: <Server />,
	},
	{
		id: "database",
		label: "Database",
		description: "Data storage and management",
		icon: <Database />,
	},
];

const dividerItems: MultiSelectItem[] = [
	{ id: "frontend", label: "Frontend", icon: <Globe /> },
	{ id: "backend", label: "Backend", icon: <Server />, divider: true },
	{ id: "devops", label: "DevOps", icon: <Settings /> },
];

const disabledMultiSelectItems: MultiSelectItem[] = [
	{ id: "react", label: "React", icon: <Code /> },
	{ id: "vue", label: "Vue", icon: <Code />, disabled: true },
	{ id: "angular", label: "Angular", icon: <Code /> },
];

function MultiSelectDemo({
	initialValue,
	...props
}: Omit<MultiSelectProps, "value" | "onChange"> & {
	initialValue?: Set<string>;
}) {
	const [value, setValue] = useState<Set<string>>(
		() => initialValue ?? new Set<string>(),
	);
	return <MultiSelect value={value} onChange={setValue} {...props} />;
}

export function CompositeSpecimens() {
	return (
		<>
			<Spec
				name="Accordion"
				description="Collapsible content panels with single or multiple expansion, descriptions, icons, and disabled items."
			>
				<SpecRow label="Behavior" column>
					<SpecItem label="single (defaultExpanded)" grow>
						<Accordion items={faqItems} defaultExpanded={["1"]} />
					</SpecItem>
					<SpecItem label="multiple" grow>
						<Accordion items={faqItems} multiple defaultExpanded={["1", "2"]} />
					</SpecItem>
					<SpecItem label="controlled (expanded + onExpandedChange)" grow>
						<AccordionControlledDemo items={faqItems} />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options" column>
					<SpecItem label="descriptions + icons" grow>
						<Accordion items={iconItems} defaultExpanded={["1"]} />
					</SpecItem>
					<SpecItem label="disabled item" grow>
						<Accordion items={disabledAccordionItems} />
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="DatePicker"
				description="Calendar input for a single date, with size, range, formatting, and inline modes."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm">
						<DatePickerDemo size="sm" placeholder="Small" />
					</SpecItem>
					<SpecItem label="md">
						<DatePickerDemo size="md" placeholder="Medium" />
					</SpecItem>
					<SpecItem label="lg">
						<DatePickerDemo size="lg" placeholder="Large" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="States">
					<SpecItem label="empty">
						<DatePickerDemo placeholder="Select date..." />
					</SpecItem>
					<SpecItem label="withValue">
						<DatePickerDemo initialDate={today} />
					</SpecItem>
					<SpecItem label="disabled">
						<DatePicker placeholder="Disabled date picker" disabled />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="minDate/maxDate (this month)">
						<DatePickerDemo minDate={monthStart} maxDate={monthEnd} />
					</SpecItem>
					<SpecItem label="formatDate (en-GB)">
						<DatePickerDemo initialDate={today} formatDate={formatDateGB} />
					</SpecItem>
					<SpecItem label="firstDayOfWeek=Monday">
						<DatePickerDemo firstDayOfWeek={1} />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Inline" column>
					<SpecItem label="inline (no trigger button)" grow>
						<DatePickerDemo inline initialDate={today} />
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="FileUpload"
				description="Drag-and-drop or button-triggered uploader with size limits, file counts, existing assets, and per-file status."
			>
				<SpecRow label="Variants" column>
					<SpecItem label="dropzone" grow>
						<FileUploadDemo multiple />
					</SpecItem>
					<SpecItem label="button" grow>
						<FileUploadDemo variant="button" multiple />
					</SpecItem>
				</SpecRow>
				<SpecRow label="States" column>
					<SpecItem label="withFiles (ready + error)" grow>
						<FileUploadDemo initialFiles={preloadedFiles} multiple />
					</SpecItem>
					<SpecItem label="withExistingFiles" grow>
						<FileUploadExistingDemo />
					</SpecItem>
					<SpecItem label="disabled" grow>
						<FileUpload
							disabled
							label="Upload disabled"
							description="Cannot upload files"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options" column>
					<SpecItem label="accept + maxSize (images, 5MB)" grow>
						<FileUploadDemo
							accept="image/*"
							multiple
							maxSize={5 * 1024 * 1024}
							label="Drop images here"
							description="PNG, JPG, GIF up to 5MB"
						/>
					</SpecItem>
					<SpecItem label="maxFiles=3" grow>
						<FileUploadDemo
							multiple
							maxFiles={3}
							label="Drop files here"
							description="Maximum 3 files"
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="MultiSelect"
				description="Multi-value listbox with checkable items, descriptions, dividers, and clear-all."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm">
						<MultiSelectDemo
							items={frameworkItems}
							size="sm"
							placeholder="Small"
						/>
					</SpecItem>
					<SpecItem label="md">
						<MultiSelectDemo
							items={frameworkItems}
							size="md"
							placeholder="Medium"
							initialValue={new Set(["react"])}
						/>
					</SpecItem>
					<SpecItem label="lg">
						<MultiSelectDemo
							items={frameworkItems}
							size="lg"
							placeholder="Large"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Variants">
					<SpecItem label="default">
						<MultiSelectDemo
							items={frameworkItems}
							variant="default"
							placeholder="Default"
							initialValue={new Set(["react"])}
						/>
					</SpecItem>
					<SpecItem label="outline">
						<MultiSelectDemo
							items={frameworkItems}
							variant="outline"
							placeholder="Outline"
							initialValue={new Set(["vue"])}
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="States">
					<SpecItem label="preselected">
						<MultiSelectDemo
							items={frameworkItems}
							initialValue={new Set(["react", "vue"])}
							placeholder="Select frameworks..."
						/>
					</SpecItem>
					<SpecItem label="disabled">
						<MultiSelect
							items={frameworkItems}
							value={new Set(["react", "vue"])}
							placeholder="Disabled"
							disabled
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="descriptions">
						<MultiSelectDemo
							items={descriptionItems}
							placeholder="Select specializations..."
						/>
					</SpecItem>
					<SpecItem label="dividers">
						<MultiSelectDemo
							items={dividerItems}
							placeholder="Select skills..."
						/>
					</SpecItem>
					<SpecItem label="disabled items">
						<MultiSelectDemo
							items={disabledMultiSelectItems}
							placeholder="Select frameworks..."
						/>
					</SpecItem>
				</SpecRow>
			</Spec>
		</>
	);
}
