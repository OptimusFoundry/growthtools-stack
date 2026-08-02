// Size Lab — a single sm/md/lg toggle that renders EVERY compact sized control
// at the chosen size in one grid, so the whole system can be scanned at a single
// size to eyeball cross-component consistency. Showcase-only. The full
// per-component specimens (variants/states) live below this in the catalog.

import { Star } from "lucide-react";
import { type ReactNode, useState } from "react";
import { DatePicker } from "../components/composite/DatePicker/DatePicker";
import { MultiSelect } from "../components/composite/MultiSelect/MultiSelect";
import { FilterTabs } from "../components/data/FilterTabs/FilterTabs";
import { Progress } from "../components/feedback/Progress/Progress";
import { Checkbox } from "../components/forms/Checkbox/Checkbox";
import { Input } from "../components/forms/Input/Input";
import { Radio } from "../components/forms/Radio/Radio";
import { Select } from "../components/forms/Select/Select";
import { Slider } from "../components/forms/Slider/Slider";
import { Stepper } from "../components/forms/Stepper/Stepper";
import { Switch } from "../components/forms/Switch/Switch";
import { Breadcrumb } from "../components/navigation/Breadcrumb/Breadcrumb";
import { Pagination } from "../components/navigation/Pagination/Pagination";
import { Dropdown } from "../components/overlays/Dropdown/Dropdown";
import { Avatar } from "../components/primitives/Avatar/Avatar";
import { Badge } from "../components/primitives/Badge/Badge";
import { Button } from "../components/primitives/Button/Button";
import { Icon } from "../components/primitives/Icon/Icon";
import { Spinner } from "../components/primitives/Spinner/Spinner";
import { Tag } from "../components/primitives/Tag/Tag";
import { cn } from "../utils/cn";
import styles from "./SizeLab.module.scss";
import { type LabSize, SizeToggle } from "./SizeToggle";

export type { LabSize };

interface SizeLabProps {
	size: LabSize;
	onSizeChange: (size: LabSize) => void;
}

export function SizeLab({ size, onSizeChange }: SizeLabProps) {
	// Local state for the controlled demos — shared across the grid.
	const [sliderVal, setSliderVal] = useState("50");
	const [stepperVal, setStepperVal] = useState(1);
	const [dateVal, setDateVal] = useState<Date | null>(null);
	const [multiVal, setMultiVal] = useState<Set<string>>(new Set(["a"]));
	const [dropdownVal, setDropdownVal] = useState<string | undefined>("a");
	const [page, setPage] = useState(2);
	const [filterVal, setFilterVal] = useState("all");

	const cells: { name: string; node: ReactNode }[] = [
		{
			name: "Button",
			node: (
				<Button size={size} variant="primary">
					Button
				</Button>
			),
		},
		{
			name: "Badge",
			node: (
				<Badge size={size} variant="primary">
					Badge
				</Badge>
			),
		},
		{
			name: "Tag",
			node: (
				<Tag size={size} variant="primary">
					Tag
				</Tag>
			),
		},
		{ name: "Avatar", node: <Avatar size={size} initials="JD" /> },
		{ name: "Icon", node: <Icon size={size} icon={Star} /> },
		{ name: "Spinner", node: <Spinner size={size} /> },
		{ name: "Input", node: <Input size={size} placeholder="Input" /> },
		{
			name: "Select",
			node: (
				<Select
					size={size}
					options={[
						{ value: "a", label: "Option A" },
						{ value: "b", label: "Option B" },
					]}
					placeholder="Select…"
				/>
			),
		},
		{
			name: "Checkbox",
			node: <Checkbox size={size} label="Checkbox" defaultChecked />,
		},
		{
			name: "Radio",
			node: (
				<Radio size={size} name="sizelab-radio" label="Radio" defaultChecked />
			),
		},
		{
			name: "Switch",
			node: <Switch size={size} label="Switch" defaultChecked />,
		},
		{
			name: "Slider",
			node: (
				<Slider
					size={size}
					value={sliderVal}
					onChange={(e) => setSliderVal(e.target.value)}
					aria-label="Slider"
				/>
			),
		},
		{
			name: "Stepper",
			node: (
				<Stepper
					size={size}
					value={stepperVal}
					onChange={setStepperVal}
					min={0}
					max={10}
					aria-label="Quantity"
				/>
			),
		},
		{
			name: "Dropdown",
			node: (
				<Dropdown
					size={size}
					items={[
						{ id: "a", label: "Edit" },
						{ id: "b", label: "Duplicate" },
					]}
					value={dropdownVal}
					onChange={setDropdownVal}
					placeholder="Select…"
				/>
			),
		},
		{
			name: "DatePicker",
			node: (
				<DatePicker
					size={size}
					value={dateVal}
					onChange={setDateVal}
					placeholder="Pick a date…"
				/>
			),
		},
		{
			name: "MultiSelect",
			node: (
				<MultiSelect
					size={size}
					items={[
						{ id: "a", label: "React" },
						{ id: "b", label: "Vue" },
					]}
					value={multiVal}
					onChange={setMultiVal}
					placeholder="Select…"
				/>
			),
		},
		{
			name: "Pagination",
			node: (
				<Pagination
					size={size}
					page={page}
					totalPages={5}
					onPageChange={setPage}
				/>
			),
		},
		{
			name: "FilterTabs",
			node: (
				<FilterTabs
					size={size}
					value={filterVal}
					onChange={setFilterVal}
					items={[
						{ id: "all", label: "All", count: 12 },
						{ id: "active", label: "Active", count: 8 },
					]}
				/>
			),
		},
		{
			name: "Breadcrumb",
			node: (
				<Breadcrumb
					size={size}
					items={[{ label: "Home", href: "/" }, { label: "Settings" }]}
				/>
			),
		},
		{ name: "Progress", node: <Progress size={size} value={60} /> },
	];

	return (
		<div className={styles.lab}>
			<div className={styles.head}>
				<span className={styles.title}>Size lab</span>
				<p className={styles.caption}>
					Every sized control at one size — flip the toggle to compare the whole
					system at <code>{size}</code>.
				</p>
				<SizeToggle value={size} onChange={onSizeChange} />
			</div>

			<div className={styles.grid}>
				{cells.map((cell) => (
					<div key={cell.name} className={styles.cell}>
						<div className={styles.demo}>{cell.node}</div>
						<span className={cn(styles.label)}>{cell.name}</span>
					</div>
				))}
			</div>
		</div>
	);
}
