import { UserPersona } from "./user";

/**
 * Navigation item configuration for sidebar
 */
export interface NavItem {
	/** Display label for the nav item */
	label: string;
	/** Route path */
	href: string;
	/** RemixIcon class name (without 'ri-' prefix) */
	iconClass: string;
	/** Personas that can access this nav item */
	allowedPersonas: UserPersona[];
	/** Optional badge or notification count */
	badge?: string | number;
}

/**
 * Navigation group configuration
 */
export interface NavGroup {
	/** Group label */
	label: string;
	/** Nav items in this group */
	items: NavItem[];
	/** Personas that can see this group */
	allowedPersonas: UserPersona[];
}
