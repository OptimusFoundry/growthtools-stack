import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import styles from "./page.module.scss";

export const Route = createFileRoute("/media")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<motion.div
			className={styles.page}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.6 }}
		>
			<div className={styles.pageHeader}>
				<h1 className={styles.pageTitle}>Media Library</h1>
				<p className={styles.pageDescription}>
					Store and organize your media assets
				</p>
			</div>

			<div className={styles.pageContent}>
				{/* Media library components will go here */}
				<p>Media library coming soon...</p>
			</div>
		</motion.div>
	);
}
