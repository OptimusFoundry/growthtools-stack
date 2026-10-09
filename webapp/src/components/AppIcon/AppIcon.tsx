import type { LucideIcon } from "lucide-react";
import styles from "./AppIcon.module.scss";

type AppIconSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface AppIconProps {
	icon: LucideIcon;
	size?: AppIconSize | number;
	color?:
		| "inherit"
		| "default"
		| "muted"
		| "quiet"
		| "primary"
		| "success"
		| "warning"
		| "error";
	label?: string;
	className?: string;
}

const SIZE_CLASS: Record<AppIconSize, string> = {
	xs: styles.sizeXs,
	sm: styles.sizeSm,
	md: styles.sizeMd,
	lg: styles.sizeLg,
	xl: styles.sizeXl,
	"2xl": styles.size2xl,
};

const COLOR_CLASS: Record<NonNullable<AppIconProps["color"]>, string> = {
	inherit: styles.colorInherit,
	default: styles.colorDefault,
	muted: styles.colorMuted,
	quiet: styles.colorQuiet,
	primary: styles.colorPrimary,
	success: styles.colorSuccess,
	warning: styles.colorWarning,
	error: styles.colorError,
};

export function AppIcon({
	icon: Glyph,
	size = "md",
	color = "inherit",
	label,
	className,
}: AppIconProps) {
	const isNumeric = typeof size === "number";
	const classes = [
		styles.icon,
		isNumeric ? undefined : SIZE_CLASS[size],
		COLOR_CLASS[color],
		className,
	]
		.filter(Boolean)
		.join(" ");
	const a11y = label
		? { role: "img", "aria-label": label }
		: { "aria-hidden": true, focusable: "false" as const };

	return (
		<Glyph className={classes} size={isNumeric ? size : undefined} {...a11y} />
	);
}
