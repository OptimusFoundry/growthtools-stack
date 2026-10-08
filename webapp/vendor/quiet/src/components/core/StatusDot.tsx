import type React from "react";
import "./StatusDot.scss";

/** Status indicator — the molten dot is one of molten's three permitted uses. */
export interface StatusDotProps {
	status?: "live" | "prototype" | "archived";
	label?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

export function StatusDot({ label, status = "live", className, style }: StatusDotProps) {
	const mod = status === "live" || status === "prototype" ? `q-status-dot--${status}` : null;
	return (
		<span className={["q-status-dot", mod, className].filter(Boolean).join(" ")} style={style}>
			<span aria-hidden="true" className="q-status-dot__dot" />
			{label ?? status}
		</span>
	);
}
