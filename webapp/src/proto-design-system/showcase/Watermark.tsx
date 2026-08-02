import styles from "./Watermark.module.scss";

const X_ICON_PATH =
	"M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z";

const BLUESKY_ICON_PATH =
	"M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .689.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364a8.7 8.7 0 0 0 .415-.06 8.7 8.7 0 0 0-.415.06c-3.912.577-7.387 2.005-2.83 7.078 5.012 5.19 6.87-1.113 7.823-4.308.953 3.195 2.81 9.498 7.822 4.308 4.557-5.073 1.083-6.501-2.83-7.078a8.7 8.7 0 0 1-.415-.06 8.7 8.7 0 0 1 .415.06c2.67.296 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.479 0-.688-.139-1.86-.902-2.203-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z";

// Recording watermark — shown on every Storybook story (wired in
// .storybook/preview.ts) so any screen recording or screenshot carries
// attribution without needing separate post-production overlays.
export function Watermark() {
	return (
		<div className={styles.watermark}>
			<span className={styles.copyright}>© 2026 Shubhanshu</span>
			<span className={styles.divider} aria-hidden="true" />
			<a
				className={styles.link}
				href="https://bsky.app/profile/shubhanshu.dev"
				target="_blank"
				rel="noreferrer"
			>
				<svg
					className={styles.icon}
					viewBox="0 0 24 24"
					aria-hidden="true"
					focusable="false"
				>
					<path d={BLUESKY_ICON_PATH} fill="currentColor" />
				</svg>
				shubhanshu.dev
			</a>
			<a
				className={styles.link}
				href="https://x.com/shubhanshu_dev"
				target="_blank"
				rel="noreferrer"
			>
				<svg
					className={styles.icon}
					viewBox="0 0 24 24"
					aria-hidden="true"
					focusable="false"
				>
					<path d={X_ICON_PATH} fill="currentColor" />
				</svg>
				@shubhanshu_dev
			</a>
		</div>
	);
}
