import { UserPersona } from "./user";

/**
 * Navigation item configuration for sidebar
 */
export interface NavItem {
	/** Display label for the nav item */
	label: string;
	/** Route path */
	href: string;
	/** Key into Layout's icon map, which resolves it to a lucide icon (e.g. "calendar-line") */
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
