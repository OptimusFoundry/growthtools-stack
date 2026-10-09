import { FilterTabs } from "@optimusfoundry/quiet";
import type { RangeKey } from "@/hooks/useAnalytics";

interface DateRangeTabsProps {
	value: RangeKey;
	onChange: (range: RangeKey) => void;
}

const RANGES = [
	{ value: "7d", label: "7 days" },
	{ value: "30d", label: "30 days" },
	{ value: "90d", label: "90 days" },
];

function isRangeKey(value: string): value is RangeKey {
	return RANGES.some((range) => range.value === value);
}

export function DateRangeTabs({ value, onChange }: DateRangeTabsProps) {
	return (
		<FilterTabs
			size="sm"
			showCounts={false}
			label="Date range"
			items={RANGES}
			value={value}
			onChange={(next) => {
				if (isRangeKey(next)) onChange(next);
			}}
		/>
	);
}
