import React, { createContext, useContext, useMemo } from "react";
import { navigationConfig } from "@/config/navigation";
import { NavGroup, NavItem } from "@/types/navigation";
import { UserPersona } from "@/types/user";

interface PersonaContextType {
	/** Current user's persona */
	persona: UserPersona;
	/** Check if current persona has access to a feature */
	hasAccess: (allowedPersonas: UserPersona[]) => boolean;
	/** Get filtered navigation groups based on persona */
	getNavigationGroups: () => NavGroup[];
	/** Check if persona can access a specific route */
	canAccessRoute: (route: string) => boolean;
}

const PersonaContext = createContext<PersonaContextType | undefined>(undefined);

export const usePersona = () => {
	const context = useContext(PersonaContext);
	if (!context) {
		throw new Error("usePersona must be used within a PersonaProvider");
	}
	return context;
};

interface PersonaProviderProps {
	children: React.ReactNode;
	persona: UserPersona;
}

export function PersonaProvider({ children, persona }: PersonaProviderProps) {
	const value = useMemo<PersonaContextType>(() => {
		/**
		 * Check if the current persona has access to a feature
		 */
		const hasAccess = (allowedPersonas: UserPersona[]): boolean => {
			return allowedPersonas.includes(persona);
		};

		/**
		 * Filter navigation items based on persona access
		 */
		const filterNavItems = (items: NavItem[]): NavItem[] => {
			return items.filter((item) => hasAccess(item.allowedPersonas));
		};

		/**
		 * Get filtered navigation groups based on current persona
		 */
		const getNavigationGroups = (): NavGroup[] => {
			return navigationConfig
				.filter((group) => hasAccess(group.allowedPersonas))
				.map((group) => ({
					...group,
					items: filterNavItems(group.items),
				}))
				.filter((group) => group.items.length > 0);
		};

		/**
		 * Check if persona can access a specific route
		 */
		const canAccessRoute = (route: string): boolean => {
			// Admin has access to all routes
			if (persona === "admin") return true;

			// Check if route exists in any nav item that the persona can access
			for (const group of navigationConfig) {
				for (const item of group.items) {
					if (item.href === route && hasAccess(item.allowedPersonas)) {
						return true;
					}
				}
			}

			// Default routes that everyone can access
			const publicRoutes = ["/", "/account", "/billing"];
			return publicRoutes.includes(route);
		};

		return {
			persona,
			hasAccess,
			getNavigationGroups,
			canAccessRoute,
		};
	}, [persona]);

	return (
		<PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>
	);
}
