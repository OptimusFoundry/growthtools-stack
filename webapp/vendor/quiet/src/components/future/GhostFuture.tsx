import React from "react";
import "./GhostFuture.scss";

/**
 * An empty state that shows what is likely to come: dashed ghost rows drawn from similar lists,
 * each folding away as a real row arrives. Ghosts are decorative (hidden from assistive tech);
 * the caption says where they come from.
 * @startingPoint section="Future" subtitle="Empty states that show the shape of success" viewport="700x360"
 */
export interface GhostFutureRow {
	label: React.ReactNode;
	/** When it usually happens, e.g. "day 3" */
	hint?: React.ReactNode;
}
export interface GhostFutureProps {
	/** The likely first rows, in order */
	ghosts?: GhostFutureRow[];
	/** The real rows so far; each one replaces the first remaining ghost */
	children?: React.ReactNode;
	/** Number of real rows, when children don't map one-to-one */
	count?: number;
	/** Where the ghosts come from; shown while any remain */
	caption?: React.ReactNode;
	/** Custom ghost content (the dashed row frame stays) */
	renderGhost?: (ghost: GhostFutureRow, index: number) => React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

// An empty state that shows the likely shape of what's coming: dashed ghost rows (what similar
// lists looked like early on), each one folding away as a real row arrives in its place.
export function GhostFuture({
	ghosts = [],
	children,
	count,
	caption,
	renderGhost,
	className,
	style,
}: GhostFutureProps) {
	const real = count ?? React.Children.toArray(children).length;
	const left = Math.max(0, ghosts.length - real);
	return (
		<div className={["q-ghost-future", className].filter(Boolean).join(" ")} style={style}>
			{real > 0 && <div className="q-ghost-future__rows">{children}</div>}
			{ghosts.length > 0 && (
				<div aria-hidden="true" className="q-ghost-future__ghosts">
					{ghosts.map((g, i) => {
						const gone = i < real;
						return (
							<div
								key={i}
								className="q-ghost-future__slot"
								data-state={gone ? "gone" : "open"}
								style={{ "--_distance": gone ? 0 : i - real } as React.CSSProperties}
							>
								<div className="q-ghost-future__ghost">
									<div className="q-ghost-future__row">
										{renderGhost ? (
											renderGhost(g, i)
										) : (
											<>
												<span className="q-ghost-future__avatar" />
												<span className="q-ghost-future__label">{g.label}</span>
												{g.hint && <span className="q-ghost-future__hint">{g.hint}</span>}
											</>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
			{caption && left > 0 && <p className="q-ghost-future__caption">{caption}</p>}
		</div>
	);
}
