import pageStyles from "@/routes/page.module.scss";

export function BlogHero({ count }: { count: number }) {
	return (
		<header className={pageStyles.pageHero}>
			<div className={pageStyles.pageHeroText}>
				<div className={pageStyles.pageEyebrow}>
					Stories · {String(count).padStart(2, "0")}{" "}
					{count === 1 ? "piece" : "pieces"}
				</div>
				<h1 className={pageStyles.pageHeroTitle}>
					Long-form, <em>thought through</em>.
				</h1>
				<p className={pageStyles.pageHeroSub}>
					Drafts to refine and stories to ship. Write the slow takes here —
					quick threads belong in Posts.
				</p>
			</div>
		</header>
	);
}
