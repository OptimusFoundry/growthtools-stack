"use client";
import { SidebarProvider, ThemeProvider } from "@optimusfoundry/quiet";
import React from "react";
import { AppRoot } from "@/contexts/AppRoot";
import { useAuth } from "@/contexts/auth";
import { PersonaProvider } from "@/contexts/persona";
import { TierProvider } from "@/contexts/tier";
import { BannerCenterProvider } from "@/proto-design-system/components/feedback/BannerCenter/BannerCenter";

export function Providers({ children }: { children: React.ReactNode }) {
	const { user } = useAuth();

	// Default to 'admin' persona for development
	const persona = user?.persona ?? "admin";

	// BannerCenterProvider stays until the product screens that call useBannerCenter move to useNotify (CH-001).
	return (
		<ThemeProvider defaultValue="foundry">
			<AppRoot>
				<BannerCenterProvider>
					<TierProvider>
						<PersonaProvider persona={persona}>
							<SidebarProvider breakpoint={720}>{children}</SidebarProvider>
						</PersonaProvider>
					</TierProvider>
				</BannerCenterProvider>
			</AppRoot>
		</ThemeProvider>
	);
}
