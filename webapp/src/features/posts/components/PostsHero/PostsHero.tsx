import pageStyles from "@/routes/page.module.scss";

export function PostsHero({ count }: { count: number }) {
	return (
		<header className={pageStyles.pageHero}>
			<div className={pageStyles.pageHeroText}>
				<div className={pageStyles.pageEyebrow}>
					Library · {String(count).padStart(2, "0")}{" "}
					{count === 1 ? "entry" : "entries"}
				</div>
				<h1 className={pageStyles.pageHeroTitle}>
					Everything you've <em>written</em>, in one room.
				</h1>
				<p className={pageStyles.pageHeroSub}>
					Drafts, scheduled, and published — sorted the way your week actually
					works. Click through to edit in the composer.
				</p>
			</div>
		</header>
	);
}
