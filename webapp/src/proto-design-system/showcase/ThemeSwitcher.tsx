// Showcase-only control. Lives under proto-design-system/showcase/ and is
// imported solely by UIKit.stories.tsx, so it is tree-shaken out of the app
// bundle. Drives off the canonical `themeNames` registry — never hand-list
// themes here, or the switcher will drift from the product.

import { type ThemeName, themeNames, themes } from "../themes/themes";
import { cn } from "../utils/cn";
import styles from "./ThemeSwitcher.module.scss";

interface ThemeSwitcherProps {
	value: ThemeName;
	onChange: (theme: ThemeName) => void;
	className?: string;
}

export function ThemeSwitcher({
	value,
	onChange,
	className,
}: ThemeSwitcherProps) {
	return (
		<div
			className={cn(styles.switcher, className)}
			role="radiogroup"
			aria-label="Preview theme"
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
						{/* data-theme scopes this swatch to the theme's own tokens, so
						    each chip previews real colors without applying globally. */}
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
