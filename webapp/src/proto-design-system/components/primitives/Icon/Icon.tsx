import type { LucideIcon } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Icon.module.scss";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type IconColor =
	| "default"
	| "muted"
	| "primary"
	| "secondary"
	| "success"
	| "warning"
	| "error"
	| "inherit";

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
	/** The Lucide icon component to render */
	icon: LucideIcon;
	/** Size of the icon */
	size?: IconSize;
	/** Color of the icon */
	color?: IconColor;
	/** Accessible label (sets aria-label, makes icon non-decorative) */
	label?: string;
}

const sizeMap: Record<IconSize, number> = {
	xs: 12,
	sm: 16,
	md: 20,
	lg: 24,
	xl: 32,
	"2xl": 48,
};

/**
 * Icon component wrapper for Lucide icons with consistent sizing and colors.
 *
 * @example
 * ```tsx
 * import { Home, Settings, User } from "lucide-react";
 *
 * <Icon icon={Home} />
 * <Icon icon={Settings} size="lg" color="primary" />
 * <Icon icon={User} label="User profile" />
 * ```
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(
	(
		{
			icon: LucideIconComponent,
			size = "md",
			color = "default",
			label,
			className,
			...props
		},
		ref,
	) => {
		const iconClasses = cn(styles.icon, styles[`color-${color}`], className);
		const pixelSize = sizeMap[size];

		return (
			<LucideIconComponent
				ref={ref}
				size={pixelSize}
				className={iconClasses}
				aria-hidden={!label}
				aria-label={label}
				role={label ? "img" : undefined}
				{...props}
			/>
		);
	},
);

Icon.displayName = "Icon";
