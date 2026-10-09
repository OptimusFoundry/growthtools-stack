import { PageHero } from "@optimusfoundry/quiet";
import styles from "./BlogHero.module.scss";

export function BlogHero({ count }: { count: number }) {
	return (
		<PageHero
			size="md"
			as="h2"
			ruled={false}
			className={styles.hero}
			eyebrow={`Stories · ${String(count).padStart(2, "0")} ${count === 1 ? "piece" : "pieces"}`}
			title="Long-form"
			accent="thought through"
			description="Drafts to refine and stories to ship. Write the slow takes here — quick threads belong in Posts."
		/>
	);
}
