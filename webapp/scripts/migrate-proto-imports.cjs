#!/usr/bin/env node

/**
 * Migration script to convert barrel imports from @/proto-design-system
 * to direct component path imports for better tree-shaking.
 *
 * Usage:
 *   node scripts/migrate-proto-imports.js           # Migrate all files
 *   node scripts/migrate-proto-imports.js --dry-run # Preview changes without modifying files
 *   node scripts/migrate-proto-imports.js --file path/to/file.tsx  # Migrate single file
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Complete mapping of exports to their direct paths
const EXPORT_MAP = {
	// Primitives
	Button: "components/primitives/Button",
	ButtonGroup: "components/primitives/Button",
	Link: "components/primitives/Button",
	LinkButton: "components/primitives/Button",
	ButtonProps: "components/primitives/Button",
	ButtonVariant: "components/primitives/Button",
	ButtonSize: "components/primitives/Button",
	ButtonGroupProps: "components/primitives/Button",
	LinkProps: "components/primitives/Button",
	LinkVariant: "components/primitives/Button",
	LinkSize: "components/primitives/Button",
	LinkButtonProps: "components/primitives/Button",

	Text: "components/primitives/Text",
	TextProps: "components/primitives/Text",
	TextElement: "components/primitives/Text",
	TextSize: "components/primitives/Text",
	TextWeight: "components/primitives/Text",
	TextColor: "components/primitives/Text",
	TextAlign: "components/primitives/Text",

	Badge: "components/primitives/Badge",
	BadgeProps: "components/primitives/Badge",
	BadgeVariant: "components/primitives/Badge",
	BadgeSize: "components/primitives/Badge",

	Spinner: "components/primitives/Spinner",
	SpinnerProps: "components/primitives/Spinner",
	SpinnerSize: "components/primitives/Spinner",
	SpinnerVariant: "components/primitives/Spinner",

	Avatar: "components/primitives/Avatar",
	AvatarProps: "components/primitives/Avatar",
	AvatarSize: "components/primitives/Avatar",
	AvatarVariant: "components/primitives/Avatar",

	Skeleton: "components/primitives/Skeleton",
	SkeletonProps: "components/primitives/Skeleton",
	SkeletonVariant: "components/primitives/Skeleton",

	Icon: "components/primitives/Icon",
	IconProps: "components/primitives/Icon",
	IconSize: "components/primitives/Icon",
	IconColor: "components/primitives/Icon",

	Tag: "components/primitives/Tag",
	TagProps: "components/primitives/Tag",
	TagSize: "components/primitives/Tag",
	TagVariant: "components/primitives/Tag",

	// Forms
	Input: "components/forms/Input",
	InputProps: "components/forms/Input",
	InputSize: "components/forms/Input",
	InputVariant: "components/forms/Input",

	TextField: "components/forms/TextField",
	TextFieldProps: "components/forms/TextField",

	TextArea: "components/forms/TextArea",
	TextAreaProps: "components/forms/TextArea",
	TextAreaSize: "components/forms/TextArea",
	TextAreaResize: "components/forms/TextArea",

	Checkbox: "components/forms/Checkbox",
	CheckboxProps: "components/forms/Checkbox",
	CheckboxSize: "components/forms/Checkbox",

	Radio: "components/forms/Radio",
	RadioGroup: "components/forms/Radio",
	RadioProps: "components/forms/Radio",
	RadioGroupProps: "components/forms/Radio",
	RadioSize: "components/forms/Radio",

	Switch: "components/forms/Switch",
	SwitchProps: "components/forms/Switch",
	SwitchSize: "components/forms/Switch",

	Select: "components/forms/Select",
	SelectProps: "components/forms/Select",
	SelectOption: "components/forms/Select",
	SelectSize: "components/forms/Select",
	SelectVariant: "components/forms/Select",

	Slider: "components/forms/Slider",
	SliderProps: "components/forms/Slider",
	SliderSize: "components/forms/Slider",

	FormField: "components/forms/FormField",
	FormFieldProps: "components/forms/FormField",
	FormFieldSize: "components/forms/FormField",

	Label: "components/forms/Label",
	LabelProps: "components/forms/Label",
	LabelSize: "components/forms/Label",

	FormHint: "components/forms/FormHint",
	FormHintProps: "components/forms/FormHint",
	FormHintVariant: "components/forms/FormHint",

	// Layout
	Container: "components/layout/Container",
	ContainerProps: "components/layout/Container",
	ContainerSize: "components/layout/Container",

	Stack: "components/layout/Stack",
	StackProps: "components/layout/Stack",
	StackDirection: "components/layout/Stack",
	StackAlign: "components/layout/Stack",
	StackJustify: "components/layout/Stack",
	StackSpacing: "components/layout/Stack",

	Grid: "components/layout/Grid",
	GridProps: "components/layout/Grid",
	GridColumns: "components/layout/Grid",
	GridGap: "components/layout/Grid",

	Card: "components/layout/Card",
	CardHeader: "components/layout/Card",
	CardBody: "components/layout/Card",
	CardFooter: "components/layout/Card",
	CardProps: "components/layout/Card",
	CardHeaderProps: "components/layout/Card",
	CardBodyProps: "components/layout/Card",
	CardFooterProps: "components/layout/Card",
	CardVariant: "components/layout/Card",
	CardPadding: "components/layout/Card",

	Divider: "components/layout/Divider",
	DividerProps: "components/layout/Divider",
	DividerOrientation: "components/layout/Divider",
	DividerVariant: "components/layout/Divider",

	AspectRatio: "components/layout/AspectRatio",
	AspectRatioProps: "components/layout/AspectRatio",
	AspectRatioPreset: "components/layout/AspectRatio",

	PageTransition: "components/layout/PageTransition",
	PageTransitionType: "components/layout/PageTransition",
	PageTransitionProps: "components/layout/PageTransition",

	// Feedback
	Alert: "components/feedback/Alert",
	AlertProps: "components/feedback/Alert",
	AlertVariant: "components/feedback/Alert",

	Banner: "components/feedback/Banner",
	BannerProps: "components/feedback/Banner",
	BannerType: "components/feedback/Banner",
	BannerVariant: "components/feedback/Banner",

	BannerCenterProvider: "components/feedback/BannerCenter",
	useBannerCenter: "components/feedback/BannerCenter",
	BannerCenterProviderProps: "components/feedback/BannerCenter",
	BannerItem: "components/feedback/BannerCenter",

	Progress: "components/feedback/Progress",
	ProgressProps: "components/feedback/Progress",
	ProgressSize: "components/feedback/Progress",
	ProgressVariant: "components/feedback/Progress",

	Toast: "components/feedback/Toast",
	ToastContainer: "components/feedback/Toast",
	ToastProps: "components/feedback/Toast",
	ToastContainerProps: "components/feedback/Toast",
	ToastVariant: "components/feedback/Toast",
	ToastPosition: "components/feedback/Toast",

	// Navigation
	Breadcrumb: "components/navigation/Breadcrumb",
	BreadcrumbProps: "components/navigation/Breadcrumb",
	BreadcrumbItem: "components/navigation/Breadcrumb",
	BreadcrumbSize: "components/navigation/Breadcrumb",

	CommandPalette: "components/navigation/CommandPalette",
	CommandPaletteProps: "components/navigation/CommandPalette",
	CommandItem: "components/navigation/CommandPalette",

	Navbar: "components/navigation/Navbar",
	NavLink: "components/navigation/Navbar",
	NavbarProps: "components/navigation/Navbar",
	NavLinkProps: "components/navigation/Navbar",
	NavbarVariant: "components/navigation/Navbar",

	Pagination: "components/navigation/Pagination",
	PaginationProps: "components/navigation/Pagination",
	PaginationSize: "components/navigation/Pagination",
	PaginationVariant: "components/navigation/Pagination",

	Sidebar: "components/navigation/Sidebar",
	SidebarProvider: "components/navigation/Sidebar",
	SidebarHeader: "components/navigation/Sidebar",
	SidebarLogo: "components/navigation/Sidebar",
	SidebarToggle: "components/navigation/Sidebar",
	SidebarMobileTrigger: "components/navigation/Sidebar",
	SidebarSection: "components/navigation/Sidebar",
	SidebarItem: "components/navigation/Sidebar",
	SidebarGroup: "components/navigation/Sidebar",
	SidebarDivider: "components/navigation/Sidebar",
	useSidebarContext: "components/navigation/Sidebar",
	SidebarProps: "components/navigation/Sidebar",
	SidebarProviderProps: "components/navigation/Sidebar",
	SidebarHeaderProps: "components/navigation/Sidebar",
	SidebarLogoProps: "components/navigation/Sidebar",
	SidebarToggleProps: "components/navigation/Sidebar",
	SidebarMobileTriggerProps: "components/navigation/Sidebar",
	SidebarSectionProps: "components/navigation/Sidebar",
	SidebarItemProps: "components/navigation/Sidebar",
	SidebarGroupProps: "components/navigation/Sidebar",
	SidebarDividerProps: "components/navigation/Sidebar",
	SidebarVariant: "components/navigation/Sidebar",

	StepIndicator: "components/navigation/StepIndicator",
	StepData: "components/navigation/StepIndicator",
	StepIndicatorOrientation: "components/navigation/StepIndicator",
	StepIndicatorProps: "components/navigation/StepIndicator",
	StepIndicatorSize: "components/navigation/StepIndicator",
	StepStatus: "components/navigation/StepIndicator",

	Tabs: "components/navigation/Tabs",
	TabList: "components/navigation/Tabs",
	Tab: "components/navigation/Tabs",
	TabPanels: "components/navigation/Tabs",
	TabPanel: "components/navigation/Tabs",
	TabsProps: "components/navigation/Tabs",
	TabListProps: "components/navigation/Tabs",
	TabProps: "components/navigation/Tabs",
	TabPanelsProps: "components/navigation/Tabs",
	TabPanelProps: "components/navigation/Tabs",
	TabsVariant: "components/navigation/Tabs",
	TabsSize: "components/navigation/Tabs",

	// Data
	Table: "components/data/Table",
	TableHeader: "components/data/Table",
	TableBody: "components/data/Table",
	TableFooter: "components/data/Table",
	TableRow: "components/data/Table",
	TableHead: "components/data/Table",
	TableCell: "components/data/Table",
	TableCaption: "components/data/Table",
	TableExpandedRow: "components/data/Table",
	TableProps: "components/data/Table",
	TableHeaderProps: "components/data/Table",
	TableBodyProps: "components/data/Table",
	TableFooterProps: "components/data/Table",
	TableRowProps: "components/data/Table",
	TableHeadProps: "components/data/Table",
	TableCellProps: "components/data/Table",
	TableCaptionProps: "components/data/Table",
	TableExpandedRowProps: "components/data/Table",
	TableSize: "components/data/Table",
	TableVariant: "components/data/Table",
	SortDirection: "components/data/Table",

	DataGrid: "components/data/DataGrid",
	DataGridProps: "components/data/DataGrid",
	DataGridColumn: "components/data/DataGrid",

	StatCard: "components/data/StatCard",
	StatCardProps: "components/data/StatCard",
	StatCardVariant: "components/data/StatCard",
	TrendDirection: "components/data/StatCard",

	List: "components/data/List",
	ListItem: "components/data/List",
	ListGroup: "components/data/List",
	ListProps: "components/data/List",
	ListItemProps: "components/data/List",
	ListGroupProps: "components/data/List",
	ListVariant: "components/data/List",
	ListSize: "components/data/List",

	EmptyState: "components/data/EmptyState",
	EmptyStateProps: "components/data/EmptyState",
	EmptyStateSize: "components/data/EmptyState",

	// Composite
	Accordion: "components/composite/Accordion",
	AccordionItemData: "components/composite/Accordion",
	AccordionProps: "components/composite/Accordion",

	DatePicker: "components/composite/DatePicker",
	DatePickerProps: "components/composite/DatePicker",
	DatePickerSize: "components/composite/DatePicker",

	FileUpload: "components/composite/FileUpload",
	FileUploadProps: "components/composite/FileUpload",
	FileUploadVariant: "components/composite/FileUpload",
	UploadedFile: "components/composite/FileUpload",

	MultiSelect: "components/composite/MultiSelect",
	MultiSelectItem: "components/composite/MultiSelect",
	MultiSelectProps: "components/composite/MultiSelect",
	MultiSelectSize: "components/composite/MultiSelect",
	MultiSelectVariant: "components/composite/MultiSelect",

	// Overlays
	Dropdown: "components/overlays/Dropdown",
	DropdownProps: "components/overlays/Dropdown",
	DropdownItem: "components/overlays/Dropdown",
	DropdownSize: "components/overlays/Dropdown",
	DropdownVariant: "components/overlays/Dropdown",

	DropdownMenu: "components/overlays/DropdownMenu",
	DropdownMenuProps: "components/overlays/DropdownMenu",
	MenuDivider: "components/overlays/DropdownMenu",
	MenuItem: "components/overlays/DropdownMenu",
	MenuItemData: "components/overlays/DropdownMenu",
	MenuItemSize: "components/overlays/DropdownMenu",
	MenuItemState: "components/overlays/DropdownMenu",

	Modal: "components/overlays/Modal",
	ModalProps: "components/overlays/Modal",
	ModalSize: "components/overlays/Modal",

	Popover: "components/overlays/Popover",
	PopoverProps: "components/overlays/Popover",
	PopoverPlacement: "components/overlays/Popover",
	PopoverAlign: "components/overlays/Popover",

	Tooltip: "components/overlays/Tooltip",
	TooltipProps: "components/overlays/Tooltip",
	TooltipPosition: "components/overlays/Tooltip",

	// Context
	ThemeProvider: "context/ThemeProvider",
	ThemeContext: "context/ThemeProvider",
	ThemeContextValue: "context/ThemeProvider",
	ThemeProviderProps: "context/ThemeProvider",

	MotionProvider: "context/MotionProvider",
	useMotionContext: "context/MotionProvider",
	MotionContextValue: "context/MotionProvider",
	MotionProviderProps: "context/MotionProvider",

	// Hooks
	useTheme: "hooks/useTheme",
	useReducedMotion: "hooks/useReducedMotion",
	useMediaQuery: "hooks/useMediaQuery",
	useIsMobile: "hooks/useMediaQuery",
	useIsTablet: "hooks/useMediaQuery",
	useIsDesktop: "hooks/useMediaQuery",
	useMotionConfig: "hooks/useMotionConfig",
	useAnimationVariants: "hooks/useMotionConfig",
	MotionConfig: "hooks/useMotionConfig",
	SpringConfig: "hooks/useMotionConfig",
	SpringPreset: "hooks/useMotionConfig",
	useClickOutside: "hooks/useClickOutside",
	useFocusTrap: "hooks/useFocusTrap",

	// Utils
	cn: "utils/cn",
	getToken: "utils/tokens",
	setToken: "utils/tokens",
	removeToken: "utils/tokens",
	getTokens: "utils/tokens",
	tokenVar: "utils/tokens",
	generateId: "utils/a11y",
	announce: "utils/a11y",
	isVisible: "utils/a11y",
	getFocusableElements: "utils/a11y",
	prefersReducedMotion: "utils/a11y",
	prefersDarkMode: "utils/a11y",
	prefersHighContrast: "utils/a11y",
	aria: "utils/a11y",

	// Themes
	applyTheme: "themes/themes",
	getCurrentTheme: "themes/themes",
	getSystemTheme: "themes/themes",
	subscribeToSystemTheme: "themes/themes",
	themes: "themes/themes",
	themeNames: "themes/themes",
	ThemeName: "themes/themes",
	Theme: "themes/themes",
};

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fileArgIndex = args.indexOf("--file");
const singleFile = fileArgIndex !== -1 ? args[fileArgIndex + 1] : null;

/**
 * Find all files that import from @/proto-design-system
 */
function findFilesToMigrate() {
	if (singleFile) {
		return [singleFile];
	}

	try {
		const result = execSync(
			`grep -rl "from ['\\"']@/proto-design-system['\\"']" src --include="*.tsx" --include="*.ts"`,
			{ encoding: "utf-8", cwd: process.cwd() },
		);
		return result
			.trim()
			.split("\n")
			.filter((f) => f);
	} catch (e) {
		return [];
	}
}

/**
 * Parse import statement and extract imported names
 */
function parseImportStatement(importStr) {
	// Match: import { A, B, C } from "@/proto-design-system"
	// Also handles: import { A, type B } from "@/proto-design-system"
	// Also handles multi-line imports
	const match = importStr.match(
		/import\s*\{([^}]+)\}\s*from\s*["']@\/proto-design-system["']/s,
	);
	if (!match) return null;

	const importedItems = match[1]
		.split(",")
		.map((item) => item.trim())
		.filter((item) => item)
		.map((item) => {
			// Handle "type X" syntax
			const isType = item.startsWith("type ");
			const name = isType ? item.replace("type ", "").trim() : item.trim();
			// Handle "X as Y" syntax
			const [originalName, alias] = name.split(/\s+as\s+/);
			return {
				name: originalName.trim(),
				alias: alias ? alias.trim() : null,
				isType,
			};
		});

	return {
		fullMatch: match[0],
		items: importedItems,
	};
}

/**
 * Group imports by their target path
 */
function groupImportsByPath(items) {
	const groups = {};

	for (const item of items) {
		const targetPath = EXPORT_MAP[item.name];
		if (!targetPath) {
			console.warn(`  Warning: No mapping found for "${item.name}"`);
			continue;
		}

		if (!groups[targetPath]) {
			groups[targetPath] = [];
		}
		groups[targetPath].push(item);
	}

	return groups;
}

/**
 * Generate new import statements from grouped imports
 */
function generateNewImports(groups) {
	const imports = [];

	for (const [targetPath, items] of Object.entries(groups)) {
		const typeImports = items.filter((i) => i.isType);
		const valueImports = items.filter((i) => !i.isType);

		const formatItem = (item) => {
			if (item.alias) {
				return `${item.name} as ${item.alias}`;
			}
			return item.name;
		};

		// Generate value imports
		if (valueImports.length > 0) {
			const importList = valueImports.map(formatItem).join(", ");
			imports.push(
				`import { ${importList} } from "@/proto-design-system/${targetPath}";`,
			);
		}

		// Generate type imports (using "import type")
		if (typeImports.length > 0) {
			const importList = typeImports.map(formatItem).join(", ");
			imports.push(
				`import type { ${importList} } from "@/proto-design-system/${targetPath}";`,
			);
		}
	}

	return imports;
}

/**
 * Process a single file
 */
function processFile(filePath) {
	const content = fs.readFileSync(filePath, "utf-8");

	// Find the import statement (handle multi-line)
	const importRegex =
		/import\s*\{[^}]+\}\s*from\s*["']@\/proto-design-system["'];?/gs;
	const matches = content.match(importRegex);

	if (!matches || matches.length === 0) {
		return { changed: false, content };
	}

	let newContent = content;

	for (const match of matches) {
		const parsed = parseImportStatement(match);
		if (!parsed) continue;

		const groups = groupImportsByPath(parsed.items);
		const newImports = generateNewImports(groups);

		if (newImports.length === 0) {
			console.warn(`  Warning: Could not generate new imports for ${filePath}`);
			continue;
		}

		// Replace old import with new imports
		newContent = newContent.replace(match, newImports.join("\n"));
	}

	return { changed: newContent !== content, content: newContent };
}

/**
 * Main execution
 */
function main() {
	console.log("Proto Design System Import Migration");
	console.log("====================================");
	console.log(dryRun ? "Mode: DRY RUN (no files will be modified)\n" : "\n");

	const files = findFilesToMigrate();
	console.log(`Found ${files.length} files to process\n`);

	let migratedCount = 0;
	let errorCount = 0;

	for (const file of files) {
		try {
			console.log(`Processing: ${file}`);
			const result = processFile(file);

			if (result.changed) {
				if (!dryRun) {
					fs.writeFileSync(file, result.content);
					console.log(`  ✓ Migrated`);
				} else {
					console.log(`  Would migrate`);
				}
				migratedCount++;
			} else {
				console.log(`  - No changes needed`);
			}
		} catch (error) {
			console.error(`  ✗ Error: ${error.message}`);
			errorCount++;
		}
	}

	console.log("\n====================================");
	console.log(`Summary:`);
	console.log(`  Files processed: ${files.length}`);
	console.log(`  Files migrated: ${migratedCount}`);
	console.log(`  Errors: ${errorCount}`);

	if (dryRun) {
		console.log("\nRun without --dry-run to apply changes");
	}
}

main();
