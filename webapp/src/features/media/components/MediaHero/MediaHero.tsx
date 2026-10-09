import { PageHero } from "@optimusfoundry/quiet";
import styles from "./MediaHero.module.scss";

export function MediaHero({ count }: { count: number }) {
	const eyebrow = `Library · ${String(count).padStart(2, "0")} ${
		count === 1 ? "item" : "items"
	}`;
	return (
		<PageHero
			size="md"
			as="h2"
			ruled={false}
			className={styles.hero}
			eyebrow={eyebrow}
			title="Every asset,"
			accent="one tap away"
			description="Drop in images and videos to drag into any post. Upload once, reuse everywhere."
		/>
	);
}
