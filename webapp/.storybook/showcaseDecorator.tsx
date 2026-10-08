import type { Decorator } from "@storybook/react-vite";
import { Watermark } from "@/proto-design-system/showcase/Watermark";
import styles from "./showcaseDecorator.module.scss";

/**
 * Wraps every story in the branded showcase treatment used for automated
 * component screenshots (github.com capture-worker → Storybook direct-nav
 * capture, see docs/GITHUB_AUTOPOST_PRD.md §3b): gradient background,
 * centered content, and a fixed copyright mark. Applied globally in
 * `.storybook/preview.js`.
 */
export const showcaseDecorator: Decorator = (Story) => (
	<div className={styles.showcase}>
		<div className={styles.content}>
			<Story />
		</div>
		<Watermark />
	</div>
);
