// Showcase-only hero. Imported solely by UIKit.stories.tsx (tree-shaken from
// the app bundle). The backdrop is painted from theme tokens, so flipping the
// theme via <ThemeSwitcher> recolors the entire hero in real time.

import type { ReactNode } from "react";
import { type ThemeName, themeNames } from "../themes/themes";
import styles from "./Hero.module.scss";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface HeroProps {
	theme: ThemeName;
	onThemeChange: (theme: ThemeName) => void;
	componentCount: number;
}

interface StatProps {
	value: ReactNode;
	label: string;
}

function Stat({ value, label }: StatProps) {
	return (
		<div className={styles.stat}>
			<span className={styles.statValue}>{value}</span>
			<span className={styles.statLabel}>{label}</span>
		</div>
	);
}

export function Hero({ theme, onThemeChange, componentCount }: HeroProps) {
	return (
		<header className={styles.hero}>
			<div className={styles.backdrop} aria-hidden="true" />
			<div className={styles.gridLines} aria-hidden="true" />

			<div className={styles.inner}>
				<span className={styles.eyebrow}>Proto Design System</span>

				<h1 className={styles.title}>
					One component kit.
					<br />
					<em>Every theme you can imagine.</em>
				</h1>

				<p className={styles.lede}>
					{componentCount} accessible React components, driven entirely by
					design tokens — so the same kit re-skins into {themeNames.length}{" "}
					distinct themes without touching a line of component code. Pick one
					below and watch the whole page change.
				</p>

				<dl className={styles.stats}>
					<Stat value={componentCount} label="components" />
					<Stat value={themeNames.length} label="themes" />
					<Stat value="React 19" label="built on" />
					<Stat value="WCAG" label="a11y-first" />
				</dl>

				<div className={styles.switcherBlock}>
					<span className={styles.switcherLabel}>Try a theme</span>
					<ThemeSwitcher value={theme} onChange={onThemeChange} />
				</div>
			</div>
		</header>
	);
}
