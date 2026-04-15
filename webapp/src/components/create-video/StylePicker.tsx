import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Text } from "@/proto-design-system/components/primitives/Text";
import styles from "./StylePicker.module.scss";

export interface VideoStyle {
	slug: string;
	label: string;
	mood: string;
	colors: [string, string];
	sampleFont: string;
	sampleText: string;
}

export const VIDEO_STYLES: VideoStyle[] = [
	{
		slug: "minimalist-premium",
		label: "Minimalist",
		mood: "Clean",
		colors: ["#0A0A0A", "#C9A96E"],
		sampleFont: "Sora, sans-serif",
		sampleText: "Less is More",
	},
	{
		slug: "high-energy-athletic",
		label: "Athletic",
		mood: "Power",
		colors: ["#DC2626", "#FACC15"],
		sampleFont: "Bebas Neue, sans-serif",
		sampleText: "PUSH HARDER",
	},
	{
		slug: "warm-lifestyle",
		label: "Lifestyle",
		mood: "Warm",
		colors: ["#D4A373", "#FFF8E1"],
		sampleFont: "Playfair Display, serif",
		sampleText: "Live Beautifully",
	},
	{
		slug: "tech-saas",
		label: "Tech / SaaS",
		mood: "Modern",
		colors: ["#0F172A", "#2563EB"],
		sampleFont: "Inter, sans-serif",
		sampleText: "Ship Faster",
	},
	{
		slug: "bold-sale",
		label: "Sale / Promo",
		mood: "Urgent",
		colors: ["#DC2626", "#FF6600"],
		sampleFont: "Bebas Neue, sans-serif",
		sampleText: "50% OFF",
	},
	{
		slug: "cinematic-brand",
		label: "Cinematic",
		mood: "Epic",
		colors: ["#141E30", "#243B55"],
		sampleFont: "Playfair Display, serif",
		sampleText: "Your Story",
	},
	{
		slug: "retro-vintage",
		label: "Retro",
		mood: "Nostalgic",
		colors: ["#D4A017", "#BF360C"],
		sampleFont: "Outfit, sans-serif",
		sampleText: "Throwback",
	},
	{
		slug: "neon-cyberpunk",
		label: "Neon",
		mood: "Electric",
		colors: ["#09090B", "#18E0FF"],
		sampleFont: "Space Grotesk, sans-serif",
		sampleText: "GLOW UP",
	},
	{
		slug: "pastel-soft",
		label: "Pastel",
		mood: "Calm",
		colors: ["#FFDEE9", "#B5FFFC"],
		sampleFont: "DM Sans, sans-serif",
		sampleText: "Soft & Sweet",
	},
	{
		slug: "corporate-b2b",
		label: "Corporate",
		mood: "Professional",
		colors: ["#111827", "#1D4ED8"],
		sampleFont: "Inter, sans-serif",
		sampleText: "Enterprise Ready",
	},
	{
		slug: "playful-fun",
		label: "Playful",
		mood: "Fun",
		colors: ["#FF6B6B", "#FFD93D"],
		sampleFont: "Outfit, sans-serif",
		sampleText: "Let's Go!",
	},
	{
		slug: "luxury-fashion",
		label: "Luxury",
		mood: "Elegant",
		colors: ["#050505", "#C9A96E"],
		sampleFont: "Playfair Display, serif",
		sampleText: "Refined Taste",
	},
	{
		slug: "editorial-magazine",
		label: "Editorial",
		mood: "Refined",
		colors: ["#1A1A1A", "#DC2626"],
		sampleFont: "Playfair Display, serif",
		sampleText: "The Feature",
	},
	{
		slug: "ecommerce-product",
		label: "E-commerce",
		mood: "Conversion",
		colors: ["#0C0A09", "#F97316"],
		sampleFont: "Outfit, sans-serif",
		sampleText: "Shop Now",
	},
	{
		slug: "glassmorphism",
		label: "Glass UI",
		mood: "Futuristic",
		colors: ["#0A0A2E", "#8B5CF6"],
		sampleFont: "Space Grotesk, sans-serif",
		sampleText: "Next Gen",
	},
	{
		slug: "announcement-launch",
		label: "Launch",
		mood: "Dramatic",
		colors: ["#0A0A0A", "#FFD700"],
		sampleFont: "Sora, sans-serif",
		sampleText: "Introducing",
	},
];

export const VIDEO_DURATIONS = [
	{ value: 10, label: "10s" },
	{ value: 15, label: "15s" },
	{ value: 30, label: "30s" },
	{ value: 60, label: "60s" },
];

interface StylePickerProps {
	selectedStyle: string | null;
	onStyleChange: (style: string) => void;
	disabled?: boolean;
}

export function StylePicker({
	selectedStyle,
	onStyleChange,
	disabled,
}: StylePickerProps) {
	return (
		<div className={styles.styleGrid}>
			{VIDEO_STYLES.map((style) => {
				const isSelected = selectedStyle === style.slug;
				const textColor = isLightColor(style.colors[0]) ? "#1A1A1A" : "#FFFFFF";

				return (
					<button
						key={style.slug}
						type="button"
						className={`${styles.styleCard} ${isSelected ? styles.styleCardSelected : ""}`}
						onClick={() => onStyleChange(style.slug)}
						disabled={disabled}
						style={{
							background: `linear-gradient(135deg, ${style.colors[0]} 0%, ${style.colors[1]} 100%)`,
						}}
					>
						<Badge variant="secondary" size="sm" className={styles.moodBadge}>
							{style.mood}
						</Badge>
						<div
							className={styles.sampleText}
							style={{
								fontFamily: style.sampleFont,
								color: textColor,
							}}
						>
							{style.sampleText}
						</div>
						<Text
							size="xs"
							weight="medium"
							className={styles.cardLabel}
							style={{ color: textColor }}
						>
							{style.label}
						</Text>
						{isSelected && (
							<div className={styles.checkOverlay}>
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
									<circle
										cx="12"
										cy="12"
										r="11"
										fill="white"
										stroke="white"
										strokeWidth="2"
									/>
									<path
										d="M7 12l3 3 7-7"
										stroke="#0A0A0A"
										strokeWidth="2.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</div>
						)}
					</button>
				);
			})}
		</div>
	);
}

interface DurationPickerProps {
	selectedDuration: number | null;
	onDurationChange: (duration: number | null) => void;
	disabled?: boolean;
}

export function DurationPicker({
	selectedDuration,
	onDurationChange,
	disabled,
}: DurationPickerProps) {
	return (
		<Stack gap="xs">
			<Text size="sm" weight="medium" color="secondary">
				Duration
			</Text>
			<div className={styles.durationRow}>
				{VIDEO_DURATIONS.map((d) => (
					<button
						key={d.value}
						type="button"
						className={`${styles.durationChip} ${selectedDuration === d.value ? styles.durationChipSelected : ""}`}
						onClick={() =>
							onDurationChange(selectedDuration === d.value ? null : d.value)
						}
						disabled={disabled}
					>
						{d.label}
					</button>
				))}
			</div>
		</Stack>
	);
}

/** Helper: rough check if a hex color is light */
function isLightColor(hex: string): boolean {
	const c = hex.replace("#", "");
	const r = Number.parseInt(c.substring(0, 2), 16);
	const g = Number.parseInt(c.substring(2, 4), 16);
	const b = Number.parseInt(c.substring(4, 6), 16);
	return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}
