import { Menu, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Navbar.module.scss";

export type NavbarVariant = "default" | "transparent" | "filled";

export interface NavbarProps {
	/** Brand/Logo element */
	brand?: ReactNode;
	/** Navigation links */
	children?: ReactNode;
	/** Right side content (buttons, avatar, etc.) */
	actions?: ReactNode;
	/** Visual variant */
	variant?: NavbarVariant;
	/** Sticky positioning */
	sticky?: boolean;
	/** Additional className */
	className?: string;
}

/**
 * Navbar component for top-level navigation.
 *
 * @example
 * ```tsx
 * <Navbar
 *   brand={<Logo />}
 *   actions={<Button>Sign In</Button>}
 * >
 *   <NavLink href="/">Home</NavLink>
 *   <NavLink href="/about">About</NavLink>
 * </Navbar>
 * ```
 */
export function Navbar({
	brand,
	children,
	actions,
	variant = "default",
	sticky = false,
	className,
}: NavbarProps) {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<header
			className={cn(
				styles.navbar,
				styles[variant],
				sticky && styles.sticky,
				className,
			)}
		>
			<div className={styles.container}>
				{brand && <div className={styles.brand}>{brand}</div>}

				<nav className={cn(styles.nav, mobileMenuOpen && styles.open)}>
					<div className={styles.links}>{children}</div>
				</nav>

				<div className={styles.actions}>
					{actions}
					<button
						type="button"
						className={styles.menuButton}
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
						aria-expanded={mobileMenuOpen}
					>
						{mobileMenuOpen ? <X /> : <Menu />}
					</button>
				</div>
			</div>

			{mobileMenuOpen && (
				<div className={styles.mobileMenu}>
					<div className={styles.mobileLinks}>{children}</div>
					{actions && <div className={styles.mobileActions}>{actions}</div>}
				</div>
			)}
		</header>
	);
}

export interface NavLinkProps {
	/** Link href */
	href: string;
	/** Link content */
	children: ReactNode;
	/** Active state */
	active?: boolean;
	/** Additional className */
	className?: string;
}

export function NavLink({
	href,
	children,
	active = false,
	className,
}: NavLinkProps) {
	return (
		<a
			href={href}
			className={cn(styles.link, active && styles.active, className)}
			aria-current={active ? "page" : undefined}
		>
			{children}
		</a>
	);
}

Navbar.displayName = "Navbar";
NavLink.displayName = "NavLink";
