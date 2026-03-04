import { forwardRef, useState } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Avatar.module.scss";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type AvatarVariant = "circle" | "rounded" | "square";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Image source URL */
	src?: string;
	/** Alt text for the image */
	alt?: string;
	/** Fallback initials when no image is available */
	initials?: string;
	/** Size of the avatar */
	size?: AvatarSize;
	/** Shape variant */
	variant?: AvatarVariant;
	/** Custom fallback element */
	fallback?: React.ReactNode;
}

/**
 * Avatar component for displaying user profile images or initials.
 *
 * @example
 * ```tsx
 * <Avatar src="/avatar.jpg" alt="John Doe" />
 * <Avatar initials="JD" />
 * <Avatar src="/avatar.jpg" alt="User" size="lg" variant="rounded" />
 * ```
 */
export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
	(
		{
			src,
			alt = "",
			initials,
			size = "md",
			variant = "circle",
			fallback,
			className,
			...props
		},
		ref,
	) => {
		const [imageError, setImageError] = useState(false);

		const sizeClass = size === "2xl" ? styles["size-2xl"] : styles[size];
		const avatarClasses = cn(
			styles.avatar,
			sizeClass,
			styles[variant],
			className,
		);

		const showImage = src && !imageError;
		const showInitials = !showImage && initials;
		const showFallback = !showImage && !initials && fallback;
		const showDefaultFallback = !showImage && !initials && !fallback;

		return (
			<div ref={ref} className={avatarClasses} {...props}>
				{showImage && (
					<img
						src={src}
						alt={alt}
						className={styles.image}
						onError={() => setImageError(true)}
					/>
				)}
				{showInitials && (
					<span className={styles.initials} aria-label={alt || initials}>
						{initials.slice(0, 2).toUpperCase()}
					</span>
				)}
				{showFallback && fallback}
				{showDefaultFallback && (
					<svg
						className={styles.fallbackIcon}
						viewBox="0 0 24 24"
						fill="currentColor"
						aria-hidden="true"
					>
						<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
					</svg>
				)}
			</div>
		);
	},
);

Avatar.displayName = "Avatar";
