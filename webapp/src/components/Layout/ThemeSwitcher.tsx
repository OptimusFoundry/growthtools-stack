import { Palette } from "lucide-react";
import { useMemo } from "react";
import { Select } from "@/proto-design-system/components/forms/Select/Select";
import { useTheme } from "@/proto-design-system/hooks/useTheme";
import {
	type ThemeName,
	themeNames,
	themes,
} from "@/proto-design-system/themes/themes";
import styles from "./themeSwitcher.module.scss";

export function ThemeSwitcher() {
	const { theme, setTheme } = useTheme();

	const options = useMemo(
		() =>
			themeNames.map((name) => ({
				value: name,
				label: `${themes[name].label} ${themes[name].colorScheme === "dark" ? "•" : "○"}`,
			})),
		[],
	);

	return (
		<div className={styles.wrapper}>
			<div className={styles.label}>
				<Palette size={14} />
				<span>Theme</span>
			</div>
			<Select
				size="sm"
				value={theme}
				onChange={(e) => setTheme(e.target.value as ThemeName)}
				options={options}
				fullWidth
			/>
		</div>
	);
}
