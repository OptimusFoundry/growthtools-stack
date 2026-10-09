import type React from "react";
import "./Stat.scss";

/** Big tight number with mono label. */
export interface StatProps {
	value: React.ReactNode;
	label: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

export function Stat({ value, label, className, style }: StatProps) {
	return (
		<div className={["q-stat", className].filter(Boolean).join(" ")} style={style}>
			<div className="q-stat__value">{value}</div>
			<div className="q-stat__label">{label}</div>
		</div>
	);
}
