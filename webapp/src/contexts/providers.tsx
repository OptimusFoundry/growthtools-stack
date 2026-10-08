"use client";
import React from "react";
import { useAuth } from "@/contexts/auth";
import { PersonaProvider } from "@/contexts/persona";
import { SidebarProvider } from "@/contexts/sidebar";
import { TierProvider } from "@/contexts/tier";
import { BannerCenterProvider } from "@/proto-design-system/components/feedback/BannerCenter/BannerCenter";
import { SidebarProvider as ProtoSidebarProvider } from "@/proto-design-system/components/navigation/Sidebar/Sidebar";
import { ThemeProvider } from "@/proto-design-system/context/ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
	const { user } = useAuth();

	// Default to 'admin' persona for development
	const persona = user?.persona ?? "admin";

	return (
		<ThemeProvider>
			<BannerCenterProvider>
				<TierProvider>
					<PersonaProvider persona={persona}>
						<SidebarProvider>
							<ProtoSidebarProvider responsive>{children}</ProtoSidebarProvider>
						</SidebarProvider>
					</PersonaProvider>
				</TierProvider>
			</BannerCenterProvider>
		</ThemeProvider>
	);
}
