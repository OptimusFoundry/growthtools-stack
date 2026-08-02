// Text-contrast specimen: the active theme's text ramp rendered at its real
// sizes/weights, each row scored live (WCAG 2.2 + APCA Lc) off the painted
// colors — so every theme, including future ramp edits, is audited for free.

import { type RefObject, useEffect, useRef, useState } from "react";
import type { ThemeName } from "../../themes/themes";
import { apcaLc, cssColorToRgb, wcagRatio } from "./contrast";
import styles from "./TypeAudit.module.scss";

interface AuditRow {
	id: string;
	role: string;
	note: string;
	sampleClass: string;
	sample: string;
}

const ROWS: AuditRow[] = [
	{
		id: "heading",
		role: "base-content",
		note: "24px / 600",
		sampleClass: "sampleHeading",
		sample: "Revenue holds steady",
	},
	{
		id: "body",
		role: "base-content",
		note: "15px / 400",
		sampleClass: "sampleBody",
		sample:
			"Long-form reading lives or dies here. Fourteen posts shipped across four channels this week, and the queue stays healthy through Friday.",
	},
	{
		id: "secondary",
		role: "base-content-secondary",
		note: "13px / 400",
		sampleClass: "sampleSecondary",
		sample: "Supporting copy that should read fluently without competing.",
	},
	{
		id: "muted",
		role: "color-muted",
		note: "13px / 400",
		sampleClass: "sampleMuted",
		sample: "Last synced 5 minutes ago from the primary region.",
	},
	{
		id: "caption",
		role: "base-content-tertiary",
		note: "12px / 400 · tracked",
		sampleClass: "sampleCaption",
		sample: "Analytics · Nov 2026",
	},
	{
		id: "link",
		role: "color-primary",
		note: "15px / 400",
		sampleClass: "sampleLink",
		sample: "View the full changelog",
	},
	{
		id: "disabled",
		role: "text-disabled",
		note: "13px / 400 · non-content",
		sampleClass: "sampleDisabled",
		sample: "Export unavailable on this plan",
	},
];

function ScoreChip({
	sampleRef,
	surfaceRef,
	theme,
}: {
	sampleRef: RefObject<HTMLElement | null>;
	surfaceRef: RefObject<HTMLElement | null>;
	theme: ThemeName;
}) {
	const [score, setScore] = useState("…");
	// biome-ignore lint/correctness/useExhaustiveDependencies: theme re-read trigger
	useEffect(() => {
		const raf = requestAnimationFrame(() => {
			const sample = sampleRef.current;
			const surface = surfaceRef.current;
			if (!sample || !surface) return;
			const fg = cssColorToRgb(getComputedStyle(sample).color);
			const bg = cssColorToRgb(getComputedStyle(surface).backgroundColor);
			if (!fg || !bg) return;
			const lc = apcaLc(fg, bg);
			setScore(`Lc ${lc.toFixed(0)} · ${wcagRatio(fg, bg).toFixed(1)}:1`);
		});
		return () => cancelAnimationFrame(raf);
	}, [theme]);
	return <span className={styles.chip}>{score}</span>;
}

function AuditRowItem({
	row,
	surfaceRef,
	theme,
}: {
	row: AuditRow;
	surfaceRef: RefObject<HTMLElement | null>;
	theme: ThemeName;
}) {
	const sampleRef = useRef<HTMLSpanElement>(null);
	return (
		<div className={styles.row}>
			<div className={styles.sampleWrap}>
				<span ref={sampleRef} className={styles[row.sampleClass]}>
					{row.sample}
				</span>
				<span className={styles.roleMeta}>
					{row.role} · {row.note}
				</span>
			</div>
			<ScoreChip sampleRef={sampleRef} surfaceRef={surfaceRef} theme={theme} />
		</div>
	);
}

export function TypeAudit({ theme }: { theme: ThemeName }) {
	const surfaceRef = useRef<HTMLDivElement>(null);
	return (
		<div className={styles.audit}>
			<div ref={surfaceRef} className={styles.list}>
				{ROWS.map((row) => (
					<AuditRowItem
						key={row.id}
						row={row}
						surfaceRef={surfaceRef}
						theme={theme}
					/>
				))}
			</div>
			<p className={styles.footnote}>
				Scored live off painted colors on the active theme. Positive Lc =
				dark-on-light, negative = light-on-dark; each row states its rendered
				size and weight. Disabled falls back to muted in themes without a
				text-disabled token.
			</p>
		</div>
	);
}
