import { QuietRoot, Toaster, useTheme } from "@optimusfoundry/quiet";
import type { ReactNode } from "react";
import { RouterLink } from "@/components/RouterLink/RouterLink";

export function AppRoot({ children }: { children: ReactNode }) {
	const { theme } = useTheme();

	// QuietRoot defaults theme to foundry, so the active theme must be passed or it never applies.
	return (
		<QuietRoot theme={theme} density="app" linkComponent={RouterLink}>
			{children}
			<Toaster position="bottom-right" max={3} />
		</QuietRoot>
	);
}
