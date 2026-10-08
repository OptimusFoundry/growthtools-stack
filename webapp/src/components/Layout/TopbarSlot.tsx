import { createContext, useContext } from "react";

// undefined: no Layout above; null: Layout above, slot not mounted yet.
export const TopbarSlotContext = createContext<HTMLElement | null | undefined>(
	undefined,
);

export function useTopbarSlot(): HTMLElement | null | undefined {
	return useContext(TopbarSlotContext);
}
