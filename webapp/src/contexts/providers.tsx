"use client";
import { SidebarProvider, ThemeProvider } from "@optimusfoundry/quiet";
import React from "react";
import { AppRoot } from "@/contexts/AppRoot";
import { useAuth } from "@/contexts/auth";
import { PersonaProvider } from "@/contexts/persona";
import { TierProvider } from "@/contexts/tier";

export function Providers({ children }: { children: React.ReactNode }) {
	const { user } = useAuth();

	// Default to 'admin' persona for development
	const persona = user?.persona ?? "admin";

	return (
		<ThemeProvider defaultValue="foundry">
			<AppRoot>
				<TierProvider>
					<PersonaProvider persona={persona}>
						<SidebarProvider breakpoint={720}>{children}</SidebarProvider>
					</PersonaProvider>
				</TierProvider>
			</AppRoot>
		</ThemeProvider>
	);
}
