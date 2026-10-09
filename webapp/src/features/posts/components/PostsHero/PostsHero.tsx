import { PageHero } from "@optimusfoundry/quiet";
import styles from "./PostsHero.module.scss";

export function PostsHero({ count }: { count: number }) {
	return (
		<PageHero
			size="md"
			as="h2"
			ruled={false}
			className={styles.hero}
			eyebrow={`Library · ${String(count).padStart(2, "0")} ${count === 1 ? "entry" : "entries"}`}
			title="Everything you've"
			accent="written, in one room"
			description="Drafts, scheduled, and published — sorted the way your week actually works. Click through to edit in the composer."
		/>
	);
}
