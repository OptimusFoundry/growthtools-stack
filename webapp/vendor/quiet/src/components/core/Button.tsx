import React from "react";
import { isDev } from "../../lib/env";
import { useLinkElement } from "../../lib/link";
import { Spinner } from "./Spinner";
import "./Button.scss";

/**
 * Pill button. Ink primary, hairline secondary/outline, text ghost, ink→molten destructive. Never molten-filled.
 * @startingPoint section="Actions" subtitle="Pill buttons — variants, sizes, states" viewport="700x200"
 */
type ButtonHost = HTMLButtonElement | HTMLAnchorElement;
/** Native attributes: the button's, plus the anchor's for when `href` renders a link. */
type ButtonHostAttributes = Omit<
	React.ButtonHTMLAttributes<ButtonHost>,
	"children" | "style" | "disabled" | "onClick"
> &
	Omit<
		React.AnchorHTMLAttributes<ButtonHost>,
		keyof React.ButtonHTMLAttributes<ButtonHost> | "href"
	>;

export interface ButtonProps extends ButtonHostAttributes {
	variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
	size?: "sm" | "md" | "lg";
	/** Trailing → that nudges 4px on hover */
	arrow?: boolean;
	/** Shows a spinner and blocks clicks */
	loading?: boolean;
	disabled?: boolean;
	fullWidth?: boolean;
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
	/** Icon-only button (circle). Pass aria-label. */
	icon?: React.ReactNode;
	/** Renders an <a> when set (LinkButton) */
	href?: string;
	onClick?: React.MouseEventHandler;
	children?: React.ReactNode;
	style?: React.CSSProperties;
}

const SPIN = { sm: 12, md: 14, lg: 16 };

export function Button({
	variant = "primary",
	size = "md",
	arrow = false,
	loading = false,
	disabled = false,
	fullWidth = false,
	leftIcon,
	rightIcon,
	icon,
	href,
	children,
	className,
	style,
	...rest
}: ButtonProps) {
	const off = disabled || loading;
	const A = useLinkElement(href);
	const iconOnly = icon != null && children == null;
	const named = rest["aria-label"] || rest["aria-labelledby"] || rest.title;
	React.useEffect(() => {
		if (iconOnly && !named && isDev())
			console.warn("Button: icon-only buttons need an aria-label.");
	}, [iconOnly, named]);
	// The spinner fades in when loading starts after mount; a button that mounts loading just shows it.
	const loadingAtMount = React.useRef(loading);
	if (!loading) loadingAtMount.current = false;
	const fadeSpin = loading && !loadingAtMount.current;
	const cls = [
		"q-button",
		`q-button--${variant}`,
		`q-button--${SPIN[size] ? size : "md"}`,
		fullWidth && "q-button--full",
		iconOnly && "q-button--icon-only",
		className,
	]
		.filter(Boolean)
		.join(" ");
	const inner = (
		<>
			{loading ? (
				<Spinner
					size={SPIN[size] || SPIN.md}
					tone={variant === "primary" ? "paper" : "default"}
					label={null}
					aria-hidden="true"
					className={fadeSpin ? "q-anim-fade" : undefined}
					data-state={fadeSpin ? "open" : undefined}
				/>
			) : (
				leftIcon
			)}
			{iconOnly && !loading ? icon : null}
			{children}
			{rightIcon}
			{arrow && (
				<span aria-hidden="true" className="q-button__arrow">
					{"→"}
				</span>
			)}
		</>
	);
	const common = {
		className: cls,
		style,
		"aria-busy": loading || undefined,
		...rest,
		onClick: (e: React.MouseEvent) => {
			if (off) {
				e.preventDefault();
				return;
			}
			rest.onClick?.(e);
		},
	};
	return href && !off ? (
		<A href={href} {...common}>
			{inner}
		</A>
	) : (
		<button
			type="button"
			disabled={disabled}
			aria-disabled={(loading && !disabled) || undefined}
			{...common}
		>
			{inner}
		</button>
	);
}
