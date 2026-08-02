// Foundations chapter of the UI Kit catalog: token specimens (color, type,
// spacing/radius, elevation/motion) rendered Figma-style. Showcase-only.
//
// SOURCE OF TRUTH: the token SCSS files. This page never hardcodes token
// VALUES — it only declares which token NAMES to feature (curation/grouping)
// and reads every displayed value LIVE off the resolved styles (getComputedStyle
// on the rendered element or the document root). So values can never drift from
// the tokens, and they update automatically when the active theme changes.
//
// The token reference is applied via an inline CSS custom property and consumed
// in the SCSS module — the value IS a token reference, not a literal.

import {
	type CSSProperties,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from "react";
import type { ThemeName } from "../../themes/themes";
import styles from "./Foundations.module.scss";
import { TypeAudit } from "./TypeAudit";

// These reads are DEFERRED to the next frame: the hooks live in children, whose
// effects run before the parent's applyTheme() effect on mount — a synchronous
// read would capture the :root fallback instead of the active theme's value.

// Reads the resolved value of a CSS custom property off the document root.
function useComputedVar(name: string, dep: ThemeName): string {
	const [value, setValue] = useState("");
	// biome-ignore lint/correctness/useExhaustiveDependencies: theme re-read trigger
	useEffect(() => {
		if (typeof window === "undefined") return;
		const raf = requestAnimationFrame(() => {
			setValue(
				getComputedStyle(document.documentElement)
					.getPropertyValue(name)
					.trim(),
			);
		});
		return () => cancelAnimationFrame(raf);
	}, [name, dep]);
	return value;
}

// Reads a resolved CSS property (e.g. "font-size", "width") off a RENDERED
// element — so rem/relative token values report their true painted px.
function useRenderedValue(
	ref: RefObject<HTMLElement | null>,
	prop: string,
	dep: ThemeName,
): string {
	const [value, setValue] = useState("");
	// biome-ignore lint/correctness/useExhaustiveDependencies: theme re-read trigger
	useEffect(() => {
		if (typeof window === "undefined") return;
		const raf = requestAnimationFrame(() => {
			const el = ref.current;
			setValue(el ? getComputedStyle(el).getPropertyValue(prop).trim() : "");
		});
		return () => cancelAnimationFrame(raf);
	}, [prop, dep]);
	return value;
}

function cssVar(prop: string, token: string): CSSProperties {
	return { [prop]: `var(${token})` } as CSSProperties;
}

// --- Section scaffold ---------------------------------------------------------
interface FoundationSectionProps {
	id: string;
	index: string;
	title: string;
	caption: string;
	children: React.ReactNode;
}

function FoundationSection({
	id,
	index,
	title,
	caption,
	children,
}: FoundationSectionProps) {
	return (
		<section id={id} className={styles.section}>
			<header className={styles.sectionHead}>
				<span className={styles.sectionIndex}>{index}</span>
				<div>
					<h3 className={styles.sectionTitle}>{title}</h3>
					<p className={styles.sectionCaption}>{caption}</p>
				</div>
			</header>
			{children}
		</section>
	);
}

// =============================================================================
// COLOR
// =============================================================================
const COLOR_GROUPS: { title: string; tokens: string[] }[] = [
	{
		title: "Brand",
		tokens: [
			"--color-primary",
			"--color-primary-hover",
			"--color-primary-active",
			"--color-primary-content",
			"--color-secondary",
			"--color-secondary-hover",
			"--color-secondary-active",
			"--color-secondary-content",
			"--color-accent",
			"--color-accent-hover",
			"--color-accent-active",
			"--color-accent-content",
		],
	},
	{
		title: "Semantic",
		tokens: [
			"--color-success",
			"--color-success-bg",
			"--color-success-content",
			"--color-warning",
			"--color-warning-bg",
			"--color-warning-content",
			"--color-error",
			"--color-error-bg",
			"--color-error-content",
			"--color-info",
			"--color-info-bg",
			"--color-info-content",
		],
	},
	{
		title: "Surface & border",
		tokens: [
			"--color-background",
			"--color-surface",
			"--color-surface-elevated",
			"--color-border",
			"--color-border-hover",
		],
	},
	{
		title: "Content",
		tokens: [
			"--color-base-content",
			"--color-base-content-secondary",
			"--color-base-content-tertiary",
			"--color-muted",
		],
	},
	{
		title: "Base scale",
		tokens: [
			"--color-base-50",
			"--color-base-100",
			"--color-base-200",
			"--color-base-300",
			"--color-base-400",
			"--color-base-500",
			"--color-base-600",
			"--color-base-700",
			"--color-base-800",
			"--color-base-900",
			"--color-base-950",
		],
	},
];

function ColorSwatch({ token, theme }: { token: string; theme: ThemeName }) {
	const value = useComputedVar(token, theme);
	return (
		<div className={styles.swatch}>
			<span className={styles.swatchChip} style={cssVar("--chip", token)} />
			<span className={styles.swatchName}>{token.replace("--color-", "")}</span>
			<span className={styles.swatchValue}>{value}</span>
		</div>
	);
}

function ColorFoundation({ theme }: { theme: ThemeName }) {
	return (
		<FoundationSection
			id="f-color"
			index="01"
			title="Color"
			caption="Semantic tokens resolved live for the active theme. Switch themes above and watch every value update."
		>
			<div className={styles.colorGroups}>
				{COLOR_GROUPS.map((group) => (
					<div key={group.title} className={styles.colorGroup}>
						<span className={styles.groupLabel}>{group.title}</span>
						<div className={styles.swatchGrid}>
							{group.tokens.map((token) => (
								<ColorSwatch key={token} token={token} theme={theme} />
							))}
						</div>
					</div>
				))}
			</div>
		</FoundationSection>
	);
}

// =============================================================================
// TYPOGRAPHY
// =============================================================================
const TYPE_SCALE = [
	"--font-size-7xl",
	"--font-size-6xl",
	"--font-size-5xl",
	"--font-size-4xl",
	"--font-size-3xl",
	"--font-size-2xl",
	"--font-size-xl",
	"--font-size-lg",
	"--font-size-md",
	"--font-size-base",
	"--font-size-sm",
	"--font-size-xs",
	"--font-size-xxs",
];

const WEIGHTS = [
	"--font-weight-normal",
	"--font-weight-medium",
	"--font-weight-semibold",
];

function ScaleRow({ token, theme }: { token: string; theme: ThemeName }) {
	const ref = useRef<HTMLSpanElement>(null);
	const px = useRenderedValue(ref, "font-size", theme);
	return (
		<div className={styles.scaleRow}>
			<span
				ref={ref}
				className={styles.scaleSample}
				style={cssVar("--fs", token)}
			>
				The quick brown fox
			</span>
			<span className={styles.scaleMeta}>
				{token.replace("--font-size-", "")} · {px}
			</span>
		</div>
	);
}

function WeightItem({ token, theme }: { token: string; theme: ThemeName }) {
	const value = useComputedVar(token, theme);
	return (
		<div className={styles.weightItem}>
			<span className={styles.weightSample} style={cssVar("--fw", token)}>
				Aa
			</span>
			<span className={styles.weightLabel}>
				{token.replace("--font-weight-", "")} · {value}
			</span>
		</div>
	);
}

function TypographyFoundation({ theme }: { theme: ThemeName }) {
	return (
		<FoundationSection
			id="f-type"
			index="02"
			title="Typography"
			caption="One family — Geist — across the whole system, sized and weighted for a clear hierarchy."
		>
			<div className={styles.typeStack}>
				<div className={styles.typeFamilies}>
					<div className={styles.familyCard}>
						<span className={styles.familySample}>Ag</span>
						<span className={styles.familyName}>Geist</span>
						<span className={styles.familyMeta}>--font-family-sans</span>
					</div>
				</div>

				<div className={styles.scaleList}>
					{TYPE_SCALE.map((token) => (
						<ScaleRow key={token} token={token} theme={theme} />
					))}
				</div>

				<div className={styles.weightRow}>
					{WEIGHTS.map((token) => (
						<WeightItem key={token} token={token} theme={theme} />
					))}
				</div>
			</div>
		</FoundationSection>
	);
}

// =============================================================================
// SPACING & RADIUS
// =============================================================================
const SPACING = [
	"--space-1",
	"--space-2",
	"--space-3",
	"--space-4",
	"--space-5",
	"--space-6",
	"--space-7",
	"--space-8",
	"--space-10",
	"--space-12",
	"--space-16",
];

const RADII = [
	"--radius-xs",
	"--radius-sm",
	"--radius-md",
	"--radius-lg",
	"--radius-xl",
	"--radius-2xl",
	"--radius-3xl",
];

function SpacingRow({ token, theme }: { token: string; theme: ThemeName }) {
	const ref = useRef<HTMLSpanElement>(null);
	const px = useRenderedValue(ref, "width", theme);
	return (
		<div className={styles.spacingRow}>
			<span className={styles.spacingMeta}>
				{token.replace("--space-", "")}
			</span>
			<span
				ref={ref}
				className={styles.spacingBar}
				style={cssVar("--w", token)}
			/>
			<span className={styles.spacingPx}>{px}</span>
		</div>
	);
}

function RadiusItem({ token, theme }: { token: string; theme: ThemeName }) {
	const value = useComputedVar(token, theme);
	return (
		<div className={styles.radiusItem}>
			<span className={styles.radiusSwatch} style={cssVar("--r", token)} />
			<span className={styles.radiusMeta}>
				{token.replace("--radius-", "")} · {value}
			</span>
		</div>
	);
}

function SpacingRadiusFoundation({ theme }: { theme: ThemeName }) {
	return (
		<FoundationSection
			id="f-space"
			index="03"
			title="Spacing & Radius"
			caption="A 4px-based rhythm with airier medium steps, and an editorial radius scale."
		>
			<div className={styles.twoCol}>
				<div className={styles.subBlock}>
					<span className={styles.groupLabel}>Spacing</span>
					<div className={styles.spacingList}>
						{SPACING.map((token) => (
							<SpacingRow key={token} token={token} theme={theme} />
						))}
					</div>
				</div>

				<div className={styles.subBlock}>
					<span className={styles.groupLabel}>Radius</span>
					<div className={styles.radiusGrid}>
						{RADII.map((token) => (
							<RadiusItem key={token} token={token} theme={theme} />
						))}
					</div>
				</div>
			</div>
		</FoundationSection>
	);
}

// =============================================================================
// ELEVATION & MOTION
// =============================================================================
const SHADOWS = [
	"--shadow-xs",
	"--shadow-sm",
	"--shadow-md",
	"--shadow-lg",
	"--shadow-xl",
	"--shadow-2xl",
];

const DURATIONS = [
	"--duration-fast",
	"--duration-normal",
	"--duration-slow",
	"--duration-slower",
];

const EASINGS = [
	"--ease-out",
	"--ease-in-out",
	"--ease-bounce",
	"--ease-elastic",
	"--ease-smooth",
];

function DurationChip({ token, theme }: { token: string; theme: ThemeName }) {
	const value = useComputedVar(token, theme);
	return (
		<div className={styles.tokenChip}>
			<span className={styles.tokenChipName}>
				{token.replace("--duration-", "")}
			</span>
			<span className={styles.tokenChipValue}>{value}</span>
		</div>
	);
}

function ElevationMotionFoundation({ theme }: { theme: ThemeName }) {
	return (
		<FoundationSection
			id="f-elevation"
			index="04"
			title="Elevation & Motion"
			caption="Atmospheric ink-tinted shadows, plus the duration and easing tokens that drive every transition."
		>
			<div className={styles.subBlock}>
				<span className={styles.groupLabel}>Elevation</span>
				<div className={styles.shadowGrid}>
					{SHADOWS.map((token) => (
						<div key={token} className={styles.shadowItem}>
							<span
								className={styles.shadowCard}
								style={cssVar("--sh", token)}
							/>
							<span className={styles.shadowMeta}>
								{token.replace("--shadow-", "shadow-")}
							</span>
						</div>
					))}
				</div>
			</div>

			<div className={styles.twoCol}>
				<div className={styles.subBlock}>
					<span className={styles.groupLabel}>Duration</span>
					<div className={styles.tokenChips}>
						{DURATIONS.map((token) => (
							<DurationChip key={token} token={token} theme={theme} />
						))}
					</div>
				</div>

				<div className={styles.subBlock}>
					<span className={styles.groupLabel}>Easing</span>
					<div className={styles.easingList}>
						{EASINGS.map((token) => (
							<div key={token} className={styles.easingRow}>
								<span className={styles.easingName}>
									{token.replace("--ease-", "")}
								</span>
								<span className={styles.easingTrack}>
									<span
										className={styles.easingDot}
										style={cssVar("--easing", token)}
									/>
								</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</FoundationSection>
	);
}

export function Foundations({ theme }: { theme: ThemeName }) {
	return (
		<div className={styles.foundations}>
			<ColorFoundation theme={theme} />
			<TypographyFoundation theme={theme} />
			<SpacingRadiusFoundation theme={theme} />
			<ElevationMotionFoundation theme={theme} />
			<FoundationSection
				id="f-contrast"
				index="05"
				title="Text contrast"
				caption="The active theme's text ramp at its real sizes and weights, scored live with APCA (Lc) and WCAG 2.2."
			>
				<TypeAudit theme={theme} />
			</FoundationSection>
		</div>
	);
}
