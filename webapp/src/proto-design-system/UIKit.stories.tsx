// Design System "UI Kit" — a single scrolling catalog modeled on a Figma UI
// kit: Cover (hero + live theme switcher) → Foundations (token specimens) →
// Components (full variant matrices, one Spec frame per component) → Patterns.
//
// MAINTENANCE: each component category renders its specimen file from
// showcase/specimens/. When you add a component, add it to that category's
// specimen file and bump the matching `count` in CATEGORIES below.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentType, useContext, useState } from "react";
import { Compositions } from "./showcase/Compositions";
import { Foundations } from "./showcase/foundations/Foundations";
import { Hero } from "./showcase/Hero";
import { type LabSize, SizeLab } from "./showcase/SizeLab";
import { SizeToggle } from "./showcase/SizeToggle";
import { CompositeSpecimens } from "./showcase/specimens/Composite";
import { DataSpecimens } from "./showcase/specimens/Data";
import { FeedbackSpecimens } from "./showcase/specimens/Feedback";
import { FormsSpecimens } from "./showcase/specimens/Forms";
import { LayoutSpecimens } from "./showcase/specimens/Layout";
import { NavigationSpecimens } from "./showcase/specimens/Navigation";
import { OverlaysSpecimens } from "./showcase/specimens/Overlays";
import { PrimitivesSpecimens } from "./showcase/specimens/Primitives";
import { ThemeGlobalContext } from "./themes/themeGlobalContext";
import styles from "./UIKit.module.scss";

type Category = {
	id: string;
	label: string;
	count: number;
	Specimens: ComponentType;
};

const CATEGORIES: Category[] = [
	{
		id: "primitives",
		label: "Primitives",
		count: 8,
		Specimens: PrimitivesSpecimens,
	},
	{ id: "forms", label: "Forms", count: 12, Specimens: FormsSpecimens },
	{ id: "feedback", label: "Feedback", count: 5, Specimens: FeedbackSpecimens },
	{ id: "overlays", label: "Overlays", count: 6, Specimens: OverlaysSpecimens },
	{
		id: "navigation",
		label: "Navigation",
		count: 7,
		Specimens: NavigationSpecimens,
	},
	{
		id: "composite",
		label: "Composite",
		count: 4,
		Specimens: CompositeSpecimens,
	},
	{ id: "data", label: "Data", count: 7, Specimens: DataSpecimens },
	{ id: "layout", label: "Layout", count: 11, Specimens: LayoutSpecimens },
];

const COMPONENT_COUNT = CATEGORIES.reduce((n, c) => n + c.count, 0);

type NavItem = { id: string; label: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
	{
		label: "Foundations",
		items: [
			{ id: "f-color", label: "Color" },
			{ id: "f-type", label: "Type" },
			{ id: "f-space", label: "Spacing" },
			{ id: "f-elevation", label: "Elevation" },
			{ id: "f-contrast", label: "Contrast" },
		],
	},
	{
		label: "Components",
		items: CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
	},
	{ label: "Patterns", items: [{ id: "patterns", label: "Patterns" }] },
];

function scrollToId(id: string) {
	document
		.getElementById(id)
		?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function KitNav() {
	return (
		<nav className={styles.nav} aria-label="UI Kit contents">
			{NAV_GROUPS.map((group) => (
				<div key={group.label} className={styles.navGroup}>
					<span className={styles.navGroupLabel}>{group.label}</span>
					{group.items.map((item) => (
						<button
							key={item.id}
							type="button"
							className={styles.navItem}
							onClick={() => scrollToId(item.id)}
						>
							{item.label}
						</button>
					))}
				</div>
			))}
		</nav>
	);
}

function ChapterHead({
	index,
	title,
	lede,
}: {
	index: string;
	title: string;
	lede?: string;
}) {
	return (
		<div className={styles.chapterHead}>
			<span className={styles.chapterIndex}>{index}</span>
			<h2 className={styles.chapterTitle}>{title}</h2>
			{lede ? <p className={styles.chapterLede}>{lede}</p> : null}
		</div>
	);
}

function UIKit() {
	// Theme is the same Storybook global every story renders with (see
	// .storybook/preview.ts's themeDecorator + toolbar) — reading/writing it
	// here instead of separate local state means the "Try a theme" picker
	// below and the toolbar dropdown are always in sync, and Storybook's own
	// URL/session persistence covers reloads for free. Consumed via plain
	// React context, not storybook/preview-api's useGlobals directly — see
	// themeGlobalContext.ts for why.
	const { theme, setTheme } = useContext(ThemeGlobalContext);

	const [labSize, setLabSize] = useState<LabSize>("md");
	const [patternsSize, setPatternsSize] = useState<LabSize>("sm");

	return (
		<div className={styles.poster}>
			<Hero
				theme={theme}
				onThemeChange={setTheme}
				componentCount={COMPONENT_COUNT}
			/>

			<KitNav />

			{/* 01 — Foundations */}
			<section id="foundations" className={styles.chapter}>
				<ChapterHead
					index="01"
					title="Foundations"
					lede="The design tokens every component is built from. Switch themes above and watch the values resolve live."
				/>
				<Foundations theme={theme} />
			</section>

			{/* 02 — Components */}
			<section id="components" className={styles.chapter}>
				<ChapterHead
					index="02"
					title="Components"
					lede={`All ${COMPONENT_COUNT} components, each with its full set of variants, sizes, and states.`}
				/>
				<SizeLab size={labSize} onSizeChange={setLabSize} />
				<div className={styles.categories}>
					{CATEGORIES.map(({ id, label, count, Specimens }) => (
						<section key={id} id={id} className={styles.category}>
							<div className={styles.categoryHead}>
								<h3 className={styles.categoryTitle}>{label}</h3>
								<span className={styles.categoryCount}>{count}</span>
							</div>
							<div className={styles.specStack}>
								<Specimens />
							</div>
						</section>
					))}
				</div>
			</section>

			{/* 03 — Patterns */}
			<section id="patterns" className={styles.chapter}>
				<ChapterHead
					index="03"
					title="Patterns"
					lede="The primitives composed into the product surfaces you actually ship."
				/>
				<div className={styles.patternsCanvas}>
					<div className={styles.patternsToolbar}>
						<span className={styles.patternsToolbarLabel}>Render at</span>
						<SizeToggle
							value={patternsSize}
							onChange={setPatternsSize}
							ariaLabel="Patterns size"
						/>
					</div>
					<Compositions size={patternsSize} />
				</div>
			</section>
		</div>
	);
}

const meta: Meta<typeof UIKit> = {
	title: "Design System / UI Kit Overview",
	component: UIKit,
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;

export const Overview: StoryObj<typeof UIKit> = {};
