import React from "react";
import "./Avatar.scss";

/**
 * Person or org avatar — image, mono initials, or fallback. Circle or soft rounded square.
 * @startingPoint section="Primitives" subtitle="Image, initials, fallback" viewport="600x160"
 */
export interface AvatarProps {
	src?: string;
	/** Used for initials and title */
	name?: string;
	alt?: string;
	size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number;
	/** circle = full round · square = soft rounded-rect (--radius-md) */
	shape?: "circle" | "square";
	fallback?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

const SIZES: unknown[] = ["xs", "sm", "md", "lg", "xl", "2xl"];

export function Avatar({
	src,
	name,
	alt,
	size = "md",
	shape = "circle",
	fallback,
	className,
	style,
}: AvatarProps) {
	const [err, setErr] = React.useState(false);
	// Image fades in once decoded (already-cached images skip straight to visible).
	const [loadedSrc, setLoadedSrc] = React.useState<string | undefined | null>(null);
	const img = React.useRef<HTMLImageElement>(null);
	React.useEffect(() => {
		if (img.current?.complete && img.current.naturalWidth) setLoadedSrc(src);
	}, [src]);
	const numeric = typeof size === "number";
	const initials = name
		? name
				.trim()
				.split(/\s+/)
				.map((w) => w[0])
				.slice(0, 2)
				.join("")
				.toUpperCase()
		: null;
	const showImg = src && !err;
	const cls = [
		"q-avatar",
		numeric ? null : `q-avatar--${SIZES.includes(size) ? size : "md"}`,
		shape === "square" && "q-avatar--square",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<span
			title={name}
			role={!showImg && (alt || name) ? "img" : undefined}
			aria-label={!showImg ? alt || name || undefined : undefined}
			className={cls}
			style={numeric ? ({ "--_size": `${size}px`, ...style } as React.CSSProperties) : style}
		>
			{showImg ? (
				<img
					ref={img}
					src={src}
					alt={alt || name || ""}
					onError={() => setErr(true)}
					onLoad={() => setLoadedSrc(src)}
					className="q-avatar__img"
					data-loaded={loadedSrc === src || undefined}
				/>
			) : (
				(initials ??
				fallback ?? (
					<span aria-hidden="true" className="q-avatar__empty">
						{"·"}
					</span>
				))
			)}
		</span>
	);
}
