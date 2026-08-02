import { type ThemeName, themeNames, themes } from "../../../themes/themes";
import { cn } from "../../../utils/cn";
import styles from "./ThemeSwitcherGrid.module.scss";

export interface ThemeSwitcherGridProps {
	value: ThemeName;
	onChange: (theme: ThemeName) => void;
	className?: string;
}

export function ThemeSwitcherGrid({
	value,
	onChange,
	className,
}: ThemeSwitcherGridProps) {
	return (
		<div
			className={cn(styles.grid, className)}
			role="radiogroup"
			aria-label="Theme"
		>
			{themeNames.map((name) => {
				const theme = themes[name];
				const active = name === value;
				return (
					<button
						key={name}
						type="button"
						role="radio"
						aria-checked={active}
						className={styles.chip}
						data-active={active || undefined}
						onClick={() => onChange(name)}
					>
						<span
							className={styles.swatch}
							data-theme={name}
							aria-hidden="true"
						>
							<span className={styles.swBg} />
							<span className={styles.swPrimary} />
							<span className={styles.swAccent} />
						</span>
						<span className={styles.label}>{theme.label}</span>
						<span
							className={styles.scheme}
							data-scheme={theme.colorScheme}
							aria-hidden="true"
						/>
					</button>
				);
			})}
		</div>
	);
}
