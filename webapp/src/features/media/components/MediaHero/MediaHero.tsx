import pageStyles from "@/routes/page.module.scss";

export function MediaHero({ count }: { count: number }) {
	return (
		<header className={pageStyles.pageHero}>
			<div className={pageStyles.pageHeroText}>
				<div className={pageStyles.pageEyebrow}>
					Library · {String(count).padStart(2, "0")}{" "}
					{count === 1 ? "item" : "items"}
				</div>
				<h1 className={pageStyles.pageHeroTitle}>
					Every asset, <em>one tap away</em>.
				</h1>
				<p className={pageStyles.pageHeroSub}>
					Drop in images and videos to drag into any post. Upload once, reuse
					everywhere.
				</p>
			</div>
		</header>
	);
}
